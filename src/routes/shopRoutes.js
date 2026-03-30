const express = require("express");
const shopController = require("../controllers/shopController");

const router = express.Router();

router.get("/getProfile", shopController.getProfile);
router.get("/getProfileName", shopController.getProfileName);
router.post("/addProfile", shopController.addProfile);

module.exports = router;
