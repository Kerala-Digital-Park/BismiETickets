const express = require("express");
const userRouter = express();
const userController = require("../controllers/userController");
const session = require('express-session')
const {isLogin,isLogout} = require("../middleware/userAuth");
const upload = require("../multer/multer");
const Users = require("../models/userModel");
// Only apply preventCache to routes, NOT static files
userRouter.use((req, res, next) => {
  const isStaticAsset = req.url.startsWith('/assets') || req.url.startsWith('/uploads');
  if (!isStaticAsset) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

userRouter.use((req, res, next) => {
  res.locals.userId = req.session.userId; 
  next();
});

userRouter.use(async(req, res, next) => {
      
      if (req.session.userId) {
          try {
            res.locals.user = await Users.findById(req.session.userId).populate("subscription"); 
          } catch (error) {
              console.error('Error fetching user details:', error);
              res.locals.user = null;
          }
      } else {
          res.locals.user = null;
      }
      next();
  });

  userRouter.use((req, res, next) => {
    const currentUrl = req.originalUrl;
  
    res.locals.pathname = req.path;
  
    const isStaticAsset = currentUrl.startsWith('/assets');
  
    if (
      !req.session.user_id &&
      req.method === 'GET' &&
      !['/sign-in', '/sign-up'].includes(currentUrl) &&
      !isStaticAsset
    ) {
      req.session.originalUrl = currentUrl;
    }
  
    next();
  });
  
  
userRouter.get("/", userController.viewHomepage);
userRouter.get("/dashboard", isLogin, userController.viewDashboard);
userRouter.get("/flight-list", userController.viewFlightList);
userRouter.get("/flight-detail", isLogin, userController.viewFlightDetail);
userRouter.get("/flight-booking",isLogin, userController.viewFlightBooking);
userRouter.get("/about", userController.viewAbout);
userRouter.get("/contact", userController.viewContact);
userRouter.get("/sign-in", isLogout, userController.viewSignin);
userRouter.get("/sign-up", isLogout, userController.viewSignup);
userRouter.get("/sign-out", userController.signOut);
userRouter.get("/forgot-password", userController.viewForgotPassword);
userRouter.get("/reset-password", userController.viewResetPassword);
userRouter.get("/blog", userController.viewBlog);
userRouter.get("/blog-detail", userController.viewBlogDetail);
userRouter.get("/help", isLogin, userController.viewHelp);
userRouter.get("/help-detail", userController.viewHelpDetail);
userRouter.get("/faq", userController.viewFAQ);
userRouter.get("/help-contact", userController.viewHelpContact);
userRouter.get("/support-ticket", isLogin, userController.viewSupportTicket);
userRouter.get("/privacy-policy", userController.viewPrivacy);
userRouter.get("/terms-and-conditions", userController.viewTerms);
userRouter.get("/cookies", userController.viewCookies);
userRouter.get("/disclaimer", userController.viewDisclaimer);
userRouter.get("/profile",isLogin, userController.viewProfile);
userRouter.get("/bookings",isLogin, userController.viewBookings);
userRouter.get("/travelers",isLogin, userController.viewTravelers);
userRouter.get("/payment-details",isLogin, userController.viewPaymentDetails);
userRouter.get("/wishlist",isLogin, userController.viewWishlist);
userRouter.get("/settings",isLogin, userController.viewSettings);
userRouter.get("/delete-profile",isLogin, userController.viewDeleteProfile);
userRouter.get("/kyc",isLogin, userController.viewKyc);
userRouter.get("/flights", isLogin, userController.getFlights);
userRouter.get("/manage-booking", isLogin, userController.viewManageBooking);
userRouter.get("/seller-booking", isLogin, userController.viewSellerBooking);
userRouter.get("/manage-subscription", isLogin, userController.viewManageSubscription);
userRouter.get("/subscription-payment", isLogin, userController.viewSubscriptionPayment);
userRouter.get("/subscription", userController.viewPricing);
userRouter.get("/earnings", isLogin, userController.viewEarnings);
userRouter.get("/listings", isLogin, userController.viewListings);
userRouter.get("/add-listing", isLogin, userController.viewAddListing);
userRouter.get("/join-us", userController.viewJoinUs);
userRouter.get("/user-bookings", isLogin, userController.viewUserBookings);
userRouter.get("/user-bookings/:id", isLogin, userController.viewUserBookingDetail);
userRouter.get("/api/countries", userController.getApiCountries);
userRouter.get("/search-airports", userController.searchAirports);
userRouter.get("/search-airlines", userController.searchAirlines);
userRouter.get("/agent-subscription", isLogin, userController.viewAgentSubscription);
userRouter.get("/transactions", isLogin, userController.viewTransactions);
userRouter.get("/notifications", isLogin, userController.viewNotifications);
userRouter.get("/popular-flights", userController.viewPopularFlights);

userRouter.post("/sign-up", userController.signup);
userRouter.post("/sign-in", userController.signin);
userRouter.post("/forgot-password", userController.forgotPassword);
userRouter.post("/reset-password", userController.resetPassword);
userRouter.post("/send-otp", userController.sendOtp);
userRouter.post("/verify-otp", userController.verifyOtp);
userRouter.post("/flight-list", userController.findTicket);
userRouter.post("/flight-detail", userController.getFlightDetail);
userRouter.post("/seller-list", userController.getSellerList)
userRouter.post("/flight-booking",isLogin, userController.flightBooking);
userRouter.post("/update-email",isLogin, userController.updateEmail);
userRouter.post("/update-password",isLogin, userController.updatePassword);
userRouter.post("/update-profile",isLogin, upload.fields([
  { name: "image",  maxCount: 1 },
  { name: "logo", maxCount: 1 },
]), userController.updateProfile);
userRouter.post("/verify-card",isLogin,
  upload.fields([
  { name: "visitingCard", maxCount: 1 },
  { name: "panCard", maxCount: 1 },
]), userController.verifyCard);
userRouter.post(
  "/verify-aadhaar",
  isLogin,
  upload.fields([
    { name: "aadhaar1", maxCount: 1 },
    { name: "aadhaar2", maxCount: 1 },
  ]),
  userController.verifyAadhaar
);
userRouter.post("/subscription", isLogin, userController.subscription);
userRouter.post("/subscription-free", isLogin, userController.freeSubscription);
userRouter.post("/subscription-payment", isLogin, userController.subscriptionPayment);
userRouter.post("/renewal", isLogin, userController.renewal);
userRouter.post("/renewal-free", isLogin, userController.freeRenewal);
userRouter.post("/agent-subscription", isLogin, userController.agentSubscription);
userRouter.post("/add-flight", isLogin, userController.addFlight);
userRouter.post("/api/flights", isLogin, userController.getApiFlights);
userRouter.post("/add-bank", isLogin, userController.addBank);
userRouter.post("/support-ticket", upload.single('file'), isLogin, userController.addSupportTicket);
userRouter.post("/contact", userController.contact);
userRouter.post("/cancel-booking", upload.single('file'), isLogin, userController.cancelBooking);
userRouter.post("/support-booking/:id", upload.single('file'), isLogin, userController.bookingSupportTicket);
userRouter.post('/remove-account',isLogin, userController.removeBank);
userRouter.post("/service-request/:bookingId", isLogin, upload.array("file", 4), userController.addServiceRequest);
userRouter.post("/support-request/:bookingId", isLogin, upload.array("file", 4), userController.addSupportRequest);
userRouter.post("/addon-request/:bookingId", isLogin, userController.addAddonRequest);

userRouter.put("/update-listing", isLogin, userController.updateListingById);
userRouter.put("/update-seats", isLogin, userController.updateSeatById);
userRouter.put("/update-dates", isLogin, userController.updateDateById);
userRouter.put('/update-status', isLogin, userController.changeStatus);

module.exports = userRouter;