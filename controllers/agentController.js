const viewDashboard = async (req, res) => {
    try {
        res.render("agent/dashboard", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewListings = async (req, res) => {
    try {
        res.render("agent/listings", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewBookings = async (req, res) => {
    try {
        res.render("agent/bookings", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const viewEarnings = async (req, res) => {
    try {
        res.render("agent/earnings", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}  

const viewSettings = async (req, res) => {
    try {
        res.render("agent/settings", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}   

const addListing = async (req, res) => {
    try {
        res.render("agent/addListing", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

module.exports = {
    viewDashboard,
    viewListings,
    viewBookings,
    viewEarnings,
    viewSettings,
    addListing,

}