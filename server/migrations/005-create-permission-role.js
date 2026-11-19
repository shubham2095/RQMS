module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'permission_role',
      {
        permission_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'permissions', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        role_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          primaryKey: true,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
      },
      { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('permission_role');
  },
};
