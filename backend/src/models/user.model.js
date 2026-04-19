const mongoose = require('mongoose');

// Schema for User mapping login info and user profile
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/.*@iitp\.ac\.in$/, 'Email must be of IITP.'],
    },
    password: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false, // Updated to true after OTP verification
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student', // Basic role is student
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'], // Admins can suspend/ban users
      default: 'active',
    },
    banExpires: {
      type: Date,
      default: null
    },
    // Array summarizing purchased products (can be expanded)
    buyedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    // Array summarizing sold products (can be expanded)
    soldProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
