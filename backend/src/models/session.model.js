const mongoose = require('mongoose');

// Schema for managing active user sessions securely
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  refreshToken: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7 * 24 * 60 * 60, // Token automatically removed after 7 days
  },
});

module.exports = mongoose.model('Session', sessionSchema);
