const express = require('express');
const { 
  sendRegistrationOTP, 
  verifyRegistrationOTP, 
  sendPasswordResetOTP, 
  verifyAndResetPassword,
  sendPasswordUpdateOTP,
  verifyPasswordUpdateOTP
} = require('../controllers/otpController');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();

// Registration OTP routes
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);

// Password reset OTP routes
router.post('/send-password-reset-otp', sendPasswordResetOTP);
router.post('/verify-reset-otp', verifyAndResetPassword);

// Password update OTP routes (requires authentication)
router.post('/send-password-update-otp', requireAuth, sendPasswordUpdateOTP);
router.post('/verify-password-update-otp', requireAuth, verifyPasswordUpdateOTP);

module.exports = router;