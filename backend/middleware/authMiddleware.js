const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const requireAuth = async (req, res, next) => {
  // Get auth header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.userId = decoded._id;
    next();
  } catch (error) {
    console.log('Token verification error:', error);
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

module.exports = requireAuth;