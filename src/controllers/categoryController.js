const categoryService = require("../services/categoryService");

async function addCategory(req, res) {
  try {
    const response = await categoryService.addCategory(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getCategory(req, res) {
  try {
    const result = await categoryService.getCategories();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function editCategory(req, res) {
  try {
    const response = await categoryService.editCategory(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const response = await categoryService.deleteCategory(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getCategoryNsuppliers(req, res) {
  try {
    const result = await categoryService.getCategoryAndSuppliers();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  addCategory,
  getCategory,
  editCategory,
  deleteCategory,
  getCategoryNsuppliers,
};
