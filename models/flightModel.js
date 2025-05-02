const mongoose = require("mongoose");
const Counter = require("./counterModel");

const flightSchema = mongoose.Schema({
  sellerId: { type: String, required: true },
  // inventoryName: { type: String, required: true },
  inventoryId: { type: String, unique: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  departureName: { type: String, required: false },
  arrivalName: { type: String, required: false },
  fromCity: { type: String, required: false },
  toCity: { type: String, required: false },
  fromCountry: { type: String, required: false },
  toCountry: { type: String, required: false },
  departureTime: { type: String, required: false },
  departureDate: { type: String, required: true },
  arrivalTime: { type: String, required: false },
  arrivalDate: { type: String, required: true },
  duration: { type: String, required: false },
  disableBeforeDays: { type: Number, required: true },
  stops: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      fromCode: { type: String, required: false },
      toCode: { type: String, required: false },
      fromTerminal: { type: String, required: false },
      toTerminal: { type: String, required: false },
      airline: { type: String, required: true },
      flightNumber: { type: String, required: true },
      departureTime: { type: String, required: true },
      arrivalTime: { type: String, required: true },
      arrivalDay: { type: String, required: true },
      departureDay: { type: String, required: true },
      stopDuration: { type: String, required: false },
      airlineCode: { type: String, required: false },
      departureCity: { type: String, required: false },
      arrivalCity: { type: String, required: false },
      airlineLogo: { type: String, required: false },
    },
  ],

  baggage: {
    adult: {
      checkIn: {
      numberOfPieces: { type: Number, required: true },
      weightPerPiece: { type: Number, required: true },
      },
      cabin: {
        pieces: { type: Number, required: true },
        weightPerPiece: { type: Number, required: true },
      },
    },
    child: {
      checkIn: { 
      numberOfPieces: { type: Number, required: true },
      weightPerPiece: { type: Number, required: true },
      },
      cabin: {
        pieces: { type: Number, required: true },
        weightPerPiece: { type: Number, required: true },
      },
    },
    infant: {
      checkIn: { 
      numberOfPieces: { type: Number, required: true },
      weightPerPiece: { type: Number, required: true },
      },
      cabin: {
        pieces: { type: Number, required: true },
        weightPerPiece: { type: Number, required: true },
      },
    },
  },
  inventoryDates: [{
    date: { type: String, required: true },
    pnr: { type: String, required: true },
    seats: { type: Number, required: true },
    seatsBooked: { type: Number, required: true, default: 0 },
    fare: {
      adults: { type: Number, required: true },
      infants: { type: Number, required: true },
    },
  }],
  refundable: { type: Boolean, required: true, default: false },
  status: { type: String, required: true, default: "active" },
},
{ timestamps: true }
);

// Add pre-save hook
flightSchema.pre("save", async function (next) {
  const flight = this;

  if (!flight.inventoryId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { name: "inventoryId" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const paddedSeq = String(counter.seq).padStart(5, "0");
      flight.inventoryId = `INV${paddedSeq}`;

      next();
    } catch (err) {
      return next(err);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model("Flights", flightSchema);
