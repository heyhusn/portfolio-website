import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { updatePosts } from '../../lib/api.js';

// There was previously no way to edit or publish a blog post at all: the
// backend had no PUT /api/posts route, and no tab here called it. The six
// seeded posts are drafts (see backend/seed.mjs) and stay hidden from the
// public /blogs pages until switched to published here.
export default function PostsForm() {
  const { posts, fetchData } = useStore();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (posts) setData(posts);
  }, [posts]);

  const handleSave = async () => {
    try {
      await updatePosts(data);
      await fetchData();
      alert("Posts saved successfully!");
    } catch (err) {
      alert("Failed to save posts.");
    }
  };

  const addPost = () => {
    const today = new Date().toISOString().slice(0, 10);
    setData([
      {
        slug: `new-post-${Date.now()}`,
        title: "New Post",
        category: "Practice",
        date: today,
        dateLabel: today,
        image: "",
        excerpt: "",
        body: [{ type: "p", text: "" }],
        isDraft: true,
      },
      ...data,
    ]);
  };

  const removePost = (index) => {
    if (confirm("Are you sure you want to remove this post?")) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  const updateField = (index, field, value) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);
  };

  const inputStyle = {
    width: '100%', padding: '0.75rem', background: 'var(--bg-deep)', color: 'var(--text)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', marginBottom: '1rem'
  };
  const labelStyle = { display: 'block', marginBottom: '0.5rem', color: 'var(--text-dim)', fontSize: '0.9rem' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="h3">Manage Blog Posts</h2>
        <button className="btn" onClick={addPost}>+ Add Post</button>
      </div>

      {data.map((post, idx) => (
        <div key={post.slug || idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 className="h4" style={{ margin: 0 }}>{post.title || "Untitled"}</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={!post.isDraft} onChange={e => updateField(idx, 'isDraft', !e.target.checked)} />
                Published (unchecked = draft, hidden from the site)
              </label>
              <button className="btn" style={{ borderColor: '#ff4444', color: '#ff4444' }} onClick={() => removePost(idx)}>Remove</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Title</label>
              <input type="text" value={post.title || ''} onChange={e => updateField(idx, 'title', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Slug (URL friendly)</label>
              <input type="text" value={post.slug || ''} onChange={e => updateField(idx, 'slug', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <input type="text" value={post.category || ''} onChange={e => updateField(idx, 'category', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date (ISO, e.g. 2026-08-30)</label>
              <input type="text" value={post.date || ''} onChange={e => updateField(idx, 'date', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Date Label (shown on the page)</label>
              <input type="text" value={post.dateLabel || ''} onChange={e => updateField(idx, 'dateLabel', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Excerpt</label>
          <textarea value={post.excerpt || ''} onChange={e => updateField(idx, 'excerpt', e.target.value)} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />

          <label style={labelStyle}>Image URL / Path</label>
          <input type="text" value={post.image || ''} onChange={e => updateField(idx, 'image', e.target.value)} style={inputStyle} placeholder="/assets/img/post-1.svg" />

          <label style={labelStyle}>
            Body — JSON array of blocks: [&#123;"type":"p","text":"…"&#125;, &#123;"type":"h","text":"…"&#125;, &#123;"type":"list","items":["…"]&#125;, &#123;"type":"quote","text":"…"&#125;]
          </label>
          {/* defaultValue + onBlur (not value + onChange) on purpose: a
              controlled textarea whose value only updates on valid JSON
              makes it impossible to type past the first syntax error —
              every keystroke that isn't valid JSON yet gets silently
              reverted. Validating on blur lets you type freely. */}
          <textarea
            key={post.slug || idx}
            defaultValue={JSON.stringify(post.body || [], null, 2)}
            onBlur={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateField(idx, 'body', parsed);
              } catch (err) {
                alert(`Invalid JSON in the body field for "${post.title || post.slug}" — change wasn't saved.`);
              }
            }}
            style={{ ...inputStyle, minHeight: '160px', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
        </div>
      ))}

      <button className="btn btn--lime btn--lg" onClick={handleSave} style={{ width: '100%', marginTop: '1rem' }}>
        Save All Posts
      </button>
    </div>
  );
}
