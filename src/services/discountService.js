const {
  Product,
  Category,
  ItemsDiscount,
  BillDiscount,
  CategoryDiscount,
} = require("../../db");

async function addDiscount(payload) {
  const { productCodes, type, description, startDate, endDate, amount, status } = payload;

  if (!productCodes || productCodes.length === 0) {
    return { status: 400, body: { message: "No products selected" } };
  }

  const createdDiscounts = [];

  for (let code of productCodes) {
    const product = await Product.findOne({ where: { code } });

    if (!product) {
      return { status: 404, body: { message: `Product not found: ${code}` } };
    }

    if (type === "Value") {
      const amt = parseFloat(amount);
      const salePrice = parseFloat(product.sale_price);

      if (amt > salePrice) {
        return {
          status: 400,
          body: {
            message: `Discount cannot be greater than sale price (Rs. ${salePrice}) for product ${product.code}`,
          },
        };
      }
    }

    const discount = await ItemsDiscount.create({
      type,
      description,
      startDate,
      endDate,
      amount,
      status: status || "Active",
      product_id: product.id,
    });

    createdDiscounts.push(discount);
  }

  return {
    status: 200,
    body: {
      message: "Discount(s) added successfully",
      discounts: createdDiscounts,
    },
  };
}

async function getDiscounts() {
  return ItemsDiscount.findAll({
    include: { model: Product, as: "product" },
  });
}

async function editDiscount(payload) {
  const { id, amount, type } = payload;

  const discount = await ItemsDiscount.findByPk(id);
  if (!discount) {
    return { status: 404, body: { message: "Discount not found" } };
  }

  const productData = payload.product || (await Product.findByPk(discount.product_id));
  if (!productData) {
    return { status: 404, body: { message: "Product not found" } };
  }

  if (type === "Value") {
    const amt = parseFloat(amount);
    const salePrice = parseFloat(productData.sale_price);

    if (amt > salePrice) {
      return {
        status: 400,
        body: {
          message: `Discount cannot be greater than sale price (Rs. ${salePrice}) for product ${productData.code}`,
        },
      };
    }
  }

  await discount.update(payload);

  return {
    status: 200,
    body: {
      message: "Discount updated successfully",
      discount,
    },
  };
}

async function deleteDiscount(id) {
  const result = await ItemsDiscount.findOne({ where: { id } });
  if (!result) {
    return { status: 404, body: { message: "Discount does not exist" } };
  }

  await result.destroy();
  return { status: 200, body: { message: "Discount  has been deleted" } };
}

async function addBillDiscount(payload) {
  await BillDiscount.create(payload);
  return { status: 200, body: { ok: true } };
}

async function getBillDiscount() {
  return BillDiscount.findAll();
}

async function deleteBillDiscount(id) {
  const result = await BillDiscount.findOne({ where: { id } });
  if (!result) {
    return { status: 404, body: { message: "Discount does not exist" } };
  }

  await result.destroy();
  return {
    status: 200,
    body: { message: `Discount id: ${result.id} has been deleted` },
  };
}

async function updateBillDiscount(payload) {
  const { id } = payload;

  const discount = await BillDiscount.findByPk(id);
  if (!discount) {
    return { status: 404, body: { message: "Discount not found" } };
  }

  await discount.update(payload);
  return { status: 200, body: { message: "Discount updated successfully" } };
}

async function addCategoryDiscount(payload) {
  const { category_id, percent, startDate, endDate, status } = payload;

  if (percent <= 0 || percent > 100) {
    return { status: 400, body: { message: "Percent must be between 1 and 100" } };
  }

  const category = await Category.findByPk(category_id);
  if (!category) {
    return { status: 404, body: { message: "Category not found" } };
  }

  const discount = await CategoryDiscount.create({
    category_id,
    percent,
    startDate,
    endDate,
    status,
  });

  return { status: 200, body: { ok: true, discount } };
}

async function getCategoryDiscounts() {
  const discounts = await CategoryDiscount.findAll({
    include: [
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
      },
    ],
  });

  return discounts.map((d) => ({
    id: d.id,
    category_id: d.category_id,
    category: d.category ? d.category.name : null,
    percent: d.percent,
    startDate: d.startDate,
    endDate: d.endDate,
    status: d.status,
  }));
}

async function deleteCategoryDiscount(id) {
  const result = await CategoryDiscount.findOne({ where: { id } });
  if (!result) {
    return { status: 404, body: { message: "Discount does not exist" } };
  }

  await result.destroy();
  return { status: 200, body: { message: "Discount has been deleted" } };
}

async function updateCategoryDiscount(payload) {
  const { id, category_id, percent, startDate, endDate, status } = payload;

  const discount = await CategoryDiscount.findByPk(id);
  if (!discount) {
    return { status: 404, body: { message: "Discount not found" } };
  }

  if (percent <= 0 || percent > 100) {
    return { status: 400, body: { message: "Percent must be between 1 and 100" } };
  }

  const category = await Category.findByPk(category_id);
  if (!category) {
    return { status: 404, body: { message: "Category not found" } };
  }

  await discount.update({
    category_id,
    percent,
    startDate,
    endDate,
    status,
  });

  return { status: 200, body: { message: "Discount updated successfully" } };
}

async function getDiscountCounts() {
  const billdiscountcount = await BillDiscount.count();
  const itemdiscountcount = await ItemsDiscount.count();
  const categorydiscountcount = await CategoryDiscount.count();

  return {
    billdiscountcount,
    itemdiscountcount,
    categorydiscountcount,
  };
}

module.exports = {
  addDiscount,
  getDiscounts,
  editDiscount,
  deleteDiscount,
  addBillDiscount,
  getBillDiscount,
  deleteBillDiscount,
  updateBillDiscount,
  addCategoryDiscount,
  getCategoryDiscounts,
  deleteCategoryDiscount,
  updateCategoryDiscount,
  getDiscountCounts,
};
