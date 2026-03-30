const { Customer } = require("../../db");

async function addCustomer(payload) {
  const { name, phone, address, balance } = payload;

  if (!name) {
    return { status: 400, body: { message: "Customer name is required" } };
  }

  const newCustomer = await Customer.create({
    name,
    phone,
    address,
    balance: balance || 0.0,
  });

  return {
    status: 201,
    body: {
      message: "Customer added successfully",
      customer: newCustomer,
    },
  };
}

async function getCustomers() {
  return Customer.findAll();
}

async function deleteCustomer(id) {
  const customer = await Customer.findByPk(id);
  if (!customer) {
    return { status: 404, body: { message: "Customer not found" } };
  }

  await customer.destroy();
  return {
    status: 200,
    body: { message: `Customer '${customer.name}' deleted successfully` },
  };
}

async function updateCustomer(payload) {
  const { id, name, phone, address, balance } = payload;

  if (!id) {
    return { status: 400, body: { message: "Customer ID is required" } };
  }

  const customer = await Customer.findByPk(id);
  if (!customer) {
    return { status: 404, body: { message: "Customer not found" } };
  }

  await customer.update({
    name: name || customer.name,
    phone: phone || customer.phone,
    address: address || customer.address,
    balance: balance !== undefined ? balance : customer.balance,
  });

  return {
    status: 200,
    body: { message: "Customer updated successfully", customer },
  };
}

module.exports = {
  addCustomer,
  getCustomers,
  deleteCustomer,
  updateCustomer,
};
