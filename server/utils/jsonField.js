const { DataTypes } = require('sequelize');

// JSON column ka attribute. MariaDB (XAMPP) JSON ko text ke roop mein lautata hai,
// isliye getter string ko object bana deta hai (MySQL par already object hota hai).
function jsonField(name) {
  return {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const value = this.getDataValue(name);
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
  };
}

module.exports = jsonField;
