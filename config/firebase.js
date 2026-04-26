// Firebase Configuration for DKANAN
// IMPORTANT: Replace with your actual Firebase config from Firebase Console

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "dkanan-app.firebaseapp.com",
  projectId: "dkanan-app",
  storageBucket: "dkanan-app.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.functions();

// Firestore Settings - Enable offline persistence
db.enablePersistence({ experimentalTabSynchronization: true })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not available in this browser');
    }
  });

// Firestore Indexes Configuration
// Add indexes for common queries (configured in Firebase Console)
// artworks: category + createdAt (desc)
// artworks: artistId + createdAt (desc)
// posts: authorId + createdAt (desc)
// orders: buyerId + createdAt (desc)

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Facebook Auth Provider
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Export for use in modules
window.firebaseServices = { 
  auth, 
  db, 
  storage, 
  functions, 
  googleProvider,
  facebookProvider 
};

// Firestore Collection References
window.dbCollections = {
  users: db.collection('users'),
  profiles: db.collection('profiles'),
  artworks: db.collection('artworks'),
  orders: db.collection('orders'),
  commissions: db.collection('commissions'),
  chats: db.collection('chats'),
  communityPosts: db.collection('community_posts'),
  communityComments: db.collection('community_comments'),
  communityGroups: db.collection('community_groups'),
  notifications: db.collection('notifications'),
  libraryResources: db.collection('library_resources')
};

// Firestore Field Values
window.dbFieldValue = firebase.firestore.FieldValue;