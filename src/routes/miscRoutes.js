const express = require("express");
const miscController = require("../controllers/miscController");

const router = express.Router();

router.get("/health", miscController.health);
router.post("/send_recovery_email", miscController.sendRecoveryEmail);
router.get("/getAdminDashboard", miscController.getAdminDashboard);

module.exports = router;
