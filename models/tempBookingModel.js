const mongoose = require("mongoose");

const tempBookingSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  data: { type: Object, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // auto-delete after 10 min
  }
});

module.exports = mongoose.model("TempBooking", tempBookingSchema);
