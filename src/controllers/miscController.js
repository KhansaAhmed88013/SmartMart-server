const miscService = require("../services/miscService");

async function sendRecoveryEmail(req, res) {
  try {
    const response = await miscService.sendRecoveryEmail(req.body);
    return res.json({ success: true, message: response.message });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getAdminDashboard(req, res) {
  try {
    const dashboard = await miscService.getAdminDashboard();
    return res.json(dashboard);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server Error" });
  }
}

async function health(req, res) {
  const response = await miscService.getHealthStatus();
  return res.status(response.status).json(response.body);
}

module.exports = {
  sendRecoveryEmail,
  getAdminDashboard,
  health,
};
