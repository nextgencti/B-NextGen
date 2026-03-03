const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access Denied" });
    }
    next();
  };
};

module.exports = allowRoles;


// // const allowRoles = require("./middleware/roleMiddleware");

// app.get(
//   "/api/admin/dashboard",
//   verifyToken,
//   allowRoles("admin"),
//   (req, res) => {
//     res.json({
//       message: "Welcome Admin Dashboard 🔥",
//     });
//   }
// );