import { getAuth } from 'firebase-admin/auth';
import { logger } from '../utils/logger.js';

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID tokens from request headers
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

    // Verify token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(token);

    // Attach user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      role: decodedToken.role || 'user' // Custom claims
    };

    logger.debug(`Authenticated request from user: ${req.user.email}`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired'
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authentication token'
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
      logger.warn(`Access denied for user ${req.user.email} with role ${req.user.role}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
