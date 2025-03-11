const User = require('../models/UserModel');

const requireAdmin = async (req, res, next) => {
    try {
        // userId should be set by the requireAuth middleware
        if (!req.userId) {
            return res.status(401).json({ error: 'Authorization required' });
        }
        
        const user = await User.findById(req.userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        // Add the user object to the request
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = requireAdmin;