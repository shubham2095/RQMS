module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'family_members',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        employee_profile_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: 'employee_profiles', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        name: { type: Sequelize.STRING(150), allowNull: false },
        relation: { type: Sequelize.STRING(50), allowNull: false },
        date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
        is_dependent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('family_members');
  },
};
