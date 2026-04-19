const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { 
  getUserChats, getChatMessages, getOrCreateChat, getUserNotifications, uploadAttachment, reportUser,
  getReports, resolveReport, updateUserStatus, deleteReport, markNotificationRead
} = require('../controllers/message.controller');
const { isAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/chats', verifyToken, getUserChats);
router.get('/notifications', verifyToken, getUserNotifications);
router.get('/:chatId/messages', verifyToken, getChatMessages);
router.post('/init', verifyToken, getOrCreateChat);
router.post('/upload', verifyToken, upload.single('file'), uploadAttachment);
router.post('/report', verifyToken, reportUser);
router.patch('/notifications/:notifId/read', verifyToken, markNotificationRead);

// Admin Routes
router.get('/admin/reports', verifyToken, isAdmin, getReports);
router.patch('/admin/reports/:reportId/resolve', verifyToken, isAdmin, resolveReport);
router.patch('/admin/users/status', verifyToken, isAdmin, updateUserStatus);
router.delete('/admin/reports/:reportId', verifyToken, isAdmin, deleteReport);

module.exports = router;
