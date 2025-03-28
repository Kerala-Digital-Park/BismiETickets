const mongoose = require("mongoose");

const Flight = require("./flightModel");
const User = require("./userModel");

const bookingSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to User model
      ref: "Users",
      required: true
    },
    flight: {
        type: mongoose.Schema.Types.ObjectId, // Reference to Flight model
        ref: "Flights",
        required: true,
      },
    travelers: [
      {
        index: {
          type: Number,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        first_name: {
          type: String,
          required: true,
        },
        last_name: {
          type: String,
          required: true,
        },
        dob: {
          type: Date,
          required: true,
        },
        nationality: {
          type: String,
          required: true,
        },
        passport_number: {
          type: String,
          required: true,
        },
        passport_country: {
          type: String,
          required: true,
        },
        passport_expiry: {
          type: Date,
          required: true,
        },
      },
    ],
    mobile_number: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_status: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bookings", bookingSchema);
