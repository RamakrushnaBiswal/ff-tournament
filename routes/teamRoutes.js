const express = require("express");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const fs = require("fs");
const Team = require("../models/Team");
const cloudinary = require("../utils/cloudinary"); // new cloudinary util

const router = express.Router();

// Multer config - store temporarily in /temp
const upload = multer({ dest: "temp/" });

// Require login for registration
const ensureAuth = (req, res, next) => {
  if ((req.isAuthenticated && req.isAuthenticated()) || req.user) return next();
  return res.status(401).json({ success: false, message: "Login required" });
};

router.post(
  "/register",
  ensureAuth,
  upload.single("transactionScreenshot"),
  [
    body("teamName").notEmpty().withMessage("Team name is required"),
    body("email").optional().isEmail().withMessage("Valid email required"),
    body("leader").notEmpty().withMessage("Leader name required"),
    body("p1").notEmpty().withMessage("Player 1 required"),
    body("p2").notEmpty().withMessage("Player 2 required"),
    body("p3").notEmpty().withMessage("Player 3 required"),
    body("p4").notEmpty().withMessage("Player 4 required"),
    body("transactionId").notEmpty().withMessage("Transaction ID required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    // console.log("Incoming body:", req.body);
    // console.log("Incoming file:", req.file);

    try {
      let screenshotUrl = null;

      // Upload screenshot to Cloudinary if present
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "tournament_uploads",
        });
        screenshotUrl = result.secure_url;

        // remove temp file after upload
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Failed to delete temp file:", err);
        }
      }

      // Use server-side authenticated email
      const authedEmail =
        req.user?.email || req.user?.emails?.[0]?.value || req.body.email || "";

      const team = new Team({
        teamName: req.body.teamName,
        email: authedEmail,
        leader: req.body.leader,
        players: {
          p1: req.body.p1,
          p2: req.body.p2,
          p3: req.body.p3,
          p4: req.body.p4,
        },
        transactionId: req.body.transactionId,
        transactionScreenshot: screenshotUrl,
      });

      await team.save();
      res.status(201).json({
        success: true,
        message: "Team registered successfully!",
      });
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

module.exports = router;