const express = require("express");
const unitController = require("../controllers/unitController");

const router = express.Router();

router.get("/getUnits", unitController.getUnits);
router.post("/addUnits", unitController.addUnits);
router.delete("/delUnits/:id", unitController.delUnits);

module.exports = router;
