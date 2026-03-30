const discountService = require("../services/discountService");

async function addDiscount(req, res) {
  try {
    const response = await discountService.addDiscount(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function discounts(req, res) {
  try {
    const list = await discountService.getDiscounts();
    return res.json(list);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
}

async function editDiscount(req, res) {
  console.log(req.body);
  try {
    const response = await discountService.editDiscount(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function delDiscount(req, res) {
  try {
    const response = await discountService.deleteDiscount(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}

async function addBillDiscount(req, res) {
  try {
    const response = await discountService.addBillDiscount(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getBillDiscount(req, res) {
  try {
    const list = await discountService.getBillDiscount();
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function delBillDiscount(req, res) {
  console.log(req.params.id);
  console.log("hi");
  try {
    const response = await discountService.deleteBillDiscount(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}

async function updateBillDiscount(req, res) {
  console.log(req.body);
  try {
    const response = await discountService.updateBillDiscount(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function addCategoryDiscount(req, res) {
  try {
    const response = await discountService.addCategoryDiscount(req.body);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getCategoryDiscounts(req, res) {
  try {
    const result = await discountService.getCategoryDiscounts();
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function delCategoryDiscount(req, res) {
  console.log(req.params.id);
  try {
    const response = await discountService.deleteCategoryDiscount(req.params.id);
    return res.status(response.status).json(response.body);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
}

async function updateCategoryDiscount(req, res) {
  try {
    const response = await discountService.updateCategoryDiscount(req.body);
    return res.status(response.status).json(response.body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function getnoofdiscount(req, res) {
  try {
    const counts = await discountService.getDiscountCounts();
    return res.json(counts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  addDiscount,
  discounts,
  editDiscount,
  delDiscount,
  addBillDiscount,
  getBillDiscount,
  delBillDiscount,
  updateBillDiscount,
  addCategoryDiscount,
  getCategoryDiscounts,
  delCategoryDiscount,
  updateCategoryDiscount,
  getnoofdiscount,
};
