const { DataTypes } = require('sequelize');

// DECIMAL(12,2) mysql2 se string aata hai ("12.50") — API mein number dikhao.
function decimalField(name, { allowNull = true, defaultValue } = {}) {
  const field = {
    type: DataTypes.DECIMAL(12, 2),
    allowNull,
    get() {
      const value = this.getDataValue(name);
      return value === null || value === undefined ? null : Number(value);
    },
  };
  if (defaultValue !== undefined) field.defaultValue = defaultValue;
  return field;
}

module.exports = decimalField;
