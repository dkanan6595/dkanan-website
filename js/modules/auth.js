// DKANAN - Authentication Module
// Handles email login, Google auth, and user role management

const AuthModule = (function() {
  'use strict';
  
  // State
  let currentUser = null;
  let authStateListeners = [];
  
  // Initialize auth state listener
  function init() {
    const { auth } = window.firebaseServices;
    
    auth.onAuthStateChanged(async(user) => {
      if (user) {
        await loadUserData(user);
      } else {
        currentUser = null;
        window.userRole = 'visitor';
        updateUIForAuth(null);
      }
      
      // Notify listeners
      authStateListeners.forEach(cb => cb(user));
    });
  }
  
  // Load user data from Firestore
  async function loadUserData(firebaseUser) {
    try {
      const { db } = window.firebaseServices;
      const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
      
      if (userDoc.exists) {
        currentUser = { uid: firebaseUser.uid, ...userDoc.data() };
        window.currentUser = currentUser;
        window.userRole = currentUser.role || 'visitor';
        updateUIForAuth(currentUser);
      } else {
        // Create new user document
        const newUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL || 'assets/default-avatar.png',
          role: 'visitor',
          membership: 'free',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('users').doc(firebaseUser.uid).set(newUser);
        currentUser = newUser;
        window.currentUser = currentUser;
        window.userRole = 'visitor';
        updateUIForAuth(currentUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }
  
  // Email signup
  async function signupWithEmail(email, password, displayName, role = 'artist') {
    try {
      const { auth, db } = window.firebaseServices;
      
      // Create user
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Update profile
      await user.updateProfile({ displayName });
      
      // Create user document
      await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: user.photoURL || 'assets/default-avatar.png',
        role: role,
        membership: 'free',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Create empty profile
      await db.collection('profiles').doc(user.uid).set({
        userId: user.uid,
        bio: '',
        skills: [],
        category: '',
        location: { district: '', state: '', country: '' },
        socialLinks: {},
        stats: { followers: 0, following: 0, artworks: 0, sales: 0 },
        isVerified: false,
        isMatchingEnabled: false,
        interests: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showNotification('Account created successfully!', 'success');
      return { success: true, user };
    } catch (error) {
      console.error('Signup error:', error);
      showNotification(getAuthErrorMessage(error.code), 'error');
      return { success: false, error: error.message };
    }
  }
  
  // Email login
  async function loginWithEmail(email, password) {
    try {
      const { auth } = window.firebaseServices;
      await auth.signInWithEmailAndPassword(email, password);
      showNotification('Welcome back!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      showNotification(getAuthErrorMessage(error.code), 'error');
      return { success: false, error: error.message };
    }
  }
  
  // Google login/signup
  async function loginWithGoogle(role = 'artist') {
    try {
      const { auth, googleProvider, db } = window.firebaseServices;
      
      const result = await auth.signInWithPopup(googleProvider);
      const user = result.user;
      
      // Check if user exists
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        // Create new user
        await db.collection('users').doc(user.uid).set({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL || 'assets/default-avatar.png',
          role: role,
          membership: 'free',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create empty profile
        await db.collection('profiles').doc(user.uid).set({
          userId: user.uid,
          bio: '',
          skills: [],
          category: '',
          location: { district: '', state: '', country: '' },
          socialLinks: {},
          stats: { followers: 0, following: 0, artworks: 0, sales: 0 },
          isVerified: false,
          isMatchingEnabled: false,
          interests: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      showNotification('Welcome!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      showNotification('Google login failed. Please try again.', 'error');
      return { success: false, error: error.message };
    }
  }
  
  // Logout
  async function logout() {
    try {
      const { auth } = window.firebaseServices;
      await auth.signOut();
      currentUser = null;
      window.currentUser = null;
      window.userRole = 'visitor';
      showNotification('Logged out successfully', 'success');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update user role
  async function updateRole(role) {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    
    try {
      const { db } = window.firebaseServices;
      await db.collection('users').doc(currentUser.uid).update({
        role: role,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      currentUser.role = role;
      window.userRole = role;
      showNotification(`Role updated to ${role}`, 'success');
      return { success: true };
    } catch (error) {
      console.error('Update role error:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Password reset
  async function resetPassword(email) {
    try {
      const { auth } = window.firebaseServices;
      await auth.sendPasswordResetEmail(email);
      showNotification('Password reset email sent!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      showNotification(getAuthErrorMessage(error.code), 'error');
      return { success: false, error: error.message };
    }
  }
  
  // Get error message
  function getAuthErrorMessage(code) {
    const messages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password is too weak',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid credentials',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/popup-closed-by-user': 'Login cancelled'
    };
    return messages[code] || 'An error occurred. Please try again.';
  }
  
  // Update UI for auth state
  function updateUIForAuth(user) {
    const authButtons = document.getElementById('authButtons');
    const logoutBtn = document.querySelector('.logout-btn');
    const profileBtn = document.querySelector('.profile-btn');
    const navProfileImg = document.getElementById('navProfileImg');
    
    if (user) {
      if (authButtons) authButtons.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'flex';
      if (profileBtn) profileBtn.style.display = 'flex';
      if (navProfileImg && user.photoURL) {
        navProfileImg.src = user.photoURL;
      }
    } else {
      if (authButtons) authButtons.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (profileBtn) profileBtn.style.display = 'none';
    }
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      alert(message);
    }
  }
  
  // Add auth state listener
  function onAuthStateChange(callback) {
    authStateListeners.push(callback);
  }
  
  // Get current user
  function getCurrentUser() {
    return currentUser;
  }
  
  // Check if logged in
  function isLoggedIn() {
    return currentUser !== null;
  }
  
  // Public API
  return {
    init,
    signupWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
    updateRole,
    resetPassword,
    onAuthStateChange,
    getCurrentUser,
    isLoggedIn
  };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  AuthModule.init();
});

// Export to window
window.AuthModule = AuthModule;