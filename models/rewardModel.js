const mongoose = require("mongoose");
const rewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    points: {
      type: Number,
      default: 0, 
    },
    status: {
      type: String,
      enum: ["processed", "active", "redeemed", "expired"],
      default: "processed",
    },
    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rewards", rewardSchema);
