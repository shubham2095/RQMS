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
  // 'cleared' enum mein hai par kabhi save nahi hota (last approval par complete() usi transaction mein chalta hai)
  vacationStatuses: ['submitted', 'in_clearance', 'cleared', 'completed', 'rejected'],
  clearanceStatuses: ['pending', 'approved', 'rejected'],
};

// Allotment "live" hai (offer se possession tak) — 'allotted' application tab tak open maani jati hai.
const liveAllotmentStatuses = ['offered', 'accepted', 'possession_taken'];

// Har clearance step ko kaun approve/reject kar sakta hai (permission, CLAUDE.md section 5). super_admin bypass.
const vacationStepPermissions = {
  clerk_inspection: 'vacation.clerk_inspection',
  electrical: 'vacation.electrical',
  water: 'vacation.water',
  accounts: 'vacation.accounts',
  estate_officer: 'vacation.estate_officer',
};

const vacationStepTitles = {
  clerk_inspection: 'Clerk inspection',
  electrical: 'Electrical clearance',
  water: 'Water clearance',
  accounts: 'Accounts clearance',
  estate_officer: 'Estate Officer approval',
};

// Jin steps par approve karne par apna certificate bhi nikalta hai
const vacationStepCertificates = {
  electrical: 'ELECTRICAL_CLEARANCE',
  water: 'WATER_CLEARANCE',
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
  // Vacation flow
  ELECTRICAL_CLEARANCE: { prefix: 'ELC', title: 'Electrical Clearance Certificate' },
  WATER_CLEARANCE: { prefix: 'WTC', title: 'Water Clearance Certificate' },
  VACATION_NOC: { prefix: 'NOC', title: 'Vacation No Objection Certificate' },
  NO_DUE_CERTIFICATE: { prefix: 'NDC', title: 'No Due Certificate' },
  HANDOVER_CERTIFICATE: { prefix: 'HOC', title: 'Quarter Handover Certificate' },
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
  vacationStepPermissions,
  vacationStepTitles,
  vacationStepCertificates,
  enums,
  manualQuarterStatuses,
  openApplicationStatuses,
  liveAllotmentStatuses,
  certificateTypes,
  uploads,
};
