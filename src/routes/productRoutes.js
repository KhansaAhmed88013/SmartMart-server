const express = require("express");
const productController = require("../controllers/productController");

const router = express.Router();

router.post("/addProducts", productController.addProducts);
router.get("/products-basic", productController.productsBasic);
router.get("/getProducts", productController.getProducts);
router.delete("/delProduct/:code", productController.delProduct);
router.put("/updateProduct", productController.updateProduct);
router.get("/getproductdetail/:barcode", productController.getproductdetail);

module.exports = router;
