const mongoose = require("mongoose");

const flightSchema = mongoose.Schema({
  sellerId: { type: String, required: true },
  inventoryName: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  departureName: { type: String, required: true },
  arrivalName: { type: String, required: true },
  fromCity: { type: String, required: true },
  toCity: { type: String, required: true },
  fromCountry: { type: String, required: true },
  toCountry: { type: String, required: true },
  departureTime: { type: String, required: true },
  departureDate: { type: String, required: true },
  arrivalTime: { type: String, required: true },
  arrivalDate: { type: String, required: true },
  duration: { type: String, required: true },
  disableBeforeDays: { type: Number, required: true },
  stops: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      fromCode: { type: String, required: true },
      toCode: { type: String, required: true },
      fromTerminal: { type: String, required: false },
      toTerminal: { type: String, required: false },
      airline: { type: String, required: true },
      flightNumber: { type: String, required: true },
      departureTime: { type: String, required: true },
      arrivalTime: { type: String, required: true },
      arrivalDay: { type: String, required: true },
      departureDay: { type: String, required: false },
      stopDuration: { type: String, required: true },
      airlineCode: { type: String, required: true },
      departureCity: { type: String, required: true },
      arrivalCity: { type: String, required: true },
      airlineLogo: { type: String, required: true },
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
    fare: {
      adults: { type: Number, required: true },
      infants: { type: Number, required: true },
    },
  }],
  refundable: { type: Boolean, required: true, default: false },
});

module.exports = mongoose.model("Flights", flightSchema);
