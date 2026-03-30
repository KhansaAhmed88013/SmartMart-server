const express = require("express");
const customerController = require("../controllers/customerController");

const router = express.Router();

router.post("/addCustomer", customerController.addCustomer);
router.get("/getCustomers", customerController.getCustomers);
router.delete("/delCustomer/:id", customerController.delCustomer);
router.put("/updateCustomer", customerController.updateCustomer);

module.exports = router;
