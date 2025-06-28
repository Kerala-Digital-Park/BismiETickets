const mongoose = require("mongoose");

const Users = require("./userModel");
const Bookings = require("./bookingModel");
const Counter = require("./counterModel");

const requestSchema = mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Users",
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Bookings",
    },
    category: {
      type: String,
      enum: ["service", "support", "add-on"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    passengerName: {
      type: String,
      required: true,
    },
    request: {
      type: String,
      required: false,
    },
    reqName: [{
        firstName: {
            type: String,
            required: false,
        },
        lastName: {
            type: String,
            required: false,
        }      
    }],
    fileUrl: { 
      type: [String],
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
    ],
    visaDuration: {
      type: Number,
      required: false,
    },
    returnDate: {
      type: Date,
      required: false,
    },
    location: {
      type: String,
      required: false,
    },
    hotelDate:{
      type: String,
      required: false,
    },
    passengerIdentification: [
      {
        passengerIdentification1: {
        type: String,
        required: false,
      },
        passengerIdentification2: {
          type: String,
          required: false,
        },
        type1: {
          type: String,
          required: false,
        },
        type2: {
          type: String,
          required: false,
        },
      }
    ],
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "closed"],
      default: "pending",
      required: true,
    },    
  },
  { timestamps: true }
);

requestSchema.pre("save", async function (next) {
  if (!this.requestId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "requestId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(5, "0");
    this.requestId = `REQ${paddedNumber}`;
  }

  next();
});

module.exports = mongoose.model("Requests", requestSchema);
