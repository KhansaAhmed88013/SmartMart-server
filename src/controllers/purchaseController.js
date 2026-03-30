const purchaseService = require("../services/purchaseService");

async function addPurchase(req, res) {
  try {
    const response = await purchaseService.addPurchase(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function getPurchase(req, res) {
  try {
    const purchases = await purchaseService.getPurchase();
    return res.json(purchases);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function updatePurchaseStatus(req, res) {
  try {
    const response = await purchaseService.updatePurchaseStatus(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

async function delPurchase(req, res) {
  try {
    const response = await purchaseService.deletePurchase(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addPurchase,
  getPurchase,
  updatePurchaseStatus,
  delPurchase,
};
