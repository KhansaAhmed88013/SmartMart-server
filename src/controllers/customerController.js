const customerService = require("../services/customerService");

async function addCustomer(req, res) {
  try {
    const response = await customerService.addCustomer(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error("Error adding customer:", error);
    return res.status(500).json({ message: error.message });
  }
}

async function getCustomers(req, res) {
  try {
    const customers = await customerService.getCustomers();
    return res.json(customers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function delCustomer(req, res) {
  try {
    const response = await customerService.deleteCustomer(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error("Error deleting customer:", error);
    return res.status(500).json({ message: error.message });
  }
}

async function updateCustomer(req, res) {
  try {
    const response = await customerService.updateCustomer(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error("Error updating customer:", error);
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addCustomer,
  getCustomers,
  delCustomer,
  updateCustomer,
};
