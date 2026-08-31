import { useEffect, useState } from 'react';
import { useStore } from '../../store.js';
import { updateSiteContent } from '../../lib/api.js';
import { field, label as labelStyle, card, subtle, row, ghostBtn } from './adminStyles.js';

const empty = () => ({
  id: `rec_${Date.now()}`,
  name: '',
  headline: '',
  relationship: 'Worked with Husnain on the same team',
  date: '',
  href: '',
  body: [],
});

/**
 * Recommendations tab.
 *
 * The body is stored as an array of paragraphs (that's what the card renders,
 * and what the "read more" split counts), but typing JSON is a terrible way
 * to write prose — so the textarea works in plain text and blank lines are
 * what separate paragraphs, converted on the way in and out.
 */
const toText = (body) => (Array.isArray(body) ? body.join('\n\n') : body || '');
const toParagraphs = (text) =>
  String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export default function RecommendationsForm() {
  const { siteContent, fetchData } = useStore();
  const [recs, setRecs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (siteContent) setRecs(siteContent.recommendations || []);
  }, [siteContent]);

  if (!recs) return <div>Loading…</div>;

  const setRec = (i, patch) => setRecs(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const move = (i, dir) => {
    const to = i + dir;
    if (to < 0 || to >= recs.length) return;
    const next = [...recs];
    [next[i], next[to]] = [next[to], next[i]];
    setRecs(next);
  };

  const handleSave = async () => {
    for (const r of recs) {
      if (!r.name?.trim()) return alert('Every recommendation needs a name.');
      if (!toParagraphs(toText(r.body)).length) {
        return alert(`The recommendation from "${r.name}" has no text.`);
      }
    }
    setSaving(true);
    try {
      await updateSiteContent({ ...siteContent, recommendations: recs });
      await fetchData();
      alert('Recommendations saved.');
    } catch (err) {
      alert('Failed to save: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="h3">Recommendations</h2>
          <p style={subtle}>
            These are quoted from real people. Edit them to fix a transcription error — not to
            improve the wording.
          </p>
        </div>
        <button className="btn btn--lime" onClick={() => setRecs([...recs, empty()])}>
          + Add recommendation
        </button>
      </div>

      {recs.map((rec, i) => (
        <div key={rec.id || i} style={card}>
          <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1rem' }}>
            <strong style={{ fontSize: '1.1rem' }}>{rec.name || 'New recommendation'}</strong>
            <div style={row}>
              <button style={ghostBtn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button style={ghostBtn} onClick={() => move(i, 1)} disabled={i === recs.length - 1}>↓</button>
              <button
                style={{ ...ghostBtn, borderColor: '#ff6b6b', color: '#ff6b6b' }}
                onClick={() => {
                  if (confirm(`Remove the recommendation from ${rec.name || 'this person'}?`)) {
                    setRecs(recs.filter((_, j) => j !== i));
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input style={field} value={rec.name || ''} onChange={(e) => setRec(i, { name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input style={field} placeholder="July 27, 2026" value={rec.date || ''} onChange={(e) => setRec(i, { date: e.target.value })} />
            </div>
          </div>

          <label style={labelStyle}>Their LinkedIn headline</label>
          <input style={field} value={rec.headline || ''} onChange={(e) => setRec(i, { headline: e.target.value })} />

          <label style={labelStyle}>Relationship</label>
          <input style={field} value={rec.relationship || ''} onChange={(e) => setRec(i, { relationship: e.target.value })} />

          <label style={labelStyle}>Their LinkedIn profile (optional — adds an icon by their name)</label>
          <input style={field} placeholder="https://www.linkedin.com/in/…" value={rec.href || ''} onChange={(e) => setRec(i, { href: e.target.value })} />

          <label style={labelStyle}>
            Recommendation text — leave a blank line between paragraphs
          </label>
          <textarea
            style={{ ...field, minHeight: '190px', resize: 'vertical', lineHeight: 1.55 }}
            value={toText(rec.body)}
            onChange={(e) => setRec(i, { body: e.target.value })}
            onBlur={(e) => setRec(i, { body: toParagraphs(e.target.value) })}
          />
          <p style={{ ...subtle, marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            {toParagraphs(toText(rec.body)).length} paragraph
            {toParagraphs(toText(rec.body)).length === 1 ? '' : 's'} — the card shows the first two
            and expands for the rest.
          </p>
        </div>
      ))}

      <button
        className="btn btn--lime btn--lg"
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {saving ? 'Saving…' : 'Save Recommendations'}
      </button>
    </div>
  );
}
