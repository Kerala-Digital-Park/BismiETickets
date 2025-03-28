const mongoose = require("mongoose");

const flightSchema = mongoose.Schema({
  inventoryName: { type: String, required: true },
  airline: { type: String, required: true },
  flightNumber: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  departureTime: { type: String, required: true },
  departureDate: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  arrivalDate: { type: String, required: true },
  arrivalDay: { type: String },
  duration: { type: String, required: true },

  stops: [
    {
      location: { type: String, required: true },
      arrivalTime: { type: String, required: true },
      arrivalDate: { type: String, required: true },
      departureTime: { type: String, required: true },
      departureDate: { type: String, required: true },
      stopDuration: { type: String, required: true },
    },
  ],

  baggage: {
    adult: {
      checkIn: { type: String, required: true },
      numberOfPieces: { type: Number, required: true },
      weightPerPiece: { type: Number, required: true },
      cabin: {
        pieces: { type: Number, required: true },
        weightPerPiece: { type: Number, required: true },
      },
    },
    child: {
      checkIn: { type: String, required: true },
      numberOfPieces: { type: Number, required: true },
      weightPerPiece: { type: Number, required: true },
      cabin: {
        pieces: { type: Number, required: true },
        weightPerPiece: { type: Number, required: true },
      },
    },
    infant: {
      checkIn: { type: String, required: true },
      numberOfPieces: { type: Number, required: true },
      weightPerPiece: { type: Number, required: true },
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
    fare: {
      adults: { type: Number, required: true },
      infants: { type: Number, required: true },
    },
  }],
  price: { type: Number, required: true },
  seatsLeft: { type: Number, required: true },
  refundable: { type: Boolean, required: true, default: false },
});

module.exports = mongoose.model("Flights", flightSchema);
