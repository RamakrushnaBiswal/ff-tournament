const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  leader: { type: String, required: true },
  players: {
    p1: { type: String, required: true },
    p2: { type: String, required: true },
    p3: { type: String, required: true },
    p4: { type: String, required: true },
  },
  transactionId: { type: String, required: true },
  transactionScreenshot: { type: String }, // Google Drive link
}, { timestamps: true });

module.exports = mongoose.model("Team", teamSchema);
