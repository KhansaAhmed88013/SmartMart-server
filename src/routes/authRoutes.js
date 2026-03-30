const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/api/login", authController.apiLogin);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.post("/verifyPassword", authController.verifyPassword);
router.post("/changePassword", authController.changePassword);
router.post("/recover-Password", authController.recoverPassword);
router.post("/getRecoveryEmail", authController.getRecoveryEmail);

module.exports = router;
