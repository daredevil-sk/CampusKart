const mongoose = require('mongoose');

// Schema for simple OTP verification during login/signup
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Document expires automatically in 5 minutes
  },
});

module.exports = mongoose.model('OTP', otpSchema);
