const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// General Authentication Protocol
exports.verifyToken = async (req, res, next) => {
  try {
    let token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) {
      token = token.split(' ')[1];
    }
    
    if (!token) return res.status(401).json({ success: false, message: 'Unauthenticated. Access denied.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'Invalid session token' });

    // BAN CHECK: Handle suspended or banned users
    if (req.user.status !== 'active') {
      if (req.user.banExpires && new Date() > req.user.banExpires) {
        // Ban expired, auto-restore access
        req.user.status = 'active';
        req.user.banExpires = null;
        await req.user.save();
      } else {
        const msg = req.user.status === 'banned' 
          ? `Your account is banned until ${req.user.banExpires?.toLocaleString() || 'further notice'}.`
          : 'Your account is currently suspended for review.';
        return res.status(403).json({ success: false, message: msg, banned: true });
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired', expired: true });
    return res.status(401).json({ success: false, message: 'Authentication failure', error: err.message });
  }
};

// Enforce strictly admins
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Forbidden. Admin Clearance Required.' });
  }
};
