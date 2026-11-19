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
};

module.exports = {
  priorityPoints,
  eligibility,
  retention,
  vacationClearanceSteps,
  enums,
};
