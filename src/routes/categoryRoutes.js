const express = require("express");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.post("/addCategory", categoryController.addCategory);
router.get("/getCategory", categoryController.getCategory);
router.put("/editCategory", categoryController.editCategory);
router.delete("/delCategory/:id", categoryController.deleteCategory);
router.get("/getCategoryNsuppliers", categoryController.getCategoryNsuppliers);

module.exports = router;
