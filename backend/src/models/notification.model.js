const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['message', 'bid', 'system'], default: 'message' },
  content: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
