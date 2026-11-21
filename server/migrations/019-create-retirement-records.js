const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'retirement_records',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        employee_profile_id: foreignKey(Sequelize, 'employee_profiles'),
        allotment_id: foreignKey(Sequelize, 'allotments', { allowNull: true, onDelete: 'SET NULL' }),
        retirement_date: { type: Sequelize.DATEONLY, allowNull: false },
        retention_granted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        retention_period_days: { type: Sequelize.INTEGER, allowNull: true },
        retention_expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
        overstay_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        penalty_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'notice' },
        last_evaluated_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('retirement_records', ['status', 'retention_expiry_date'], {
      name: 'retirement_records_status_expiry',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('retirement_records');
  },
};
