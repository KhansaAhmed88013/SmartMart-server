const invoiceService = require("../services/invoiceService");

async function addInvoice(req, res) {
  try {
    const response = await invoiceService.addInvoice(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

async function getInvoiceNo(req, res) {
  try {
    const result = await invoiceService.getInvoiceNo();
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getCustomerBillingRecord(req, res) {
  try {
    const records = await invoiceService.getCustomerBillingRecord(req.params.id);
    return res.json(records);
  } catch (error) {
    console.error("Error getting customer invoice:", error);
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addInvoice,
  getInvoiceNo,
  getCustomerBillingRecord,
};
