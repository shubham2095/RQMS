// RQMS business rules — CLAUDE.md section 7 (real rules: Master Circular 49, see section 11).
// Saare numbers yahin se aayein, services mein hardcode nahi.

// Eligibility checks (eligibilityService). Quarter type ka hakk neeche `entitlement` se aata hai.
const eligibility = {
  blockIfExistingAllotment: true,
  requireStationMatch: true, // requested station == posting station
  requireCompleteProfile: true,
  requiredProfileFields: ['designation', 'grade_pay'], // complete profile ke liye zaroori
};

// Entitlement = Grade Pay (+ gazetted) -> quarter type (CLAUDE.md section 11).
// Pehla matching rule jeetta hai. Grade pay integer hai, isliye bounds inclusive hain:
// "GP > 1800" = min 1801. `max` na ho to upar koi limit nahi.
// `label` sirf dikhane ke liye; `type` wahi hai jo hum store karte hain (I-VI).
const entitlement = {
  // true: entitled type ya usse NEECHE ke type ke liye apply kar sakte hain
  allowLowerTypes: true,
  rules: [
    // Non-gazetted
    { gazetted: false, min: 0, max: 1800, type: 'I' },
    { gazetted: false, min: 1801, max: 2400, type: 'II' },
    { gazetted: false, min: 2401, max: 4200, type: 'III' },
    { gazetted: false, min: 4201, type: 'IV' },
    // Gazetted
    { gazetted: true, min: 0, max: 6599, type: 'IV' },
    // Type IV Special hum alag store nahi karte (sirf I-VI) — abhi Type IV maana jata hai.
    { gazetted: true, min: 6600, max: 6600, type: 'IV', label: 'Type IV Special' },
    { gazetted: true, min: 6601, type: 'V' },
  ],
  // TODO: Type VI circular ki basic table mein nahi hai — auto-mapping mein nahi (quarter ban/allot ho sakta hai).
  // TODO: Running staff (Loco Pilot, Guard, Fireman, ALP...) ka alag grade-pay -> type mapping (circular section 2.2).
};

// TODO(reservation): SC/ST reservation quota ABHI IMPLEMENT NAHI (sirf placeholder, code isse use nahi karta).
// CLAUDE.md section 11: Type I-II mein 10%, Type III-IV mein 5%, jahan station par 50+ quarters;
// sirf non-essential categories mein; do waiting lists (general + SC/ST special). OBC ka reservation nahi.
// Client se confirm baaki: OBC treatment, essential/non-essential kaise decide, 50-quarter threshold.
const reservation = {
  enabled: false,
  appliesTo: 'non_essential_only',
  categories: ['SC', 'ST'], // OBC pending
  minQuartersAtStation: 50, // pending confirmation
  percentages: { I: 10, II: 10, III: 5, IV: 5 },
};

const retention = {
  periodDays: 120,
  penaltyPerDay: 250, // INR
  alertBeforeDays: 15,
  // notice: retire hone wale hain (date aage) · retained: retention chal raha · expiring: expiry ke alert window mein
  // overstaying: expiry nikal gayi · cleared: quarter khali ho gaya
  statuses: ['notice', 'retained', 'expiring', 'overstaying', 'cleared'],
};

// Audit log ke known actions (filter dropdown ke liye; DB mein koi bhi string save ho sakti hai).
const auditActions = [
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
  retirementStatuses: retention.statuses,
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

// Documents / certificates kaun dekh-download kar sakta hai (staff permissions; super_admin bypass).
// Lists AUR download/metadata, dono yahin se — isliye kabhi alag nahi padte. Owner (employee) apna hamesha dekhta hai.
// `users.manage` = admin: management pages ke download links kaam karein.
const fileAccess = {
  documents: {
    QuarterApplication: ['application.verify', 'application.decide', 'users.manage'],
  },
  certificates: {
    Allotment: ['allotment.approve', 'allotment.possession', 'users.manage'],
    VacationRequest: [...Object.values(vacationStepPermissions), 'users.manage'],
  },
};

// Quarter master screen se sirf yeh statuses haath se badle ja sakte hain.
// Baaki (allotted/occupied/vacation_pending/retired_occupancy) allotment/vacation flow control karta hai.
const manualQuarterStatuses = ['vacant', 'reserved', 'under_maintenance'];

module.exports = {
  eligibility,
  entitlement,
  reservation,
  retention,
  auditActions,
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
  fileAccess,
};
