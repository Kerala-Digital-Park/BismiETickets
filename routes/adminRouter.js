const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const session = require('express-session')
const { isLogin, isLogout } = require("../middleware/adminAuth");


adminRouter.get("/login", isLogout, adminController.viewLogin); 
adminRouter.get("/",isLogin, adminController.viewDashboard);
adminRouter.get("/logout", isLogin, adminController.logoutAdmin);
adminRouter.get("/bookings",isLogin, adminController.viewBookings);
adminRouter.get("/booking-detail",isLogin, adminController.viewBookingDetail);
adminRouter.get("/users",isLogin, adminController.viewUsers);
adminRouter.get("/user-detail",isLogin, adminController.viewUserDetail);
adminRouter.get("/agents",isLogin, adminController.viewAgents);
adminRouter.get("/agent-detail/:id",isLogin, adminController.viewAgentDetail);
adminRouter.get("/settings",isLogin, adminController.viewSettings);
adminRouter.get("/add-flight",isLogin, adminController.viewAddFlight);
adminRouter.get('/coupons',isLogin, adminController.viewCoupons);
adminRouter.get('/subscriptions',isLogin, adminController.viewSubscriptions);
adminRouter.get('/edit-subscription/:id',isLogin, adminController.viewEditSubscription)
adminRouter.get('/bank-updates',isLogin, adminController.viewBankUpdates);
adminRouter.get('/kyc-updates',isLogin, adminController.viewKycUpdates);


adminRouter.post("/login", adminController.loginAdmin);
adminRouter.post('/add-coupon',isLogin, adminController.viewAddCoupon);
adminRouter.post('/delete-coupon/:id',isLogin, adminController.deleteCoupon);
adminRouter.post('/add-subscription',isLogin, adminController.addSubscription);
adminRouter.post('/edit-subscription/:id',isLogin, adminController.editSubscription);
adminRouter.post('/delete-subscription/:id',isLogin, adminController.deleteSubscription)
adminRouter.post('/update-bank-detail/:id',isLogin, adminController.updateBankDetail);
adminRouter.post('/update-kyc-detail/:id',isLogin, adminController.updateKycDetail);


adminRouter.delete('/delete-user/:id',isLogin, adminController.deleteUser);
adminRouter.delete('/delete-agent/:id',isLogin, adminController.deleteAgent);

module.exports = adminRouter;