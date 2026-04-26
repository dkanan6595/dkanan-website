// DKANAN - Community Module
// Posts, comments, likes, and topic-based groups (Reddit-style)

const CommunityModule = (function() {
  'use strict';
  
  // State
  let currentGroup = null;
  let postsUnsubscribe = null;
  
  // Initialize
  function init() {
    loadGroups();
  }
  
  // Create post
  async function createPost(authorId, data) {
    try {
      const { db } = window.firebaseServices;
      
      const post = {
        authorId: authorId,
        content: data.content,
        images: data.images || [],
        groupId: data.groupId || null,
        topic: data.topic || 'general',
        likes: 0,
        commentsCount: 0,
        isPinned: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('community_posts').add(post);
      
      // Update group post count
      if (data.groupId) {
        await db.collection('community_groups').doc(data.groupId).update({
          postsCount: firebase.firestore.FieldValue.increment(1)
        });
      }
      
      showNotification('Post created!', 'success');
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Upload post images
  async function uploadPostImages(authorId, files) {
    try {
      const { storage } = window.firebaseServices;
      
      const imageUrls = await Promise.all(
        Array.from(files).map(async(file) => {
          const storageRef = storage.ref(`posts/${authorId}/${Date.now()}-${file.name}`);
          const snapshot = await storageRef.put(file);
          return snapshot.ref.getDownloadURL();
        })
      );
      
      return { success: true, urls: imageUrls };
    } catch (error) {
      console.error('Error uploading images:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get posts with filters
  async function getPosts(filters = {}, limit = 20, startAfter = null) {
    try {
      const { db } = window.firebaseServices;
      
      let query = db.collection('community_posts').orderBy('createdAt', 'desc').limit(limit);
      
      if (filters.groupId) {
        query = query.where('groupId', '==', filters.groupId);
      }
      
      if (filters.topic) {
        query = query.where('topic', '==', filters.topic);
      }
      
      if (filters.authorId) {
        query = query.where('authorId', '==', filters.authorId);
      }
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load author data for each post
      const postsWithAuthors = await Promise.all(
        posts.map(async(post) => {
          const author = await ProfileModule.getUserData(post.authorId);
          return { ...post, author };
        })
      );
      
      return postsWithAuthors;
    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }
  
  // Get single post
  async function getPost(postId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('community_posts').doc(postId).get();
      
      if (doc.exists) {
        const post = { id: doc.id, ...doc.data() };
        post.author = await ProfileModule.getUserData(post.authorId);
        return post;
      }
      return null;
    } catch (error) {
      console.error('Error getting post:', error);
      return null;
    }
  }
  
  // Delete post
  async function deletePost(postId) {
    try {
      const { db } = window.firebaseServices;
      
      const postDoc = await db.collection('community_posts').doc(postId).get();
      const postData = postDoc.data();
      
      await db.collection('community_posts').doc(postId).delete();
      
      // Update group count
      if (postData.groupId) {
        await db.collection('community_groups').doc(postData.groupId).update({
          postsCount: firebase.firestore.FieldValue.increment(-1)
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting post:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Like post
  async function likePost(userId, postId) {
    try {
      const { db } = window.firebaseServices;
      
      // Check if already liked
      const existing = await db.collection('user_likes')
        .where('userId', '==', userId)
        .where('targetId', '==', postId)
        .where('targetType', '==', 'post')
        .get();
      
      if (!existing.empty) {
        // Unlike
        existing.forEach(doc => doc.ref.delete());
        await db.collection('community_posts').doc(postId).update({
          likes: firebase.firestore.FieldValue.increment(-1)
        });
        return { success: true, liked: false };
      }
      
      // Like
      await db.collection('user_likes').add({
        userId: userId,
        targetId: postId,
        targetType: 'post',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('community_posts').doc(postId).update({
        likes: firebase.firestore.FieldValue.increment(1)
      });
      
      // Notify author
      const postDoc = await db.collection('community_posts').doc(postId).get();
      const postData = postDoc.data();
      
      if (postData.authorId !== userId) {
        await NotificationModule.createNotification(postData.authorId, {
          type: 'like',
          title: 'New Like',
          body: 'Someone liked your post',
          data: { postId }
        });
      }
      
      return { success: true, liked: true };
    } catch (error) {
      console.error('Error liking post:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Add comment
  async function addComment(postId, authorId, content) {
    try {
      const { db } = window.firebaseServices;
      
      const comment = {
        postId: postId,
        authorId: authorId,
        content: content,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('community_comments').add(comment);
      
      // Update post comment count
      await db.collection('community_posts').doc(postId).update({
        commentsCount: firebase.firestore.FieldValue.increment(1)
      });
      
      // Notify post author
      const postDoc = await db.collection('community_posts').doc(postId).get();
      const postData = postDoc.data();
      
      if (postData.authorId !== authorId) {
        await NotificationModule.createNotification(postData.authorId, {
          type: 'comment',
          title: 'New Comment',
          body: 'Someone commented on your post',
          data: { postId, commentId: docRef.id }
        });
      }
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get comments
  async function getComments(postId, limit = 50) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('community_comments')
        .where('postId', '==', postId)
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .get();
      
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load author data
      const commentsWithAuthors = await Promise.all(
        comments.map(async(comment) => {
          const author = await ProfileModule.getUserData(comment.authorId);
          return { ...comment, author };
        })
      );
      
      return commentsWithAuthors;
    } catch (error) {
      console.error('Error getting comments:', error);
      return [];
    }
  }
  
  // Delete comment
  async function deleteComment(commentId, postId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('community_comments').doc(commentId).delete();
      
      await db.collection('community_posts').doc(postId).update({
        commentsCount: firebase.firestore.FieldValue.increment(-1)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create group
  async function createGroup(creatorId, data) {
    try {
      const { db } = window.firebaseServices;
      
      const group = {
        name: data.name,
        description: data.description,
        coverImage: data.coverImage || '',
        topic: data.topic || 'general',
        members: [creatorId],
        adminIds: [creatorId],
        postsCount: 0,
        isPrivate: data.isPrivate || false,
        createdBy: creatorId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('community_groups').add(group);
      
      showNotification('Group created!', 'success');
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get groups
  async function getGroups(filters = {}, limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      let query = db.collection('community_groups').orderBy('postsCount', 'desc').limit(limit);
      
      if (filters.topic) {
        query = query.where('topic', '==', filters.topic);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting groups:', error);
      return [];
    }
  }
  
  // Get single group
  async function getGroup(groupId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('community_groups').doc(groupId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  }
  
  // Join group
  async function joinGroup(userId, groupId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('community_groups').doc(groupId).update({
        members: firebase.firestore.FieldValue.arrayUnion(userId)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error joining group:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Leave group
  async function leaveGroup(userId, groupId) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('community_groups').doc(groupId).update({
        members: firebase.firestore.FieldValue.arrayRemove(userId)
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error leaving group:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Load groups
  async function loadGroups() {
    const groups = await getGroups();
    renderGroups(groups);
    return groups;
  }
  
  // Render groups
  function renderGroups(groups) {
    const container = document.getElementById('communityGroups');
    if (!container) return;
    
    container.innerHTML = groups.map(group => `
      <div class="community-group-card" onclick="CommunityModule.showGroup('${group.id}')">
        <img src="${group.coverImage || 'assets/group-cover.jpg'}" class="group-cover">
        <div class="group-info">
          <h4>${group.name}</h4>
          <p>${group.description || ''}</p>
          <span class="group-members"><i class="fas fa-users"></i> ${group.members?.length || 0} members</span>
        </div>
      </div>
    `).join('');
  }
  
  // Show group
  async function showGroup(groupId) {
    currentGroup = await getGroup(groupId);
    if (!currentGroup) return;
    
    // Load posts for this group
    const posts = await getPosts({ groupId: groupId });
    renderGroupPosts(posts);
    
    // Show group section
    showSection('community');
  }
  
  // Render group posts
  function renderGroupPosts(posts) {
    const container = document.getElementById('communityPosts');
    if (!container) return;
    
    container.innerHTML = posts.map(post => renderPostCard(post)).join('');
  }
  
  // Render post card
  function renderPostCard(post) {
    const currentUser = window.currentUser;
    const isOwner = currentUser?.uid === post.authorId;
    
    return `
      <div class="community-post-card" data-id="${post.id}">
        <div class="post-header">
          <img src="${post.author?.photoURL || 'assets/default-avatar.png'}" class="post-avatar">
          <div class="post-meta">
            <h4>${post.author?.displayName || 'Unknown'}</h4>
            <span class="post-time">${formatTime(post.createdAt)}</span>
            ${post.topic ? `<span class="post-topic">${post.topic}</span>` : ''}
          </div>
          ${isOwner ? `
            <div class="post-actions">
              <button onclick="CommunityModule.deletePost('${post.id}')"><i class="fas fa-trash"></i></button>
            </div>
          ` : ''}
        </div>
        
        <div class="post-content">
          <p>${post.content}</p>
          ${post.images?.length ? `
            <div class="post-images">
              ${post.images.map(img => `<img src="${img}" onclick="window.open(this.src)">`).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="post-footer">
          <button class="post-action" onclick="CommunityModule.togglePostLike('${post.id}')">
            <i class="fas fa-heart"></i> ${post.likes || 0}
          </button>
          <button class="post-action" onclick="CommunityModule.showComments('${post.id}')">
            <i class="fas fa-comment"></i> ${post.commentsCount || 0}
          </button>
          <button class="post-action" onclick="SocialModule.sharePost('${post.id}', '${post.content?.substring(0, 50)}')">
            <i class="fas fa-share"></i> Share
          </button>
        </div>
        
        <div class="post-comments" id="comments-${post.id}" style="display:none;">
          <div class="comments-list"></div>
          <div class="comment-input">
            <input type="text" placeholder="Write a comment..." 
                   onkeypress="if(event.key==='Enter')CommunityModule.submitComment('${post.id}', this.value)">
          </div>
        </div>
      </div>
    `;
  }
  
  // Toggle post like
  async function togglePostLike(postId) {
    if (!window.currentUser) {
      openAuthModal('login');
      return;
    }
    
    const result = await likePost(window.currentUser.uid, postId);
    if (result.success) {
      // Update UI
      const btn = document.querySelector(`[data-id="${postId}"] .post-action i.fa-heart`);
      if (btn) {
        const count = parseInt(btn.nextTextContent) || 0;
        btn.nextTextContent = ` ${result.liked ? count + 1 : count - 1}`;
      }
    }
  }
  
  // Show comments
  async function showComments(postId) {
    const container = document.getElementById(`comments-${postId}`);
    if (!container) return;
    
    if (container.style.display === 'none') {
      container.style.display = 'block';
      const comments = await getComments(postId);
      renderComments(postId, comments);
    } else {
      container.style.display = 'none';
    }
  }
  
  // Render comments
  function renderComments(postId, comments) {
    const container = document.querySelector(`#comments-${postId} .comments-list`);
    if (!container) return;
    
    container.innerHTML = comments.map(comment => `
      <div class="comment-item">
        <img src="${comment.author?.photoURL || 'assets/default-avatar.png'}" class="comment-avatar">
        <div class="comment-content">
          <span class="comment-author">${comment.author?.displayName || 'Unknown'}</span>
          <p>${comment.content}</p>
          <span class="comment-time">${formatTime(comment.createdAt)}</span>
        </div>
      </div>
    `).join('');
  }
  
  // Submit comment
  async function submitComment(postId, content) {
    if (!window.currentUser) {
      openAuthModal('login');
      return;
    }
    
    if (!content.trim()) return;
    
    const result = await addComment(postId, window.currentUser.uid, content);
    if (result.success) {
      // Refresh comments
      const comments = await getComments(postId);
      renderComments(postId, comments);
      
      // Update count
      const countEl = document.querySelector(`[data-id="${postId}"] .fa-comment`);
      if (countEl) {
        const count = parseInt(countEl.nextTextContent) || 0;
        countEl.nextTextContent = ` ${count + 1}`;
      }
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
    createPost,
    uploadPostImages,
    getPosts,
    getPost,
    deletePost,
    likePost,
    addComment,
    getComments,
    deleteComment,
    createGroup,
    getGroups,
    getGroup,
    joinGroup,
    leaveGroup,
    loadGroups,
    togglePostLike,
    showComments,
    submitComment
  };
})();

window.CommunityModule = CommunityModule;