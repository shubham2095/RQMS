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
};
export const FAMILY_RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Other'];
