/**
 * Shared inline styles for the admin forms.
 *
 * These reference the real custom properties from styles/style.css
 * (--bg-deep, --text, --text-dim) — an earlier version of the admin panel
 * used --c-bg / --c-text / --c-text-muted, which are defined nowhere, so
 * every colour in it resolved to nothing.
 */
export const field = {
  width: '100%',
  padding: '0.7rem',
  background: 'var(--bg-deep)',
  color: 'var(--text)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '4px',
  marginBottom: '1rem',
};

export const label = {
  display: 'block',
  marginBottom: '0.4rem',
  fontSize: '0.85rem',
  color: 'var(--text-dim)',
};

export const card = {
  padding: '1.5rem',
  marginBottom: '1.25rem',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
};

export const subtle = { color: 'var(--text-dim)', fontSize: '0.9rem' };

export const row = { display: 'flex', alignItems: 'center', gap: '0.5rem' };

export const ghostBtn = {
  background: 'transparent',
  color: 'var(--text-dim)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '4px',
  padding: '0.3rem 0.6rem',
  cursor: 'pointer',
};
