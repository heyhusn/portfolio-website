import { useState } from 'react';

export default function ArrayInput({ label, items, onChange, placeholder = "Add new item..." }) {
  const [newValue, setNewValue] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (newValue.trim()) {
      onChange([...items, newValue.trim()]);
      setNewValue("");
    }
  };

  const handleRemove = (index) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>{label}</label>
      
      {items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              <span>{item}</span>
              <button 
                type="button" 
                onClick={() => handleRemove(idx)}
                style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold' }}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input 
          type="text" 
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(e); }}
          placeholder={placeholder}
          className="input"
          style={{ flex: 1, padding: '0.75rem', background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}
        />
        <button type="button" className="btn btn--lime" onClick={handleAdd}>Add</button>
      </div>
    </div>
  );
}
