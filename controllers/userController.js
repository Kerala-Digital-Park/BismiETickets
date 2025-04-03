const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Flights = require("../models/flightModel");
const Users = require("../models/userModel");
const Bookings = require("../models/bookingModel");
// const Subscriptions = require('../models/subscriptionModel');
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

const viewFlightList = async (req, res) => {
  try {
    // Extract request details from query parameters
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

    res.render("user/flight-list", { flights: [], requestDetails });
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

    console.log(
      from,
      to,
      departure,
      departureDate,
      returnDate,
      dateTypeCheckbox
    );

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
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
    };

    const flights = await Flights.find();

    const formatDateToStandard = (dateStr) => {
      if (!dateStr || typeof dateStr !== "string") {
        console.error("Invalid date format received:", dateStr);
        return null; // Handle cases where dateStr is not a valid string
      }

      // Split date manually to ensure it's parsed correctly
      const [day, month, year] = dateStr.split(" ");
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

      if (!monthMap[month]) {
        console.error("Invalid month format:", month);
        return null;
      }

      const formattedDateStr = `${year}-${monthMap[month]}-${day.padStart(
        2,
        "0"
      )}`;
      return formattedDateStr;
    };

    // Convert frontend departureDate & returnDate to standard format
    const formattedDeparture = departure
      ? formatDateToStandard(departure)
      : null;
    const formattedDepartureDate = departureDate
      ? formatDateToStandard(departureDate)
      : null;
    const formattedReturnDate = returnDate
      ? formatDateToStandard(returnDate)
      : null;

    console.log(formattedDepartureDate, formattedReturnDate);

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
            formattedDepartureDate || departureDate,
            formattedReturnDate || returnDate
          ) &&
          flight.from === from &&
          flight.to === to
        );
      } else {
        return (
          flight.inventoryDates[0].date === formattedDeparture &&
          fixedFrom === flight.from &&
          fixedTo === flight.to
        );
      }
    });
    console.log(filteredFlights);
    console.log(requestDetails);

    res.render("user/flight-list", {
      flights: filteredFlights,
      requestDetails,
    });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const flightRequests = new Map(); // Temporary in-memory storage

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
  const { id } = req.body;
  try {
    // Store requestDetails temporarily in memory
    // flightRequests.set(id, requestDetails);

    // Send redirect URL to frontend
    res.status(200).json({ redirectUrl: `/flight-detail?id=${id}` });
  } catch (error) {
    console.error("Error fetching flight details:", error);
    res.status(400).json({ error: "Invalid flight data" });
  }
};

const getSellerList = async (req, res) => {
  const { id, requestDetails } = req.body;

  try {
    // Store requestDetails temporarily in memory
    flightRequests.set(id, requestDetails);

    // Send redirect URL to frontend
    res.status(200).json({ redirectUrl: `/flights?id=${id}` });
  } catch (error) {
    console.error("Error fetching sellers:", error);
    res.status(400).json({ error: "Invalid flight data" });
  }
};

// Handle GET request to retrieve data after redirect
const viewFlightDetail = async (req, res) => {
  const { id } = req.query;

  try {
    const flightDetails = await Flights.findById(id);
    if (!flightDetails) {
      return res.status(404).send("Flight not found");
    }

    // Retrieve requestDetails from memory and remove it
    const requestDetails = flightRequests.get(id) || {};
    // flightRequests.delete(id);
    console.log(requestDetails);

    res.render("user/flight-detail", {
      flightDetails,
      requestDetails: requestDetails,
    });
  } catch (error) {
    console.error("Error fetching flight details:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getFlights = async (req, res) => {
  const { id } = req.query;
  try {
    res.render("user/flights", { id, requestDetails: "" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewManageBooking = async (req, res) => {
  try {
    res.render("user/manage-booking", { requestDetails: "" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const signup = async (req, res) => {
  try {
    const { name, email, pan, password, confirmPassword } = req.body;
    if (password != confirmPassword) {
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

    const newUser = new Users({
      name: name,
      email: email,
      pan: pan,
      password: password,
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.redirect("/sign-in");
  } catch (error) {
    console.error(error);
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
    return res
      .status(400)
      .render("user/reset-password", {
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
      return res
        .status(400)
        .render("user/reset-password", {
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

const signOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewProfile = async (req, res) => {
  const userId = req.session.userId;
  try {
    const userDetails = await Users.findById(userId);
    res.render("user/profile", { userDetails });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewBookings = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log(userId);

    const bookings = await Bookings.find({ userId: userId });
    console.log(bookings);

    const bookingsWithFlights = await Promise.all(
      bookings.map(async (booking) => {
        const flightDetails = await Flights.findById(booking.flight);
        return { ...booking.toObject(), flightDetails };
      })
    );

    const userDetails = await Users.findById(userId);
    console.log(userDetails);

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
        console.log(departureDate);
        // If the arrival time is given separately, merge it
        if (booking.flightDetails.departureTime) {
          const [hours, minutes] = booking.flightDetails.departureTime.split(":");
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

    console.log({ upcomingBookings, completedBookings });

    console.log(bookingsWithFlights);
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
  try{
    const userDetails = await Users.findById(userId).populate('subscription');;
    res.render("user/kyc", { userDetails });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
}

const flightBooking = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      travelers,
      mobile_number,
      email,
      totalFare,
      flightDetails,
    } = req.body;

    // Validate request data
    if (
      !travelers ||
      travelers.length === 0 ||
      !mobile_number ||
      !email ||
      !razorpay_payment_id ||
      !totalFare ||
      !flightDetails
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
      payment_status: paid,
    });

    await newBooking.save();

    console.log(newBooking);

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
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let updatedData = {};

    if (req.file) {
      updatedData.visitingCard = "/uploads/" + req.file.filename;

      if (user.subscription.subscription === "Null") {
        updatedData["subscription.subscription"] = "Free"; // Update only the subscription field
        updatedData["subscription.kyc"] = "Initial"; // update kyc
        updatedData["subscription.transactions"] = 0; //reset transaction
        updatedData["subscription.transactionLimit"] = 10; // set limit
        updatedData["subscription.maxTransactionAmount"] = 100000; //set max amount
      }
    }

    const updatedUser = await Users.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    res.json({ success: true, user: updatedUser, message: "Visiting card uploaded successfully!" });
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

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let updatedData = {};

    if (req.file) {
      updatedData.aadhaarCard = "/uploads/" + req.file.filename;

      if (user.subscription.subscription === "Free") {
        updatedData["subscription.subscription"] = "Pro"; // Update only the subscription field
        updatedData["subscription.kyc"] = "Completed"; //update kyc
        updatedData["subscription.transactions"] = 0; //reset transaction
        updatedData["subscription.transactionLimit"] = 1000; //set limit
        updatedData["subscription.maxTransactionAmount"] = 10000000; //set max amount
      } 
    }

    const updatedUser = await Users.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    res.json({ success: true, user: updatedUser, message: "Aadhaar card uploaded successfully!" });
  } catch (error) {
    console.error("Error verifying aadhaar:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// const verifyCard = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const user = await Users.findById(userId).populate("subscription");
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     let updatedData = {};
//     if (req.file) {
//       updatedData.visitingCard = "/uploads/" + req.file.filename;
//     }

//     if (user.subscription && user.subscription.kyc === "Pending") {
//       await Subscriptions.findByIdAndUpdate(user.subscription._id, { kyc: "Initial" });
//     }

//     const updatedUser = await Users.findByIdAndUpdate(userId, updatedData, { new: true });
//     res.json({ success: true, user: updatedUser, message: "Visiting card uploaded successfully!" });
//   } catch (error) {
//     console.error("Error verifying card:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// const verifyAadhaar = async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const user = await Users.findById(userId).populate("subscription");
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     let updatedData = {};
//     if (req.file) {
//       updatedData.aadhaarCard = "/uploads/" + req.file.filename;
//     }

//     if (user.subscription && user.subscription.kyc === "Initial") {
//       await Subscriptions.findByIdAndUpdate(user.subscription._id, { kyc: "Completed" });
//     }

//     const updatedUser = await Users.findByIdAndUpdate(userId, updatedData, { new: true });
//     res.json({ success: true, user: updatedUser, message: "Aadhaar card uploaded successfully!" });
//   } catch (error) {
//     console.error("Error verifying aadhaar:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


module.exports = {
  viewHomepage,
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
  flightBooking,
  updateProfile,
  updateEmail,
  updatePassword,
  verifyCard,
  verifyAadhaar,
  viewManageBooking,
  getSellerList,

};
