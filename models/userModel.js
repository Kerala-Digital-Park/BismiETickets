const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

module.exports = mongoose.model("Users", userSchema);
