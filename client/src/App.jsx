import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';
import { navItems } from './utils/navItems';

// Dashboard real page hai; baaki nav items abhi placeholder (apne role/permission guard ke saath).
const placeholderItems = navItems.filter((item) => item.to !== '/dashboard');

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {placeholderItems.map((item) => (
              <Route
                key={item.to}
                path={item.to}
                element={
                  <ProtectedRoute roles={item.roles} permissions={item.permissions}>
                    <ComingSoon title={item.label} />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
