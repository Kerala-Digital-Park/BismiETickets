const express = require("express");
const agentRouter = express();
const agentController = require("../controllers/agentController");
const session = require('express-session')

agentRouter.get("/", agentController.viewDashboard);
agentRouter.get("/listings", agentController.viewListings);
agentRouter.get("/bookings", agentController.viewBookings);
agentRouter.get("/earnings", agentController.viewEarnings);
agentRouter.get("/settings", agentController.viewSettings);
agentRouter.get("/add-listing", agentController.addListing);

module.exports = agentRouter;