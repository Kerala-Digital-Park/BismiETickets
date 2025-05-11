const mongoose = require("mongoose");

const Users = require("./userModel");

const supportSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    enquiryType: {
      type: String,
      enum: ["general", "problem"],
      default: "general",
      required: true,
    },
    category: {
      type: String,
      enum: ["General", "Technical", "Billing"],
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

module.exports = mongoose.model("Supports", supportSchema);
