const User = require('../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Make sure the token creation is correct
const createToken = (_id) => {
  // Check if SECRET is defined
  if (!process.env.SECRET) {
    console.error('ERROR: JWT SECRET is not defined in environment variables!');
    throw new Error('JWT configuration error');
  }
  
  try {
    // Make sure _id is a string
    const token = jwt.sign({ _id: _id.toString() }, process.env.SECRET, { expiresIn: '3d' });
    console.log(`Generated token for user ${_id} (first 10 chars): ${token.substring(0, 10)}...`);
    return token;
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  }
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

// In your googleSignIn controller
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
      // Create a new user
      user = await User.create({
        email,
        firstName: given_name || 'User',
        lastName: family_name || '',
        googleId: sub,
        profilePhoto: picture || '',
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      });
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user.googleId = sub;
      if (picture && !user.profilePhoto) {
        user.profilePhoto = picture;
      }
      await user.save();
    }
    
    // Create JWT token - ensure it's created correctly
    const jwtToken = createToken(user._id);
    
    // Log the token generation (first few characters only)
    console.log(`Generated token for Google user ${user._id} (first 10 chars): ${jwtToken.substring(0, 10)}...`);
    
    res.status(200).json({
      email: user.email,
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhoto: user.profilePhoto,
      role: user.role || 'user',
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

// Add this new function
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    
    // If valid, create a new access token
    const userId = decoded._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create a new access token
    const newToken = createToken(userId);
    
    // Return the new token
    res.status(200).json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Make sure to export the function in your module.exports
module.exports = {
  loginUser,
  registerUser,
  logoutUser,
  googleSignIn,
  getGoogleClientId, // Add this line
  refreshToken
};
