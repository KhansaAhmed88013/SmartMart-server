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
  Notification,
  User,
  Unit,
  BillDiscount,
} = require("./db");

const cors = require("cors");
const bcrypt = require("bcrypt");
const express = require("express");
const { Sequelize, Op, where } = require("sequelize");
const nodemailer = require("nodemailer");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========================
// ✅ Connect to DB and sync tables
// ========================
connectAndSync();
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
app.post("/addCustomer", async (req, res) => {
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
      balance: balance || 0.0, // اگر نہ دیں تو default 0 ہوگا
    });

    res.status(201).json({
      message: "Customer added successfully",
      customer: newCustomer,
    });
  } catch (error) {
    console.error("Error adding customer:", error);
    res.status(500).json({ message: error.message });
  }
});
// 📌 Get all customers
app.get("/getCustomers", async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 📌 Delete Customer
app.delete("/delCustomer/:id", async (req, res) => {
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
app.put("/updateCustomer", async (req, res) => {
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
      balance: balance !== undefined ? balance : customer.balance,
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
          cost_price: product.cost_price,
          total_amount: it.net_total,
          total_discount: it.total_discount,
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

app.get("/getCustomerBillingRecord/:id", async (req, res) => {
  try {
    const records = await Invoice.findAll({
      where: { customer_id: req.params.id },
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
    });
    res.json(records);
  } catch (error) {
    console.error("Error getting customer invoice:", error);
    res.status(500).json({ message: error.message });
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
// 📌 Daily Sales Report
// ========================

app.get("/DailySalesReport", async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      include: [
        { model: InvoiceItem, as: "InvoiceItems" },
        { model: User, as: "creator", attributes: ["id", "username"] },
      ],
      order: [["invoice_date", "ASC"]],
    });

    // ✅ Group by date + cashier
    const grouped = {};

    invoices.forEach((inv) => {
      const dateKey = new Date(inv.invoice_date).toISOString().split("T")[0];
      const cashier = inv.creator ? inv.creator.username : "Unknown";
      const groupKey = `${dateKey}-${cashier}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          invoiceDate: dateKey,
          cashierName: cashier,
          total: 0,
          discItems: 0,
          taxItems: 0,
          netTotal: 0,
          discTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          profit: 0,
        };
      }

      let total = 0;
      let discItems = 0;
      let taxItems = 0;
      let profit = 0;

      inv.InvoiceItems.forEach((it) => {
        const lineTotal = parseFloat(it.price) * parseFloat(it.quantity);
        const lineDisc = parseFloat(it.total_discount || 0);
        const lineTax =
          ((lineTotal - lineDisc) * parseFloat(it.tax_percent || 0)) / 100;

        total += lineTotal;
        discItems += lineDisc;
        taxItems += lineTax;

        profit +=
          (parseFloat(it.price) - parseFloat(it.cost_price || 0)) *
            parseFloat(it.quantity) -
          lineDisc;
      });

      const netTotal = total - discItems + taxItems;
      const discTotal = parseFloat(inv.discount || 0);
      const taxTotal =
        ((netTotal - discTotal) * (parseFloat(inv.tax_percent) || 0)) / 100;
      const grandTotal = parseFloat(inv.final_total || 0);

      // ✅ Add this invoice’s values to cashier-day totals
      grouped[groupKey].total += total;
      grouped[groupKey].discItems += discItems;
      grouped[groupKey].taxItems += taxItems;
      grouped[groupKey].netTotal += netTotal;
      grouped[groupKey].discTotal += discTotal;
      grouped[groupKey].taxTotal += taxTotal;
      grouped[groupKey].grandTotal += grandTotal;
      grouped[groupKey].profit += profit;
    });

    // ✅ Reformat: array per date → inside, array of cashier summaries
    const result = {};
    Object.values(grouped).forEach((rec) => {
      if (!result[rec.invoiceDate]) result[rec.invoiceDate] = [];
      result[rec.invoiceDate].push(rec);
    });

    // ✅ Add daily totals row
    const final = Object.keys(result).map((date) => {
      const dayData = result[date];
      const dailyTotal = dayData.reduce(
        (acc, cur) => {
          acc.total += cur.total;
          acc.discItems += cur.discItems;
          acc.taxItems += cur.taxItems;
          acc.netTotal += cur.netTotal;
          acc.discTotal += cur.discTotal;
          acc.taxTotal += cur.taxTotal;
          acc.grandTotal += cur.grandTotal;
          acc.profit += cur.profit;
          return acc;
        },
        {
          invoiceDate: date,
          cashierName: "Daily Total",
          total: 0,
          discItems: 0,
          taxItems: 0,
          netTotal: 0,
          discTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          profit: 0,
        }
      );

      dayData.push(dailyTotal); // append total row
      return dayData;
    });

    res.json(final);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
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
    // Fetch invoices with items and creator info
    const report = await Invoice.findAll({
      attributes: ["id", "invoice_date", "discount", "tax_percent"],
      include: [
        {
          model: InvoiceItem,
          attributes: [
            "price",
            "quantity",
            "return_qty",
            "cost_price",
            "tax_percent",
            "total_amount",
            "total_discount",
          ],
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "username"],
          required: false, // important: include invoices even if creator is null
        },
      ],
      order: [["invoice_date", "DESC"]],
    });

    // Format the report
    const formatted = report.map((inv) => {
      let gross = 0;
      let itemDiscount = 0;
      let itemTax = 0;
      let itemNet = 0;
      let costPriceTotal = 0;
      let totalQty = 0;

      inv.InvoiceItems.forEach((item) => {
        const qty = Number(item.quantity) - Number(item.return_qty || 0);
        totalQty += qty;

        const grossItem = qty * Number(item.price);
        gross += grossItem;

        itemDiscount += Number(item.total_discount || 0);
        costPriceTotal += qty * Number(item.cost_price || 0);

        // Item-level tax
        if (item.tax_percent) {
          itemTax +=
            (grossItem - Number(item.total_discount || 0)) *
            (Number(item.tax_percent) / 100);
        }

        itemNet += Number(item.total_amount || 0);
      });

      // Invoice-level discount and tax
      const invoiceDiscount = Number(inv.discount || 0);
      const afterDiscount = itemNet - invoiceDiscount;
      const invoiceTax = afterDiscount * (Number(inv.tax_percent || 0) / 100);
      const finalTotal = afterDiscount + invoiceTax;

      const profit = gross - costPriceTotal;

      return {
        invoice_no: inv.id,
        invoice_date: inv.invoice_date,
        cashier_name: inv.creator ? inv.creator.username : "N/A", // safe check
        totalQty,
        gross: gross.toFixed(2),
        itemDiscount: itemDiscount.toFixed(2),
        invoiceDiscount: invoiceDiscount.toFixed(2),
        totalDiscount: (itemDiscount + invoiceDiscount).toFixed(2),
        itemTax: itemTax.toFixed(2),
        invoiceTax: invoiceTax.toFixed(2),
        totalTax: (itemTax + invoiceTax).toFixed(2),
        costPrice: costPriceTotal.toFixed(2),
        net_total: finalTotal.toFixed(2),
        profit: profit.toFixed(2),
      };
    });

    // Fetch all users for filtering/display purposes
    const users = await User.findAll({
      attributes: ["id", "username"],
    });

    res.json({ formatted, users });
  } catch (err) {
    console.error("Error in /getSalesReport", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/getOTsalesReport", async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      attributes: [
        "id",
        "invoice_date",
        "payment_method",
        "final_total",
        "paid_amount",
      ],
      include: { model: Customer, attributes: ["id", "name"] },
    });
    res.json(invoices);
  } catch (err) {
    console.error("Error in /getSalesReport", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/getCashierSalesReport", async (req, res) => {
  try {
    const { username, role } = req.query;

    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }

    const userWhere = { username };
    if (role) userWhere.role = role; // optional filter

    const invoices = await Invoice.findAll({
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
          model: User,
          as: "creator", // association alias
          attributes: ["username", "role"],
          where: userWhere, // safe filter
        },
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
app.get("/getCashierDashboardReport", async (req, res) => {
  try {
    const { username, role } = req.query;

    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }

    const userWhere = { username };
    if (role) userWhere.role = role; // optional filter

    const invoices = await Invoice.count({
      include: [
        {
          model: User,
          as: "creator", // association alias
          attributes: ["username", "role"],
          where: userWhere, // safe filter
        },
      ],
    });
    res.json({ count: invoices });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
// ========================
// 📌 Stock Report
// ========================
app.get("/getStockReport", async (req, res) => {
  try {
    // ✅ Fetch products with category + unit
    const products = await Product.findAll({
      attributes: ["id", "name", "cost_price"],
      include: [
        { model: Category, attributes: ["name"] },
        { model: Unit, as: "unitDetails", attributes: ["name"] },
      ],
      raw: true,
      nest: true,
    });

    // ✅ Fetch full ledger data (need remarks to differentiate)
    const ledgers = await StockLedger.findAll({
      attributes: ["product_id", "qty_in", "qty_out", "balance", "remarks"],
      raw: true,
    });

    // Group ledgers by product
    const ledgerMap = {};
    ledgers.forEach((l) => {
      if (!ledgerMap[l.product_id]) {
        ledgerMap[l.product_id] = {
          opening: 0,
          purchases: 0,
          sales: 0,
          closing: 0,
        };
      }

      // Opening stock if remarks match
      if (l.remarks && l.remarks.startsWith("Opening stock for")) {
        ledgerMap[l.product_id].opening += parseFloat(l.qty_in || 0);
      }

      // Purchases only when remark starts with "Purchase ID"
      if (l.remarks && l.remarks.startsWith("Purchase ID")) {
        ledgerMap[l.product_id].purchases += parseFloat(l.qty_in || 0);
      }

      // Sales are always qty_out
      ledgerMap[l.product_id].sales += parseFloat(l.qty_out || 0);

      // Closing stock = latest balance (overwrite each loop, last will remain)
      ledgerMap[l.product_id].closing = parseFloat(l.balance || 0);
    });

    // ✅ Build report
    const report = products.map((p) => {
      const ledger = ledgerMap[p.id] || {
        opening: 0,
        purchases: 0,
        sales: 0,
        closing: 0,
      };

      return {
        id: p.id,
        name: p.name,
        unit: p.unitDetails?.name || "-",
        Category: p.Category?.name || "-",
        cost_price: parseFloat(p.cost_price),

        opening_stock: ledger.opening,
        opening_stock_value: ledger.opening * parseFloat(p.cost_price),

        purchases: ledger.purchases,
        purchase_value: ledger.purchases * parseFloat(p.cost_price),

        sales: ledger.sales,
        sales_value: ledger.sales * parseFloat(p.cost_price),

        closing_stock: ledger.closing,
        closing_stock_value: ledger.closing * parseFloat(p.cost_price),
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

app.get("/getCustomerSalesReport", async (req, res) => {
  try {
    const customers = await Customer.findAll({ raw: true });

    const record = await Promise.all(
      customers.map(async (customer) => {
        const invoices = await Invoice.findAll({
          where: { customer_id: customer.id },
          raw: true,
        });

        let purchase_amount = 0;
        let paid_amount = 0;

        invoices.forEach((invoice) => {
          purchase_amount += Number(invoice.final_total || 0);
          paid_amount += Number(invoice.paid_amount || 0);
        });

        const pendingAmount = purchase_amount - paid_amount;

        return {
          ...customer,
          purchase_amount,
          pendingAmount,
          status: pendingAmount > 0 ? "Pending" : "Clear", // ✅ added here
        };
      })
    );

    res.json(record);
  } catch (error) {
    console.error("Error in /getCustomerSalesReport:", error);
    res.status(500).json({ message: error.message });
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

      // inside your for loop, before computing newWeightedCost:
      const oldCost = parseFloat(product.cost_price) || 0;
      const currentStock = parseFloat(product.qty) || 0;
      const purchasedQty = Number(it.quantity) || 0;
      const purchaseCost = parseFloat(it.cost_price) || 0;

      // compute safely
      const denominator = currentStock + purchasedQty;
      const newWeightedCost =
        denominator === 0
          ? purchaseCost
          : (currentStock * oldCost + purchasedQty * purchaseCost) /
            denominator;

      // round if you want (2 decimals)
      const roundedCost = Math.round(newWeightedCost * 100) / 100;

      product.cost_price = roundedCost;
      product.sale_price = Number(it.sale_price); // keep this
      await product.save({ transaction: t });

      console.log({
        currentStock,
        purchasedQty,
        oldCost,
        purchaseCost,
        newWeightedCost,
        roundedCost,
      });

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

    let totalQty = 0,
      grossAmount = 0,
      totalDiscount = 0,
      totalTax = 0,
      netAmount = 0;
    final_total = 0;

    invoices.forEach((inv) => {
      let invoiceGross = 0;
      let invoiceItemAmount = 0;
      let invoiceDiscount = 0;
      let invoiceTax = 0;

      inv.InvoiceItems.forEach((item) => {
        const qty = Number(item.quantity) - Number(item.return_qty || 0);
        totalQty += qty;

        const gross = qty * Number(item.price);
        invoiceGross += gross;

        invoiceItemAmount += Number(item.total_amount);
        invoiceDiscount += Number(item.total_discount || 0);

        if (item.tax_percent) {
          invoiceTax +=
            (gross - Number(item.total_discount || 0)) *
            (Number(item.tax_percent) / 100);
        }
      });

      // Apply invoice-level discount and tax on *sum of items after discount/tax*
      invoiceDiscount += Number(inv.discount || 0);

      const afterDiscount = invoiceItemAmount - Number(inv.discount || 0);
      invoiceTax += afterDiscount * (Number(inv.tax_percent || 0) / 100);

      const invoiceNet = afterDiscount + invoiceTax;

      // accumulate global totals
      grossAmount += invoiceGross;
      totalDiscount += invoiceDiscount;
      totalTax += invoiceTax;
      netAmount += invoiceNet;
      final_total += Number(inv.final_total);
    });

    res.json({
      summary: {
        totalInvoices: invoices.length,
        totalQty,
        grossAmount,
        totalDiscount,
        totalTax,
        netAmount,
        final_total,
      },
    });
  } catch (err) {
    console.error("Error in /getSalesSummary", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/getInvoiceReports", async (req, res) => {
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
        { model: Customer, attributes: ["id", "name"] },
        { model: User, as: "creator", attributes: ["username"] },
        {
          model: InvoiceItem,
          include: [{ model: Product, attributes: ["name"] }],
        },
      ],
      order: [["invoice_date", "ASC"]],
    });

    res.json(invoices);
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
        "supplier_id",
        [Sequelize.fn("SUM", Sequelize.col("total_amount")), "total"],
        [Sequelize.fn("SUM", Sequelize.col("paid_amount")), "paid"],
      ],
      include: [
        {
          model: Supplier,
          as: "supplier",
          attributes: ["id", "supplier_name"],
        },
      ],
      group: [
        Sequelize.fn("DATE", Sequelize.col("purchase_date")),
        "supplier_id",
        "supplier.id",
      ],
      order: [
        [Sequelize.fn("DATE", Sequelize.col("purchase_date")), "ASC"],
        ["supplier_id", "ASC"],
      ],
      raw: true,
      nest: true,
    });

    // 🟢 Format by date
    const grouped = {};
    purchases.forEach((p) => {
      if (!grouped[p.date]) {
        grouped[p.date] = { suppliers: [], total: 0, paid: 0, pending: 0 };
      }

      const supplierRow = {
        supplier_id: p.supplier_id,
        supplier_name: p.supplier?.supplier_name || "Unknown",
        total: parseFloat(p.total || 0),
        paid: parseFloat(p.paid || 0),
        pending: parseFloat(p.total || 0) - parseFloat(p.paid || 0),
      };

      grouped[p.date].suppliers.push(supplierRow);

      // accumulate daily totals
      grouped[p.date].total += supplierRow.total;
      grouped[p.date].paid += supplierRow.paid;
      grouped[p.date].pending += supplierRow.pending;
    });

    // convert to array format
    const formatted = Object.entries(grouped).map(([date, data]) => ({
      date,
      suppliers: data.suppliers,
      total: data.total,
      paid: data.paid,
      pending: data.pending,
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
    
    if (user.role === "Cashier") {
      await Notification.create({
        type: "Create User",
        message: `${
          user.full_name
        } logged in at ${new Date().toLocaleString()}`,
        user_id: user.id,
      });
    }
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
  const { username, password, rememberMe } = req.body; // <-- get rememberMe
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

    // Add notification if cashier logs in
    if (user.role === "Cashier") {
      await Notification.create({
        type: "login",
        message: `${
          user.full_name
        } logged in at ${new Date().toLocaleString()}`,
        user_id: user.id,
      });
    }

    // remove password before sending
    const { password: _, ...userData } = user.toJSON();

    // Determine token expiry based on rememberMe
    const tokenExpiry = rememberMe ? "6d" : "6h";
    // create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role }, // payload
      process.env.JWT_SECRET || "your_secret_key", // secret key
      { expiresIn: tokenExpiry } // token expiry
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
app.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { is_read: false },
      include: [{ model: User, attributes: ["username", "role"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
// Mark notifications as read
app.post("/clearNotifications", async (req, res) => {
  try {
    const { ids } = req.body; // array of notification IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No notification IDs provided" });
    }

    // Update all matching notifications
    await Notification.update(
      { is_read: true }, // set is_read to true
      {
        where: { id: ids }, // where id is in the array
      }
    );

    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
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
app.post("/recover-Password", async (req, res) => {
  try {
    const { username, role, newPassword } = req.body;

    const user = await User.findOne({ where: { username, role } });
    if (!user) return res.status(400).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message }); // use message instead of error
  }
});

app.post("/getRecoveryEmail", async (req, res) => {
  const { username, role } = req.body;

  try {
    const user = await User.findOne({
      where: {
        username: { [Op.like]: username }, // MySQL uses LIKE
        role: { [Op.like]: role },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log(user.email);

    res.json({ email: user.email });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server Error" });
  }
});

function sendEmail({
  recipient_email,
  OTP,
  shopName,
  location,
  number1,
  number2,
}) {
  return new Promise((resolve, reject) => {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_EMAIL,
        pass: process.env.MY_PASSWORD,
      },
    });

    const mail_configs = {
      from: process.env.MY_EMAIL,
      to: recipient_email,
      subject: `${shopName} PASSWORD RECOVERY`,
      html: `<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8">
  <title>${shopName} - OTP Email Template</title>
  

</head>
<body>
<!-- partial:index.partial.html -->
<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
  <div style="margin:50px auto;width:70%;padding:20px 0">
    <div style="border-bottom:1px solid #eee">
      <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">${shopName}</a>
    </div>
    <p style="font-size:1.1em">Hi,</p>
    <p>Thank you for choosing ${shopName}. Use the following OTP to complete your Password Recovery Procedure. OTP is valid for 5 minutes</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${OTP}</h2>
    <p style="font-size:0.9em;">Regards,<br />${shopName}</p>
    <hr style="border:none;border-top:1px solid #eee" />
    <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
      <p>${shopName} Inc</p>
      <p>${number1} , ${number2}</p>
      <p>${location}</p>
    </div>
  </div>
</div>
<!-- partial -->
  
</body>
</html>`,
    };
    transporter.sendMail(mail_configs, function (error, info) {
      if (error) {
        console.log(error);
        return reject({ message: `An error has occured` });
      }
      return resolve({ message: "Email sent succesfuly" });
    });
  });
}
app.get("/", (req, res) => {
  console.log(process.env.MY_EMAIL);
});

app.post("/send_recovery_email", async (req, res) => {
  let shop = await ShopProfile.findOne();
  if (!shop) {
    shop = {
      shop_name: "POS Shopping Mart",
      location: "abc",
      number1: "03**-*******",
      number2: "03**-*******",
    };
  }
  sendEmail({
    ...req.body,
    shopName: shop.shop_name,
    location: shop.location,
    number1: shop.number1,
    number2: shop.number2,
  })
    .then((response) => res.json({ success: true, message: response.message }))
    .catch((error) =>
      res.status(500).json({ success: false, message: error.message })
    );
});

app.get("/getAdminDashboard", async (req, res) => {
  try {
    // Get all products count
    const productsCount = await Product.count();

    // Get active users count
    const usersCount = await User.count({ where: { status: "Active" } });

    // Get today's date range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); // today at 00:00:00

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); // today at 23:59:59

    // Sum final_total of invoices created today
    const totalSalesData = await Invoice.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("final_total")), "totalSales"],
      ],
      where: {
        invoice_date: {
          [Op.between]: [startOfToday, endOfToday],
        },
      },
    });

    const totalSales = totalSalesData[0].get("totalSales") || 0;

    res.json({
      totalSales: Number(totalSales).toFixed(2),
      productsCount,
      usersCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// ========================
// 🚀 Start Server
// ========================
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
