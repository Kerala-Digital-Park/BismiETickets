const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const session = require('express-session')

adminRouter.get("/", adminController.viewDashboard);
adminRouter.get("/bookings", adminController.viewBookings);
adminRouter.get("/booking-detail", adminController.viewBookingDetail);
adminRouter.get("/users", adminController.viewUsers);
adminRouter.get("/user-detail", adminController.viewUserDetail);
adminRouter.get("/agents", adminController.viewAgents);
adminRouter.get("/agent-detail", adminController.viewAgentDetail);
adminRouter.get("/settings", adminController.viewSettings);
adminRouter.get("/add-flight", adminController.viewAddFlight);

module.exports = adminRouter;