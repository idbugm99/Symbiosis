import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type Auth
} from 'firebase/auth';

class AuthService {
  // Properties
  private auth: Auth;

  constructor() {
    this.auth = getAuth();
  }

  /**
   * Sign in with email and password
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create new user account
   */
  async register(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Update display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out current user
   */
  async logout() {
    try {
      await signOut(this.auth);
      window.location.href = '/';
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.auth.currentUser;
  }

  /**
   * Get Firebase ID token for API authentication
   */
  async getIdToken() {
    const user = this.getCurrentUser();
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.auth.currentUser !== null;
  }
}

// Export singleton instance
export const authService = new AuthService();
