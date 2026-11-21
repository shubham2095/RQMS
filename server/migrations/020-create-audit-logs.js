const { tableOptions, foreignKey } = require('../utils/migrationHelpers');

// Audit log append-only hai: sirf created_at, updated_at nahi.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'audit_logs',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        user_id: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        action: { type: Sequelize.STRING(60), allowNull: false },
        auditable_type: { type: Sequelize.STRING(50), allowNull: true },
        auditable_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        description: { type: Sequelize.STRING(500), allowNull: false },
        properties: { type: Sequelize.JSON, allowNull: true },
        ip_address: { type: Sequelize.STRING(64), allowNull: true },
        user_agent: { type: Sequelize.STRING(255), allowNull: true },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      },
      tableOptions
    );

    await queryInterface.addIndex('audit_logs', ['action', 'created_at'], { name: 'audit_logs_action_created' });
    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at'], { name: 'audit_logs_user_created' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
