// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Import utilities
import { authService } from './utils/auth.js';
import { apiClient } from './utils/api.js';

// Firebase configuration (from environment variables)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export for use in other modules
export { app, auth, db, analytics };

// Initialize auth state listener
onAuthStateChanged(auth, (user) => {
  const authStatusEl = document.getElementById('auth-status');

  if (user) {
    // User is signed in
    console.log('User authenticated:', user.email);
    if (authStatusEl) {
      authStatusEl.innerHTML = `
        <span class="user-email">${user.email}</span>
        <button onclick="authService.logout()" class="btn-logout">Logout</button>
      `;
    }
  } else {
    // User is signed out
    console.log('User not authenticated');
    if (authStatusEl) {
      authStatusEl.innerHTML = `
        <button onclick="window.location.href='/pages/login.html'" class="btn-login">Login</button>
      `;
    }
  }
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Could send to error tracking service here
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Could send to error tracking service here
});

console.log('Symbiosis initialized successfully');
