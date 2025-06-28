const mongoose = require("mongoose");

const airportSchema = new mongoose.Schema({
  // Type: { type: String, required: false },
  Value: { type: String, required: false },
  Name: { type: String, required: false },
  PopCity: { type: String, required: false },
  CountyCode: { type: String, required: false },
  // CurrencyCode: { type: String, required: false },
  Airport: { type: String, required: false },
  CountryName: { type: String, required: false },
});

airportSchema.index({ Airport: "text", Value: "text" });

module.exports = mongoose.model("Airports", airportSchema);
