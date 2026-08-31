import { useEffect, useState } from 'react';
import { useStore } from '../../store.js';
import { updateSiteContent } from '../../lib/api.js';
import ArrayInput from './ArrayInput.jsx';
import { field, label as labelStyle, card, subtle, row, ghostBtn } from './adminStyles.js';

const emptyCert = () => ({
  id: `cert_${Date.now()}`,
  title: '',
  issuer: '',
  partner: '',
  date: '',
  credentialId: '',
  href: '',
  topics: [],
});

const emptyVol = () => ({
  id: `vol_${Date.now()}`,
  org: '',
  role: '',
  cause: '',
  years: '',
  href: '',
  note: '',
});

/**
 * Credentials tab: certifications, volunteering and the GitHub panel.
 *
 * The GitHub username lives here rather than in source so the contributions
 * calendar can be pointed at a different account (or switched off, by
 * clearing it) without a rebuild — the section renders nothing when the
 * username is empty.
 */
export default function CredentialsForm() {
  const { siteContent, fetchData } = useStore();
  const [certs, setCerts] = useState(null);
  const [vols, setVols] = useState([]);
  const [github, setGithub] = useState({ username: '', title: '', lead: '', contributionsApi: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!siteContent) return;
    setCerts(siteContent.certifications || []);
    setVols(siteContent.volunteering || []);
    setGithub({
      username: '',
      title: '',
      lead: '',
      contributionsApi: '',
      ...(siteContent.github || {}),
    });
  }, [siteContent]);

  if (!certs) return <div>Loading…</div>;

  const setCert = (i, patch) => setCerts(prev => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setVol = (i, patch) => setVols(prev => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const handleSave = async () => {
    for (const c of certs) {
      if (!c.title?.trim() || !c.issuer?.trim()) {
        return alert('Every certification needs a title and an issuer.');
      }
    }
    for (const v of vols) {
      if (!v.org?.trim()) return alert('Every volunteering entry needs an organisation.');
    }
    setSaving(true);
    try {
      await updateSiteContent({
        ...siteContent,
        certifications: certs,
        volunteering: vols,
        github,
      });
      await fetchData();
      alert('Credentials saved.');
    } catch (err) {
      alert('Failed to save: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* ---------------- Certifications ---------------- */}
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 className="h3">Certifications</h2>
          <p style={subtle}>Credential IDs are shown publicly so anyone can verify them.</p>
        </div>
        <button className="btn btn--lime" onClick={() => setCerts([...certs, emptyCert()])}>
          + Add certification
        </button>
      </div>

      {certs.map((cert, i) => (
        <div key={cert.id || i} style={card}>
          <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1rem' }}>
            <strong>{cert.title || 'New certification'}</strong>
            <button
              style={{ ...ghostBtn, borderColor: '#ff6b6b', color: '#ff6b6b' }}
              onClick={() => setCerts(certs.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>

          <label style={labelStyle}>Title</label>
          <input style={field} value={cert.title || ''} onChange={(e) => setCert(i, { title: e.target.value })} />

          <label style={labelStyle}>Issuer</label>
          <input style={field} value={cert.issuer || ''} onChange={(e) => setCert(i, { issuer: e.target.value })} />

          <label style={labelStyle}>Partner / co-issuer (optional)</label>
          <input style={field} value={cert.partner || ''} onChange={(e) => setCert(i, { partner: e.target.value })} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input style={field} placeholder="Nov 2025" value={cert.date || ''} onChange={(e) => setCert(i, { date: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Credential ID</label>
              <input style={field} value={cert.credentialId || ''} onChange={(e) => setCert(i, { credentialId: e.target.value })} />
            </div>
          </div>

          <label style={labelStyle}>Verification link (optional — hides the button when blank)</label>
          <input style={field} placeholder="https://…" value={cert.href || ''} onChange={(e) => setCert(i, { href: e.target.value })} />

          <ArrayInput
            label="Topics covered"
            items={cert.topics || []}
            onChange={(topics) => setCert(i, { topics })}
            placeholder="Add a topic…"
          />
        </div>
      ))}

      {/* ---------------- Volunteering ---------------- */}
      <div style={{ ...row, justifyContent: 'space-between', margin: '2.5rem 0 1.25rem' }}>
        <h2 className="h3">Volunteering</h2>
        <button className="btn btn--lime" onClick={() => setVols([...vols, emptyVol()])}>
          + Add entry
        </button>
      </div>

      {vols.map((vol, i) => (
        <div key={vol.id || i} style={card}>
          <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1rem' }}>
            <strong>{vol.org || 'New entry'}</strong>
            <button
              style={{ ...ghostBtn, borderColor: '#ff6b6b', color: '#ff6b6b' }}
              onClick={() => setVols(vols.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Organisation</label>
              <input style={field} value={vol.org || ''} onChange={(e) => setVol(i, { org: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Role</label>
              <input style={field} value={vol.role || ''} onChange={(e) => setVol(i, { role: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Cause</label>
              <input style={field} value={vol.cause || ''} onChange={(e) => setVol(i, { cause: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Dates</label>
              <input style={field} placeholder="Nov 2025 — Present" value={vol.years || ''} onChange={(e) => setVol(i, { years: e.target.value })} />
            </div>
          </div>

          <label style={labelStyle}>Link (optional)</label>
          <input style={field} value={vol.href || ''} onChange={(e) => setVol(i, { href: e.target.value })} />

          <label style={labelStyle}>Note (optional)</label>
          <input style={field} value={vol.note || ''} onChange={(e) => setVol(i, { note: e.target.value })} />
        </div>
      ))}

      {/* ---------------- GitHub ---------------- */}
      <h2 className="h3" style={{ margin: '2.5rem 0 0.5rem' }}>GitHub Contributions</h2>
      <p style={{ ...subtle, marginBottom: '1.25rem' }}>
        Clear the username to hide the section entirely. Stats come from GitHub's public
        API; the calendar comes from the contributions endpoint below.
      </p>

      <div style={card}>
        <label style={labelStyle}>GitHub username</label>
        <input style={field} value={github.username || ''} onChange={(e) => setGithub({ ...github, username: e.target.value.trim() })} />

        <label style={labelStyle}>Section heading</label>
        <input style={field} placeholder="Open-Source Activity" value={github.title || ''} onChange={(e) => setGithub({ ...github, title: e.target.value })} />

        <label style={labelStyle}>Section intro line</label>
        <input style={field} value={github.lead || ''} onChange={(e) => setGithub({ ...github, lead: e.target.value })} />

        <label style={labelStyle}>Contributions API base (leave blank for the default)</label>
        <input
          style={field}
          placeholder="https://github-contributions-api.jogruber.de/v4"
          value={github.contributionsApi || ''}
          onChange={(e) => setGithub({ ...github, contributionsApi: e.target.value.trim() })}
        />
      </div>

      <button
        className="btn btn--lime btn--lg"
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {saving ? 'Saving…' : 'Save Credentials'}
      </button>
    </div>
  );
}
