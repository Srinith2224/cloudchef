const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');
const { sendOtpEmail } = require('../utils/mailer');
const { HttpError, asyncHandler } = require('../utils/http');
const { authPayload, normalizeEmail, checkPassword, EMAIL_RE } = require('./authController');

/*
 * One-time codes are kept in memory. That is fine for a single server.
 * If you run several instances, move this store to Redis or MongoDB.
 */
const otpStore = new Map();

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

const keyFor = (purpose, email) => `${purpose}:${email}`;
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
    throw new HttpError(429, `Please wait ${wait}s before asking for a new code.`);
  }
  const otp = crypto.randomInt(100000, 1000000).toString();
  otpStore.set(key, { otpHash: hashOtp(otp), createdAt: Date.now(), attempts: 0, ...data });
  return otp;
};

/** Checks a code and returns what was stored with it. Throws a 400 with a helpful message otherwise. */
const useOtp = (purpose, email, otp) => {
  const key = keyFor(purpose, email);
  const entry = otpStore.get(key);
  if (!entry) throw new HttpError(400, 'This code is invalid or has expired. Request a new one.');

  if (Date.now() - entry.createdAt > OTP_TTL_MS) {
    otpStore.delete(key);
    throw new HttpError(400, 'This code has expired. Request a new one.');
  }

  const given = Buffer.from(hashOtp(String(otp || '').trim()));
  const expected = Buffer.from(entry.otpHash);
  if (!crypto.timingSafeEqual(given, expected)) {
    entry.attempts += 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(key);
      throw new HttpError(400, 'Too many wrong codes. Request a new one.');
    }
    throw new HttpError(400, `That code is not right. ${MAX_ATTEMPTS - entry.attempts} tries left.`);
  }

  otpStore.delete(key);
  return entry;
};

/** Sends the email; if that fails, forgets the code so the user can ask again right away. */
const deliver = async (purpose, email, otp) => {
  try {
    await sendOtpEmail(email, otp, purpose);
  } catch (error) {
    otpStore.delete(keyFor(purpose, email));
    console.error('Email error:', error.message);
    throw new HttpError(502, 'We could not send the email. Check the address and try again.');
  }
};

// POST /api/otp/send-registration-otp  { firstName, lastName, email, password }
const sendRegistrationOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const firstName = String(req.body.firstName || '').trim().slice(0, 60);
  const lastName = String(req.body.lastName || '').trim().slice(0, 60);
  const { password } = req.body;

  if (!firstName || !lastName || !email || !password) throw new HttpError(400, 'Fill in every field.');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  checkPassword(password);
  if (await User.exists({ email })) throw new HttpError(400, 'An account with this email already exists. Try signing in.');

  // Hash now so the plain password never sits in memory waiting for the code
  const passwordHash = await bcrypt.hash(password, 10);
  const otp = issueOtp('registration', email, { firstName, lastName, passwordHash });
  await deliver('registration', email, otp);
  res.status(200).json({ message: `We sent a 6-digit code to ${email}.` });
});

// POST /api/otp/verify-registration-otp  { email, otp }
const verifyRegistrationOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const entry = useOtp('registration', email, req.body.otp);
  if (await User.exists({ email })) throw new HttpError(400, 'An account with this email already exists. Try signing in.');

  const user = await User.create({ email, password: entry.passwordHash, firstName: entry.firstName, lastName: entry.lastName });
  res.status(201).json(authPayload(user));
});

// POST /api/otp/send-password-reset-otp  { email }
const sendPasswordResetOTP = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Enter a valid email address.');

  // Always answer the same way so this endpoint can't be used to find registered emails
  const user = await User.findOne({ email });
  if (user) {
    const otp = issueOtp('reset', email, { userId: String(user._id) });
    await deliver('reset', email, otp);
  }
  res.status(200).json({ message: `If ${email} has an account, a 6-digit code is on its way.` });
});

// POST /api/otp/verify-reset-otp  { email, otp, newPassword }
const verifyAndResetPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  checkPassword(req.body.newPassword);
  const entry = useOtp('reset', email, req.body.otp);

  await User.findByIdAndUpdate(entry.userId, { password: await bcrypt.hash(req.body.newPassword, 10) });
  res.status(200).json({ message: 'Password updated. You can sign in now.' });
});

// POST /api/otp/send-password-update-otp  { newPassword }
// The code always goes to the email on the account, never one from the request.
const sendPasswordUpdateOTP = asyncHandler(async (req, res) => {
  checkPassword(req.body.newPassword);
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'Account not found.');

  const passwordHash = await bcrypt.hash(req.body.newPassword, 10);
  const otp = issueOtp('update', user.email, { userId: String(user._id), passwordHash });
  await deliver('update', user.email, otp);
  res.status(200).json({ message: `We sent a 6-digit code to ${user.email}.` });
});

// POST /api/otp/verify-password-update-otp  { otp }
const verifyPasswordUpdateOTP = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) throw new HttpError(404, 'Account not found.');

  const entry = useOtp('update', user.email, req.body.otp);
  if (entry.userId !== String(user._id)) throw new HttpError(403, 'This code belongs to another account.');

  user.password = entry.passwordHash;
  await user.save();
  res.status(200).json({ message: 'Password updated.' });
});

module.exports = {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  sendPasswordResetOTP,
  verifyAndResetPassword,
  sendPasswordUpdateOTP,
  verifyPasswordUpdateOTP
};
