const mongoose = require("mongoose");

const User = require("./userModel");

const bankUpdateSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User model
      ref: "Users",
      required: true,
    },
    bankDetails: {
      accountHolderName: { type: String, default: null, required: false },
      accountNumber: { type: String, default: null, required: false },
      ifscCode: { type: String, default: null, required: false },
      bankName: { type: String, default: null, required: false },
      branchName: { type: String, default: null, required: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankUpdate", bankUpdateSchema);
