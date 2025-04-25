const mongoose = require("mongoose");

const subscriptionSchema = mongoose.Schema({
  subscription: {
    type: String,
    enum: ["Enterprise", "Pro", "Free", "Null"],
    default: "Null",
  },
  transactionLimit: {
    type: Number,
    default: 3,
  },
  maxTransactionAmount: {
    type: Number,
    default: 10000,
  },
  price: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 400 },
  features: {
    type: [String], // array of strings
    default: [],
  },
  role: {
    type: String,
    enum: ["User", "Agent"],
    default: "User"
  },  
});

module.exports = mongoose.model("Subscriptions", subscriptionSchema);
