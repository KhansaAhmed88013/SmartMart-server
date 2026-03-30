const notificationService = require("../services/notificationService");

async function notifications(req, res) {
  try {
    const list = await notificationService.getNotifications();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function clearNotifications(req, res) {
  try {
    const response = await notificationService.clearNotifications(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  notifications,
  clearNotifications,
};
