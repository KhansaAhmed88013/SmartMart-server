const {
  sequelize,
  connectAndSync,
  Product,
  Supplier,
  Customer,
  Category,
  Invoice,
  InvoiceItem,
  ShopProfile,
  ItemsDiscount,
  Purchase,
  PurchaseItem,
  StockLedger,
  CategoryDiscount,
  recordLedger,
  getLastBalance,
  User,
  Unit,
  BillDiscount,
} = require("./db");


const cors = require("cors");
const bcrypt = require("bcrypt");
const express = require("express");
const { Sequelize, Op, where } = require("sequelize");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========================
// ✅ Connect to DB and sync tables
// ========================
connectAndSync();
app.get('/', (req, res) => {
  res.send('✅ API is working!');
});
// ========================
// 📌 Add Products
// ========================
app.post("/addProducts", async (req, res) => {
  console.log(req.body);
  const t = await sequelize.transaction();
  try {
    const list = Array.isArray(req.body) ? req.body : [req.body];
    const created = [];

    for (const prod of list) {
      const exists = await Product.findOne({
        where: { code: prod.code },
        transaction: t,
      });
      if (exists) {
        await t.rollback();
        return res
          .status(400)
          .json({ message: `Code '${prod.code}' already exists` });
      }

      const p = await Product.create({ ...prod, qty: 0 }, { transaction: t });
      created.push(p);

      if (Number(prod.qty) > 0) {
        await recordLedger({
          product_id: p.id,
          transaction_type: "Opening",
          qty_in: Number(prod.qty),
          remarks: `Opening stock for ${p.name}`,
          transaction: t,
        });
      }
    }

    await t.commit();
    res.json({ message: "Products added successfully", products: created });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
// ========================
// 📌 Add Customer
// ========================
app.post('/addCustomer', async (req, res) => {
  try {
    const { name, phone, address, balance } = req.body;

    // Check required field
    if (!name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    // Create new customer
    const newCustomer = await Customer.create({
      name,
      phone,
      address,
      balance: balance || 0.00   // اگر نہ دیں تو default 0 ہوگا
    });

    res.status(201).json({ 
      message: "Customer added successfully", 
      customer: newCustomer 
    });
  } catch (error) {
    console.error("Error adding customer:", error);
    res.status(500).json({ message: error.message });
  }
});
// 📌 Get all customers
app.get('/getCustomers', async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// 📌 Delete Customer
app.delete('/delCustomer/:id', async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.destroy();
    res.json({ message: `Customer '${customer.name}' deleted successfully` });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ message: error.message });
  }
});
// 📌 Update Customer
app.put('/updateCustomer', async (req, res) => {
  try {
    const { id, name, phone, address, balance } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await customer.update({
      name: name || customer.name,
      phone: phone || customer.phone,
      address: address || customer.address,
      balance: balance !== undefined ? balance : customer.balance
    });

    res.json({ message: "Customer updated successfully", customer });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({ message: error.message });
  }
});


// ========================
// 📌 Add Discount
// ========================
app.post("/addDiscount", async (req, res) => {
  const {
    productCodes,
    type,
    description,
    startDate,
    endDate,
    amount,
    status,
  } = req.body;

  if (!productCodes || productCodes.length === 0) {
    return res.status(400).json({ message: "No products selected" });
  }

  try {
    const createdDiscounts = [];

    for (let code of productCodes) {
      const product = await Product.findOne({ where: { code } });

      if (!product) {
        return res.status(404).json({ message: `Product not found: ${code}` });
      }

      if (type === "Value") {
        const amt = parseFloat(amount);
        const salePrice = parseFloat(product.sale_price);

        if (amt > salePrice) {
          return res.status(400).json({
            message: `Discount cannot be greater than sale price (Rs. ${salePrice}) for product ${productData.code}`,
          });
        }
      }

      const discount = await ItemsDiscount.create({
        type,
        description,
        startDate,
        endDate,
        amount,
        status: status || "Active",
        product_id: product.id,
      });

      createdDiscounts.push(discount);
    }

    res.json({
      message: "Discount(s) added successfully",
      discounts: createdDiscounts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// 📌 Get Discounts (with Product info)
// ========================
app.get("/discounts", async (req, res) => {
  try {
    const discounts = await ItemsDiscount.findAll({
      include: { model: Product, as: "product" },
    });
    res.json(discounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
// ========================
// 📌 Edit Discount
// ========================
app.put("/editDiscount", async (req, res) => {
  console.log(req.body);
  const { id, amount, type } = req.body;

  try {
    const discount = await ItemsDiscount.findByPk(id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }

    // Get product (from request OR DB relation)
    const productData =
      req.body.product || (await Product.findByPk(discount.product_id));
    if (!productData) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (type === "Value") {
      const amt = parseFloat(amount);
      const salePrice = parseFloat(productData.sale_price);

      if (amt > salePrice) {
        return res.status(400).json({
          message: `Discount cannot be greater than sale price (Rs. ${salePrice}) for product ${productData.code}`,
        });
      }
    }

    // Update discount
    await discount.update(req.body);

    res.json({
      message: "Discount updated successfully",
      discount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/delDiscount/:id", async (req, res) => {
  try {
    const result = await ItemsDiscount.findOne({
      where: { id: req.params.id },
    });
    if (!result)
      return res.status(404).json({ message: "Discount does not exist" });

    await result.destroy();
    res.json({ message: `Discount  has been deleted` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/addBillDiscount", async (req, res) => {
  try {
    await BillDiscount.create(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/getBillDiscount", async (req, res) => {
  try {
    const discounts = await BillDiscount.findAll();
    res.json(discounts);
  } catch (err) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.delete("/delBillDiscount/:id", async (req, res) => {
  console.log(req.params.id);
  console.log("hi");
  try {
    const result = await BillDiscount.findOne({ where: { id: req.params.id } });
    if (!result)
      return res.status(404).json({ message: "Discount does not exist" });

    await result.destroy();
    res.json({ message: `Discount id: ${result.id} has been deleted` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
app.put("/UpdateBillDiscount", async (req, res) => {
  const { id } = req.body;
  console.log(req.body);
  try {
    const discount = await BillDiscount.findByPk(id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    await discount.update(req.body);

    res.json({
      message: "Discount updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/addCategoryDiscount", async (req, res) => {
  try {
    const { category_id, percent, startDate, endDate, status } = req.body;

    // 1. Validate percent
    if (percent <= 0 || percent > 100) {
      return res
        .status(400)
        .json({ message: "Percent must be between 1 and 100" });
    }

    // 2. Check category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 3. Create discount
    const discount = await CategoryDiscount.create({
      category_id,
      percent,
      startDate,
      endDate,
      status,
    });

    res.json({ ok: true, discount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/getCategoryDiscounts", async (req, res) => {
  try {
    const discounts = await CategoryDiscount.findAll({
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"], // get category name
        },
      ],
    });

    // format response
    const result = discounts.map((d) => ({
      id: d.id,
      category_id: d.category_id,
      category: d.category ? d.category.name : null,
      percent: d.percent,
      startDate: d.startDate,
      endDate: d.endDate,
      status: d.status,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.delete("/delCategoryDiscount/:id", async (req, res) => {
  console.log(req.params.id);
  try {
    const result = await CategoryDiscount.findOne({
      where: { id: req.params.id },
    });
    if (!result)
      return res.status(404).json({ message: "Discount does not exist" });

    await result.destroy();
    res.json({ message: `Discount has been deleted` });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
app.put("/updateCategoryDiscount", async (req, res) => {
  const { id, category_id, percent, startDate, endDate, status } = req.body;

  try {
    const discount = await CategoryDiscount.findByPk(id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }

    // 1. Validate percent
    if (percent <= 0 || percent > 100) {
      return res
        .status(400)
        .json({ message: "Percent must be between 1 and 100" });
    }

    // 2. Validate category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // 3. Update discount
    await discount.update({
      category_id,
      percent,
      startDate,
      endDate,
      status,
    });

    res.json({ message: "Discount updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/getnoofdiscount", async (req, res) => {
  try {
    const billdiscountcount = await BillDiscount.count();
    const itemdiscountcount = await ItemsDiscount.count();
    const categorydiscountcount = await CategoryDiscount.count();
    res.json({
      billdiscountcount: billdiscountcount,
      itemdiscountcount: itemdiscountcount,
      categorydiscountcount: categorydiscountcount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// ========================
// 📌 Get Product IDs & Names
// ========================
app.get("/products-basic", async (req, res) => {
  try {
    const products = await Product.findAll({ attributes: ["name", "code"] });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "internal server error" });
  }
});

// ========================
// 📌 Get Full Products
// ========================
app.get("/getProducts", async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Supplier, attributes: ["id", "supplier_name"] },
        { model: Category, attributes: ["id", "name"] },
        { model: Unit, as: "unitDetails", attributes: ["id", "name"] }, // Include unit
      ],
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Delete Product
// ========================
app.delete("/delProduct/:code", async (req, res) => {
  try {
    const result = await Product.findOne({ where: { code: req.params.code } });
    if (!result)
      return res.status(404).json({ message: "Product does not exist" });

    await result.destroy();
    res.json({ message: `Product ${result.code} has been deleted` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Update Product (with Qty Adjustment)
// ========================
app.put("/updateProduct", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { code, qty, ...otherFields } = req.body;
    if (!code)
      return res.status(400).json({ message: "Product code is required" });

    // Find product with row lock to prevent race conditions
    const product = await Product.findOne({
      where: { code },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // Handle quantity update safely
    if (typeof qty !== "undefined" && qty !== null) {
      const prevBalance = await getLastBalance(product.id, t);
      const diff = Number(qty) - prevBalance;

      if (diff < 0 && Math.abs(diff) > product.qty) {
        throw new Error(`Insufficient stock to reduce for ${product.name}`);
      }

      if (diff !== 0) {
        // Update actual product stock
        product.qty += diff;
        await product.save({ transaction: t });

        // Record ledger entry
        await recordLedger({
          product_id: product.id,
          transaction_type: "Adjustment",
          qty_in: diff > 0 ? diff : 0,
          qty_out: diff < 0 ? Math.abs(diff) : 0,
          remarks: `Manual adjustment for ${product.name}`,
          transaction: t,
        });
      }
    }

    // Update other fields safely
    if (Object.keys(otherFields).length > 0) {
      await product.update(otherFields, { transaction: t });
    }

    await t.commit();
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ message: error.message || "Server error" });
  }
});

// ========================
// 📌 Supplier CRUD
// ========================
app.post("/addSupplier", async (req, res) => {
  const { supplier_name } = req.body;
  try {
    const supplier = await Supplier.findOne({ where: { supplier_name } });
    if (supplier)
      return res.status(404).json({ message: "Supplier Name already exists" });

    await Supplier.create(req.body);
    res.status(201).json({ message: "Supplier added successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/getSupplier", async (req, res) => {
  try {
    const result = await Supplier.findAll({
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
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/editSupplier", async (req, res) => {
  const { id, supplier_name } = req.body;
  try {
    const supplier = await Supplier.findByPk(id);
    if (!supplier)
      return res.status(404).json({ message: "Supplier does not exist" });

    const existingSupplier = await Supplier.findOne({
      where: { supplier_name },
    });
    if (existingSupplier && existingSupplier.id !== supplier.id)
      return res.status(400).json({ message: "Supplier name already exists" });

    await supplier.update(req.body);
    res
      .status(201)
      .json({ message: "Supplier updated successfully", supplier });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delSupplier/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (supplier) await supplier.destroy();
    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ========================
// 📌 Category CRUD
// ========================
app.post("/addCategory", async (req, res) => {
  const { name } = req.body;
  try {
    const category = await Category.findOne({ where: { name } });
    if (category)
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });

    await Category.create(req.body);
    res.json({ message: "Category added successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/getCategory", async (req, res) => {
  try {
    const result = await Category.findAll({
      attributes: ["id", "name", "description"],
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/editCategory", async (req, res) => {
  const { id, name } = req.body;
  try {
    const category = await Category.findByPk(id);
    if (!category)
      return res.status(404).json({ message: "Category does not exist" });

    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory && existingCategory.id !== category.id)
      return res.status(400).json({ message: "Category name already exists" });

    await category.update(req.body);
    res
      .status(201)
      .json({ message: "Category updated successfully", category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delCategory/:id", async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (category) await category.destroy();
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//billing
// 📌 Add Invoice
app.post('/addInvoice', async (req, res) => {
  try {
    const { invoice, items } = req.body;

    if (!invoice || !items || !items.length) {
      return res.status(400).json({ message: "Invoice and items are required" });
    }

    // Create invoice
    const newInvoice = await Invoice.create(invoice);

    // Create items linked to invoice
    for (const item of items) {
      await InvoiceItem.create({
        ...item,
        invoice_id: newInvoice.id
      });

      // Deduct stock
      if (item.product_code) {
        const product = await Product.findOne({ where: { code: item.product_code } });
        if (product) {
          await product.update({ qty: product.qty - item.quantity });
        }
      }
    }

    res.json({ message: "Invoice created successfully", invoice: newInvoice });
  } catch (error) {
    console.error("Error adding invoice:", error);
    res.status(500).json({ message: error.message });}})

// ========================
// 📌 Get Categories & Suppliers (for dropdowns)
// ========================
app.get("/getCategoryNsuppliers", async (req, res) => {
  try {
    const categories = await Category.findAll({ attributes: ["id", "name"] });
    const suppliers = await Supplier.findAll({
      attributes: ["id", "supplier_name"],
    });
    res.json({ categories, suppliers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Invoice CRUD & Ledger
// ========================
app.post("/addInvoice", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { invoice, items } = req.body;
    const invoiceAdded = await Invoice.create(invoice, { transaction: t });

    for (const it of items) {
      const product = await Product.findOne({
        where: { code: it.product_code },
        transaction: t,
        lock: t.LOCK.UPDATE, // ✅ lock row to prevent concurrent updates
      });
      if (!product)
        throw new Error(`Product not found for code: ${it.product_code}`);

      // ✅ Check if enough stock is available
      if (product.qty < Number(it.quantity)) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      await InvoiceItem.create(
        {
          invoice_id: invoiceAdded.id,
          product_id: product.id,
          price: it.price,
          quantity: it.quantity,
          tax_percent: it.tax_percent || 0,
          cost_price: product.cost_price, // or FIFO batch cost
        },
        { transaction: t }
      );

      await recordLedger({
        product_id: product.id,
        transaction_type: "Sale",
        transaction_id: invoiceAdded.id,
        qty_out: Number(it.quantity),
        remarks: `Invoice #${invoiceAdded.id}, Sold ${it.quantity}`,
        transaction: t,
      });
    }

    await t.commit();
    res.json({
      message: "Invoice created successfully",
      invoice_id: invoiceAdded.id,
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ========================
// 📌 Get Last Invoice No
// ========================
app.get("/getInvoiceNo", async (req, res) => {
  try {
    const lastInvoice = await Invoice.findOne({
      attributes: ["id"],
      order: [["id", "DESC"]],
    });
    res.json({ id: lastInvoice ? lastInvoice.id : "-1" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ========================
// 📌 Shop Profile
// ========================
app.get("/getProfile", async (req, res) => {
  try {
    const profile = await ShopProfile.findOne();
    if (!profile) return res.json(null);

    res.json({
      shopName: profile.shop_name,
      number1: profile.number1,
      number2: profile.number2,
      location: profile.location,
      description: profile.description,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/getProfileName", async (req, res) => {
  try {
    const profile = await ShopProfile.findOne();
    if (!profile) return res.json(null);

    res.json({
      shopName: profile.shop_name,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/addProfile", async (req, res) => {
  try {
    const { shopName, number1, number2, location, description } = req.body;
    let profile = await ShopProfile.findOne();

    if (profile) {
      profile.shop_name = shopName;
      profile.number1 = number1;
      profile.number2 = number2;
      profile.location = location;
      profile.description = description;
      await profile.save();
    } else {
      profile = await ShopProfile.create({
        shop_name: shopName,
        number1,
        number2,
        location,
        description,
      });
    }

    res.json({ success: true, message: "Shop profile saved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================
// 📌 Get Product Detail
// ========================
app.get("/getproductdetail/:barcode", async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { code: req.params.barcode },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const today = new Date();

    // ✅ Item Discount → last one not expired
    const itemdiscount = await ItemsDiscount.findOne({
      where: {
        product_id: product.id,
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today },
        status: "Active",
      },
      order: [
        ["endDate", "DESC"],
        ["created_at", "DESC"],
      ], // last one
    });

    // ✅ Bill Discount → last one not expired
    const billDiscount = await BillDiscount.findOne({
      where: {
        from: { [Op.lte]: today },
        to: { [Op.gte]: today },
        status: "Active",
      },
      order: [
        ["to", "DESC"],
        ["created_at", "DESC"],
      ], // last one
    });

    // ✅ Category Discount → highest %
    const categorydiscount = await CategoryDiscount.findOne({
      where: {
        category_id: product.category_id,
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today },
        status: "Active",
      },
      order: [
        ["percent", "DESC"],
        ["created_at", "DESC"],
      ], // highest percent
    });

    res.json({
      code: product.code,
      name: product.name,
      sale_price: product.sale_price,
      itemdiscount,
      billDiscount,
      categorydiscount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================
// 📌 Sales Report
// ========================
// ========================
// 📌 Sales Report (Optimized)
// ========================
app.get("/getSalesReport", async (req, res) => {
  try {
    const report = await Invoice.findAll({
      attributes: [
        "id",
        "invoice_date",
        "cashier_name",
        "discount",
        "tax_percent",
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("InvoiceItems.price * InvoiceItems.quantity")
          ),
          "subtotal",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal("InvoiceItems.cost_price * InvoiceItems.quantity")
          ),
          "total_cost_price",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              "(InvoiceItems.price * InvoiceItems.quantity) * (InvoiceItems.tax_percent/100)"
            )
          ),
          "item_tax_total",
        ],
      ],
      include: [
        {
          model: InvoiceItem,
          attributes: [],
        },
      ],
      group: ["Invoice.id"],
      raw: true,
    });

    // Post-process calculations
    const formatted = report.map((inv) => {
      const subtotal = parseFloat(inv.subtotal || 0);
      const costPrice = parseFloat(inv.total_cost_price || 0);
      const itemTaxTotal = parseFloat(inv.item_tax_total || 0);
      const discount = parseFloat(inv.discount || 0);
      const globalTaxPercent = parseFloat(inv.tax_percent || 0);
      const globalTaxAmount =
        ((subtotal + itemTaxTotal) * globalTaxPercent) / 100;
      const totalWithTax = subtotal + itemTaxTotal + globalTaxAmount;
      const grandTotal = totalWithTax - discount;
      const profit = subtotal - costPrice;

      return {
        invoice_no: inv.id,
        invoice_date: inv.invoice_date,
        cashier_name: inv.cashier_name,
        costPrice: costPrice.toFixed(2),
        total_before_tax: subtotal.toFixed(2),
        tax_on_items: itemTaxTotal.toFixed(2),
        sale_tax: globalTaxAmount.toFixed(2),
        net_total: totalWithTax.toFixed(2),
        discountTotal: discount.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        profit: profit.toFixed(2),
      };
    });

    const users = await User.findAll({
      attributes: ["username"],
    });
    res.json({ formatted, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/getCashierSalesReport", async (req, res) => {
  try {
    const { username, role } = req.query;

    // Fetch invoices for this cashier only
    const invoices = await Invoice.findAll({
      where: {
        cashier_name: username,
      },
      attributes: [
        "id",
        "invoice_date",
        "payment_method",
        "discount",
        "tax_percent",
        "final_total",
        "paid_amount",
      ],
      include: [
        {
          model: InvoiceItem,
          attributes: ["id", "price", "quantity"],
          include: [
            {
              model: Product,
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [["invoice_date", "DESC"]],
    });

    // Format response for frontend
    const formatted = invoices.map((inv) => ({
      invoiceNo: inv.id,
      date: inv.invoice_date,
      paymentType: inv.payment_method,
      discount: parseFloat(inv.discount || 0),
      total: parseFloat(inv.final_total || 0),
      items: inv.InvoiceItems.map((item) => ({
        name: item.Product?.name || "N/A",
        qty: parseFloat(item.quantity),
        price: parseFloat(item.price),
      })),
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================
// 📌 Stock Report
// ========================
// ========================
// 📌 Stock Report (Optimized)
// ========================
app.get("/getStockReport", async (req, res) => {
  try {
    const products = await Product.findAll({
      attributes: ["id", "name", "cost_price", "qty"],
      include: [
        { model: Category, attributes: ["name"] },
        { model: Unit, as: "unitDetails", attributes: ["name"] }, // <-- fetch unit name
      ],
      raw: true,
      nest: true, // makes nested objects instead of flat keys
    });

    // Aggregate ledger by product
    const ledgerAgg = await StockLedger.findAll({
      attributes: [
        "product_id",
        [sequelize.fn("SUM", sequelize.col("qty_in")), "total_purchases"],
        [sequelize.fn("SUM", sequelize.col("qty_out")), "total_sales"],
        [sequelize.fn("MAX", sequelize.col("balance")), "closing_stock"],
      ],
      group: ["product_id"],
      raw: true,
    });

    const ledgerMap = {};
    ledgerAgg.forEach((l) => {
      ledgerMap[l.product_id] = l;
    });

    const report = products.map((p) => {
      const ledger = ledgerMap[p.id] || {};
      const purchases = parseFloat(ledger.total_purchases || 0);
      const sales = parseFloat(ledger.total_sales || 0);
      const closingStock = parseFloat(ledger.closing_stock || p.qty);
      const openingStock = closingStock - (purchases - sales);

      return {
        id: p.id,
        name: p.name,
        unit: p.unitDetails?.name || "-", // ✅ fix: get from relation
        cost_price: parseFloat(p.cost_price),
        Category: p.Category?.name || "-",

        opening_stock: openingStock,
        opening_stock_value: openingStock * parseFloat(p.cost_price),

        purchases,
        sales,

        closing_stock: closingStock,
        closing_stock_value: closingStock * parseFloat(p.cost_price),
      };
    });

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/getSupplierReport", async (req, res) => {
  try {
    const result = await Supplier.findAll({
      attributes: [
        "id",
        ["supplier_name", "name"],
        ["contact_person", "contactPerson"],
        "phone",
        "email",
        "address",
        "status",
        // ✅ Aggregates
        [
          sequelize.fn(
            "COALESCE",
            sequelize.fn("SUM", sequelize.col("purchases.total_amount")),
            0
          ),
          "totalPurchases",
        ],
        [
          sequelize.fn(
            "COALESCE",
            sequelize.fn(
              "SUM",
              sequelize.literal(
                "purchases.total_amount - purchases.paid_amount"
              )
            ),
            0
          ),
          "pendingAmount",
        ],
        [sequelize.fn("MAX", sequelize.col("purchases.purchase_date")), "date"],
      ],
      include: [
        {
          model: Purchase,
          as: "purchases",
          attributes: [], // don’t pull all purchases, just use for aggregates
        },
      ],
      group: ["Supplier.id"], // group by supplier
      raw: true,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/addPurchase", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      supplier_id,
      total,
      purchase_date,
      items,
      due_date,
      payment_status,
      paid_amount,
    } = req.body;

    // 1️⃣ Create Purchase
    const purchase = await Purchase.create(
      {
        supplier_id,
        purchase_date,
        total_amount: total,
        remarks: "Manual Purchase",
        payment_status,
        due_date,
        paid_amount,
      },
      { transaction: t }
    );

    for (const it of items) {
      const product = await Product.findByPk(it.product_id, { transaction: t });
      if (!product) throw new Error(`Product ${it.product_id} not found`);
      if (Number(it.sale_price) <= 0)
        throw new Error("Sale price must be positive");

      const oldCost = product.cost_price || 0;
      const purchasedQty = Number(it.quantity);
      const purchaseCost = Number(it.cost_price);

      const currentStock = product.qty; // reliable snapshot
      const newWeightedCost =
        currentStock + purchasedQty === 0
          ? purchaseCost
          : (currentStock * oldCost + purchasedQty * purchaseCost) /
            (currentStock + purchasedQty);

      // 3️⃣ Update product with weighted cost, optionally update sale_price
      product.cost_price = newWeightedCost;
      product.sale_price = Number(it.sale_price); // from frontend modal
      await product.save({ transaction: t });

      // 4️⃣ Create PurchaseItem (historical record)
      await PurchaseItem.create(
        {
          cost_price: it.cost_price, // keep original purchase cost for history
          sale_price: it.sale_price,
          quantity: it.quantity,
          purchase_id: purchase.id,
          product_id: it.product_id,
        },
        { transaction: t }
      );

      // 5️⃣ Update stock ledger
      await recordLedger({
        product_id: product.id,
        transaction_type: "Purchase",
        transaction_id: purchase.id,
        qty_in: purchasedQty,
        remarks: `Purchase ID ${purchase.id}`,
        transaction: t,
      });
    }

    await t.commit();
    res.json({ message: "Purchase created" });
  } catch (err) {
    await t.rollback();
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ========================
// 📌 Get Purchases
// ========================
app.get("/getPurchase", async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      include: [
        {
          model: Supplier,
          as: "supplier",
          attributes: ["id", "supplier_name"],
        },
        {
          model: PurchaseItem,
          attributes: ["id", "cost_price", "sale_price", "quantity"],
          include: [{ model: Product, attributes: ["id", "name"] }],
        },
      ],
      order: [["id", "ASC"]],
    });

    // 🟢 Format response so cost_price becomes "price"
    const formatted = purchases.map((p) => ({
      ...p.toJSON(),
      PurchaseItems: p.PurchaseItems.map((pi) => ({
        ...pi.toJSON(),
        price: pi.cost_price, // alias
      })),
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================
// 📌 Update Purchase Status
// ========================
app.put("/updatePurchaseStatus", async (req, res) => {
  const { id, payment_status } = req.body;
  try {
    const purchase = await Purchase.findByPk(id);
    if (!purchase)
      return res.status(404).json({ message: "Purchase not found" });

    if (purchase.payment_status === payment_status)
      return res.json({ message: "Status unchanged", purchase });

    await purchase.update({ payment_status });
    res.json({ message: "Purchase status updated", purchase });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ========================
// 📌 Delete Purchase
// ========================
app.delete("/delPurchase/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findByPk(req.params.id);
    if (purchase) await purchase.destroy();
    res.status(200).json({ message: "Purchase deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/getSalesSummary", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Please provide from and to dates" });
    }

    // Fetch invoices with items within date range
    const invoices = await Invoice.findAll({
      where: {
        invoice_date: {
          [Op.between]: [new Date(from), new Date(to + " 23:59:59")],
        },
      },
      include: [{ model: InvoiceItem }],
    });

    // ---- Calculate Totals ----
    let totalQty = 0,
      grossAmount = 0,
      totalTax = 0;

    invoices.forEach((inv) => {
      inv.InvoiceItems.forEach((item) => {
        const qty = Number(item.quantity) - Number(item.return_qty || 0);
        totalQty += qty;
        grossAmount += qty * Number(item.price);

        // if tax_percent logic is implemented
        if (item.tax_percent) {
          totalTax +=
            qty * Number(item.price) * (Number(item.tax_percent) / 100);
        }
      });
    });

    // discount not implemented → force 0
    const totalDiscount = 0;

    const netAmount = grossAmount - totalDiscount + totalTax;

    res.json({
      summary: {
        totalInvoices: invoices.length,
        totalQty,
        grossAmount,
        totalDiscount,
        totalTax,
        netAmount,
      },
    });
  } catch (err) {
    console.error("Error in /getSalesSummary", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/getInvoiceReports", async (req, res) => {
  console.log(req.query);
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Please provide from and to dates" });
    }

    // ✅ Fetch invoices with related customer, items, and product
    const invoices = await Invoice.findAll({
      where: {
        invoice_date: {
          [Op.between]: [new Date(from), new Date(to + " 23:59:59")],
        },
      },
      include: [
        { model: Customer, attributes: ["name"] },
        {
          model: InvoiceItem,
          include: [{ model: Product, attributes: ["name"] }],
        },
      ],
      order: [["invoice_date", "ASC"]],
    });

    // ✅ Transform into desired response
    const result = invoices.map((inv) => ({
      invoiceNo: inv.id, // or use your own invoice_no column if exists
      date: inv.invoice_date,
      customer: inv.Customer ? inv.Customer.name : "Cash",
      paymentMode: inv.payment_method,
      salesperson: inv.cashier_name || "N/A",
      items: inv.InvoiceItems.map((item) => {
        const qty = Number(item.quantity) - Number(item.return_qty || 0);
        return {
          name: item.Product ? item.Product.name : "Unknown Product",
          qty: qty,
          rate: Number(item.price),
          discount: 0, // ✅ static for now
          tax: item.tax_percent ? Number(item.tax_percent) : 0,
        };
      }),
    }));
    console.log(result);
    res.json(result);
  } catch (err) {
    console.error("❌ Error in /getInvoiceReports", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/getDailyPurchaseSummary", async (req, res) => {
  try {
    const purchases = await Purchase.findAll({
      attributes: [
        [Sequelize.fn("DATE", Sequelize.col("purchase_date")), "date"],
        [Sequelize.fn("SUM", Sequelize.col("total_amount")), "total"],
        [Sequelize.fn("SUM", Sequelize.col("paid_amount")), "paid"],
      ],
      group: [Sequelize.fn("DATE", Sequelize.col("purchase_date"))],
      order: [[Sequelize.fn("DATE", Sequelize.col("purchase_date")), "ASC"]],
      raw: true,
    });

    // 🟢 Add pending = total - paid
    const formatted = purchases.map((p) => ({
      date: p.date,
      total: parseFloat(p.total || 0),
      paid: parseFloat(p.paid || 0),
      pending: parseFloat(p.total || 0) - parseFloat(p.paid || 0),
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//User
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    // Update last login
    user.last_login = new Date();
    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        last_login: user.last_login,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ========================
// 📌 Add User
// ========================
app.post("/addusers", async (req, res) => {
  const { username, full_name, password, role, email, createdBy } = req.body;
  try {
    const createdbyUser = await User.findOne({
      where: { username: createdBy },
    });
    if (!createdbyUser) {
      return res
        .status(400)
        .json({ success: false, message: "No Created By user exist" });
    }
    // Check if username already exists
    const exists = await User.findOne({ where: { username } });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await User.create({
      username,
      full_name,
      password: hashedPassword,
      role,
      email,
      created_at: createdbyUser.id,
    });

    // Exclude password from response
    const { password: _, ...userData } = user.toJSON();

    res.status(201).json({ success: true, user: userData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// ========================
// 📌 Get All Users
// ========================
app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "username",
        "full_name",
        "email",
        "role",
        "last_login",
        "status",
      ],
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Delete user
app.delete("/users/:username", async (req, res) => {
  const { username } = req.params;
  try {
    // Prevent deleting self (optional check if needed on backend)
    if (req.user && req.user.username === username) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete yourself" });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await User.destroy({ where: { username } });
    res.json({
      success: true,
      message: `User "${username}" deleted successfully`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ========================
// 📌 Update User
// ========================
app.put("users/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, password, role } = req.body;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (full_name) user.full_name = full_name;
    if (role) user.role = role;

    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================
// 📌 Delete User
// ========================
app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid username" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    await user.update({ last_login: new Date(), status: "Active" });

    // remove password before sending
    const { password: _, ...userData } = user.toJSON();

    // ✅ create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role }, // payload
      process.env.JWT_SECRET || "your_secret_key", // secret key
      { expiresIn: "6h" } // token expiry
    );

    res.json({
      success: true,
      user: userData,
      token, // return token to frontend
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
app.post("/logout", async (req, res) => {
  const { userId } = req.body;
  try {
    await User.update({ status: "Inactive" }, { where: { id: userId } });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

app.get("/getUnits", async (req, res) => {
  try {
    const units = await Unit.findAll({ order: [["id", "ASC"]] });
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new unit
app.post("/addUnits", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Unit name is required" });

  try {
    const [unit, created] = await Unit.findOrCreate({ where: { name } });
    if (!created) return res.status(400).json({ error: "Unit already exists" });
    res.json(unit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete unit
app.delete("/delUnits/:id", async (req, res) => {
  try {
    const deleted = await Unit.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ error: "Unit not found" });
    res.json({ message: "Unit deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/verifyPassword", async (req, res) => {
  try {
    const { username, role, oldPassword } = req.body;

    const user = await User.findOne({
      where: { username, role },
    });

    if (!user) return res.json({ valid: false });

    // Compare hashed password
    const match = await bcrypt.compare(oldPassword, user.password);

    res.json({ valid: match });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/changePassword", async (req, res) => {
  try {
    const { username, role, newPassword } = req.body;

    const user = await User.findOne({ where: { username, role } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: "Password changed successfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message }); // use message instead of error
  }
});

app.post("/forgot-Password", async (req, res) => {
  const { username, email } = req.body;
  try {
    const user=await User.findOne({where :{username:username}})
    if(user.email !== email){
      return res.status(400).json({message:"Your Email doesn't match"})
    }
    res.json("")
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message }); // use message instead of error
  }
});

// ========================
// 🚀 Start Server
// ========================
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
