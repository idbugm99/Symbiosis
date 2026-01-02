import express from 'express';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { appwriteService } from '../services/appwrite.js';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';

// Load environment variables
dotenv.config();

const router = express.Router();

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * Generate JWT token for Symbiosis sessions
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      appwrite_user_id: user.appwrite_user_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * POST /api/auth/register
 * Register new user with Appwrite authentication
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Display name must be between 2 and 255 characters'),
  body('role')
    .optional()
    .isIn(['user', 'researcher', 'supervisor', 'admin'])
    .withMessage('Invalid role specified')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { email, password, displayName, role = 'user' } = req.body;

    // Check if user already exists in Symbiosis database
    const existingUserQuery = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUserQuery.rows.length > 0) {
      return res.status(409).json({
        error: 'User exists',
        message: 'An account with this email already exists'
      });
    }

    // Create user in Appwrite
    const appwriteResult = await appwriteService.createUser(email, password, displayName);

    if (!appwriteResult.success) {
      logger.error('Failed to create user in Appwrite:', appwriteResult.error);
      return res.status(500).json({
        error: 'Registration failed',
        message: 'Unable to create user account in authentication service',
        details: appwriteResult.error
      });
    }

    const appwriteUserId = appwriteResult.user.$id;

    // Create user in Symbiosis database
    const insertUserQuery = await pool.query(
      `INSERT INTO users (appwrite_user_id, email, display_name, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, appwrite_user_id, email, display_name, role, created_at`,
      [appwriteUserId, email, displayName, role]
    );

    const newUser = insertUserQuery.rows[0];

    // Generate JWT token
    const token = generateToken(newUser);

    logger.info(`New user registered: ${email} (Appwrite ID: ${appwriteUserId})`);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        role: newUser.role,
        appwriteUserId: newUser.appwrite_user_id
      },
      token
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Unable to create account. Please try again.',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with Appwrite authentication
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Verify user exists in Appwrite
    const appwriteUser = await appwriteService.getUserByEmail(email);

    if (!appwriteUser) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Get user from Symbiosis database
    const userQuery = await pool.query(
      'SELECT id, appwrite_user_id, email, display_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = userQuery.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact an administrator.'
      });
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        appwriteUserId: user.appwrite_user_id
      },
      token
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Unable to login. Please try again.',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token invalidation)
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      message: 'Logout successful',
      note: 'Please clear your authentication token on the client side'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.json({
      message: 'Logout completed',
      note: 'Please clear your authentication token on the client side'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userQuery = await pool.query(
      'SELECT id, appwrite_user_id, email, display_name, role, avatar_url, created_at, last_login_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    const user = userQuery.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        appwriteUserId: user.appwrite_user_id,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Profile fetch failed',
      message: 'Unable to fetch user profile'
    });
  }
});

/**
 * PUT /api/auth/change-password
 * Change user password through Appwrite
 */
router.put('/change-password', [
  authMiddleware,
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input',
        details: errors.array()
      });
    }

    const { newPassword } = req.body;

    if (!req.user.appwrite_user_id) {
      return res.status(400).json({
        error: 'Invalid user',
        message: 'User is not linked to authentication service'
      });
    }

    // Update password in Appwrite
    const result = await appwriteService.updateUserPassword(
      req.user.appwrite_user_id,
      newPassword
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Password change failed',
        message: 'Unable to update password',
        details: result.error
      });
    }

    logger.info(`Password changed for user: ${req.user.email}`);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: 'Unable to change password. Please try again.',
      details: error.message
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token validity
 */
router.get('/verify', authMiddleware, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      appwriteUserId: req.user.appwrite_user_id
    }
  });
});

export default router;
