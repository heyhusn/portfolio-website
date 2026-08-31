import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { updateProjects } from '../../lib/api.js';
import ArrayInput from './ArrayInput.jsx';

export default function ProjectsForm() {
  const { projects, fetchData } = useStore();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (projects) setData(projects);
  }, [projects]);

  const handleSave = async () => {
    try {
      await updateProjects(data);
      await fetchData();
      alert("Projects saved successfully!");
    } catch (err) {
      alert("Failed to save projects.");
    }
  };

  const addProject = () => {
    const newProject = {
      slug: `new-project-${Date.now()}`,
      title: "New Project",
      tag: "Category",
      year: new Date().getFullYear().toString(),
      image: "",
      featured: false,
      summary: "",
      description: "",
      highlights: [],
      stack: [],
      links: []
    };
    setData([newProject, ...data]);
  };

  const removeProject = (index) => {
    if (confirm("Are you sure you want to remove this project?")) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  const updateField = (index, field, value) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
  };

  const updateLink = (index, linkIdx, field, value) => {
    const links = [...(data[index].links || [])];
    links[linkIdx] = { ...links[linkIdx], [field]: value };
    updateField(index, 'links', links);
  };
  const addLink = (index) => {
    updateField(index, 'links', [...(data[index].links || []), { label: '', href: '' }]);
  };
  const removeLink = (index, linkIdx) => {
    updateField(index, 'links', (data[index].links || []).filter((_, i) => i !== linkIdx));
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', background: 'var(--bg-deep)', color: 'var(--text)', 
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '1rem'
  };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)', fontSize: '0.9rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="h3">Manage Projects</h2>
        <button className="btn" onClick={addProject}>+ Add Project</button>
      </div>

      {data.map((proj, idx) => (
        <div key={proj.slug || idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 className="h4" style={{ margin: 0 }}>{proj.title || "Untitled"}</h3>
            <button className="btn" style={{ borderColor: '#ff4444', color: '#ff4444' }} onClick={() => removeProject(idx)}>Remove</button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Title</label>
              <input type="text" value={proj.title || ''} onChange={e => updateField(idx, 'title', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Slug (URL friendly)</label>
              <input type="text" value={proj.slug || ''} onChange={e => updateField(idx, 'slug', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Tag / Category</label>
              <input type="text" value={proj.tag || ''} onChange={e => updateField(idx, 'tag', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Year</label>
              <input type="text" value={proj.year || ''} onChange={e => updateField(idx, 'year', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={proj.featured || false} onChange={e => updateField(idx, 'featured', e.target.checked)} />
                Featured Project
              </label>
            </div>
          </div>

          <label style={labelStyle}>Summary</label>
          <input type="text" value={proj.summary || ''} onChange={e => updateField(idx, 'summary', e.target.value)} style={inputStyle} />
          
          <label style={labelStyle}>Full Description</label>
          <textarea value={proj.description || ''} onChange={e => updateField(idx, 'description', e.target.value)} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
          
          <label style={labelStyle}>Image URL / Path</label>
          <input type="text" value={proj.image || ''} onChange={e => updateField(idx, 'image', e.target.value)} style={inputStyle} placeholder="/images/projects/your-image.jpg" />

          <label style={labelStyle}>Note (optional callout on the project's detail page)</label>
          <input type="text" value={proj.note || ''} onChange={e => updateField(idx, 'note', e.target.value)} style={inputStyle} />

          <ArrayInput
            label="Highlights (bullet points on the project's detail page)"
            items={proj.highlights || []}
            onChange={(items) => updateField(idx, 'highlights', items)}
            placeholder="Add a highlight..."
          />

          <ArrayInput
            label="Tech Stack (chips shown on the card and detail page)"
            items={proj.stack || []}
            onChange={(items) => updateField(idx, 'stack', items)}
            placeholder="e.g. Python"
          />

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Links</label>
            {(proj.links || []).map((l, linkIdx) => (
              <div key={linkIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" value={l.label || ''} onChange={e => updateLink(idx, linkIdx, 'label', e.target.value)} placeholder="Label, e.g. Live demo" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                <input type="url" value={l.href || ''} onChange={e => updateLink(idx, linkIdx, 'href', e.target.value)} placeholder="https://…" style={{ ...inputStyle, marginBottom: 0, flex: 2 }} />
                <button type="button" className="btn" style={{ borderColor: '#ff4444', color: '#ff4444', padding: '0 0.75rem' }} onClick={() => removeLink(idx, linkIdx)}>&times;</button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => addLink(idx)}>+ Add Link</button>
          </div>
        </div>
      ))}

      <button className="btn btn--lime btn--lg" onClick={handleSave} style={{ width: '100%', marginTop: '1rem' }}>
        Save All Projects
      </button>
    </div>
  );
}
