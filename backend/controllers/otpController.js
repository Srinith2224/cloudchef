const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Store OTPs temporarily (in production, consider using Redis)
const otpStore = {};

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Generate OTP function
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, isPasswordReset = false) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: isPasswordReset ? 'Password Reset OTP' : 'Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #32cd32; text-align: center;">Cloud Chef</h2>
        <h3 style="text-align: center;">${isPasswordReset ? 'Password Reset Code' : 'Email Verification Code'}</h3>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
          ${otp}
        </div>
        <p style="margin-top: 20px;">This code will expire in 10 minutes.</p>
        <p style="color: #777; font-size: 12px; margin-top: 30px; text-align: center;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

// Generate and send OTP for registration
const sendRegistrationOTP = async (req, res) => {
  const { email, firstName, lastName, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with user details (expires in 10 minutes)
    otpStore[email] = {
      otp,
      firstName,
      lastName,
      password,
      createdAt: new Date(),
      type: 'registration'
    };

    // Send OTP via email
    await sendOTPEmail(email, otp);
    
    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

// Verify OTP and complete registration
const verifyRegistrationOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const storedData = otpStore[email];
    
    // Check if OTP exists and is valid
    if (!storedData || storedData.otp !== otp || storedData.type !== 'registration') {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // Check if OTP is expired (10 minutes)
    const now = new Date();
    if ((now - storedData.createdAt) > 10 * 60 * 1000) {
      delete otpStore[email];
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Create user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(storedData.password, salt);

    const user = await User.create({
      email,
      password: hash,
      firstName: storedData.firstName,
      lastName: storedData.lastName
    });

    // Create token
    const token = jwt.sign({ _id: user._id }, process.env.SECRET, { expiresIn: '3d' });
    
    // Remove OTP data
    delete otpStore[email];
    
    res.status(200).json({ email, token });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

// Generate and send OTP for password reset
const sendPasswordResetOTP = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP (expires in 10 minutes)
    otpStore[email] = {
      otp,
      userId: user._id,
      createdAt: new Date(),
      type: 'reset'
    };

    // Send OTP via email
    await sendOTPEmail(email, otp, true);
    
    res.status(200).json({ message: 'Password reset OTP sent to your email' });
  } catch (error) {
    console.error('Error sending reset OTP:', error);
    res.status(500).json({ error: 'Failed to send reset OTP' });
  }
};

// Verify OTP and reset password
const verifyAndResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const storedData = otpStore[email];
    
    // Check if OTP exists and is valid
    if (!storedData || storedData.otp !== otp || storedData.type !== 'reset') {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // Check if OTP is expired (10 minutes)
    const now = new Date();
    if ((now - storedData.createdAt) > 10 * 60 * 1000) {
      delete otpStore[email];
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(storedData.userId, { password: hash });
    
    // Remove OTP data
    delete otpStore[email];
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  sendPasswordResetOTP,
  verifyAndResetPassword
};