const bcrypt = require("bcrypt");
const { Sequelize, DataTypes } = require('sequelize');

// ✅ Database connection
const sequelize = new Sequelize(
  process.env.DB_DATABASE || 'smartmart',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false
  }
);


// =======================
// Users Model
// =======================
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false }, // hashed
    full_name: { type: DataTypes.STRING(100), allowNull: false },
    role: { type: DataTypes.ENUM('Admin', 'Cashier'), allowNull: false, defaultValue: 'Cashier' },
    status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Inactive' },
    email: { type: DataTypes.STRING(100), validate: { isEmail: true } },
    created_by: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    last_login: { type: DataTypes.DATE, allowNull: true }
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Category Model
// =======================
const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT }
  },
  {
    tableName: 'categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Supplier Model
// =======================
const Supplier = sequelize.define(
  'Supplier',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    supplier_name: { type: DataTypes.STRING(100), allowNull: false },
    contact_person: { type: DataTypes.STRING(100) },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: { type: DataTypes.STRING(100), validate: { isEmail: true } },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(50) },
    country: { type: DataTypes.STRING(50) },
    tax_number: { type: DataTypes.STRING(50) },
    payment_terms: { type: DataTypes.STRING(50) },
    bank_details: { type: DataTypes.TEXT },
    opening_balance: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    outstanding_balance: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    credit_limit: { type: DataTypes.DECIMAL(65, 2), allowNull: true },
    status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' }
  },
  {
    tableName: 'suppliers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Product Model
// =======================
const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    cost_price: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    qty: { type: DataTypes.DECIMAL(65, 0), defaultValue: 0 }, // snapshot
    sale_price: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    expiry: { type: DataTypes.DATEONLY },
    total_price: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.cost_price === null || this.qty === null) return 0;
        return (parseFloat(this.cost_price) * parseFloat(this.qty)).toFixed(5);
      }
    }
  },
  {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// ✅ Discount model
const ItemsDiscount = sequelize.define(
  'ItemsDiscount',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    type: { type: DataTypes.ENUM('Percent', 'Value'), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(65, 2), allowNull: false },
    status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
  },
  {
    tableName: 'Items_Discount',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
// =======================
// Bill Discount Model
// =======================
const BillDiscount = sequelize.define(
  'BillDiscount',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    conditionType: {
      type: DataTypes.ENUM('Above', 'EqualOrAbove', 'Below'),
      allowNull: false,
    },

    amount: { type: DataTypes.DECIMAL(65, 2), allowNull: false },

    type: {
      type: DataTypes.ENUM('Flat', 'Percentage'),
      allowNull: false,
    },

    value: { type: DataTypes.DECIMAL(65, 2), allowNull: false },

    from: { type: DataTypes.DATEONLY, allowNull: false },
    to: { type: DataTypes.DATEONLY, allowNull: false },

    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
    },

    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    tableName: 'bill_discounts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Category Discount Model
// =======================
const CategoryDiscount = sequelize.define(
  "CategoryDiscount",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "categories", // must match your Category table
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
 percent: {
      type: DataTypes.DECIMAL(5, 2), 
      allowNull: false,
    },

    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },
  },
  {
    tableName: "category_discounts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);


// =======================
// Customer Model
// =======================
const Customer = sequelize.define(
  'Customer',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    address: { type: DataTypes.TEXT },
    balance: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 }
  },
  {
    tableName: 'customers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Invoice Model
// =======================
const Invoice = sequelize.define(
  'Invoice',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    account_id: { type: DataTypes.STRING(50) },
    cashier_name: { type: DataTypes.STRING(100) },
    payment_method: {
      type: DataTypes.ENUM('Cash Sale', 'Credit Card', 'Credit Customer'),
      defaultValue: 'Cash Sale'
    },
    invoice_date: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    remarks: { type: DataTypes.STRING(255) },
    discount: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    tax_percent: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0.000 },
    final_total: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    paid_amount: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    is_return: { type: DataTypes.BOOLEAN, defaultValue: false }
  },
  {
    tableName: 'invoices',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Invoice Items Model
// =======================
const InvoiceItem = sequelize.define(
  'InvoiceItem',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    price: { type: DataTypes.DECIMAL(65, 2) },
    quantity: { type: DataTypes.DECIMAL(65, 2) },
    return_qty: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    tax_percent: { type: DataTypes.DECIMAL(18, 3), defaultValue: 0.000 },
      cost_price: { type: DataTypes.DECIMAL(65,2), defaultValue: 0.00 } // new field

  },
  {
    tableName: 'invoice_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Purchase Model
// =======================
const Purchase = sequelize.define(
  'Purchase',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    supplier_id: { type: DataTypes.INTEGER },
    purchase_date: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    remarks: { type: DataTypes.STRING(255) },
    total_amount: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    paid_amount: { type: DataTypes.DECIMAL(65, 2), defaultValue: 0.00 },
    due_date: { type: DataTypes.DATEONLY },
    payment_status: {
      type: DataTypes.ENUM('Pending', 'Partial', 'Paid', 'Cancelled'),
      defaultValue: 'Pending'
    }
  },
  {
    tableName: 'purchases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

const PurchaseItem = sequelize.define(
  'PurchaseItem',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    cost_price: { type: DataTypes.DECIMAL(65, 2) },
    sale_price: { type: DataTypes.DECIMAL(65, 2) },
    quantity: { type: DataTypes.DECIMAL(65, 0) }
  },
  {
    tableName: 'purchase_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// =======================
// Stock Ledger
// =======================
const StockLedger = sequelize.define(
  'StockLedger',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    transaction_type: {
      type: DataTypes.ENUM('Opening', 'Purchase', 'Sale', 'Return', 'Adjustment'),
      allowNull: false
    },
    transaction_id: { type: DataTypes.INTEGER, allowNull: true },
    qty_in: { type: DataTypes.DECIMAL(65, 0), defaultValue: 0 },
    qty_out: { type: DataTypes.DECIMAL(65, 0), defaultValue: 0 },
    balance: { type: DataTypes.DECIMAL(65, 0), defaultValue: 0 },
    remarks: { type: DataTypes.STRING(255), allowNull: true }
  },
  {
    tableName: 'stock_ledger',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

// ✅ Relationships

User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Invoice.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Invoice, { foreignKey: 'created_by', as: 'invoices' });

ItemsDiscount.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(ItemsDiscount, { foreignKey: 'product_id', as: 'ItemsDiscount' });

Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });

Product.belongsTo(Supplier, { foreignKey: 'supplier_id' });
Supplier.hasMany(Product, { foreignKey: 'supplier_id' });

Customer.hasMany(Invoice, { foreignKey: 'customer_id' });
Invoice.belongsTo(Customer, { foreignKey: 'customer_id' });

Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

Product.hasMany(InvoiceItem, { foreignKey: 'product_id' });
InvoiceItem.belongsTo(Product, { foreignKey: 'product_id' });

Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id' });

Product.hasMany(PurchaseItem, { foreignKey: 'product_id' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(StockLedger, { foreignKey: 'product_id' });
StockLedger.belongsTo(Product, { foreignKey: 'product_id' });

Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', as: 'purchases' });

CategoryDiscount.belongsTo(Category, { foreignKey: "category_id", as: "category" });
Category.hasMany(CategoryDiscount, { foreignKey: "category_id", as: "discounts" });

// ======================
// Shop
// ======================
const ShopProfile = sequelize.define(
  'ShopProfile',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    shop_name: { type: DataTypes.STRING(150), allowNull: false },
    number1: { type: DataTypes.STRING(20), allowNull: false },
    number2: { type: DataTypes.STRING(20), allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true }
  },
  {
    tableName: 'shop_profile',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

const Unit = sequelize.define("Unit", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});
Product.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unitDetails' });
Unit.hasMany(Product, { foreignKey: 'unit_id', as: 'products' });

// =======================
// Stock Ledger Utility
// =======================
async function getLastBalance(product_id, transaction = null) {
  const last = await StockLedger.findOne({
    where: { product_id },
    order: [['id', 'DESC']],
    transaction
  });
  return last ? Number(last.balance) : 0;
}

async function recordLedger({
  product_id,
  transaction_type,
  transaction_id = null,
  qty_in = 0,
  qty_out = 0,
  remarks = null,
  transaction = null
}) {
  const prevBal = await getLastBalance(product_id, transaction);
  const newBal = prevBal + Number(qty_in) - Number(qty_out);

  const ledger = await StockLedger.create(
    {
      product_id,
      transaction_type,
      transaction_id,
      qty_in,
      qty_out,
      balance: newBal,
      remarks
    },
    { transaction }
  );

  // update snapshot
  await Product.update(
    { qty: newBal },
    { where: { id: product_id }, hooks: false, transaction }
  );

  return ledger;
}

// =======================
// Connect & Sync
// =======================
const connectAndSync = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync();
    console.log("✅ Tables synced");

    // Insert default "Cash" customer if not exists
    const [cashCustomer, created] = await Customer.findOrCreate({
      where: { name: "Cash" },
      defaults: { phone: null, address: null, balance: 0.0 },
    });

    if (created) console.log("✅ Default Cash customer created");
    else console.log("ℹ️ Cash customer already exists");

    // 🔑 Insert default Admin user if not exists
    const defaultUsername = "khansa";
    const defaultPassword = "12345";

    const existingUser = await User.findOne({ where: { username: defaultUsername } });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await User.create({
        username: defaultUsername,
        password: hashedPassword,
        full_name: "khansa ahmed",
        role: "Admin",
        status: "Active"
      });

      console.log("✅ Default Admin user created (username: khansa / password: 12345)");
    } else {
      console.log("ℹ️ Default Admin user already exists");
    }
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
};
module.exports = {
  sequelize,
  connectAndSync,
  Product,
  Supplier,
  Category,
  Customer,
  Invoice,
  InvoiceItem,
  ShopProfile,
  ItemsDiscount,
  Purchase,
  PurchaseItem,
  StockLedger,
  BillDiscount,
  User,
  CategoryDiscount,
  Unit,
  recordLedger,
  getLastBalance
};

/*
ℹ️ transaction_id meaning:
- For Purchase: Purchase.id
- For Sale: Invoice.id
- For Opening or Adjustment: usually null (or a manual reference if you want)
*/
