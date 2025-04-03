const express = require("express");
const userRouter = express();
const userController = require("../controllers/userController");
const session = require('express-session')
const {isLogin,isLogout} = require("../middleware/userAuth");
const upload = require("../multer/multer");

const preventCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
};
userRouter.use(preventCache);
userRouter.use((req, res, next) => {
    res.locals.userId = req.session.userId; 
    next();
  });

  userRouter.use((req, res, next)=> {
    const currentUrl = req.originalUrl;
    res.locals.pathname = req.path;
    if (!req.session.user_id && req.method === 'GET' &&  !['/sign-in', '/sign-up'].includes(currentUrl)) {
      req.session.originalUrl = req.originalUrl; 
    }
    next();
  });

userRouter.get("/", userController.viewHomepage);
userRouter.get("/flight-list", userController.viewFlightList);
userRouter.get("/flight-detail", isLogin, userController.viewFlightDetail);
userRouter.get("/flight-booking",isLogin, userController.viewFlightBooking);
userRouter.get("/about", userController.viewAbout);
userRouter.get("/contact", userController.viewContact);
userRouter.get("/sign-in", isLogout, userController.viewSignin);
userRouter.get("/sign-up", isLogout, userController.viewSignup);
userRouter.get("/sign-out", userController.signOut);
userRouter.get("/forgot-password",isLogin, userController.viewForgotPassword);
userRouter.get("/blog", userController.viewBlog);
userRouter.get("/blog-detail", userController.viewBlogDetail);
userRouter.get("/help", userController.viewHelp);
userRouter.get("/help-detail", userController.viewHelpDetail);
userRouter.get("/faq", userController.viewFAQ);
userRouter.get("/privacy-policy", userController.viewPrivacy);
userRouter.get("/terms-of-service", userController.viewTerms);
userRouter.get("/reset-password",isLogin, userController.viewResetPassword);
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

userRouter.post("/sign-up", userController.signup);
userRouter.post("/sign-in", userController.signin);
userRouter.post("/flight-list", userController.findTicket);
userRouter.post("/flight-detail", userController.getFlightDetail);
userRouter.post("/seller-list", userController.getSellerList)
userRouter.post("/forgot-password",isLogin, userController.forgotPassword);
userRouter.post("/reset-password",isLogin, userController.resetPassword);
userRouter.post("/flight-booking",isLogin, userController.flightBooking);
userRouter.post("/update-profile",isLogin, upload.single("image"), userController.updateProfile);
userRouter.post("/update-email",isLogin, userController.updateEmail);
userRouter.post("/update-password",isLogin, userController.updatePassword);
userRouter.post("/verify-card",isLogin, upload.single("image"), userController.verifyCard);
userRouter.post("/verify-aadhaar",isLogin, upload.single("image"), userController.verifyAadhaar);

module.exports = userRouter;