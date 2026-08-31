import { useEffect, useState } from 'react';
import { useStore } from '../../store.js';
import { updateSiteContent } from '../../lib/api.js';
import TechIcon from '../../components/TechIcon.jsx';
import { ICON_SLUGS, TECH_ICONS } from '../../data/tech-icons.js';
import { field, label as labelStyle, card, subtle, row, ghostBtn } from './adminStyles.js';

/**
 * Skills tab.
 *
 * The old Site Text tab could technically edit this — it dumps every
 * siteContent key into a raw JSON textarea — but one mistyped bracket there
 * silently drops the whole skills tree. This gives the same data a real
 * editor: groups reorder and delete, skills add and remove, and the icon is
 * chosen from the bundled set with a live preview, so it is impossible to
 * save a slug that has no glyph behind it.
 */
export default function SkillsForm() {
  const { siteContent, fetchData } = useStore();
  const [groups, setGroups] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (siteContent?.skillGroups) setGroups(siteContent.skillGroups);
    else if (siteContent) setGroups([]);
  }, [siteContent]);

  if (!groups) return <div>Loading…</div>;

  const setGroup = (gi, patch) =>
    setGroups(prev => prev.map((g, i) => (i === gi ? { ...g, ...patch } : g)));

  const setSkill = (gi, si, patch) =>
    setGroups(prev =>
      prev.map((g, i) =>
        i === gi
          ? { ...g, skills: g.skills.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : g
      )
    );

  const moveGroup = (gi, dir) => {
    const to = gi + dir;
    if (to < 0 || to >= groups.length) return;
    const next = [...groups];
    [next[gi], next[to]] = [next[to], next[gi]];
    setGroups(next);
  };

  const addGroup = () =>
    setGroups(prev => [
      ...prev,
      { id: `group_${Date.now()}`, title: 'New group', lead: '', skills: [] },
    ]);

  const removeGroup = (gi) => {
    if (!confirm(`Remove the "${groups[gi].title}" group and all its skills?`)) return;
    setGroups(prev => prev.filter((_, i) => i !== gi));
  };

  const addSkill = (gi) =>
    setGroup(gi, { skills: [...(groups[gi].skills || []), { name: '', icon: null, level: '' }] });

  const removeSkill = (gi, si) =>
    setGroup(gi, { skills: groups[gi].skills.filter((_, j) => j !== si) });

  const handleSave = async () => {
    // A skill with no name renders an empty tile on the live site, so it is
    // rejected here rather than shipped.
    for (const g of groups) {
      if (!g.title?.trim()) return alert('Every group needs a title.');
      for (const s of g.skills || []) {
        if (!s.name?.trim()) return alert(`A skill in "${g.title}" has no name.`);
      }
    }
    setSaving(true);
    try {
      // Only this key is sent; the rest of siteContent is untouched because
      // PUT /api/site upserts key by key.
      await updateSiteContent({ ...siteContent, skillGroups: groups });
      await fetchData();
      alert('Skills saved.');
    } catch (err) {
      alert('Failed to save skills: ' + (err?.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="h3">Technical Skills</h2>
          <p style={subtle}>
            Groups render in this order on /about, /resume and (if switched on) the home page.
          </p>
        </div>
        <button className="btn btn--lime" onClick={addGroup}>+ Add group</button>
      </div>

      {groups.map((group, gi) => (
        <div key={group.id || gi} style={card}>
          <div style={{ ...row, justifyContent: 'space-between', marginBottom: '1rem' }}>
            <strong style={{ fontSize: '1.1rem' }}>{group.title || 'Untitled group'}</strong>
            <div style={row}>
              <button style={ghostBtn} onClick={() => moveGroup(gi, -1)} disabled={gi === 0}>↑</button>
              <button style={ghostBtn} onClick={() => moveGroup(gi, 1)} disabled={gi === groups.length - 1}>↓</button>
              <button
                style={{ ...ghostBtn, borderColor: '#ff6b6b', color: '#ff6b6b' }}
                onClick={() => removeGroup(gi)}
              >
                Remove
              </button>
            </div>
          </div>

          <label style={labelStyle}>Group title</label>
          <input
            style={field}
            value={group.title || ''}
            onChange={(e) => setGroup(gi, { title: e.target.value })}
          />

          <label style={labelStyle}>Group intro line (optional)</label>
          <input
            style={field}
            value={group.lead || ''}
            onChange={(e) => setGroup(gi, { lead: e.target.value })}
          />

          <label style={labelStyle}>Skills</label>
          {(group.skills || []).map((skill, si) => (
            <div
              key={si}
              style={{
                display: 'grid',
                gridTemplateColumns: '46px 1fr 1fr 110px 40px',
                gap: '0.5rem',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  display: 'grid', placeItems: 'center', height: 40,
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                }}
              >
                <TechIcon slug={skill.icon} title={skill.name || 'Skill'} size={22} />
              </span>

              <input
                style={{ ...field, marginBottom: 0 }}
                placeholder="Skill name"
                value={skill.name || ''}
                onChange={(e) => setSkill(gi, si, { name: e.target.value })}
              />

              <select
                style={{ ...field, marginBottom: 0 }}
                value={skill.icon || ''}
                onChange={(e) => setSkill(gi, si, { icon: e.target.value || null })}
              >
                <option value="">— generic glyph —</option>
                {ICON_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>{TECH_ICONS[slug].title}</option>
                ))}
              </select>

              <input
                style={{ ...field, marginBottom: 0 }}
                placeholder="Level (opt.)"
                value={skill.level || ''}
                onChange={(e) => setSkill(gi, si, { level: e.target.value })}
              />

              <button
                style={{ ...ghostBtn, borderColor: '#ff6b6b', color: '#ff6b6b' }}
                onClick={() => removeSkill(gi, si)}
                aria-label={`Remove ${skill.name || 'skill'}`}
              >
                ×
              </button>
            </div>
          ))}

          <button className="btn" style={{ marginTop: '0.5rem' }} onClick={() => addSkill(gi)}>
            + Add skill
          </button>
        </div>
      ))}

      <button
        className="btn btn--lime btn--lg"
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {saving ? 'Saving…' : 'Save Skills'}
      </button>
    </div>
  );
}
