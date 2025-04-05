const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cron = require("node-cron"); 

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    pan: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    mobile: { type: Number, default: null },
    nationality: { type: String, default: null },
     gender: {
      type: String,
      enum: ["Male", "Female", "Others"]
    },
    address: { type: String, default: null },
    image:{type:String,default:null},
    visitingCard: { type: String, default: null }, 
    panCard: {type:String,default:null},
    aadhaarCardFront: { type: String, default: null },
    aadhaarCardBack: { type: String, default: null }, 
    subscription: {
      subscription: {
        type: String,
        enum: ["Enterprise", "Pro", "Free", "Null"],
        default: "Null",
      },
      kyc: {
        type: String,
        enum: ["Completed", "Initial", "Pending"],
        default: "Pending",
      },
      transactions: { type: Number, default: 0},
      transactionLimit: {
          type: Number,
          default: function () {
            if (this.subscription === "Enterprise") return 100000;
            if (this.subscription === "Pro") return 100;
            if (this.subscription === "Free") return 20;
            return 3;
          },
        },
        transactionAmount: { type: Number, default: 0},
        maxTransactionAmount: {
          type: Number,
          default: function () {
            if (this.subscription === "Enterprise") return 10000000;
            if (this.subscription === "Pro") return 2000000;
            return 200000;
          },
        },
    } 
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to decrease transaction count
userSchema.methods.decreaseTransaction = async function () {
  if (
    this.subscription.transactions >= this.subscription.transactionLimit ||
    transactionAmount > this.subscription.maxTransactionAmount
  ) {
    throw new Error("Transaction limit exceeded or amount too high.");
  }

  this.subscription.transactions += 1;
  await this.save();
};

// Monthly reset job using cron
cron.schedule("0 0 1 * *", async () => {
  console.log("Resetting transactions for all users...");
  await mongoose.model("Users").updateMany(
    {},
    { "subscription.transactions": 0,
      "subscription.transactionAmount": 0,
     }
  );
});

module.exports = mongoose.model("Users", userSchema);
