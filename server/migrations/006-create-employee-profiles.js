module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'employee_profiles',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          unique: true, // ek user ka ek hi profile
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        employee_id: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        designation: { type: Sequelize.STRING(100), allowNull: true },
        department: { type: Sequelize.STRING(100), allowNull: true },
        station: { type: Sequelize.STRING(100), allowNull: true },
        division: { type: Sequelize.STRING(100), allowNull: true },
        railway_zone: { type: Sequelize.STRING(100), allowNull: true },
        category: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'GENERAL' },
        service_type: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'non_essential' },
        grade_pay: { type: Sequelize.INTEGER, allowNull: true },
        pay_level: { type: Sequelize.STRING(30), allowNull: true },
        date_of_joining: { type: Sequelize.DATEONLY, allowNull: true },
        retirement_date: { type: Sequelize.DATEONLY, allowNull: true },
        has_active_allotment: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
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

    await queryInterface.addIndex('employee_profiles', ['station', 'division'], {
      name: 'employee_profiles_station_division',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employee_profiles');
  },
};
