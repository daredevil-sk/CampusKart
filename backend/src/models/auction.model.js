const mongoose = require('mongoose');

// Schema for time-limited auction items with bidding
const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        type: String, // Store image URLs
      },
    ],
    startingPrice: {
      type: Number,
      required: true,
    },
    minBidIncrement: {
      type: Number,
      required: true,
      default: 10, // Default 10 INR increment
    },
    currentHighestBid: {
      type: Number,
      default: 0,
    },
    highestBidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endTime: {
      type: Date,
      required: true, // Specific closing time
    },
    status: {
      type: String,
      enum: ['active', 'ended', 'removed'], // Admins can remove
      default: 'active',
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Auction', auctionSchema);
