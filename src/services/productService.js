const {
  sequelize,
  Product,
  Supplier,
  Category,
  Unit,
  ItemsDiscount,
  BillDiscount,
  CategoryDiscount,
  recordLedger,
  getLastBalance,
} = require("../../db");
const { Op } = require("sequelize");

async function addProducts(payload) {
  const t = await sequelize.transaction();
  try {
    const list = Array.isArray(payload) ? payload : [payload];
    const created = [];

    for (const prod of list) {
      const exists = await Product.findOne({
        where: { code: prod.code },
        transaction: t,
      });
      if (exists) {
        await t.rollback();
        return {
          status: 400,
          body: { message: `Code '${prod.code}' already exists` },
        };
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
    return {
      status: 200,
      body: { message: "Products added successfully", products: created },
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function getProductsBasic() {
  return Product.findAll({ attributes: ["name", "code"] });
}

async function getProducts() {
  return Product.findAll({
    include: [
      { model: Supplier, attributes: ["id", "supplier_name"] },
      { model: Category, attributes: ["id", "name"] },
      { model: Unit, as: "unitDetails", attributes: ["id", "name"] },
    ],
  });
}

async function deleteProductByCode(code) {
  const result = await Product.findOne({ where: { code } });
  if (!result) {
    return { status: 404, body: { message: "Product does not exist" } };
  }

  await result.destroy();
  return { status: 200, body: { message: `Product ${result.code} has been deleted` } };
}

async function updateProduct(payload) {
  const t = await sequelize.transaction();
  try {
    const { code, qty, ...otherFields } = payload;
    if (!code) {
      await t.rollback();
      return { status: 400, body: { message: "Product code is required" } };
    }

    const product = await Product.findOne({
      where: { code },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!product) {
      await t.rollback();
      return { status: 404, body: { message: "Product not found" } };
    }

    if (typeof qty !== "undefined" && qty !== null) {
      const prevBalance = await getLastBalance(product.id, t);
      const diff = Number(qty) - prevBalance;

      if (diff < 0 && Math.abs(diff) > product.qty) {
        throw new Error(`Insufficient stock to reduce for ${product.name}`);
      }

      if (diff !== 0) {
        product.qty += diff;
        await product.save({ transaction: t });

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

    if (Object.keys(otherFields).length > 0) {
      await product.update(otherFields, { transaction: t });
    }

    await t.commit();
    return { status: 200, body: { message: "Product updated successfully" } };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function getProductDetail(barcode) {
  const product = await Product.findOne({ where: { code: barcode } });
  if (!product) {
    return { status: 404, body: { message: "Product not found" } };
  }

  const today = new Date();

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
    ],
  });

  const billDiscount = await BillDiscount.findOne({
    where: {
      from: { [Op.lte]: today },
      to: { [Op.gte]: today },
      status: "Active",
    },
    order: [
      ["to", "DESC"],
      ["created_at", "DESC"],
    ],
  });

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
    ],
  });

  return {
    status: 200,
    body: {
      code: product.code,
      name: product.name,
      sale_price: product.sale_price,
      itemdiscount,
      billDiscount,
      categorydiscount,
    },
  };
}

module.exports = {
  addProducts,
  getProductsBasic,
  getProducts,
  deleteProductByCode,
  updateProduct,
  getProductDetail,
};
