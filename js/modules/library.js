// DKANAN - Library / Learning Module
// Tutorials, art resources, articles, and educational content

const LibraryModule = (function() {
  'use strict';
  
  // State
  let resources = [];
  let currentCategory = 'all';
  
  // Resource categories
  const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'fa-th' },
    { id: 'tutorial', label: 'Tutorials', icon: 'fa-graduation-cap' },
    { id: 'article', label: 'Articles', icon: 'fa-newspaper' },
    { id: 'video', label: 'Videos', icon: 'fa-video' },
    { id: 'resource', label: 'Resources', icon: 'fa-folder' }
  ];
  
  // Art categories for filtering
  const ART_CATEGORIES = [
    'painting', 'sculpture', 'digital', 'photography', 
    'illustration', 'mixed_media', 'drawing', 'other'
  ];
  
  // Initialize
  function init() {
    loadResources();
  }
  
  // Load resources
  async function loadResources(filters = {}) {
    try {
      const { db } = window.firebaseServices;
      
      let query = db.collection('library_resources').orderBy('createdAt', 'desc');
      
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
      
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      
      const snapshot = await query.limit(100).get();
      resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      renderResources();
      return resources;
    } catch (error) {
      console.error('Error loading resources:', error);
      return [];
    }
  }
  
  // Get resource by ID
  async function getResource(resourceId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('library_resources').doc(resourceId).get();
      
      if (doc.exists) {
        // Increment views
        await db.collection('library_resources').doc(resourceId).update({
          views: firebase.firestore.FieldValue.increment(1)
        });
        
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting resource:', error);
      return null;
    }
  }
  
  // Create resource (admin)
  async function createResource(authorId, data) {
    try {
      const { db, storage } = window.firebaseServices;
      
      let thumbnailUrl = data.thumbnail || '';
      
      // Upload thumbnail if file
      if (data.thumbnailFile) {
        const storageRef = storage.ref(`library/${authorId}/${Date.now()}`);
        const snapshot = await storageRef.put(data.thumbnailFile);
        thumbnailUrl = await snapshot.ref.getDownloadURL();
      }
      
      const resource = {
        authorId: authorId,
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        thumbnail: thumbnailUrl,
        content: data.content || '', // For articles
        videoUrl: data.videoUrl || '', // For videos
        downloadUrl: data.downloadUrl || '', // For resources
        tags: data.tags || [],
        views: 0,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('library_resources').add(resource);
      
      showNotification('Resource created!', 'success');
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating resource:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Filter by category
  async function filterByCategory(category) {
    currentCategory = category;
    return await loadResources({ type: category === 'all' ? null : category });
  }
  
  // Search resources
  async function searchResources(searchTerm) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('library_resources')
        .orderBy('title')
        .get();
      
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        results = results.filter(r => 
          r.title?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          r.tags?.some(t => t.toLowerCase().includes(term))
        );
      }
      
      resources = results;
      renderResources();
      return results;
    } catch (error) {
      console.error('Error searching resources:', error);
      return [];
    }
  }
  
  // Like resource
  async function likeResource(userId, resourceId) {
    try {
      const { db } = window.firebaseServices;
      
      const existing = await db.collection('user_likes')
        .where('userId', '==', userId)
        .where('targetId', '==', resourceId)
        .where('targetType', '==', 'resource')
        .get();
      
      if (!existing.empty) {
        existing.forEach(doc => doc.ref.delete());
        await db.collection('library_resources').doc(resourceId).update({
          likes: firebase.firestore.FieldValue.increment(-1)
        });
        return { success: true, liked: false };
      }
      
      await db.collection('user_likes').add({
        userId: userId,
        targetId: resourceId,
        targetType: 'resource',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('library_resources').doc(resourceId).update({
        likes: firebase.firestore.FieldValue.increment(1)
      });
      
      return { success: true, liked: true };
    } catch (error) {
      console.error('Error liking resource:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Render resources
  function renderResources() {
    const container = document.getElementById('libraryResources');
    if (!container) return;
    
    if (resources.length === 0) {
      container.innerHTML = `
        <div class="no-resources">
          <i class="fas fa-book-open"></i>
          <h3>No resources found</h3>
          <p>Check back later for tutorials and articles</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = resources.map(resource => renderResourceCard(resource)).join('');
  }
  
  // Render resource card
  function renderResourceCard(resource) {
    const typeIcon = getTypeIcon(resource.type);
    
    return `
      <div class="library-card" onclick="LibraryModule.viewResource('${resource.id}')">
        <div class="library-thumbnail">
          <img src="${resource.thumbnail || 'assets/resource-default.jpg'}" alt="${resource.title}">
          <span class="library-type" style="background:${typeIcon.color}">
            <i class="${typeIcon.icon}"></i> ${resource.type}
          </span>
        </div>
        <div class="library-info">
          <h4>${resource.title}</h4>
          <p>${resource.description || ''}</p>
          <div class="library-meta">
            <span><i class="fas fa-eye"></i> ${resource.views || 0}</span>
            <span><i class="fas fa-heart"></i> ${resource.likes || 0}</span>
            <span class="library-category">${resource.category || ''}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  // Get type icon
  function getTypeIcon(type) {
    const icons = {
      tutorial: { icon: 'fas fa-graduation-cap', color: '#4ade80' },
      article: { icon: 'fas fa-newspaper', color: '#60a5fa' },
      video: { icon: 'fas fa-video', color: '#f87171' },
      resource: { icon: 'fas fa-folder', color: '#fbbf24' }
    };
    return icons[type] || icons.article;
  }
  
  // View resource
  async function viewResource(resourceId) {
    const resource = await getResource(resourceId);
    if (!resource) return;
    
    const modal = document.getElementById('libraryModal');
    if (modal) {
      document.getElementById('libraryModalContent').innerHTML = renderResourceDetail(resource);
      modal.style.display = 'flex';
    }
  }
  
  // Render resource detail
  function renderResourceDetail(resource) {
    return `
      <div class="library-detail">
        <div class="library-detail-header">
          <img src="${resource.thumbnail || 'assets/resource-default.jpg'}" alt="${resource.title}">
          <div class="library-detail-overlay">
            <h2>${resource.title}</h2>
            <div class="library-detail-meta">
              <span><i class="fas fa-eye"></i> ${resource.views || 0} views</span>
              <span><i class="fas fa-heart"></i> ${resource.likes || 0} likes</span>
              <span class="library-category">${resource.category}</span>
            </div>
          </div>
        </div>
        
        <div class="library-detail-body">
          <p class="library-description">${resource.description}</p>
          
          ${resource.type === 'video' && resource.videoUrl ? `
            <div class="library-video">
              <iframe src="${resource.videoUrl}" frameborder="0" allowfullscreen></iframe>
            </div>
          ` : ''}
          
          ${resource.type === 'article' ? `
            <div class="library-article">
              ${resource.content}
            </div>
          ` : ''}
          
          ${resource.type === 'resource' && resource.downloadUrl ? `
            <div class="library-download">
              <a href="${resource.downloadUrl}" class="btn-primary" download>
                <i class="fas fa-download"></i> Download Resource
              </a>
            </div>
          ` : ''}
          
          ${resource.tags?.length ? `
            <div class="library-tags">
              ${resource.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
          
          <div class="library-actions">
            <button class="btn-secondary" onclick="LibraryModule.likeResource('${window.currentUser?.uid}', '${resource.id}')">
              <i class="fas fa-heart"></i> Like
            </button>
            <button class="btn-secondary" onclick="SocialModule.sharePost('${resource.id}', '${resource.title}', '${resource.thumbnail}')">
              <i class="fas fa-share"></i> Share
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // Render filter UI
  function renderFilterUI() {
    const container = document.getElementById('libraryFilters');
    if (!container) return;
    
    container.innerHTML = `
      <div class="library-filter-tabs">
        ${CATEGORIES.map(cat => `
          <button class="filter-tab ${currentCategory === cat.id ? 'active' : ''}"
                  onclick="LibraryModule.filterByCategory('${cat.id}')">
            <i class="${cat.icon}"></i> ${cat.label}
          </button>
        `).join('')}
      </div>
      <div class="library-search">
        <input type="text" placeholder="Search tutorials, articles..." 
               onkeyup="if(event.key==='Enter')LibraryModule.searchResources(this.value)">
        <button onclick="LibraryModule.searchResources(document.querySelector('#librarySearch').value)">
          <i class="fas fa-search"></i>
        </button>
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
    CATEGORIES,
    ART_CATEGORIES,
    init,
    loadResources,
    getResource,
    createResource,
    filterByCategory,
    searchResources,
    likeResource,
    renderResources,
    renderResourceCard,
    viewResource,
    renderFilterUI
  };
})();

window.LibraryModule = LibraryModule;