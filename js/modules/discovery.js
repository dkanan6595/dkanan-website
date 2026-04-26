// DKANAN - Discovery Engine Module
// Search, filter, and discover artists by location, category, skill level
// VERY IMPORTANT - Core feature for artist discovery

const DiscoveryModule = (function() {
  'use strict';
  
  // State
  let searchResults = [];
  let nearbyArtists = [];
  let filters = {
    location: { district: '', state: '', country: '' },
    category: '',
    skillLevel: '',
    searchTerm: ''
  };
  
  // Art categories
  const CATEGORIES = [
    { id: 'painting', label: 'Painting', icon: 'fa-palette' },
    { id: 'sculpture', label: 'Sculpture', icon: 'fa-monument' },
    { id: 'digital', label: 'Digital Art', icon: 'fa-laptop' },
    { id: 'photography', label: 'Photography', icon: 'fa-camera' },
    { id: 'illustration', label: 'Illustration', icon: 'fa-pen-nib' },
    { id: 'mixed_media', label: 'Mixed Media', icon: 'fa-layer-group' },
    { id: 'printmaking', label: 'Printmaking', icon: 'fa-print' },
    { id: 'textile', label: 'Textile Art', icon: 'fa-thread' },
    { id: 'ceramics', label: 'Ceramics', icon: 'fa-fire' },
    { id: 'other', label: 'Other', icon: 'fa-ellipsis-h' }
  ];
  
  // Skill levels
  const SKILL_LEVELS = [
    { id: 'beginner', label: 'Beginner', description: '0-2 years experience' },
    { id: 'intermediate', label: 'Intermediate', description: '2-5 years experience' },
    { id: 'advanced', label: 'Advanced', description: '5-10 years experience' },
    { id: 'professional', label: 'Professional', description: '10+ years experience' },
    { id: 'master', label: 'Master', description: 'Renowned expert' }
  ];
  
  // Indian states for location
  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry'
  ];
  
  // Search artists
  async function searchArtists(searchTerm, additionalFilters = {}) {
    try {
      const { db } = window.firebaseServices;
      
      filters.searchTerm = searchTerm;
      filters = { ...filters, ...additionalFilters };
      
      let query = db.collection('profiles');
      
      // Build query based on filters
      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }
      
      if (filters.location.country) {
        query = query.where('location.country', '==', filters.location.country);
      }
      
      if (filters.location.state) {
        query = query.where('location.state', '==', filters.location.state);
      }
      
      // Note: Firestore doesn't support array-contains for location filtering
      // We'll fetch and filter in memory for district-level search
      
      const snapshot = await query.limit(100).get();
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Apply text search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        results = results.filter(profile => 
          profile.displayName?.toLowerCase().includes(term) ||
          profile.bio?.toLowerCase().includes(term) ||
          profile.skills?.some(s => s.toLowerCase().includes(term)) ||
          profile.category?.toLowerCase().includes(term)
        );
      }
      
      // Apply additional filters
      if (filters.location.district) {
        results = results.filter(p => 
          p.location?.district?.toLowerCase() === filters.location.district.toLowerCase()
        );
      }
      
      if (filters.skillLevel) {
        results = results.filter(p => p.skillLevel === filters.skillLevel);
      }
      
      // Get user data for each profile
      searchResults = await Promise.all(
        results.map(async(profile) => {
          const user = await getUserData(profile.userId);
          return { ...profile, ...user };
        })
      );
      
      return searchResults;
    } catch (error) {
      console.error('Error searching artists:', error);
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
  
  // Get nearby artists (using geolocation)
  async function getNearbyArtists(maxDistance = 50) { // maxDistance in km
    try {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return await getPopularArtists();
      }
      
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async(position) => {
            const { latitude, longitude } = position.coords;
            
            // Get all profiles with location
            const { db } = window.firebaseServices;
            const snapshot = await db.collection('profiles')
              .where('location.coordinates', '!=', null)
              .limit(50)
              .get();
            
            let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Calculate distance and filter
            results = results
              .map(profile => ({
                ...profile,
                distance: calculateDistance(
                  latitude, longitude,
                  profile.location.coordinates.latitude,
                  profile.location.coordinates.longitude
                )
              }))
              .filter(p => p.distance <= maxDistance)
              .sort((a, b) => a.distance - b.distance);
            
            // Get user data
            nearbyArtists = await Promise.all(
              results.map(async(profile) => {
                const user = await getUserData(profile.userId);
                return { ...profile, ...user };
              })
            );
            
            resolve(nearbyArtists);
          },
          async() => {
            // On error, return popular artists
            resolve(await getPopularArtists());
          }
        );
      });
    } catch (error) {
      console.error('Error getting nearby artists:', error);
      return await getPopularArtists();
    }
  }
  
  // Calculate distance between two coordinates (Haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  function toRad(deg) {
    return deg * (Math.PI / 180);
  }
  
  // Get popular artists
  async function getPopularArtists(limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('profiles')
        .orderBy('stats.followers', 'desc')
        .limit(limit)
        .get();
      
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return await Promise.all(
        results.map(async(profile) => {
          const user = await getUserData(profile.userId);
          return { ...profile, ...user };
        })
      );
    } catch (error) {
      console.error('Error getting popular artists:', error);
      return [];
    }
  }
  
  // Get trending artists (most artworks sold)
  async function getTrendingArtists(limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('profiles')
        .orderBy('stats.sales', 'desc')
        .limit(limit)
        .get();
      
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return await Promise.all(
        results.map(async(profile) => {
          const user = await getUserData(profile.userId);
          return { ...profile, ...user };
        })
      );
    } catch (error) {
      console.error('Error getting trending artists:', error);
      return [];
    }
  }
  
  // Get artists by category
  async function getArtistsByCategory(category, limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      const snapshot = await db.collection('profiles')
        .where('category', '==', category)
        .limit(limit)
        .get();
      
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return await Promise.all(
        results.map(async(profile) => {
          const user = await getUserData(profile.userId);
          return { ...profile, ...user };
        })
      );
    } catch (error) {
      console.error('Error getting artists by category:', error);
      return [];
    }
  }
  
  // Get artists by location
  async function getArtistsByLocation(country, state = '', district = '', limit = 20) {
    try {
      const { db } = window.firebaseServices;
      
      let query = db.collection('profiles')
        .where('location.country', '==', country)
        .limit(limit);
      
      if (state) {
        query = query.where('location.state', '==', state);
      }
      
      const snapshot = await query.get();
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by district in memory
      if (district) {
        results = results.filter(p => 
          p.location?.district?.toLowerCase() === district.toLowerCase()
        );
      }
      
      return await Promise.all(
        results.map(async(profile) => {
          const user = await getUserData(profile.userId);
          return { ...profile, ...user };
        })
      );
    } catch (error) {
      console.error('Error getting artists by location:', error);
      return [];
    }
  }
  
  // Quick filter - category
  async function filterByCategory(category) {
    filters.category = category;
    return await searchArtists(filters.searchTerm, filters);
  }
  
  // Quick filter - location
  async function filterByLocation(location) {
    filters.location = { ...filters.location, ...location };
    return await searchArtists(filters.searchTerm, filters);
  }
  
  // Quick filter - skill level
  async function filterBySkillLevel(level) {
    filters.skillLevel = level;
    return await searchArtists(filters.searchTerm, filters);
  }
  
  // Clear filters
  function clearFilters() {
    filters = {
      location: { district: '', state: '', country: '' },
      category: '',
      skillLevel: '',
      searchTerm: ''
    };
    searchResults = [];
    return searchResults;
  }
  
  // Get current filters
  function getFilters() {
    return { ...filters };
  }
  
  // Render search results
  function renderSearchResults(artists) {
    const container = document.getElementById('discoveryResults');
    if (!container) return;
    
    if (artists.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <h3>No artists found</h3>
          <p>Try adjusting your filters or search term</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = artists.map(artist => renderArtistCard(artist)).join('');
  }
  
  // Render artist card
  function renderArtistCard(artist) {
    return `
      <div class="discovery-artist-card" onclick="DiscoveryModule.viewArtistProfile('${artist.userId}')">
        <div class="artist-cover">
          <img src="${artist.coverImage || 'assets/cover-default.jpg'}" alt="Cover">
        </div>
        <div class="artist-avatar">
          <img src="${artist.photoURL || 'assets/default-avatar.png'}" alt="${artist.displayName}">
          ${artist.isVerified ? '<span class="verified-badge"><i class="fas fa-check"></i></span>' : ''}
        </div>
        <div class="artist-info">
          <h3>${artist.displayName || 'Unknown Artist'}</h3>
          <p class="artist-category">${artist.category || 'Artist'}</p>
          <p class="artist-location">
            <i class="fas fa-map-marker-alt"></i>
            ${artist.location?.district ? artist.location.district + ', ' : ''}
            ${artist.location?.state || ''}
          </p>
          
          <div class="artist-stats">
            <span><i class="fas fa-users"></i> ${artist.stats?.followers || 0}</span>
            <span><i class="fas fa-palette"></i> ${artist.stats?.artworks || 0}</span>
            <span><i class="fas fa-shopping-bag"></i> ${artist.stats?.sales || 0}</span>
          </div>
          
          ${artist.skills?.length ? `
            <div class="artist-skills">
              ${artist.skills.slice(0, 3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // View artist profile
  function viewArtistProfile(userId) {
    // Navigate to profile section
    window.location.hash = `profile/${userId}`;
    showSection('profile');
    loadArtistProfile(userId);
  }
  
  // Load artist profile
  async function loadArtistProfile(userId) {
    const profile = await ProfileModule.getProfile(userId);
    const user = await getUserData(userId);
    const combined = { ...profile, ...user };
    
    const container = document.getElementById('profileContent');
    if (container) {
      container.innerHTML = ProfileModule.renderProfileCard(combined, true);
    }
  }
  
  // Render filter UI
  function renderFilterUI() {
    const container = document.getElementById('discoveryFilters');
    if (!container) return;
    
    container.innerHTML = `
      <div class="filter-section">
        <h4><i class="fas fa-search"></i> Search</h4>
        <input type="text" id="discoverySearch" placeholder="Search artists by name, skill..."
               value="${filters.searchTerm}" 
               onkeyup="if(event.key==='Enter')DiscoveryModule.doSearch(this.value)">
      </div>
      
      <div class="filter-section">
        <h4><i class="fas fa-palette"></i> Category</h4>
        <div class="filter-options">
          <button class="filter-chip ${!filters.category ? 'active' : ''}" 
                  onclick="DiscoveryModule.filterByCategory('')">All</button>
          ${CATEGORIES.map(cat => `
            <button class="filter-chip ${filters.category === cat.id ? 'active' : ''}"
                    onclick="DiscoveryModule.filterByCategory('${cat.id}')">
              <i class="fas ${cat.icon}"></i> ${cat.label}
            </button>
          `).join('')}
        </div>
      </div>
      
      <div class="filter-section">
        <h4><i class="fas fa-map-marker-alt"></i> Location</h4>
        <select id="filterCountry" onchange="DiscoveryModule.onCountryChange(this.value)">
          <option value="">All Countries</option>
          <option value="India" ${filters.location.country === 'India' ? 'selected' : ''}>India</option>
          <option value="USA" ${filters.location.country === 'USA' ? 'selected' : ''}>USA</option>
          <option value="UK" ${filters.location.country === 'UK' ? 'selected' : ''}>UK</option>
          <option value="Other" ${filters.location.country === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        ${filters.location.country === 'India' ? `
          <select id="filterState" onchange="DiscoveryModule.onStateChange(this.value)">
            <option value="">All States</option>
            ${INDIAN_STATES.map(state => `
              <option value="${state}" ${filters.location.state === state ? 'selected' : ''}>${state}</option>
            `).join('')}
          </select>
        ` : ''}
        <input type="text" id="filterDistrict" placeholder="District" 
               value="${filters.location.district}"
               onchange="DiscoveryModule.filterByLocation({district: this.value})">
      </div>
      
      <div class="filter-section">
        <h4><i class="fas fa-star"></i> Skill Level</h4>
        <div class="filter-options">
          <button class="filter-chip ${!filters.skillLevel ? 'active' : ''}"
                  onclick="DiscoveryModule.filterBySkillLevel('')">All</button>
          ${SKILL_LEVELS.map(level => `
            <button class="filter-chip ${filters.skillLevel === level.id ? 'active' : ''}"
                    onclick="DiscoveryModule.filterBySkillLevel('${level.id}')">
              ${level.label}
            </button>
          `).join('')}
        </div>
      </div>
      
      <button class="btn-secondary" onclick="DiscoveryModule.clearFilters()">
        <i class="fas fa-times"></i> Clear Filters
      </button>
    `;
  }
  
  // Country change handler
  function onCountryChange(country) {
    filters.location.country = country;
    filters.location.state = '';
    filters.location.district = '';
    renderFilterUI();
    searchArtists(filters.searchTerm, filters);
  }
  
  // State change handler
  function onStateChange(state) {
    filters.location.state = state;
    filters.location.district = '';
    searchArtists(filters.searchTerm, filters);
  }
  
  // Do search
  async function doSearch(term) {
    filters.searchTerm = term;
    const results = await searchArtists(term, filters);
    renderSearchResults(results);
  }
  
  // Initialize discovery
  async function init() {
    renderFilterUI();
    
    // Load initial results
    const popular = await getPopularArtists();
    renderSearchResults(popular);
  }
  
  // Public API
  return {
    CATEGORIES,
    SKILL_LEVELS,
    INDIAN_STATES,
    searchArtists,
    getNearbyArtists,
    getPopularArtists,
    getTrendingArtists,
    getArtistsByCategory,
    getArtistsByLocation,
    filterByCategory,
    filterByLocation,
    filterBySkillLevel,
    clearFilters,
    getFilters,
    renderSearchResults,
    renderArtistCard,
    viewArtistProfile,
    renderFilterUI,
    onCountryChange,
    onStateChange,
    doSearch,
    init
  };
})();

window.DiscoveryModule = DiscoveryModule;