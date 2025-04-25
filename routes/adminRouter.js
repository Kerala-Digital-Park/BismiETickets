const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const session = require('express-session')
const { isLogin, isLogout } = require("../middleware/adminAuth");


adminRouter.get("/login", isLogout, adminController.viewLogin); 
adminRouter.get("/",isLogin, adminController.viewDashboard);
adminRouter.get("/bookings", adminController.viewBookings);
adminRouter.get("/booking-detail", adminController.viewBookingDetail);
adminRouter.get("/users", adminController.viewUsers);
adminRouter.get("/user-detail", adminController.viewUserDetail);
adminRouter.get("/agents", adminController.viewAgents);
adminRouter.get("/agent-detail", adminController.viewAgentDetail);
adminRouter.get("/settings", adminController.viewSettings);
adminRouter.get("/add-flight", adminController.viewAddFlight);
adminRouter.get('/coupons', adminController.viewCoupons);
adminRouter.post('/add-coupon', adminController.viewAddCoupon);
adminRouter.post('/delete-coupon/:id', adminController.deleteCoupon);
adminRouter.get('/subscriptions', adminController.viewSubscriptions);
adminRouter.post('/add-subscription', adminController.addSubscription);
adminRouter.get('/edit-subscription/:id',adminController.viewEditSubscription)
adminRouter.post('/edit-subscription/:id', adminController.editSubscription);
adminRouter.post('/delete-subscription/:id', adminController.deleteSubscription)





adminRouter.post("/login", adminController.loginAdmin);
adminRouter.get("/logout", isLogin, adminController.logoutAdmin);

module.exports = adminRouter;