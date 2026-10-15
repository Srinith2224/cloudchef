/*
 * Creates an admin account, or promotes an existing account to admin.
 *
 *   npm run create-admin -- you@example.com "StrongPassword123" Your Name
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/UserModel');

async function main() {
  const [email, password, firstName = 'Admin', lastName = 'User'] = process.argv.slice(2);
  if (!email) {
    console.log('Usage: npm run create-admin -- <email> [password] [firstName] [lastName]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const normalized = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalized });

  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`${normalized} is now an admin.`);
  } else {
    if (!password || password.length < 8) {
      console.log('New admin accounts need a password with at least 8 characters.');
      process.exit(1);
    }
    await User.create({
      email: normalized,
      password: await bcrypt.hash(password, 10),
      firstName,
      lastName,
      role: 'admin'
    });
    console.log(`Admin account created for ${normalized}.`);
  }
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
