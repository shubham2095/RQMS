const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'vacation_clearances',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        vacation_request_id: foreignKey(Sequelize, 'vacation_requests', { onDelete: 'CASCADE' }),
        step: { type: Sequelize.STRING(30), allowNull: false },
        sequence: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'pending' },
        handled_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        // Informational fields (approve ko block nahi karte)
        meter_reading: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        dues_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
        has_damage: { type: Sequelize.BOOLEAN, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        acted_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('vacation_clearances', ['vacation_request_id', 'step'], {
      unique: true,
      name: 'vacation_clearances_request_step_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vacation_clearances');
  },
};
