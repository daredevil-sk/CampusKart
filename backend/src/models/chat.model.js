const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  lastMessage: { type: String, default: '' },
  unreadCount: { type: Map, of: Number, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
