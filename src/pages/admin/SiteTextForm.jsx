import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { updateSiteContent } from '../../lib/api.js';

export default function SiteTextForm() {
  const { siteContent, fetchData } = useStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (siteContent) setData(siteContent);
  }, [siteContent]);

  if (!data) return <div>Loading...</div>;

  const handleSave = async () => {
    try {
      await updateSiteContent(data);
      await fetchData();
      alert("Site content saved successfully!");
    } catch (err) {
      alert("Failed to save site content.");
    }
  };

  const handleStringChange = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', background: 'var(--bg-deep)', color: 'var(--text)', 
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '1.5rem',
    fontFamily: 'monospace'
  };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)' };

  return (
    <div>
      <h2 className="h3" style={{ marginBottom: '1.5rem' }}>Edit Site Texts & Arrays</h2>
      <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>
        For complex nested arrays (like Experience, Process, FAQs), use the simplified JSON editor below. It's pre-formatted for safety.
      </p>

      {Object.keys(data).map(key => (
        <div key={key}>
          <label style={labelStyle}>{key.charAt(0).toUpperCase() + key.slice(1)} (JSON format)</label>
          {/* Uncontrolled on purpose: this used to also bind `value` to the
              parsed state, which only updated on valid JSON. Since almost
              every keystroke mid-edit is momentarily invalid JSON, the
              textarea's visible text got reverted after every character —
              it was effectively impossible to type in. Committing only on
              blur (like the section content editors) fixes that. */}
          <textarea
            key={key}
            defaultValue={JSON.stringify(data[key], null, 2)}
            onBlur={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleStringChange(key, parsed);
              } catch (err) {
                alert(`Invalid JSON in ${key} — change wasn't saved.`);
              }
            }}
            style={{ ...inputStyle, minHeight: '150px', resize: 'vertical' }}
          />
        </div>
      ))}

      <button className="btn btn--lime btn--lg" onClick={handleSave} style={{ width: '100%', marginTop: '1rem' }}>
        Save Site Texts
      </button>
    </div>
  );
}
