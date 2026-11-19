module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'role_user',
      {
        role_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
      },
      { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('role_user');
  },
};
