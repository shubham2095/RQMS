const { NotificationLog, User, Role, Permission, EmployeeProfile } = require('../models');
const httpError = require('../utils/httpError');

// ---------- sending ----------

// Ek user ko notification (har channel ke liye ek row). Abhi sirf 'system' (in-app) channel.
// KABHI throw nahi karta: fail ho to log karke aage badho. Transaction COMMIT ke BAAD call karo.
// user = user object ({ id }) ya numeric id.
async function notify(user, event, message, title = null, channels = ['system']) {
  const userId = user && typeof user === 'object' ? user.id : user;
  let sent = 0;

  for (const channel of channels) {
    if (channel !== 'system') {
      // TODO(email/sms/whatsapp): doosre channels baad mein — abhi skip.
      continue;
    }
    try {
      await NotificationLog.create({
        user_id: userId,
        channel,
        event,
        title,
        message,
        status: 'logged',
        sent_at: new Date(),
      });
      sent += 1;
    } catch (err) {
      console.error(`Notification failed (${event}):`, err.message);
    }
  }
  return sent;
}

// Active users jinke paas permission / role hai (super_admin ko alag se nahi bheja jata — shor se bachne ke liye).
async function findUsers(roleInclude) {
  const users = await User.findAll({
    where: { is_active: true },
    include: [{ model: Role, as: 'roles', required: true, through: { attributes: [] }, ...roleInclude }],
  });
  return users.filter((user) => !user.roles.some((role) => role.slug === 'super_admin'));
}

async function notifyMany(users, event, message, title, channels) {
  let sent = 0;
  for (const user of users) sent += await notify(user, event, message, title, channels);
  return sent;
}

async function notifyPermission(permission, event, message, title = null, channels = ['system']) {
  try {
    const users = await findUsers({
      include: [{ model: Permission, as: 'permissions', where: { slug: permission }, required: true, through: { attributes: [] } }],
    });
    return await notifyMany(users, event, message, title, channels);
  } catch (err) {
    console.error(`Notification fan-out failed (${event}):`, err.message);
    return 0;
  }
}

async function notifyRole(slug, event, message, title = null, channels = ['system']) {
  try {
    const users = await findUsers({ where: { slug } });
    return await notifyMany(users, event, message, title, channels);
  } catch (err) {
    console.error(`Notification fan-out failed (${event}):`, err.message);
    return 0;
  }
}

// Employee profile id se uske user ko.
async function notifyProfile(profileId, event, message, title = null, channels = ['system']) {
  try {
    const profile = await EmployeeProfile.findByPk(profileId, { attributes: ['id', 'user_id'] });
    if (!profile) return 0;
    return await notify(profile.user_id, event, message, title, channels);
  } catch (err) {
    console.error(`Notification failed (${event}):`, err.message);
    return 0;
  }
}

// ---------- reading (apni notifications) ----------

async function listOwn(user, filters = {}) {
  const where = { user_id: user.id };
  if (filters.unread_only) where.status = 'logged';

  const notifications = await NotificationLog.findAll({
    where,
    order: [['id', 'DESC']],
    limit: filters.limit || 50,
  });
  const unreadCount = await NotificationLog.count({ where: { user_id: user.id, status: 'logged' } });
  return { notifications, unread_count: unreadCount };
}

// Dusre ke notification ka id dene par 404 (id guess karne wale ko pata na chale).
async function markRead(user, id) {
  const notification = await NotificationLog.findOne({ where: { id, user_id: user.id } });
  if (!notification) throw httpError(404, 'Notification not found');
  if (notification.status !== 'read') await notification.update({ status: 'read' });
  return notification;
}

async function markAllRead(user) {
  const [updated] = await NotificationLog.update({ status: 'read' }, { where: { user_id: user.id, status: 'logged' } });
  return updated;
}

module.exports = { notify, notifyPermission, notifyRole, notifyProfile, listOwn, markRead, markAllRead };
