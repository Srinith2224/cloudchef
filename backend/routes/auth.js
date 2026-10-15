const express = require('express');
const { loginUser, registerUser, logoutUser, googleSignIn, getGoogleClientId, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/logout', logoutUser);
router.post('/google-signin', googleSignIn);
router.get('/google-client-id', getGoogleClientId);
router.get('/me', requireAuth, getMe);

module.exports = router;
