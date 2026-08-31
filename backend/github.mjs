/**
 * GitHub proxy route.
 *
 * Doing this server-side buys three things the browser can't:
 *  - GitHub's REST rate limit is 60/hour *per IP*. Unauthenticated calls
 *    made from each visitor's browser burn that visitor's quota; made from
 *    here they burn one shared quota and get cached, and with a token they
 *    get 5,000/hour instead.
 *  - github.com/users/<u>/contributions sends no CORS header, so a browser
 *    can never read it. A server can, which means the contribution calendar
 *    no longer depends on a third-party mirror staying online.
 *  - GITHUB_TOKEN (a classic PAT with no scopes is enough) unlocks the
 *    official GraphQL contributionsCollection — exact counts, no scraping.
 *
 * Everything degrades: no token falls back to the HTML parse, a failed
 * calendar still returns stats, and a completely failed response just makes
 * the front end use its own direct-from-browser path.
 */

const TTL_MS = 60 * 60 * 1000;
const cache = new Map(); // username -> { at, payload }

const UA = { "User-Agent": "portfolio-site", Accept: "application/vnd.github+json" };
const authHeaders = () =>
  process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

async function fetchStats(username) {
  const [userRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers: { ...UA, ...authHeaders() } }),
    fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
      headers: { ...UA, ...authHeaders() },
    }),
  ]);
  if (!userRes.ok) throw new Error("github user " + userRes.status);
  const user = await userRes.json();

  let stars = 0;
  let topLanguages = [];
  if (repoRes.ok) {
    const repos = await repoRes.json();
    stars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
    const counts = {};
    repos.forEach((r) => {
      if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
    });
    topLanguages = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([lang]) => lang);
  }

  return {
    repos: user.public_repos || 0,
    followers: user.followers || 0,
    stars,
    topLanguages,
    joined: user.created_at ? new Date(user.created_at).getFullYear() : null,
  };
}

/** Official route — exact counts, needs a token (no scopes required). */
async function fetchCalendarGraphQL(username) {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...UA, ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: username } }),
  });
  if (!res.ok) throw new Error("graphql " + res.status);
  const json = await res.json();
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("graphql: no calendar in response");

  const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const days = cal.weeks.flatMap((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: LEVELS[d.contributionLevel] ?? 0,
    }))
  );
  return { total: cal.totalContributions, days };
}

/** Tokenless route — parse the same calendar GitHub renders on the profile.
 *
 *  Each day cell carries its date, its shading level and a DOM id:
 *    <td data-date="2025-08-31" id="contribution-day-component-0-0" data-level="0" …>
 *  and the exact count lives in a sibling element that points back at it:
 *    <tool-tip … for="contribution-day-component-0-0">No contributions on August 31st.</tool-tip>
 *
 *  So the two are joined on that id. Reading the tooltip's date text instead
 *  would be wrong — it has no year in it ("August 31st."), which a naive
 *  Date() parse silently resolves to the current year, or 2001. */
async function fetchCalendarHtml(username) {
  const res = await fetch(`https://github.com/users/${username}/contributions`, {
    headers: { "User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest" },
  });
  if (!res.ok) throw new Error("contributions html " + res.status);
  const html = await res.text();

  const counts = new Map();
  const tipRe = /for="(contribution-day-component-[\d-]+)"[^>]*>\s*(?:(\d[\d,]*)|No)\s+contributions?/g;
  let t;
  while ((t = tipRe.exec(html))) {
    counts.set(t[1], t[2] ? Number(t[2].replace(/,/g, "")) : 0);
  }

  const days = [];
  const cellRe = /<td[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g;
  let m;
  while ((m = cellRe.exec(html))) {
    const tag = m[0];
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    if (!date) continue; // padding cells at the start of the first week
    const id = /id="(contribution-day-component-[\d-]+)"/.exec(tag)?.[1];
    days.push({
      date,
      level: Number(/data-level="(\d)"/.exec(tag)?.[1] ?? 0),
      count: counts.get(id) ?? 0,
    });
  }
  if (!days.length) throw new Error("contributions html: no day cells found");

  days.sort((a, b) => a.date.localeCompare(b.date));
  const total = days.reduce((a, d) => a + d.count, 0);
  return { total, days };
}

export function registerGitHubRoutes(app) {
  app.get("/api/github/:username", async (req, res) => {
    const username = String(req.params.username || "").trim();
    if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) {
      return res.status(400).json({ error: "Invalid GitHub username" });
    }

    const hit = cache.get(username);
    if (hit && Date.now() - hit.at < TTL_MS) return res.json(hit.payload);

    const [statsResult, calResult] = await Promise.allSettled([
      fetchStats(username),
      process.env.GITHUB_TOKEN
        ? fetchCalendarGraphQL(username).catch(() => fetchCalendarHtml(username))
        : fetchCalendarHtml(username),
    ]);

    const payload = {
      username,
      stats: statsResult.status === "fulfilled" ? statsResult.value : null,
      calendar: calResult.status === "fulfilled" ? calResult.value : null,
      fetchedAt: new Date().toISOString(),
    };

    if (!payload.stats && !payload.calendar) {
      console.warn("[github] both lookups failed for", username);
      return res.status(502).json({ error: "GitHub lookup failed" });
    }

    // Only a fully-successful response is worth holding for an hour; a
    // partial one should be retried sooner rather than pinned in the cache.
    if (payload.stats && payload.calendar) cache.set(username, { at: Date.now(), payload });
    res.json(payload);
  });
}

export default registerGitHubRoutes;
