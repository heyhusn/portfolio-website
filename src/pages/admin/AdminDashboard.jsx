import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getSections, updateSections, logout, SESSION_EXPIRED_EVENT } from '../../lib/api.js';
import { useStore } from '../../store.js';

import ProfileForm from './ProfileForm.jsx';
import ProjectsForm from './ProjectsForm.jsx';
import SiteTextForm from './SiteTextForm.jsx';
import PostsForm from './PostsForm.jsx';
import SkillsForm from './SkillsForm.jsx';
import CredentialsForm from './CredentialsForm.jsx';
import RecommendationsForm from './RecommendationsForm.jsx';
import AssistantForm from './AssistantForm.jsx';

export default function AdminDashboard() {
  const [sections, setSections] = useState([]);
  const [sectionsError, setSectionsError] = useState(false);
  const [activeTab, setActiveTab] = useState('sections');

  const { fetchData, apiReachable, apiError } = useStore();
  const navigate = useNavigate();

  // The API layer clears the token and fires this when the server stops
  // accepting it. Bouncing to /login here means an expired session looks like
  // an expired session, rather than every button quietly failing.
  useEffect(() => {
    const onExpired = () => navigate('/login');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    // GET /api/sections doesn't require auth (it's public content), so a
    // failure here means the API is unreachable, not that the token is
    // bad — logging the admin out and bouncing them to /login on every
    // transient network hiccup (as this used to do) is the wrong response.
    // A genuinely invalid/expired token surfaces naturally the moment they
    // try to save something, from the authenticateToken-guarded PUT routes.
    getSections()
      .then(setSections)
      .catch(() => setSectionsError(true));
  }, [navigate]);

  const handleOnDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSections(items);
  };

  const handleSaveSections = async () => {
    try {
      await updateSections(sections);
      await fetchData();
      alert('Sections layout saved!');
    } catch (err) {
      alert('Failed to save layout.');
    }
  };

  const updateSection = (id, field, value) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const removeSection = (id) => {
    if (confirm("Remove this section entirely?")) {
      setSections(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddSection = () => {
    const type = prompt("Enter section type ('custom_text' or 'custom_boxes'):", "custom_text");
    if (type !== 'custom_text' && type !== 'custom_boxes') {
      alert("Invalid type. Must be custom_text or custom_boxes");
      return;
    }
    const title = prompt("Enter section title:");
    if (!title) return;
    
    const newSection = {
      id: `custom_${Date.now()}`,
      title,
      type,
      is_visible: true,
      animation_type: 'default',
      font_family: 'default',
      content: type === 'custom_text' ? { text: "Your custom text here..." } : { boxes: [] }
    };
    setSections([...sections, newSection]);
  };

  const renderSectionContentEditor = (section) => {
    if (section.type === 'predefined') return null;
    
    if (section.type === 'custom_text') {
      return (
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>Custom Text Content</label>
          <textarea 
            style={{ width: '100%', padding: '8px', background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', minHeight: '80px' }}
            value={section.content?.text || ''}
            onChange={(e) => updateSection(section.id, 'content', { ...section.content, text: e.target.value })}
          />
        </div>
      );
    }
    
    if (section.type === 'custom_boxes') {
      // simplified raw JSON for boxes to save time
      return (
        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>Boxes JSON Array: [&#123;"title":"Box 1","desc":"Desc"&#125;]</label>
          <textarea 
            style={{ width: '100%', padding: '8px', background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', minHeight: '80px', fontFamily: 'monospace' }}
            defaultValue={JSON.stringify(section.content?.boxes || [])}
            onBlur={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateSection(section.id, 'content', { ...section.content, boxes: parsed });
              } catch (err) {
                alert("Invalid JSON for boxes array.");
              }
            }}
          />
        </div>
      );
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', color: 'var(--text)' }}>
      {/* The console warning is for whoever opens devtools. This is for the
          person about to spend ten minutes editing content that cannot save.
          A silent fallback is right for a visitor and wrong for an admin. */}
      {apiReachable === false && (
        <div
          role="alert"
          style={{
            marginBottom: '1.5rem', padding: '1rem 1.25rem',
            border: '1px solid #ff9db4', borderLeft: '3px solid #ff9db4',
            borderRadius: '6px', background: 'rgba(255,157,180,0.08)',
          }}
        >
          <strong style={{ color: '#ff9db4' }}>The content API is not responding.</strong>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            Everything below is the content bundled at build time, not what is stored.
            Edits will fail to save until this is fixed.
          </p>
          {apiError && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontFamily: 'ui-monospace, monospace', color: 'var(--text-faint)' }}>
              {apiError}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="h2">Admin Dashboard</h1>
        <button className="btn" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '1rem' }}>
        <button className={`btn ${activeTab === 'sections' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('sections')}>Sections Layout</button>
        <button className={`btn ${activeTab === 'profile' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('profile')}>Profile</button>
        <button className={`btn ${activeTab === 'projects' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('projects')}>Projects</button>
        <button className={`btn ${activeTab === 'site' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('site')}>Site Text</button>
        <button className={`btn ${activeTab === 'posts' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('posts')}>Blog Posts</button>
        <button className={`btn ${activeTab === 'skills' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('skills')}>Skills</button>
        <button className={`btn ${activeTab === 'credentials' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('credentials')}>Credentials & GitHub</button>
        <button className={`btn ${activeTab === 'recommendations' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('recommendations')}>Recommendations</button>
        <button className={`btn ${activeTab === 'assistant' ? 'btn--lime' : ''}`} onClick={() => setActiveTab('assistant')}>RAG Assistant</button>
      </div>

      {activeTab === 'sections' && sectionsError && (
        <p style={{ color: '#ff9db4' }}>
          Couldn't reach the admin API to load the sections layout. Make sure the
          backend is running (see backend/README or run <code>npm start</code> in
          backend/), then reload this page.
        </p>
      )}

      {activeTab === 'sections' && !sectionsError && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 className="h3">Manage Sections Layout</h2>
              <p style={{ color: 'var(--text-dim)' }}>Drag and drop to reorder. Toggle visibility and change animations or fonts.</p>
            </div>
            <button className="btn btn--lime" onClick={handleAddSection}>+ Add Custom Section</button>
          </div>
          
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {sections.map((section, index) => (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            padding: '1.5rem', margin: '0 0 1rem 0', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                            display: 'flex', flexDirection: 'column', gap: '1rem',
                            ...provided.draggableProps.style
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span {...provided.dragHandleProps} style={{ cursor: 'grab', fontSize: '1.5rem', padding: '0.5rem' }}>⠿</span>
                              <div>
                                <strong style={{ fontSize: '1.2rem', display: 'block' }}>{section.title}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{section.type}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" checked={section.is_visible} 
                                  onChange={(e) => updateSection(section.id, 'is_visible', e.target.checked)}
                                /> Visible
                              </label>
                              {section.type !== 'predefined' && (
                                <button className="btn" style={{ borderColor: '#ff4444', color: '#ff4444', padding: '0.25rem 0.5rem' }} onClick={() => removeSection(section.id)}>Remove</button>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>Animation Effect</label>
                              <select 
                                value={section.animation_type || 'default'} 
                                onChange={(e) => updateSection(section.id, 'animation_type', e.target.value)}
                                style={{ width: '100%', padding: '8px', background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}
                              >
                                <option value="default">Default</option>
                                <option value="fade-up">Fade Up (Framer Motion)</option>
                                <option value="slide-in">Slide In (Framer Motion)</option>
                                <option value="scale-up">Scale Up (Framer Motion)</option>
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-dim)' }}>Font Style</label>
                              <select 
                                value={section.font_family || 'default'} 
                                onChange={(e) => updateSection(section.id, 'font_family', e.target.value)}
                                style={{ width: '100%', padding: '8px', background: 'var(--bg-deep)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}
                              >
                                <option value="default">Default</option>
                                <option value="serif">Serif</option>
                                <option value="mono">Monospace</option>
                              </select>
                            </div>
                          </div>

                          {renderSectionContentEditor(section)}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          <button className="btn btn--lime btn--lg" onClick={handleSaveSections} style={{ marginTop: '2rem', width: '100%' }}>Save Layout & Effects</button>
        </>
      )}

      {activeTab === 'profile' && <ProfileForm />}
      {activeTab === 'projects' && <ProjectsForm />}
      {activeTab === 'site' && <SiteTextForm />}
      {activeTab === 'posts' && <PostsForm />}
      {activeTab === 'skills' && <SkillsForm />}
      {activeTab === 'credentials' && <CredentialsForm />}
      {activeTab === 'recommendations' && <RecommendationsForm />}
      {activeTab === 'assistant' && <AssistantForm />}
    </div>
  );
}
