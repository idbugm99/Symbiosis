import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { logger } from '../utils/logger.js';

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebaseAdmin = () => {
  try {
    // Check if already initialized
    if (firebaseApp) {
      logger.info('Firebase Admin already initialized');
      return firebaseApp;
    }

    // Initialize with service account (for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = JSON.parse(
        readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
      );

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      logger.info('Firebase Admin initialized with service account');
    }
    // Initialize with application default credentials (for development)
    else if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      logger.info('Firebase Admin initialized with default credentials');
    }
    // Fallback initialization
    else {
      firebaseApp = admin.initializeApp();
      logger.info('Firebase Admin initialized with default settings');
    }

    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
};

/**
 * Get Firebase Admin instance
 */
export const getFirebaseAdmin = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebaseAdmin() first.');
  }
  return firebaseApp;
};

/**
 * Set custom user claims (for role-based access)
 */
export const setUserClaims = async (uid, claims) => {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    logger.info(`Custom claims set for user ${uid}:`, claims);
    return true;
  } catch (error) {
    logger.error(`Failed to set custom claims for user ${uid}:`, error);
    throw error;
  }
};

/**
 * Get user by UID
 */
export const getUserByUid = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord;
  } catch (error) {
    logger.error(`Failed to get user ${uid}:`, error);
    throw error;
  }
};

/**
 * Get user by email
 */
export const getUserByEmail = async (email) => {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return userRecord;
  } catch (error) {
    logger.error(`Failed to get user by email ${email}:`, error);
    throw error;
  }
};

/**
 * Delete user
 */
export const deleteUser = async (uid) => {
  try {
    await admin.auth().deleteUser(uid);
    logger.info(`User ${uid} deleted`);
    return true;
  } catch (error) {
    logger.error(`Failed to delete user ${uid}:`, error);
    throw error;
  }
};

export default {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
  setUserClaims,
  getUserByUid,
  getUserByEmail,
  deleteUser
};
