const express = require('express');
const { register, verifyOTP, resendOTP, login, logout, forgotPassword, resetPassword, refreshToken } = require('../controllers/auth.controller');

const router = express.Router();

// Define clean routing for users auth flows
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);

module.exports = router;
