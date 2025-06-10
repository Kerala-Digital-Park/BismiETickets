const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const Coupon = require("../models/couponModel");
const Flight = require("../models/flightModel");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const BankUpdates = require("../models/bankUpdateModel");
const KycUpdates = require("../models/kycUpdateModel");
const Transaction = require("../models/transactionModel");
const Support = require("../models/supportModel");
const Airport = require("../models/airportModel");
const PopularFlight = require("../models/popularFlightModel");
const ProfileUpdates = require("../models/profileUpdateModel");

const viewLogin = async (req, res) => {
  try {
    res.render("admin/login", { message: "" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password)
    const admin = await User.findOne({ email, userRole: "Admin" });
    if (!admin) {
      return res.render("admin/login", {
        message: "Invalid email or not an admin",
        messageType: "danger",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("admin/login", {
        message: "Invalid password",
        messageType: "danger",
      });
    }

    const token = jwt.sign({ id: admin._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.admin = token;
    req.session.adminId = admin._id;
    
    res.redirect("/admin/");
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const logoutAdmin = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/admin/login");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const viewDashboard = async (req, res) => {
  try {
    const bookings = await Booking.find()
    .populate("userId")
    .populate("flight")
    .sort({ createdAt: -1 }); 

    const flights = await Flight.find()
    .sort({ createdAt: -1 });

    const users = await User.find({userRole:"User"});
    const sellers = await User.find({userRole:"Agent"});
    const popularFlights = await PopularFlight.find().limit(4);
    const airports = await Airport.find().limit(2);

    res.render("admin/dashboard", {
      bookings,
      flights,
      users,
      sellers,
      popularFlights,
      airports,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
        { "flightData.from": { $regex: search, $options: "i" } },
        { "flightData.to": { $regex: search, $options: "i" } },
        { "userData.userId": { $regex: search, $options: "i" } }
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      {
        $unwind: {
          path: "$flightData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: matchStage
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [{ $count: "count" }]
        }
      }
    ];

    const result = await Booking.aggregate(pipeline);
    const bookings = result[0].data;
    const totalCount = result[0].total[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;

    bookings.forEach((booking) => {
      if (!booking.flightData) return;
      const departureDate = new Date(booking.flightData.departureDate);
      if (booking.status === "cancelled") cancelledBookings++;
      else if (departureDate > today) upcomingBookings++;
      else completedBookings++;
    });

    res.render("admin/bookings", {
      bookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewBookingDetail = async (req, res) => {
  const bookingId = req.params.id;
  try {
    const booking = await Booking.findById(bookingId)
      .populate("userId")
      .populate("flight");
    res.render("admin/bookingDetail", { booking });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUsers = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  try {
    let query = { userRole: "User" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    const totalCount = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("subscription")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/users", {
      users,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUserDetail = async (req, res) => {
  try {
    res.render("admin/userDetail", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAgents = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  try {
    let query = { userRole: "Agent" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    const totalCount = await User.countDocuments(query);
    const agents = await User.find(query)
      .populate("subscription")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalCount / limit);

    const agentIds = agents.map((agent) => agent._id);

    const flights = await Flight.find({ sellerId: { $in: agentIds } });

    const flightCountMap = {};

    flights.forEach((flight) => {
      const sellerId = flight.sellerId.toString();
      flightCountMap[sellerId] = (flightCountMap[sellerId] || 0) + 1;
    });

    const agentsWithFlightCount = agents.map((agent) => {
      const agentObj = agent.toObject();
      agentObj.flightCount = flightCountMap[agent._id.toString()] || 0;
      return agentObj;
    });

    res.render("admin/agents", {
      agents: agentsWithFlightCount,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAgentDetail = async (req, res) => {
  const agentId = req.params.id;
  try {
    const agent = await User.findById(agentId).populate("subscription");
    if (!agent) return res.status(404).send("Agent not found");

    const flights = await Flight.find({ sellerId: agentId });

    res.render("admin/agentDetail", { agent, flights });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewSettings = async (req, res) => {
  try {
    res.render("admin/settings", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddFlight = async (req, res) => {
  try {
    const admin = await User.findOne({userRole: "Admin"});
    const adminId = admin._id;
    // Get the flight with the highest inventoryId
    const lastFlight = await Flight.findOne({})
      .sort({ createdAt: -1 })
      .select("inventoryId");

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

    res.render("admin/addFlight", {
      inventoryId: nextInventoryId,
      userId: adminId,
    });
  } catch (error) {
    console.error("Error generating inventoryId:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({});
    res.render("admin/coupons", { coupons });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAddCoupon = async (req, res) => {
  try {
    const { name, code, discount, expiry } = req.body;
    await Coupon.create({ name, code, discount, expiry });
    res.redirect("/admin/coupons");
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.redirect("/admin/coupons");
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.render("admin/subscriptions", { subscriptions });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const addSubscription = async (req, res) => {
  try {
    const {
      subscription,
      transactionLimit,
      maxTransactionAmount,
      price,
      serviceCharge,
      features,
    } = req.body;

    const featureArray = features.split(",").map((item) => item.trim());

    const newPlan = new Subscription({
      subscription,
      transactionLimit,
      maxTransactionAmount,
      price,
      serviceCharge,
      features: featureArray,
    });

    await newPlan.save();
    res.redirect("/admin/subscriptions");
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewEditSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    res.render("admin/editSubscription", { subscription });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const editSubscription = async (req, res) => {
  try {
    await Subscription.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/admin/subscriptions");
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteSubscription = async (req, res) => {
  try {
    await Subscription.findByIdAndDelete(req.params.id);
    res.redirect("/admin/subscriptions");
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteUser = async (req, res) => {
  console.log("Delete user called");
  const userId = req.params.id;
  try {
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const deleteAgent = async (req, res) => {
  console.log("Delete user called");
  const agentId = req.params.id;
  try {
    await User.findByIdAndDelete(agentId);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewBankUpdates = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    // Build the match stage conditionally
    let matchStage = {};
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage = {
        $or: [
          { "user.name": regex },
          { "user.email": regex },
          { "user._id": { $regex: search, $options: "i" } }, // _id must be string
          { "bankDetails.accountHolderName": regex },
          { "bankDetails.bankName": regex },
        ],
      };
    }

    // Pipeline for pagination
    const pipeline = [
      {
        $lookup: {
          from: "users", // collection name for User model
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // Pipeline for counting total results
    const countPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: matchStage },
      { $count: "totalCount" },
    ];

    // Execute aggregation
    const updates = await BankUpdates.aggregate(pipeline);
    const countResult = await BankUpdates.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/bankUpdates", {
      updates,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const updateBankDetail = async (req, res) => {
  console.log("Update bank detail called");
  const bankUpdateId = req.params.id;
  const { status } = req.body;
  console.log("Bank update ID:", bankUpdateId);
  console.log("Status:", status);
  console.log("Request body:", req.body);

  try {
    const update = await BankUpdates.findById(bankUpdateId).populate("userId");
    if (!update) {
      return res
        .status(404)
        .json({ success: false, message: "Bank update not found" });
    }

    const userId = update.userId._id;

    if (status === "accept") {
      const bankDetails = {
        bankName: update.bankDetails.bankName,
        accountNumber: update.bankDetails.accountNumber,
        ifscCode: update.bankDetails.ifscCode,
        accountHolderName: update.bankDetails.accountHolderName,
        branchName: update.bankDetails.branchName,
        isActive: true, // Set to true when accepting the update
        status: "approved", // Set status to approved
      };

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { bankDetails },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Remove approved bank update request
      await BankUpdates.findByIdAndUpdate(bankUpdateId, {$set: { "status": "approved" }}, { new: true });
      return res.json({
        success: true,
        message: "Bank details accepted successfully",
      });
    }

    if (status === "reject") {
      // Optional: Set a status or delete it
      // await BankUpdates.findByIdAndDelete(bankUpdateId);
      await User.findByIdAndUpdate(userId, {
        $set: {
          "bankDetails.status": "rejected", // Set status to rejected
        },
      });
      await BankUpdates.findByIdAndUpdate(bankUpdateId, {$set: { "status": "rejected" }}, { new: true });
      return res.json({
        success: true,
        message: "Bank details rejected successfully",
      });
    }

    res.redirect("/admin/bankUpdates");
  } catch (error) {
    console.log("Error updating bank detail:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewUserKycUpdates = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    // Build the match stage conditionally
    let matchStage = {};
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage = {
        $or: [
          { "user.name": regex },
          { "user._id": { $regex: search, $options: "i" } }, // _id must be string
          { kyc: regex },
          { "subscription.subscription": regex },
        ],
      };
    }

    matchStage["user.userRole"] = "User";

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: "$subscription" },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // Aggregation pipeline for total count
    const countPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: "$subscription" },
      { $match: matchStage },
      { $count: "totalCount" },
    ];

    // Execute aggregation
    const updates = await KycUpdates.aggregate(pipeline);
    const countResult = await KycUpdates.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/kycUpdates", {
      updates,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewAgentKycUpdates = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    // Build the match stage conditionally
    let matchStage = {};
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage = {
        $or: [
          { "user.name": regex },
          { "user._id": { $regex: search, $options: "i" } }, // _id must be string
          { kyc: regex },
          { "subscription.subscription": regex },
        ],
      };
    }

    matchStage["user.userRole"] = "Agent";

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: "$subscription" },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // Aggregation pipeline for total count
    const countPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscription",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: "$subscription" },
      { $match: matchStage },
      { $count: "totalCount" },
    ];

    // Execute aggregation
    const updates = await KycUpdates.aggregate(pipeline);
    const countResult = await KycUpdates.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/kycUpdates", {
      updates,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const updateKycDetail = async (req, res) => {
  console.log("Update kyc detail called");
  const kycUpdateId = req.params.id;
  const { status } = req.body;
  console.log("Kyc update ID:", kycUpdateId);
  console.log("Status:", status);
  console.log("Request body:", req.body);

  try {
    const update = await KycUpdates.findById(kycUpdateId)
      .populate("userId")
      .populate("subscription");
    if (!update) {
      return res
        .status(404)
        .json({ success: false, message: "KYC update not found" });
    }

    const userId = update.userId._id;
    const role = update.userId.userRole;
    const subscription = update.subscription;

    let subscriptionId;
    let newKyc;

    if (update.kyc === "Pending" && update.visitingCard && update.panCard) {
      if (subscription.subscription === "Null") {
        const defaultPlan = await Subscription.findOne({
          subscription: "Free",
          role: role,
        });
        if (!defaultPlan) {
          return res.status(400).json({
            success: false,
            message: "Default subscription plan not found",
          });
        }
        subscriptionId = defaultPlan._id;
        newKyc = "Initial";
      }
    } else if (
      update.kyc === "Initial" &&
      update.aadhaarCardBack &&
      update.aadhaarCardFront
    ) {
      // if (subscription.subscription === "Free") {
      //   const defaultPlan = await Subscription.findOne({
      //     subscription: "Free",
      //     role: role,
      //   });
      //   if (!defaultPlan) {
      //     return res.status(400).json({
      //     success: false,
      //     message: "Default subscription plan not found",
      //     });
      //   }
      // }
      // subscriptionId = defaultPlan._id;
      newKyc = "Completed";
    }

    const today = new Date();

    // Format today's date to YYYY-MM-DD
    const todayFormatted = today.toISOString().split("T")[0];

    // Calculate the expiry date (30 days from today)
    const subscriptionDate = new Date(today); // Create a copy of today's date
    subscriptionDate.setDate(subscriptionDate.getDate() + 30);

    // Format expiry date to YYYY-MM-DD
    const expiryDate = subscriptionDate.toISOString().split("T")[0];

    if (status === "accept") {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          visitingCard: update.visitingCard ? update.visitingCard : null,
          panCard: update.panCard ? update.panCard : null,
          aadhaarCardFront: update.aadhaarCardFront
            ? update.aadhaarCardFront
            : null,
          aadhaarCardBack: update.aadhaarCardBack
            ? update.aadhaarCardBack
            : null,
          kyc: newKyc,
          subscription: subscriptionId,
          subscriptionDate: todayFormatted,
          expiryDate: expiryDate,
          transactions: 0,
          transactionAmount: 0,
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Remove approved bank update request
      await KycUpdates.findByIdAndDelete(kycUpdateId);
      return res.json({
        success: true,
        message: "Kyc details accepted successfully",
      });
    }

    if (status === "reject") {
      // Optional: Set a status or delete it
      await KycUpdates.findByIdAndDelete(kycUpdateId);
      return res.json({
        success: true,
        message: "Kyc details rejected successfully",
      });
    }

    res.redirect("/admin/kycUpdates");
  } catch (error) {
    console.log("Error updating kyc detail:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

// const viewTransactions = async (req, res) => {
//   const search = req.query.search || "";
//   const page = parseInt(req.query.page) || 1;
//   const limit = 10;
//   const skip = (page - 1) * limit;

//   try {
//     // Build the match stage conditionally
//     let matchStage = {};
//     if (search) {
//       const regex = new RegExp(search, "i");
//       matchStage = {
//         $or: [
//           { "user.name": regex },
//           { "user._id": { $regex: search, $options: "i" } }, // _id must be string
//           { "kyc": regex },
//           { "subscription.subscription": regex },
//         ]
//       };
//     }

//     const pipeline = [
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "subscriptions",
//           localField: "subscription",
//           foreignField: "_id",
//           as: "subscription"
//         }
//       },
//       { $unwind: "$subscription" },
//       { $match: matchStage },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit }
//     ];

//     // Aggregation pipeline for total count
//     const countPipeline = [
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "bookings",
//           localField: "bookingId",
//           foreignField: "_id",
//           as: "booking"
//         }
//       },
//       { $unwind: "$subscription" },
//       { $match: matchStage },
//       { $count: "totalCount" }
//     ];

//     // Execute aggregation
//     const transactions = await Transaction.aggregate(pipeline);
//     const countResult = await Transaction.aggregate(countPipeline);
//     const totalCount = countResult[0]?.totalCount || 0;
//     const totalPages = Math.ceil(totalCount / limit);

//     res.render("admin/transactions", {
//       transactions,
//       search,
//       currentPage: page,
//       totalPages,
//       totalCount,
//       limit
//     });

//   } catch (error) {
//     console.error("Aggregation error:", error);
//     res.status(500).json({ success: false, message: "Internal Server error" });
//   }
// };

// const viewTransactions = async (req, res) => {
//   const search = req.query.search || "";
//   const page = parseInt(req.query.page) || 1;
//   const limit = 10;
//   const skip = (page - 1) * limit;

//   try {
//     const regex = new RegExp(search, "i");

//     // Match stage
//     const matchStage = search
//       ? {
//           $or: [
//             { "user.name": regex },
//             { "user._id": { $regex: search, $options: "i" } },
//             { transactionId: regex },
//             { "booking.bookingId": regex } // assuming bookingId is a string like BFL00001
//           ]
//         }
//       : {};

//     const pipeline = [
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "bookings",
//           localField: "bookingId",
//           foreignField: "_id",
//           as: "booking"
//         }
//       },
//       { $unwind: "$booking" },
//       { $match: matchStage },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit }
//     ];

//     const countPipeline = [
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "bookings",
//           localField: "bookingId",
//           foreignField: "_id",
//           as: "booking"
//         }
//       },
//       { $unwind: "$booking" },
//       { $match: matchStage },
//       { $count: "totalCount" }
//     ];

//     const transactions = await Transaction.aggregate(pipeline);
//     const countResult = await Transaction.aggregate(countPipeline);
//     const totalCount = countResult[0]?.totalCount || 0;
//     const totalPages = Math.ceil(totalCount / limit);

//     res.render("admin/transactions", {
//       transactions,
//       search,
//       currentPage: page,
//       totalPages,
//       totalCount,
//       limit
//     });

//   } catch (error) {
//     console.error("Aggregation error:", error);
//     res.status(500).json({ success: false, message: "Internal Server error" });
//   }
// };

// const viewTransactions = async (req, res) => {
//   const search = req.query.search || "";
//   const page = parseInt(req.query.page) || 1;
//   const limit = 10;
//   const skip = (page - 1) * limit;

//   try {
//     const regex = new RegExp(search, "i");

//     const matchStage = search
//       ? {
//           $or: [
//             { "user.name": regex },
//             { "user._id": { $regex: search, $options: "i" } },
//             { transactionId: regex },
//             { "booking.bookingId": regex },
//             { "bookingUser.name": regex },
//             { "flight.name": regex }, // assuming flight has a `name` field
//           ]
//         }
//       : {};

//     const pipeline = [
//       // Lookup user from transaction.userId
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },

//       // Lookup booking from bookingId
//       {
//         $lookup: {
//           from: "bookings",
//           localField: "bookingId",
//           foreignField: "_id",
//           as: "booking"
//         }
//       },
//       { $unwind: "$booking" },

//       // Lookup user from booking.userId as bookingUser
//       {
//         $lookup: {
//           from: "users",
//           localField: "booking.userId",
//           foreignField: "_id",
//           as: "bookingUser"
//         }
//       },
//       { $unwind: "$bookingUser" },

//       // Lookup flight from booking.flight
//       {
//         $lookup: {
//           from: "flights",
//           localField: "booking.flight",
//           foreignField: "_id",
//           as: "flight"
//         }
//       },
//       { $unwind: "$flight" },

//       { $match: matchStage },
//       { $sort: { createdAt: -1 } },
//       { $skip: skip },
//       { $limit: limit }
//     ];

//     const countPipeline = [
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "bookings",
//           localField: "bookingId",
//           foreignField: "_id",
//           as: "booking"
//         }
//       },
//       { $unwind: "$booking" },
//       {
//         $lookup: {
//           from: "users",
//           localField: "booking.userId",
//           foreignField: "_id",
//           as: "bookingUser"
//         }
//       },
//       { $unwind: "$bookingUser" },
//       {
//         $lookup: {
//           from: "flights",
//           localField: "booking.flight",
//           foreignField: "_id",
//           as: "flight"
//         }
//       },
//       { $unwind: "$flight" },
//       { $match: matchStage },
//       { $count: "totalCount" }
//     ];

//     const transactions = await Transaction.aggregate(pipeline);
//     const countResult = await Transaction.aggregate(countPipeline);
//     const totalCount = countResult[0]?.totalCount || 0;
//     const totalPages = Math.ceil(totalCount / limit);

//     res.render("admin/transactions", {
//       transactions,
//       search,
//       currentPage: page,
//       totalPages,
//       totalCount,
//       limit
//     });

//   } catch (error) {
//     console.error("Aggregation error:", error);
//     res.status(500).json({ success: false, message: "Internal Server error" });
//   }
// };

const viewTransactions = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const regex = new RegExp(search, "i");

    const matchStage = search
      ? {
          $or: [
            { "user.name": regex },
            { "user._id": { $regex: search, $options: "i" } },
            { transactionId: regex },
            { "booking.bookingId": regex },
            { "bookingUser.name": regex },
            { "flight.from": regex }, // search on flight 'from' field
            { "flight.to": regex }, // optionally also search on 'to'
          ],
        }
      : {};

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      {
        $lookup: {
          from: "users",
          localField: "booking.userId",
          foreignField: "_id",
          as: "bookingUser",
        },
      },
      { $unwind: "$bookingUser" },

      // Flatten booking.flight
      {
        $addFields: {
          bookingFlightId: { $toObjectId: "$booking.flight" },
        },
      },
      {
        $lookup: {
          from: "flights",
          localField: "bookingFlightId",
          foreignField: "_id",
          as: "flight",
        },
      },
      { $unwind: "$flight" },

      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const countPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "bookings",
          localField: "bookingId",
          foreignField: "_id",
          as: "booking",
        },
      },
      { $unwind: "$booking" },
      {
        $lookup: {
          from: "users",
          localField: "booking.userId",
          foreignField: "_id",
          as: "bookingUser",
        },
      },
      { $unwind: "$bookingUser" },
      {
        $addFields: {
          bookingFlightId: "$booking.flight",
        },
      },
      {
        $lookup: {
          from: "flights",
          localField: "bookingFlightId",
          foreignField: "_id",
          as: "flight",
        },
      },
      { $unwind: "$flight" },
      { $match: matchStage },
      { $count: "totalCount" },
    ];

    const transactions = await Transaction.aggregate(pipeline);
    const countResult = await Transaction.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/transactions", {
      transactions,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewWithdrawalsById = async (req, res) => {
  console.log("Inside get withdrawals");
  const sellerId = req.params.sellerId;
  const flightId = req.params.flightId;

  try {
    const allBookings = await Booking.find()
      .populate("flight")
      .populate("userId");

    const withdrawalList = [];

    for (const booking of allBookings) {
      if (
        booking.flight._id.toString() === flightId &&
        booking.flight.sellerId.toString() === sellerId
      ) {
        const transaction = await Transaction.findOne({
          bookingId: booking._id,
        });
        const paymentStatus = transaction ? transaction.paymentStatus : null;

        withdrawalList.push({
          ...booking.toObject(),
          paymentStatus,
        });
      }
    }

    return res.render("admin/withdrawalList", { withdrawalList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const withdrawalPayment = async (req, res) => {
  const bookingId = req.params.id;
  const { razorpay_payment_id, baseFare } = req.body;

  try {
    // Validate request data
    if (!razorpay_payment_id || !baseFare) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let paid;
    razorpay_payment_id ? (paid = "Paid") : (paid = "Unpaid");

    const transaction = await Transaction.findOne({ bookingId });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    transaction.paymentStatus = paid;
    transaction.baseFare = baseFare;
    await transaction.save();

    return res.status(201).json({ message: "Payment successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const viewMessages = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  try {
    const matchQuery = {};

    if (search) {
      matchQuery.$or = [
        { "user.name": { $regex: search, $options: "i" } },
        { "user.userId": { $regex: search, $options: "i" } },
        { enquiryType: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ];
    }

    // Aggregation to get paginated and populated data
    const messages = await Support.aggregate([
      {
        $lookup: {
          from: "users", // Make sure the collection name matches your MongoDB Users collection
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      ...(search ? [{ $match: matchQuery }] : []),
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Aggregation to count total matching documents
    const countResult = await Support.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      ...(search ? [{ $match: matchQuery }] : []),
      {
        $count: "total",
      },
    ]);

    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/messages", {
      messages,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const sendResponse = async (req, res) => {
  const { messageId, reply } = req.body;

  try {
    const messageDoc = await Support.findById(messageId);
    if (!messageDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    // Initialize reply array if not already
    if (!Array.isArray(messageDoc.reply)) {
      messageDoc.reply = [];
    }

    // Push structured reply object
    messageDoc.reply.push({
      message: reply,
      date: new Date(),
    });

    await messageDoc.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const addFlight = async (req, res) => {
  console.log("Adding flights");
  const oneWayFlight = req.body;
  console.log(oneWayFlight);

  try {
    const newFlight = new Flight({
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
          // date: oneWayFlight.inventoryDates[0]?.date,
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
      redirectUrl: "/admin/",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const getApiFlights = async (req, res) => {
  console.log("Api flights");
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

const viewPopularFlights = async (req, res) => {
  try {
    const popularFlights = await PopularFlight.find();
    res.render("admin/popularFlights", { popularFlights });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const getAirports = async (req, res) => {
  try {
    const { q } = req.query;

    const query = q ? { Name: { $regex: q, $options: "i" } } : {};

    const airports = await Airport.find(query, { Name: 1, _id: 0 })
      .sort({ Name: 1 })
      .limit(q ? 100 : 25);

    res.json(airports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch airports" });
  }
};

const getAirportsApi = async (req, res) => {
  try {
    const searchCode = req.query.code?.toUpperCase() || '';
    const airports = await Airport.find({ Value: { $regex: searchCode, $options: "i" } });
    res.json({ airports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const addPopularFlights = async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "File upload required" });
    }

    const parseLocation = (input) => {
      const match = input.match(/^(.*)\s\((.*)\)$/);
      if (!match) throw new Error(`Invalid location format: ${input}`);
      return { city: match[1].trim(), code: match[2].trim() };
    };

    const fromParsed = parseLocation(from);
    const toParsed = parseLocation(to);
    const imagePath = "/uploads/" + req.file.filename; 

    const newFlight = new PopularFlight({
      fromCity: fromParsed.city,
      fromCode: fromParsed.code,
      toCity: toParsed.city,
      toCode: toParsed.code,
      image: imagePath,
    });

    await newFlight.save();

    res.redirect("/admin/popular-flights");
  } catch (err) {
    console.error("Error adding popular flight:", err);
    res.status(500).json({ error: "Failed to add popular flight" });
  }
};

const deletePopularFlight = async (req, res) => {
  try {
    const flightId = req.params.id;

    // 1. Find the flight document
    const flight = await PopularFlight.findById(flightId);
    if (!flight) {
      return res.status(404).json({ error: "Flight not found" });
    }

    // 2. Construct image file path
    const imagePath = path.join(__dirname, "..", "public", "uploads", flight.image);

    // 3. Delete the image file
    fs.unlink(imagePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("Error deleting image file:", err);
      }
    });

    // 4. Delete the flight document
    await PopularFlight.findByIdAndDelete(flightId);

    res.redirect("/admin/popular-flights");
  } catch (err) {
    console.error("Error deleting popular flight:", err);
    res.status(500).json({ error: "Failed to delete popular flight" });
  }
};

const cancelBooking = async (req, res) => {
  const { bookingId, reason } = req.body;

  try {
    await Booking.findByIdAndUpdate(bookingId, {
      status: "cancelled",
      cancellationReason: reason, // optional: store the reason
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

const editUser = async (req, res) => {
  try {
    const updatedData = req.body;
    const { userId } = updatedData;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    // Optional: remove fields you don't want to update directly
    // delete updatedData._id;

    const user = await User.findOneAndUpdate(
      { userId: userId },
      { $set: updatedData },
      { new: true } // return updated document
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({ message: 'User updated successfully.', user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

const addAirport = async (req, res) => {
  try {
    const airportData = req.body;

    if (!airportData.Value) {
      return res.status(400).json({ error: "IATA code (Value) is required." });
    }

    // Check if airport with the same Value already exists
    const existing = await Airport.findOne({ Value: airportData.Value.toUpperCase().trim() });

    if (existing) {
      return res.status(409).json({ error: "Airport with this IATA code already exists." });
    }

    // Optional: Ensure Value is stored uppercase
    airportData.Value = airportData.Value.toUpperCase().trim();

    const newAirport = new Airport(airportData);
    await newAirport.save();

    res.status(201).json({ message: "Airport added successfully.", airport: newAirport });
  } catch (error) {
    console.error("Error adding airport:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

const updateAirport = async (req, res) => {
  try {
    const { _id, ...updates } = req.body;
    await Airport.findByIdAndUpdate(_id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update airport." });
  }
}

const viewLatestBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      {
        $unwind: {
          path: "$flightData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: matchStage
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [{ $count: "count" }]
        }
      }
    ];

    const result = await Booking.aggregate(pipeline);
    const bookings = result[0].data;
    const totalCount = result[0].total[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let failedBookings = 0;

    bookings.forEach((booking) => {
      if (!booking.flightData) return;
      const departureDate = new Date(booking.flightData.departureDate);
      if (booking.status === "cancelled") cancelledBookings++;
      else if (departureDate > today) upcomingBookings++;
      else completedBookings++;
    });

    res.render("admin/latest-booking", {
      bookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      failedBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
}

const viewUpcomingBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      { $unwind: { path: "$flightData", preserveNullAndEmptyArrays: true } },
      { $match: matchStage }
    ];

    const allResults = await Booking.aggregate(pipeline);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let failedBookings = 0;

    // Filter for upcoming bookings only
    const upcomingOnlyBookings = allResults.filter((booking) => {
      if (!booking.flightData) return false;
      const departureDate = new Date(booking.flightData.departureDate);

      if (booking.status === "cancelled") {
        cancelledBookings++;
        return false;
      } else if (departureDate > today) {
        upcomingBookings++;
        return true;
      } else {
        completedBookings++;
        return false;
      }
    });

    const totalCount = upcomingOnlyBookings.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const paginatedBookings = upcomingOnlyBookings.slice(skip, skip + limit);

    res.render("admin/upcoming-booking", {
      bookings: paginatedBookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      failedBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewCancelledBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      { $unwind: { path: "$flightData", preserveNullAndEmptyArrays: true } },
      { $match: matchStage }
    ];

    const allResults = await Booking.aggregate(pipeline);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let failedBookings = 0;

    // Filter for upcoming bookings only
    const upcomingOnlyBookings = allResults.filter((booking) => {
      if (!booking.flightData) return false;
      const departureDate = new Date(booking.flightData.departureDate);

      if (booking.status === "cancelled") {
        cancelledBookings++;
        return true;
      } else if (departureDate > today) {
        upcomingBookings++;
        return false;
      } else {
        completedBookings++;
        return false;
      }
    });

    const totalCount = upcomingOnlyBookings.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const paginatedBookings = upcomingOnlyBookings.slice(skip, skip + limit);

    res.render("admin/cancelled-booking", {
      bookings: paginatedBookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      failedBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const viewPastBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      { $unwind: { path: "$flightData", preserveNullAndEmptyArrays: true } },
      { $match: matchStage }
    ];

    const allResults = await Booking.aggregate(pipeline);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let failedBookings = 0;

    // Filter for upcoming bookings only
    const pastOnlyBookings = allResults.filter((booking) => {
      if (!booking.flightData) return false;
      const departureDate = new Date(booking.flightData.departureDate);

      if (booking.status === "cancelled") {
        cancelledBookings++;
        return false;
      } else if (departureDate > today) {
        upcomingBookings++;
        return false;
      } else {
        completedBookings++;
        return true;
      }
    });

    const totalCount = pastOnlyBookings.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const paginatedBookings = pastOnlyBookings.slice(skip, skip + limit);

    res.render("admin/past-booking", {
      bookings: paginatedBookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      failedBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const viewFailedBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      {
        $unwind: {
          path: "$flightData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: matchStage
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [{ $count: "count" }]
        }
      }
    ];

    const result = await Booking.aggregate(pipeline);
    const bookings = result[0].data;
    const totalCount = result[0].total[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let failedBookings = 0;

    bookings.forEach((booking) => {
      if (!booking.flightData) return;
      const departureDate = new Date(booking.flightData.departureDate);
      if (booking.status === "cancelled") cancelledBookings++;
      else if (departureDate > today) upcomingBookings++;
      else completedBookings++;
    });

    res.render("admin/failed-booking", {
      bookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      failedBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
}

const viewInitiatedBookings = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const matchStage = {};

    if (search) {
      matchStage.$or = [
        { bookingId: { $regex: search, $options: "i" } },
      ];
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userData"
        }
      },
      {
        $unwind: {
          path: "$userData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "flights",
          localField: "flight",
          foreignField: "_id",
          as: "flightData"
        }
      },
      {
        $unwind: {
          path: "$flightData",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: matchStage
      },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit }
          ],
          total: [{ $count: "count" }]
        }
      }
    ];

    const result = await Booking.aggregate(pipeline);
    const bookings = result[0].data;
    const totalCount = result[0].total[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const today = new Date();
    let upcomingBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let failedBookings = 0;

    bookings.forEach((booking) => {
      if (!booking.flightData) return;
      const departureDate = new Date(booking.flightData.departureDate);
      if (booking.status === "cancelled") cancelledBookings++;
      else if (departureDate > today) upcomingBookings++;
      else completedBookings++;
    });

    res.render("admin/initiated-booking", {
      bookings,
      totalBookings: totalCount,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      failedBookings,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
}

const viewActiveInventory = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const searchQuery = search
      ? { inventoryId: { $regex: search, $options: "i" } }
      : {};

    // Step 1: Get paginated active flights
    const activeFlights = await Flight.find({
      ...searchQuery,
      isActive: true,
      status: "pending"
    })
      .skip(skip)
      .limit(limit)
      .lean();

    // Step 2: Extract sellerIds
    const sellerIds = [...new Set(activeFlights.map(flight => flight.sellerId))];

    // Step 3: Get user details
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select("userId name") // adjust fields as needed
      .lean();

    const sellerMap = sellers.reduce((acc, seller) => {
      acc[seller._id.toString()] = seller;
      return acc;
    }, {});

    // Step 4: Attach seller info to flights
    activeFlights.forEach(flight => {
      flight.seller = sellerMap[flight.sellerId] || null;
    });

    // Step 5: Get counts
    const [allFlights, activeCount, closedCount, pastCount] = await Promise.all([
      Flight.countDocuments(),
      Flight.countDocuments({ isActive: true }),
      Flight.countDocuments({ isActive: false }),
      Flight.countDocuments({ status: "completed" }),
    ]);

    const totalPages = Math.ceil(activeCount / limit);

    res.render("admin/active-inventory", {
      flights: activeFlights,
      totalFlights: allFlights,
      activeFlights: activeCount,
      closedFlights: closedCount,
      pastFlights: pastCount,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount: activeCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const viewPastInventory = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const searchQuery = search
      ? { inventoryId: { $regex: search, $options: "i" } }
      : {};

    // Step 1: Get paginated active flights
    const activeFlights = await Flight.find({
      ...searchQuery,
      status: "completed"
    })
      .skip(skip)
      .limit(limit)
      .lean();

    // Step 2: Extract sellerIds
    const sellerIds = [...new Set(activeFlights.map(flight => flight.sellerId))];

    // Step 3: Get user details
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select("userId name") // adjust fields as needed
      .lean();

    const sellerMap = sellers.reduce((acc, seller) => {
      acc[seller._id.toString()] = seller;
      return acc;
    }, {});

    // Step 4: Attach seller info to flights
    activeFlights.forEach(flight => {
      flight.seller = sellerMap[flight.sellerId] || null;
    });

    // Step 5: Get counts
    const [allFlights, activeCount, closedCount, pastCount] = await Promise.all([
      Flight.countDocuments(),
      Flight.countDocuments({ isActive: true }),
      Flight.countDocuments({ isActive: false }),
      Flight.countDocuments({ status: "completed" }),
    ]);

    const totalPages = Math.ceil(activeCount / limit);

    res.render("admin/past-inventory", {
      flights: activeFlights,
      totalFlights: allFlights,
      activeFlights: activeCount,
      closedFlights: closedCount,
      pastFlights: pastCount,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount: activeCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const viewClosedInventory = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const searchQuery = search
      ? { inventoryId: { $regex: search, $options: "i" } }
      : {};

    // Step 1: Get paginated active flights
    const activeFlights = await Flight.find({
      ...searchQuery,
      isActive: false,
    })
      .skip(skip)
      .limit(limit)
      .lean();

    // Step 2: Extract sellerIds
    const sellerIds = [...new Set(activeFlights.map(flight => flight.sellerId))];

    // Step 3: Get user details
    const sellers = await User.find({ _id: { $in: sellerIds } })
      .select("userId name") // adjust fields as needed
      .lean();

    const sellerMap = sellers.reduce((acc, seller) => {
      acc[seller._id.toString()] = seller;
      return acc;
    }, {});

    // Step 4: Attach seller info to flights
    activeFlights.forEach(flight => {
      flight.seller = sellerMap[flight.sellerId] || null;
    });

    // Step 5: Get counts
    const [allFlights, activeCount, closedCount, pastCount] = await Promise.all([
      Flight.countDocuments(),
      Flight.countDocuments({ isActive: true }),
      Flight.countDocuments({ isActive: false }),
      Flight.countDocuments({ status: "completed" }),
    ]);

    const totalPages = Math.ceil(activeCount / limit);

    res.render("admin/closed-inventory", {
      flights: activeFlights,
      totalFlights: allFlights,
      activeFlights: activeCount,
      closedFlights: closedCount,
      pastFlights: pastCount,
      currentPage: page,
      totalPages,
      search,
      limit,
      totalCount: activeCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

const viewProfileUpdates = async (req, res) => {
  const search = req.query.search || "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    // Build the match stage conditionally
    let matchStage = {};
    if (search) {
      const regex = new RegExp(search, "i");
      matchStage = {
        $or: [
          { "user.userId": regex },
          { "user.name": regex },
          { "user._id": { $regex: search, $options: "i" } }, // _id must be string
        ],
      };
    }

    // Pipeline for pagination
    const pipeline = [
      {
        $lookup: {
          from: "users", // collection name for User model
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    // Pipeline for counting total results
    const countPipeline = [
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: matchStage },
      { $count: "totalCount" },
    ];

    // Execute aggregation
    const updates = await ProfileUpdates.aggregate(pipeline);
    const countResult = await ProfileUpdates.aggregate(countPipeline);
    const totalCount = countResult[0]?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.render("admin/profileUpdates", {
      updates,
      search,
      currentPage: page,
      totalPages,
      totalCount,
      limit,
    });
  } catch (error) {
    console.error("Aggregation error:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const updateProfileDetail = async (req, res) => {
  console.log("Update profile detail called");
  const profileUpdateId = req.params.id;
  const { status } = req.body;
  console.log("Profile update ID:", profileUpdateId);
  console.log("Status:", status);
  console.log("Request body:", req.body);

  try {
    const update = await ProfileUpdates.findById(profileUpdateId).populate("userId");
    if (!update) {
      return res
        .status(404)
        .json({ success: false, message: "Profile update not found" });
    }

    const userId = update.userId._id; // Get the user ID from the populated userId field

    if (status === "accept") {
      const updatedData = {
        name: update.name,
        email: update.email,
        mobile: update.mobile,
        nationality: update.nationality,
        gender: update.gender,
        address: update.address,
      };

      if (update.image) {
              // Delete old image if exists
              if (update.image && update.userId.image !== "/assets/images/avatar/default.png" && update.userId.image !== update.image) {
                const oldImagePath = path.join(__dirname, "..", "public", update.userId.image);
                if (fs.existsSync(oldImagePath)) {
                  fs.unlinkSync(oldImagePath);
                }
              }
        
              // Save new image path
              updatedData.image = update.image;
            }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { ...updatedData },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Remove approved bank update request
      await ProfileUpdates.findByIdAndUpdate(profileUpdateId, {$set: { "status": "approved" }}, { new: true });
      return res.json({
        success: true,
        message: "Profile details accepted successfully",
      });
    }

    if (status === "reject") {
      
      await ProfileUpdates.findByIdAndUpdate(profileUpdateId, {$set: { "status": "rejected" }}, { new: true });
      return res.json({
        success: true,
        message: "Profile details rejected successfully",
      });
    }

    res.redirect("/admin/profile-updates");
  } catch (error) {
    console.log("Error updating profile detail:", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

module.exports = {
  viewLogin,
  loginAdmin,
  logoutAdmin,
  viewDashboard,
  viewBookings,
  viewBookingDetail,
  viewUsers,
  viewUserDetail,
  viewAgents,
  viewAgentDetail,
  viewSettings,
  viewAddFlight,
  viewCoupons,
  viewAddCoupon,
  deleteCoupon,
  viewSubscriptions,
  addSubscription,
  viewEditSubscription,
  editSubscription,
  deleteSubscription,
  deleteUser,
  deleteAgent,
  viewBankUpdates,
  updateBankDetail,
  viewUserKycUpdates,
  viewAgentKycUpdates,
  updateKycDetail,
  viewTransactions,
  viewWithdrawalsById,
  withdrawalPayment,
  viewMessages,
  sendResponse,
  addFlight,
  getApiFlights,
  viewPopularFlights,
  getAirports,
  addPopularFlights,
  deletePopularFlight,
  cancelBooking,
  editUser,
  addAirport,
  updateAirport,
  viewUpcomingBookings,
  viewCancelledBookings,
  viewPastBookings,
  viewFailedBookings,
  viewInitiatedBookings,
  viewLatestBookings,
  getAirportsApi,
  viewActiveInventory,
  viewPastInventory,
  viewClosedInventory,
  viewProfileUpdates,
  updateProfileDetail,

};
