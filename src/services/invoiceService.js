const { sequelize, Invoice, InvoiceItem, Product, recordLedger } = require("../../db");

async function addInvoice(payload) {
  const t = await sequelize.transaction();
  try {
    const { invoice, items } = payload;
    const invoiceAdded = await Invoice.create(invoice, { transaction: t });

    for (const it of items) {
      const product = await Product.findOne({
        where: { code: it.product_code },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!product) {
        throw new Error(`Product not found for code: ${it.product_code}`);
      }

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
    return {
      status: 200,
      body: {
        message: "Invoice created successfully",
        invoice_id: invoiceAdded.id,
      },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function getInvoiceNo() {
  const lastInvoice = await Invoice.findOne({
    attributes: ["id"],
    order: [["id", "DESC"]],
  });

  return { id: lastInvoice ? lastInvoice.id : "-1" };
}

async function getCustomerBillingRecord(customerId) {
  return Invoice.findAll({
    where: { customer_id: customerId },
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
}

module.exports = {
  addInvoice,
  getInvoiceNo,
  getCustomerBillingRecord,
};
