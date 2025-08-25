const { Sequelize, DataTypes } = require('sequelize');

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

const Product = sequelize.define('Product', {
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255) },
  cost_price: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
  qty: { type: DataTypes.INTEGER, defaultValue: 0 },
  sale_price: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.00 },
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

// Connect & sync
const connectAndSync = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    await sequelize.sync({alter:true});
    console.log('✅ Tables synced');
  } catch (err) {
    console.error('❌ Database connection error:', err);
  }
};

module.exports = {
  sequelize,
  connectAndSync,
  Product,
};
