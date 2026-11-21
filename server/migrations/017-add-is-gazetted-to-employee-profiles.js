// Gazetted officer ya nahi — quarter entitlement ke liye zaroori (CLAUDE.md section 11).
// Purani rows false rahengi (non-gazetted).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('employee_profiles', 'is_gazetted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('employee_profiles', 'is_gazetted');
  },
};
