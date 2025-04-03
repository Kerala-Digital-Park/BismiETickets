const mongoose = require("mongoose");
const cron = require("node-cron"); // For resetting limits monthly

const User = require("./userModel");

const subscriptionSchema = mongoose.Schema(
  {
    userId: {
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Users",
          required: true
    }, 
    subscription: {
      type: String,
      enum: ["Pro", "Free", "Null"],
      default: "Null",
    },
    kyc: {
      type: String,
      enum: ["Completed", "Initial", "Pending"],
      default: function () {
        if (this.subscription === "Pro") return "Completed";
        if (this.subscription === "Free") return "Initial";
        return "Pending";
      },
    },
    transactions: { type: Number, default: 0},
    transactionLimit: {
        type: Number,
        default: function () {
          if (this.subscription === "Pro") return 1000;
          if (this.subscription === "Free") return 10;
          return 3;
        },
      },
      maxTransactionAmount: {
        type: Number,
        default: function () {
          if (this.subscription === "Pro") return 10000000;
          if (this.subscription === "Free") return 100000;
          return 10000;
        },
      },
  
  },
  { timestamps: true }
);

subscriptionSchema.methods.decreaseTransaction = async function (amount) {
    if (this.transactions >= this.transactionLimit || amount > this.maxTransactionAmount) {
      throw new Error("Transaction limit exceeded or amount too high.");
    }
  
    this.transactions += 1; // Increment transaction count
    await this.save();
  };
  
  // Monthly reset job
  cron.schedule("0 0 1 * *", async () => {
    console.log("Resetting transactions and max amounts for all users...");
    await mongoose.model("Subscriptions").updateMany({}, { transactions: 0 });
  });

module.exports = mongoose.model("Subscriptions", subscriptionSchema);
