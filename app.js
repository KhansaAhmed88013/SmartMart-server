const { connectAndSync } = require("./db");

const cors = require("cors");
const express = require("express");
require("dotenv").config();
const mvcRoutes = require("./src/routes");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ========================
// ✅ Connect to DB and sync tables
// ========================
connectAndSync();
app.use(mvcRoutes);
app.get("/", (req, res) => {
  console.log(process.env.MY_EMAIL);
});

// ========================
// 🚀 Start Server
// ========================
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
