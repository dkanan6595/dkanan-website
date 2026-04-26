// DKANAN - User Profile Module
// LinkedIn-style portfolio and profile management

const ProfileModule = (function() {
  'use strict';
  
  // State
  let currentProfile = null;
  let profileListeners = [];
  
  // Get profile by user ID
  async function getProfile(userId) {
    try {
      const { db } = window.firebaseServices;
      const profileDoc = await db.collection('profiles').doc(userId).get();
      
      if (profileDoc.exists) {
        return { id: profileDoc.id, ...profileDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }
  
  // Update profile
  async function updateProfile(userId, data) {
    try {
      const { db } = window.firebaseServices;
      
      const updateData = {
        ...data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('profiles').doc(userId).update(updateData);
      
      // Also update main users collection
      if (data.displayName || data.photoURL) {
        const userUpdate = {};
        if (data.displayName) userUpdate.displayName = data.displayName;
        if (data.photoURL) userUpdate.photoURL = data.photoURL;
        userUpdate.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('users').doc(userId).update(userUpdate);
      }
      
      showNotification('Profile updated!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update profile', 'error');
      return { success: false, error: error.message };
    }
  }
  
  // Upload profile image
  async function uploadProfileImage(file, userId) {
    try {
      const { storage } = window.firebaseServices;
      
      const storageRef = storage.ref(`profiles/${userId}/avatar-${Date.now()}`);
      const snapshot = await storageRef.put(file);
      const downloadURL = await snapshot.ref.getDownloadURL();
      
      // Update profile
      await updateProfile(userId, { photoURL: downloadURL });
      
      return { success: true, url: downloadURL };
    } catch (error) {
      console.error('Error uploading image:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Add artwork to portfolio
  async function addToPortfolio(userId, artworkData) {
    try {
      const { db } = window.firebaseServices;
      
      const portfolioItem = {
        userId: userId,
        ...artworkData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('profiles').doc(userId)
        .collection('portfolio').add(portfolioItem);
      
      // Update stats
      await updateStats(userId, 'artworks', 1);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding to portfolio:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Remove from portfolio
  async function removeFromPortfolio(userId, portfolioId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('profiles').doc(userId)
        .collection('portfolio').doc(portfolioId).delete();
      
      // Update stats
      await updateStats(userId, 'artworks', -1);
      
      return { success: true };
    } catch (error) {
      console.error('Error removing from portfolio:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get portfolio
  async function getPortfolio(userId) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('profiles').doc(userId)
        .collection('portfolio').orderBy('createdAt', 'desc').get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting portfolio:', error);
      return [];
    }
  }
  
  // Follow user
  async function followUser(followerId, followingId) {
    try {
      const { db } = window.firebaseServices;
      
      // Add follow
      await db.collection('user_follows').add({
        followerId: followerId,
        followingId: followingId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update follower stats
      await updateStats(followingId, 'followers', 1);
      await updateStats(followerId, 'following', 1);
      
      // Create notification
      await createNotification(followingId, {
        type: 'follow',
        title: 'New Follower',
        body: 'Someone started following you',
        data: { followerId }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error following user:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Unfollow user
  async function unfollowUser(followerId, followingId) {
    try {
      const { db } = window.firebaseServices;
      
      // Find and delete follow
      const snapshot = await db.collection('user_follows')
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .get();
      
      snapshot.forEach(doc => doc.ref.delete());
      
      // Update stats
      await updateStats(followingId, 'followers', -1);
      await updateStats(followerId, 'following', -1);
      
      return { success: true };
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Check if following
  async function isFollowing(followerId, followingId) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('user_follows')
        .where('followerId', '==', followerId)
        .where('followingId', '==', followingId)
        .get();
      
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }
  
  // Get followers
  async function getFollowers(userId, limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('user_follows')
        .where('followingId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      const followerIds = snapshot.docs.map(doc => doc.data().followerId);
      
      // Get user data
      const users = await Promise.all(
        followerIds.map(id => getUserData(id))
      );
      
      return users.filter(u => u !== null);
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }
  
  // Get following
  async function getFollowing(userId, limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('user_follows')
        .where('followerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      const followingIds = snapshot.docs.map(doc => doc.data().followingId);
      
      const users = await Promise.all(
        followingIds.map(id => getUserData(id))
      );
      
      return users.filter(u => u !== null);
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }
  
  // Get user data
  async function getUserData(userId) {
    try {
      const { db } = window.firebaseServices;
      
      const userDoc = await db.collection('users').doc(userId).get();
      const profileDoc = await db.collection('profiles').doc(userId).get();
      
      if (userDoc.exists) {
        return {
          uid: userDoc.id,
          ...userDoc.data(),
          ...(profileDoc.exists ? profileDoc.data() : {})
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }
  
  // Update stats
  async function updateStats(userId, stat, delta) {
    try {
      const { db } = window.firebaseServices;
      
      const profileRef = db.collection('profiles').doc(userId);
      await profileRef.update({
        [`stats.${stat}`]: firebase.firestore.FieldValue.increment(delta)
      });
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }
  
  // Create notification
  async function createNotification(userId, data) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('notifications').add({
        userId: userId,
        ...data,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
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
  
  // Render profile card
  function renderProfileCard(user, showActions = true) {
    const currentUser = window.currentUser;
    const isOwn = currentUser && currentUser.uid === user.uid;
    
    return `
      <div class="profile-card">
        <div class="profile-cover">
          <img src="${user.coverImage || 'assets/cover-default.jpg'}" alt="Cover">
        </div>
        <div class="profile-avatar">
          <img src="${user.photoURL || 'assets/default-avatar.png'}" alt="${user.displayName}">
          ${user.isVerified ? '<span class="verified-badge"><i class="fas fa-check"></i></span>' : ''}
        </div>
        <div class="profile-info">
          <h3>${user.displayName || 'Unknown'}</h3>
          <p class="profile-role">${user.role || 'Artist'}</p>
          <p class="profile-location">
            <i class="fas fa-map-marker-alt"></i>
            ${user.location?.city || ''}, ${user.location?.country || ''}
          </p>
          <p class="profile-bio">${user.bio || 'No bio yet'}</p>
          
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-value">${user.stats?.followers || 0}</span>
              <span class="stat-label">Followers</span>
            </div>
            <div class="stat">
              <span class="stat-value">${user.stats?.following || 0}</span>
              <span class="stat-label">Following</span>
            </div>
            <div class="stat">
              <span class="stat-value">${user.stats?.artworks || 0}</span>
              <span class="stat-label">Artworks</span>
            </div>
          </div>
          
          ${showActions && !isOwn ? `
            <div class="profile-actions">
              <button class="btn-primary" onclick="ProfileModule.followUser('${currentUser?.uid}', '${user.uid}')">
                <i class="fas fa-user-plus"></i> Follow
              </button>
              <button class="btn-secondary" onclick="ChatModule.openChat('${user.uid}')">
                <i class="fas fa-envelope"></i> Message
              </button>
            </div>
          ` : ''}
          
          ${isOwn ? `
            <div class="profile-actions">
              <button class="btn-secondary" onclick="showSection('edit-profile')">
                <i class="fas fa-edit"></i> Edit Profile
              </button>
            </div>
          ` : ''}
        </div>
        
        ${user.skills?.length ? `
          <div class="profile-skills">
            <h4>Skills</h4>
            <div class="skills-list">
              ${user.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        ${user.category ? `
          <div class="profile-category">
            <span class="category-badge">${user.category}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Public API
  return {
    getProfile,
    updateProfile,
    uploadProfileImage,
    addToPortfolio,
    removeFromPortfolio,
    getPortfolio,
    followUser,
    unfollowUser,
    isFollowing,
    getFollowers,
    getFollowing,
    getUserData,
    renderProfileCard
  };
})();

window.ProfileModule = ProfileModule;