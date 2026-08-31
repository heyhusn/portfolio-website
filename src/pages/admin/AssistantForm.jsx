import { useEffect, useState } from 'react';
import { getRagMeta, reindexRag, retrieveRag } from '../../lib/api.js';
import { field, label as labelStyle, card, subtle, row } from './adminStyles.js';

/**
 * Assistant tab: the knowledge base's status, a rebuild button, and a
 * retrieval probe.
 *
 * The probe is the useful part. When the assistant answers something badly
 * the question is always "did retrieval find the right passages, or did the
 * model mishandle good ones?" — and those have completely different fixes.
 * This runs retrieval alone, with no LLM call and no cost, so the answer is
 * one click away instead of a guess.
 */
export default function AssistantForm() {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState("");
  const [hits, setHits] = useState(null);

  const load = () =>
    getRagMeta()
      .then((m) => { setMeta(m); setError(""); })
      .catch(() => setError("Couldn't reach the API. Is the backend running?"));

  useEffect(() => { load(); }, []);

  const handleReindex = async () => {
    if (!confirm("Rebuild the knowledge base from site content, resumes, LinkedIn and GitHub?")) return;
    setBusy(true);
    try {
      const res = await reindexRag();
      await load();
      alert(`Rebuilt: ${res.documents} documents, ${res.chunks} chunks.`);
    } catch (err) {
      alert('Reindex failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleProbe = async (e) => {
    e.preventDefault();
    if (!probe.trim()) return;
    setBusy(true);
    try {
      const res = await retrieveRag(probe.trim());
      setHits(res.hits || []);
    } catch (err) {
      alert('Retrieval failed: ' + (err?.response?.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="h3" style={{ marginBottom: '0.5rem' }}>RAG Assistant</h2>
      <p style={{ ...subtle, marginBottom: '1.5rem' }}>
        The assistant on the home page answers only from indexed passages of your own material.
        Rebuild the index after editing site content, adding a resume to
        <code> backend/rag/sources/resumes/</code>, or running <code>npm run refresh:github</code>.
      </p>

      {error ? <p style={{ color: '#ff9db4' }}>{error}</p> : null}

      {meta ? (
        <div style={card}>
          <div style={{ ...row, gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <div style={subtle}>Status</div>
              <strong style={{ color: meta.ready ? 'var(--lime)' : '#ff9db4' }}>
                {meta.ready ? 'Ready' : meta.llmConfigured ? 'Index empty' : 'No API key set'}
              </strong>
            </div>
            <div>
              <div style={subtle}>Passages indexed</div>
              <strong>{meta.indexed}</strong>
            </div>
            <div>
              <div style={subtle}>Model</div>
              <strong>{meta.model}</strong>
            </div>
          </div>

          {meta.stats?.bySource?.length ? (
            <div style={{ ...row, gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {meta.stats.bySource.map((s) => (
                <span key={s.source} style={{ ...subtle, fontSize: '0.85rem' }}>
                  {s.source}: <strong style={{ color: 'var(--text)' }}>{s.n}</strong>
                </span>
              ))}
            </div>
          ) : null}

          {!meta.llmConfigured ? (
            <p style={{ color: '#ff9db4', fontSize: '0.9rem' }}>
              <code>LLM_API_KEY</code> isn't set in <code>backend/.env</code>, so questions can't be
              answered. Retrieval still works and the probe below is still useful.
            </p>
          ) : null}

          <button className="btn btn--lime" onClick={handleReindex} disabled={busy}>
            {busy ? 'Working…' : 'Rebuild knowledge base'}
          </button>
        </div>
      ) : null}

      <div style={card}>
        <h3 className="h4" style={{ marginBottom: '0.5rem' }}>Retrieval probe</h3>
        <p style={{ ...subtle, marginBottom: '1rem' }}>
          Shows exactly which passages a question retrieves, before any model sees them. No API
          call, no cost. If the right passage isn't in this list, the problem is the knowledge
          base — not the model.
        </p>
        <form onSubmit={handleProbe} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            style={{ ...field, marginBottom: 0 }}
            placeholder="e.g. what were the VLVRAG results?"
            value={probe}
            onChange={(e) => setProbe(e.target.value)}
          />
          <button className="btn" type="submit" disabled={busy}>Probe</button>
        </form>

        {hits ? (
          hits.length ? (
            <ol style={{ marginTop: '1.5rem', paddingLeft: '1.2rem', listStyle: 'decimal' }}>
              {hits.map((h, i) => (
                <li key={i} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{h.title}</strong>
                    <span style={{ ...subtle, whiteSpace: 'nowrap' }}>
                      {h.source} · {h.relevance}
                    </span>
                  </div>
                  <p style={{ ...subtle, fontSize: '0.85rem', marginTop: '0.25rem' }}>{h.preview}…</p>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ ...subtle, marginTop: '1.5rem' }}>
              Nothing matched — the assistant would decline this question rather than guess.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}
