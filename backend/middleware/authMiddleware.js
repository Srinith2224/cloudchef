const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const requireAuth = async (req, res, next) => {
    // Verify authorization
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authorization.split(' ')[1];

    try {
        // Verify token
        const { _id } = jwt.verify(token, process.env.SECRET);
        
        // Find user
        req.userId = _id;
        // Also set req.user to maintain compatibility with both patterns
        req.user = { _id };
        next();
    } catch (error) {
        console.log('Token verification error:', error);
        res.status(401).json({ error: 'Token verification failed: ' + error.message });
    }
};

module.exports = requireAuth;