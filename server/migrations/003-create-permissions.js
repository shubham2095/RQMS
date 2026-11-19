module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'permissions',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        // "group" MySQL ka reserved word hai — Sequelize quote kar deta hai; raw SQL mein `group` likhna.
        group: { type: Sequelize.STRING(50), allowNull: true },
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
    await queryInterface.dropTable('permissions');
  },
};
