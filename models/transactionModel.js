const mongoose = require("mongoose");

const Bookings = require("./bookingModel");
const Users = require("./userModel");
const Counter = require("./counterModel");

const transactionSchema = new mongoose.Schema(
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
    totalAmount: { 
        type: Number, 
        required: true 
    },
    baseFare: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    credit: {
      type: Number,
      required: true,
      default: 0
    },
    debit: {
      type: Number,
      required: true,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid"],
      default: "Unpaid"
    }
  },
  { timestamps: true }
);

transactionSchema.pre("save", async function (next) {
  if (!this.transactionId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "transactionId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(4, "0"); // 4-digit number
    this.transactionId = `TRS${paddedNumber}`;
  }

  next();
});

module.exports = mongoose.model("Transactions", transactionSchema);
