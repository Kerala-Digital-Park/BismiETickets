const express = require("express");
const agentRouter = express();
const agentController = require("../controllers/agentController");
const session = require('express-session')
const {isLogin,isLogout} = require("../middleware/agentAuth");

agentRouter.get("/dashboard", agentController.viewDashboard);
agentRouter.get("/sign-in", isLogout, agentController.viewSignin);
agentRouter.get("/sign-up", isLogout, agentController.viewSignup);
agentRouter.get("/sign-out", agentController.signOut);
agentRouter.get("/forgot-password", agentController.viewForgotPassword);
agentRouter.get("/reset-password", agentController.viewResetPassword);
agentRouter.get("/listings", agentController.viewListings);
agentRouter.get("/bookings", agentController.viewBookings);
agentRouter.get("/earnings", agentController.viewEarnings);
agentRouter.get("/settings", agentController.viewSettings);
agentRouter.get("/add-listing", agentController.addListing);

agentRouter.post("/sign-up", agentController.signup);
agentRouter.post("/sign-in", agentController.signin);
agentRouter.post("/forgot-password", agentController.forgotPassword);
agentRouter.post("/reset-password", agentController.resetPassword);

module.exports = agentRouter;