import { Client, Users, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Appwrite Service for Symbiosis
 * Handles secure authentication for scientific research platform
 */
class AppwriteService {
  constructor() {
    // Server-side client for admin operations
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    this.users = new Users(this.client);
    logger.info('Appwrite service initialized for Symbiosis');
  }

  /**
   * Create a new user in Appwrite
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {Promise<Object>} Result with user object
   */
  async createUser(email, password, displayName) {
    try {
      const user = await this.users.create(
        ID.unique(),
        email,
        undefined, // phone (optional)
        password,
        displayName
      );

      logger.info(`User created in Appwrite: ${email}`);
      return { success: true, user };
    } catch (error) {
      logger.error('Appwrite createUser error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByEmail(email) {
    try {
      const response = await this.users.list([
        Query.equal('email', email)
      ]);

      if (response.users && response.users.length > 0) {
        return response.users[0];
      }
      return null;
    } catch (error) {
      logger.error('Appwrite getUserByEmail error:', error);
      return null;
    }
  }

  /**
   * Get user by Appwrite ID
   * @param {string} userId - Appwrite user ID
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserById(userId) {
    try {
      const user = await this.users.get(userId);
      return user;
    } catch (error) {
      logger.error('Appwrite getUserById error:', error);
      return null;
    }
  }

  /**
   * Update user password
   * @param {string} userId - Appwrite user ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Result object
   */
  async updateUserPassword(userId, newPassword) {
    try {
      await this.users.updatePassword(userId, newPassword);
      logger.info(`Password updated for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Appwrite updateUserPassword error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete user from Appwrite
   * @param {string} userId - Appwrite user ID
   * @returns {Promise<Object>} Result object
   */
  async deleteUser(userId) {
    try {
      await this.users.delete(userId);
      logger.info(`User deleted from Appwrite: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Appwrite deleteUser error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user email
   * @param {string} userId - Appwrite user ID
   * @param {string} newEmail - New email address
   * @returns {Promise<Object>} Result object
   */
  async updateUserEmail(userId, newEmail) {
    try {
      await this.users.updateEmail(userId, newEmail);
      logger.info(`Email updated for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Appwrite updateUserEmail error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user name
   * @param {string} userId - Appwrite user ID
   * @param {string} newName - New display name
   * @returns {Promise<Object>} Result object
   */
  async updateUserName(userId, newName) {
    try {
      await this.users.updateName(userId, newName);
      logger.info(`Name updated for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Appwrite updateUserName error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const appwriteService = new AppwriteService();
