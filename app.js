// app.js
const { connectAndSync, Product, Discount } = require('./db');
const cors = require('cors');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Connect to DB and sync tables
connectAndSync();

// ========================
// 📌 Add Single Product
// ========================
app.post('/addProduct', async (req, res) => {
  const { code } = req.body;
  try {
    const repeatedCode = await Product.findOne({ where: { code } });
    if (repeatedCode) {
      return res.status(400).json({ message: "Code can't be same" });
    }
    const product = await Product.create(req.body);
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Add Multiple Products
// ========================
app.post('/addProducts', async (req, res) => {
  const products = Array.isArray(req.body) ? req.body : [req.body];
  try {
    const createdProducts = [];

    for (const prod of products) {
      const repeatedCode = await Product.findOne({ where: { code: prod.code } });
      if (repeatedCode) {
        return res.status(400).json({ message: `Code '${prod.code}' already exists` });
      }

      const newProduct = await Product.create(prod);
      createdProducts.push(newProduct);
    }

    res.json({ message: "Products added successfully", products: createdProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Add Discount
// ========================
app.post('/addDiscount', async (req, res) => {
  console.log(req.body)
  const { productCode, type, description, startDate, endDate, amount, status } = req.body;
console.log(req.body)
  try {
    const product = await Product.findOne({ where: { code: productCode } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const discount = await Discount.create({
      type,
      description,
      startDate,
      endDate,
      amount,
      status: status || 'Active',
      product_id: product.id
    });

    res.json({ message: "Discount added successfully", discount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Get Discounts (with Product info)
// ========================
app.get('/discounts', async (req, res) => {
  try {
    const discounts = await Discount.findAll({
      include: { model: Product, as: 'product' }
    });
    res.json(discounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
// ========================
// 📌 Get Product IDs & Names
// ========================
app.get('/products-basic', async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: [ 'name', 'code']  // ✅ Only send required fields
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "internal server error" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
