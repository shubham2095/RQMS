const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'occupancies',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        quarter_id: foreignKey(Sequelize, 'quarters'),
        allotment_id: foreignKey(Sequelize, 'allotments', { allowNull: true, onDelete: 'SET NULL' }),
        employee_profile_id: foreignKey(Sequelize, 'employee_profiles'),
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: true },
        is_current: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('occupancies', ['quarter_id', 'is_current'], {
      name: 'occupancies_quarter_current',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('occupancies');
  },
};
