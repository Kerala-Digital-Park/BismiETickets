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
const { countries } = require('countries-list');
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
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

const viewHomepage = async (req, res) => {
  try {
    res.render("user/home", {});
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
    } = req.query;
    console.log(req.body)

    // Convert numeric values back from query string
    const requestDetails = {
      from,
      to,
      departureDate,
      returnDate,
      flexible: flexible === "true", // Convert back to boolean
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
    };

    console.log(requestDetails)
    res.render("user/flight-list", { flights: [],refilteredFlights:[], requestDetails });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

// const viewFlightDetail = async (req, res) => {
//   try {
//     res.render("user/flight-detail", {selectedFlight: []});
//   } catch (error) {
//     console.error(error);
//     res.render("error", { error });
//   }
// };

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

const viewSignin = async (req, res) => {
  try {
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    res.render("user/sign-in", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
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
  try {
    res.render("user/help", {});
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
    } = req.body;
console.log(req.body);

    console.log(adults, children, infants)
    const flexible = dateTypeCheckbox === "on";
    console.log(flexible);

    if (flexible && (!from || !to || !departureDate || !returnDate)) {
      res.redirect("/");
    }

    if (!flexible && (!fixedFrom || !fixedTo || !departure)) {
      res.redirect("/");
    }

    const requestDetails = {
      from,
      to,
      fixedFrom,
      fixedTo,
      departure,
      returnDate,
      departureDate,
      flexible: flexible === true, // Convert back to boolean
      adults: (adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
    };

    const flights = await Flights.find();
    console.log("flights", flights[0].inventoryDates[0].date);

    // Function to check if a date falls within a range
    const isDateInRange = (dateStr, startDateStr, endDateStr) => {
      const date = new Date(dateStr);
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      return date >= startDate && date <= endDate;
    };

    // Filter flights based on from, to, and flexible criteria
    const filteredFlights = flights.filter((flight) => {
      if (flexible) {
        return (
          isDateInRange(
            flight.inventoryDates[0].date,
            departureDate,
            returnDate
          ) &&
          flight.from.toUpperCase() === from &&
          flight.to.toUpperCase() === to
        );
      } else {
        return (
          flight.inventoryDates[0].date === departure &&
          flight.from.toUpperCase() === fixedFrom &&
          flight.to.toUpperCase() === fixedTo
        );
      }
    });
    console.log(filteredFlights);
    console.log(requestDetails);

    // Total passengers
const totalPassengers =
parseInt(requestDetails.adults) +
parseInt(requestDetails.children) +
parseInt(requestDetails.infants);

// Create a map to track the lowest fare per airline for flights with enough seats
const airlineMap = new Map();

filteredFlights.forEach(flight => {
const inventory = flight.inventoryDates?.[0];
const airline = flight.stops?.[0]?.airline || "Unknown";
const fare = inventory?.fare?.adults || Infinity;
const seatsAvailable = inventory?.seats || 0;

if (seatsAvailable >= totalPassengers) {
  if (!airlineMap.has(airline) || fare < airlineMap.get(airline).fare) {
    airlineMap.set(airline, { flight, fare });
  }
}
});

console.log(airlineMap);

// Extract the best fare flight for each airline
const refilteredFlights = Array.from(airlineMap.values()).map(entry => entry.flight);
console.log(refilteredFlights);

res.render("user/flight-list", {
  flights: filteredFlights,          
  refilteredFlights,                 
  requestDetails,
});

  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

let flightRequests  // Temporary in-memory storage

// const getFlightDetail = async (req, res) => {
//   const { id, requestDetails } = req.body;

//   try {
//     // Store requestDetails temporarily in memory
//     flightRequests.set(id, requestDetails);

//     // Send redirect URL to frontend
//     res.status(200).json({ redirectUrl: `/flight-detail?id=${id}` });
//   } catch (error) {
//     console.error("Error fetching flight details:", error);
//     res.status(400).json({ error: "Invalid flight data" });
//   }
// };

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
    console.log(flightRequests)

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

    res.render("user/flight-detail", {
      flightDetails,
      requestDetails: requestDetails,
      subscription,

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

    res.render("user/flights", { id, flight,   agentsWithFlights, requestDetails: "" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewManageBooking = async (req, res) => {
  const bookingId = req.query.id;

  try {
    const bookings = await Bookings.findById(bookingId).populate("userId").populate("flight")
    res.render("user/manage-booking", { requestDetails: "" , bookings});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// const signup = async (req, res) => {
//   try {
//     const { name, email, pan, password, confirmPassword } = req.body;
//     if (password !== confirmPassword) {
//       return res.render("user/sign-up", {
//         message: "Password does not match",
//         messageType: "danger",
//       });
//     }

//     // Check if the email already exists
//     const existingUserByEmail = await Users.findOne({ email });
//     if (existingUserByEmail) {
//       return res.render("user/sign-up", {
//         message: "User with this email already exists",
//         messageType: "danger",
//       });
//     }

//     // Check if the PAN already exists
//     const existingUserByPAN = await Users.findOne({ pan });
//     if (existingUserByPAN) {
//       return res.render("user/sign-up", {
//         message: "User with this PAN already exists",
//         messageType: "danger",
//       });
//     }

//     const expiry_date = new Date(30-12-2500);

//     const newUser = new Users({
//       name: name,
//       email: email,
//       pan: pan,
//       password: password,
//       subscription.expiryDate: expiry_date
//     });

//     await newUser.save();

//     const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, {
//       expiresIn: "7d",
//     });

//     return res.redirect("/sign-in");
//   } catch (error) {
//     console.error(error);
//   }
// };

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

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({ email });
    if (!user)
      return res.render("user/sign-in", {
        message: "Invalid credentials",
        messageType: "danger",
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.render("user/sign-in", {
        message: "Invalid credentials",
        messageType: "danger",
      });

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.userId = user._id;

    const redirectUrl = req.session?.originalUrl || "/";
    if (req.session) delete req.session.originalUrl;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const signOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.error(error);
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

    const bookings = await Bookings.find({ userId: userId });

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

    bookingsWithFlights.forEach((booking) => {
      if (
        booking.flightDetails &&
        booking.flightDetails.departureDate &&
        booking.flightDetails.departureTime
      ) {
        const formattedDateStr = booking.flightDetails.departureDate + " 20:00"; // Adding a default time for parsing
        const departureDate = new Date(Date.parse(formattedDateStr));
        // If the arrival time is given separately, merge it
        if (booking.flightDetails.departureTime) {
          const [hours, minutes] =
            booking.flightDetails.departureTime.split(":");
          departureDate.setHours(parseInt(hours), parseInt(minutes));
        }

        if (departureDate <= today) {
          completedBookings.push(booking);
        } else {
          upcomingBookings.push(booking);
        }
      } else {
        upcomingBookings.push(booking);
      }
    });

    res.render("user/bookings", {
      upcomingBookings,
      completedBookings,
      user: userDetails,
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
      amount: totalFare, 
    });

    await newTransaction.save();

    await Users.findByIdAndUpdate(req.session.userId, {
      $inc: {
        "transactions": 1,
        "transactionAmount": totalFare,
      },
    });

    const flightId = flightDetails._id;
    const travelDate = flightDetails.departureDate;

    const updatedFlight = await Flights.findOneAndUpdate(
      { _id: flightId, "inventoryDates.date": travelDate },
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

    return res
      .status(201)
      .json({ message: "Booking successful", bookingId: newBooking._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  const { name, email, mobile, nationality, gender, address } = req.body;
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

    // Prepare updated data
    const updatedData = {
      name: name,
      email: email,
      mobile: mobile,
      nationality: nationality,
      gender: gender,
      address: address,
    };

    // Handle profile image upload
    if (req.file) {
      // Delete old image if exists
      if (user.image && user.image !== "/assets/images/avatar/default.png") {
        const oldImagePath = path.join(__dirname, "..", "public", user.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new image path
      updatedData.image = "/uploads/" + req.file.filename;
    }

    // Update user in the database
    const updatedUser = await Users.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });
    console.log(updatedUser);

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateEmail = async (req, res) => {
  const { email } = req.body;
  console.log(req.body);

  try {
    const userId = req.session.userId; // Get logged-in user ID
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // Check if the new email already exists
    const existingUser = await Users.findOne({ email: email });
    if (existingUser && existingUser._id.toString() !== userId) {
      // Ensure it's not the current user's email
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // Fetch user from database
    const user = await Users.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update user in the database
    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { email: email },
      { new: true }
    );
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating email:", error);
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

    const user = await Users.findById(userId).populate('subscription');
    const subscription = user.subscription;
    console.log(subscription)
    
    if (!subscription) {
      return res.status(400).json({ success: false, message: "Subscription not found" });
    }

    console.log(req.files);

    const today = new Date();

    // Format today's date to YYYY-MM-DD
    const todayFormatted = today.toISOString().split("T")[0];

    // Calculate the expiry date (30 days from today)
    const subscriptionDate = new Date(today); // Create a copy of today's date
    subscriptionDate.setDate(subscriptionDate.getDate() + 30);

    // Format expiry date to YYYY-MM-DD
    const expiryDate = subscriptionDate.toISOString().split("T")[0];

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

      user.visitingCard = "/uploads/" + visitingCardFile.filename;
      user.panCard = "/uploads/" + panCardFile.filename;

  if (subscription.subscription === "Null") {
    const defaultPlan = await Subscriptions.findOne({
      subscription: "Free",
      role: user.userRole,
    });

    if (!defaultPlan) {
      return res.status(400).json({
        success: false,
        message: "Default subscription plan not found",
      });
    }

    user.subscription = defaultPlan._id;
  }

  user.subscriptionDate = todayFormatted;
  user.expiryDate = expiryDate;
  user.kyc = "Initial";
  user.transactions = 0;
  user.transactionAmount = 0;

  await user.save();

      res.json({
        success: true,
        user,
        message: "Visiting card and PAN card uploaded successfully!",
      });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Visiting Card and Pan Card are required.",
        });
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

    const user = await Users.findById(userId).populate("subscription");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (req.files && req.files.aadhaar1 && req.files.aadhaar2) {
      // Access files using req.files.fieldname
      const aadhaarCard1File = req.files.aadhaar1[0];
      const aadhaarCard2File = req.files.aadhaar2[0];

      if (!aadhaarCard1File || !aadhaarCard2File) {
        return res
          .status(400)
          .json({ success: false, message: "Both Aadhaar Card front and back are required." });
      }

      user.aadhaarCardFront = "/uploads/" + aadhaarCard1File.filename;
      user.aadhaarCardBack = "/uploads/" + aadhaarCard2File.filename;

      if (user.subscription && user.subscription.subscription === "Free") {
        user.kyc = "Completed";
        user.transactions = 0;
        user.transactionAmount = 0;
      }
      await user.save();

      res.json({
        success: true,
        user,
        message: "Aadhaar card uploaded successfully!",
      });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Aadhaar Card Front and Back are required.",
        });
    }
  } catch (error) {
    console.error("Error verifying aadhaar:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// const subscription = async (req, res) => {
//   const { subscription } = req.body;
//   const userId = req.session.userId;
//   try {
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }
//     const user = await Users.findById(userId);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     if(subscription === "Free") {
//       if(user.subscription.subscription === "Free"){
//         return res.json({ redirectUrl: "/subscription-payment?subscription=Free", message:"Free subscription already taken" });
//       }
//       else if (user.subscription.kyc === "Pending"){
//         return res.json({ redirectUrl: "/kyc", message:"Complete Initial kyc for free subscription" });
//       }
//     }
//     else if(subscription === "Pro"){
//       if(user.subscription.subscription === "Pro"){
//         return res.json({ redirectUrl: "/subscription-payment?subscription=Pro", message:"Pro subscription already taken" });
//       }
//       else if(user.subscription.kyc !== "Completed"){
//         return res.json({ redirectUrl: "/kyc", message:"Complete kyc for pro subscription" });
//       }
//       else{
//         res.status(200).json({ redirectUrl: `/subscription-payment?subscription=${subscription}` });
//       }
//     }
//     else if(subscription === "Enterprise"){
//       if(user.subscription.subscription === "Enterprise"){
//         return res.json({ redirectUrl: "/subscription-payment?subscription=Enterprise", message:"Enterprise subscription already taken" });
//       }
//       else if(user.subscription.kyc !== "Completed"){
//         return res.json({ redirectUrl: "/kyc", message:"Complete kyc for enterprise" });
//       } else{
//         res.status(200).json({ redirectUrl: `/subscription-payment?subscription=${subscription}` });
//       }
//     }else {
//       res.status(201).json({ redirectUrl: "/subscription", message:"Invalid subscription" });
//     }
//   } catch (error) {
//     console.error("Error fetching payment details:", error);
//     res.status(400).json({ error: "Invalid subscription detail" });
//   }
// };

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

    if (subscription === "Free") {
      if (user.subscription.subscription === "Free") {
        return res.json({
          redirectUrl: "/subscription",
          message: "Free subscription already active. Choose another plan",
        });
      } else if (user.kyc === "Pending") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete Initial KYC for free subscription",
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
      subscription: "Free",
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
    res.render("user/pricing", {});
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

    if (subscription === "Starter") {
      if (user.subscription.subscription === "Starter") {
        return res.json({
          redirectUrl: "/join-us",
          message: "Starter subscription already active",
        });
      } else if (user.kyc !== "Completed") {
        return res.json({
          redirectUrl: "/kyc",
          message: "Complete KYC for Starter subscription",
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
  try {
    res.render("user/earnings", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewListings = async (req, res) => {
  const userId = req.session.userId;
  try {
    const flights = await Flights.find({ sellerId: userId })
      .populate("sellerId")
      .sort({ createdAt: -1 });
    
    if (!flights || flights.length === 0) {
      return res.status(404).json({ success: false, message: "No flights found" });
    }

    res.render("user/listings", {flights});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddListing = async (req, res) => {
  try {
    res.render("user/add-listings", {  });  
  } catch (error) {
    console.log(error);
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
    res.render("user/join-us", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

// const viewUserBookings = async (req, res) => {
//   const userId = req.session.userId;
//   const search = req.query.search || '';
//   const page = parseInt(req.query.page) || 1;
//   const limit =4;
//   const skip = (page - 1) * limit;

//   try {
//     let flightIds = [];

//     if (search) {
//       const matchingFlights = await Flights.find({
//         $or: [
//           { fromCity: { $regex: search, $options: 'i' } },
//           { toCity: { $regex: search, $options: 'i' } }
//         ]
//       }).select('_id');

//       flightIds = matchingFlights.map(f => f._id);
//     }

//     let query = {};
//     if (search) {
//       query = {
//         $or: [
//           { bookingId: { $regex: search, $options: 'i' } },
//           { flight: { $in: flightIds } }
//         ]
//       };
//     }

//     // Get total for pagination
//     const allMatchingBookings = await Bookings.find(query)
//       .populate("flight")
//       .populate("userId");

      
//       const sellerBookings = allMatchingBookings.filter(booking => {
//         return booking.flight?.sellerId?.toString() === userId;
//       });
      
//       const paginatedBookings = sellerBookings.slice(skip, skip + limit);
//       console.log(paginatedBookings)

//     const totalPages = Math.ceil(sellerBookings.length / limit);

//     res.render("user/user-booking", {
//       bookings: paginatedBookings,
//       search,
//       currentPage: page,
//       totalPages,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Internal Server Error" });
//   }
// };

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

const addFlight = async (req, res) => {
  console.log("Adding flights");
  const oneWayFlight = req.body;
  console.log(oneWayFlight);

  try {
    const newFlight = new Flights({
      sellerId: oneWayFlight.sellerId,
      inventoryName: oneWayFlight.inventoryName,
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
          date: oneWayFlight.inventoryDates[0]?.date,
          pnr: oneWayFlight.inventoryDates[0]?.pnr,
          seats: oneWayFlight.inventoryDates[0]?.seats,
          fare: {
            adults: oneWayFlight.inventoryDates[0]?.fare.adults,
            infants: oneWayFlight.inventoryDates[0]?.fare.infants,
          },
        },
      ],
      refundable: oneWayFlight.refundable,
    });

    await newFlight.save();
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
  res.json(countryList);
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
  viewTerms,
  viewPrivacy,
  findTicket,
  getFlightDetail,
  getFlights,
  signup,
  signin,
  forgotPassword,
  resetPassword,
  viewResetPassword,
  signOut,
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
  addFlight,
  getApiFlights,
  getApiCountries,
  updateListingById,
  searchAirports,
  searchAirlines,
  changeStatus,
  viewAgentSubscription,
  updateSeatById,
  updateDateById,

};
