const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'allotments',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        allotment_order_no: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        quarter_id: foreignKey(Sequelize, 'quarters'),
        quarter_application_id: foreignKey(Sequelize, 'quarter_applications', { allowNull: true, onDelete: 'SET NULL' }),
        employee_profile_id: foreignKey(Sequelize, 'employee_profiles'),
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'offered' },
        offered_at: { type: Sequelize.DATE, allowNull: false },
        responded_at: { type: Sequelize.DATE, allowNull: true },
        possession_date: { type: Sequelize.DATEONLY, allowNull: true },
        vacated_on: { type: Sequelize.DATEONLY, allowNull: true },
        approved_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('allotments', ['employee_profile_id', 'status'], {
      name: 'allotments_employee_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('allotments');
  },
};
