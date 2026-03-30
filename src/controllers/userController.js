const userService = require("../services/userService");

async function addusers(req, res) {
  try {
    const response = await userService.addUser(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function users(req, res) {
  try {
    const list = await userService.getUsers();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function deleteByUsername(req, res) {
  const { username } = req.params;
  try {
    const response = await userService.deleteUserByUsername(username, req.user);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  try {
    const response = await userService.updateUser(id, req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function deleteById(req, res) {
  const { id } = req.params;
  try {
    const response = await userService.deleteUserById(id);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  addusers,
  users,
  deleteByUsername,
  updateUser,
  deleteById,
};
