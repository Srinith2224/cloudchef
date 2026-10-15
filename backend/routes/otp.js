const express = require('express');
const {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  sendPasswordResetOTP,
  verifyAndResetPassword,
  sendPasswordUpdateOTP,
  verifyPasswordUpdateOTP
} = require('../controllers/otpController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);
router.post('/send-password-reset-otp', sendPasswordResetOTP);
router.post('/verify-reset-otp', verifyAndResetPassword);
router.post('/send-password-update-otp', requireAuth, sendPasswordUpdateOTP);
router.post('/verify-password-update-otp', requireAuth, verifyPasswordUpdateOTP);

module.exports = router;
