const { Sequelize, Op } = require("sequelize");
const {
  sequelize,
  Product,
  Supplier,
  Customer,
  Category,
  Invoice,
  InvoiceItem,
  Purchase,
  PurchaseItem,
  StockLedger,
  User,
  Unit,
} = require("../../db");

async function getDailySalesReport() {
  const invoices = await Invoice.findAll({
    include: [
      { model: InvoiceItem, as: "InvoiceItems" },
      { model: User, as: "creator", attributes: ["id", "username"] },
    ],
    order: [["invoice_date", "ASC"]],
  });

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
      const lineTax = ((lineTotal - lineDisc) * parseFloat(it.tax_percent || 0)) / 100;

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
    const taxTotal = ((netTotal - discTotal) * (parseFloat(inv.tax_percent) || 0)) / 100;
    const grandTotal = parseFloat(inv.final_total || 0);

    grouped[groupKey].total += total;
    grouped[groupKey].discItems += discItems;
    grouped[groupKey].taxItems += taxItems;
    grouped[groupKey].netTotal += netTotal;
    grouped[groupKey].discTotal += discTotal;
    grouped[groupKey].taxTotal += taxTotal;
    grouped[groupKey].grandTotal += grandTotal;
    grouped[groupKey].profit += profit;
  });

  const result = {};
  Object.values(grouped).forEach((rec) => {
    if (!result[rec.invoiceDate]) {
      result[rec.invoiceDate] = [];
    }
    result[rec.invoiceDate].push(rec);
  });

  return Object.keys(result).map((date) => {
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

    dayData.push(dailyTotal);
    return dayData;
  });
}

async function getSalesReport() {
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
        required: false,
      },
    ],
    order: [["invoice_date", "DESC"]],
  });

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

      if (item.tax_percent) {
        itemTax +=
          (grossItem - Number(item.total_discount || 0)) *
          (Number(item.tax_percent) / 100);
      }

      itemNet += Number(item.total_amount || 0);
    });

    const invoiceDiscount = Number(inv.discount || 0);
    const afterDiscount = itemNet - invoiceDiscount;
    const invoiceTax = afterDiscount * (Number(inv.tax_percent || 0) / 100);
    const finalTotal = afterDiscount + invoiceTax;

    const profit = gross - costPriceTotal;

    return {
      invoice_no: inv.id,
      invoice_date: inv.invoice_date,
      cashier_name: inv.creator ? inv.creator.username : "N/A",
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

  const users = await User.findAll({
    attributes: ["id", "username"],
  });

  return { formatted, users };
}

async function getOTsalesReport() {
  return Invoice.findAll({
    attributes: ["id", "invoice_date", "payment_method", "final_total", "paid_amount"],
    include: { model: Customer, attributes: ["id", "name"] },
  });
}

async function getCashierSalesReport(query) {
  const { username, role } = query;
  if (!username) {
    return { status: 400, body: { error: "username is required" } };
  }

  const userWhere = { username };
  if (role) {
    userWhere.role = role;
  }

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
        as: "creator",
        attributes: ["username", "role"],
        where: userWhere,
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

  return { status: 200, body: formatted };
}

async function getCashierDashboardReport(query) {
  const { username, role } = query;
  if (!username) {
    return { status: 400, body: { error: "username is required" } };
  }

  const userWhere = { username };
  if (role) {
    userWhere.role = role;
  }

  const invoices = await Invoice.count({
    include: [
      {
        model: User,
        as: "creator",
        attributes: ["username", "role"],
        where: userWhere,
      },
    ],
  });

  return { status: 200, body: { count: invoices } };
}

async function getStockReport() {
  const products = await Product.findAll({
    attributes: ["id", "name", "cost_price"],
    include: [
      { model: Category, attributes: ["name"] },
      { model: Unit, as: "unitDetails", attributes: ["name"] },
    ],
    raw: true,
    nest: true,
  });

  const ledgers = await StockLedger.findAll({
    attributes: ["product_id", "qty_in", "qty_out", "balance", "remarks"],
    raw: true,
  });

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

    if (l.remarks && l.remarks.startsWith("Opening stock for")) {
      ledgerMap[l.product_id].opening += parseFloat(l.qty_in || 0);
    }

    if (l.remarks && l.remarks.startsWith("Purchase ID")) {
      ledgerMap[l.product_id].purchases += parseFloat(l.qty_in || 0);
    }

    ledgerMap[l.product_id].sales += parseFloat(l.qty_out || 0);
    ledgerMap[l.product_id].closing = parseFloat(l.balance || 0);
  });

  return products.map((p) => {
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
}

async function getSupplierReport() {
  return Supplier.findAll({
    attributes: [
      "id",
      ["supplier_name", "name"],
      ["contact_person", "contactPerson"],
      "phone",
      "email",
      "address",
      "status",
      [
        sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("purchases.total_amount")), 0),
        "totalPurchases",
      ],
      [
        sequelize.fn(
          "COALESCE",
          sequelize.fn("SUM", sequelize.literal("purchases.total_amount - purchases.paid_amount")),
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
        attributes: [],
      },
    ],
    group: ["Supplier.id"],
    raw: true,
  });
}

async function getCustomerSalesReport() {
  const customers = await Customer.findAll({ raw: true });

  return Promise.all(
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
        status: pendingAmount > 0 ? "Pending" : "Clear",
      };
    })
  );
}

async function getSalesSummary(query) {
  const { from, to } = query;

  if (!from || !to) {
    return { status: 400, body: { error: "Please provide from and to dates" } };
  }

  const invoices = await Invoice.findAll({
    where: {
      invoice_date: {
        [Op.between]: [new Date(from), new Date(to + " 23:59:59")],
      },
    },
    include: [{ model: InvoiceItem }],
  });

  let totalQty = 0;
  let grossAmount = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let netAmount = 0;
  let final_total = 0;

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

    invoiceDiscount += Number(inv.discount || 0);

    const afterDiscount = invoiceItemAmount - Number(inv.discount || 0);
    invoiceTax += afterDiscount * (Number(inv.tax_percent || 0) / 100);

    const invoiceNet = afterDiscount + invoiceTax;

    grossAmount += invoiceGross;
    totalDiscount += invoiceDiscount;
    totalTax += invoiceTax;
    netAmount += invoiceNet;
    final_total += Number(inv.final_total);
  });

  return {
    status: 200,
    body: {
      summary: {
        totalInvoices: invoices.length,
        totalQty,
        grossAmount,
        totalDiscount,
        totalTax,
        netAmount,
        final_total,
      },
    },
  };
}

async function getInvoiceReports(query) {
  const { from, to } = query;

  if (!from || !to) {
    return { status: 400, body: { error: "Please provide from and to dates" } };
  }

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

  return { status: 200, body: invoices };
}

async function getDailyPurchaseSummary() {
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
    grouped[p.date].total += supplierRow.total;
    grouped[p.date].paid += supplierRow.paid;
    grouped[p.date].pending += supplierRow.pending;
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    suppliers: data.suppliers,
    total: data.total,
    paid: data.paid,
    pending: data.pending,
  }));
}

module.exports = {
  getDailySalesReport,
  getSalesReport,
  getOTsalesReport,
  getCashierSalesReport,
  getCashierDashboardReport,
  getStockReport,
  getSupplierReport,
  getCustomerSalesReport,
  getSalesSummary,
  getInvoiceReports,
  getDailyPurchaseSummary,
};
