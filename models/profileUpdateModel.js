const mongoose = require("mongoose");

const User = require("./userModel");

const profileUpdateSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User model
      ref: "Users",
      required: true,
    },
    name: { type: String, required: false },
    email: { type: String, required: false },
    mobile: { type: Number, required: false },
    whatsapp: { type: String, required: false },
    nationality: { type: String, required: false },
    gender: {
      type: String,
      enum: ["Male", "Female", "Others"],
      required: false,
    },
    proprietorship: { type: String, required: false },
    address: { type: String, required: false },
    agencyName: { type: String, required: false },
    image: { type: String, required: false },
    logo: { type: String, required: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("profileUpdate", profileUpdateSchema);
