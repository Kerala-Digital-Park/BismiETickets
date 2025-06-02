const mongoose = require("mongoose");

const Users = require("./userModel");
const Counter = require("./counterModel");

const supportSchema = mongoose.Schema(
  {
    enquiryId: {
      type: String,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    enquiryType: {
      type: String,
      enum: ["general", "problem", "airline", "internal", "ticket", "other"],
      default: "general",
      required: true,
    },
    category: {
      type: String,
      enum: ["General", "Technical", "Billing", "Cancellation"],
      default: "General",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Normal", "Important", "High Priority"],
      default: "Normal",
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: false,
    },
    reply: [
      {
        message: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        }
      }
    ]    
  },
  { timestamps: true }
);

supportSchema.pre("save", async function (next) {
  if (!this.enquiryId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "enquiryId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(5, "0");
    this.enquiryId = `ENQ${paddedNumber}`;
  }

  next();
});

module.exports = mongoose.model("Supports", supportSchema);
