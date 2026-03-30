const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User, Notification } = require("../../db");

async function apiLogin(payload) {
  const { username, password } = payload;

  const user = await User.findOne({ where: { username } });
  if (!user) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { status: 401, body: { success: false, message: "Invalid password" } };
  }

  user.last_login = new Date();
  await user.save();

  return {
    status: 200,
    body: {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        last_login: user.last_login,
      },
    },
  };
}

async function login(payload) {
  const { username, password, rememberMe } = payload;

  const user = await User.findOne({ where: { username } });
  if (!user) {
    return { status: 400, body: { success: false, message: "Invalid username" } };
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { status: 400, body: { success: false, message: "Invalid password" } };
  }

  await user.update({ last_login: new Date(), status: "Active" });

  if (user.role === "Cashier") {
    await Notification.create({
      type: "login",
      message: `${user.full_name} logged in at ${new Date().toLocaleString()}`,
      user_id: user.id,
    });
  }

  const { password: _, ...userData } = user.toJSON();
  const tokenExpiry = rememberMe ? "6d" : "6h";
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "your_secret_key",
    { expiresIn: tokenExpiry }
  );

  return {
    status: 200,
    body: {
      success: true,
      user: userData,
      token,
    },
  };
}

async function logout(payload) {
  const { userId } = payload;
  await User.update({ status: "Inactive" }, { where: { id: userId } });
  return { status: 200, body: { success: true, message: "Logged out successfully" } };
}

async function verifyPassword(payload) {
  const { username, role, oldPassword } = payload;

  const user = await User.findOne({ where: { username, role } });
  if (!user) {
    return { status: 200, body: { valid: false } };
  }

  const match = await bcrypt.compare(oldPassword, user.password);
  return { status: 200, body: { valid: match } };
}

async function changePassword(payload) {
  const { username, role, newPassword } = payload;

  const user = await User.findOne({ where: { username, role } });
  if (!user) {
    return { status: 400, body: { message: "User not found" } };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });

  return { status: 200, body: { message: "Password changed successfully!" } };
}

async function recoverPassword(payload) {
  const { username, role, newPassword } = payload;

  const user = await User.findOne({ where: { username, role } });
  if (!user) {
    return { status: 400, body: { message: "User not found" } };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });

  return { status: 200, body: { success: true } };
}

async function getRecoveryEmail(payload) {
  const { username, role } = payload;

  const user = await User.findOne({
    where: {
      username: { [Op.like]: username },
      role: { [Op.like]: role },
    },
  });

  if (!user) {
    return { status: 404, body: { error: "User not found" } };
  }

  return { status: 200, body: { email: user.email }, user };
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
