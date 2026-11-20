// Migrations mein baar-baar aane wale hisse (Phase 3 se use hote hain).

const tableOptions = { engine: 'InnoDB', charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

function timestampColumns(Sequelize) {
  return {
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
  };
}

// Foreign key column. onDelete: 'RESTRICT' (history safe), 'CASCADE' ya 'SET NULL' (optional FK).
function foreignKey(Sequelize, table, { allowNull = false, onDelete = 'RESTRICT', unique = false } = {}) {
  return {
    type: Sequelize.INTEGER.UNSIGNED,
    allowNull,
    unique,
    references: { model: table, key: 'id' },
    onDelete,
    onUpdate: 'CASCADE',
  };
}

module.exports = { tableOptions, timestampColumns, foreignKey };
