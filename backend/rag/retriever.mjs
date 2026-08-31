/**
 * Retrieval: BM25 over the chunk index, then MMR for diversity.
 *
 * Why BM25 and not embeddings: the corpus is a few hundred chunks about one
 * person, and the queries are overwhelmingly about named things — "VLVRAG",
 * "FastAPI", "Hariyali", "NASA POWER", "Rector's Merit Award". Lexical
 * matching is exactly right for named entities, it needs no embedding
 * endpoint (DeepSeek does not offer one), it is deterministic, and it costs
 * nothing per query. The recall gap that embeddings would close is handled
 * instead by query expansion below and by the LLM reranking stage.
 *
 * Everything here is dependency-free and runs in a few milliseconds.
 */

const K1 = 1.5;
const B = 0.75;

/* Common English words plus the ones that appear in nearly every chunk of
 * this particular corpus — "husnain" in a corpus entirely about Husnain has
 * no discriminating power at all, and leaving it in makes every query match
 * everything a little. */
const STOPWORDS = new Set(
  ("a an and are as at be been being but by for from had has have he her hers herself him " +
    "himself his i if in into is it its me my of on or our ours she that the their theirs them " +
    "then there these they this those to us was we were what when where which while who whom " +
    "why will with would you your yours do does did done can could should shall may might must " +
    "about any all also more most some such than too very just get got give given tell told " +
    "how here know like make made much many other over please really say said see show " +
    // A corpus entirely about one person: his own name carries no signal, and
    // leaving it in makes every query match every chunk a little.
    "husnain aslam muhammad")
    .split(/\s+/)
);

/** Light stemmer: enough to tie "engineering" to "engineer", not enough to
 *  break names. A full Porter stemmer mangles "kotlin" and "keras", and an
 *  earlier version of this one stripped "-ations" so aggressively that
 *  "publications" became "public" — which is why "has he published any
 *  papers" could not find the publications section of his CV. Suffixes are
 *  stripped one at a time, longest first, and only from words long enough
 *  that a root survives. */
function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && w.length > 3) {
    w = w.slice(0, -1);
  }
  if (w.length > 5) {
    if (w.endsWith("ing")) w = w.slice(0, -3);
    else if (w.endsWith("edly") || w.endsWith("ingly")) w = w.replace(/(edly|ingly)$/, "");
    else if (w.endsWith("ed")) w = w.slice(0, -2);
    else if (w.endsWith("ly")) w = w.slice(0, -2);
  }
  return w;
}

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    // Keep dots and pluses inside tokens so "node.js", "c++" and "3.94"
    // survive as single terms instead of shattering into noise.
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t && t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/** Domain synonyms, so a visitor's wording doesn't have to match his. */
const EXPANSIONS = {
  rag: ["retrieval", "augmented", "generation", "vlvrag"],
  llm: ["language", "model", "gpt", "generative"],
  ml: ["machine", "learning"],
  ai: ["artificial", "intelligence", "machine", "learning"],
  nlp: ["natural", "language", "processing"],
  cv: ["resume", "curriculum"],
  resume: ["cv"],
  job: ["role", "work", "position", "employment"],
  hire: ["available", "role", "work", "employment"],
  study: ["education", "degree", "university"],
  school: ["education", "university", "degree"],
  grade: ["cgpa", "gpa"],
  gpa: ["cgpa", "grade"],
  // "published"/"publications" do not share a stem, and neither reaches
  // "abstract" or "ICASF" — the words his CV actually uses. Bridge them.
  paper: ["publication", "publish", "research", "conference", "abstract", "manuscript", "icasf"],
  publication: ["paper", "publish", "conference", "abstract", "manuscript", "icasf"],
  publish: ["paper", "publication", "conference", "abstract", "manuscript"],
  research: ["paper", "publication", "vlvrag", "conference"],
  award: ["honour", "honor", "merit", "recognition"],
  backend: ["api", "fastapi", "django", "server"],
  frontend: ["react", "web", "ui"],
  mobile: ["android", "kotlin", "app"],
  database: ["sql", "mysql", "mongodb", "firebase"],
  contact: ["email", "phone", "reach", "hire", "touch", "gmail"],
  email: ["contact", "reach", "gmail"],
  reach: ["contact", "email", "phone"],
  cgpa: ["grade", "gpa", "degree", "education"],
  teach: ["lecturer", "instructor", "teaching", "professor"],
};

function expand(tokens) {
  const out = [...tokens];
  for (const t of tokens) {
    const extra = EXPANSIONS[t];
    if (extra) out.push(...extra.map(stem));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

/**
 * @param {Array} chunks from buildCorpus()
 */
export function buildIndex(chunks) {
  const docs = chunks.map((c) => {
    const bodyTokens = tokenize(c.text);
    // Title terms count for more: a chunk titled "Project: VLVRAG" is a better
    // answer to "what is VLVRAG" than one that mentions it once in passing.
    const titleTokens = tokenize(c.title);
    const tokens = [...bodyTokens, ...titleTokens, ...titleTokens];
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { chunk: c, tf, length: tokens.length };
  });

  const df = new Map();
  for (const d of docs) for (const term of d.tf.keys()) df.set(term, (df.get(term) || 0) + 1);

  const N = docs.length || 1;
  const avgLen = docs.reduce((a, d) => a + d.length, 0) / N || 1;
  const idf = new Map();
  for (const [term, n] of df) idf.set(term, Math.log(1 + (N - n + 0.5) / (n + 0.5)));

  return { docs, idf, avgLen, N };
}

function score(index, queryTokens, doc) {
  let s = 0;
  for (const term of queryTokens) {
    const f = doc.tf.get(term);
    if (!f) continue;
    const idf = index.idf.get(term) || 0;
    s += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (doc.length / index.avgLen))));
  }
  return s;
}

/* Source priors. The site is what he publishes and maintains, so a
 * contradiction between an old resume and the live site should resolve to the
 * site. This is a nudge, not an override — a strong lexical match on a README
 * still outranks a weak one on the site. */
const SOURCE_WEIGHT = { site: 1.12, resume: 1.06, linkedin: 1.0, github: 0.98 };

/**
 * Maximal Marginal Relevance. Without it the top-k for "tell me about his RAG
 * work" comes back as five near-identical chunks from the same README, and the
 * model answers from one narrow slice. MMR trades a little relevance for
 * coverage across documents.
 */
function mmr(candidates, k, lambda = 0.72) {
  const chosen = [];
  const pool = [...candidates];

  while (chosen.length < k && pool.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      let maxSim = 0;
      for (const s of chosen) {
        // Same document is the strongest similarity signal we have without
        // vectors; token overlap covers the rest.
        const sameDoc = s.chunk.docId === c.chunk.docId ? 0.6 : 0;
        const overlap = jaccard(s.terms, c.terms);
        maxSim = Math.max(maxSim, Math.max(sameDoc, overlap));
      }
      const value = lambda * c.norm - (1 - lambda) * maxSim;
      if (value > bestScore) {
        bestScore = value;
        bestIdx = i;
      }
    }
    chosen.push(pool.splice(bestIdx, 1)[0]);
  }
  return chosen;
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

/**
 * @returns {Array} [{ chunk, score }] best first
 */
export function search(index, query, { k = 8, pool = 30 } = {}) {
  const base = tokenize(query);
  if (!base.length) return [];
  const queryTokens = expand(base);

  const scored = [];
  for (const doc of index.docs) {
    let s = score(index, queryTokens, doc);
    if (s <= 0) continue;
    s *= SOURCE_WEIGHT[doc.chunk.source] ?? 1;
    scored.push({ chunk: doc.chunk, raw: s, terms: new Set(doc.tf.keys()) });
  }
  if (!scored.length) return [];

  scored.sort((a, b) => b.raw - a.raw);
  const top = scored.slice(0, pool);
  const max = top[0].raw || 1;
  top.forEach((t) => (t.norm = t.raw / max));

  return mmr(top, Math.min(k, top.length)).map(({ chunk, raw, norm }) => ({
    chunk,
    score: raw,
    relevance: norm,
  }));
}

export default { buildIndex, search, tokenize };
