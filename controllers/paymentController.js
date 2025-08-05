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

  const amount = parseFloat(
    JSON.parse(req.body.bookingData).totalFare.replace(/[^0-9.]/g, "")
  );

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
      },
    });

    const orderSessionResp = await paymentHandler.orderSession({
      order_id: orderId,
      amount,
      currency: "INR",
      return_url: returnUrl,
      customer_id: "flight-user-" + req.session.userId
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

    const { bookingData, flightDetails, email, mobile_number, userId } = temp.data;

    const parsedBooking = JSON.parse(bookingData);
    const parsedFlight = JSON.parse(flightDetails);

    const { travelers, baseFare, otherServices, discount } = parsedBooking;
    const totalFare = orderStatusResp.amount;

          if (
        !travelers || !travelers.length ||
        !mobile_number || !email || !totalFare || !baseFare || !otherServices || !discount
      ) {
        return res.send("Missing booking data");
      }

      const newBooking = new Bookings({
        userId: userId,
        flight: parsedFlight._id,
        travelers,
        mobile_number,
        email,
        amount: totalFare,
        baseFare: baseFare.replace(/[^0-9.]/g, ""),
        tax: otherServices.replace(/[^0-9.]/g, ""),
        discount: discount.replace(/[^0-9.]/g, ""),
        payment_status: true
      });

      await newBooking.save();

      const newTransaction = new Transactions({
        bookingId: newBooking._id,
        userId: parsedFlight.sellerId,
        totalAmount: totalFare,
        baseFare: baseFare.replace(/[^0-9.]/g, ""),
        tax: otherServices.replace(/[^0-9.]/g, ""),
        discount: discount.replace(/[^0-9.]/g, ""),
        paymentStatus: "Paid",
        type:"Booking Payment"
      });

      await newTransaction.save();

      await Users.findByIdAndUpdate(userId, {
        $inc: {
          "transactions": 1,
          "transactionAmount": totalFare,
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
  // requests,
  // passengerName: travelers.map(t => `${t.title} ${t.first_name} ${t.last_name}`).join(", "),
  // tripType: stopsCount <= 1 ? "One Way" : "Connecting",
  // travelDate: parsedFlight.inventoryDates[0].departureDate,
  // ticketNumbers: travelers.map(t => t.ticketNumber || newBooking.bookingId), // fallback
  totalAmount: totalFare,
  baseFare: baseFare.replace(/[^0-9.]/g, ""),
  tax: otherServices.replace(/[^0-9.]/g, ""),
  discount: discount.replace(/[^0-9.]/g, ""),
  email: email,
  // referenceNo: parsedFlight.inventoryDates[0].pnr || "",
  // gateway: "CCAvenue",
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
          totalFare,
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

    return res.redirect("/bookings?success=true");
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

      return res.redirect("/manage-subscription");
    } else {
      return res.send(`<h3>Subscription failed or pending. Status: ${orderStatusResp.status}</h3>`);
    }
  } catch (err) {
    console.error("Subscription response error:", err);
    return res.send("Something went wrong");
  }
};
