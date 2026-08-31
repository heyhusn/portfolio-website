import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { updateProfile } from '../../lib/api.js';
import ArrayInput from './ArrayInput.jsx';

const SOCIAL_DEFAULTS = {
  linkedin: { label: 'LinkedIn' },
  github: { label: 'GitHub' },
};

export default function ProfileForm() {
  const { profile, fetchData } = useStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (profile) setData(profile);
  }, [profile]);

  if (!data) return <div>Loading profile...</div>;

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // profile.socials is an array of {kind,label,href} — that's what
  // Socials.jsx (nav badge, footer, about page) actually reads. This used
  // to write a {linkedin,github} object instead, a shape nothing else in
  // the app understood, so a saved social link never appeared anywhere.
  const socialHref = (kind) => data.socials?.find(s => s.kind === kind)?.href || '';
  const setSocialHref = (kind, href) => {
    setData(prev => {
      const socials = [...(prev.socials || [])];
      const idx = socials.findIndex(s => s.kind === kind);
      if (idx >= 0) socials[idx] = { ...socials[idx], href };
      else socials.push({ kind, label: SOCIAL_DEFAULTS[kind]?.label || kind, href });
      return { ...prev, socials };
    });
  };

  const handleSave = async () => {
    try {
      await updateProfile(data);
      await fetchData();
      alert("Profile saved successfully!");
    } catch (err) {
      alert("Failed to save profile.");
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', background: 'var(--bg-deep)', color: 'var(--text)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '1.5rem'
  };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)' };

  return (
    <div>
      <h2 className="h3" style={{ marginBottom: '1.5rem' }}>Edit Profile Details</h2>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Full Name</label>
          <input type="text" value={data.name || ''} onChange={e => handleChange('name', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Role</label>
          <input type="text" value={data.role || ''} onChange={e => handleChange('role', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <ArrayInput
        label="Hero Words (Animated words in header)"
        items={data.heroWords || []}
        onChange={(newItems) => handleChange('heroWords', newItems)}
      />

      <label style={labelStyle}>Intro Paragraph</label>
      <textarea
        value={data.intro || ''}
        onChange={e => handleChange('intro', e.target.value)}
        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
      />

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Availability Status</label>
          <input type="text" value={data.availability || ''} onChange={e => handleChange('availability', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Location</label>
          <input type="text" value={data.location || ''} onChange={e => handleChange('location', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <label style={labelStyle}>Email Address</label>
      <input type="email" value={data.email || ''} onChange={e => handleChange('email', e.target.value)} style={inputStyle} />

      <h3 className="h4" style={{ marginTop: '2rem', marginBottom: '1rem' }}>Social Links</h3>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>LinkedIn URL</label>
          <input type="url" value={socialHref('linkedin')} onChange={e => setSocialHref('linkedin', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>GitHub URL</label>
          <input type="url" value={socialHref('github')} onChange={e => setSocialHref('github', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <button className="btn btn--lime btn--lg" onClick={handleSave} style={{ width: '100%', marginTop: '1rem' }}>
        Save Profile Changes
      </button>
    </div>
  );
}
