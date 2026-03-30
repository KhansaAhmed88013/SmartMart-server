const express = require("express");
const notificationController = require("../controllers/notificationController");

const router = express.Router();

router.get("/notifications", notificationController.notifications);
router.post("/clearNotifications", notificationController.clearNotifications);

module.exports = router;
