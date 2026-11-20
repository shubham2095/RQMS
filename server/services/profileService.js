const { EmployeeProfile, FamilyMember } = require('../models');
const httpError = require('../utils/httpError');
const { isUniqueError } = require('../utils/dbErrors');

const withFamily = [{ model: FamilyMember, as: 'family_members' }];
const familyOrder = [[{ model: FamilyMember, as: 'family_members' }, 'id', 'ASC']];

// Current user ka profile + family. Profile abhi bana nahi to null.
async function getProfile(userId) {
  return EmployeeProfile.findOne({ where: { user_id: userId }, include: withFamily, order: familyOrder });
}

// Apna profile create ya update (upsert). `data` validated hai (profileValidator).
async function saveProfile(userId, data) {
  try {
    const existing = await EmployeeProfile.findOne({ where: { user_id: userId } });
    if (existing) {
      await existing.update(data);
    } else {
      await EmployeeProfile.create({ ...data, user_id: userId });
    }
  } catch (err) {
    if (isUniqueError(err)) throw httpError(409, 'This Employee ID is already registered');
    throw err;
  }
  return getProfile(userId);
}

async function findOwnProfile(userId) {
  const profile = await EmployeeProfile.findOne({ where: { user_id: userId } });
  if (!profile) throw httpError(400, 'Save your profile before managing family members');
  return profile;
}

async function addFamilyMember(userId, data) {
  const profile = await findOwnProfile(userId);
  return FamilyMember.create({ ...data, employee_profile_id: profile.id });
}

// Sirf apne profile ka member hata sakte hain; dusre ka id dene par 404.
async function removeFamilyMember(userId, memberId) {
  const profile = await findOwnProfile(userId);
  const member = await FamilyMember.findOne({
    where: { id: memberId, employee_profile_id: profile.id },
  });
  if (!member) throw httpError(404, 'Family member not found');
  await member.destroy();
}

module.exports = { getProfile, saveProfile, addFamilyMember, removeFamilyMember };
