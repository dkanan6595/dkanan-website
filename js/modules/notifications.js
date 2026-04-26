// DKANAN - Notification Module
// Real-time alerts for messages, orders, likes, follows, and updates

const NotificationModule = (function() {
  'use strict';
  
  // State
  let notifications = [];
  let unreadCount = 0;
  let unsubscribe = null;
  
  // Initialize
  function init() {
    if (!window.currentUser) return;
    listenToNotifications();
  }
  
  // Listen to notifications
  function listenToNotifications() {
    if (!window.currentUser) return;
    
    const { db } = window.firebaseServices;
    
    // Unsubscribe previous
    if (unsubscribe) unsubscribe();
    
    unsubscribe = db.collection('notifications')
      .where('userId', '==', window.currentUser.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        unreadCount = notifications.filter(n => !n.read).length;
        updateNotificationBadge();
        renderNotifications();
      });
  }
  
  // Create notification
  async function createNotification(userId, data) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('notifications').add({
        userId: userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: data.data || {},
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Mark as read
  async function markAsRead(notificationId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('notifications').doc(notificationId).update({
        read: true
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Mark all as read
  async function markAllAsRead() {
    try {
      const { db } = window.firebaseServices;
      
      const unread = notifications.filter(n => !n.read);
      const batch = db.batch();
      
      unread.forEach(notif => {
        batch.update(db.collection('notifications').doc(notif.id), { read: true });
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Delete notification
  async function deleteNotification(notificationId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('notifications').doc(notificationId).delete();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Clear all notifications
  async function clearAllNotifications() {
    try {
      const { db } = window.firebaseServices;
      
      const batch = db.batch();
      
      notifications.forEach(notif => {
        batch.delete(db.collection('notifications').doc(notif.id));
      });
      
      await batch.commit();
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update badge
  function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }
  
  // Render notifications
  function renderNotifications() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    
    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="no-notifications">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications yet</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = notifications.map(notif => renderNotificationItem(notif)).join('');
  }
  
  // Render notification item
  function renderNotificationItem(notif) {
    const icon = getNotificationIcon(notif.type);
    const time = formatTime(notif.createdAt);
    
    return `
      <div class="notification-item ${notif.read ? '' : 'unread'}" 
           onclick="NotificationModule.handleNotificationClick('${notif.id}', '${notif.type}', ${JSON.stringify(notif.data).replace(/"/g, '&quot;')})">
        <div class="notification-icon" style="background:${icon.color}">
          <i class="${icon.class}"></i>
        </div>
        <div class="notification-content">
          <h4>${notif.title}</h4>
          <p>${notif.body}</p>
          <span class="notification-time">${time}</span>
        </div>
        <button class="notification-delete" onclick="event.stopPropagation();NotificationModule.deleteNotification('${notif.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  }
  
  // Get notification icon
  function getNotificationIcon(type) {
    const icons = {
      message: { class: 'fas fa-envelope', color: '#4ade80' },
      order: { class: 'fas fa-shopping-bag', color: '#f59e0b' },
      like: { class: 'fas fa-heart', color: '#f87171' },
      follow: { class: 'fas fa-user-plus', color: '#60a5fa' },
      comment: { class: 'fas fa-comment', color: '#a78bfa' },
      commission: { class: 'fas fa-paint-brush', color: '#34d399' },
      match: { class: 'fas fa-handshake', color: '#fbbf24' },
      system: { class: 'fas fa-info-circle', color: '#9ca3af' }
    };
    return icons[type] || icons.system;
  }
  
  // Handle notification click
  async function handleNotificationClick(notificationId, type, data) {
    // Mark as read
    await markAsRead(notificationId);
    
    // Navigate based on type
    switch (type) {
      case 'message':
        if (data.chatId) {
          ChatModule.showChatUI(data.chatId);
        }
        break;
      case 'order':
        if (data.orderId) {
          showSection('orders');
          // Load order details
        }
        break;
      case 'like':
      case 'comment':
        if (data.postId) {
          showSection('community');
          // Highlight or scroll to post
        }
        break;
      case 'follow':
        if (data.userId) {
          showSection('profile');
          loadArtistProfile(data.userId);
        }
        break;
      case 'commission':
        if (data.commissionId) {
          showSection('commissions');
        }
        break;
    }
  }
  
  // Show notification dropdown
  function showNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  // Format time
  function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  }
  
  // Public API
  return {
    init,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    handleNotificationClick,
    showNotificationDropdown
  };
})();

window.NotificationModule = NotificationModule;