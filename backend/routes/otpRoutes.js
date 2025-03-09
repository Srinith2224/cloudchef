const express = require('express');
const { 
  sendRegistrationOTP, 
  verifyRegistrationOTP, 
  sendPasswordResetOTP, 
  verifyAndResetPassword 
} = require('../controllers/otpController');

const router = express.Router();

// Registration OTP routes
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);

// Password reset OTP routes
router.post('/send-password-reset-otp', sendPasswordResetOTP);
router.post('/verify-reset-otp', verifyAndResetPassword);

module.exports = router;