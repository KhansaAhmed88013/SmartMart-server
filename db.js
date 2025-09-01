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
const Product = sequelize.define('Product', {
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255) },
  cost_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  qty: { type: DataTypes.INTEGER, defaultValue: 0 },
  sale_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  total_price: {
    type: DataTypes.VIRTUAL,
    get() {
      return (this.cost_price * this.qty).toFixed(2);
    }
  },
  expiry: { type: DataTypes.DATE }
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
  status: { type: DataTypes.ENUM('Active', 'Expired'), defaultValue: 'Active' },
}, {
  tableName: 'discounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// ✅ Relationships
Discount.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(Discount, { foreignKey: 'product_id', as: 'discounts' });

// ✅ Connect & Sync
const connectAndSync = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced');
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
};

// ✅ Export models & connection
module.exports = {
  sequelize,
  connectAndSync,
  Product,
  Discount
};
