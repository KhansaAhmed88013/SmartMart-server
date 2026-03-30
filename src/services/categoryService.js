const { Category, Supplier } = require("../../db");

async function addCategory(payload) {
  const { name } = payload;
  const category = await Category.findOne({ where: { name } });
  if (category) {
    return {
      status: 400,
      body: { message: "Category with this name already exists" },
    };
  }

  await Category.create(payload);
  return { status: 200, body: { message: "Category added successfully" } };
}

async function getCategories() {
  const result = await Category.findAll({
    attributes: ["id", "name", "description"],
  });
  return result;
}

async function editCategory(payload) {
  const { id, name } = payload;
  const category = await Category.findByPk(id);
  if (!category) {
    return { status: 404, body: { message: "Category does not exist" } };
  }

  const existingCategory = await Category.findOne({ where: { name } });
  if (existingCategory && existingCategory.id !== category.id) {
    return { status: 400, body: { message: "Category name already exists" } };
  }

  await category.update(payload);
  return {
    status: 201,
    body: { message: "Category updated successfully", category },
  };
}

async function deleteCategory(id) {
  const category = await Category.findByPk(id);
  if (category) {
    await category.destroy();
  }

  return { status: 200, body: { message: "Category deleted successfully" } };
}

async function getCategoryAndSuppliers() {
  const categories = await Category.findAll({ attributes: ["id", "name"] });
  const suppliers = await Supplier.findAll({ attributes: ["id", "supplier_name"] });
  return { categories, suppliers };
}

module.exports = {
  addCategory,
  getCategories,
  editCategory,
  deleteCategory,
  getCategoryAndSuppliers,
};
