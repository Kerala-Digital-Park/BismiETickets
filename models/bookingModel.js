const mongoose = require("mongoose");

const Flight = require("./flightModel");
const User = require("./userModel");
const Counter = require("./counterModel");

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
    bookingId: {
      type: String,
      unique: true,
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
    baseFare: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    discount: {
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

bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    const counter = await Counter.findOneAndUpdate(
      { name: "bookingId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(counter.seq).padStart(5, "0");
    this.bookingId = `BFL${paddedNumber}`;
  }

  next();
});

module.exports = mongoose.model("Bookings", bookingSchema);
