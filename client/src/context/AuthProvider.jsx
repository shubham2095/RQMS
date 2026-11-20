import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import { setUnauthorizedHandler } from '../services/axios';
import { fetchMe, loginRequest, logoutRequest } from '../services/authService';
import { clearToken, getToken, setToken } from '../utils/token';

const SUPER_ADMIN = 'super_admin';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // User ne khud logout kiya? Tab ProtectedRoute purana page "from" mein yaad nahi rakhta.
  const [loggedOut, setLoggedOut] = useState(false);
  // Token hai to pehle /me se user load karenge; tab tak loading.
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
    });

    if (!getToken()) return;
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier, password) {
    const data = await loginRequest(identifier, password);
    setToken(data.token);
    setLoggedOut(false);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await logoutRequest();
    } catch {
      // server tak na pahunche to bhi client logout ho jaye
    }
    clearToken();
    setLoggedOut(true);
    setUser(null);
  }

  function isSuperAdmin() {
    return Boolean(user) && user.roles.some((role) => role.slug === SUPER_ADMIN);
  }

  // Koi bhi ek role/permission match ho to true (any-of). super_admin ke liye hamesha true.
  function hasRole(...slugs) {
    if (!user) return false;
    return isSuperAdmin() || user.roles.some((role) => slugs.includes(role.slug));
  }

  function hasPermission(...slugs) {
    if (!user) return false;
    return isSuperAdmin() || user.permissions.some((slug) => slugs.includes(slug));
  }

  const value = { user, loading, loggedOut, login, logout, hasRole, hasPermission };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
