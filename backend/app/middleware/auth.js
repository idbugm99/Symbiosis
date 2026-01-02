import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

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
 * Appwrite/JWT Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get fresh user data from database
    const userQuery = await pool.query(
      'SELECT id, appwrite_user_id, email, display_name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    const user = userQuery.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account has been disabled'
      });
    }

    // Attach user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      appwrite_user_id: user.appwrite_user_id,
      isActive: user.is_active
    };

    logger.debug(`Authenticated request from user: ${req.user.email}`);
    next();

  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired. Please login again.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token'
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorize(['admin', 'supervisor'])
 */
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}. Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions. This action requires elevated privileges.'
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userQuery = await pool.query(
      'SELECT id, appwrite_user_id, email, display_name, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userQuery.rows.length > 0 && userQuery.rows[0].is_active) {
      req.user = {
        id: userQuery.rows[0].id,
        email: userQuery.rows[0].email,
        displayName: userQuery.rows[0].display_name,
        role: userQuery.rows[0].role,
        appwrite_user_id: userQuery.rows[0].appwrite_user_id,
        isActive: userQuery.rows[0].is_active
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }

  next();
};
