const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');
const { sendOtpEmail } = require('../utils/mailer');
const { authPayload, normalizeEmail, validatePassword, EMAIL_RE } = require('./authController');

/*
 * One-time codes are kept in memory. That is fine for a single server.
 * If you run several instances, move this store to Redis or MongoDB.
 */
const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

const keyFor = (purpose, email) => `${purpose}:${email}`;
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

// Remove expired codes every few minutes so memory doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) {
    if (now - entry.createdAt > OTP_TTL_MS) otpStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

/** Stores a fresh code, enforcing a resend cooldown. Returns the plain code. */
const issueOtp = (purpose, email, data = {}) => {
  const key = keyFor(purpose, email);
  const existing = otpStore.get(key);
  if (existing && Date.now() - existing.createdAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.createdAt)) / 1000);
    const err = new Error(`Please wait ${wait}s before asking for a new code.`);
    err.status = 429;
    throw err;
  }
  const otp = generateOTP();
  otpStore.set(key, { otpHash: hashOtp(otp), createdAt: Date.now(), attempts: 0, ...data });
  return otp;
};

/** Checks a code. Returns the stored entry on success, or an error message. */
const checkOtp = (purpose, email, otp) => {
  const key = keyFor(purpose, email);
  const entry = otpStore.get(key);
  if (!entry) return { error: 'This code is invalid or has expired. Request a new one.' };

  if (Date.now() - entry.createdAt > OTP_TTL_MS) {
    otpStore.delete(key);
    return { error: 'This code has expired. Request a new one.' };
  }

  const given = Buffer.from(hashOtp(String(otp || '').trim()));
  const expected = Buffer.from(entry.otpHash);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(key);
      return { error: 'Too many wrong codes. Request a new one.' };
    }
    return { error: `That code is not right. ${MAX_ATTEMPTS - entry.attempts} tries left.` };
  }

  otpStore.delete(key);
  return { entry };
};

const handleError = (res, error, fallback) => {
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error(fallback, error);
  res.status(500).json({ error: fallback });
};

const sendRegistrationOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const firstName = (req.body.firstName || '').trim();
    const lastName = (req.body.lastName || '').trim();
    const { password } = req.body;

    if (!firstName || !lastName || !email || !password) return res.status(400).json({ error: 'Fill in every field.' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    if (await User.exists({ email })) {
      return res.status(400).json({ error: 'An account with this email already exists. Try signing in.' });
    }

    // Hash now so the plain password never sits in memory waiting for the code
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = issueOtp('registration', email, { firstName, lastName, passwordHash });
    await sendOtpEmail(email, otp, 'registration');

    res.status(200).json({ message: `We sent a 6-digit code to ${email}.` });
  } catch (error) {
    handleError(res, error, 'Could not send the code. Check the email address and try again.');
  }
};

const verifyRegistrationOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { entry, error } = checkOtp('registration', email, req.body.otp);
    if (error) return res.status(400).json({ error });

    if (await User.exists({ email })) {
      return res.status(400).json({ error: 'An account with this email already exists. Try signing in.' });
    }

    const user = await User.create({
      email,
      password: entry.passwordHash,
      firstName: entry.firstName,
      lastName: entry.lastName
    });

    res.status(201).json(authPayload(user));
  } catch (error) {
    handleError(res, error, 'Could not verify the code. Try again.');
  }
};

const sendPasswordResetOTP = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const user = await User.findOne({ email });
    // Always answer the same way so this endpoint can't be used to find registered emails
    if (user) {
      const otp = issueOtp('reset', email, { userId: String(user._id) });
      await sendOtpEmail(email, otp, 'reset');
    }
    res.status(200).json({ message: `If ${email} has an account, a 6-digit code is on its way.` });
  } catch (error) {
    handleError(res, error, 'Could not send the reset code. Try again.');
  }
};

const verifyAndResetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const passwordError = validatePassword(req.body.newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const { entry, error } = checkOtp('reset', email, req.body.otp);
    if (error) return res.status(400).json({ error });

    const hash = await bcrypt.hash(req.body.newPassword, 10);
    await User.findByIdAndUpdate(entry.userId, { password: hash });

    res.status(200).json({ message: 'Password updated. You can sign in now.' });
  } catch (error) {
    handleError(res, error, 'Could not reset your password. Try again.');
  }
};

/** Signed-in users: the code always goes to the email on the account, never one from the request. */
const sendPasswordUpdateOTP = async (req, res) => {
  try {
    const passwordError = validatePassword(req.body.newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
    const otp = issueOtp('update', user.email, { userId: String(user._id), passwordHash });
    await sendOtpEmail(user.email, otp, 'update');

    res.status(200).json({ message: `We sent a 6-digit code to ${user.email}.` });
  } catch (error) {
    handleError(res, error, 'Could not send the code. Try again.');
  }
};

const verifyPasswordUpdateOTP = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const { entry, error } = checkOtp('update', user.email, req.body.otp);
    if (error) return res.status(400).json({ error });
    if (entry.userId !== String(user._id)) return res.status(403).json({ error: 'This code belongs to another account.' });

    user.password = entry.passwordHash;
    await user.save();

    res.status(200).json({ message: 'Password updated.' });
  } catch (error) {
    handleError(res, error, 'Could not update your password. Try again.');
  }
};

module.exports = {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  sendPasswordResetOTP,
  verifyAndResetPassword,
  sendPasswordUpdateOTP,
  verifyPasswordUpdateOTP,
  // exported for tests
  _otpStore: otpStore
};
