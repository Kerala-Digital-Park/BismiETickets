const Coupon = require("../models/couponModel");
const Flight = require("../models/flightModel");
const Subscription = require("../models/subscriptionModel");

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
    try {
        res.render("admin/users", {});
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
    try {
        res.render("admin/agents", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewAgentDetail = async (req, res) => {
    try {
        res.render("admin/agentDetail", {});
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
}