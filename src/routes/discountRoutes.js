const express = require("express");
const discountController = require("../controllers/discountController");

const router = express.Router();

router.post("/addDiscount", discountController.addDiscount);
router.get("/discounts", discountController.discounts);
router.put("/editDiscount", discountController.editDiscount);
router.delete("/delDiscount/:id", discountController.delDiscount);

router.post("/addBillDiscount", discountController.addBillDiscount);
router.get("/getBillDiscount", discountController.getBillDiscount);
router.delete("/delBillDiscount/:id", discountController.delBillDiscount);
router.put("/UpdateBillDiscount", discountController.updateBillDiscount);

router.post("/addCategoryDiscount", discountController.addCategoryDiscount);
router.get("/getCategoryDiscounts", discountController.getCategoryDiscounts);
router.delete("/delCategoryDiscount/:id", discountController.delCategoryDiscount);
router.put("/updateCategoryDiscount", discountController.updateCategoryDiscount);

router.get("/getnoofdiscount", discountController.getnoofdiscount);

module.exports = router;
