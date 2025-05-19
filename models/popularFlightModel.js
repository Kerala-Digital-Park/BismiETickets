const mongoose = require("mongoose");

const popularFlightSchema = new mongoose.Schema(
  {
    fromCity: { type: String, required: true },
    fromCode: { type: String, required: true },
    toCity: { type: String, required: true },
    toCode: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PopularFlight", popularFlightSchema);
