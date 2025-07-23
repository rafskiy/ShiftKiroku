const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "your.email@gmail.com",
    pass: "your-app-password",
  },
});

// Define the HTTPS function
exports.sendFeedback = functions.https.onRequest(async (req, res) => {
  const {email, message} = req.body;
  try {
    await transporter.sendMail({
      from: email,
      to: "your.email@gmail.com",
      subject: "New Feedback Received",
      text: `From: ${email}\n\n${message}`,
    });
    res.status(200).send({success: true});
  } catch (error) {
    console.error(error);
    res.status(500).send({success: false, error: error.message});
  }
});
