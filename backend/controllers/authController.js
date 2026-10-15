const User = require('../models/UserModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const createToken = (_id) => {
  if (!process.env.SECRET) throw new Error('JWT configuration error');
  return jwt.sign({ _id: _id.toString() }, process.env.SECRET, { expiresIn: '7d' });
};

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

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  return null;
};

const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your email and password.' });
    }

    const user = await User.findOne({ email });
    // Same message for both cases so nobody can probe which emails are registered
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    res.status(200).json(authPayload(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sign in failed. Try again in a moment.' });
  }
};

const logoutUser = (req, res) => {
  // JWTs are stateless; the client deletes its token.
  res.status(200).json({ message: 'Signed out' });
};

/** Direct registration without email verification. Kept for tests/tools; the app uses the OTP flow. */
const registerUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const firstName = (req.body.firstName || '').trim();
    const lastName = (req.body.lastName || '').trim();
    const { password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Fill in every field.' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'An account with this email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hashedPassword });

    res.status(201).json(authPayload(user));
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Could not create your account. Try again in a moment.' });
  }
};

const googleSignIn = async (req, res) => {
  const { token: googleToken } = req.body;
  if (!googleToken) return res.status(400).json({ error: 'Missing Google credential.' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { email: rawEmail, given_name, family_name, picture, sub, email_verified } = ticket.getPayload();
    const email = normalizeEmail(rawEmail);

    if (!email_verified) return res.status(400).json({ error: 'Your Google email is not verified.' });

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
      user = await User.create({
        email,
        firstName: given_name || 'Chef',
        lastName: family_name || '-',
        googleId: sub,
        profilePhoto: picture || '',
        password: randomPassword
      });
    } else if (!user.googleId) {
      user.googleId = sub;
      if (picture && !user.profilePhoto) user.profilePhoto = picture;
      await user.save();
    }

    res.status(200).json(authPayload(user));
  } catch (error) {
    console.error('Google authentication error:', error.message);
    res.status(400).json({ error: 'Google sign in failed. Try again.' });
  }
};

const getGoogleClientId = (req, res) => {
  // Not an error: Google sign-in is simply hidden when it isn't configured
  res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
};

/** Returns a fresh token and the latest user details for the signed-in user. */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.status(200).json(authPayload(user));
  } catch (error) {
    res.status(500).json({ error: 'Could not load your account.' });
  }
};

module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  googleSignIn,
  getGoogleClientId,
  getMe,
  authPayload,
  createToken,
  normalizeEmail,
  validatePassword,
  EMAIL_RE
};
