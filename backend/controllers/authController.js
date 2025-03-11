const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (id) => {
    return jwt.sign({ _id: id }, process.env.SECRET, { expiresIn: '3d' });
};

// login function
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = createToken(user._id);
        
        res.status(200).json({
            email: user.email, 
            token,
            firstName: user.firstName, 
            lastName: user.lastName,
            userId: user._id,
            role: user.role // Add the role field here
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//  logout function
const logoutUser = (req, res) => {
    // Invalidate the token on the client side
    res.status(200).json({ message: 'Logout successful' });
};

// Register a new user
const registerUser = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = await User.create({ firstName, lastName, email, password: hashedPassword });

    const token = createToken(user._id);
    res.status(201).json({ email: user.email, token });
};

// Add this new function to handle Google authentication
const googleSignIn = async (req, res) => {
  const { token: googleToken } = req.body;
  
  try {
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const { email, given_name, family_name, picture, sub } = ticket.getPayload();
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create a new user with googleId (no password needed)
      user = await User.create({
        email,
        firstName: given_name || 'User',
        lastName: family_name || '',
        googleId: sub,
        profilePhoto: picture || '',
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) // Random password as fallback
      });
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user.googleId = sub;
      
      if (picture && !user.profilePhoto) {
        user.profilePhoto = picture;
      }
      await user.save();
    }
    
    // Create JWT token
    const jwtToken = createToken(user._id);
    
    res.status(200).json({
      email: user.email,
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhoto: user.profilePhoto,
      token: jwtToken
    });
    
  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(400).json({ error: 'Google authentication failed' });
  }
};

// Add this function after your googleSignIn function
const getGoogleClientId = async (req, res) => {
  try {
    // Check if the Google Client ID is set in the environment
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!googleClientId) {
      return res.status(500).json({ error: 'Google Client ID not configured' });
    }
    
    res.status(200).json({ clientId: googleClientId });
  } catch (error) {
    console.error('Error getting Google client ID:', error);
    res.status(500).json({ error: 'Failed to get Google client ID' });
  }
};

// Make sure to export the function in your module.exports
module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  googleSignIn,
  getGoogleClientId // Add this line
};
