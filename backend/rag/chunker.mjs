/**
 * Chunking.
 *
 * Two strategies, because the corpus has two shapes:
 *
 *  - Structured records (a project, a certification, a job) are already the
 *    right size and already have a natural title. Splitting those would only
 *    separate a claim from the thing it is about, so they stay whole and each
 *    becomes one chunk.
 *  - Long documents (resumes, READMEs, the LinkedIn export) get split on
 *    headings first, then on paragraph boundaries with an overlap, so a fact
 *    that straddles a boundary still appears intact in one of the two chunks.
 *
 * Every chunk carries its source, a human-readable title and a URL where one
 * exists, because the answer route cites them and an uncitable chunk is not
 * worth retrieving.
 */

export const MAX_CHARS = 1100;
export const OVERLAP_CHARS = 180;
const MIN_CHARS = 60;

/** Split on markdown headings, keeping each heading with its body. */
function splitOnHeadings(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = { heading: "", body: [] };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (current.heading || current.body.join("").trim()) sections.push(current);
      current = { heading: m[2].trim(), body: [] };
    } else {
      current.body.push(line);
    }
  }
  if (current.heading || current.body.join("").trim()) sections.push(current);

  return sections
    .map((s) => ({ heading: s.heading, text: s.body.join("\n").trim() }))
    .filter((s) => s.heading || s.text);
}

/** Paragraph-aware windowing with overlap. Never splits mid-word. */
function windowText(text, maxChars = MAX_CHARS, overlap = OVERLAP_CHARS) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  let buf = "";

  const flush = () => {
    if (buf.trim().length >= MIN_CHARS) out.push(buf.trim());
    buf = "";
  };

  for (const para of paras) {
    if (para.length > maxChars) {
      // A single paragraph longer than the window (common in READMEs that use
      // one line per section). Fall back to sentence boundaries.
      flush();
      const sentences = para.split(/(?<=[.!?])\s+/);
      let s = "";
      for (const sentence of sentences) {
        if ((s + " " + sentence).length > maxChars && s) {
          out.push(s.trim());
          s = s.slice(Math.max(0, s.length - overlap));
        }
        s += (s ? " " : "") + sentence;
      }
      if (s.trim().length >= MIN_CHARS) out.push(s.trim());
      continue;
    }

    if ((buf + "\n\n" + para).length > maxChars && buf) {
      out.push(buf.trim());
      // Carry the tail of the previous window forward so a fact split across
      // the boundary is still whole somewhere.
      const tail = buf.slice(Math.max(0, buf.length - overlap));
      buf = tail.includes("\n") ? tail.slice(tail.indexOf("\n") + 1) : tail;
    }
    buf += (buf ? "\n\n" : "") + para;
  }
  flush();
  return out;
}

/**
 * @param {object} doc  { id, source, title, url, text, kind, date }
 * @returns {Array} chunks ready for the index
 */
export function chunkDocument(doc) {
  const chunks = [];
  const sections = splitOnHeadings(doc.text || "");

  for (const section of sections) {
    const heading = section.heading;
    const windows = windowText(section.text || "");
    const bodies = windows.length ? windows : heading ? [""] : [];

    // A document whose first heading restates its own title (every resume
    // does) would otherwise be cited as "Resume — AI Engineer track — Resume
    // — AI Engineer track". Only append a heading that adds something.
    const norm = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const headingAddsNothing =
      !heading || norm(doc.title).includes(norm(heading)) || norm(heading).includes(norm(doc.title));

    bodies.forEach((body, i) => {
      const title = headingAddsNothing ? doc.title : `${doc.title} — ${heading}`;
      // The heading is repeated into the body on purpose: BM25 scores the text
      // it is given, and a chunk whose only mention of "VLVRAG" is in a title
      // field it never sees is a chunk that can't be found.
      const text = [heading, body].filter(Boolean).join("\n");
      if (text.trim().length < MIN_CHARS && bodies.length > 1) return;
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        docId: doc.id,
        source: doc.source,
        kind: doc.kind || "document",
        title,
        url: doc.url || "",
        date: doc.date || "",
        text,
        part: i,
      });
    });
  }

  if (!chunks.length && (doc.text || "").trim().length >= MIN_CHARS) {
    chunks.push({
      id: `${doc.id}#0`,
      docId: doc.id,
      source: doc.source,
      kind: doc.kind || "document",
      title: doc.title,
      url: doc.url || "",
      date: doc.date || "",
      text: doc.text.trim(),
      part: 0,
    });
  }

  return chunks;
}

/** Structured records skip windowing — see the note at the top of the file. */
export function recordChunk({ id, source, kind, title, url, date, text }) {
  return {
    id,
    docId: id,
    source,
    kind: kind || "record",
    title,
    url: url || "",
    date: date || "",
    text: text.trim(),
    part: 0,
  };
}
