const { Sequelize } = require('sequelize');

// Format: 'postgres://user:password@example.com:5432/dbname'
const sequelize = new Sequelize('postgres://postgres:admin@localhost:5433/alab_db', {
  dialect: 'postgres',
  logging: false, // Set to console.log to see the raw SQL queries Sequelize writes
});

module.exports = sequelize;