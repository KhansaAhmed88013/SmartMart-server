const authService = require("../services/authService");

async function apiLogin(req, res) {
  try {
    const response = await authService.apiLogin(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function login(req, res) {
  try {
    const response = await authService.login(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function logout(req, res) {
  try {
    const response = await authService.logout(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Logout failed" });
  }
}

async function verifyPassword(req, res) {
  try {
    const response = await authService.verifyPassword(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function changePassword(req, res) {
  try {
    const response = await authService.changePassword(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
}

async function recoverPassword(req, res) {
  try {
    const response = await authService.recoverPassword(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err.message });
  }
}

async function getRecoveryEmail(req, res) {
  try {
    const response = await authService.getRecoveryEmail(req.body);
    console.log(response.user);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server Error" });
  }
}

module.exports = {
  apiLogin,
  login,
  logout,
  verifyPassword,
  changePassword,
  recoverPassword,
  getRecoveryEmail,
};
