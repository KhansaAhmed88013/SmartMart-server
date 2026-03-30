const { sequelize, Purchase, PurchaseItem, Product, Supplier, recordLedger } = require("../../db");

async function addPurchase(payload) {
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
    } = payload;

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
      if (!product) {
        throw new Error(`Product ${it.product_id} not found`);
      }
      if (Number(it.sale_price) <= 0) {
        throw new Error("Sale price must be positive");
      }

      const oldCost = parseFloat(product.cost_price) || 0;
      const currentStock = parseFloat(product.qty) || 0;
      const purchasedQty = Number(it.quantity) || 0;
      const purchaseCost = parseFloat(it.cost_price) || 0;

      const denominator = currentStock + purchasedQty;
      const newWeightedCost =
        denominator === 0
          ? purchaseCost
          : (currentStock * oldCost + purchasedQty * purchaseCost) / denominator;

      const roundedCost = Math.round(newWeightedCost * 100) / 100;

      product.cost_price = roundedCost;
      product.sale_price = Number(it.sale_price);
      await product.save({ transaction: t });

      console.log({
        currentStock,
        purchasedQty,
        oldCost,
        purchaseCost,
        newWeightedCost,
        roundedCost,
      });

      await PurchaseItem.create(
        {
          cost_price: it.cost_price,
          sale_price: it.sale_price,
          quantity: it.quantity,
          purchase_id: purchase.id,
          product_id: it.product_id,
        },
        { transaction: t }
      );

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
    return { status: 200, body: { message: "Purchase created" } };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getPurchase() {
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

  return purchases.map((p) => ({
    ...p.toJSON(),
    PurchaseItems: p.PurchaseItems.map((pi) => ({
      ...pi.toJSON(),
      price: pi.cost_price,
    })),
  }));
}

async function updatePurchaseStatus(payload) {
  const { id, payment_status } = payload;

  const purchase = await Purchase.findByPk(id);
  if (!purchase) {
    return { status: 404, body: { message: "Purchase not found" } };
  }

  if (purchase.payment_status === payment_status) {
    return { status: 200, body: { message: "Status unchanged", purchase } };
  }

  await purchase.update({ payment_status });
  return { status: 200, body: { message: "Purchase status updated", purchase } };
}

async function deletePurchase(id) {
  const purchase = await Purchase.findByPk(id);
  if (purchase) {
    await purchase.destroy();
  }

  return { status: 200, body: { message: "Purchase deleted successfully" } };
}

module.exports = {
  addPurchase,
  getPurchase,
  updatePurchaseStatus,
  deletePurchase,
};
