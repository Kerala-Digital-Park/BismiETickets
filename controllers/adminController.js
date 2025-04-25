const Coupon = require("../models/couponModel");
const Flight = require("../models/flightModel");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");

const viewLogin = async (req, res) => {
    try {
        res.render("admin/login", { message: "" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === "admin@gmail.com" && password === "admin@gmail.com") {
            req.session.admin = email;
            res.redirect("/admin");
        } else {
            res.render("admin/login", { message: "Invalid email or password", messageType: "error" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}
const logoutAdmin = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect("/admin/login");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const viewDashboard = async (req, res) => {
    try {
        res.render("admin/dashboard", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewBookings = async (req, res) => {
    try {
        res.render("admin/bookings", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewBookingDetail = async (req, res) => {
    try {
        res.render("admin/bookingDetail", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

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
    { userId: { $regex: search, $options: "i" } }
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
    limit
  });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewUserDetail = async (req, res) => {
    try {
        res.render("admin/userDetail", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

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
      { userId: { $regex: search, $options: "i" } }
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
      limit
    });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

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
}

const viewSettings = async (req, res) => {
    try {
        res.render("admin/settings", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewAddFlight = async (req, res) => {
    try {
        res.render("admin/addFlight", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({});
        res.render("admin/coupons", { coupons });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewAddCoupon = async (req, res) => {
    try {
        const { name, code, discount, expiry } = req.body;
        await Coupon.create({ name, code, discount, expiry });
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find();
        res.render("admin/subscriptions", { subscriptions });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

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
        
          const featureArray = features.split(",").map(item => item.trim());
        
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
}

const viewEditSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        res.render("admin/editSubscription", { subscription });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const editSubscription = async (req, res) => {
    try {
        await Subscription.findByIdAndUpdate(req.params.id, req.body);
        res.redirect("/admin/subscriptions");
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const deleteSubscription = async (req, res) => {
    try {
        await Subscription.findByIdAndDelete(req.params.id);
        res.redirect("/admin/subscriptions");
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

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
}

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

}