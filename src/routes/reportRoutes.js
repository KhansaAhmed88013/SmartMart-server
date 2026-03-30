const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/DailySalesReport", reportController.dailySalesReport);
router.get("/getSalesReport", reportController.salesReport);
router.get("/getOTsalesReport", reportController.otSalesReport);
router.get("/getCashierSalesReport", reportController.cashierSalesReport);
router.get("/getCashierDashboardReport", reportController.cashierDashboardReport);
router.get("/getStockReport", reportController.stockReport);
router.get("/getSupplierReport", reportController.supplierReport);
router.get("/getCustomerSalesReport", reportController.customerSalesReport);
router.get("/getSalesSummary", reportController.salesSummary);
router.get("/getInvoiceReports", reportController.invoiceReports);
router.get("/getDailyPurchaseSummary", reportController.dailyPurchaseSummary);

module.exports = router;
