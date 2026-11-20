const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

// Polymorphic: documentable_type ('QuarterApplication' ...) + documentable_id. Abhi application attachments ke liye.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'documents',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        documentable_type: { type: Sequelize.STRING(50), allowNull: false },
        documentable_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        category: { type: Sequelize.STRING(50), allowNull: false },
        title: { type: Sequelize.STRING(150), allowNull: true },
        original_name: { type: Sequelize.STRING(255), allowNull: false },
        path: { type: Sequelize.STRING(255), allowNull: false }, // storage folder ke andar relative filename
        disk: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'local' },
        mime: { type: Sequelize.STRING(100), allowNull: false },
        size: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        hash: { type: Sequelize.STRING(64), allowNull: true }, // sha256 — Phase 5
        uploaded_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('documents', ['documentable_type', 'documentable_id'], {
      name: 'documents_documentable',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('documents');
  },
};
