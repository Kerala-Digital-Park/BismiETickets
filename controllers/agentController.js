const Users = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

const viewDashboard = async (req, res) => {
    try {
        res.render("agent/dashboard", {});
    } catch (error) {
        console.log(error);
      res.status(500).json({ success: false, message: "Internal Server error" });
    }
}

const signup = async (req, res) => {
  try {
    const { name, email, pan, password, confirmPassword } = req.body;
    if (password !== confirmPassword) { // Use strict equality ===
      return res.render("agent/sign-up", {
        message: "Password does not match",
        messageType: "danger",
      });
    }

    // Check if the email already exists
    const existingAgentByEmail = await Users.findOne({ email });
    if (existingAgentByEmail) {
      return res.render("agent/sign-up", {
        message: "Agent with this email already exists",
        messageType: "danger",
      });
    }

    // Check if the PAN already exists
    const existingAgentByPAN = await Users.findOne({ pan });
    if (existingAgentByPAN) {
      return res.render("agent/sign-up", {
        message: "Agent with this PAN already exists",
        messageType: "danger",
      });
    }

    // Correct date creation.
    const expiry_date = new Date(2500, 11, 30); // Year, Month (0-11), Day

    const newAgent = new Users({
      name: name,
      email: email,
      pan: pan,
      password: password,
      userRole: "Agent",
      "subscription.expiryDate": expiry_date, 
      "subscription.transactionLimit": 1,
      "subscription.maxTransactionAmount": 100000,
    });

    await newAgent.save();

    const token = jwt.sign({ id: newAgent._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    return res.redirect("/agent/sign-in");
  } catch (error) {
    console.error(error);
    return res.render("agent/sign-up", {
      message: "An error occurred during signup.",
      messageType: "danger",
    }); // Send error to agent.
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const agent = await Users.findOne({ email });
    if (!agent)
      return res.render("agent/sign-in", {
        message: "Invalid credentials",
        messageType: "danger",
      });

    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch)
      return res.render("agent/sign-in", {
        message: "Invalid credentials",
        messageType: "danger",
      });

    const token = jwt.sign({ id: agent._id }, process.env.SECRET_KEY, {
      expiresIn: "7d",
    });

    req.session.token = token;
    req.session.agentId = agent._id;

    // const redirectUrl = req.session?.originalUrl || "/agent/dashboard";
    if (req.session) delete req.session.originalUrl;
    // res.redirect(redirectUrl);
    res.redirect("/agent/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const signOut = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect("/agent/sign-in");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const agent = await Users.findOne({ email });
    if (!agent) {
      return res.render("agent/forgot-password", {
        message: "Agent not found",
        messageType: "danger",
      });
    }
    const token = jwt.sign({ id: agent._id }, process.env.SECRET_KEY, {
      expiresIn: "10m",
    });
    agent.resetToken = token;
    agent.resetTokenExpiry = Date.now() + 600000; // 10 minutes
    await agent.save();

    const resetLink = `${process.env.BASE_URL}/agent/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello <strong>${agent.email}</strong>,</p>
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
        return res.render("agent/forgot-password", {
          message: "Error sending email",
          messageType: "danger",
        });
      return res.render("agent/forgot-password", {
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
      .render("agent/reset-password", {
        message: "Passwords do not match",
        messageType: "danger",
        token,
      });
  }

  try {
    const agent = await Users.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!agent) {
      return res
        .status(400)
        .render("agent/reset-password", {
          message: "Invalid or expired token",
          messageType: "danger",
          token,
        });
    }

    agent.password = password;
    agent.resetToken = null;
    agent.resetTokenExpiry = null;
    await agent.save();

    res.render("agent/sign-in", {
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
    res.render("agent/reset-password", { token, message: "" });
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

    res.render("agent/sign-in", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewSignup = async (req, res) => {
  try {
    res.render("agent/sign-up", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

const viewForgotPassword = async (req, res) => {
  try {
    res.render("agent/forgot-password", { message: "" });
  } catch (error) {
    console.error(error);
    res.render("error", { error });
  }
};

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
    signup,
    signin,
    signOut,
    forgotPassword,
    resetPassword,
    viewResetPassword,
    viewSignup,
    viewSignin,
    viewForgotPassword,
    viewListings,
    viewBookings,
    viewEarnings,
    viewSettings,
    addListing,

}