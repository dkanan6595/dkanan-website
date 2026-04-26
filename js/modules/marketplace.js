// DKANAN - Marketplace Module
// Artwork sales, orders, and commission system

const MarketplaceModule = (function() {
  'use strict';
  
  // Artwork categories
  const CATEGORIES = [
    'painting', 'sculpture', 'digital', 'photography', 
    'illustration', 'mixed_media', 'printmaking', 'textile', 'other'
  ];
  
  // Mediums
  const MEDIUMS = [
    'oil', 'acrylic', 'watercolor', 'ink', 'charcoal', 
    'pastel', 'digital', 'bronze', 'marble', 'clay', 'other'
  ];
  
  // Upload artwork
  async function uploadArtwork(sellerId, artworkData, images) {
    try {
      const { db, storage } = window.firebaseServices;
      
      // Upload images
      const imageUrls = await Promise.all(
        images.map(async(file, index) => {
          const storageRef = storage.ref(`artworks/${sellerId}/${Date.now()}-${index}`);
          const snapshot = await storageRef.put(file);
          return snapshot.ref.getDownloadURL();
        })
      );
      
      // Calculate commission fee based on membership
      const user = await getUserMembership(sellerId);
      const commissionRate = user?.membership === 'advanced' ? 0.05 : 
                            user?.membership === 'premium' ? 0.10 : 0.15;
      
      const artwork = {
        sellerId: sellerId,
        title: artworkData.title,
        description: artworkData.description,
        price: parseFloat(artworkData.price),
        category: artworkData.category,
        medium: artworkData.medium,
        dimensions: artworkData.dimensions,
        images: imageUrls,
        thumbnail: imageUrls[0],
        status: 'available',
        views: 0,
        likes: 0,
        commission: artworkData.commission || false,
        commissionPrice: artworkData.commissionPrice ? parseFloat(artworkData.commissionPrice) : null,
        commissionDescription: artworkData.commissionDescription || '',
        tags: artworkData.tags || [],
        commissionRate: commissionRate,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('artworks').add(artwork);
      
      // Update seller stats
      await ProfileModule.updateStats(sellerId, 'artworks', 1);
      
      showNotification('Artwork uploaded successfully!', 'success');
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error uploading artwork:', error);
      showNotification('Failed to upload artwork', 'error');
      return { success: false, error: error.message };
    }
  }
  
  // Get artwork by ID
  async function getArtwork(artworkId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('artworks').doc(artworkId).get();
      
      if (doc.exists) {
        const artwork = { id: doc.id, ...doc.data() };
        // Increment views
        db.collection('artworks').doc(artworkId).update({
          views: firebase.firestore.FieldValue.increment(1)
        });
        return artwork;
      }
      return null;
    } catch (error) {
      console.error('Error getting artwork:', error);
      return null;
    }
  }
  
  // Get artworks with filters
  async function getArtworks(filters = {}, limit = 20, startAfter = null) {
    try {
      const { db } = window.firebaseServices;
      
      let query = db.collection('artworks').where('status', '==', 'available');
      
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      
      if (filters.sellerId) {
        query = query.where('sellerId', '==', filters.sellerId);
      }
      
      if (filters.minPrice) {
        query = query.where('price', '>=', parseFloat(filters.minPrice));
      }
      
      if (filters.maxPrice) {
        query = query.where('price', '<=', parseFloat(filters.maxPrice));
      }
      
      query = query.orderBy('createdAt', 'desc').limit(limit);
      
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting artworks:', error);
      return [];
    }
  }
  
  // Search artworks
  async function searchArtworks(searchTerm, filters = {}, limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      // Simple search using title contains
      const snapshot = await db.collection('artworks')
        .where('status', '==', 'available')
        .orderBy('title')
        .limit(limit)
        .get();
      
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        results = results.filter(a => 
          a.title?.toLowerCase().includes(term) || 
          a.description?.toLowerCase().includes(term) ||
          a.category?.toLowerCase().includes(term)
        );
      }
      
      // Apply additional filters
      if (filters.category) {
        results = results.filter(a => a.category === filters.category);
      }
      
      if (filters.minPrice) {
        results = results.filter(a => a.price >= parseFloat(filters.minPrice));
      }
      
      if (filters.maxPrice) {
        results = results.filter(a => a.price <= parseFloat(filters.maxPrice));
      }
      
      return results;
    } catch (error) {
      console.error('Error searching artworks:', error);
      return [];
    }
  }
  
  // Like artwork
  async function likeArtwork(userId, artworkId) {
    try {
      const { db } = window.firebaseServices;
      
      // Check if already liked
      const existing = await db.collection('user_likes')
        .where('userId', '==', userId)
        .where('targetId', '==', artworkId)
        .where('targetType', '==', 'artwork')
        .get();
      
      if (!existing.empty) {
        // Unlike
        existing.forEach(doc => doc.ref.delete());
        await db.collection('artworks').doc(artworkId).update({
          likes: firebase.firestore.FieldValue.increment(-1)
        });
        return { success: true, liked: false };
      }
      
      // Like
      await db.collection('user_likes').add({
        userId: userId,
        targetId: artworkId,
        targetType: 'artwork',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('artworks').doc(artworkId).update({
        likes: firebase.firestore.FieldValue.increment(1)
      });
      
      return { success: true, liked: true };
    } catch (error) {
      console.error('Error liking artwork:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create order (with Razorpay)
  async function createOrder(buyerId, artworkId, shippingAddress) {
    try {
      const { db, functions } = window.firebaseServices;
      
      // Get artwork
      const artwork = await getArtwork(artworkId);
      if (!artwork) return { success: false, error: 'Artwork not found' };
      if (artwork.status !== 'available') return { success: false, error: 'Artwork not available' };
      
      // Call cloud function to create Razorpay order
      const createRazorpayOrder = functions.httpsCallable('createRazorpayOrder');
      const result = await createRazorpayOrder({
        amount: artwork.price * 100, // Razorpay expects paise
        currency: 'INR',
        artworkId: artworkId,
        buyerId: buyerId
      });
      
      const { orderId, razorpayKey } = result.data;
      
      // Create order in Firestore
      const order = {
        buyerId: buyerId,
        sellerId: artwork.sellerId,
        artworkId: artworkId,
        artworkTitle: artwork.title,
        artworkImage: artwork.thumbnail,
        amount: artwork.price,
        commission: artwork.price * artwork.commissionRate,
        netAmount: artwork.price - (artwork.price * artwork.commissionRate),
        status: 'pending',
        shippingAddress: shippingAddress,
        razorpayOrderId: orderId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const orderDoc = await db.collection('orders').add(order);
      
      return { 
        success: true, 
        orderId: orderDoc.id,
        razorpayOrderId: orderId,
        razorpayKey: razorpayKey,
        amount: artwork.price
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Verify payment
  async function verifyPayment(orderId, paymentId, signature) {
    try {
      const { functions } = window.firebaseServices;
      
      const verifyPayment = functions.httpsCallable('verifyRazorpayPayment');
      const result = await verifyPayment({
        orderId: orderId,
        paymentId: paymentId,
        signature: signature
      });
      
      if (result.data.success) {
        // Update order status
        const { db } = window.firebaseServices;
        await db.collection('orders').doc(orderId).update({
          status: 'paid',
          paymentId: paymentId,
          paidAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update artwork status
        const orderDoc = await db.collection('orders').doc(orderId).get();
        const orderData = orderDoc.data();
        
        await db.collection('artworks').doc(orderData.artworkId).update({
          status: 'sold'
        });
        
        // Update seller stats
        await ProfileModule.updateStats(orderData.sellerId, 'sales', 1);
        
        // Create notification
        await NotificationModule.createNotification(orderData.sellerId, {
          type: 'order',
          title: 'New Order!',
          body: 'Someone purchased your artwork',
          data: { orderId }
        });
        
        showNotification('Payment successful!', 'success');
        return { success: true };
      }
      
      return { success: false, error: 'Payment verification failed' };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get user orders
  async function getOrders(userId, role = 'buyer') {
    try {
      const { db } = window.firebaseServices;
      
      const field = role === 'buyer' ? 'buyerId' : 'sellerId';
      const snapshot = await db.collection('orders')
        .where(field, '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }
  
  // Update order status
  async function updateOrderStatus(orderId, status) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('orders').doc(orderId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Notify other party
      const orderDoc = await db.collection('orders').doc(orderId).get();
      const orderData = orderDoc.data();
      
      const notifyUserId = status === 'shipped' ? orderData.buyerId : orderData.sellerId;
      
      await NotificationModule.createNotification(notifyUserId, {
        type: 'order',
        title: 'Order Update',
        body: `Order status: ${status}`,
        data: { orderId }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating order:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Request commission
  async function requestCommission(requesterId, artistId, data) {
    try {
      const { db } = window.firebaseServices;
      
      const commission = {
        requesterId: requesterId,
        artistId: artistId,
        description: data.description,
        budget: parseFloat(data.budget),
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: 'pending',
        referenceImages: data.referenceImages || [],
        requirements: data.requirements || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await db.collection('commissions').add(commission);
      
      // Notify artist
      await NotificationModule.createNotification(artistId, {
        type: 'commission',
        title: 'New Commission Request',
        body: 'Someone wants to commission your work',
        data: { commissionId: docRef.id }
      });
      
      showNotification('Commission request sent!', 'success');
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error requesting commission:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get commissions
  async function getCommissions(userId, role = 'requester') {
    try {
      const { db } = window.firebaseServices;
      
      const field = role === 'requester' ? 'requesterId' : 'artistId';
      const snapshot = await db.collection('commissions')
        .where(field, '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting commissions:', error);
      return [];
    }
  }
  
  // Update commission status
  async function updateCommissionStatus(commissionId, status) {
    try {
      const { db } = window.firebaseServices;
      
      await db.collection('commissions').doc(commissionId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating commission:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get user membership
  async function getUserMembership(userId) {
    try {
      const { db } = window.firebaseServices;
      const doc = await db.collection('users').doc(userId).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      return null;
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
  
  // Render artwork card
  function renderArtworkCard(artwork, showActions = true) {
    return `
      <div class="artwork-card" data-id="${artwork.id}">
        <div class="artwork-image">
          <img src="${artwork.thumbnail || artwork.images?.[0] || 'assets/placeholder.jpg'}" alt="${artwork.title}">
          ${artwork.status === 'sold' ? '<div class="sold-badge">SOLD</div>' : ''}
          <div class="artwork-overlay">
            <button class="view-btn" onclick="MarketplaceModule.viewArtwork('${artwork.id}')">
              <i class="fas fa-eye"></i> View
            </button>
            ${showActions ? `
              <button class="like-btn" onclick="MarketplaceModule.toggleLike('${artwork.id}')">
                <i class="fas fa-heart"></i> ${artwork.likes || 0}
              </button>
            ` : ''}
          </div>
        </div>
        <div class="artwork-info">
          <h4>${artwork.title}</h4>
          <p class="artwork-category">${artwork.category}</p>
          <div class="artwork-meta">
            <span class="artwork-price">$${artwork.price?.toLocaleString() || '0'}</span>
            <span class="artwork-views"><i class="fas fa-eye"></i> ${artwork.views || 0}</span>
          </div>
          ${artwork.commission ? '<span class="commission-badge">Commissions Open</span>' : ''}
        </div>
      </div>
    `;
  }
  
  // View artwork detail
  async function viewArtwork(artworkId) {
    const artwork = await getArtwork(artworkId);
    if (!artwork) return;
    
    // Show modal or navigate to detail page
    const modal = document.getElementById('artworkModal');
    if (modal) {
      document.getElementById('artworkModalContent').innerHTML = renderArtworkDetail(artwork);
      modal.style.display = 'flex';
    }
  }
  
  // Render artwork detail
  function renderArtworkDetail(artwork) {
    const currentUser = window.currentUser;
    const isOwner = currentUser?.uid === artwork.sellerId;
    
    return `
      <div class="artwork-detail">
        <div class="artwork-gallery">
          ${artwork.images?.map((img, i) => `
            <img src="${img}" alt="${artwork.title} ${i + 1}" class="${i === 0 ? 'active' : ''}">
          `).join('') || ''}
        </div>
        <div class="artwork-details">
          <h2>${artwork.title}</h2>
          <p class="artwork-description">${artwork.description || 'No description'}</p>
          
          <div class="artwork-specs">
            <div class="spec">
              <span class="label">Category</span>
              <span class="value">${artwork.category}</span>
            </div>
            <div class="spec">
              <span class="label">Medium</span>
              <span class="value">${artwork.medium}</span>
            </div>
            <div class="spec">
              <span class="label">Dimensions</span>
              <span class="value">${artwork.dimensions || 'N/A'}</span>
            </div>
          </div>
          
          <div class="artwork-price-section">
            <span class="price">$${artwork.price?.toLocaleString()}</span>
            ${artwork.commission ? `<span class="commission-price">Commission: $${artwork.commissionPrice?.toLocaleString() || 'Negotiable'}</span>` : ''}
          </div>
          
          ${!isOwner && artwork.status === 'available' ? `
            <div class="artwork-actions">
              <button class="btn-primary" onclick="MarketplaceModule.buyArtwork('${artwork.id}')">
                <i class="fas fa-shopping-cart"></i> Buy Now
              </button>
              ${artwork.commission ? `
                <button class="btn-secondary" onclick="MarketplaceModule.requestCommissionFromArtwork('${artwork.sellerId}')">
                  <i class="fas fa-paint-brush"></i> Request Commission
                </button>
              ` : ''}
            </div>
          ` : ''}
          
          <div class="artwork-stats">
            <span><i class="fas fa-eye"></i> ${artwork.views || 0} views</span>
            <span><i class="fas fa-heart"></i> ${artwork.likes || 0} likes</span>
          </div>
        </div>
      </div>
    `;
  }
  
  // Buy artwork
  async function buyArtwork(artworkId) {
    if (!window.currentUser) {
      openAuthModal('login');
      return;
    }
    
    // Show shipping form modal
    const modal = document.getElementById('shippingModal');
    if (modal) {
      modal.dataset.artworkId = artworkId;
      modal.style.display = 'flex';
    }
  }
  
  // Toggle like
  async function toggleLike(artworkId) {
    if (!window.currentUser) {
      openAuthModal('login');
      return;
    }
    
    const result = await likeArtwork(window.currentUser.uid, artworkId);
    if (result.success) {
      // Update UI
      const btn = document.querySelector(`[data-id="${artworkId}"] .like-btn`);
      if (btn) {
        const count = parseInt(btn.textContent) || 0;
        btn.innerHTML = `<i class="fas fa-heart"></i> ${result.liked ? count + 1 : count - 1}`;
      }
    }
  }
  
  // Request commission from artwork page
  async function requestCommissionFromArtwork(artistId) {
    if (!window.currentUser) {
      openAuthModal('login');
      return;
    }
    
    const modal = document.getElementById('commissionModal');
    if (modal) {
      modal.dataset.artistId = artistId;
      modal.style.display = 'flex';
    }
  }
  
  // Public API
  return {
    CATEGORIES,
    MEDIUMS,
    uploadArtwork,
    getArtwork,
    getArtworks,
    searchArtworks,
    likeArtwork,
    createOrder,
    verifyPayment,
    getOrders,
    updateOrderStatus,
    requestCommission,
    getCommissions,
    updateCommissionStatus,
    viewArtwork,
    renderArtworkCard,
    renderArtworkDetail,
    buyArtwork,
    toggleLike,
    requestCommissionFromArtwork
  };
})();

window.MarketplaceModule = MarketplaceModule;