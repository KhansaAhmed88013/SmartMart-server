const express = require("express");
const authRoutes = require("./authRoutes");
const categoryRoutes = require("./categoryRoutes");
const customerRoutes = require("./customerRoutes");
const discountRoutes = require("./discountRoutes");
const invoiceRoutes = require("./invoiceRoutes");
const miscRoutes = require("./miscRoutes");
const notificationRoutes = require("./notificationRoutes");
const productRoutes = require("./productRoutes");
const purchaseRoutes = require("./purchaseRoutes");
const reportRoutes = require("./reportRoutes");
const shopRoutes = require("./shopRoutes");
const supplierRoutes = require("./supplierRoutes");
const unitRoutes = require("./unitRoutes");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.use(authRoutes);
router.use(categoryRoutes);
router.use(customerRoutes);
router.use(discountRoutes);
router.use(invoiceRoutes);
router.use(miscRoutes);
router.use(notificationRoutes);
router.use(productRoutes);
router.use(purchaseRoutes);
router.use(reportRoutes);
router.use(shopRoutes);
router.use(supplierRoutes);
router.use(unitRoutes);
router.use(userRoutes);

module.exports = router;
