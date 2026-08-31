import axios from 'axios';

// Hardcoding http://localhost:3001 here meant every visitor's own browser —
// not the server — tried to reach a backend on their own machine, so the
// deployed site could never load real content. VITE_API_URL lets the built
// site point at wherever the admin API actually runs; local dev keeps the
// old default. See backend/.env.example for the matching CORS_ORIGIN setup.
// In production the RAG endpoints are Vercel functions living at /api on this
// same origin, so a relative base is the correct default — the previous
// fallback to localhost:3001 meant the deployed chatbot asked every visitor's
// own machine for an answer and always failed. VITE_API_URL still overrides,
// for the case where the admin API is hosted somewhere else entirely.
const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');
const API_TIMEOUT_MS = 5000;

const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProfile = () => api.get('/profile').then(res => res.data);
export const updateProfile = (data) => api.put('/profile', data).then(res => res.data);

export const getProjects = () => api.get('/projects').then(res => res.data);
export const updateProjects = (data) => api.put('/projects', data).then(res => res.data);

export const getPosts = () => api.get('/posts').then(res => res.data);
export const updatePosts = (data) => api.put('/posts', data).then(res => res.data);

export const getSiteContent = () => api.get('/site').then(res => res.data);
export const updateSiteContent = (data) => api.put('/site', data).then(res => res.data);

export const getSections = () => api.get('/sections').then(res => res.data);
export const updateSections = (data) => api.put('/sections', data).then(res => res.data);

// Server-side GitHub read: shares one rate limit across all visitors and can
// reach the contributions endpoint that sends no CORS header. Public — no
// auth — because the data it returns already is.
export const getGitHub = (username) =>
  api.get(`/github/${encodeURIComponent(username)}`).then(res => res.data);


/* ---------------- RAG assistant ----------------
   The provider key lives only in backend/.env — the browser talks to this
   API, never to the model provider, so nothing secret reaches the bundle. */

export const getRagMeta = () => api.get('/rag/meta').then(res => res.data);

export const askRag = (question, history = []) =>
  api.post('/rag/ask', { question, history }, { timeout: 60000 }).then(res => res.data);

/**
 * Streaming ask. Uses fetch rather than axios because axios in the browser
 * buffers the whole response before resolving, which defeats the point.
 *
 * @returns {Promise<void>} resolves when the stream ends
 */
export async function askRagStream(question, history, { onSources, onDelta, signal } = {}) {
  const res = await fetch(`${API_URL}/rag/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = 'The assistant is unavailable right now.';
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // A network chunk can split an SSE frame in half, so only whole frames
    // (terminated by a blank line) are parsed and the remainder is kept.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';

    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        let event;
        try { event = JSON.parse(payload); } catch { continue; }
        if (event.type === 'sources') onSources?.(event.sources || []);
        else if (event.type === 'delta') onDelta?.(event.text);
        else if (event.type === 'error') throw new Error(event.error);
      }
    }
  }
}

export const reindexRag = () => api.post('/rag/reindex').then(res => res.data);
export const retrieveRag = (question) =>
  api.post('/rag/retrieve', { question }).then(res => res.data);

export const login = async (username, password) => {
  const res = await api.post('/auth/login', { username, password });
  localStorage.setItem('admin_token', res.data.token);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem('admin_token');
};

export default api;
