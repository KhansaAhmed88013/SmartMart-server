const productService = require("../services/productService");

async function addProducts(req, res) {
  console.log(req.body);
  try {
    const response = await productService.addProducts(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

async function productsBasic(req, res) {
  try {
    const products = await productService.getProductsBasic();
    return res.json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "internal server error" });
  }
}

async function getProducts(req, res) {
  try {
    const products = await productService.getProducts();
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function delProduct(req, res) {
  try {
    const response = await productService.deleteProductByCode(req.params.code);
    return res.status(response.status).json(response.body);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateProduct(req, res) {
  try {
    const response = await productService.updateProduct(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
}

async function getproductdetail(req, res) {
  try {
    const response = await productService.getProductDetail(req.params.barcode);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  addProducts,
  productsBasic,
  getProducts,
  delProduct,
  updateProduct,
  getproductdetail,
};
