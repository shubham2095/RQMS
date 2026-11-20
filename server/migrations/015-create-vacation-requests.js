const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'vacation_requests',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        reference_no: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        allotment_id: foreignKey(Sequelize, 'allotments'),
        quarter_id: foreignKey(Sequelize, 'quarters'),
        employee_profile_id: foreignKey(Sequelize, 'employee_profiles'),
        // "trigger" MySQL ka keyword hai — Sequelize quote karta hai; raw SQL mein `trigger` likhna.
        trigger: { type: Sequelize.STRING(20), allowNull: false },
        requested_vacation_date: { type: Sequelize.DATEONLY, allowNull: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'submitted' },
        current_step: { type: Sequelize.STRING(30), allowNull: true },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('vacation_requests', ['status', 'current_step'], {
      name: 'vacation_requests_status_step',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vacation_requests');
  },
};
