const mongoose = require("mongoose");
const Coupon = require("../models/couponModel");
const Flight = require("../models/flightModel");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const BankUpdates = require("../models/bankUpdateModel");
const KycUpdates = require("../models/kycUpdateModel");
const Transaction = require("../models/transactionModel");
const Support = require("../models/supportModel")

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
    if (email === "admin@gmail.com" && password === "admin@gmail.com") {
      req.session.admin = email;
      res.redirect("/admin");
    } else {
      res.render("admin/login", {
        message: "Invalid email or password",
        messageType: "error",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
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
    res.render("admin/dashboard", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewBookings = async (req, res) => {
  try {
    res.render("admin/bookings", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const viewBookingDetail = async (req, res) => {
  try {
    res.render("admin/bookingDetail", {});
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
    res.render("admin/addFlight", {});
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server error" });
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
      await BankUpdates.findByIdAndDelete(bankUpdateId);
      return res.json({
        success: true,
        message: "Bank details accepted successfully",
      });
    }

    if (status === "reject") {
      // Optional: Set a status or delete it
      await BankUpdates.findByIdAndDelete(bankUpdateId);
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

const viewKycUpdates = async (req, res) => {
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
  console.log("Inside get withdrawals")
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
        const transaction = await Transaction.findOne({ bookingId: booking._id });
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
}

// const sendResponse = async (req, res) => {
//   const { messageId, reply } = req.body;

//   try {
//     const message = await Support.findById(messageId);
//     if (!message) return res.status(404).json({ success: false, message: "Message not found" });

//     if (!message.reply) message.reply = [];

//     message.reply.push(reply);
//     await message.save();

//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// }

const sendResponse = async (req, res) => {
  const { messageId, reply } = req.body;

  try {
    const messageDoc = await Support.findById(messageId);
    if (!messageDoc) {
      return res.status(404).json({ success: false, message: "Message not found" });
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
}

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
  viewKycUpdates,
  updateKycDetail,
  viewTransactions,
  viewWithdrawalsById,
  withdrawalPayment,
  viewMessages,
  sendResponse,

};
