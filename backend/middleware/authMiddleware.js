const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const requireAuth = async (req, res, next) => {
  // Get auth header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Invalid token provided' });
  }
  
  try {
    
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.SECRET);
    
    // Check if decoded has _id
    if (!decoded || !decoded._id) {
      return res.status(401).json({ error: 'Invalid token content' });
    }
    
    // Set userId on request for later use
    req.userId = decoded._id;
    
    // Proceed to the next middleware/route handler
    next();
  } catch (error) {
    // Provide more specific error messaging for debugging
    let errorMessage = 'Request is not authorized';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token has expired. Please log in again.';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = `Invalid token: ${error.message}. Please log in again.`;
    }
    
    console.error('Token verification failed:', error.message);
    res.status(401).json({ error: errorMessage });
  }
};

module.exports = requireAuth;