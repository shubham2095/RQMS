// ~6 sample quarters (type I-VI, do stations), sab 'vacant'. Sirf development/testing ke liye.
const { Op } = require('sequelize');

const quarters = [
  { quarter_number: 'A-101', quarter_type: 'I', colony_name: 'Charbagh Railway Colony', station: 'Lucknow', division: 'Lucknow', block: 'A', floor: 'Ground' },
  { quarter_number: 'A-205', quarter_type: 'II', colony_name: 'Charbagh Railway Colony', station: 'Lucknow', division: 'Lucknow', block: 'A', floor: '2' },
  { quarter_number: 'B-301', quarter_type: 'III', colony_name: 'Alambagh Railway Colony', station: 'Lucknow', division: 'Lucknow', block: 'B', floor: '3' },
  { quarter_number: 'C-12', quarter_type: 'IV', colony_name: 'Kishan Ganj Railway Colony', station: 'New Delhi', division: 'Delhi', block: 'C', floor: 'Ground' },
  { quarter_number: 'D-04', quarter_type: 'V', colony_name: 'Kishan Ganj Railway Colony', station: 'New Delhi', division: 'Delhi', block: 'D', floor: '1' },
  { quarter_number: 'OF-01', quarter_type: 'VI', colony_name: 'Officers Colony', station: 'New Delhi', division: 'Delhi', block: 'Officers', floor: 'Ground' },
];

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping sample quarters (NODE_ENV=production).');
      return;
    }

    const now = new Date();
    await queryInterface.bulkInsert(
      'quarters',
      quarters.map((q) => ({
        ...q,
        address: `${q.colony_name}, ${q.station}`,
        railway_zone: 'Northern Railway',
        status: 'vacant',
        current_occupant_id: null,
        created_at: now,
        updated_at: now,
      }))
    );
    console.log(`${quarters.length} sample quarters created (all vacant).`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('quarters', {
      quarter_number: { [Op.in]: quarters.map((q) => q.quarter_number) },
    });
  },
};
