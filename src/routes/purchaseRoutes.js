const express = require("express");
const purchaseController = require("../controllers/purchaseController");

const router = express.Router();

router.post("/addPurchase", purchaseController.addPurchase);
router.get("/getPurchase", purchaseController.getPurchase);
router.put("/updatePurchaseStatus", purchaseController.updatePurchaseStatus);
router.delete("/delPurchase/:id", purchaseController.delPurchase);

module.exports = router;
