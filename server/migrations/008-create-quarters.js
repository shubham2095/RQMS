module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'quarters',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        quarter_number: { type: Sequelize.STRING(30), allowNull: false },
        quarter_type: { type: Sequelize.STRING(10), allowNull: false },
        colony_name: { type: Sequelize.STRING(150), allowNull: false },
        address: { type: Sequelize.STRING(255), allowNull: true },
        railway_zone: { type: Sequelize.STRING(100), allowNull: true },
        division: { type: Sequelize.STRING(100), allowNull: true },
        station: { type: Sequelize.STRING(100), allowNull: false },
        block: { type: Sequelize.STRING(50), allowNull: true },
        floor: { type: Sequelize.STRING(30), allowNull: true },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'vacant' },
        current_occupant_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'employee_profiles', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );

    await queryInterface.addIndex('quarters', ['station', 'colony_name', 'quarter_number'], {
      unique: true,
      name: 'quarters_station_colony_number_unique',
    });
    await queryInterface.addIndex('quarters', ['quarter_type', 'station', 'status'], {
      name: 'quarters_type_station_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('quarters');
  },
};
