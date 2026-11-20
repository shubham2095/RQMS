const profileService = require('../services/profileService');
const { parse } = require('../utils/validate');
const { profileSchema, familyMemberSchema } = require('../validators/profileValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function getProfile(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.id);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function saveProfile(req, res, next) {
  try {
    const data = parse(profileSchema, req.body);
    const profile = await profileService.saveProfile(req.user.id, data);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function addFamilyMember(req, res, next) {
  try {
    const data = parse(familyMemberSchema, req.body);
    const member = await profileService.addFamilyMember(req.user.id, data);
    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

async function removeFamilyMember(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    await profileService.removeFamilyMember(req.user.id, id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, saveProfile, addFamilyMember, removeFamilyMember };
