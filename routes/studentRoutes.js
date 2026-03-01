const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const db = require("../config/firebase");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-photo", upload.single("photo"), async (req, res) => {
  const result = await cloudinary.uploader.upload_stream(
    { folder: "nextgen_students" },
    async (error, uploadResult) => {
      if (error) return res.status(500).json({ error });

      await db.collection("students").doc(req.body.uid).update({
        photoURL: uploadResult.secure_url,
      });

      res.json({ url: uploadResult.secure_url });
    }
  );

  result.end(req.file.buffer);
});

module.exports = router;