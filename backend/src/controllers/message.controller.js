const Message = require('../models/message.model');
const Chat = require('../models/chat.model');
const Notification = require('../models/notification.model');
const Report = require('../models/report.model');
const { uploadToImageKit } = require('../middleware/upload');

const {
  encryptText,
  decryptText,
  encryptBuffer,
  decryptBuffer,
} = require('../utils/encryption');

exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });
    
    // Enforcement: Students are capped at 1MB
    if (req.user.role !== 'admin' && req.file.size > 1 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File exceeds 1MB limit for student accounts.' });
    }

    const url = await uploadToImageKit(req.file);
    res.status(200).json({ success: true, url });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Upload failed.' });
  }
};

// Initialize or get a chat for a specific product
exports.getOrCreateChat = async (req, res) => {
  try {
    const { productId, sellerId } = req.body;
    const buyerId = req.user._id;
    const { Product } = require('../models/product.model'); // Ensure we can check product status

    const product = await require('../models/product.model').findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    if (!['available', 'active_auction'].includes(product.status)) {
      return res.status(400).json({ success: false, message: 'This item is no longer available for inquiries.' });
    }

    if (buyerId.toString() === sellerId) {
      return res.status(400).json({ success: false, message: 'You cannot message yourself.' });
    }

    // 50 chats per user limit check (Admins exempt)
    const existingChatsCount = await Chat.countDocuments({ participants: buyerId });
    
    let chat = await Chat.findOne({
      product: productId,
      participants: { $all: [buyerId, sellerId] }
    });

    if (!chat) {
      if (req.user.role !== 'admin' && existingChatsCount >= 50) {
        return res.status(400).json({ success: false, message: 'You have reached the maximum limit of 50 active chat threads. Please delete older chats to start a new one.' });
      }
      chat = await Chat.create({
        participants: [buyerId, sellerId],
        product: productId
      });
    }

    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not create chat session.', error: error.message });
  }
};

// Fetch all chats for current user
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id
    })
    .populate('participants', 'name email profilePic role')
    .populate('product', 'title productPic askingPrice price')
    .sort({ updatedAt: -1 });

    // Decrypt lastMessage preview for each chat
    const decryptedChats = chats.map((chat) => {
      let lastMessage = chat.lastMessage;
      if (lastMessage) {
        try {
          const parsed = JSON.parse(lastMessage);
          if (parsed.enc && parsed.iv) {
            lastMessage = decryptText(parsed.enc, parsed.iv);
          }
        } catch (_) {
          // Not a JSON blob — already plain text or a label like '[Image]'
        }
      }
      return { ...chat._doc, lastMessage };
    });

    res.status(200).json({ success: true, data: decryptedChats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch chats.', error: error.message });
  }
};

// Fetch messages for a specific chat and clear unread count for the current user
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // SECURITY CHECK: Verify user is a participant of this chat
    const chat = await Chat.findOne({ _id: chatId, participants: userId });
    if (!chat) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation.' });
    }

    // Fetch messages
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });
    // Decrypt both text and image attachment URL before sending to client
    const decryptedMessages = messages.map((msg) => {
      let decryptedContent = '';
      let decryptedAttachmentUrl = '';

      // Decrypt text content
      if (msg.encryptedMessage && msg.iv) {
        try {
          decryptedContent = decryptText(msg.encryptedMessage, msg.iv);
        } catch (err) {
          decryptedContent = '[Unable to decrypt message]';
        }
      }

      // Decrypt image / attachment URL
      if (msg.encryptedImagePath && msg.imageIv) {
        try {
          decryptedAttachmentUrl = decryptText(msg.encryptedImagePath, msg.imageIv);
        } catch (err) {
          decryptedAttachmentUrl = '';
        }
      }

      return {
        ...msg._doc,
        content: decryptedContent || msg.content,
        attachmentUrl: decryptedAttachmentUrl || msg.attachmentUrl,
      };
    });
    // Clear unread counts for this chat
    await Chat.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${userId}`]: 0 }
    });

    // Mark notifications as read for this chat
    await Notification.updateMany({ chat: chatId, recipient: userId }, { isRead: true });

    res.status(200).json({ success: true, data: decryptedMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch history.', error: error.message });
  }
};

// Fetch real-time notifications for the user
exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id, isRead: false })
      .populate('sender', 'name profilePic')
      .populate('product', 'title')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch notifications.', error: error.message });
  }
};

// Mark a notification as seen in the database
exports.markNotificationRead = async (req, res) => {
  try {
    const { notifId } = req.params;
    await Notification.findByIdAndUpdate(notifId, { isRead: true });
    res.status(200).json({ success: true, message: 'Notification marked as seen' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification state.' });
  }
};

// Report a user in a specific chat session for admin review
exports.reportUser = async (req, res) => {
  try {
    const { chatId } = req.body;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat session not found.' });

    // Identify the user to report (the participant who is NOT the reporter)
    const reportedUserId = chat.participants.find(p => p.toString() !== req.user._id.toString());
    if (!reportedUserId) return res.status(400).json({ success: false, message: 'Unable to identify target user.' });

    const User = require('../models/user.model');
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) return res.status(404).json({ success: false, message: 'Target user not found.' });

    // Guard: Prevent reporting Admins
    if (reportedUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot report an admin account. If you have concerns, please use the main inquiry form.' });
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId,
      chat: chatId,
      reason: 'User reported via chat interface'
    });

    // Notify all Admins about the new report
    const io = req.app.get('socketio');
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      const notif = await Notification.create({
        recipient: admin._id,
        sender: req.user._id,
        type: 'system',
        content: `New Report: @${req.user.name} reported @${reportedUser.name}`,
        chat: chatId
      });

      // Push real-time alert if admin is online
      if (io) {
        io.to(admin._id.toString()).emit('receive_message', {
          chat: chatId,
          content: notif.content,
          type: 'system'
        });
      }
    }

    res.status(201).json({ success: true, message: 'User has been reported to the admin for review.' });
  } catch (error) {
    console.error('Reporting Error:', error);
    res.status(500).json({ success: false, message: 'Could not submit report.', error: error.message });
  }
};

// Admin: Get all reports
exports.getReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email status')
      .populate('chat', 'product')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed.' });
  }
};

// Admin: Ban/Suspend User
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId, status, days } = req.body;
    
    if (!userId || !status) {
      return res.status(400).json({ success: false, message: 'userId and status are required.' });
    }
    
    const User = require('../models/user.model');
    
    // Safety: Prevent admin banning another admin
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found.' });
    if (targetUser.role === 'admin' && status === 'banned') {
      return res.status(400).json({ success: false, message: 'You cannot ban another administrator account.' });
    }

    let banExpires = null;
    if (status === 'banned' && days && parseInt(days) > 0) {
      banExpires = new Date();
      banExpires.setDate(banExpires.getDate() + parseInt(days));
    }

    const updateData = { status };
    if (banExpires) updateData.banExpires = banExpires;
    if (status === 'active') updateData.banExpires = null; // Clear ban expiry when reactivating
    
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    
    res.status(200).json({ 
      success: true, 
      message: `User ${targetUser.name} status updated to ${status}${banExpires ? ` until ${banExpires.toDateString()}` : ''}`, 
      data: user 
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    res.status(500).json({ success: false, message: 'Update failed: ' + error.message });
  }
};

// Admin: Resolve Report
exports.resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    await Report.findByIdAndUpdate(reportId, { status: 'resolved' });
    res.status(200).json({ success: true, message: 'Report marked as resolved.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Resolution failed.' });
  }
};

// Delete a report record permanently
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    console.log(`Admin ${req.user.email} is deleting report: ${reportId}`);
    const deleted = await Report.findByIdAndDelete(reportId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Report record not found.' });
    }
    res.status(200).json({ success: true, message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('Delete Report Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during deletion.', error: error.message });
  }
};
