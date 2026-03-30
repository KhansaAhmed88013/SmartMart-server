const { Unit } = require("../../db");

async function getUnits() {
  return Unit.findAll({ order: [["id", "ASC"]] });
}

async function addUnit(payload) {
  const { name } = payload;
  if (!name) {
    return { status: 400, body: { error: "Unit name is required" } };
  }

  const [unit, created] = await Unit.findOrCreate({ where: { name } });
  if (!created) {
    return { status: 400, body: { error: "Unit already exists" } };
  }

  return { status: 200, body: unit };
}

async function deleteUnit(id) {
  const deleted = await Unit.destroy({ where: { id } });
  if (!deleted) {
    return { status: 404, body: { error: "Unit not found" } };
  }

  return { status: 200, body: { message: "Unit deleted" } };
}

module.exports = {
  getUnits,
  addUnit,
  deleteUnit,
};
