// Phase 3-R: demo employees ko grade pay + gazetted flag do (taaki entitlement kaam kare) aur
// Lucknow par IV / V quarters daalo (taaki har mapped type ka quarter demo station par ho).
// Sirf development/testing ke liye. Purani seeders (003/005) ko nahi chheda — ye UPDATE karta hai,
// isliye un DBs par bhi chalta hai jahan 003/005 pehle chal chuki hain.
const { Op, QueryTypes } = require('sequelize');

// employee_id -> (naya, purana). Purana sirf `down` ke liye.
const profiles = [
  {
    employee_id: 'EMP1001', // GP 4600 non-gazetted -> Type IV
    next: { grade_pay: 4600, is_gazetted: false },
    previous: { grade_pay: 4600, is_gazetted: false },
  },
  {
    employee_id: 'EMP1002', // GP 4200 -> Type III (essential, SC)
    next: { grade_pay: 4200, is_gazetted: false },
    previous: { grade_pay: 4200, is_gazetted: false },
  },
  {
    employee_id: 'EMP1003', // GP 2400 -> Type II (upper edge of the band)
    next: { grade_pay: 2400, is_gazetted: false },
    previous: { grade_pay: 2800, is_gazetted: false },
  },
  {
    employee_id: 'EMP1004', // GP 7600 gazetted -> Type V
    next: { grade_pay: 7600, is_gazetted: true, designation: 'Assistant Divisional Engineer' },
    previous: { grade_pay: 4200, is_gazetted: false, designation: 'Senior Technician' },
  },
];

const quarters = [
  { quarter_number: 'L-401', quarter_type: 'IV', colony_name: 'Charbagh Railway Colony', block: 'L', floor: 'Ground' },
  { quarter_number: 'L-501', quarter_type: 'V', colony_name: 'Officers Colony Lucknow', block: 'Officers', floor: 'Ground' },
];

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo entitlement data (NODE_ENV=production).');
      return;
    }

    for (const profile of profiles) {
      await queryInterface.bulkUpdate('employee_profiles', profile.next, { employee_id: profile.employee_id });
    }

    const sql = queryInterface.sequelize;
    const now = new Date();
    for (const quarter of quarters) {
      const existing = await sql.query(
        'SELECT id FROM quarters WHERE station = ? AND colony_name = ? AND quarter_number = ?',
        { replacements: ['Lucknow', quarter.colony_name, quarter.quarter_number], type: QueryTypes.SELECT }
      );
      if (existing.length > 0) continue;

      await queryInterface.bulkInsert('quarters', [
        {
          ...quarter,
          address: `${quarter.colony_name}, Lucknow`,
          railway_zone: 'Northern Railway',
          division: 'Lucknow',
          station: 'Lucknow',
          status: 'vacant',
          current_occupant_id: null,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
    console.log('Demo entitlement: EMP1001 -> IV, EMP1002 -> III, EMP1003 -> II, EMP1004 (gazetted) -> V; Lucknow IV + V quarters ensured.');
  },

  async down(queryInterface) {
    for (const profile of profiles) {
      await queryInterface.bulkUpdate('employee_profiles', profile.previous, { employee_id: profile.employee_id });
    }
    await queryInterface.bulkDelete('quarters', {
      station: 'Lucknow',
      quarter_number: { [Op.in]: quarters.map((q) => q.quarter_number) },
    });
  },
};
