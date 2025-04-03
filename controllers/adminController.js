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

const viewAddFlight  = async (req, res) => {
    try{
        res.render("admin/addFlight", {});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Internal Server error" });
    }
}
module.exports = {
    viewDashboard,
    viewBookings,
    viewBookingDetail,
    viewUsers,
    viewUserDetail,
    viewAgents,
    viewAgentDetail,
    viewSettings, 
    viewAddFlight,
    
}