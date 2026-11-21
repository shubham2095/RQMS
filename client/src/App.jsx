import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthProvider';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';
import MyProfile from './pages/MyProfile';
import Quarters from './pages/Quarters';
import AdminUsers from './pages/AdminUsers';
import ApplyForQuarter from './pages/ApplyForQuarter';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import MyAllotment from './pages/MyAllotment';
import Allotments from './pages/Allotments';
import WaitingList from './pages/WaitingList';
import VacationRequest from './pages/VacationRequest';
import VacationClearances from './pages/VacationClearances';
import VacationDetail from './pages/VacationDetail';
import Retirements from './pages/Retirements';
import AuditLog from './pages/AuditLog';
import Notifications from './pages/Notifications';
import { navItems } from './utils/navItems';

// Dashboard alag route hai. Jin nav items ka real page ban gaya wo yahan map hai;
// baaki abhi ComingSoon placeholder (apne role/permission guard ke saath).
const realPages = {
  '/profile': MyProfile,
  '/quarters': Quarters,
  '/admin/users': AdminUsers,
  '/applications/new': ApplyForQuarter,
  '/my-applications': Applications,
  '/applications': Applications,
  '/my-allotment': MyAllotment,
  '/allotments': Allotments,
  '/waiting-list': WaitingList,
  '/vacations/new': VacationRequest,
  '/vacations': VacationClearances,
  '/retirements': Retirements,
  '/admin/audit': AuditLog,
  '/notifications': Notifications,
};
const guardedItems = navItems.filter((item) => item.to !== '/dashboard');

function pageFor(item) {
  const Page = realPages[item.to];
  return Page ? <Page /> : <ComingSoon title={item.label} />;
}

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
            {guardedItems.map((item) => (
              <Route
                key={item.to}
                path={item.to}
                element={
                  <ProtectedRoute roles={item.roles} permissions={item.permissions}>
                    {pageFor(item)}
                  </ProtectedRoute>
                }
              />
            ))}
            {/* Detail: server owner/staff scope karta hai (baaki ko 404) */}
            <Route path="/applications/:id" element={<ApplicationDetail />} />
            <Route path="/vacations/:id" element={<VacationDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
