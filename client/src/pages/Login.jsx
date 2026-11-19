import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/axios';
import useAuth from '../hooks/useAuth';

function getErrorMessage(err) {
  if (!err.response) return 'Cannot reach the server. Please try again.';
  const data = err.response.data || {};
  if (data.details && data.details.length > 0) return data.details[0].message;
  return data.error || 'Login failed';
}

function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking...');

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setApiStatus(res.data.ok ? 'connected' : 'unexpected response'))
      .catch(() => setApiStatus('not reachable'));
  }, []);

  if (loading) return <p className="center-note">Loading...</p>;
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>RQMS</h1>
        <p className="muted">Railway Quarter Management System</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="muted small">API status: {apiStatus}</p>
      </form>
    </div>
  );
}

export default Login;
