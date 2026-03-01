const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

const otpStore = {};

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000);

  otpStore[email] = otp;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "NextGen Login OTP",
    text: `Your OTP is ${otp}`,
  });

  res.json({ message: "OTP Sent Successfully" });
});

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (otpStore[email] == otp) {
    delete otpStore[email];
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

module.exports = router;