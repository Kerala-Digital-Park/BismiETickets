// models/tempSubscriptionModel.js
const mongoose = require("mongoose");

const tempSubscriptionSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  email: String,
  price: Number,
  subscription: String,
  role: String,
  createdAt: { type: Date, default: Date.now, expires: 600 } // auto-delete after 10 mins
});

module.exports = mongoose.model("TempSubscription", tempSubscriptionSchema);
