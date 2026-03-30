const { Supplier } = require("../../db");

async function addSupplier(payload) {
  const { supplier_name } = payload;
  const supplier = await Supplier.findOne({ where: { supplier_name } });

  if (supplier) {
    return { status: 404, body: { message: "Supplier Name already exists" } };
  }

  await Supplier.create(payload);
  return { status: 201, body: { message: "Supplier added successfully" } };
}

async function getSupplier() {
  return Supplier.findAll({
    attributes: [
      "id",
      "supplier_name",
      "contact_person",
      "phone",
      "email",
      "address",
      "city",
      "country",
      "tax_number",
      "payment_terms",
      "bank_details",
      "credit_limit",
      "status",
    ],
  });
}

async function editSupplier(payload) {
  const { id, supplier_name } = payload;
  const supplier = await Supplier.findByPk(id);

  if (!supplier) {
    return { status: 404, body: { message: "Supplier does not exist" } };
  }

  const existingSupplier = await Supplier.findOne({ where: { supplier_name } });
  if (existingSupplier && existingSupplier.id !== supplier.id) {
    return { status: 400, body: { message: "Supplier name already exists" } };
  }

  await supplier.update(payload);
  return {
    status: 201,
    body: { message: "Supplier updated successfully", supplier },
  };
}

async function deleteSupplier(id) {
  const supplier = await Supplier.findByPk(id);
  if (supplier) {
    await supplier.destroy();
  }

  return { status: 200, body: { message: "Supplier deleted successfully" } };
}

module.exports = {
  addSupplier,
  getSupplier,
  editSupplier,
  deleteSupplier,
};
