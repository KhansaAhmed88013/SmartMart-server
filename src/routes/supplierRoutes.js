const express = require("express");
const supplierController = require("../controllers/supplierController");

const router = express.Router();

router.post("/addSupplier", supplierController.addSupplier);
router.get("/getSupplier", supplierController.getSupplier);
router.put("/editSupplier", supplierController.editSupplier);
router.delete("/delSupplier/:id", supplierController.delSupplier);

module.exports = router;
