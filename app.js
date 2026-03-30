const { connectAndSync } = require("./db");

const cors = require("cors");
const express = require("express");
require("dotenv").config();
const mvcRoutes = require("./src/routes");

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "https://smart-mart-client.vercel.app,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from non-browser clients (Postman/curl) without Origin header.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
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
