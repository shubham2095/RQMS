import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/axios';
import useAuth from '../hooks/useAuth';
import getErrorMessage from '../utils/getErrorMessage';

function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state && location.state.from) || '/dashboard';

  const [identifier, setIdentifier] = useState('');
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
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>RQMS</h1>
        <p className="muted">Railway Quarter Management System</p>

        <label htmlFor="identifier">Email or Employee ID</label>
        <input
          id="identifier"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
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
