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
      enum: ["active", "redeemed", "expired"],
      default: "active",
    },
    expiryDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

rewardSchema.pre("save", function (next) {
  if (
    this.expiryDate &&
    this.expiryDate < new Date() &&
    this.status !== "redeemed"
  ) {
    this.status = "expired";
  }
  next();
});

module.exports = mongoose.model("Rewards", rewardSchema);
