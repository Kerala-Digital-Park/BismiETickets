const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  ip: { type: String },
  browser: { type: String },
  platform: { type: String },
  loginTime: { type: Date, default: Date.now }
});

module.exports = mongoose.model("LoginActivity", loginActivitySchema);
