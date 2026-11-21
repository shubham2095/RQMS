const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'notification_logs',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        // User delete hone par uska inbox bhi jaye (CASCADE)
        user_id: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'CASCADE' }),
        channel: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'system' },
        event: { type: Sequelize.STRING(60), allowNull: false },
        title: { type: Sequelize.STRING(150), allowNull: true },
        message: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'logged' }, // logged -> read
        response: { type: Sequelize.TEXT, allowNull: true },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('notification_logs', ['user_id', 'event'], { name: 'notification_logs_user_event' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_logs');
  },
};
