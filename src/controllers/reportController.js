const reportService = require("../services/reportService");

async function dailySalesReport(req, res) {
  try {
    const result = await reportService.getDailySalesReport();
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}

async function salesReport(req, res) {
  try {
    const data = await reportService.getSalesReport();
    return res.json(data);
  } catch (err) {
    console.error("Error in /getSalesReport", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function otSalesReport(req, res) {
  try {
    const invoices = await reportService.getOTsalesReport();
    return res.json(invoices);
  } catch (err) {
    console.error("Error in /getSalesReport", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function cashierSalesReport(req, res) {
  try {
    const response = await reportService.getCashierSalesReport(req.query);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function cashierDashboardReport(req, res) {
  try {
    const response = await reportService.getCashierDashboardReport(req.query);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function stockReport(req, res) {
  try {
    const report = await reportService.getStockReport();
    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function supplierReport(req, res) {
  try {
    const result = await reportService.getSupplierReport();
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function customerSalesReport(req, res) {
  try {
    const record = await reportService.getCustomerSalesReport();
    return res.json(record);
  } catch (error) {
    console.error("Error in /getCustomerSalesReport:", error);
    return res.status(500).json({ message: error.message });
  }
}

async function salesSummary(req, res) {
  try {
    const response = await reportService.getSalesSummary(req.query);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error("Error in /getSalesSummary", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function invoiceReports(req, res) {
  try {
    const response = await reportService.getInvoiceReports(req.query);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error("❌ Error in /getInvoiceReports", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function dailyPurchaseSummary(req, res) {
  try {
    const formatted = await reportService.getDailyPurchaseSummary();
    return res.json(formatted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  dailySalesReport,
  salesReport,
  otSalesReport,
  cashierSalesReport,
  cashierDashboardReport,
  stockReport,
  supplierReport,
  customerSalesReport,
  salesSummary,
  invoiceReports,
  dailyPurchaseSummary,
};
