const supplierService = require("../services/supplierService");

async function addSupplier(req, res) {
  try {
    const response = await supplierService.addSupplier(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getSupplier(req, res) {
  try {
    const result = await supplierService.getSupplier();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function editSupplier(req, res) {
  try {
    const response = await supplierService.editSupplier(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function delSupplier(req, res) {
  try {
    const response = await supplierService.deleteSupplier(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addSupplier,
  getSupplier,
  editSupplier,
  delSupplier,
};
