// models/Coupon.js
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  name: String,
  code: String,
  discount: Number,
  expiry: Date,
});

module.exports = mongoose.model('Coupon', couponSchema);
