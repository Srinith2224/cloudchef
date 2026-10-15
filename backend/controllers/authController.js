const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { HttpError, asyncHandler } = require('../utils/http');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const createToken = (_id) => jwt.sign({ _id: _id.toString() }, process.env.SECRET, { expiresIn: '7d' });

/** The shape every auth endpoint returns, so the frontend stores one consistent user object. */
const authPayload = (user) => ({
  token: createToken(user._id),
  userId: user._id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  profilePhoto: user.profilePhoto || '',
  role: user.role || 'user'
});

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

/** Throws a 400 if the password is too weak. */
const checkPassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
  }
};

// POST /api/login  { email, password }
const loginUser = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password) throw new HttpError(400, 'Enter your email and password.');

  const user = await User.findOne({ email });
  // Same message for both cases so nobody can probe which emails are registered
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  res.status(200).json(authPayload(user));
});

// POST /api/logout  (tokens are stateless; the browser just forgets its token)
const logoutUser = (req, res) => res.status(200).json({ message: 'Signed out' });

// POST /api/google-signin  { token }
const googleSignIn = asyncHandler(async (req, res) => {
  const { token: googleToken } = req.body;
  if (!googleToken) throw new HttpError(400, 'Missing Google credential.');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: googleToken, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch (error) {
    console.error('Google sign in error:', error.message);
    throw new HttpError(400, 'Google sign in failed. Try again.');
  }

  const { email: rawEmail, given_name, family_name, picture, sub, email_verified } = payload;
  if (!email_verified) throw new HttpError(400, 'Your Google email is not verified.');
  const email = normalizeEmail(rawEmail);

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      firstName: given_name || 'Chef',
      lastName: family_name || '-',
      googleId: sub,
      profilePhoto: picture || '',
      // Random password: Google accounts can still set a real one with "Forgot password"
      password: await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10)
    });
  } else if (!user.googleId) {
    user.googleId = sub;
    if (picture && !user.profilePhoto) user.profilePhoto = picture;
    await user.save();
  }
  res.status(200).json(authPayload(user));
});

// GET /api/google-client-id  (null hides the Google button)
const getGoogleClientId = (req, res) => res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID || null });

// GET /api/me  (fresh token and the latest user details)
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'Account not found.');
  res.status(200).json(authPayload(user));
});

module.exports = {
  loginUser,
  logoutUser,
  googleSignIn,
  getGoogleClientId,
  getMe,
  authPayload,
  normalizeEmail,
  checkPassword,
  EMAIL_RE
};
