// RQMS business rules — CLAUDE.md section 7.
// Saare numbers yahin se aayein, services mein hardcode nahi.

const priorityPoints = {
  essentialService: 50,
  medicalGround: 30,
  category: { SC: 20, ST: 20, OBC: 10, GENERAL: 0 },
  seniority: { perYear: 1, cap: 15 },
  applicationAge: { perMonth: 1, cap: 10 },
};

const eligibility = {
  // quarter type -> minimum completed service years
  minServiceYears: { I: 0, II: 0, III: 3, IV: 7, V: 12, VI: 18 },
  blockIfExistingAllotment: true,
  requireStationMatch: true, // requested station == posting station
  requireCompleteProfile: true, // designation + date_of_joining
};

const retention = {
  periodDays: 120,
  penaltyPerDay: 250, // INR
  alertBeforeDays: 15,
};

// Order matters: ek ke baad agla step.
const vacationClearanceSteps = [
  'clerk_inspection',
  'electrical',
  'water',
  'accounts',
  'estate_officer',
];

const enums = {
  quarterTypes: ['I', 'II', 'III', 'IV', 'V', 'VI'],
  categories: ['SC', 'ST', 'OBC', 'GENERAL'],
  serviceTypes: ['essential', 'non_essential'],
  vacationTriggers: ['transfer', 'retirement', 'resignation', 'death', 'voluntary'],
  // CLAUDE.md section 6 — QuarterStatus
  quarterStatuses: [
    'vacant',
    'allotted',
    'occupied',
    'vacation_pending',
    'reserved',
    'under_maintenance',
    'retired_occupancy',
  ],
  // CLAUDE.md section 6
  applicationStatuses: [
    'submitted',
    'verified',
    'eligible',
    'ineligible',
    'waitlisted',
    'approved',
    'allotted',
    'rejected',
    'withdrawn',
  ],
  allotmentStatuses: ['offered', 'accepted', 'rejected', 'possession_taken', 'vacated'],
};

// In statuses wali application "open" hai — employee naya apply nahi kar sakta.
const openApplicationStatuses = [
  'submitted',
  'verified',
  'eligible',
  'waitlisted',
  'approved',
  'allotted',
];

// Certificate type -> number ka prefix (number = prefix-YYYYMMDD-random)
const certificateTypes = {
  ALLOTMENT_ORDER: { prefix: 'ALO', title: 'Allotment Order' },
  POSSESSION_LETTER: { prefix: 'POL', title: 'Possession Letter' },
  OCCUPANCY_CERTIFICATE: { prefix: 'OCC', title: 'Occupancy Certificate' },
};

// Application ke saath documents upload ki limits
const uploads = {
  maxFiles: 5,
  maxFileSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
};

// Quarter master screen se sirf yeh statuses haath se badle ja sakte hain.
// Baaki (allotted/occupied/vacation_pending/retired_occupancy) allotment/vacation flow control karta hai.
const manualQuarterStatuses = ['vacant', 'reserved', 'under_maintenance'];

module.exports = {
  priorityPoints,
  eligibility,
  retention,
  vacationClearanceSteps,
  enums,
  manualQuarterStatuses,
  openApplicationStatuses,
  certificateTypes,
  uploads,
};
