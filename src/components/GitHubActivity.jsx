import { useEffect, useState } from "react";
import Reveal from "./Reveal.jsx";
import SectionHead from "./SectionHead.jsx";
import { GitHub, ArrowUpRight } from "./Icons.jsx";
import { useMotion } from "../motion/MotionProvider.jsx";
import { useStore } from "../store.js";
import { getGitHub } from "../lib/api.js";

const DEFAULT_CONTRIB_API = "https://github-contributions-api.jogruber.de/v4";
const CACHE_TTL_MS = 60 * 60 * 1000; // GitHub allows 60 unauthenticated calls/hour/IP.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The labels of the four stat tiles, so the placeholder set is the same size
 *  and shape as the real one. Must match statTiles below. */
const SKELETON_STATS = [
  "Contributions, last year",
  "Public repositories",
  "Stars earned",
  "Followers",
];

/**
 * Reads a cached response from sessionStorage, ignoring anything stale or
 * unparseable. Wrapped because Safari private mode throws on access rather
 * than returning null.
 */
function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    return Date.now() - at < CACHE_TTL_MS ? data : null;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota or private mode — the cache is an optimisation, not a requirement */
  }
}

/** Bucket the last 53 weeks of days into columns, Sunday-first. */
function toWeeks(days) {
  if (!days?.length) return [];
  const weeks = [];
  let week = new Array(new Date(days[0].date + "T00:00:00").getDay()).fill(null);
  for (const day of days) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  return weeks.slice(-53);
}

export default function GitHubActivity({ id = "github" }) {
  const { animate } = useMotion();
  const { siteContent, profile } = useStore();

  const config = siteContent?.github || {};
  const username =
    config.username ||
    profile?.socials?.find?.((s) => s.kind === "github")?.href?.split("/").filter(Boolean).pop() ||
    "";
  const apiBase = config.contributionsApi || DEFAULT_CONTRIB_API;

  const [calendar, setCalendar] = useState(null); // { total, days[] }
  const [stats, setStats] = useState(null); // { repos, followers, stars }
  const [state, setState] = useState("loading"); // loading | ready | partial | failed

  useEffect(() => {
    if (!username) {
      setState("failed");
      return;
    }
    let cancelled = false;

    const calKey = `gh:cal:${username}`;
    const statKey = `gh:stat:${username}`;
    const cachedCal = readCache(calKey);
    const cachedStat = readCache(statKey);
    if (cachedCal) setCalendar(cachedCal);
    if (cachedStat) setStats(cachedStat);

    // Preferred path: this site's own backend, which reads GitHub
    // server-side (no per-visitor rate limit, no CORS wall in front of the
    // real contributions endpoint, and exact counts when GITHUB_TOKEN is
    // set). If it isn't deployed or is unreachable, the two direct-from-
    // browser calls below take over — hence the whole chain rather than one
    // endpoint everything depends on.
    const fetchViaBackend = async () => {
      const data = await getGitHub(username);
      if (!data?.stats && !data?.calendar) throw new Error("backend: empty");
      return data;
    };

    // Two independent public endpoints: either can fail on its own (rate
    // limit, third-party downtime) without taking the section down with it,
    // so they settle separately and the render degrades one piece at a time.
    const fetchCalendar = async () => {
      if (cachedCal) return cachedCal;
      const res = await fetch(`${apiBase}/${encodeURIComponent(username)}?y=last`);
      if (!res.ok) throw new Error("calendar " + res.status);
      const json = await res.json();
      const days = json.contributions || [];
      const total =
        typeof json.total === "object"
          ? Object.values(json.total).reduce((a, b) => a + b, 0)
          : json.total || days.reduce((a, d) => a + (d.count || 0), 0);
      const data = { total, days };
      writeCache(calKey, data);
      return data;
    };

    const fetchStats = async () => {
      if (cachedStat) return cachedStat;
      const [userRes, repoRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}`),
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`),
      ]);
      if (!userRes.ok) throw new Error("user " + userRes.status);
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
      const data = {
        repos: user.public_repos || 0,
        followers: user.followers || 0,
        stars,
        topLanguages,
        joined: user.created_at ? new Date(user.created_at).getFullYear() : null,
      };
      writeCache(statKey, data);
      return data;
    };

    const run = async () => {
      if (cachedCal && cachedStat) {
        setState("ready");
        return;
      }

      try {
        const data = await fetchViaBackend();
        if (cancelled) return;
        if (data.calendar) {
          setCalendar(data.calendar);
          writeCache(calKey, data.calendar);
        }
        if (data.stats) {
          setStats(data.stats);
          writeCache(statKey, data.stats);
        }
        setState(data.calendar && data.stats ? "ready" : "partial");
        if (data.calendar && data.stats) return;
      } catch {
        /* backend not deployed or unreachable — fall through */
      }

      const [cal, stat] = await Promise.allSettled([fetchCalendar(), fetchStats()]);
      if (cancelled) return;
      if (cal.status === "fulfilled") setCalendar(cal.value);
      if (stat.status === "fulfilled") setStats(stat.value);
      setState((prev) => {
        const gotCal = cal.status === "fulfilled" || cachedCal || prev === "ready";
        const gotStat = stat.status === "fulfilled" || cachedStat;
        return gotCal && gotStat ? "ready" : gotCal || gotStat ? "partial" : "failed";
      });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [username, apiBase]);

  if (!username) return null;

  const weeks = toWeeks(calendar?.days);
  const profileUrl = `https://github.com/${username}`;

  // Month labels sit above the first week column of each month — but a label
  // is ~3 columns wide, so one is skipped if it would land on top of the
  // previous one. That happens whenever the calendar opens mid-month (a
  // 1-day "August" column immediately followed by September).
  let lastLabelAt = -99;
  const monthLabels = weeks.map((week, i) => {
    const first = week.find(Boolean);
    if (!first) return null;
    const d = new Date(first.date + "T00:00:00");
    const prev = i > 0 ? weeks[i - 1].find(Boolean) : null;
    const prevMonth = prev ? new Date(prev.date + "T00:00:00").getMonth() : -1;
    // The calendar almost always opens mid-month, so its first column holds
    // a stub of the previous month. Labelling it would print two months on
    // top of each other; GitHub drops it too.
    if (i === 0 && d.getDate() > 7) return null;
    if (d.getMonth() === prevMonth || i - lastLabelAt < 3) return null;
    lastLabelAt = i;
    return MONTHS[d.getMonth()];
  });

  const statTiles = [
    calendar ? { value: calendar.total, label: "Contributions, last year" } : null,
    stats ? { value: stats.repos, label: "Public repositories" } : null,
    stats ? { value: stats.stars, label: "Stars earned" } : null,
    stats ? { value: stats.followers, label: "Followers" } : null,
  ].filter(Boolean);

  return (
    <section className="section" id={id}>
      <div className="shell">
        <SectionHead
          title={config.title || "Open-Source Activity"}
          lead={config.lead || "A live contribution calendar, pulled straight from the GitHub API."}
        />

        <Reveal>
          <div className="gh">
            <div className="gh__head">
              <a className="gh__handle" href={profileUrl} target="_blank" rel="noreferrer">
                <GitHub aria-hidden="true" />
                <span>@{username}</span>
              </a>
              {stats?.topLanguages?.length ? (
                <ul className="gh__langs">
                  {stats.topLanguages.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {statTiles.length ? (
              <ul className="gh__stats">
                {statTiles.map((s) => (
                  <li key={s.label}>
                    <span className="gh__stat-v">{s.value.toLocaleString()}</span>
                    <span className="gh__stat-l">{s.label}</span>
                  </li>
                ))}
              </ul>
            ) : state === "loading" ? (
              // Same four tiles, same box, no numbers yet. GitHub's API is a
              // live third-party call — nothing can know these figures at
              // build time — so the honest fix is to reserve the space rather
              // than let the section grow by ~320px when the response lands
              // and shove everything below it down the page.
              <ul className="gh__stats gh__stats--skeleton" aria-hidden="true">
                {SKELETON_STATS.map((label) => (
                  <li key={label}>
                    <span className="gh__stat-v">—</span>
                    <span className="gh__stat-l">{label}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {weeks.length ? (
              <>
                <div className="gh__cal-wrap">
                  <div className={`gh__cal${animate ? " gh__cal--animate" : ""}`}>
                    <div className="gh__months">
                      {monthLabels.map((m, i) => (
                        <span key={i} className="gh__month">
                          {m || ""}
                        </span>
                      ))}
                    </div>
                    <div className="gh__weeks" role="img"
                      aria-label={`${calendar.total} GitHub contributions in the last year`}>
                      {weeks.map((week, wi) => (
                        <div className="gh__week" key={wi}>
                          {week.map((day, di) =>
                            day ? (
                              <span
                                key={day.date}
                                className="gh__day"
                                data-level={Math.min(day.level ?? 0, 4)}
                                style={{ "--i": wi }}
                                title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${day.date}`}
                              />
                            ) : (
                              <span key={`${wi}-${di}`} className="gh__day gh__day--empty" />
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="gh__legend">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} className="gh__day" data-level={l} />
                  ))}
                  <span>More</span>
                </div>
              </>
            ) : state === "loading" ? (
              // The empty grid at full size: 53 weeks of the same cells the
              // real calendar uses, so the swap to live data changes colours
              // and nothing else. The status text is announced rather than
              // printed — a visible line would itself be a height the loaded
              // state does not have.
              <>
                <div className="gh__cal-wrap" aria-hidden="true">
                  <div className="gh__cal gh__cal--skeleton">
                    <div className="gh__months">
                      {Array.from({ length: 53 }, (_, i) => (
                        <span key={i} className="gh__month" />
                      ))}
                    </div>
                    <div className="gh__weeks">
                      {Array.from({ length: 53 }, (_, wi) => (
                        <div className="gh__week" key={wi}>
                          {Array.from({ length: 7 }, (_, di) => (
                            <span key={di} className="gh__day" data-level="0" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="gh__legend" aria-hidden="true">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((l) => (
                    <span key={l} className="gh__day" data-level={l} />
                  ))}
                  <span>More</span>
                </div>
                <p className="gh__sr" role="status">
                  Loading contribution history…
                </p>
              </>
            ) : (
              <p className="gh__note">
                The contribution calendar couldn't be loaded right now — GitHub's public
                API is rate-limited per visitor. The profile itself is always up to date.
              </p>
            )}

            <a className="btn btn--lime gh__cta" href={profileUrl} target="_blank" rel="noreferrer">
              View GitHub profile
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
