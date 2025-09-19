const mongoose = require("mongoose");

const Bookings = require("./bookingModel");
const Users = require("./userModel");
const Counter = require("./counterModel");

const serviceChargeSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true
    },    
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bookings",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    supplier: {
        type: String,
        required: false,
    },
    supplierCost: { 
        type: Number, 
        required: true 
    },
    customerCost: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Supplier Wallet", "Bank Accounts"],
      default: "Supplier Wallet",
      required: true,
    },
    purpose: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

serviceChargeSchema.pre("save", async function (next) {
  if (!this.transactionId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "transactionId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(4, "0"); // 4-digit number
    this.transactionId = `STRS${paddedNumber}`;
  }

  next();
});

module.exports = mongoose.model("ServiceCharge", serviceChargeSchema);
