const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateRegisterInput, validateLoginInput } = require('../utils/validation');

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'photo_gallery_jwt_secret_dev_key_2026',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, profileImage, phoneNumber } = req.body;

    // Validate inputs
    const { isValid, errors } = validateRegisterInput({
      fullName,
      email,
      password,
      confirmPassword
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Create user (role defaults to USER; first user can be admin if no users exist)
    const usersCount = await User.countDocuments();
    const role = usersCount === 0 ? 'ADMIN' : 'USER';

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      profileImage: profileImage || '',
      phoneNumber: phoneNumber ? phoneNumber.trim() : ''
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[Register Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.'
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { isValid, errors } = validateLoginInput({ email, password });
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: errors[0],
        errors
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.'
    });
  }
};

// @desc    Get currently logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user profile.'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout
};
