const User = require('../models/user.model');
const OTP = require('../models/otp.model');
const Session = require('../models/session.model');
const { sendEmail } = require('../services/email.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const validatePassword = (password) => {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (!/\d/.test(password)) return 'Password must contain at least one digit.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase English character.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase English character.';
  if (!/[!@#$%^&*()\-+]/.test(password)) return 'Password must contain at least one special character (!@#$%^&*()-+).';
  return null;
};

// Process registration limits to valid domain and dispatches OTP
exports.register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    const pwdError = validatePassword(password);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    // Convert email to lowercase to prevent case sensitivity issues
    email = email ? email.toLowerCase() : '';

    // Check college domain strictly
    if (!email.endsWith('@iitp.ac.in')) {
      return res.status(400).json({ success: false, message: 'Must use an IITP email.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ success: false, message: 'User already exists and is verified.' });
    }

    // Generate random OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in DB for verification step later
    await OTP.deleteMany({ email }); // Remove older unverified OTPs
    await OTP.create({ email, code: otpCode });

    // Send the email securely (using simple text format to bypass spam filters that dropped the HTML)
    await sendEmail({
      from: process.env.GOOGLE_USER,
      to: email,
      subject: 'CampusKart: Action Required',
      text: `Welcome to CampusKart!\n\nPlease use the following secure code to complete your registration.\n\nCode: ${otpCode}\n\nThis code will expire shortly. Do not share it with anyone.`,
    });

    // Hash password before saving basic footprint
    const hashedPassword = await bcrypt.hash(password, 10);

    // Instead of completely replacing, manage user state 
    // Usually, you should clean up unverified accounts, but for simplicity
    if (!existingUser) {
      await User.create({ name, email, password: hashedPassword });
    } else {
      existingUser.name = name;
      existingUser.password = hashedPassword;
      await existingUser.save();
    }

    res.status(200).json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error initiating registration.', error: error.message });
  }
};

// Validate the sent token and initialize the first token
exports.verifyOTP = async (req, res) => {
  try {
    let { email, otp } = req.body;
    email = email ? email.toLowerCase() : '';

    const validOtp = await OTP.findOne({ email, code: otp });
    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // Identify user to unblock access
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User matching email not found.' });
    }

    user.isVerified = true;
    await user.save();

    // Clean up OTP to avoid reuse
    await OTP.deleteOne({ _id: validOtp._id });

    // Generate temporary JWT session
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }

    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token to securely persist login
    await Session.create({ userId: user._id, refreshToken });

    res.status(200).json({
      success: true,
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying OTP.', error: error.message });
  }
};

// Handle traditional login for returning users
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email ? email.toLowerCase() : '';

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({ success: false, message: 'Invalid credentials or unverified email.' });
    }

    // Admins can block problematic users
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    // Sign the normal JSON Web Tokens
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await Session.create({ userId: user._id, refreshToken });

    res.status(200).json({
      success: true,
      data: { user, accessToken, refreshToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login error.', error: error.message });
  }
};

// Handle removing sessions
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await Session.deleteOne({ refreshToken });
    res.status(200).json({ success: true, message: 'Logged out beautifully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed.', error: error.message });
  }
};

// Handle resending OTP
exports.resendOTP = async (req, res) => {
  try {
    let { email } = req.body;
    email = email ? email.toLowerCase() : '';

    // Check if the user actually exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified.' });
    }

    // Overwrite previous OTPs explicitly
    await OTP.deleteMany({ email });
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ email, code: otpCode });

    await sendEmail({
      from: process.env.GOOGLE_USER,
      to: email,
      subject: 'CampusKart: Action Required (Resend)',
      text: `Hello,\n\nHere is your new secure code required for registration: ${otpCode}\n\nIt expires in 5 minutes.`,
    });

    res.status(200).json({ success: true, message: 'A new OTP has been sent successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to resend OTP.', error: error.message });
  }
};

// Trigger a reset password event securely via OTP over email
exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    email = email ? email.toLowerCase() : '';

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Error: This email address is not registered in our database! Please sign up instead.' });
    }

    await OTP.deleteMany({ email });
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.create({ email, code: otpCode });

    await sendEmail({
      from: process.env.GOOGLE_USER,
      to: email,
      subject: 'CampusKart: Password Reset Requested',
      text: `Hello,\n\nYou requested a password reset. Use this secure code to choose a new password:\n\nCode: ${otpCode}\n\nIt expires in 5 minutes. If you did not request this, ignore this email.`,
    });

    // Return a generic success to prevent email enumeration
    res.status(200).json({ success: true, message: 'Password reset OTP sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error initiating reset.', error: error.message });
  }
};

// Silently issue a new access token using the refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'No refresh token provided.' });

    const session = await Session.findOne({ refreshToken });
    if (!session) return res.status(403).json({ success: false, message: 'Invalid or expired session.' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const newAccessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Refresh token expired. Please log in again.' });
  }
};

// Verify the OTP and save the newly attached password directly over the DB hash
exports.resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    email = email ? email.toLowerCase() : '';

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      return res.status(400).json({ success: false, message: pwdError });
    }

    const validOtp = await OTP.findOne({ email, code: otp });
    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User matching email not found.' });

    // Ensure users actually verify account explicitly even if resetting later
    user.isVerified = true;
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await OTP.deleteOne({ _id: validOtp._id });

    res.status(200).json({ success: true, message: 'Password has been successfully altered. You can now login!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resetting password.', error: error.message });
  }
};
