const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'quarter_applications',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        reference_no: { type: Sequelize.STRING(30), allowNull: false, unique: true },
        employee_profile_id: foreignKey(Sequelize, 'employee_profiles'),
        preferred_quarter_type: { type: Sequelize.STRING(10), allowNull: false },
        preferred_colony: { type: Sequelize.STRING(150), allowNull: true },
        station: { type: Sequelize.STRING(100), allowNull: false },
        division: { type: Sequelize.STRING(100), allowNull: true },
        // Apply ke waqt profile se snapshot (baad mein profile badle to rank na bigde)
        service_type: { type: Sequelize.STRING(20), allowNull: false },
        category: { type: Sequelize.STRING(20), allowNull: false },
        family_size: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        medical_ground: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        special_grounds: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'submitted' },
        priority_score: { type: Sequelize.INTEGER, allowNull: true },
        eligibility_result: { type: Sequelize.JSON, allowNull: true },
        priority_breakdown: { type: Sequelize.JSON, allowNull: true },
        applied_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        verified_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        verified_at: { type: Sequelize.DATE, allowNull: true },
        decided_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        decided_at: { type: Sequelize.DATE, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('quarter_applications', ['preferred_quarter_type', 'station', 'status'], {
      name: 'quarter_applications_type_station_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('quarter_applications');
  },
};
