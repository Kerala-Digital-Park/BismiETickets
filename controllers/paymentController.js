const path = require("path");
const crypto = require("crypto");
const {
  PaymentHandler,
  APIException,
  validateHMAC_SHA256
} = require("../utils/PaymentHandler");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const port = process.env.PORT || 3000;
const Bookings = require("../models/bookingModel");
const Transactions = require("../models/transactionModel");
const Users = require("../models/userModel");
const Flights = require("../models/flightModel");
const TempBooking = require("../models/tempBookingModel");
const Subscriptions = require("../models/subscriptionModel");
const TempSubscription = require("../models/tempSubscriptionModel");
const Requests = require("../models/requestModel");
const UserActivity = require("../models/userActivityModel");
const WalletTransactions = require("../models/walletTransactionModel");
const TempWallet = require("../models/tempWalletModel");
const Rewards = require("../models/rewardModel");
const puppeteer = require("puppeteer");

async function generatePDF(templatePath, data) {
  const html = await ejs.renderFile(templatePath, data);

  const browser = await puppeteer.launch({
    headless: "new", // or true if puppeteer > 20
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
  });

  await browser.close();
  return pdfBuffer;
}

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

const renderTemplate = (templatePath, data) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, (err, html) => {
      if (err) reject(err);
      else resolve(html);
    });
  });
};

exports.renderForm = (req, res) => {
  res.sendFile(path.join(__dirname, "../public/hdfc/initiatePaymentDataForm.html"));
};

exports.renderDynamicForm = (req, res) => {
  const { email, mobile_number, bookingData, flightDetails } = req.body;

  const totalFare = bookingData.totalFare?.replace(/[^0-9.]/g, "") || "1000";

  res.render("user/payment", {
    email,
    mobile_number,
    totalFare,
    bookingData,
    flightDetails,
  });
};

exports.initiatePayment = async (req, res) => {
  const orderId = `order_${Date.now()}`;
  const amount = 1 + crypto.randomInt(100);
  const returnUrl = `${req.protocol}://${req.hostname}:${port}/payment/response`;

  const paymentHandler = PaymentHandler.getInstance();

  try {
    const orderSessionResp = await paymentHandler.orderSession({
      order_id: orderId,
      amount,
      currency: "INR",
      return_url: returnUrl,
      customer_id: "sample-customer-id"
    });

    res.redirect(orderSessionResp.payment_links.web);
  } catch (error) {
        if (error instanceof APIException) {
            return res.send("PaymentHandler threw some error");
        }   
    return res.send("Something went wrong");
  }
};

exports.initiateBookingPayment = async (req, res) => {
  const token = crypto.randomUUID();
  const orderId = `order_${Date.now()}`;

  const parsedBooking = JSON.parse(req.body.bookingData);
  const totalFare = parseFloat(parsedBooking.totalFare.replace(/[^0-9.]/g, ""));
  const walletAmount = parseFloat(req.body.walletAmount || 0);
  const paymentOption = req.body.paymentOption;  // WALLET / RUPAY / UPI / CARD / NETBANKING

  const payableAmount = totalFare - walletAmount;  // ✅ subtract wallet

  // ✅ calculate extra charge based on method
  let extraCharge = 0;
  if (paymentOption === "CARD") {
    extraCharge = (totalFare * 0.025).toFixed(2);  // 2.5%
  } else if (paymentOption === "NETBANKING") {
    extraCharge = (totalFare * 0.015).toFixed(2);  // 1.5%
  }

  // ✅ final payable to HDFC
  const finalPayable = (parseFloat(payableAmount) + parseFloat(extraCharge)).toFixed(2);

  const returnUrl = `${req.protocol}://${req.get("host")}/payment/booking-response?token=${token}`;
  const paymentHandler = PaymentHandler.getInstance();

  try {
    // Save booking data temporarily
    await TempBooking.create({
      token,
      data: {
        bookingData: req.body.bookingData,
        flightDetails: req.body.flightDetails,
        email: req.body.email,
        mobile_number: req.body.mobile_number,
        userId: req.session.userId,
        walletAmount,
        paymentOption,
        extraCharge,        // ✅ save extraCharge for handleBookingResponse
        finalPayable        // ✅ save what was sent to HDFC
      },
    });

    const orderSessionResp = await paymentHandler.orderSession({
      order_id: orderId,
      amount:finalPayable,
      currency: "INR",
      return_url: returnUrl,
      customer_id: "flight-user-" + req.session.userId,
      payment_option: paymentOption,  // pass to HDFC so correct tab opens
      allowDefaultOptions: false
    });

    return res.redirect(orderSessionResp.payment_links.web);
  } catch (err) {
    console.error("Payment initiation failed:", err);
    return res.status(500).send("Payment failed. Try again.");
  }
};

exports.handleBookingResponse = async (req, res) => {
  const orderId = req.body.order_id || req.body.orderId;
  const token = req.query.token || req.body.token;
  const paymentHandler = PaymentHandler.getInstance();

  console.log("Received body:", req.body);
  console.log("Token:", token);
  console.log("Order ID:", orderId);

  if (!orderId || !token) return res.send("Missing order ID or token");

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);

    if (!validateHMAC_SHA256(req.body, paymentHandler.getResponseKey())) {
      return res.send("Signature verification failed");
    }

    const orderStatus = orderStatusResp.status;
    if (orderStatus !== "CHARGED") {
      return res.send(`<h3>Payment not completed. Status: ${orderStatus}</h3>`);
    }

    const temp = await TempBooking.findOne({ token });
    if (!temp) return res.send("Invalid or expired token");

    const { bookingData, flightDetails, email, mobile_number, userId, walletAmount, paymentOption, extraCharge } = temp.data;

    const parsedBooking = JSON.parse(bookingData);
    const parsedFlight = JSON.parse(flightDetails);

      const totalFareGateway = parseFloat(orderStatusResp.amount); // what HDFC collected (already includes extra charge)
      const finalFare = totalFareGateway + (walletAmount || 0);     // full booking cost

    const { travelers, baseFare, otherServices, discount } = parsedBooking;

          if (
        !travelers || !travelers.length ||
        !mobile_number || !email || !totalFareGateway || !baseFare || !otherServices || !discount
      ) {
        return res.send("Missing booking data");
      }

  const newBooking = new Bookings({
    userId,
    flight: parsedFlight._id,
    travelers: parsedBooking.travelers,
    mobile_number,
    email,
    amount: finalFare,            // full fare (wallet + gateway)
    baseFare: parsedBooking.baseFare.replace(/[^0-9.]/g, ""),
    tax: parsedBooking.otherServices.replace(/[^0-9.]/g, ""),
    discount: parsedBooking.discount.replace(/[^0-9.]/g, ""),
    payment_status: true,
    payment_method: paymentOption // ✅ store method
  });

  await newBooking.save();

  // ✅ Handle rewards for eligible users
await handleReward(userId, parsedBooking.baseFare, newBooking.bookingId);

async function handleReward(userId, baseFare, bookingId) {
  try {
    const user = await Users.findById(userId).populate("subscription");

    if (!user || user.userRole !== "User") return; // only normal users eligible
    if (!user.subscription) return;

    const validSubs = ["Pro", "Enterprise"];
    if (!validSubs.includes(user.subscription.subscription)) return;

    const cleanBaseFare = parseFloat(baseFare.replace(/[^0-9.]/g, "")) || 0;
    if (cleanBaseFare <= 0) return;

    const rewardPoints = (cleanBaseFare * 0.25) / 100; // 0.25%

    const reward = new Rewards({
      userId: user._id,
      title: "Flight Booking Reward",
      description: `Reward for booking #${bookingId}`,
      points: rewardPoints,
      status: "active",
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    });

    await reward.save();

    // Optionally update user reward balance
    await Users.findByIdAndUpdate(user._id, {
      $inc: { rewardBalance: rewardPoints }
    });
  } catch (err) {
    console.error("Reward handling error:", err);
  }
}

  // transaction entry (only for gateway part, not wallet)
  const newTransaction = new Transactions({
    bookingId: newBooking._id,
    userId: parsedFlight.sellerId,
    totalAmount: totalFareGateway, // paid through gateway
    baseFare: parsedBooking.baseFare.replace(/[^0-9.]/g, ""),
    tax: parsedBooking.otherServices.replace(/[^0-9.]/g, ""),
    discount: parsedBooking.discount.replace(/[^0-9.]/g, ""),
    paymentStatus: "Paid",
    type: "Booking Payment"
  });
  await newTransaction.save();

      const newActivity = new UserActivity({
        user: userId,
        id: newBooking._id.toString(),
        type: "booking",
        content: `Booking made for flight ${parsedFlight.flightNumber} on ${newBooking.createdAt.toLocaleDateString()}`
      });

      await newActivity.save();

        if (walletAmount && walletAmount > 0) {
    await Users.findByIdAndUpdate(userId, { $inc: { walletBalance: -walletAmount } });

      // Create Wallet Transaction entry
  const walletTxn = new WalletTransactions({
    userId,
    amount: walletAmount,     // only the amount actually taken from wallet
    status: "Paid",
    purpose: purpose: "Flight Booking" // optional detail
  });

  await walletTxn.save();

  }

      await Users.findByIdAndUpdate(userId, {
        $inc: {
          "transactions": 1,
          "transactionAmount": totalFareGateway,
        },
      });

      const flightId = parsedFlight._id;
      const pnr = parsedFlight.inventoryDates[0].pnr;      
      const updatedFlight = await Flights.findOneAndUpdate(
        { _id: flightId, "inventoryDates.pnr": pnr },
        {
          $inc: {
            "inventoryDates.$.seatsBooked": travelers.length,
          },
          $pull: {
            "inventoryDates.$.seatsHold": { userId: userId } // ✅ remove only this user’s hold
          }
        },
        { new: true }
      );

      if (!updatedFlight) {
        return res.status(404).send("Flight or inventory date not found");
      }

const stopsCount = parsedFlight.stops?.length || 0;

const requests = await Requests.find({
  bookingId: newBooking._id,
  category: "service"
}).sort({ createdAt: -1 });

function computeLayovers(stops) {
  const layovers = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const currentStop = stops[i];
    const nextStop = stops[i + 1];

    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.replace(' hrs', '').trim().split(':').map(Number);
      return { hours: hours || 0, minutes: minutes || 0 };
    };

    const arrDate = new Date(currentStop.arrivalDay);
    const depDate = new Date(nextStop.departureDay);

    const arrTime = parseTime(currentStop.arrivalTime);
    const depTime = parseTime(nextStop.departureTime);

    arrDate.setHours(arrTime.hours, arrTime.minutes, 0, 0);
    depDate.setHours(depTime.hours, depTime.minutes, 0, 0);

    const layoverMs = depDate - arrDate;
    const mins = Math.floor(layoverMs / 60000);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;

    layovers.push({
      index: i,
      city: currentStop.arrivalCity,
      duration: `${hrs.toString().padStart(2, '0')}h ${rem.toString().padStart(2, '0')}m`,
    });
  }

  return layovers;
}

// In your controller before rendering
const layovers = computeLayovers(parsedFlight.stops || []);

const invoiceTemplatePath = path.join(__dirname, '../views/user/invoice.ejs');

const invoicePDF = await generatePDF(invoiceTemplatePath, {
  invoiceNo: newBooking.bookingId,              
  issuedDate: new Date().toLocaleDateString('en-GB'), // dd-mm-yyyy
  booking: newBooking,
  flight: parsedFlight, // includes from, to, airline, etc.
  transactions: newTransaction,
  travelers,
  totalAmount: totalFareGateway,
  baseFare: baseFare.replace(/[^0-9.]/g, ""),
  tax: (parseFloat(otherServices.replace(/[^0-9.]/g, "")) || 0) + (parseFloat(extraCharge) || 0),
  discount: discount.replace(/[^0-9.]/g, ""),
  email: email,
});

const templateFileName =
  stopsCount <= 1
    ? 'mail-oneWayBookingConfirmation.ejs'
    : 'mail-connectingBookingConfirmation.ejs';

    console.log("templateFileName", templateFileName);
    try {
      const templatePath = path.join(__dirname, '../views/user/', templateFileName);
      const pdfBuffer = await generatePDF(templatePath, {
          travelers,
          flightDetails: parsedFlight,
          totalFare: totalFareGateway,
          baseFare: baseFare.replace(/[^0-9.]/g, ""),
          otherServices: otherServices.replace(/[^0-9.]/g, ""),
          discount: discount.replace(/[^0-9.]/g, ""),
          bookingId: newBooking.bookingId,
          requests,
          layovers,
        });

        await transporter.sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: 'Your Flight Booking Confirmation',
          text: 'Please find your flight confirmation attached as a PDF.',
          attachments: [
          {
            filename: 'BookingConfirmation.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
          {
            filename: 'Invoice.pdf',
            content: invoicePDF,
            contentType: 'application/pdf',
        },
          ],
        });
      } catch (emailErr) {
        console.error('Error sending confirmation email:', emailErr);
      }

    // ✅ Delete temp booking data
    await TempBooking.deleteOne({ token });

    return res.redirect("/bookings?success=true&clearWallet=1");
  } catch (err) {
    console.error("Booking response error:", err);
    return res.send("Something went wrong");
  }
};

exports.handleResponse = async (req, res) => {
  const orderId = req.body.order_id || req.body.orderId;
  const paymentHandler = PaymentHandler.getInstance();

  if (orderId === undefined) {
    return res.send("Something went wrong");
  }

  console.log("Received body:", req.body);
console.log("Expected HMAC:", validateHMAC_SHA256(req.body, paymentHandler.getResponseKey()));

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);

    if (!validateHMAC_SHA256(req.body, paymentHandler.getResponseKey())) {
      return res.send("Signature verification failed");
    }

    const orderStatus = orderStatusResp.status;
    let message = "";
    switch (orderStatus) {
      case "CHARGED":
        message = "order payment done successfully";
        break;
      case "PENDING":
      case "PENDING_VBV":
        message = "order payment pending";
        break;
      case "AUTHORIZATION_FAILED":
        message = "order payment authorization failed";
        break;
      case "AUTHENTICATION_FAILED":
        message = "order payment authentication failed";
        break;
      default:
        message = "order status " + orderStatus;
        break;
    }

    const html = makeOrderStatusResponse(
      "Merchant Payment Response Page",
      message,
      req,
      orderStatusResp
    );
    res.set("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error(error);
     if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    res.send("Something went wrong");
  }
};

exports.initiateRefund = async (req, res) => {
  const paymentHandler = PaymentHandler.getInstance();

  try {
    const refundResp = await paymentHandler.refund({
      order_id: req.body.order_id,
      amount: req.body.amount,
      unique_request_id: req.body.unique_request_id || `refund_${Date.now()}`,
    });
    const html = makeOrderStatusResponse(
      "Merchant Refund Page",
      `Refund status:- ${refundResp.status}`,
      req,
      refundResp
    );
    res.set("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error(error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
}

// [MERCHAT_TODO]:- Please modify this as per your requirements
const makeOrderStatusResponse = (title, message, req, response) => {
  let inputParamsTableRows = "";
  for (const [key, value] of Object.entries(req.body)) {
    const pvalue = value !== null ? JSON.stringify(value) : "";
    inputParamsTableRows += `<tr><td>${key}</td><td>${pvalue}</td></tr>`;
  }

  let orderTableRows = "";
  for (const [key, value] of Object.entries(response)) {
    const pvalue = value !== null ? JSON.stringify(value) : "";
    orderTableRows += `<tr><td>${key}</td><td>${pvalue}</td></tr>`;
  }

  return `
        <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            <h1>${message}</h1>

            <center>
                <font size="4" color="blue"><b>Return url request body params</b></font>
                <table border="1">
                    ${inputParamsTableRows}
                </table>
            </center>

            <center>
                <font size="4" color="blue"><b>Response received from order status payment server call</b></font>
                <table border="1">
                    ${orderTableRows}
                </table>
            </center>
        </body>
        </html>
    `;
};

exports.initiateSubscriptionPayment = async (req, res) => {
  const { email, price, subscription, role } = req.body;
  const userId = req.session.userId;
  const orderId = `order_${Date.now()}`;

  const returnUrl = `${req.protocol}://${req.get("host")}/payment/subscription-response`;
  const paymentHandler = PaymentHandler.getInstance();

  try {
    // Save to temp collection
    await TempSubscription.create({
      orderId,
      userId,
      email,
      price,
      subscription,
      role,
    });

    // Initiate payment
    const orderSessionResp = await paymentHandler.orderSession({
      order_id: orderId,
      amount: parseFloat(price),
      currency: "INR",
      return_url: returnUrl,
      customer_id: `sub-user-${userId}`
    });

    return res.redirect(orderSessionResp.payment_links.web);
  } catch (err) {
    console.error("❌ Failed to initiate subscription:", err);
    res.send("Something went wrong");
  }
};

exports.handleSubscriptionResponse = async (req, res) => {
  const orderId = req.body.order_id;
  const paymentHandler = PaymentHandler.getInstance();

  if (!orderId) {
    return res.send("Missing order ID");
  }

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);
    const isValid = validateHMAC_SHA256(req.body, paymentHandler.getResponseKey());

    if (!isValid) {
      return res.send("Signature verification failed");
    }

    if (orderStatusResp.status === "CHARGED") {
      // Fetch subscription details from temp collection
      const tempData = await TempSubscription.findOneAndDelete({ orderId });

      if (!tempData) {
        return res.send("❌ Subscription data not found or expired.");
      }

      const { email, price, subscription, role, userId } = tempData;
      const user = await Users.findById(userId);

      if (!user) {
        return res.send("User not found");
      }

      const plan = await Subscriptions.findOne({ subscription, role });
      if (!plan) {
        return res.send("Subscription plan not found");
      }

      const today = new Date();
      const expiryDate = new Date(today);
      expiryDate.setDate(today.getDate() + 30);

      user.subscription = plan._id;
      user.subscriptionDate = today;
      user.expiryDate = expiryDate;
      user.transactions = 0;
      user.transactionAmount = 0;
      user.userRole = role;

      await user.save();

    plan.noOfPurchases += 1;
    await plan.save();

      return res.redirect("/manage-subscription");
    } else {
      return res.send(`<h3>Subscription failed or pending. Status: ${orderStatusResp.status}</h3>`);
    }
  } catch (err) {
    console.error("Subscription response error:", err);
    return res.send("Something went wrong");
  }
};

// 1️⃣ Initiate Wallet Load Payment
exports.initiateLoadWalletPayment = async (req, res) => {
  const { amount, method } = req.body;
  const userId = req.session.userId;
  
  if (!amount || !method) {
    return res.status(400).json({ success: false, message: "Amount and payment method required" });
  }

  const orderId = `wallet_${Date.now()}`;
  const returnUrl = `${req.protocol}://${req.get("host")}/payment/load-wallet-response`;
  
  const paymentHandler = PaymentHandler.getInstance();
  console.log("Load wallet payment instance created ")

  try {
    // Save to temp wallet collection (like TempSubscription)
    await TempWallet.create({
      orderId,
      userId,
      amount,
      method,
      purpose: "Loaded cash",
    });
    // Initiate HDFC payment
    const orderSessionResp = await paymentHandler.orderSession({
      order_id: orderId,
      amount: parseFloat(amount),
      currency: "INR",
      return_url: returnUrl,
      customer_id: `wallet-user-${userId}`,
    });
    
    return res.redirect(orderSessionResp.payment_links.web);
  } catch (err) {
    console.error("❌ Failed to initiate wallet load:", err);
    res.status(500).send("Something went wrong while initiating wallet load.");
  }
};

// 2️⃣ Handle Wallet Payment Response
exports.handleLoadWalletResponse = async (req, res) => {
    console.log("Load wallet payment instance created ")

  const orderId = req.body.order_id;
  const paymentHandler = PaymentHandler.getInstance();

  if (!orderId) {
    return res.send("Missing order ID");
  }

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);

    // Verify signature
    const isValid = validateHMAC_SHA256(req.body, paymentHandler.getResponseKey());
    if (!isValid) {
      return res.send("❌ Signature verification failed");
    }

    // Payment successful
    if (orderStatusResp.status === "CHARGED") {
      // Fetch and delete temp record
      const tempData = await TempWallet.findOneAndDelete({ orderId });
      if (!tempData) {
        return res.send("❌ Wallet temp data not found or expired.");
      }

      const { userId, amount, purpose, method } = tempData;
      const user = await Users.findById(userId);

      if (!user) {
        return res.send("❌ User not found.");
      }

      // Create wallet transaction
      const walletTxn = new WalletTransactions({
        userId,
        amount,
        status: "Loaded",
        purpose: purpose || "Loaded cash",
      });
      await walletTxn.save();

      // Update user wallet balance
      user.walletBalance += parseFloat(amount);
      await user.save();

      return res.redirect("/wallet-details"); // redirect user to wallet details page
    } else {
      // Payment failed or pending → save txn as failed
      await WalletTransactions.create({
        userId: req.session.userId,
        amount: req.body.amount || 0,
        status: "Cancelled",
        purpose: "Wallet load failed",
      });

      return res.send(`<h3>Wallet load failed or pending. Status: ${orderStatusResp.status}</h3>`);
    }
  } catch (err) {
    console.error("Wallet load response error:", err);
    return res.send("Something went wrong processing wallet response.");
  }
};