const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.get("/form", paymentController.renderForm);
router.post("/payment", paymentController.initiatePayment);
router.post("/response", paymentController.handleResponse);
router.post("/refund", paymentController.initiateRefund);
router.post("/render-form", paymentController.renderDynamicForm);
router.post("/initiate-booking", paymentController.initiateBookingPayment);
router.post("/booking-response", paymentController.handleBookingResponse);
router.post("/initiate-subscription", paymentController.initiateSubscriptionPayment);
router.post("/subscription-response", paymentController.handleSubscriptionResponse);
router.post("/initiate-load-wallet", paymentController.initiateLoadWalletPayment);
router.post("/load-wallet-response", paymentController.handleLoadWalletResponse);
router.post("/initiate-request-payment", paymentController.initiateRequestPayment);
router.post("/request-payment-response", paymentController.handleRequestPaymentResponse);
router.post("/initiate-renewal", paymentController.initiateRenewalPayment);
router.post("/renewal-response", paymentController.handleRenewalResponse);

module.exports = router;
