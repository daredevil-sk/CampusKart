const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  encryptedMessage: {
  type: String,
  default: '',
},

iv: {
  type: String,
  default: '',
},
  attachmentUrl: { type: String, default: '' },
  encryptedImagePath: {
  type: String,
  default: '',
},

imageIv: {
  type: String,
  default: '',
},
  isAudio: { type: Boolean, default: false },
  isImage: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
