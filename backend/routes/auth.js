const express = require('express');
const { loginUser, registerUser, logoutUser, googleSignIn, getGoogleClientId } = require('../controllers/authController');
const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.post('/logout', logoutUser); // Add logout route

// Add the Google sign-in route
router.post('/google-signin', googleSignIn);

// Add route to get Google Client ID
router.get('/google-client-id', getGoogleClientId);

module.exports = router;
