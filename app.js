
const { connectAndSync, Product,Supplier,Category,Invoice,InvoiceItem,ShopProfile } = require('./db');
const cors = require('cors'); 
const express = require('express');


const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Connect to DB and sync tables
connectAndSync();
app.post('/addProducts', async (req, res) => {
  const products = Array.isArray(req.body) ? req.body : [req.body]; // ensure array
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
app.post('/addInvoice',async(req,res)=>{
  const {invoice,items}=req.body
  try{
    const invoiceadded=await Invoice.create(invoice)
    for(let i=0;i<items.length;++i){
      const product = await Product.findOne({ where: { code: items[i].product_code } });
  if (!product) {
    return res.status(400).json({ message: `Product code ${items[i].product_code} not found` });
  }
  await InvoiceItem.create({ ...items[i], invoice_id: invoiceadded.id, product_id: product.id });
}
    res.json("created")
  }catch(error){
    res.status(500).json({message:error.message})
  }
})

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
    console.log(profile)
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
    console.log(profile)
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
