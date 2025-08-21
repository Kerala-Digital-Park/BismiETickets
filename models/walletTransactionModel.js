const mongoose = require("mongoose");

const Users = require("./userModel");
const Counter = require("./counterModel");

const walletTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true
    },    
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    amount: { 
        type: Number, 
        required: true 
    },
    status: {
      type: String,
      enum: ["Paid", "Pending", "Cancelled", "Loaded"],
      default: "Pending"
    },
    purpose: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

walletTransactionSchema.pre("save", async function (next) {
  if (!this.transactionId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "transactionId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(4, "0"); // 4-digit number
    this.transactionId = `WTRS${paddedNumber}`;
  }

  next();
});

module.exports = mongoose.model("WalletTransactions", walletTransactionSchema);
