
const { connectAndSync, Product } = require('./db');
const cors = require('cors'); 
const express = require('express');


const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Connect to DB and sync tables
connectAndSync();

app.post('/addProduct',async(req,res)=>{
  const {code}=req.body
  try{
    const repeatedCode=await Product.findAll({where:{code}})
    if(repeatedCode){
      return res.status(404).json({message:"Code can't be same"})
    }
    const product=await Product.create(req.body)
    res.json(product)
  }catch(error){
    res.status(500).json({message:error.message})
    console.log(error
    )
  }
})
app.post('/addProducts', async (req, res) => {
  const products = Array.isArray(req.body) ? req.body : [req.body]; // ensure array
  try {
    const createdProducts = [];

    for (const prod of products) {
      // Check for duplicate code
      const repeatedCode = await Product.findOne({ where: { code: prod.code } });
      if (repeatedCode) {
        return res.status(400).json({ message: `Code '${prod.code}' already exists` });
      }

      // Create product
      const newProduct = await Product.create(prod);
      createdProducts.push(newProduct);
    }

    res.json({ message: "Products added successfully", products: createdProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
