const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const db = require("../config/firebase");

const router = express.Router();

// Multer Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 📸 Upload Student Photo (Upsert Version)
 */
router.post("/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    const { uid, email, name } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "UID is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // 🔥 Upload to Cloudinary using Promise
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "nextgen_students" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    // 🔥 Prepare dynamic data (future proof structure)
    const studentData = {
      photoURL: uploadResult.secure_url,
      email: email || null,
      name: name || null,
      role: "student",
      updatedAt: new Date(),
    };

    // 🔥 UPSERT (Create or Update)
    await db.collection("students").doc(uid).set(studentData, {
      merge: true,
    });

    res.json({
      message: "Photo uploaded & student updated successfully ✅",
      url: uploadResult.secure_url,
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/get-student/:uid", async (req, res) => {
  try {
    const doc = await db.collection("students").doc(req.params.uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(doc.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
