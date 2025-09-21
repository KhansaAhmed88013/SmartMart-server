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


// ✅ Product model

// =======================
// Category Model
// =======================
const Category = sequelize.define('Category', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT }
}, {
  tableName: 'categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// =======================
// Supplier Model
// =======================
const Supplier = sequelize.define('Supplier', {
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
  opening_balance: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  outstanding_balance: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  credit_limit: { type: DataTypes.DECIMAL(18,2), allowNull: true },

  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' }
}, {
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});// =======================
// Product Model
// =======================

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255), allowNull: false },

  // 💰 allow very large costs/prices
  cost_price: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  qty: { type: DataTypes.BIGINT, defaultValue: 0 }, // stock can be huge
  sale_price: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },

  expiry: { type: DataTypes.DATEONLY },

  total_price: {
    type: DataTypes.VIRTUAL,
    get() {
      return (this.cost_price * this.qty).toFixed(2);
    }
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


// ✅ Discount model
const Discount = sequelize.define('Discount', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  type: { type: DataTypes.ENUM('Discount', 'Offer'), allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false },
  endDate: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
}, {
  tableName: 'discounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});
// =======================
// Customer Model
// =======================
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.TEXT },
  balance: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 }
}, {
  tableName: 'customers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// =======================
// Invoice Model
// =======================
const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  account_id: { type: DataTypes.STRING(50) },
  cashier_name: { type: DataTypes.STRING(100) },
  payment_method: { 
    type: DataTypes.ENUM('Cash Sale', 'Credit Card', 'Credit Customer'),
    defaultValue: 'Cash Sale'
  },
  invoice_date: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  remarks: { type: DataTypes.STRING(255) },
  discount: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  tax_percent: { type: DataTypes.DECIMAL(8,4), defaultValue: 0.0000 },
  final_total: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  paid_amount: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  is_return: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// =======================
// Invoice Items Model
// =======================
const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  price: { type: DataTypes.DECIMAL(18,2) },
  quantity: { type: DataTypes.DECIMAL(18,2) },

  return_qty: { type: DataTypes.DECIMAL(18,2), defaultValue: 0.00 },
  tax_percent: { type: DataTypes.DECIMAL(8,4), defaultValue: 0.0000 }
}, {
  tableName: 'invoice_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});


// ✅ Relationships
Discount.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(Discount, { foreignKey: 'product_id', as: 'discounts' });

// ✅ Connect & Sync
// =======================
// 🔗 Relations
// =======================

// Product relations
Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });

Product.belongsTo(Supplier, { foreignKey: 'supplier_id' });
Supplier.hasMany(Product, { foreignKey: 'supplier_id' });

// Customer - Invoice
Customer.hasMany(Invoice, { foreignKey: 'customer_id' });
Invoice.belongsTo(Customer, { foreignKey: 'customer_id' });

// Invoice - InvoiceItems
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });

// Product - InvoiceItems
Product.hasMany(InvoiceItem, { foreignKey: 'product_id' });
InvoiceItem.belongsTo(Product, { foreignKey: 'product_id' });


// ======================
// Shop
// ======================
const ShopProfile = sequelize.define('ShopProfile', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  shop_name: { type: DataTypes.STRING(150), allowNull: false },
  number1: { type: DataTypes.STRING(20), allowNull: false },
  number2: { type: DataTypes.STRING(20), allowNull: true },
  location: { type: DataTypes.STRING(255), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'shop_profile',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// =======================
// Connect & Sync
// =======================
const connectAndSync = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

   
    await sequelize.sync({alter:true});
    console.log('✅ Tables synced');
    // Insert default "Cash" customer if not exists
    const [cashCustomer, created] = await Customer.findOrCreate({
      where: { name: 'Cash' },
      defaults: {
        phone: null,
        address: null,
        balance: 0.00
      }
    });

    if (created) {
      console.log('✅ Default Cash customer created');
    } else {
      console.log('ℹ️ Cash customer already exists');
    }

  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
};

// ✅ Export models & connection
module.exports = {
  sequelize,
  connectAndSync,
  Product,
  Discount,
  Supplier,
  Category,
  Customer,
  Invoice,
  InvoiceItem,
  ShopProfile
};