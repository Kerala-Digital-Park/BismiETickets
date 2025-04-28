const mongoose = require("mongoose");

const airlineSchema = new mongoose.Schema({
    Value: { type: String, required: false },
    Name: { type: String, required: false },
    AirlineType: { type: String, required: false },
    Type: { type: String, required: false },
});

airlineSchema.index({ Name: "text", Value: "text" });

module.exports = mongoose.model("Airlines", airlineSchema);
