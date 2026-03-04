const express = require("express");
const db = require("../config/firebaseAdmin");

const router = express.Router();

router.get("/get-data", async (req, res) => {
  const snapshot = await db.collection("courses").get();

  const courses = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.json(courses);
});

module.exports = router;