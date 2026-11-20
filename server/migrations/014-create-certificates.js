const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

// Polymorphic: certifiable_type ('Allotment' ...) + certifiable_id.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'certificates',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        certifiable_type: { type: Sequelize.STRING(50), allowNull: false },
        certifiable_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        type: { type: Sequelize.STRING(50), allowNull: false },
        number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        payload: { type: Sequelize.JSON, allowNull: true },
        file_path: { type: Sequelize.STRING(255), allowNull: true }, // storage folder ke andar relative filename
        is_signed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        signed_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        signed_at: { type: Sequelize.DATE, allowNull: true },
        issued_by: foreignKey(Sequelize, 'users', { allowNull: true, onDelete: 'SET NULL' }),
        issued_at: { type: Sequelize.DATE, allowNull: false },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('certificates', ['certifiable_type', 'certifiable_id'], {
      name: 'certificates_certifiable',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('certificates');
  },
};
