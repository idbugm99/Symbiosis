import express from 'express';
import { logger } from '../utils/logger.js';
import { authorize } from '../middleware/auth.js';
import { setUserClaims, getUserByUid } from '../services/firebase.js';

const router = express.Router();

/**
 * Get current user profile
 * GET /api/users/me
 */
router.get('/me', async (req, res, next) => {
  try {
    const userRecord = await getUserByUid(req.user.uid);

    res.json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        customClaims: userRecord.customClaims || {},
        metadata: {
          createdAt: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user role (admin only)
 * POST /api/users/:uid/role
 */
router.post('/:uid/role', authorize(['admin']), async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { role } = req.body;

    const validRoles = ['user', 'researcher', 'supervisor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }

    await setUserClaims(uid, { role });

    logger.info(`User ${uid} role updated to ${role} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all users (admin only)
 * GET /api/users
 */
router.get('/', authorize(['admin']), async (req, res, next) => {
  try {
    // TODO: Implement user listing with Firebase Admin
    res.json({
      success: true,
      data: [],
      message: 'User listing not yet implemented'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
