const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  googleId: { type: String, index: true, unique: true },
  email: { type: String, index: true, unique: true, sparse: true },
  displayName: String,
  photo: String,
  provider: { type: String, default: 'google' },
}, { timestamps: true });

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);
