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
const jwt = require("jsonwebtoken");
const db = require("../config/firebase");

const GAS_URL = process.env.GAS_URL;
const JWT_SECRET = process.env.JWT_SECRET;

const OTP_EXPIRY = 5 * 60 * 1000;      // 5 min
const RESEND_LIMIT = 60 * 1000;        // 1 min
const MAX_ATTEMPTS = 5;

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP
function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// Generate JWT
function generateToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

/* =========================================================
   📧 SEND OTP (Firestore Based)
========================================================= */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const otpRef = db.collection("otp").doc(email);
    const existingDoc = await otpRef.get();

    // Rate limit check
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      if (Date.now() - existingData.lastSentAt < RESEND_LIMIT) {
        return res.status(429).json({
          error: "Please wait before requesting OTP again",
        });
      }
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    await otpRef.set({
      otpHash: hashedOtp,
      expiresAt: Date.now() + OTP_EXPIRY,
      attempts: 0,
      lastSentAt: Date.now(),
      createdAt: new Date(),
    });

    // Send OTP via GAS
    await axios.post(GAS_URL, { email, otp });

    res.json({ message: "OTP Sent Successfully ✅" });

  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

/* =========================================================
   🔎 VERIFY OTP (Firestore Based)
========================================================= */
// router.post("/verify-otp", async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     if (!email || !otp) {
//       return res.status(400).json({ error: "Email and OTP required" });
//     }

//     const otpRef = db.collection("otp").doc(email);
//     const doc = await otpRef.get();

//     if (!doc.exists) {
//       return res.status(400).json({ error: "OTP not found" });
//     }

//     const data = doc.data();

//     // Expiry check
//     if (Date.now() > data.expiresAt) {
//       await otpRef.delete();
//       return res.status(400).json({ error: "OTP expired" });
//     }

//     // Attempt limit check
//     if (data.attempts >= MAX_ATTEMPTS) {
//       await otpRef.delete();
//       return res.status(429).json({ error: "Too many attempts" });
//     }

//     const hashedInput = hashOTP(otp);

//     if (hashedInput !== data.otpHash) {
//       await otpRef.update({
//         attempts: data.attempts + 1,
//       });
//       return res.status(400).json({ error: "Invalid OTP" });
//     }

//     // OTP verified → delete OTP
//     await otpRef.delete();

//     // Create or update user
//     const userData = {
//       uid: email,
//       email,
//       role: "student",
//       createdAt: new Date(),
//     };

//     //Collection me data add karna
//     // Create auth user
//     await db.collection("users").doc(email).set(
//       {
//         uid: email,
//         email,
//         role: "student",
//         createdAt: new Date(),
//       },
//       { merge: true },
//     );

//     // Create student profile separately
//     await db.collection("students").doc(email).set(
//       {
//         uid: email,
//         email,
//         enrolledCourses: [],
//         feesStatus: "pending",
//         attendance: 0,
//         createdAt: new Date(),
//       },
//       { merge: true },
//     );

//     //-----------------------------------------------------------

//     // Generate JWT
//     const token = generateToken({
//       uid: email,
//       email,
//       role: "student",
//     });

//     res.json({
//       success: true,
//       token,
//       user: userData,
//     });
//   } catch (error) {
//     console.error("Verify OTP Error:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });


//---------------------------New ---------------------------

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRef = db.collection("otp").doc(email);
    const doc = await otpRef.get();

    if (!doc.exists) {
      return res.status(400).json({ error: "OTP not found" });
    }

    const data = doc.data();

    if (Date.now() > data.expiresAt) {
      await otpRef.delete();
      return res.status(400).json({ error: "OTP expired" });
    }

    const hashedInput = hashOTP(otp);

    if (hashedInput !== data.otpHash) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    await otpRef.delete();

    // 🔥 CHECK USER FROM DATABASE
    const userRef = db.collection("users").doc(email);
    const userDoc = await userRef.get();

    let userData;

    if (!userDoc.exists) {
      // First time login → create new user
      userData = {
        uid: email,
        email,
        role: "student", // default role
        createdAt: new Date(),
      };

      await userRef.set(userData);

      // Create student profile
      await db.collection("students").doc(email).set({
        uid: email,
        email,
        enrolledCourses: [],
        feesStatus: "pending",
        attendance: 0,
        createdAt: new Date(),
      });

    } else {
      // Existing user → fetch role from DB
      userData = userDoc.data();
    }

    // 🔥 Generate token using DB role
    const token = generateToken({
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
    });

    res.json({
      success: true,
      token,
      user: userData,
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


module.exports = router;