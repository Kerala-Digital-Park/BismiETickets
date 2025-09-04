const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flights",
      required: true,
    },
    type: {
      type: String,
      enum: ["Booking", "Flight Status", "Request"],
      required: true,
    },
    content: { type: String, required: true },
    sendTo: {
      type: String,
      enum: ["all", "admin", "user", "seller"],
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notifications", notificationSchema);
