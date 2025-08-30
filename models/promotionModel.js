const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
  sendTo: {
    type: String,
    enum: ["all", "subscribed", "inactive"],
    required: true
  },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Promotions", promotionSchema);
