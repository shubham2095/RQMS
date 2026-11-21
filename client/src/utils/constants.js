// Server ke config/rqms.js enums ke mirror — dropdowns ke liye. Dono jagah same rakho.
export const CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST'];
export const SERVICE_TYPES = [
  { value: 'non_essential', label: 'Non-essential' },
  { value: 'essential', label: 'Essential' },
];
export const QUARTER_TYPES = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export const QUARTER_STATUSES = [
  'vacant',
  'allotted',
  'occupied',
  'vacation_pending',
  'reserved',
  'under_maintenance',
  'retired_occupancy',
];
// Quarter master se haath se set ho sakne wale (baaki allotment flow set karta hai)
export const MANUAL_QUARTER_STATUSES = ['vacant', 'reserved', 'under_maintenance'];
export const APPLICATION_STATUSES = [
  'submitted',
  'verified',
  'ineligible',
  'waitlisted',
  'approved',
  'allotted',
  'rejected',
  'withdrawn',
];
export const ALLOTMENT_STATUSES = ['offered', 'accepted', 'rejected', 'possession_taken', 'vacated'];
export const CERTIFICATE_LABELS = {
  ALLOTMENT_ORDER: 'Allotment Order',
  POSSESSION_LETTER: 'Possession Letter',
  OCCUPANCY_CERTIFICATE: 'Occupancy Certificate',
  ELECTRICAL_CLEARANCE: 'Electrical Clearance',
  WATER_CLEARANCE: 'Water Clearance',
  VACATION_NOC: 'Vacation NOC',
  NO_DUE_CERTIFICATE: 'No Due Certificate',
  HANDOVER_CERTIFICATE: 'Handover Certificate',
};

// Vacation flow (server config/rqms.js ke mirror). Order zaroori hai.
export const VACATION_TRIGGERS = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'death', label: 'Death' },
  { value: 'voluntary', label: 'Voluntary' },
];
export const RETIREMENT_STATUSES = ['notice', 'retained', 'expiring', 'overstaying', 'cleared'];

// Server config/rqms.js `auditActions` ke mirror (audit filter dropdown)
export const AUDIT_ACTIONS = [
  'login',
  'login_failed',
  'application.submit',
  'application.verify',
  'application.run_engine',
  'application.approve',
  'application.reject',
  'allotment.offer',
  'allotment.accept',
  'allotment.decline',
  'allotment.possession',
  'vacation.initiate',
  'vacation.approve_step',
  'vacation.reject_step',
  'vacation.complete',
  'quarter.create',
  'quarter.update',
  'user.create',
  'user.update',
  'retirement.record',
  'retirement.run_cycle',
];

export const VACATION_STATUSES = ['in_clearance', 'completed', 'rejected'];
export const CLEARANCE_STEPS = ['clerk_inspection', 'electrical', 'water', 'accounts', 'estate_officer'];
export const CLEARANCE_STEP_LABELS = {
  clerk_inspection: 'Clerk inspection',
  electrical: 'Electrical clearance',
  water: 'Water clearance',
  accounts: 'Accounts clearance',
  estate_officer: 'Estate Officer approval',
};
export const FAMILY_RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Other'];
