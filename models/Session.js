const mongoose = require('mongoose');

// Optional: schema for viewing sessions; connect-mongo manages actual writes
const sessionSchema = new mongoose.Schema({}, { strict: false, collection: 'sessions' });

module.exports = mongoose.model('Session', sessionSchema);
