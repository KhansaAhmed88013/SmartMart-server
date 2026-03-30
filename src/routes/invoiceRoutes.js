const express = require("express");
const invoiceController = require("../controllers/invoiceController");

const router = express.Router();

router.post("/addInvoice", invoiceController.addInvoice);
router.get("/getInvoiceNo", invoiceController.getInvoiceNo);
router.get("/getCustomerBillingRecord/:id", invoiceController.getCustomerBillingRecord);

module.exports = router;
