const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const readToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token || token === 'undefined' || token === 'null') return null;
  return token;
};

/** Requires a valid JWT. Sets req.userId and req.userRole. */
const requireAuth = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    if (!decoded || !decoded._id) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });

    // Make sure the account still exists (deleted users must not keep access)
    const user = await User.findById(decoded._id).select('role');
    if (!user) return res.status(401).json({ error: 'Your account no longer exists.' });

    req.userId = String(decoded._id);
    req.userRole = user.role;
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    res.status(401).json({ error: expired ? 'Your session expired. Please sign in again.' : 'Your session is invalid. Please sign in again.' });
  }
};

/** Same as requireAuth, but lets guests through (req.userId stays undefined). */
const optionalAuth = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    if (decoded && decoded._id) req.userId = String(decoded._id);
  } catch {
    // Invalid token on a public route: just treat as guest
  }
  next();
};

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
