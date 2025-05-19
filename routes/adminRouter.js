const express = require("express");
const adminRouter = express();
const adminController = require("../controllers/adminController");
const session = require('express-session')
const { isLogin, isLogout } = require("../middleware/adminAuth");
const upload = require("../multer/multer");

adminRouter.get("/",isLogin, adminController.viewDashboard);
adminRouter.get("/login", isLogout, adminController.viewLogin); 
adminRouter.get("/logout", isLogin, adminController.logoutAdmin);
adminRouter.get("/bookings",isLogin, adminController.viewBookings);
adminRouter.get("/booking-detail/:id",isLogin, adminController.viewBookingDetail);
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
adminRouter.get('/transactions', isLogin, adminController.viewTransactions);
adminRouter.get('/withdrawal/:flightId/:sellerId',isLogin, adminController.viewWithdrawalsById);
adminRouter.get('/messages', isLogin, adminController.viewMessages)
adminRouter.get('/popular-flights', isLogin, adminController.viewPopularFlights)
adminRouter.get('/airports', adminController.getAirports);
// adminRouter.get("/airports", adminController.viewAllAirports);
// adminRouter.get("/airports/search", adminController.searchAirports);



adminRouter.post('/login', adminController.loginAdmin);
adminRouter.post('/add-coupon',isLogin, adminController.viewAddCoupon);
adminRouter.post('/delete-coupon/:id',isLogin, adminController.deleteCoupon);
adminRouter.post('/add-subscription',isLogin, adminController.addSubscription);
adminRouter.post('/edit-subscription/:id',isLogin, adminController.editSubscription);
adminRouter.post('/delete-subscription/:id',isLogin, adminController.deleteSubscription)
adminRouter.post('/update-bank-detail/:id',isLogin, adminController.updateBankDetail);
adminRouter.post('/update-kyc-detail/:id',isLogin, adminController.updateKycDetail);
adminRouter.post('/withdrawal-payment/:id', isLogin, adminController.withdrawalPayment)
adminRouter.post('/send-response', isLogin, adminController.sendResponse)
adminRouter.post("/add-flight", isLogin, adminController.addFlight);
adminRouter.post("/api/flights", isLogin, adminController.getApiFlights);
adminRouter.post("/popular-flights", upload.single("file"), isLogin, adminController.addPopularFlights)
adminRouter.post("/cancel-booking", isLogin, adminController.cancelBooking);


adminRouter.delete('/delete-user/:id',isLogin, adminController.deleteUser);
adminRouter.delete('/delete-agent/:id',isLogin, adminController.deleteAgent);
adminRouter.post('/delete-popular-flight/:id', isLogin, adminController.deletePopularFlight)

module.exports = adminRouter;