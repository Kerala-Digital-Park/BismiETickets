const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  id: { type: String },
  type: { type: String, enum: ["booking", "transaction"], required: true },
  content: { type: String },
},
{ timestamps: true }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
