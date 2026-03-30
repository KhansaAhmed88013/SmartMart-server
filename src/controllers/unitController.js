const unitService = require("../services/unitService");

async function getUnits(req, res) {
  try {
    const units = await unitService.getUnits();
    return res.json(units);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function addUnits(req, res) {
  try {
    const response = await unitService.addUnit(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function delUnits(req, res) {
  try {
    const response = await unitService.deleteUnit(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getUnits,
  addUnits,
  delUnits,
};
