const express = require("express");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const fs = require("fs");
const Team = require("../models/Team");
const cloudinary = require("../utils/cloudinary");

const router = express.Router();

// Multer config
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
    body("phone").notEmpty().withMessage("Leader phone number required"),
    body("p1").notEmpty().withMessage("Player 1 required"),
    body("p2").notEmpty().withMessage("Player 2 required"),
    body("p3").notEmpty().withMessage("Player 3 required"),
    body("p4").notEmpty().withMessage("Player 4 required"),
    body("transactionId").notEmpty().withMessage("Transaction ID required"),
  ],
  async (req, res) => {
    // console.log("---- Form Submission ----");
    // console.log("req.body:", req.body);
    // console.log("req.file:", req.file);
    // console.log("req.user:", req.user);

    // Example

    // Validate fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // console.log("Validation errors:", errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      let screenshotUrl = null;

      // Upload screenshot if present
      if (req.file) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "tournament_uploads",
          });
          screenshotUrl = result.secure_url;
          // console.log("Screenshot uploaded to Cloudinary:", screenshotUrl);
        } catch (err) {
          // console.error("Cloudinary upload failed:", err);
          return res
            .status(500)
            .json({ success: false, message: "Screenshot upload failed" });
        } finally {
          // Remove temp file
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Temp file deletion failed:", err);
          });
        }
      }

      // Determine email
      const authedEmail =
        req.user?.email ||
        req.user?.emails?.[0]?.value ||
        req.body.email ||
        null;

      if (!authedEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Email is required" });
      }

      // Create team
      const team = new Team({
        teamName: req.body.teamName,
        email: authedEmail,
        phone: req.body.phone,
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
      // console.log("Team registered successfully:", team);
      res.render("success", {
        title: "Registration Successful",
        message: `🎉 Congratulations ${team.leader}! Your team "${team.teamName}" has been registered successfully!`,
      });
    } catch (err) {
      console.error("Server error:", err);
      if (err.name === "ValidationError") {
        // Mongoose validation error
        const messages = Object.values(err.errors).map((e) => e.message);
        return res
          .status(400)
          .json({ success: false, message: messages.join(", ") });
      }
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

module.exports = router;
