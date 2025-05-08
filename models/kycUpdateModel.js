const mongoose = require("mongoose");

const User = require("./userModel");

const kycUpdateSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User model
      ref: "Users",
      required: true,
    },
    visitingCard: { type: String, default: null },
    panCard: { type: String, default: null },
    aadhaarCardFront: { type: String, default: null },
    aadhaarCardBack: { type: String, default: null },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscriptions",
      required: true,
    },
    kyc: {
      type: String,
      enum: ["Completed", "Initial", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("kycUpdate", kycUpdateSchema);
