import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../lib/api.js';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  // Set by the API layer when the server stopped accepting the stored token.
  // Without this the admin lands back here with no idea why.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('admin_session_expired')) {
        sessionStorage.removeItem('admin_session_expired');
        setNotice('Your session ended — please sign in again.');
      }
    } catch { /* private mode */ }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      const status = err?.response?.status;
      const serverMessage = err?.response?.data?.error;

      // A 503 means the server is misconfigured (no JWT_SECRET, no database) and
      // a 429 means rate-limited. Reporting either as "invalid password" sends
      // whoever is debugging it to check their password instead of the config.
      if (status === 503 || status === 429) setError(serverMessage || 'The server is not accepting logins right now.');
      else if (status === 401) setError('Invalid username or password');
      else if (!err?.response) setError('Cannot reach the API. Is the backend running?');
      else setError(serverMessage || 'Login failed.');
    }
  };

  return (
    <section className="section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="shell" style={{ maxWidth: 400 }}>
        <h2 className="h2" style={{ textAlign: 'center', marginBottom: '2rem' }}>Admin Login</h2>
        {notice && (
          <p style={{ color: 'var(--lime)', textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {notice}
          </p>
        )}
        {error && <p style={{ color: '#ff9db4', textAlign: 'center', marginBottom: '1rem' }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', borderRadius: '4px' }}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text)', borderRadius: '4px' }}
          />
          <button type="submit" className="btn btn--lime btn--lg" style={{ width: '100%', marginTop: '1rem' }}>
            Login
          </button>
        </form>
      </div>
    </section>
  );
}
