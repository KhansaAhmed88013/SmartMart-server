const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/addusers", userController.addusers);
router.get("/users", userController.users);
router.delete("/users/:username", userController.deleteByUsername);
router.put("users/:id", userController.updateUser);
router.delete("/api/users/:id", userController.deleteById);

module.exports = router;
