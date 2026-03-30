const { Notification, User } = require("../../db");

async function getNotifications() {
  return Notification.findAll({
    where: { is_read: false },
    include: [{ model: User, attributes: ["username", "role"] }],
    order: [["createdAt", "DESC"]],
  });
}

async function clearNotifications(payload) {
  const { ids } = payload;

  if (!Array.isArray(ids) || ids.length === 0) {
    return { status: 400, body: { error: "No notification IDs provided" } };
  }

  await Notification.update(
    { is_read: true },
    {
      where: { id: ids },
    }
  );

  return { status: 200, body: { message: "Notifications marked as read" } };
}

module.exports = {
  getNotifications,
  clearNotifications,
};
