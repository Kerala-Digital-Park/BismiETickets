const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Flights = require("../models/flightModel");
const Users = require("../models/userModel");
const Bookings = require("../models/bookingModel");
const Subscriptions = require("../models/subscriptionModel");
const Airports = require("../models/airportModel");
const Airlines = require("../models/airlineModel");
const Transactions = require("../models/transactionModel");
const Counter = require("../models/counterModel");
const BankUpdate = require("../models/bankUpdateModel");
const KycUpdate = require("../models/kycUpdateModel");
const Support = require("../models/supportModel");
const PopularFlight = require("../models/popularFlightModel");
const ProfileUpdate = require("../models/profileUpdateModel");
const Coupons = require("../models/couponModel");
const Requests = require("../models/requestModel");
const FilterAirport = require("../models/filterAirportModel");
const LoginActivity = require("../models/loginActivityModel");
const SessionActivity = require("../models/sessionActivityModel");
const useragent = require("useragent");
const requestIp = require("request-ip");
const { countries } = require('countries-list');
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const ejs = require('ejs');
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpay = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

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

const viewHomepage = async (req, res) => {
  const userId = req.session.userId;
  let message = null;
  let user = null;

  try {
    const popularFlights = await PopularFlight.find().limit(6);

    if (userId) {
      user = await Users.findById(userId); // Fetch user from DB
      const userKyc = await KycUpdate.findOne({ userId: userId });

      if (userKyc && userKyc.status === "rejected") {
        message = "Your KYC is rejected or suspended. Please complete your KYC to book flights.";
      }
    }

    res.render("user/home", {
      popularFlights,
      userId,
      user,          
      message       
    });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewDashboard = async (req, res) => {
  const userId = req.session.userId; 
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const skip = (page - 1) * limit;

  try {
    const flights = await Flights.find({ sellerId: userId });

    const sellerOwnBookings = await Bookings.find({ userId: userId });

    let flightSearchIds = [];

    if (search) {
      const matchingFlights = await Flights.find({
        $or: [
          { fromCity: { $regex: search, $options: 'i' } },
          { toCity: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      flightSearchIds = matchingFlights.map(f => f._id);
    }

    const allBookings = await Bookings.find()
      .populate("flight")
      .populate("userId");

    let userBookings = allBookings.filter(booking => {
      return booking.flight?.sellerId?.toString() === userId;
    });

    if (search) {
      userBookings = userBookings.filter(booking =>
        booking.bookingId?.toLowerCase().includes(search.toLowerCase()) ||
        flightSearchIds.some(id => id.toString() === booking.flight?._id?.toString())
      );
    }

    const totalPages = Math.ceil(userBookings.length / limit);
    const paginatedBookings = userBookings.slice(skip, skip + limit);

    const transactions = await Transactions.find({ userId });

    // Sum transaction amounts (parse strings to numbers safely)
    const totalTransactionAmount = transactions.reduce((sum, tx) => {
      const amount = parseFloat(tx.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    res.render("user/dashboard", {
      flights,
      bookings: sellerOwnBookings,     
      userBookings: paginatedBookings, 
      search,
      currentPage: page,
      totalPages,
      totalTransactionAmount,
      transactions
    });

  } catch (error) {
    console.error("Error rendering dashboard:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewFlightList = async (req, res) => {
  try {
    const {
      from,
      to,
      departureDate,
      returnDate,
      adults,
      children,
      infants,
      flexible,
      refundable,
      minPrice,
      maxPrice,
      stops,
      airlines,
      layovers,
    } = req.query;

    const requestDetails = {
      from,
      to,
      departureDate,
      returnDate,
      flexible: flexible === "true",
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
    };

    const totalPassengers = requestDetails.adults + requestDetails.children + requestDetails.infants;

    let flights = await Flights.find({ isActive: true, status: "pending" });

    const stopsArr = Array.isArray(stops) ? stops.map(Number) : stops ? [parseInt(stops)] : [];
    const airlinesArr = Array.isArray(airlines) ? airlines : airlines ? [airlines] : [];
    const layoversArr = Array.isArray(layovers) ? layovers : layovers ? [layovers] : [];

    const isDateInRange = (dateStr, startDateStr, endDateStr) => {
      const date = new Date(dateStr);
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      return date >= start && date <= end;
    };

    const filteredFlights = flights.filter((flight) => {
      const inventory = flight.inventoryDates?.[0];
      if (!inventory) return false;

      const availableSeats = inventory.seats || 0;
      const bookedSeats = inventory.seatsBooked || 0;
      const remainingSeats = availableSeats - bookedSeats;
      if (remainingSeats < totalPassengers) return false;

      const matchesRoute = requestDetails.flexible
        ? isDateInRange(flight.departureDate, departureDate, returnDate) &&
          flight.from.toUpperCase() === from &&
          flight.to.toUpperCase() === to
        : flight.departureDate === departureDate &&
          flight.from.toUpperCase() === from &&
          flight.to.toUpperCase() === to;

      const matchesRefundable = refundable ? flight.refundable === true : true;

      const fare = inventory?.fare?.adults || Infinity;
      const matchesPrice =
        (!minPrice || fare >= parseInt(minPrice)) &&
        (!maxPrice || fare <= parseInt(maxPrice));

      const actualStops = flight.stops.length - 1;
      const matchesStops = stopsArr.length ? stopsArr.includes(actualStops) : true;

      const airline = flight.stops?.[0]?.airline || "Unknown";
      const matchesAirlines = airlinesArr.length ? airlinesArr.includes(airline) : true;

      const layoverCities = flight.stops.slice(0, -1).map(stop => stop.arrivalCity);
      const matchesLayover = layoversArr.length
        ? layoversArr.some(city => layoverCities.includes(city))
        : true;

      return (
        matchesRoute &&
        matchesRefundable &&
        matchesPrice &&
        matchesStops &&
        matchesAirlines &&
        matchesLayover
      );
    });

    // Compute min/max fare
    const fares = filteredFlights.map(f => f.inventoryDates?.[0]?.fare?.adults || 0);
    const minFare = fares.length > 0 ? Math.min(...fares) : 0;
    const maxFare = fares.length > 0 ? Math.max(...fares) : 0;

    // Best fare per airline
    const airlineMap = new Map();
    filteredFlights.forEach((flight) => {
      const inventory = flight.inventoryDates?.[0];
      const airline = flight.stops?.[0]?.airline || "Unknown";
      const fare = inventory?.fare?.adults || Infinity;

      const availableSeats = inventory.seats || 0;
      const bookedSeats = inventory.seatsBooked || 0;
      const remainingSeats = availableSeats - bookedSeats;

      if (remainingSeats >= totalPassengers) {
        if (!airlineMap.has(airline) || fare < airlineMap.get(airline).fare) {
          airlineMap.set(airline, { flight, fare });
        }
      }
    });

    // Build airline list and layover airport list from filteredFlights
const airlineSet = new Set();
const layoverSet = new Set();

filteredFlights.forEach((flight) => {
  const airline = flight.stops?.[0]?.airline;
  if (airline) airlineSet.add(airline);

  const layovers = flight.stops?.slice(0, -1).map(stop => stop.arrivalCity);
  layovers.forEach(city => layoverSet.add(city));
});

const availableAirlines = Array.from(airlineSet);
const availableLayovers = Array.from(layoverSet);

    const refilteredFlights = Array.from(airlineMap.values()).map(entry => entry.flight);

    res.render("user/flight-list", {
      flights: filteredFlights,
      refilteredFlights,
      requestDetails,
      minFare,
      maxFare,
      availableAirlines,
      availableLayovers,
    });
    

  } catch (error) {
    console.error("Error in viewFlightList:", error);
    res.render("error", { error });
  }
};

const viewFlightBooking = async (req, res) => {
  try {
    res.render("user/flight-booking", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewAbout = async (req, res) => {
  try {
    res.render("user/about", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewContact = async (req, res) => {
  try {
    res.render("user/contact", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

// const viewSignin = async (req, res) => {
//   try {
//     res.set(
//       "Cache-Control",
//       "no-store, no-cache, must-revalidate, proxy-revalidate"
//     );
//     res.set("Pragma", "no-cache");
//     res.set("Expires", "0");

//     res.render("user/sign-in", { message: "" });
//   } catch (error) {
//     console.error(error);
//     res.render("error", { error });
//   }
// };
const otpStore = {}; // Store OTP in memory

// View Sign-in Page
const viewSignin = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    const isTrustedDevice = req.cookies["trusted_device"] === "true";

    res.render("user/sign-in", {
      message: "",
      messageType: "",
      isTrustedDevice
    });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

// Send OTP
const sendOtp = async (req, res) => {
  const { email } = req.body;

  // Skip OTP if trusted device
  if (req.cookies?.trusted_device === "true") {
    return res.json({ success: true, skipOtp: true, message: "Trusted device detected, skipping OTP." });
  }

  const user = await Users.findOne({ email });
  if (!user) return res.json({ success: false, message: "Email not found." });

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min expiry

  otpStore[email] = { otp, expiresAt };

  await transporter.sendMail({
    from: `"BismiETickets" <${process.env.EMAIL}>`,
    to: email,
    subject: "Your OTP for Login",
    html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`
  });

  res.json({ success: true, skipOtp: false });
};

// Verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp, trusted } = req.body;

  const otpData = otpStore[email];
  if (!otpData) return res.json({ success: false, message: "OTP not found or expired." });

  if (Date.now() > otpData.expiresAt) {
    delete otpStore[email];
    return res.json({ success: false, message: "OTP expired." });
  }

  if (otpData.otp.toString() !== otp) {
    return res.json({ success: false, message: "Invalid OTP." });
  }

  delete otpStore[email];

  // Mark OTP verified in session
  req.session.otpVerified = true;

  // Save trusted device cookie
  if (trusted) {
    res.cookie("trusted_device", "true", {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict"
    });
  }

  res.json({ success: true });
};

// Sign in
const signin = async (req, res) => {
  try {
    const { email, password, trustDevice } = req.body;

    const user = await Users.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isTrustedDevice = req.cookies["trusted_device"] === "true";
    if (!isTrustedDevice && !req.session.otpVerified) {
      return res.status(401).json({ success: false, message: "OTP required" });
    }

    // Device & session info
    const ip = requestIp.getClientIp(req);
    const agent = useragent.parse(req.headers["user-agent"]);
    const uaString = req.headers["user-agent"].toLowerCase();
    let platform = /mobile|iphone|android|blackberry|phone/i.test(uaString)
      ? "Mobile"
      : /tablet|ipad/i.test(uaString)
      ? "Tablet"
      : "Computer";

    req.session.userId = user._id.toString();
    req.session.browser = `${agent.family} on ${agent.os.family}`;
    req.session.platform = platform;
    req.session.ip = ip;
    req.session.loginTime = new Date().toISOString();

    await LoginActivity.create({
      user: user._id,
      ip,
      browser: `${agent.family} on ${agent.os.family}`,
      platform
    });

      await SessionActivity.create({
      user: user._id,
      ip,
      browser: `${agent.family} on ${agent.os.family}`,
      platform,
      loginTime: new Date()
    });

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "7d" });
    req.session.token = token;

    // Load from environment (default to 30 days if not set)
    const TRUSTED_DEVICE_DAYS = parseInt(process.env.TRUSTED_DEVICE_DAYS || "30", 10);

    if (trustDevice) {
      res.cookie("trusted_device", "true", {
        maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
      });
    }

    delete req.session.otpVerified;

    const redirectUrl = req.session?.originalUrl || "/";
    if (req.session) delete req.session.originalUrl;

    req.session.save((err) => {
      if (err) return res.status(500).json({ error: "Session save failed" });
      res.json({ success: true, message: "Login successful", redirect: redirectUrl });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewSignup = async (req, res) => {
  try {
    res.render("user/sign-up", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewForgotPassword = async (req, res) => {
  try {
    res.render("user/forgot-password", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewBlog = async (req, res) => {
  try {
    res.render("user/blog", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewBlogDetail = async (req, res) => {
  try {
    res.render("user/blog-detail", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewHelp = async (req, res) => {
  const userId = req.session.userId; // Get user ID from session
  try {
    const tickets = await Support.find({ userId: userId }).sort({ createdAt: -1 });

    res.render("user/help", { tickets});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewHelpDetail = async (req, res) => {
  try {
    res.render("user/help-detail", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewHelpContact = async (req, res) => {
  try {
    res.render("user/contact2", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewFAQ = async (req, res) => {
  try {
    res.render("user/faq", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewTerms = async (req, res) => {
  try {
    res.render("user/terms", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};
const viewPrivacy = async (req, res) => {
  try {
    res.render("user/privacy", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewCookies = async (req, res) => {
  try {
    res.render("user/cookies", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewDisclaimer = async (req, res) => {
  try {
    res.render("user/disclaimer", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSupportTicket = async (req, res) => {
  try {
    res.render("user/support", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const findTicket = async (req, res) => {
  console.log("Find flights");

  try {
    const {
      fixedFrom,
      fixedTo,
      from,
      to,
      departure,
      departureDate,
      returnDate,
      adults,
      children,
      infants,
      dateTypeCheckbox,
      stops,
      airlines,
      layovers,
      refundable,
      minPrice,
      maxPrice,
    } = req.body;

    const flexible = dateTypeCheckbox === "on";

    // Validate basic input
    if (flexible && (!from || !to || !departureDate || !returnDate)) {
      return res.redirect("/");
    }

    if (!flexible && (!fixedFrom || !fixedTo || !departure)) {
      return res.redirect("/");
    }

    const requestDetails = {
      from,
      to,
      fixedFrom,
      fixedTo,
      departure,
      returnDate,
      departureDate,
      flexible: flexible === true,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
    };

    const totalPassengers =
      requestDetails.adults + requestDetails.children + requestDetails.infants;

    const flights = await Flights.find();

    const isDateInRange = (dateStr, startDateStr, endDateStr) => {
      const date = new Date(dateStr);
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      return date >= startDate && date <= endDate;
    };

    let filteredFlights = flights.filter((flight) => {
      const inventory = flight.inventoryDates?.[0];
      if (!inventory) return false;

      const availableSeats = inventory.seats || 0;
      const bookedSeats = inventory.seatsBooked || 0;
      const remainingSeats = availableSeats - bookedSeats;

      const matchesRoute = flexible
        ? (
            isDateInRange(flight.departureDate, departureDate, returnDate) &&
            flight.from.toUpperCase() === from &&
            flight.to.toUpperCase() === to
          )
        : (
            flight.departureDate === departure &&
            flight.from.toUpperCase() === fixedFrom &&
            flight.to.toUpperCase() === fixedTo
          );

      return matchesRoute && remainingSeats >= totalPassengers;
    });

    // Apply filters from sidebar:
    filteredFlights = filteredFlights.filter((flight) => {
      const inventory = flight.inventoryDates?.[0];
      if (!inventory) return false;

      const airline = flight.stops?.[0]?.airline || "";
      const fare = inventory.fare?.adults || 0;
      const layoverCities = flight.stops?.slice(0, -1).map((stop) => stop.arrivalCity);
      const stopCount = flight.stops?.length-1 || 0;

      // Refundable filter
      if (refundable === "true" && flight.refundable !== true) return false;

      // Stops filter (0, 1, 2+)
      if (stops) {
        const selectedStops = Array.isArray(stops) ? stops : [stops];
        if (!selectedStops.includes(stopCount >= 2 ? "2" : stopCount.toString())) {
          return false;
        }
      }

      // Airline filter
      if (airlines) {
        const selectedAirlines = Array.isArray(airlines) ? airlines : [airlines];
        if (!selectedAirlines.includes(airline)) return false;
      }

      // Layover filter
      if (layovers) {
        const selectedLayovers = Array.isArray(layovers) ? layovers : [layovers];
        const match = layoverCities?.some((city) => selectedLayovers.includes(city));
        if (!match) return false;
      }

      // Price range filter
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPrice) || Infinity;
      if (fare < min || fare > max) return false;

      return true;
    });

    // Build airline map (best fare flight per airline)
    const airlineMap = new Map();

    filteredFlights.forEach((flight) => {
      const inventory = flight.inventoryDates?.[0];
      const airline = flight.stops?.[0]?.airline || "Unknown";
      const fare = inventory?.fare?.adults || Infinity;

      const availableSeats = inventory.seats || 0;
      const bookedSeats = inventory.seatsBooked || 0;
      const remainingSeats = availableSeats - bookedSeats;

      if (remainingSeats >= totalPassengers) {
        if (!airlineMap.has(airline) || fare < airlineMap.get(airline).fare) {
          airlineMap.set(airline, { flight, fare });
        }
      }
    });

    const airlineSet = new Set();
    const layoverSet = new Set();

    filteredFlights.forEach((flight) => {
      const airline = flight.stops?.[0]?.airline;
      if (airline) airlineSet.add(airline);

      const layovers = flight.stops?.slice(0, -1).map((stop) => stop.arrivalCity);
      layovers?.forEach((city) => layoverSet.add(city));
    });

    const availableAirlines = Array.from(airlineSet);
    const availableLayovers = Array.from(layoverSet);

    const refilteredFlights = Array.from(airlineMap.values()).map(
      (entry) => entry.flight
    );

    const fares = filteredFlights.map((f) => f.inventoryDates?.[0]?.fare?.adults || 0);
    const minFare = fares.length > 0 ? Math.min(...fares) : 0;
    const maxFare = fares.length > 0 ? Math.max(...fares) : 0;

    res.render("user/flight-list", {
      flights: filteredFlights,
      refilteredFlights,
      requestDetails,
      minFare,
      maxFare,
      availableAirlines,
      availableLayovers,
    });
  } catch (error) {
    console.error("Error in findTicket:", error);
    res.render("error", { error });
  }
};

let flightRequests  // Temporary in-memory storage

const getFlightDetail = async (req, res) => {
  const { flightId, agentId } = req.body;
  const userId = req.session.userId;
  try {
    const user = await Users.findById(userId).populate("subscription");
    console.log(user);

    if (
      user.transactions >= user.subscription.transactionLimit ||
      user.transactionAmount >= user.subscription.maxTransactionAmount
    ) {
      const redirectUrl = user.userRole === "Agent" ? "/join-us#pricing" : "/subscription";
      return res.status(400).json({
        message: "Transaction limit exceeded or amount too high. Upgrade Now",
        redirectUrl,
      });
    }
    res.status(200).json({ redirectUrl: `/flight-detail?fId=${flightId}&aId=${agentId}` });
  } catch (error) {
    console.error("Error fetching flight details:", error);
    res.status(400).json({ error: "Invalid flight data" });
  }
};

const getSellerList = async (req, res) => {
  const { id, requestDetails } = req.body;

  try {
    // Store requestDetails temporarily in memory
    flightRequests = requestDetails;
    console.log("flightRequests",flightRequests)

    // Send redirect URL to frontend
    res.status(200).json({ redirectUrl: `/flights?id=${id}` });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    res.status(400).json({ error: "Invalid flight data" });
  }
};

// Handle GET request to retrieve data after redirect
const viewFlightDetail = async (req, res) => {
  const { fId, aId } = req.query;
  const userId = req.session.userId;

  try {
    const flightDetails = await Flights.findById(fId);
    if (!flightDetails) {
      return res.status(404).send("Flight not found");
    }

    const userDetails = await Users.findById(userId);
    if (!userDetails) {
      return res.status(404).send("User not found")
    }

    const subscriptionId = userDetails.subscription;
    const subscription = await Subscriptions.findById(subscriptionId);

    // Retrieve requestDetails from memory and remove it
    const requestDetails = flightRequests;
    console.log("requestDetails",requestDetails);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const coupons = await Coupons.find({
      expiry: { $gte: today },
    });

    res.render("user/flight-detail", {
      flightDetails,
      requestDetails,
      subscription,
      coupons, 
    });
  } catch (error) {
    console.error("Error fetching flight details:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getFlights = async (req, res) => {
  const { id } = req.query;
  try {
    const flight = await Flights.findById(id);
    if (!flight) {
      return res.status(404).send("Flight not found");
    }

    const { from, to, departureDate, stops } = flight;
    const airline = stops[0]?.airline;
    const flightNumber = stops[0]?.flightNumber;

    const requestDetails = flightRequests;
    console.log("requestDetails", requestDetails);

    totalPassengers = parseInt(requestDetails.adults) + parseInt(requestDetails.children) + parseInt(requestDetails.infants); 
    console.log("Total passengers", totalPassengers);

    let matchingFlights = await Flights.find({
      from: flight.from,
      to: flight.to,
      "stops.0.airline": flight.stops[0].airline,
      "stops.0.flightNumber": flight.stops[0].flightNumber,
      departureDate: flight.departureDate,
    });

    matchingFlights = matchingFlights.filter(f => f.inventoryDates[0].seats >= totalPassengers);
    console.log("Matching flights", matchingFlights); 

    const sellerIds = matchingFlights.map(f => f.sellerId);
    const agentsData = await Users.find({ _id: { $in: sellerIds } });

    const agentsWithFlights = matchingFlights.map(f => {
  const agent = agentsData.find(a => a._id.toString() === f.sellerId.toString());
  return { agent, flight: f };
});

    res.render("user/flights", { id, flight,   agentsWithFlights, requestDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewManageBooking = async (req, res) => {
  const bookingId = req.query.id;
  try {
    const bookings = await Bookings.findById(bookingId).populate("userId").populate("flight");
    const requests = await Requests.find({ bookingId: bookingId });
    res.render("user/manage-booking", { requestDetails: "" , bookings, requests, success: req.query.success, error: req.query.error });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewSellerBooking = async (req, res) => {
  const bookingId = req.query.id;

  try {
    const bookings = await Bookings.findById(bookingId).populate("userId").populate("flight");
    const requests = await Requests.find({ bookingId: bookingId });
    const transaction = await Transactions.find({ bookingId: bookingId });
    res.render("user/seller-booking", { requestDetails: "" , bookings, requests, transaction, success: req.query.success, error: req.query.error });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, pan, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.render("user/sign-up", {
        message: "Password does not match",
        messageType: "danger",
      });
    }

    // Check if the email already exists
    const existingUserByEmail = await Users.findOne({ email });
    if (existingUserByEmail) {
      return res.render("user/sign-up", {
        message: "User with this email already exists",
        messageType: "danger",
      });
    }

    // Check if the PAN already exists
    const existingUserByPAN = await Users.findOne({ pan });
    if (existingUserByPAN) {
      return res.render("user/sign-up", {
        message: "User with this PAN already exists",
        messageType: "danger",
      });
    }

    let defaultPlanName = "Null"; 

    const subscriptionPlan = await Subscriptions.findOne({
      subscription: defaultPlanName,
      role: "User",
    });

    if (!subscriptionPlan) {
      return res.render("user/sign-up", {
        message: "No subscription plan found for role",
        messageType: "danger",
      });
    }

    // Correct date creation.
    const expiry_date = new Date(2500, 11, 30); // Year, Month (0-11), Day

    // Step 2: Create the user and reference the subscription
    const newUser = new Users({
      name: name,
      email: email,
      pan: pan,
      password: password,
      subscription: subscriptionPlan._id,
      expiryDate: expiry_date,

    });
    
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.redirect("/sign-in");
  } catch (error) {
    console.error(error);
    return res.render("user/sign-up", {
      message: "An error occurred during signup.",
      messageType: "danger",
    }); // Send error to user.
  }
};

// const signin = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await Users.findOne({ email });
//         if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const ip = requestIp.getClientIp(req); // handles proxies
//     const agent = useragent.parse(req.headers["user-agent"]);
//     const uaString = req.headers["user-agent"].toLowerCase();

//     // Determine platform (Mobile / Computer / Tablet)
//     let platform = "Computer";
//     if (/mobile|iphone|android|blackberry|phone/i.test(uaString)) {
//       platform = "Mobile";
//     } else if (/tablet|ipad/i.test(uaString)) {
//       platform = "Tablet";
//     }

//         // ✅ Store session-related info (important!)
//     req.session.userId = user._id.toString();
//     req.session.browser = `${agent.family} on ${agent.os.family}`;
//     req.session.platform = platform;
//     req.session.ip = ip;
//     req.session.loginTime = new Date().toISOString(); // MUST be valid date format

//     await LoginActivity.create({
//       user: user._id,
//       ip,
//       browser: `${agent.family} on ${agent.os.family}`,
//       platform,
//     });

//     const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
//       expiresIn: "7d",
//     });

//     req.session.token = token;
//     req.session.userId = user._id;

//     const redirectUrl = req.session?.originalUrl || "/";
//     if (req.session) delete req.session.originalUrl;

//     // ✅ Save session before sending response
//     req.session.save((err) => {
//       if (err) {
//         console.error("❌ Session save failed:", err);
//         return res.status(500).json({ error: "Session save failed" });
//       }

//       return res.json({
//         success: true,
//         message: "Login successful",
//         redirect: redirectUrl,
//       });
//     });
    
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

const signOut = async (req, res) => {
  await SessionActivity.deleteOne({ user: req.session.userId });
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ Session destroy error:", err);
        return res.status(500).send("Could not log out");
      }

      // Optionally clear cookie explicitly
      res.clearCookie("connect.sid"); // Ensure session cookie is removed from browser
      res.redirect("/");
    });
  } catch (error) {
    console.error("❌ Signout error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email });
    if (!user) {
      return res.render("user/forgot-password", {
        message: "User not found",
        messageType: "danger",
      });
    }
    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 600000; // 10 minutes
    await user.save();

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello <strong>${user.email}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Your Password
            </a>
          </p>
          <p>If you did not request a password reset, please ignore this email. This link will expire in <strong>10 minutes</strong>.</p>
          <p>For security reasons, do not share this email or the reset link with anyone.</p>
          <p>Best Regards,</p>
          <p><strong>Bismi ETickets</strong></p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err)
        return res.render("user/forgot-password", {
          message: "Error sending email",
          messageType: "danger",
        });
      return res.render("user/forgot-password", {
        message: "Reset email sent!",
        messageType: "success",
      });
    });
    // Send email with token
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const resetPassword = async (req, res) => {
  const token = req.query.token;
  const { password, confirmPassword } = req.body;
  console.log(token);

  if (password != confirmPassword) {
    return res.status(400).render("user/reset-password", {
      message: "Passwords do not match",
      messageType: "danger",
      token,
    });
  }

  try {
    const user = await Users.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).render("user/reset-password", {
        message: "Invalid or expired token",
        messageType: "danger",
        token,
      });
    }

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.render("user/sign-in", {
      message: "Password reset successful. Login here",
      messageType: "success",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewResetPassword = async (req, res) => {
  const token = req.query.token;
  console.log(token);

  try {
    res.render("user/reset-password", { token, message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

// const otpStore = {}; // You can store this in session/Redis for production
// const sendOtp = async (req, res) => {
//   const { email } = req.body;
//   const user = await Users.findOne({ email });
//   if (!user) return res.json({ success: false, message: "Email not found." });

//   const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit
//   otpStore[email] = otp;

//   await transporter.sendMail({
//     from: `"BismiETickets" <${process.env.EMAIL}>`,
//     to: email,
//     subject: "Your OTP for Login",
//     html: `<p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`,
//   });

//   res.json({ success: true });
// }

// const verifyOtp = async (req, res) => {
//   const { email, otp } = req.body;
//   if (otpStore[email] && otpStore[email].toString() === otp) {
//     delete otpStore[email]; // Optional: clear after verification
//     res.json({ success: true });
//   } else {
//     res.json({ success: false, message: "Invalid or expired OTP." });
//   }
// }

const viewProfile = async (req, res) => {
  const userId = req.session.userId;
  try {
    const userDetails = await Users.findById(userId).populate("subscription");
    res.render("user/profile", { userDetails });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewBookings = async (req, res) => {
  try {
    const userId = req.session.userId;

    // Fetch all bookings for the user
    const bookings = await Bookings.find({ userId });

    // Attach flight details to each booking
    const bookingsWithFlights = await Promise.all(
      bookings.map(async (booking) => {
        const flightDetails = await Flights.findById(booking.flight);
        return { ...booking.toObject(), flightDetails };
      })
    );

    const userDetails = await Users.findById(userId);
    const today = new Date();

    const upcomingBookings = [];
    const completedBookings = [];
    const cancelledBookings = [];

    bookingsWithFlights.forEach((booking) => {
      if (booking.status === "cancelled") {
        cancelledBookings.push(booking);
      } else if (
        booking.flightDetails &&
        booking.flightDetails.departureDate &&
        booking.flightDetails.departureTime
      ) {
        // Combine date and time
        const [hours, minutes] = booking.flightDetails.departureTime.split(":");
        const departureDate = new Date(booking.flightDetails.departureDate);
        departureDate.setHours(parseInt(hours), parseInt(minutes));

        if (departureDate <= today) {
          completedBookings.push(booking);
        } else {
          upcomingBookings.push(booking);
        }
      } else {
        // If no departure date, treat as upcoming
        upcomingBookings.push(booking);
      }
    });

    const success = req.query.success === "true";

    // Render bookings page
    res.render("user/bookings", {
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      user: userDetails,
      success,
    });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewTravelers = async (req, res) => {
  try {
    res.render("user/travelers", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewPaymentDetails = async (req, res) => {
  try {
    res.render("user/payment-details", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewWishlist = async (req, res) => {
  try {
    res.render("user/wishlist", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSettings = async (req, res) => {
  try {
    res.render("user/settings", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewDeleteProfile = async (req, res) => {
  try {
    res.render("user/delete-profile", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewKyc = async (req, res) => {
  const userId = req.session.userId;
  try {
    const userDetails = await Users.findById(userId).populate('subscription');
    res.render("user/kyc", { userDetails });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewManageSubscription = async (req, res) => {
  const userId = req.session.userId;
  try {
    const userDetails = await Users.findById(userId).populate('subscription');
    res.render("user/manage-subscription", { userDetails });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const flightBooking = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      travelers,
      mobile_number,
      email,
      totalFare,
      flightDetails,
      baseFare,
      otherServices, 
      discount
    } = req.body;

    // Validate request data
    if (
      !travelers ||
      travelers.length === 0 ||
      !mobile_number ||
      !email ||
      !razorpay_payment_id ||
      !totalFare ||
      !flightDetails || 
      !baseFare ||
      !otherServices ||
      !discount
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let paid;
    razorpay_payment_id ? (paid = true) : (paid = false);

    let payment_status;
    razorpay_payment_id ? (payment_status = "Paid") : (payment_status = "Unpaid");

    const newBooking = new Bookings({
      userId: req.session.userId,
      flight: flightDetails,
      travelers,
      mobile_number,
      email,
      amount: totalFare,
      baseFare,
      tax: otherServices,
      discount,
      payment_status: paid,
    });

    await newBooking.save();

    // Create a new transaction
    const newTransaction = new Transactions({
      bookingId: newBooking._id,
      userId: flightDetails.sellerId,
      totalAmount: totalFare, 
      baseFare: baseFare,
      tax: otherServices,
      discount,
      paymentStatus: payment_status,
      credit: baseFare,
      type:"Booking Payment"
    });

    await newTransaction.save();

    await Users.findByIdAndUpdate(req.session.userId, {
      $inc: {
        "transactions": 1,
        "transactionAmount": totalFare,
      },
    });

    const flightId = flightDetails._id;
    const pnr = flightDetails.inventoryDates[0].pnr;

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
      return res.status(404).json({ message: "Flight or inventory date not found" });
    }

const stopsCount = flightDetails.stops?.length || 0;

const requests = await Requests.find({
  bookingId: newBooking._id,
  category: "service"
}).sort({ createdAt: -1 });

const templateFileName =
  stopsCount <= 1
    ? 'mail-oneWayBookingConfirmation.ejs'
    : 'mail-connectingBookingConfirmation.ejs';

    try {
      const templatePath = path.join(__dirname, '../views/user/', templateFileName);
      const html = await renderTemplate(templatePath, {
        travelers,
        flightDetails,
        totalFare,
        baseFare,
        otherServices,
        discount,
        bookingId: newBooking.bookingId,
        requests
      });

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Your Flight Booking Confirmation',
        html,
      });
    } catch (emailErr) {
      console.error('Error sending confirmation email:', emailErr);
    }

    return res
      .status(201)
      .json({ message: "Booking successful", bookingId: newBooking._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  const { name, email, mobile, nationality, proprietorship, address, agencyName } = req.body;
  console.log(req.body);

  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let imagePath = user.image;
    let logoPath = user.logo;

    // Handle new profile image
    if (req.files && req.files.image && req.files.image[0]) {
      imagePath = "/uploads/" + req.files.image[0].filename;
    }

    // Handle new logo
    if (req.files && req.files.logo && req.files.logo[0]) {
      logoPath = "/uploads/" + req.files.logo[0].filename;
    }

    // Save requested update to the ProfileUpdate collection
    const profileUpdate = new ProfileUpdate({
      userId,
      name,
      email,
      mobile,
      nationality,
      proprietorship,
      address,
      agencyName,
      image: imagePath,
      logo: logoPath,
    });

    await profileUpdate.save();

    res.json({
      success: true,
      message: "Profile update request submitted for admin approval.",
    });

  } catch (error) {
    console.error("Error submitting profile update request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if the new email already exists
    const existingUser = await Users.findOne({ email: email });
    if (existingUser && user.email === email) {
      // Ensure it's not the current user's email
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // Save only email update request for admin approval
    const profileUpdate = new ProfileUpdate({
      userId,
      email,
    });

    await profileUpdate.save();

    res.json({
      success: true,
      message: "Email update request submitted for admin approval.",
    });

  } catch (error) {
    console.error("Error submitting email update request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateWhatsapp = async (req, res) => {
  const { whatsapp } = req.body;
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Save only email update request for admin approval
    const profileUpdate = new ProfileUpdate({
      userId,
      whatsapp,
    });

    await profileUpdate.save();

    res.json({
      success: true,
      message: "Whatsapp number update request submitted for admin approval.",
    });

  } catch (error) {
    console.error("Error submitting whatsapp number update request:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updatePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  console.log(req.body);

  try {
    const userId = req.session.userId; // Get logged-in user ID
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch user from database
    const user = await Users.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect current password" });
    }

    // Check if new password matches confirm password
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyCard = async (req, res) => {
  console.log("Verify card")
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const existingRequest = await KycUpdate.findOne({ userId });
    console.log(existingRequest, "existingRequest")

    const user = await Users.findById(userId).populate('subscription');

    console.log(req.files);

    if (req.files && req.files.visitingCard && req.files.panCard) {
      const visitingCardFile = req.files.visitingCard[0];
      const panCardFile = req.files.panCard[0];
    
      if (!visitingCardFile || !panCardFile) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Visiting Card and PAN Card are required.",
          });
      }
      if (existingRequest) {
        existingRequest.visitingCard = "/uploads/" + visitingCardFile.filename;
        existingRequest.panCard = "/uploads/" + panCardFile.filename;
        existingRequest.kyc = user.kyc;
        existingRequest.subscription = user.subscription;
        existingRequest.status = "pending";

        await existingRequest.save();
      console.log(existingRequest, "existingRequest");
      return res.json({ success: true, message: "KYC details update request modified" });
      }

    const newRequest = new KycUpdate({
      userId: userId,
      visitingCard : "/uploads/" + visitingCardFile.filename,
      panCard : "/uploads/" + panCardFile.filename,
      kyc : user.kyc,
      subscription: user.subscription,
    });

    await newRequest.save();
    console.log(newRequest, "newRequest")
    res.json({ success: true, message: "Your KYC application under process . Kindly wait for update." });
  }
  
  } catch (error) {
    console.error("Error verifying card:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyAadhaar = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const existingRequest = await KycUpdate.findOne({ userId });
    console.log(existingRequest, "existingRequest")

    const user = await Users.findById(userId).populate("subscription");
    // if (!user) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "User not found" });
    // }

    if (req.files && req.files.aadhaar1 && req.files.aadhaar2) {
      // Access files using req.files.fieldname
      const aadhaarCard1File = req.files.aadhaar1[0];
      const aadhaarCard2File = req.files.aadhaar2[0];

      if (!aadhaarCard1File || !aadhaarCard2File) {
        return res
          .status(400)
          .json({ success: false, message: "Both Aadhaar Card front and back are required." });
      }

      if (existingRequest) {
        existingRequest.aadhaarCardFront = "/uploads/" + aadhaarCard1File.filename;
        existingRequest.aadhaarCardBack = "/uploads/" + aadhaarCard2File.filename;
        existingRequest.kyc = user.kyc;
        existingRequest.subscription = user.subscription;
        existingRequest.status = "pending";

      await existingRequest.save();
      console.log(existingRequest, "existingRequest");
      return res.json({ success: true, message: "Your KYC application under process . Kindly wait for update." });
      }
      // if (user.subscription && user.subscription.subscription === "Free") {
      //   user.kyc = "Completed";
      //   user.transactions = 0;
      //   user.transactionAmount = 0;
      // }
      const newRequest = new KycUpdate({
        userId: userId,
        aadhaarCardFront: "/uploads/" + aadhaarCard1File.filename,
        aadhaarCardBack: "/uploads/" + aadhaarCard2File.filename,
        kyc : user.kyc,
        subscription: user.subscription,
      });
      await newRequest.save();

      console.log(newRequest, "newRequest")
    res.json({ success: true, message: "Wait for the admin to approve your kyc details" });
  }
  
  } catch (error) {
    console.error("Error verifying aadhaar:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const subscription = async (req, res) => {
  const { subscription } = req.body;
  console.log(subscription);
  const userId = req.session.userId;
  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await Users.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (subscription === "Starter") {
      console.log("HI")
      if (user.subscription.subscription === "Starter") {
        return res.json({
          redirectUrl: "/subscription",
          message: "Starter subscription already active. Choose another plan",
        });
      } else if (user.kyc === "Pending") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete Initial KYC for Starter subscription",
        });
      }
    } else if (subscription === "Pro") {
      if (user.subscription.subscription === "Pro") {
        return res.json({
          redirectUrl: "/subscription",
          message: "Pro subscription already active",
        });
      } else if (user.kyc !== "Completed") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete KYC for Pro subscription",
        });
      } else {
        res
          .status(200)
          .json({
            redirectUrl: `/subscription-payment?subscription=${subscription}&role=User`,
          });
      }
    } else if (subscription === "Enterprise") {
      if (user.subscription.subscription === "Enterprise") {
        return res.json({
          redirectUrl: "/subscription",
          message: "Enterprise subscription already active",
        });
      } else if (user.kyc !== "Completed") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete KYC for Enterprise subscription",
        });
      } else {
        res
          .status(200)
          .json({
            redirectUrl: `/subscription-payment?subscription=${subscription}&role=User`,
          });
      }
    } else {
      res.status(400).json({ message: "Invalid subscription" });
    }
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewSubscriptionPayment = async (req, res) => {
  const { subscription, role } = req.query;
  const userId = req.session.userId;
  try {
    const userDetails = await Users.findById(userId);
    res.render("user/subscription-payment", { userDetails, subscription, role });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const subscriptionPayment = async (req, res) => {
  const userId = req.session.userId;
  const { razorpay_payment_id, email, price, subscription, role } = req.body;
  try {
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!razorpay_payment_id) {
      console.error("Payment failed: razorpay_payment_id missing.");
      return res.status(400).json({ success: false, message: "Payment failed." });
    }

    const subscriptionPlan = await Subscriptions.findOne({
      subscription: subscription,
      role: role, // Match role-specific plans
    });

    if (!subscriptionPlan) {
      return res.status(400).json({ success: false, message: "Invalid subscription plan." });
    }

    const today = new Date();

    // Format today's date to YYYY-MM-DD
    const todayFormatted = today.toISOString().split("T")[0];

    // Calculate the expiry date (30 days from today)
    const subscriptionDate = new Date(today); // Create a copy of today's date
    subscriptionDate.setDate(subscriptionDate.getDate() + 30);

    // Format expiry date to YYYY-MM-DD
    const expiryDate = subscriptionDate.toISOString().split("T")[0];

    user.subscription = subscriptionPlan._id;
    user.subscriptionDate = today;
    user.expiryDate = expiryDate;
    user.transactions = 0;
    user.transactionAmount = 0;
    user.userRole = role;

    await user.save();

    res.json({
        success: true,
        message: "Subscription updated successfully.",
      });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const freeSubscription = async (req, res) => {
  const userId = req.session.userId;
  const { subscription } = req.body;
  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    
    const freePlan = await Subscriptions.findOne({
      subscription: "Starter",
      role: user.userRole,
    });
    
        if (!freePlan) {
          return res.status(400).json({ success: false, message: "Free plan not found." });
        }
    
    const today = new Date();

    // Format today's date to YYYY-MM-DD
    const todayFormatted = today.toISOString().split("T")[0];

    // Calculate the expiry date (30 days from today)
    const subscriptionDate = new Date(today); // Create a copy of today's date
    subscriptionDate.setDate(subscriptionDate.getDate() + 30);

    // Format expiry date to YYYY-MM-DD
    const expiryDate = subscriptionDate.toISOString().split("T")[0];

    user.subscription = freePlan._id;
    user.subscriptionDate = todayFormatted;
    user.expiryDate = expiryDate;
    user.transactions = 0;
    user.transactionAmount = 0;

    await user.save();

    res.json({
      success: true,
      user,
      message: "Downgraded to Free successfully!",
      redirectUrl: "/subscription",
    });
  } catch (error) {
    console.error("Error verifying card:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const viewPricing = async (req, res) => {
  try {
    const subscriptions = await Subscriptions.find({role:"User"})
    res.render("user/pricing", {subscriptions});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewAgentSubscription = async (req, res) => {
  try {
    res.render("user/agent-subscription", {});
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const renewal = async (req, res) => {
  const userId = req.session.userId;
  const { razorpay_payment_id, email, price, subscription, role } = req.body;
  try {
    const user = await Users.findById(userId);
    const today = new Date();
    let newExpiryDate;

    if (razorpay_payment_id) {
      const currentExpiryDate = new Date(user.subscription.expiryDate);
      let transactions = 0;
      let transactionAmount = 0;
      if (today < currentExpiryDate) {
        const startDate = new Date(user.subscription.expiryDate);
        startDate.setDate(startDate.getDate() + 30);
        newExpiryDate = startDate.toISOString().split("T")[0];
        const balanceTransactions =
          user.subscription.transactionLimit - user.subscription.transactions;
        transactions = -balanceTransactions;
        const balanceTransactionAmount =
          user.subscription.maxTransactionAmount -
          user.subscription.transactionAmount;
        transactionAmount = -balanceTransactionAmount;
      } else {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + 30);
        newExpiryDate = startDate.toISOString().split("T")[0];
      }

      const subscriptionPlan = await Subscriptions.findOne({
        subscription: subscription,
        role: role, 
      });

      if (!subscriptionPlan) {
        return res.status(400).json({ success: false, message: "Invalid subscription plan." });
      }

      user.subscription = subscriptionPlan._id;
      user.expiryDate = newExpiryDate;
      user.transactions = transactions;
      user.transactionAmount = transactionAmount;
      await user.save();

      res.json({
        success: true,
        message: "Subscription renewed successfully.",
      });
    } else {
      console.error("Payment failed: razorpay_payment_id missing.");
      res.status(400).json({ success: false, message: "Payment failed." });
      return;
    }
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const freeRenewal = async (req, res) => {
  const userId = req.session.userId;
  const { subscription } = req.body;
  try {
    const user = await Users.findById(userId);
    const today = new Date();
    let transactions = 0;
    let transactionAmount = 0;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 30);
    const newExpiryDate = startDate.toISOString().split("T")[0];
    const balanceTransactions =
      user.subscription.transactionLimit - user.subscription.transactions;
    transactions = -balanceTransactions;
    const balanceTransactionAmount =
      user.subscription.maxTransactionAmount -
      user.subscription.transactionAmount;
    transactionAmount = -balanceTransactionAmount;

    user.subscription.subscription = subscription;
    user.subscription.expiryDate = newExpiryDate;
    user.subscription.transactionAmount = 0;
    user.subscription.transactions = transactions;
    user.subscription.transactionAmount = transactionAmount;
    await user.save();

    res.json({ success: true, message: "Subscription renewed successfully.", redirectUrl: "/manage-subscription", });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const agentSubscription = async (req, res) => {
  const { subscription } = req.body;
  console.log(subscription);
  const userId = req.session.userId;
  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await Users.findById(userId).populate("subscription");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (subscription === "Base") {
      if (user.subscription.subscription === "Base") {
        return res.json({
          redirectUrl: "/join-us",
          message: "Base subscription already active",
        });
      } else if (user.kyc !== "Completed") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete KYC for Base subscription",
        });
      } else {
        res
          .status(200)
          .json({
            redirectUrl: `/subscription-payment?subscription=${subscription}&role=Agent`,
          });
      }
    } else if (subscription === "Enterprise") {
      if (user.subscription.subscription === "Enterprise") {
        return res.json({
          redirectUrl: "/join-us",
          message: "Enterprise subscription already active",
        });
      } else if (user.kyc !== "Completed") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete KYC for Enterprise subscription",
        });
      } else {
        res
          .status(200)
          .json({
            redirectUrl: `/subscription-payment?subscription=${subscription}&role=Agent`,
          });
      }
    } else {
      res.status(400).json({ message: "Invalid subscription" });
    }
  } catch (error) {
    console.error("Error fetching payment details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewEarnings = async (req, res) => {
  const userId = req.session.userId;
  const currentMonth = new Date().toLocaleString("default", { month: "short" });

  try {
    const user = await Users.findById(userId);
    const bookings = await Bookings.find().populate("flight");

    let totalAmount = 0;
    let totalBaseFare = 0;

    bookings.forEach(booking => {
      const flight = booking.flight;
      if (!flight || !flight.departureDate || !flight.sellerId) return;

      // Match seller
      if (flight.sellerId.toString() !== userId.toString()) return;

      // Get month from departureDate (e.g., "27 Oct 2025")
      const depMonth = flight.departureDate.split(" ")[1];
      if (depMonth !== currentMonth) return;

      // Add to totals
      totalAmount += booking.amount || 0;
      totalBaseFare += booking.baseFare || 0;
    });

    res.render("user/earnings", {
      user,
      currentMonth,
      totalAmount,
      totalBaseFare
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListings = async (req, res) => {
  const userId = req.session.userId;

  // Get current month as a string like "May"
  const currentMonth = new Date().toLocaleString("default", { month: "short" });
  try {
    const flights = await Flights.find({ sellerId: userId })
      .populate("sellerId")
      .sort({ createdAt: -1 });

    if (!flights || flights.length === 0) {
        res.render("user/listings", {
        success: false,
        message: "No flights found",
        currentMonth
      });
    }

    let totalSeats = 0;
    let totalSeatsBooked = 0;
    let totalPendingSeats = 0;

    flights.forEach((flight) => {
      const depDate = flight.departureDate; 
      if (!depDate) return;

      const depMonth = depDate.split(" ")[1]; 
      if (depMonth === currentMonth) {
        const inventory = flight.inventoryDates?.[0];
        if (inventory) {
          const seats = parseInt(inventory.seats) || 0;
          const seatsBooked = parseInt(inventory.seatsBooked) || 0;
          const pendingSeats = seats - seatsBooked;

          totalSeats += seats;
          totalSeatsBooked += seatsBooked;
          totalPendingSeats += pendingSeats;
        }
      }
    });

    res.render("user/listings", {
      flights,
      currentMonth,
      totalSeats,
      totalSeatsBooked,
      totalPendingSeats
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const viewAddListing = async (req, res) => {
  try {
    // Get the flight with the highest inventoryId
    const lastFlight = await Flights.findOne({})
      .sort({ createdAt: -1 })
      .select("inventoryId");
    console.log("last",lastFlight);

    let nextInventoryId;

    if (lastFlight && lastFlight.inventoryId) {
      // Extract numeric part (e.g., from 'INV00123')
      const lastSeq = parseInt(lastFlight.inventoryId.replace("INV", ""), 10);
      const newSeq = lastSeq + 1;
      nextInventoryId = `INV${String(newSeq).padStart(5, "0")}`;
    } else {
      // Default to INV00001 if no flights exist
      nextInventoryId = "INV00001";
    }

    res.render("user/add-listings", { inventoryId: nextInventoryId });
  } catch (error) {
    console.error("Error generating inventoryId:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const searchAirports = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const matchStage = q
      ? {
          $or: [
            { Airport: { $regex: q, $options: "i" } },
            { Value:   { $regex: q, $options: "i" } }
          ]
        }
      : {};

    const airports = await Airports.aggregate([
      { $match: matchStage },                        // 1. filter
      {
        $group: {                                    // 2. group by code
          _id: "$Value", 
          Airport: { $first: "$Airport" }            // 3. pick first name
        }
      },
      {
        $project: {                                  // 4. project back
          _id: 0,
          Value: "$_id",
          Airport: 1
        }
      },
      { $limit: 25 }                                 // 5. limit results
    ]);

    res.json(airports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const searchFilteredAirports = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    const matchStage = q
      ? {
          $or: [
            { "fromAirport.name": { $regex: q, $options: "i" } },
            { "fromAirport.value": { $regex: q, $options: "i" } },
            { "fromAirport.city": { $regex: q, $options: "i" } },
            { "fromAirport.country": { $regex: q, $options: "i" } }
          ]
        }
      : {};

    const airports = await FilterAirport.aggregate([
      { $match: matchStage },
      {
        $project: {
          _id: 0,
          value: "$fromAirport.value",
          name: "$fromAirport.name",
          city: "$fromAirport.city",
          country: "$fromAirport.country"
        }
      },
      { $limit: 25 }
    ]);

    res.json(airports);
  } catch (err) {
    console.error("Airport search error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const getToAirports = async (req, res) => {
  const from = req.query.from;
  if (!from) return res.status(400).json({ success: false, message: "Missing 'from'" });

  try {
    const doc = await FilterAirport.findOne({ "fromAirport.value": from });
    const toAirports = doc?.fromAirport?.toAirports || [];
    res.json(toAirports);
  } catch (error) {
    console.error("Error fetching toAirports:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const searchAirlines = async (req, res) => { 
  try {
    const q = (req.query.q || "").trim();

    // Build search filter
    const filter = q
      ? {
          // $text: { $search: q }  // Use the text index for efficient search
          $or: [
            { Name: { $regex: q, $options: "i" } },
            { Value:   { $regex: q, $options: "i" } }
          ]
        }
      : {};

    // Query only Name and Value fields (using .select to limit the fields)
    const airlines = await Airlines.find(filter)
      .limit(50)  // Limit to 20 results (adjust as needed)
      .select("Name Value -_id");  // Only return the fields you need (Name and Value)

    res.json(airlines);  // Return the search results
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
}

const viewJoinUs = async (req, res) => {
  try {
    const subscriptions = await Subscriptions.find({role:"Agent"})
    res.render("user/join-us", {subscriptions});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUserBookings = async (req, res) => {
  const userId = req.session.userId; // seller's user ID
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const skip = (page - 1) * limit;
  const flightId = req.query.flightId; 

  try {
    let flightIds = [];

    if (search) {
      const matchingFlights = await Flights.find({
        $or: [
          { fromCity: { $regex: search, $options: 'i' } },
          { toCity: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      flightIds = matchingFlights.map(f => f._id);
    }

    let query = {};

    if (search) {
      query = {
        $or: [
          { bookingId: { $regex: search, $options: 'i' } },
          { flight: { $in: flightIds } }
        ]
      };
    }

    if (flightId) {
      query.flight = flightId;  
    }

    const allMatchingBookings = await Bookings.find(query)
      .populate("flight")
      .populate("userId");

    const sellerBookings = allMatchingBookings.filter(booking => {
      return booking.flight?.sellerId?.toString() === userId;
    });

    const paginatedBookings = sellerBookings.slice(skip, skip + limit);

    const totalPages = Math.ceil(sellerBookings.length / limit);

    res.render("user/user-booking", {
      bookings: paginatedBookings,
      search,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewUserBookingDetail = async (req, res) => {
  try{
    const bookingId = req.params.id; // Get booking ID from URL parameter
    const userId = req.session.userId; // Get seller's user ID from session

    // Find the booking by ID and populate flight and user details
    const bookings = await Bookings.findById(bookingId)
      .populate("flight")
      .populate("userId");

    if (!bookings) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const sellerId = bookings.flight.sellerId;
    const seller = await Users.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ success: false, message: "Seller not found" });
    }

    const transactions = await Transactions.find({ bookingId: bookings._id });
    if (!transactions) {
      return res.status(404).json({ success: false, message: "Transactions not found" });
    }

    // Check if the booking belongs to the seller
    if (bookings.flight.sellerId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    res.render("user/user-booking-detail", { bookings, seller, transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const addFlight = async (req, res) => {
  console.log("Adding flights");
  const {oneWayFlight, type} = req.body;
  
  console.log("Received oneWayFlight object:", oneWayFlight);
  console.log("Content of inventoryDates:", oneWayFlight.inventoryDates); // <--- Add this
  try {
    const newFlight = new Flights({
      sellerId: oneWayFlight.sellerId,
      inventoryId: oneWayFlight.inventoryName,
      from: oneWayFlight.from,
      to: oneWayFlight.to,
      departureName: oneWayFlight.departureName,
      arrivalName: oneWayFlight.arrivalName,
      fromCity: oneWayFlight.fromCity,
      toCity: oneWayFlight.toCity,
      fromCountry: oneWayFlight.fromCountry,
      toCountry: oneWayFlight.toCountry,
      departureTime: oneWayFlight.departureTime,
      departureDate: oneWayFlight.departureDate,
      arrivalTime: oneWayFlight.arrivalTime,
      arrivalDate: oneWayFlight.arrivalDate,
      duration: oneWayFlight.totalDuration,
      disableBeforeDays: oneWayFlight.disableBeforeDays,
      stops: oneWayFlight.stops,
      baggage: {
        adult: {
          checkIn: {
            numberOfPieces: oneWayFlight.adultCheckinNumber,
            weightPerPiece: oneWayFlight.adultCheckinWeight,
          },
          cabin: {
            pieces: oneWayFlight.adultCabinNumber,
            weightPerPiece: oneWayFlight.adultCabinWeight,
          },
        },
        child: {
          checkIn: {
            numberOfPieces: oneWayFlight.childCheckinNumber,
            weightPerPiece: oneWayFlight.childCheckinWeight,
          },
          cabin: {
            pieces: oneWayFlight.childCabinNumber,
            weightPerPiece: oneWayFlight.childCabinWeight,
          },
        },
        infant: {
          checkIn: {
            numberOfPieces: oneWayFlight.infantCheckinNumber,
            weightPerPiece: oneWayFlight.infantCheckinWeight,
          },
          cabin: {
            pieces: oneWayFlight.infantCabinNumber,
            weightPerPiece: oneWayFlight.infantCabinWeight,
          },
        },
      },
      inventoryDates: [
        {
          pnr: oneWayFlight.inventoryDates[0]?.pnr,
          seats: oneWayFlight.inventoryDates[0]?.seats,
          fare: {
            adults: oneWayFlight.inventoryDates[0]?.fare?.adults,
            infants: oneWayFlight.inventoryDates[0]?.fare?.infants,
          },
        },
      ],
      refundable: oneWayFlight.refundable,
    });
    
    await newFlight.save();
    
    const fromValue = oneWayFlight.from;
    const toValue = oneWayFlight.to;

    const existingFilter = await FilterAirport.findOne({ "fromAirport.value": fromValue });

    const toAirportObject = {
      value: toValue,
      name: oneWayFlight.arrivalName,
      city: oneWayFlight.toCity,
      country: oneWayFlight.toCountry,
      status: "active",
    };

    if (!existingFilter) {
      // Create new fromAirport with toAirports array
      const newFilter = new FilterAirport({
        fromAirport: {
          value: fromValue,
          name: oneWayFlight.departureName,
          city: oneWayFlight.fromCity,
          country: oneWayFlight.fromCountry,
          status: "active",
          toAirports: [toAirportObject],
        },
      });
      await newFilter.save();
    } else {
      // Check if toAirport already exists in array
      const toAlreadyExists = existingFilter.fromAirport.toAirports.some(
        (airport) => airport.value === toValue
      );

      if (!toAlreadyExists) {
        await FilterAirport.updateOne(
          { "fromAirport.value": fromValue },
          { $push: { "fromAirport.toAirports": toAirportObject } }
        );
      }
    }

    const userId = req.session.userId;
    const user = await Users.findById(userId);
    const userEmail = user?.email;
    
    if (userEmail) {
      const templateFile =
      type === "oneWay"
    ? "addInventoryMail.ejs"
    : "addConnectingInventoryMail.ejs";
    
      const logoUrl = `${baseUrl}/assets/images/logo.svg`;
      const templatePath = path.join(__dirname, "../views/user/", templateFile);
      try{
      const htmlContent = await ejs.renderFile(templatePath, { newFlight, logoUrl });

      await transporter.sendMail({
        to: userEmail,
        subject: "New Flight Inventory Added",
        html: htmlContent,
      });
    } catch (e) {
      console.error("Error rendering EJS:", e);
      return res.status(500).json({ success: false, message: "Template rendering failed" });
    }
    }

    return res.json({
      message: "Flight added successfully",
      success: true,
      redirectUrl: "/listings",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const getApiFlights = async (req, res) => {
  console.log("Api flights")
  const {
    from,
    to,
    departureDate,
    airlines = [],
    flightNumbers = [],
  } = req.body;

  console.log("Get flights");
  console.log(req.body);
  console.log("From", from);
  console.log("To", to);  
  console.log("Departure Date", departureDate);
  console.log("Airlines", airlines);
  console.log("Flight Numbers", flightNumbers);
  
  const formatDate = (dateString) => {
    if (!dateString) return null;

    const parts = dateString.trim().split(" ");
    if (parts.length !== 3) return null;

    const day = parts[0].padStart(2, "0");
    const monthMap = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };

    const month = monthMap[parts[1]];
    const year = parts[2];

    return month ? `${year}-${month}-${day}` : null;
  };

  const formattedDate = formatDate(departureDate);
  if (!from || !to || !formattedDate) {
    return res.status(400).json({ error: "Missing or invalid parameters" });
  }

  const apiUrl = `https://flights.booking.com/api/flights/?type=ONEWAY&from=${from}.AIRPORT&to=${to}.AIRPORT&cabinClass=ECONOMY&sort=BEST&depart=${formattedDate}&adults=1&locale=en-us&salesCurrency=INR&customerCurrency=INR&aid=2215350&salesChannel=gfsapi&salesIdentifier=24323047&salesCountry=in&enableVI=1`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Booking API error: ${response.statusText}` });
    }

    const data = await response.json();
    const flightOffers = data.flightOffers;

    const filteredFlights = [];

    flightOffers.forEach((offer) => {
      offer.segments.forEach((segment) => {
        const legs = segment.legs;

        if (
          airlines.length === legs.length &&
          flightNumbers.length === legs.length
        ) {
          let allMatch = true;

          for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            const flightInfo = leg.flightInfo;
            const carrierData = leg.carriersData;

            if (
              flightInfo.flightNumber !== parseInt(flightNumbers[i]) ||
              carrierData[0].code.toLowerCase() !== airlines[i].toLowerCase()
            ) {
              allMatch = false;
              break;
            }
          }

          if (allMatch) {
            filteredFlights.push({
              legs,
              checkedLuggage: segment.travellerCheckedLuggage || [],
              cabinLuggage: segment.travellerCabinLuggage || [],
              totalTime: segment.totalTime || "",
              departureTime: segment.departureTime || "",
              arrivalTime: segment.arrivalTime || "",
              departureAirport: segment.departureAirport || {},
              arrivalAirport: segment.arrivalAirport || {},
            });
          }
        }
      });
    });

    console.log("filteredFlights", filteredFlights);

    res.json({ total: filteredFlights.length, flights: filteredFlights });
  } catch (err) {
    console.error("Fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch flights" });
  }
};

const getApiCountries = async (req, res) => {
  const countryList = Object.values(countries).map(c => c.name).sort();
  // Remove "India" if present and sort the rest
  const india = "India";
  const otherCountries = countryList.filter(name => name !== india).sort();

  // Put India at the top
  const finalList = [india, ...otherCountries];

  res.json(finalList);
};

const updateListingById = async( req, res ) => {
  console.log("Update flight")
  const flightId = req.query.id;
  const flightData = req.body;
  console.log(flightId, flightData)

  try {
    const updatedFlight = await Flights.findByIdAndUpdate(flightId, flightData, { new: true });
    console.log(updatedFlight);
    if (!updatedFlight) {
      return res.status(404).json({ message: "Flight not found" });
    }
    res.json({ message: "Flight updated successfully", flight: updatedFlight });
  } catch (error) {
    console.error("Error updating flight:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const updateSeatById = async( req, res ) => {
  console.log("Update flight")
  const flightId = req.query.id;
  const flightData = req.body;
  console.log(flightId, flightData)

  try {
    const updatedFlight = await Flights.findByIdAndUpdate(flightId, flightData, { new: true });
    console.log(updatedFlight);
    if (!updatedFlight) {
      return res.status(404).json({ message: "Flight not found" });
    }
    res.json({ message: "Flight updated successfully", flight: updatedFlight });
  } catch (error) {
    console.error("Error updating flight:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const updateDateById = async( req, res ) => {
  console.log("Update flight")
  const flightId = req.query.id;
  const flightData = req.body;
  console.log(flightId, flightData)

  try {
    const updatedFlight = await Flights.findByIdAndUpdate(flightId, flightData, { new: true });
    console.log(updatedFlight);
    if (!updatedFlight) {
      return res.status(404).json({ message: "Flight not found" });
    }
    res.json({ message: "Flight updated successfully", flight: updatedFlight });
  } catch (error) {
    console.error("Error updating flight:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const changeStatus = async (req, res) => {
  try {
    const { flightId, newStatus } = req.body;
    console.log("Change flight status", flightId, newStatus);
    if (!flightId || !newStatus) {
      return res.status(400).json({ success: false, message: 'Missing data' });
    }

    const updatedFlight = await Flights.findByIdAndUpdate(
      flightId,
      { status: newStatus },
      { new: true } // return the updated document if you want
    );

    if (!updatedFlight) {
      return res.status(404).json({ success: false, message: 'Flight not found' });
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

  const addBank = async (req, res) => {
  const userId = req.session.userId;
  const { accountHolderName, accountNumber, ifscCode, bankName, branchName } = req.body.bankDetails;
  console.log(accountHolderName, userId);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const existingRequest = await BankUpdate.findOne({ userId });
    console.log(existingRequest, "existingRequest")

    if (existingRequest) {
      existingRequest.bankDetails.accountHolderName = accountHolderName;
      existingRequest.bankDetails.accountNumber = accountNumber;
      existingRequest.bankDetails.ifscCode = ifscCode;
      existingRequest.bankDetails.bankName = bankName;
      existingRequest.bankDetails.branchName = branchName;
    
      await existingRequest.save();
      console.log(existingRequest, "existingRequest");
      return res.json({ success: true, message: "Bank details update request modified" });
    }

    // Create a new request
    const newRequest = new BankUpdate({
      userId: userId,
      bankDetails:{
        accountHolderName: accountHolderName,
        accountNumber: accountNumber,
        ifscCode: ifscCode,
        bankName: bankName,
        branchName: branchName,
      },
    });

    await newRequest.save();
    console.log(newRequest, "newRequest")
    res.json({ success: true, message: "Wait for the admin to approve your bank details" });

  } catch (error) {
    console.error("Error updating bank details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeBank = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await Users.findById(userId);
    if (!user) return res.status(404).send("User not found");

    user.bankDetails.isActive = false;
    await user.save();

    // req.flash('success', 'Bank account removed.');
    res.redirect('/earnings'); // Redirect as needed
  } catch (error) {
    console.error("Error removing account:", error);
    res.status(500).send("Failed to remove account");
  }
}

const viewTransactions = async (req, res) => {
  const userId = req.session.userId;
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const skip = (page - 1) * limit;
  const flightId = req.query.flightId;

  try {
    let allTransactions = [];

    // 🔍 Case 1: Search is likely a transactionId (e.g. "TRS0012")
    if (search && search.toUpperCase().startsWith("TRS")) {
      allTransactions = await Transactions.find({
        userId,
        transactionId: { $regex: search, $options: "i" },
      })
        .populate("userId")
        .populate({
          path: "bookingId",
          populate: [
            { path: "flight" },
            { path: "userId" }
          ]
        });

    } else {
      // 🔍 Case 2: Search by bookingId, fromCity, toCity, flightId
      let bookingQuery = { userId };
      if (flightId) {
        bookingQuery.flight = flightId;
      }

      const allUserBookings = await Bookings.find(bookingQuery).populate('flight');

      let matchedBookings = allUserBookings;

      if (search) {
        const matchingFlights = await Flights.find({
          $or: [
            { fromCity: { $regex: search, $options: 'i' } },
            { toCity: { $regex: search, $options: 'i' } },
          ]
        }).select('_id');

        const flightIds = matchingFlights.map(f => f._id.toString());

        matchedBookings = allUserBookings.filter(b =>
          b._id.toString().includes(search) ||
          (b.flight && flightIds.includes(b.flight._id.toString()))
        );
      }

      const bookingIds = matchedBookings.map(b => b._id);

      allTransactions = await Transactions.find({
        userId,
        bookingId: { $in: bookingIds },
      })
        .populate("userId")
        .populate({
          path: "bookingId",
          populate: [
            { path: "flight" },
            { path: "userId" }
          ]
        });
    }

    // 📄 Pagination
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);
    const totalPages = Math.ceil(allTransactions.length / limit);

    // ✅ Render the transactions page
    res.render("user/transaction", {
      transactions: paginatedTransactions,
      search,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.error("Transaction error:", error);
    res.status(500).render("error", { error });
  }
};

const addSupportTicket = async (req, res) => {
  try { 
    const {
      enquiryType,
      category,
      priority,
      subject,
      message
    } = req.body;
 
    const userId = req.session.userId; // Assumes session is set up
    if (!userId) return res.status(401).send('Unauthorized');

    let enquiry;

    if(enquiryType === "A general enquiry"){
      enquiry = "general"
    }else {
      enquiry = "problem"
    }

    const newTicket = new Support({
      userId,
      enquiryType : enquiry,
      category,
      priority,
      subject,
      message,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await newTicket.save();
    res.redirect('/support-ticket'); 
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

const viewNotifications = async (req, res) => {
  const userId = req.session.userId;
  try {
    const messages = await Support.find({ userId }).sort({ createdAt: -1 }).populate("userId");
    return res.render('user/notifications', {messages})
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

const contact = async (req, res) => {
  const { name, email, mobile, message } = req.body;
  
  try {
    const mailOptions = {
      from: email, // Sender (user's email)
      to: "info@btrips.in", // Recipient (you)
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h3>Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Respond
    res.json({success: true});
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Something went wrong. Please try again.");
  }
}

const cancelBooking = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).send('Unauthorized');

    const { bookingId, enquiryType, category, priority, message } = req.body;
    const file = req.file; // assuming you're using multer

    // Save to DB or process as needed
    await Support.create({
      userId,
      enquiryType,
      category,
      priority,
      subject: `Cancellation request for booking ${bookingId}`,
      message,
      fileUrl: file? `/uploads/${file.filename}` : null,
    });

    res.redirect("/bookings"); // or wherever appropriate
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to submit support ticket.");
  }
};

const bookingSupportTicket = async (req, res) => {
  try { 
    const {
      enquiryType,
      category,
      priority,
      subject,
      message
    } = req.body;
 
    const userId = req.session.userId; // Assumes session is set up
    if (!userId) return res.status(401).send('Unauthorized');

    const bookingId = req.params.id; // Get booking ID from URL parameter
    if (!bookingId) return res.status(400).send('Booking ID is required');
    let enquiry;

    if(enquiryType === "A general enquiry"){
      enquiry = "general"
    }else if (enquiryType === " I have a problem need help"){
      enquiry = "problem"
    }else if (enquiryType === "Airline Updates"){
      enquiry = "airline"
    }else if (enquiryType === "Internal Notes"){
      enquiry = "internal"
    }else if (enquiryType === "Enquiry of Tickets"){
      enquiry = "ticket"
    }else{
      enquiry= "other"
    }

    const newTicket = new Support({
      userId,
      enquiryType : enquiry,
      category,
      priority,
      subject,
      message,
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await newTicket.save();
    res.redirect(`/user-bookings/${bookingId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

const viewPopularFlights = async (req, res) => {
  try {
    const popularFlights = await PopularFlight.find();
    res.render("user/popular-flights", {popularFlights});
  } catch (error) {
    console.error("Error fetching popular flights:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const addServiceRequest = async (req, res) => {
  const bookingId = req.params.bookingId;
  const userId = req.session.userId;

  try {
    const { passengerName, subject, reqContent } = req.body;
    console.log("Received:", { passengerName, subject, reqContent });
    console.log("Files:", req.files);

    if (!userId || !bookingId || !passengerName) {
      return res.redirect(`/manage-booking?id=${bookingId}&error=Missing+required+fields`);
    }

    const bookingExists = await Bookings.findById(bookingId);
    if (!bookingExists) {
      return res.redirect(`/manage-booking?id=${bookingId}&error=Booking+not+found`);
    }

    const filePaths = (req.files || []).map(file => `/uploads/requests/${file.filename}`);

    const request = new Requests({
      userId,
      bookingId,
      category: "service",
      subject,
      passengerName,
      request: reqContent,
      fileUrl: filePaths
    });

    await request.save();

    return res.redirect(`/manage-booking?id=${bookingId}&success=Request+submitted`);
  } catch (error) {
    console.error("Error creating request:", error);
    return res.redirect(`/manage-booking?id=${bookingId}&error=Server+error`);
  }
};

const addSupportRequest = async (req, res) => {
  const bookingId = req.params.bookingId;
  const userId = req.session.userId;

  try {
    const { passengerName, subject, reqContent, firstName, lastName } = req.body;
    console.log("Received:", { passengerName, subject, reqContent, firstName, lastName });
    console.log("Files:", req.files);

    if (!userId || !bookingId || !passengerName) {
      return res.redirect(`/manage-booking?id=${bookingId}&error=Missing+required+fields`);
    }

    const bookingExists = await Bookings.findById(bookingId);
    if (!bookingExists) {
      return res.redirect(`/manage-booking?id=${bookingId}&error=Booking+not+found`);
    }

    const filePaths = (req.files || []).map(file => `/uploads/requests/${file.filename}`);

    const request = new Requests({
      userId,
      bookingId,
      category: "support",
      subject,
      passengerName,
      request: reqContent || "",
      fileUrl: filePaths,
      reqName: [
        {
          firstName: firstName || "",
          lastName: lastName || ""
        }
      ]
    });

    await request.save();

    return res.redirect(`/manage-booking?id=${bookingId}&success=Request+submitted`);
  } catch (error) {
    console.error("Error creating request:", error);
    return res.redirect(`/manage-booking?id=${bookingId}&error=Server+error`);
  }
};

const addAddonRequest = async (req, res) => {
  const bookingId = req.params.bookingId;
  const userId = req.session.userId;

  try {
    const { passengerName, subject, visaDuration, returnDate, hotelDate, location, passengerIdentification1, passengerIdentification2, type1, type2 } = req.body;
    console.log("Received:", { passengerName, subject, visaDuration, returnDate, hotelDate, location, passengerIdentification1, passengerIdentification2, type1, type2 });

    if (!userId || !bookingId || !passengerName) {
      return res.redirect(`/manage-booking?id=${bookingId}&error=Missing+required+fields`);
    }

    const bookingExists = await Bookings.findById(bookingId);
    if (!bookingExists) {
      return res.redirect(`/manage-booking?id=${bookingId}&error=Booking+not+found`);
    }

    const request = new Requests({
      userId,
      bookingId,
      category: "add-on",
      subject,
      passengerName,
      visaDuration: visaDuration || "",
      returnDate: returnDate || "",
      hotelDate: hotelDate || "",
      location: location || "",
      passengerIdentification: [
        {
          passengerIdentification1: passengerIdentification1 || "",
          passengerIdentification2: passengerIdentification2 || "",
          type1: type1 || "",
          type2: type2 || ""
        }
      ]
    });

    await request.save();

    return res.redirect(`/manage-booking?id=${bookingId}&success=Request+submitted`);
  } catch (error) {
    console.error("Error creating request:", error);
    return res.redirect(`/manage-booking?id=${bookingId}&error=Server+error`);
  }
};

module.exports = {
  viewHomepage,
  viewDashboard,
  viewFlightList,
  viewFlightDetail,
  viewFlightBooking,
  viewAbout,
  viewContact,
  viewSignin,
  viewSignup,
  viewForgotPassword,
  viewBlog,
  viewBlogDetail,
  viewHelp,
  viewHelpDetail,
  viewFAQ,
  viewHelpContact,
  viewSupportTicket,
  viewTerms,
  viewPrivacy,
  viewCookies,
  viewDisclaimer,
  findTicket,
  getFlightDetail,
  getFlights,
  signup,
  signin,
  forgotPassword,
  resetPassword,
  viewResetPassword,
  signOut,
  sendOtp,
  verifyOtp,
  viewProfile,
  viewBookings,
  viewTravelers,
  viewPaymentDetails,
  viewWishlist,
  viewSettings,
  viewDeleteProfile,
  viewKyc,
  viewManageSubscription,
  flightBooking,
  updateProfile,
  updateEmail,
  updateWhatsapp,
  updatePassword,
  verifyCard,
  verifyAadhaar,
  viewManageBooking,
  getSellerList,
  viewPricing,
  subscription,
  viewSubscriptionPayment,
  subscriptionPayment,
  freeSubscription,
  renewal,
  freeRenewal,
  agentSubscription,
  viewEarnings,
  viewListings,
  viewAddListing,
  viewJoinUs,
  viewUserBookings,
  viewUserBookingDetail,
  addFlight,
  getApiFlights,
  getApiCountries,
  updateListingById,
  searchAirports,
  searchFilteredAirports,
  getToAirports,
  searchAirlines,
  changeStatus,
  viewAgentSubscription,
  updateSeatById,
  updateDateById,
  addBank,
  removeBank,
  viewTransactions,
  addSupportTicket,
  viewNotifications,
  contact,
  cancelBooking,
  bookingSupportTicket,
  viewPopularFlights,
  viewSellerBooking,
  addServiceRequest,
  addSupportRequest,
  addAddonRequest,
};
