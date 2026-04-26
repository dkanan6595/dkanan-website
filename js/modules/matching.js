// DKANAN - Matching Module
// Profile-based matching, auto-suggestions, and privacy controls

const MatchingModule = (function() {
  'use strict';
  
  // State
  let suggestions = [];
  let matches = [];
  
  // Get matching score between two profiles
  function calculateMatchScore(profile1, profile2) {
    let score = 0;
    let factors = 0;
    
    // Category match (30%)
    if (profile1.category && profile2.category && profile1.category === profile2.category) {
      score += 30;
    }
    factors += 30;
    
    // Skills overlap (25%)
    const skills1 = profile1.skills || [];
    const skills2 = profile2.skills || [];
    const skillOverlap = skills1.filter(s => skills2.includes(s)).length;
    const maxSkills = Math.max(skills1.length, skills2.length);
    if (maxSkills > 0) {
      score += (skillOverlap / maxSkills) * 25;
    }
    factors += 25;
    
    // Location proximity (20%)
    if (profile1.location?.country && profile2.location?.country) {
      if (profile1.location.country === profile2.location.country) {
        score += 10;
        if (profile1.location.state === profile2.location.state) {
          score += 7;
          if (profile1.location.district === profile2.location.district) {
            score += 3;
          }
        }
      }
    }
    factors += 20;
    
    // Interests overlap (15%)
    const interests1 = profile1.interests || [];
    const interests2 = profile2.interests || [];
    const interestOverlap = interests1.filter(i => interests2.includes(i)).length;
    const maxInterests = Math.max(interests1.length, interests2.length);
    if (maxInterests > 0) {
      score += (interestOverlap / maxInterests) * 15;
    }
    factors += 15;
    
    // Experience level match (10%)
    if (profile1.skillLevel && profile2.skillLevel) {
      const levels = ['beginner', 'intermediate', 'advanced', 'professional', 'master'];
      const levelDiff = Math.abs(levels.indexOf(profile1.skillLevel) - levels.indexOf(profile2.skillLevel));
      if (levelDiff <= 1) {
        score += 10;
      } else if (levelDiff === 2) {
        score += 5;
      }
    }
    factors += 10;
    
    return Math.round(score);
  }
  
  // Get match suggestions for user
  async function getSuggestions(userId, limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      // Get current user's profile
      const currentProfile = await db.collection('profiles').doc(userId).get();
      if (!currentProfile.exists) return [];
      
      const currentData = currentProfile.data();
      
      // Check if matching is enabled
      if (!currentData.isMatchingEnabled) return [];
      
      // Get profiles with matching enabled
      const snapshot = await db.collection('profiles')
        .where('isMatchingEnabled', '==', true)
        .limit(100)
        .get();
      
      let results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.userId !== userId); // Exclude self
      
      // Calculate scores
      results = await Promise.all(
        results.map(async(profile) => {
          const user = await getUserData(profile.userId);
          const score = calculateMatchScore(currentData, profile);
          return { ...profile, ...user, matchScore: score };
        })
      );
      
      // Sort by score
      results.sort((a, b) => b.matchScore - a.matchScore);
      
      suggestions = results.slice(0, limit);
      return suggestions;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }
  
  // Get user data
  async function getUserData(userId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('users').doc(userId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      return null;
    }
  }
  
  // Toggle matching enabled
  async function toggleMatching(userId, enabled) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('profiles').doc(userId).update({
        isMatchingEnabled: enabled,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showNotification(enabled ? 'Matching enabled' : 'Matching disabled', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error toggling matching:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Set privacy settings
  async function setPrivacySettings(userId, settings) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('profiles').doc(userId).update({
        privacySettings: settings,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showNotification('Privacy settings updated', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error setting privacy:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get privacy settings
  async function getPrivacySettings(userId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('profiles').doc(userId).get();
      return doc.exists ? doc.data().privacySettings || {} : {};
    } catch (error) {
      return {};
    }
  }
  
  // Connect with artist (send match request)
  async function connectWithArtist(userId, targetUserId) {
    try {
      const { db } = window.firebaseServices;
      
      // Create connection request
      await db.collection('matching_requests').add({
        fromUserId: userId,
        toUserId: targetUserId,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Notify target user
      await NotificationModule.createNotification(targetUserId, {
        type: 'match',
        title: 'New Connection Request',
        body: 'Someone wants to connect with you',
        data: { fromUserId: userId }
      });
      
      showNotification('Connection request sent!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error connecting:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Accept connection
  async function acceptConnection(connectionId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('matching_requests').doc(connectionId).update({
        status: 'accepted',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      showNotification('Connection accepted!', 'success');
      return { success: true };
    } catch (error) {
      console.error('Error accepting connection:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get connections
  async function getConnections(userId) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('matching_requests')
        .where('toUserId', '==', userId)
        .where('status', '==', 'accepted')
        .get();
      
      const connections = await Promise.all(
        snapshot.docs.map(async(doc) => {
          const data = doc.data();
          const user = await getUserData(data.fromUserId);
          return { id: doc.id, ...data, user };
        })
      );
      
      return connections;
    } catch (error) {
      console.error('Error getting connections:', error);
      return [];
    }
  }
  
  // Get pending requests
  async function getPendingRequests(userId) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('matching_requests')
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();
      
      const requests = await Promise.all(
        snapshot.docs.map(async(doc) => {
          const data = doc.data();
          const user = await getUserData(data.fromUserId);
          return { id: doc.id, ...data, user };
        })
      );
      
      return requests;
    } catch (error) {
      console.error('Error getting pending requests:', error);
      return [];
    }
  }
  
  // Render suggestions
  function renderSuggestions(suggestionsList) {
    const container = document.getElementById('matchingSuggestions');
    if (!container) return;
    
    if (suggestionsList.length === 0) {
      container.innerHTML = `
        <div class="no-suggestions">
          <i class="fas fa-users-slash"></i>
          <h3>No suggestions yet</h3>
          <p>Enable matching in your profile settings to get suggestions</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = suggestionsList.map(artist => renderSuggestionCard(artist)).join('');
  }
  
  // Render suggestion card
  function renderSuggestionCard(artist) {
    const score = artist.matchScore || 0;
    let matchLabel = 'Low Match';
    let matchClass = 'low';
    
    if (score >= 70) {
      matchLabel = 'Great Match!';
      matchClass = 'high';
    } else if (score >= 50) {
      matchLabel = 'Good Match';
      matchClass = 'medium';
    }
    
    return `
      <div class="matching-card">
        <div class="match-score ${matchClass}">
          <span class="score-value">${score}%</span>
          <span class="score-label">${matchLabel}</span>
        </div>
        <img src="${artist.photoURL || 'assets/default-avatar.png'}" class="match-avatar">
        <h4>${artist.displayName || 'Unknown'}</h4>
        <p class="match-category">${artist.category || 'Artist'}</p>
        <p class="match-location">
          <i class="fas fa-map-marker-alt"></i>
          ${artist.location?.city || ''}, ${artist.location?.country || ''}
        </p>
        <div class="match-skills">
          ${(artist.skills || []).slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
        <div class="match-actions">
          <button class="btn-primary" onclick="MatchingModule.connectWithArtist('${window.currentUser?.uid}', '${artist.userId}')">
            <i class="fas fa-user-plus"></i> Connect
          </button>
          <button class="btn-secondary" onclick="ProfileModule.followUser('${window.currentUser?.uid}', '${artist.userId}')">
            <i class="fas fa-heart"></i> Follow
          </button>
        </div>
      </div>
    `;
  }
  
  // Show notification
  function showNotification(message, type = 'info') {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      alert(message);
    }
  }
  
  // Public API
  return {
    calculateMatchScore,
    getSuggestions,
    toggleMatching,
    setPrivacySettings,
    getPrivacySettings,
    connectWithArtist,
    acceptConnection,
    getConnections,
    getPendingRequests,
    renderSuggestions,
    renderSuggestionCard
  };
})();

window.MatchingModule = MatchingModule;