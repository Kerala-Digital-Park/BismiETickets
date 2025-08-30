const mongoose = require("mongoose");

const tempRequestPaymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "Requests", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Bookings", required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, default: "Support request payment" },
  createdAt: { type: Date, default: Date.now, expires: 600 } // auto delete in 10 min
});

module.exports = mongoose.model("TempRequestPayment", tempRequestPaymentSchema);
