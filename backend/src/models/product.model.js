const mongoose = require('mongoose');

// One schema to rule both listing types — fixed-price and auction.
// The listingType field drives which fields are relevant and required.
const productSchema = new mongoose.Schema(
  {
    // ── Core fields shared by both listing types ──────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: [{ type: String }], // Array of ImageKit URLs
    productPic: { type: String, default: '' }, // Primary display image
    buyingDate: { type: Date, default: Date.now },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // "fixed" = direct buy, "auction" = competitive bidding
    listingType: {
      type: String,
      enum: ['fixed', 'auction'],
      required: true,
      default: 'fixed',
    },

    // ── Fixed-price only ──────────────────────────────────────────────────
    askingPrice: {
      type: Number,
      default: null, // Only required when listingType === 'fixed'
    },

    // ── Auction only ──────────────────────────────────────────────────────
    startingBid: {
      type: Number,
      default: null, // The floor price for bidding
    },
    reservePrice: {
      type: Number,
      default: null, // Seller's secret minimum — sale only counts if this is met
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
    auctionEndTime: {
      type: Date,
      default: null, // Set when the auction goes live
    },

    // ── Status ────────────────────────────────────────────────────────────
    // pending_approval → admin reviews → available → sold/unsold/removed
    status: {
      type: String,
      enum: ['pending_approval', 'available', 'active_auction', 'sold', 'unsold', 'removed'],
      default: 'pending_approval',
    },

    // ── Broadcasts ────────────────────────────────────────────────────────
    broadcasts: [
      {
        text: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
