
const { connectAndSync, Product,Supplier,Category,Invoice,Customer,InvoiceItem,ShopProfile,Discount } = require('./db');
const cors = require('cors'); 
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ Connect to DB and sync tables
connectAndSync();
app.get('/', (req, res) => {
  res.send('✅ API is working!');
});
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
app.post('/addDiscount', async (req, res) => {
  console.log(req.body)
  const { productCode, type, description, startDate, endDate, amount, status } = req.body;
console.log(req.body)
  try {
    const product = await Product.findOne({ where: { code: productCode } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (amount > product.sale_price) {
  return res.status(400).json({ message: "Discount cannot be greater than product sale price" });
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
    res.status(500).json({ message: "internal server error" });
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
      attributes: ['name', 'code']  // Only send required fields
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "internal server error" });
  } // ✅ close catch block
}); // ✅ close the app.get function
    
app.get('/getProducts', async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Supplier,
          attributes: ['id', 'supplier_name'], // only needed fields
        },
        {
          model: Category,
          attributes: ['id', 'name'], // only needed fields
        }
      ]
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/delProduct/:code',async(req,res)=>{
  try{
    const result=await Product.findOne({where:{code:req.params.code}})
    if(!result){return res.status(404).json({message:"Product dont exist"})}
    await result.destroy()
    res.json({message:`Product ${result.code} has been deleted`})
  }catch(error){
    res.status(500).json({message:error.message})
  }
})
app.put('/updateProduct', async (req, res) => {
  try {
    if (!req.body || !req.body.code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const { code } = req.body;
    console.log("Updating product with code:", code);

    const result = await Product.findOne({ where: { code } });
    if (!result) {
      return res.status(404).json({ message: "Product does not exist" });
    }

    await result.update(req.body);

    return res.json({ message: "Product is updated", updated: result });
  } catch (error) {
    console.error(error); // 👈 log real error
    return res.status(500).json({ message: error.message || "Server error" });
  }
});

//supplier
app.post('/addSupplier', async (req, res) => {
  const { supplier_name } = req.body;
  console.log(req.body);
  try {
    const supplier = await Supplier.findOne({ where: { supplier_name } });
    if (supplier) {
      return res.status(404).json({ message: "Supplier Name already exists" });
    }
    const result = await Supplier.create(req.body);
    // Send a message along with data
    res.status(201).json({ message: "Supplier added successfully"});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/getSupplier', async (req, res) => {
  try {
    const result = await Supplier.findAll({
      attributes: [
        'id',
        'supplier_name',
        'contact_person',
        'phone',
        'email',
        'address',
        'city',
        'country',
        'tax_number',
        'payment_terms',
        'bank_details',
        'credit_limit',
        'status'
      ]
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put('/editSupplier', async (req, res) => {
  const { id, supplier_name } = req.body;
  try {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier does not exist" });
    }

    // Check if another supplier already has this name
    const existingSupplier = await Supplier.findOne({ 
      where: { supplier_name }
    });

    if (existingSupplier && existingSupplier.id !== supplier.id) {
      return res.status(400).json({ message: "Supplier name already exists" });
    }

    // Update supplier
    await supplier.update(req.body);

    res.status(201).json({ message: "Supplier updated successfully", supplier });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete('/delSupplier/:id',async(req,res)=>{
  try{
    const supplier=await Supplier.findByPk(req.params.id)
    if(supplier){
      await supplier.destroy()
    }
    res.status(200).json({ message: "Supplier deleted successfully" });
  }catch(error){
    res.status(500).json({ message: error.message });
  }
})


//Categories
app.post('/addCategory',async(req,res)=>{
  const {name}=req.body
  try{
    const category=await Category.findOne({where:{name}})
    if(category){return res.status(400).json({ message: "Category with this name already exists" });}
    await Category.create(req.body)
    res.json({ message: "Category added successfully"});
  }catch(error){
    res.status(500).json({ message: error.message });
  }
})

app.get('/getCategory', async (req, res) => {
  try {
    const result = await Category.findAll({
      attributes: [
        'id',
        'name',
        'description'
      ]
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.put('/editCategory', async (req, res) => {
  const { id,name } = req.body;
  try {
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: "Category does not exist" });
    }

    const existingCategory = await Category.findOne({ 
      where: { name }
    });

    if (existingCategory && existingCategory.id !== category.id) {
      return res.status(400).json({ message: "Category name already exists" });
    }

    await category.update(req.body);

    res.status(201).json({ message: "Category updated successfully", category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
app.delete('/delSupplier/:id',async(req,res)=>{
  try{
    const category=await Category.findByPk(req.params.id)
    if(category){
      await category.destroy()
    }
    res.status(200).json({ message: "Category deleted successfully" });
  }catch(error){
    res.status(500).json({ message: error.message });
  }
})
app.get('/getCategoryNsuppliers', async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: 
        ['id','name']
    });
    const suppliers = await Supplier.findAll({
      attributes: 
        ['id','supplier_name']
    });
    res.json({categories,suppliers});
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
    res.status(500).json({ message: error.message });
  }
});

app.get('/getInvoiceNo', async (req, res) => {
  try {
    const lastInvoice = await Invoice.findOne({
      attributes: ['id'],      
      order: [['id', 'DESC']]
    });
    if (!lastInvoice) {
      return res.json({id:'-1'})
    }
    res.json({ id: lastInvoice.id });
  } catch (error) {
    console.error("Error fetching last invoice:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//ShopProfile
// GET existing shop profile
app.get("/getProfile", async (req, res) => {
  try {
    const profile = await ShopProfile.findOne(); 
    if (!profile) return res.json(null);
    res.json({
      shopName: profile.shop_name,
      number1: profile.number1,
      number2: profile.number2,
      location: profile.location,
      description: profile.description
    });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST create or update shop profile
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
      // Create new profile
      profile = await ShopProfile.create({
        shop_name: shopName,
        number1,
        number2,
        location,
        description
      });
    }

    res.json({ success: true, message: "Shop profile saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get('/getproductdetail/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ where: { code: req.params.barcode } });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      code: product.code,
      name: product.name,
      sale_price: product.sale_price
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.put('/editDiscountStatus', async (req, res) => {
  const { id, newStatus } = req.body;
  console.log({id ,newStatus})

  try {
    const discount = await Discount.findByPk(id);
    console.log(discount.status)

    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    if (discount.status === newStatus) {
      return res.json({ message: "Status unchanged" });
    }

    await discount.update({ status: newStatus });

    res.json({ message: "Discount status updated", discount });
  } catch (err) {
    console.error("Error updating discount status:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
