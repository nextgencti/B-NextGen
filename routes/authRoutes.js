// const express = require("express");
// const router = express.Router();
// const { Resend } = require("resend");

// // Make sure API key exists
// if (!process.env.RESEND_API_KEY) {
//   console.error("❌ RESEND_API_KEY is missing in environment variables");
// }

// const resend = new Resend(process.env.RESEND_API_KEY);

// // Temporary in-memory store
// // ⚠️ In production use Redis or database
// const otpStore = {};

// /* =========================================================
//    📧 SEND OTP
// ========================================================= */
// router.post("/send-otp", async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ error: "Email is required" });
//     }

//     // Generate 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     // Store OTP with expiry (5 minutes)
//     otpStore[email] = {
//       otp,
//       expiresAt: Date.now() + 5 * 60 * 1000,
//     };

//     // Send email using Resend
//     const response = await resend.emails.send({
//       from: "NextGen <onboarding@resend.dev>",
//       to: email,
//       subject: "NextGen Login OTP",
//       html: `
//         <div style="font-family: Arial, sans-serif;">
//           <h2>NextGen Computer Training Institute</h2>
//           <p>Your OTP is:</p>
//           <h1 style="color: #1A237E;">${otp}</h1>
//           <p>This OTP is valid for 5 minutes.</p>
//         </div>
//       `,
//     });

//     // Check if Resend returned error
//     if (response.error) {
//       console.error("Resend Error:", response.error);
//       return res.status(500).json({ error: "Failed to send OTP" });
//     }

//     res.json({ message: "OTP Sent Successfully ✅" });

//   } catch (error) {
//     console.error("Send OTP Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// /* =========================================================
//    🔎 VERIFY OTP
// ========================================================= */
// router.post("/verify-otp", async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (!email || !otp) {
//       return res.status(400).json({ error: "Email and OTP required" });
//     }

//     const storedData = otpStore[email];

//     if (!storedData) {
//       return res.status(400).json({ error: "OTP not found" });
//     }

//     // Check expiry
//     if (Date.now() > storedData.expiresAt) {
//       delete otpStore[email];
//       return res.status(400).json({ error: "OTP expired" });
//     }

//     // Compare OTP safely as string
//     if (String(storedData.otp) !== String(otp)) {
//       return res.status(400).json({ error: "Invalid OTP" });
//     }

//     // OTP verified → remove from store
//     delete otpStore[email];

//     res.json({
//       success: true,
//       message: "OTP Verified Successfully ✅",
//     });

//   } catch (error) {
//     console.error("Verify OTP Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// module.exports = router;

//==================================GAS API==========================================

const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");

const GAS_URL = process.env.GAS_URL;

// In-memory store (⚠ production me Redis ya DB use karein)
const otpStore = {};

const OTP_EXPIRY = 5 * 60 * 1000;      // 5 min
const RESEND_LIMIT = 60 * 1000;        // 1 min gap
const MAX_ATTEMPTS = 5;

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP
function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/* =========================================================
   📧 SEND OTP (via GAS)
========================================================= */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existing = otpStore[email];

    // Rate limit check
    if (existing && Date.now() - existing.lastSentAt < RESEND_LIMIT) {
      return res.status(429).json({
        error: "Please wait before requesting OTP again",
      });
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    otpStore[email] = {
      otpHash: hashedOtp,
      expiresAt: Date.now() + OTP_EXPIRY,
      attempts: 0,
      lastSentAt: Date.now(),
    };

    // Call GAS API
    await axios.post(GAS_URL, {
      email,
      otp,
    });

    res.json({ message: "OTP Sent Successfully ✅" });

  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/* =========================================================
   🔎 VERIFY OTP
========================================================= */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP required" });
    }

    const storedData = otpStore[email];

    if (!storedData) {
      return res.status(400).json({ error: "OTP not found" });
    }

    // Expiry check
    if (Date.now() > storedData.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ error: "OTP expired" });
    }

    // Attempt limit check
    if (storedData.attempts >= MAX_ATTEMPTS) {
      delete otpStore[email];
      return res.status(403).json({ error: "Too many attempts" });
    }

    const hashedInput = hashOTP(otp);

    if (hashedInput !== storedData.otpHash) {
      storedData.attempts += 1;
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Success → Remove OTP
    delete otpStore[email];

    res.json({
      success: true,
      message: "OTP Verified Successfully ✅",
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;