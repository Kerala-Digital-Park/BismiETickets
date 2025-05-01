const mongoose = require("mongoose");

const Bookings = require("./bookingModel");
const Users = require("./userModel")

const transactionSchema = new mongoose.Schema({
    bookingId: { 
        type: mongoose.Schema.Types.ObjectId, 
            ref: "Bookings",
            required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Users",
        required: true
    },
    amount: { type: Number, required: true },
});

module.exports = mongoose.model("Transactions", transactionSchema);
