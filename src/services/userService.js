const bcrypt = require("bcrypt");
const { User, Notification } = require("../../db");

async function addUser(payload) {
  const { username, full_name, password, role, email, createdBy } = payload;

  const createdbyUser = await User.findOne({ where: { username: createdBy } });
  if (!createdbyUser) {
    return {
      status: 400,
      body: { success: false, message: "No Created By user exist" },
    };
  }

  const exists = await User.findOne({ where: { username } });
  if (exists) {
    return {
      status: 400,
      body: { success: false, message: "Username already exists" },
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    full_name,
    password: hashedPassword,
    role,
    email,
    created_at: createdbyUser.id,
  });

  if (user.role === "Cashier") {
    await Notification.create({
      type: "Create User",
      message: `${user.full_name} logged in at ${new Date().toLocaleString()}`,
      user_id: user.id,
    });
  }

  const { password: _, ...userData } = user.toJSON();
  return { status: 201, body: { success: true, user: userData } };
}

async function getUsers() {
  return User.findAll({
    attributes: [
      "id",
      "username",
      "full_name",
      "email",
      "role",
      "last_login",
      "status",
    ],
  });
}

async function deleteUserByUsername(username, requestUser) {
  if (requestUser && requestUser.username === username) {
    return {
      status: 400,
      body: { success: false, message: "Cannot delete yourself" },
    };
  }

  const user = await User.findOne({ where: { username } });
  if (!user) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  await User.destroy({ where: { username } });
  return {
    status: 200,
    body: {
      success: true,
      message: `User "${username}" deleted successfully`,
    },
  };
}

async function updateUser(id, payload) {
  const { full_name, password, role } = payload;
  const user = await User.findByPk(id);

  if (!user) {
    return { status: 404, body: { message: "User not found" } };
  }

  if (password) {
    user.password = await bcrypt.hash(password, 10);
  }
  if (full_name) {
    user.full_name = full_name;
  }
  if (role) {
    user.role = role;
  }

  await user.save();
  return { status: 200, body: { success: true, user } };
}

async function deleteUserById(id) {
  const user = await User.findByPk(id);
  if (!user) {
    return { status: 404, body: { message: "User not found" } };
  }

  await user.destroy();
  return { status: 200, body: { success: true, message: "User deleted successfully" } };
}

module.exports = {
  addUser,
  getUsers,
  deleteUserByUsername,
  updateUser,
  deleteUserById,
};
