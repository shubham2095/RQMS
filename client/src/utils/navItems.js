// Ek hi list: nav links AUR routes dono yahin se bante hain.
// roles / permissions: koi bhi ek match ho to dikhao. Dono na ho to sab logged-in users ko.
// Employee ko sirf employee items (roles: ['employee']) dikhte hain — staff items permission se.
// Dashboard ke alawa baaki screens abhi placeholder hain (later phases mein real pages).

export const navItems = [
  { label: 'Dashboard', to: '/dashboard' },

  // Employee
  { label: 'My Profile', to: '/profile', roles: ['employee'] },
  { label: 'Apply for Quarter', to: '/applications/new', roles: ['employee'] },
  { label: 'My Applications', to: '/my-applications', roles: ['employee'] },
  { label: 'My Allotment', to: '/my-allotment', roles: ['employee'] },
  { label: 'Vacation Request', to: '/vacations/new', roles: ['employee'] },

  // Staff (permission matrix — CLAUDE.md section 5)
  { label: 'Applications', to: '/applications', permissions: ['application.verify', 'application.decide'] },
  // Dekhna: clerk / estate officer / admin. Banana-badalna (quarter.manage) page ke andar check hota hai.
  { label: 'Quarters', to: '/quarters', roles: ['quarter_clerk', 'estate_officer', 'admin'] },
  { label: 'Waiting List', to: '/waiting-list', roles: ['quarter_clerk', 'estate_officer', 'admin'] },
  { label: 'Allotments', to: '/allotments', permissions: ['allotment.approve', 'allotment.possession'] },
  {
    label: 'Vacation Clearances',
    to: '/vacations',
    permissions: [
      'vacation.clerk_inspection',
      'vacation.electrical',
      'vacation.water',
      'vacation.accounts',
      'vacation.estate_officer',
    ],
  },
  { label: 'Reports', to: '/reports', permissions: ['reports.view'] },

  // Admin
  { label: 'Users', to: '/admin/users', permissions: ['users.manage'] },
  { label: 'Master Data', to: '/admin/master', permissions: ['master.manage'] },
  { label: 'Settings', to: '/admin/settings', permissions: ['settings.manage'] },
];

// hasRole / hasPermission AuthContext se aate hain (super_admin bypass unmein hai).
export function canAccess(item, hasRole, hasPermission) {
  if (!item.roles && !item.permissions) return true;
  if (item.roles && hasRole(...item.roles)) return true;
  if (item.permissions && hasPermission(...item.permissions)) return true;
  return false;
}
