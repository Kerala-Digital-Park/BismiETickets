const mongoose = require("mongoose");

const requestTxnSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "Requests", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Bookings", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["Paid", "Failed"], required: true },
  purpose: { type: String, default: "Support request payment" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RequestTransactions", requestTxnSchema);
