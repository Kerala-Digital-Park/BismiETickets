const viewLogin = async (req, res) => {
    try {
        res.render("admin/login", {message: ""});
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
            res.render("admin/login", { message: "Invalid email or password",messageType: "error" });
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

const viewAddFlight  = async (req, res) => {
    try{
        res.render("admin/addFlight", {});
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
    
}