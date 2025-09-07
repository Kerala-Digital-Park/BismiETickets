const mongoose = require("mongoose");

const tempWalletSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: false },
    purpose: { type: String, default: "Loaded cash" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TempWallet", tempWalletSchema);
