// DKANAN - Chat Module
// 1-to-1 messaging, group chat, and community channels

const ChatModule = (function() {
  'use strict';
  
  // State
  let activeChat = null;
  let messageUnsubscribe = null;
  let chatListUnsubscribe = null;
  
  // Initialize chat listeners
  function init() {
    if (!window.currentUser) return;
    
    // Listen for user's chats
    listenToChats();
  }
  
  // Listen to user's chat list
  function listenToChats() {
    if (!window.currentUser) return;
    
    const { db } = window.firebaseServices;
    
    // Unsubscribe previous
    if (chatListUnsubscribe) chatListUnsubscribe();
    
    chatListUnsubscribe = db.collection('chats')
      .where('participants', 'array-contains', window.currentUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot(snapshot => {
        const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChatList(chats);
        updateUnreadCount(chats);
      });
  }
  
  // Open/create chat with user
  async function openChat(userId) {
    if (!window.currentUser) {
      openAuthModal('login');
      return;
    }
    
    if (userId === window.currentUser.uid) {
      showNotification("You can't chat with yourself", 'error');
      return;
    }
    
    try {
      const { db } = window.firebaseServices;
      
      // Check if chat exists
      const snapshot = await db.collection('chats')
        .where('participants', '==', [window.currentUser.uid, userId].sort())
        .get();
      
      let chatId;
      
      if (!snapshot.empty) {
        chatId = snapshot.docs[0].id;
      } else {
        // Create new chat
        const otherUser = await ProfileModule.getUserData(userId);
        const newChat = {
          participants: [window.currentUser.uid, userId],
          type: 'direct',
          name: otherUser?.displayName || 'User',
          avatar: otherUser?.photoURL || 'assets/default-avatar.png',
          createdBy: window.currentUser.uid,
          lastMessage: '',
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection('chats').add(newChat);
        chatId = docRef.id;
      }
      
      // Open chat UI
      showChatUI(chatId);
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  }
  
  // Create group chat
  async function createGroupChat(name, participantIds) {
    if (!window.currentUser) return;
    
    try {
      const { db } = window.firebaseServices;
      
      const groupChat = {
        participants: [window.currentUser.uid, ...participantIds],
        type: 'group',
        name: name,
        avatar: 'assets/group-default.png',
        createdBy: window.currentUser.uid,
        adminIds: [window.currentUser.uid],
        lastMessage: '',
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('chats').add(groupChat);
      showChatUI(docRef.id);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create community channel
  async function createChannel(name, description, isPrivate = false) {
    if (!window.currentUser) return;
    
    try {
      const { db } = window.firebaseServices;
      
      const channel = {
        participants: [window.currentUser.uid],
        type: 'channel',
        name: name,
        description: description,
        avatar: 'assets/channel-default.png',
        createdBy: window.currentUser.uid,
        isPrivate: isPrivate,
        lastMessage: '',
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('chats').add(channel);
      showChatUI(docRef.id);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating channel:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Show chat UI
  async function showChatUI(chatId) {
    // Load chat data
    const { db } = window.firebaseServices;
    const chatDoc = await db.collection('chats').doc(chatId).get();
    
    if (!chatDoc.exists) return;
    
    activeChat = { id: chatId, ...chatDoc.data() };
    
    // Show chat container
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.style.display = 'flex';
    }
    
    // Load messages
    loadMessages(chatId);
    
    // Update chat header
    renderChatHeader(activeChat);
  }
  
  // Load messages
  function loadMessages(chatId) {
    const { db } = window.firebaseServices;
    
    // Unsubscribe previous
    if (messageUnsubscribe) messageUnsubscribe();
    
    messageUnsubscribe = db.collection('chats').doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snapshot => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMessages(messages);
        scrollToBottom();
      });
  }
  
  // Send message
  async function sendMessage(chatId, content, type = 'text') {
    if (!window.currentUser || !content.trim()) return;
    
    try {
      const { db } = window.firebaseServices;
      
      const message = {
        senderId: window.currentUser.uid,
        senderName: window.currentUser.displayName,
        senderPhoto: window.currentUser.photoURL,
        content: content.trim(),
        type: type,
        readBy: [window.currentUser.uid],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('chats').doc(chatId)
        .collection('messages').add(message);
      
      // Update chat last message
      await db.collection('chats').doc(chatId).update({
        lastMessage: content.trim().substring(0, 100),
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Send notifications to other participants
      await sendMessageNotifications(chatId, content);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
  
  // Send image message
  async function sendImageMessage(chatId, imageFile) {
    try {
      const { storage } = window.firebaseServices;
      
      const storageRef = storage.ref(`chats/${chatId}/${Date.now()}-${imageFile.name}`);
      const snapshot = await storageRef.put(imageFile);
      const imageUrl = await snapshot.ref.getDownloadURL();
      
      await sendMessage(chatId, imageUrl, 'image');
      
      return { success: true, url: imageUrl };
    } catch (error) {
      console.error('Error sending image:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Send notifications
  async function sendMessageNotifications(chatId, message) {
    const chat = activeChat;
    if (!chat) return;
    
    const { db } = window.firebaseServices;
    
    // Get other participants
    const otherParticipants = chat.participants.filter(
      p => p !== window.currentUser?.uid
    );
    
    for (const userId of otherParticipants) {
      await db.collection('notifications').add({
        userId: userId,
        type: 'message',
        title: chat.type === 'direct' ? 'New Message' : `New message in ${chat.name}`,
        body: message.substring(0, 100),
        data: { chatId, senderId: window.currentUser.uid },
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
  
  // Mark messages as read
  async function markAsRead(chatId) {
    if (!window.currentUser) return;
    
    try {
      const { db } = window.firebaseServices;
      
      // Get unread messages
      const snapshot = await db.collection('chats').doc(chatId)
        .collection('messages')
        .where('readBy', 'array-contains', '!=', window.currentUser.uid)
        .get();
      
      // Mark each as read
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          readBy: firebase.firestore.FieldValue.arrayUnion(window.currentUser.uid)
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }
  
  // Add participant to group
  async function addParticipant(chatId, userId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('chats').doc(chatId).update({
        participants: firebase.firestore.FieldValue.arrayUnion(userId)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding participant:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Remove participant from group
  async function removeParticipant(chatId, userId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('chats').doc(chatId).update({
        participants: firebase.firestore.FieldValue.arrayRemove(userId)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing participant:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Leave chat
  async function leaveChat(chatId) {
    if (!window.currentUser) return;
    
    return await removeParticipant(chatId, window.currentUser.uid);
  }
  
  // Get chat list
  async function getChatList() {
    if (!window.currentUser) return [];
    
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('chats')
        .where('participants', 'array-contains', window.currentUser.uid)
        .orderBy('lastMessageAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting chat list:', error);
      return [];
    }
  }
  
  // Get or create channel
  async function getChannel(channelId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('chats').doc(channelId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error('Error getting channel:', error);
      return null;
    }
  }
  
  // Get all channels
  async function getChannels() {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('chats')
        .where('type', '==', 'channel')
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting channels:', error);
      return [];
    }
  }
  
  // Render chat list
  function renderChatList(chats) {
    const container = document.getElementById('chatList');
    if (!container) return;
    
    container.innerHTML = chats.map(chat => renderChatListItem(chat)).join('');
  }
  
  // Render chat list item
  function renderChatListItem(chat) {
    const isActive = activeChat?.id === chat.id;
    const otherParticipants = chat.participants.filter(
      p => p !== window.currentUser?.uid
    );
    
    let title = chat.name;
    let avatar = chat.avatar;
    
    if (chat.type === 'direct' && otherParticipants.length > 0) {
      // Get other user's name (would need to fetch)
      title = 'Chat';
    }
    
    return `
      <div class="chat-list-item ${isActive ? 'active' : ''}" 
           onclick="ChatModule.showChatUI('${chat.id}')">
        <img src="${avatar || 'assets/default-avatar.png'}" class="chat-avatar" alt="${title}">
        <div class="chat-info">
          <h4>${title}</h4>
          <p class="last-message">${chat.lastMessage || 'No messages yet'}</p>
        </div>
        <span class="chat-time">${formatTime(chat.lastMessageAt)}</span>
      </div>
    `;
  }
  
  // Render messages
  function renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    container.innerHTML = messages.map(msg => renderMessage(msg)).join('');
  }
  
  // Render single message
  function renderMessage(message) {
    const isOwn = message.senderId === window.currentUser?.uid;
    const isImage = message.type === 'image';
    
    return `
      <div class="message ${isOwn ? 'own' : 'other'}">
        ${!isOwn ? `<img src="${message.senderPhoto || 'assets/default-avatar.png'}" class="message-avatar">` : ''}
        <div class="message-content">
          ${!isOwn ? `<span class="message-sender">${message.senderName}</span>` : ''}
          ${isImage ? 
            `<img src="${message.content}" class="message-image" onclick="window.open(this.src)">` : 
            `<p>${message.content}</p>`
          }
          <span class="message-time">${formatTime(message.createdAt)}</span>
        </div>
      </div>
    `;
  }
  
  // Render chat header
  function renderChatHeader(chat) {
    const header = document.getElementById('chatHeader');
    if (!header) return;
    
    header.innerHTML = `
      <div class="chat-header-info">
        <img src="${chat.avatar || 'assets/default-avatar.png'}" class="chat-avatar">
        <div>
          <h3>${chat.name}</h3>
          <span class="chat-type">${chat.type}</span>
        </div>
      </div>
      <div class="chat-header-actions">
        <button onclick="ChatModule.showChatInfo('${chat.id}')"><i class="fas fa-info-circle"></i></button>
        <button onclick="ChatModule.closeChat()"><i class="fas fa-times"></i></button>
      </div>
    `;
  }
  
  // Update unread count
  function updateUnreadCount(chats) {
    const badge = document.getElementById('chatUnreadBadge');
    if (!badge) return;
    
    let total = 0;
    // Calculate based on unread messages
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }
  
  // Scroll to bottom
  function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  // Close chat
  function closeChat() {
    if (messageUnsubscribe) {
      messageUnsubscribe();
      messageUnsubscribe = null;
    }
    activeChat = null;
    
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.style.display = 'none';
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
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString();
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
    init,
    openChat,
    createGroupChat,
    createChannel,
    showChatUI,
    sendMessage,
    sendImageMessage,
    markAsRead,
    addParticipant,
    removeParticipant,
    leaveChat,
    getChatList,
    getChannel,
    getChannels,
    closeChat
  };
})();

window.ChatModule = ChatModule;