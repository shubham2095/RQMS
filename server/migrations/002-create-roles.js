module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'roles',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        slug: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        description: { type: Sequelize.STRING(255), allowNull: true },
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
    await queryInterface.dropTable('roles');
  },
};
