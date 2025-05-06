const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// const cron = require("node-cron");

const userSchema = mongoose.Schema(
  {
    userId: { type: String, unique: true },
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
      enum: ["Male", "Female", "Others"],
    },
    address: { type: String, default: null },
    image: { type: String, default: null },
    visitingCard: { type: String, default: null },
    panCard: { type: String, default: null },
    aadhaarCardFront: { type: String, default: null },
    aadhaarCardBack: { type: String, default: null },
    userRole: {
      type: String,
      enum: ["Agent", "User"],
      default: "User",
    },
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
    transactions: { type: Number, default: 0 },
    transactionAmount: { type: Number, default: 0 },
    subscriptionDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    bankDetails: {
      accountHolderName: { type: String, default: null, required: false },
      accountNumber: { type: String, default: null, required: false },
      ifscCode: { type: String, default: null, required: false },
      bankName: { type: String, default: null, required: false },
      branchName: { type: String, default: null, required: false },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.pre("save", async function (next) {
  // Only generate userId if not already set
  if (!this.userId) {
    const randomLetters = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures a 4-digit number
    this.userId = `${randomLetters}-${randomNumbers}`;
  }

  // Only hash password if it was modified
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to increase transaction count
userSchema.methods.decreaseTransaction = async function (amount) {
  // Populate if subscription is still an ObjectId
  if (mongoose.Types.ObjectId.isValid(this.subscription) || !this.subscription.transactionLimit) {
    await this.populate('subscription');
  }

  if (
    this.transactions >= this.subscription.transactionLimit ||
    amount > this.subscription.maxTransactionAmount
  ) {
    throw new Error("Transaction limit exceeded or amount too high.");
  }

  this.transactions += 1;
  this.transactionAmount += amount;

  await this.save();
};

// Monthly reset job using cron
// cron.schedule("0 0 1 * *", async () => {
//   console.log("Resetting transactions for all users...");
//   await mongoose
//     .model("Users")
//     .updateMany(
//       {},
//       { "subscription.transactions": 0, "subscription.transactionAmount": 0 }
//     );
// });

module.exports = mongoose.model("Users", userSchema);
