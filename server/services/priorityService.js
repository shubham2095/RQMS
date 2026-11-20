// PURE: koi DB / network nahi. Points sab config/rqms.js (priorityPoints) se aate hain.
const { priorityPoints } = require('../config/rqms');
const { completedMonths, completedYears } = require('../utils/serviceYears');

// input: { service_type, category, medical_ground, date_of_joining, waiting_since }
// Returns { score, breakdown } — breakdown audit/transparency ke liye save hota hai.
function calculate(input, asOf = new Date()) {
  const isEssential = input.service_type === 'essential';
  const hasMedical = Boolean(input.medical_ground);

  const essentialPoints = isEssential ? priorityPoints.essentialService : 0;
  const medicalPoints = hasMedical ? priorityPoints.medicalGround : 0;
  const categoryPoints = priorityPoints.category[input.category] || 0;

  const years = completedYears(input.date_of_joining, asOf);
  const seniorityPoints = Math.min(years * priorityPoints.seniority.perYear, priorityPoints.seniority.cap);

  const months = completedMonths(input.waiting_since, asOf);
  const agePoints = Math.min(months * priorityPoints.applicationAge.perMonth, priorityPoints.applicationAge.cap);

  const breakdown = {
    essential_service: { applies: isEssential, points: essentialPoints },
    medical_ground: { applies: hasMedical, points: medicalPoints },
    category: { value: input.category, points: categoryPoints },
    seniority: { years, points: seniorityPoints, cap: priorityPoints.seniority.cap },
    application_age: { months, points: agePoints, cap: priorityPoints.applicationAge.cap },
  };

  const score = essentialPoints + medicalPoints + categoryPoints + seniorityPoints + agePoints;
  return { score, breakdown };
}

module.exports = { calculate };
