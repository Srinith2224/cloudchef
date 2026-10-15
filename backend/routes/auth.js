const express = require('express');
const { loginUser, logoutUser, googleSignIn, getGoogleClientId, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Sign-up lives in routes/otp.js because new accounts confirm their email with a code first
const router = express.Router();

router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/google-signin', googleSignIn);
router.get('/google-client-id', getGoogleClientId);
router.get('/me', requireAuth, getMe);

module.exports = router;
