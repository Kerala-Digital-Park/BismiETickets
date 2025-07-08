const mongoose = require("mongoose");

const airportDetailsSchema = new mongoose.Schema({
  value: { type: String, required: true },   // IATA code
  name: { type: String, required: true },    // Airport name
  city: { type: String, required: true },    // City
  country: { type: String, required: true }, // Country
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { _id: false }); // Reuse for both from & to

const fromAirportSchema = new mongoose.Schema({
  value: { type: String, required: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  toAirports: { type: [airportDetailsSchema], default: [] }
}, { _id: false });

const filterAirportSchema = new mongoose.Schema({
  fromAirport: { type: fromAirportSchema, required: true }
});

module.exports = mongoose.model("FilterAirport", filterAirportSchema);
