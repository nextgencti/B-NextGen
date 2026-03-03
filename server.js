require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const verifyToken = require("./middleware/authMiddleware");
const allowRoles = require("./middleware/roleMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/courses", courseRoutes);


app.get("/", (req, res) => {
  res.send("🚀 NextGen Backend Running Successfully");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


app.get("/test", (req, res) => {
  res.send("Test Route Working");
});

//-------------firebase connection test-----------------
const db = require("./config/firebase");

app.get("/test-firebase", async (req, res) => {
  try {
    const docRef = await db.collection("test").add({
      name: "Sanju",
      createdAt: new Date(),
    });

    res.send("Firebase Working ✅ ID: " + docRef.id);
  } catch (error) {
    res.status(500).send("Firebase Error ❌ " + error.message);
  }
});



// // const verifyToken = require("./middleware/authMiddleware");
// const allowRoles = require("./middleware/roleMiddleware");

// app.get("/api/admin/dashboard", verifyToken,  allowRoles("admin"),  (req, res) => {
//     res.json({
//       message: "Welcome Admin Dashboard",
//       user: req.user,
//     });
//   },
// );


//======================== Admin Route=========================
app.get(
  "/api/admin/dashboard",
  verifyToken,
  allowRoles("admin"),
  (req, res) => {
    res.json({ message: "Welcome Admin Dashboard 🔥" });
  }
);


//==========================Test protected Route===============

app.get("/api/protected", verifyToken, (req, res) => {
  res.json({
    message: "Protected route accessed successfully 🔐",
    user: req.user,
  });
});













// Ye route Cron-job.org use karega
app.get('/ping', (req, res) => {
  res.status(200).send("I am alive! 🚀");
});



app.use((req, res, next) => {
  console.log("Requested URL:", req.originalUrl);
  next();
});