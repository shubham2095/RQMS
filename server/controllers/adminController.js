const userAdminService = require('../services/userAdminService');
const { parse } = require('../utils/validate');
const { createUserSchema, updateUserSchema } = require('../validators/adminValidator');
const { idParamSchema } = require('../validators/commonValidator');

async function listUsers(req, res, next) {
  try {
    const users = await userAdminService.listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    const roles = await userAdminService.listRoles();
    res.json({ roles });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const data = parse(createUserSchema, req.body);
    const user = await userAdminService.createUser(req.user, data);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    const data = parse(updateUserSchema, req.body);
    const user = await userAdminService.updateUser(req.user, id, data);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, listRoles, createUser, updateUser };
