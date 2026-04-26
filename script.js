/* ================= DKANAN PLATFORM - MAIN SCRIPT ================= */

// User State
let currentUser = null;
let userRole = 'visitor';
let authMode = 'signup';
let userMembership = 'free'; // free, premium, advanced
let currentDevice = 'desktop';
let manualDeviceMode = null;

// Device Detection
function detectDevice() {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTablet = /ipad|android/i.test(userAgent) && width > 768 && width <= 1024;
  
  if (manualDeviceMode) {
    return manualDeviceMode;
  }
  
  if (width <= 768 || isMobile) {
    return 'mobile';
  } else if (width <= 1024 || isTablet) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function applyDeviceStyles() {
  currentDevice = detectDevice();
  document.body.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
  document.body.classList.add('device-' + currentDevice);
  
  const indicator = document.getElementById('deviceModeIndicator');
  const currentDeviceEl = document.getElementById('currentDevice');
  
  if (currentDeviceEl) {
    currentDeviceEl.textContent = currentDevice.charAt(0).toUpperCase() + currentDevice.slice(1);
  }
  
  // Show indicator on mobile/tablet
  if (indicator) {
    if (currentDevice === 'mobile' || currentDevice === 'tablet') {
      indicator.style.display = 'flex';
    } else {
      indicator.style.display = 'none';
    }
  }
  
  // Adjust membership grid for mobile
  const membershipGrid = document.getElementById('membershipGrid');
  if (membershipGrid) {
    if (currentDevice === 'mobile') {
      membershipGrid.style.gridTemplateColumns = '1fr';
    } else if (currentDevice === 'tablet') {
      membershipGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    } else {
      membershipGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }
  }
  
  console.log('Device mode:', currentDevice);
}

window.toggleDeviceMode = function() {
  if (currentDevice === 'mobile' || currentDevice === 'tablet') {
    manualDeviceMode = 'desktop';
    alert('Switched to Desktop Mode');
  } else {
    manualDeviceMode = 'mobile';
    alert('Switched to Mobile Mode');
  }
  applyDeviceStyles();
};

window.switchToDesktop = function() {
  manualDeviceMode = 'desktop';
  applyDeviceStyles();
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  console.log('DKANAN Platform Initialized ✅');
  updateUIForAuth();
  applyDeviceStyles();
  loadUserMembership();
  
  // Initialize modules
  initModules();
  
  // Listen for resize
  window.addEventListener('resize', applyDeviceStyles);
});

// Initialize all modules
function initModules() {
  // Auth Module
  if (window.AuthModule) {
    AuthModule.init();
  }
  
  // Profile Module
  if (window.ProfileModule) {
    ProfileModule.init();
  }
  
  // Marketplace Module
  if (window.MarketplaceModule) {
    MarketplaceModule.init();
  }
  
  // Chat Module
  if (window.ChatModule) {
    ChatModule.init();
  }
  
  // Community Module
  if (window.CommunityModule) {
    CommunityModule.init();
  }
  
  // Discovery Module
  if (window.DiscoveryModule) {
    DiscoveryModule.init();
  }
  
  // Matching Module
  if (window.MatchingModule) {
    MatchingModule.init();
  }
  
  // AI Assistant Module
  if (window.AIAssistantModule) {
    AIAssistantModule.init();
  }
  
  // Social Module
  if (window.SocialModule) {
    // Social module doesn't need init
  }
  
  // Notification Module
  if (window.NotificationModule) {
    NotificationModule.init();
  }
  
  // Library Module
  if (window.LibraryModule) {
    LibraryModule.init();
  }
  
  // Games Module
  if (window.GamesModule) {
    GamesModule.init();
  }
  
  console.log('All modules initialized ✅');
}

window.addEventListener('resize', applyDeviceStyles);

/* ================= MEMBERSHIP SYSTEM ================= */
function loadUserMembership() {
  const savedMembership = localStorage.getItem('dkanan_membership');
  if (savedMembership) {
    userMembership = savedMembership;
    updateMembershipUI();
  }
}

function updateMembershipUI() {
  // Update navbar if logged in
  const membershipLink = document.querySelector('.membership-link');
  if (membershipLink && userMembership !== 'free') {
    membershipLink.innerHTML = `<i class="fas fa-crown"></i> ${userMembership.charAt(0).toUpperCase() + userMembership.slice(1)}`;
    membershipLink.style.color = userMembership === 'premium' ? 'var(--primary)' : '#9b59b6';
  }
}

window.openPaymentModal = function(plan) {
  const modal = document.getElementById('paymentModal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  const plans = {
    premium: {
      name: 'Premium',
      price: 19,
      features: ['Unlimited artworks', 'AI assistant tools', 'Priority listing', '10% commission fee']
    },
    advanced: {
      name: 'Advanced',
      price: 49,
      features: ['Pro profile with badge', 'Full AI suite', 'Featured listings', 'Analytics dashboard', '5% commission fee']
    }
  };
  
  const selectedPlan = plans[plan];
  
  document.getElementById('paymentTitle').textContent = `Upgrade to ${selectedPlan.name}`;
  document.getElementById('paymentSubtitle').textContent = `Unlock ${selectedPlan.name.toLowerCase()} features`;
  document.getElementById('planName').textContent = selectedPlan.name;
  document.getElementById('planPrice').textContent = `$${selectedPlan.price}/month`;
  document.getElementById('paymentAmount').textContent = `$${selectedPlan.price}`;
  
  // Update features preview
  const featuresList = document.getElementById('planFeaturesPreview').querySelector('ul');
  featuresList.innerHTML = selectedPlan.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('');
  
  // Store selected plan
  modal.dataset.plan = plan;
};

window.closePaymentModal = function() {
  const modal = document.getElementById('paymentModal');
  if (modal) modal.style.display = 'none';
};

// Card number formatting
document.addEventListener('DOMContentLoaded', function() {
  const cardNumberInput = document.getElementById('cardNumber');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
      let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
      e.target.value = formattedValue;
    });
  }
  
  const cardExpiryInput = document.getElementById('cardExpiry');
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      e.target.value = value;
    });
  }
});

window.processPayment = function(event) {
  event.preventDefault();
  
  const modal = document.getElementById('paymentModal');
  const plan = modal.dataset.plan;
  
  // Get form values
  const cardName = document.getElementById('cardName').value;
  const cardNumber = document.getElementById('cardNumber').value;
  const cardExpiry = document.getElementById('cardExpiry').value;
  const cardCvv = document.getElementById('cardCvv').value;
  const billingEmail = document.getElementById('billingEmail').value;
  
  // Basic validation
  if (!cardName || !cardNumber || !cardExpiry || !cardCvv || !billingEmail) {
    alert('Please fill in all fields');
    return;
  }
  
  if (cardNumber.replace(/\s/g, '').length < 16) {
    alert('Please enter a valid card number');
    return;
  }
  
  if (cardCvv.length < 3) {
    alert('Please enter a valid CVV');
    return;
  }
  
  // Show processing state
  const submitBtn = document.getElementById('paymentSubmitBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  submitBtn.disabled = true;
  
  // Simulate payment processing (in production, use Stripe API)
  setTimeout(function() {
    // Update membership
    userMembership = plan;
    localStorage.setItem('dkanan_membership', plan);
    
    // Update user data
    if (currentUser) {
      currentUser.membership = plan;
      localStorage.setItem('dkanan_user', JSON.stringify(currentUser));
    }
    
    // Show success
    alert(`🎉 Payment Successful!\n\nYou are now a ${plan.charAt(0).toUpperCase() + plan.slice(1)} member!\n\nYour subscription will renew monthly.`);
    
    closePaymentModal();
    updateMembershipUI();
    
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Clear form
    document.getElementById('paymentForm').reset();
    
  }, 2000);
};

window.showCurrentPlan = function() {
  alert(`Your current plan: ${userMembership.charAt(0).toUpperCase() + userMembership.slice(1)}\n\nVisit the Membership section to upgrade!`);
};

/* ================= NAVIGATION ================= */
window.showSection = function(section) {
  const sections = ['home', 'exhibition', 'marketplace', 'community', 'news', 'commissions', 'jobs', 'profile', 'membership'];
  
  // Hide all sections
  sections.forEach(s => {
    const el = document.getElementById(s + 'Section');
    if (el) el.style.display = 'none';
  });
  
  // Show target section
  const target = document.getElementById(section + 'Section');
  if (target) {
    target.style.display = 'block';
    target.scrollIntoView({ behavior: 'smooth' });
  }
  
  // Update navbar active state
  document.querySelectorAll('.nav-right a').forEach(link => {
    link.classList.remove('active');
  });
  
  // Close mobile menu
  document.querySelector('.nav-right').classList.remove('mobile-active');
};

window.toggleMobileMenu = function() {
  document.querySelector('.nav-right').classList.toggle('mobile-active');
};

/* ================= AUTHENTICATION ================= */
window.openAuthModal = function(mode) {
  authMode = mode;
  const modal = document.getElementById('authModal');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  const title = document.getElementById('authTitle');
  const btnText = document.getElementById('authBtnText');
  const switchText = document.getElementById('authSwitchText');
  const switchLink = document.getElementById('authSwitchLink');
  
  if (title) title.innerText = mode === 'login' ? 'Welcome Back' : 'Join DKANAN';
  if (btnText) btnText.innerText = mode === 'login' ? 'Login' : 'Create Account';
  if (switchText) switchText.innerText = mode === 'login' ? "Don't have an account?" : "Already have an account?";
  if (switchLink) switchLink.innerText = mode === 'login' ? 'Sign Up' : 'Login';
};

window.closeAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
};

window.toggleAuthMode = function() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  openAuthModal(authMode);
};

window.handleAuth = async function() {
  const emailInput = document.getElementById('authEmail');
  const passwordInput = document.getElementById('authPassword');
  const nameInput = document.getElementById('authName');
  
  if (!emailInput || !passwordInput) return;
  
  const email = emailInput.value;
  const password = passwordInput.value;
  const name = nameInput ? nameInput.value : '';
  
  // Get selected role
  const roleRadio = document.querySelector('input[name="userRole"]:checked');
  userRole = roleRadio ? roleRadio.value : 'visitor';
  
  if (!email || !password) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (authMode === 'signup' && password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  // Simulate auth (in production, use Firebase)
  try {
    if (authMode === 'signup') {
      // Create account simulation
      currentUser = {
        uid: 'user_' + Date.now(),
        email: email,
        displayName: name || 'User',
        role: userRole
      };
      
      // Save to localStorage
      localStorage.setItem('dkanan_user', JSON.stringify(currentUser));
      alert('Account created successfully! ✅\nWelcome to DKANAN, ' + (name || 'User') + '!');
    } else {
      // Login simulation
      const savedUser = localStorage.getItem('dkanan_user');
      if (savedUser) {
        currentUser = JSON.parse(savedUser);
      } else {
        currentUser = {
          uid: 'user_' + Date.now(),
          email: email,
          displayName: 'User',
          role: userRole
        };
        localStorage.setItem('dkanan_user', JSON.stringify(currentUser));
      }
      alert('Login successful! 🚀');
    }
    
    closeAuthModal();
    updateUIForAuth();
    
    // Update profile section if logged in
    updateProfileSection();
    
  } catch (error) {
    alert('Error: ' + error.message);
  }
};

window.logoutUser = function() {
  currentUser = null;
  localStorage.removeItem('dkanan_user');
  alert('Logged out successfully');
  updateUIForAuth();
};

window.socialLogin = function(provider) {
  alert('Social login coming soon! This feature will allow you to sign in with ' + provider.charAt(0).toUpperCase() + provider.slice(1) + '.');
};

function updateUIForAuth() {
  const authButtons = document.getElementById('authButtons');
  const logoutBtn = document.querySelector('.logout-btn');
  const profileBtn = document.querySelector('.profile-btn');
  const navProfileImg = document.getElementById('navProfileImg');
  
  // Check for saved user
  const savedUser = localStorage.getItem('dkanan_user');
  if (savedUser && !currentUser) {
    currentUser = JSON.parse(savedUser);
  }
  
  if (currentUser) {
    if (authButtons) authButtons.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (profileBtn) profileBtn.style.display = 'inline-block';
    
    // Update profile image
    if (navProfileImg && currentUser.photoURL) {
      navProfileImg.src = currentUser.photoURL;
    }
  } else {
    if (authButtons) authButtons.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (profileBtn) profileBtn.style.display = 'none';
  }
}

function updateProfileSection() {
  if (!currentUser) return;
  
  const profileName = document.getElementById('profileName');
  const profileRole = document.getElementById('profileRole');
  const profileAvatar = document.getElementById('profileAvatar');
  const userPostAvatar = document.getElementById('userPostAvatar');
  
  if (profileName) {
    profileName.innerText = currentUser.displayName || 'User';
  }
  
  if (profileRole) {
    const role = currentUser.role || 'visitor';
    profileRole.innerText = role.charAt(0).toUpperCase() + role.slice(1);
  }
  
  // Update avatars
  const avatarSrc = currentUser.photoURL || 'assets/default-avatar.png';
  if (profileAvatar) profileAvatar.src = avatarSrc;
  if (userPostAvatar) userPostAvatar.src = avatarSrc;
}

/* ================= EXHIBITION ================= */
window.filterExhibition = function(category) {
  const items = document.querySelectorAll('.exhibition-item');
  const buttons = document.querySelectorAll('.exhibition-filters .filter-btn');
  
  // Update active button
  buttons.forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }
  
  // Filter items
  items.forEach(item => {
    if (category === 'all' || item.dataset.category === category) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
};

/* ================= MARKETPLACE ================= */
window.filterMarketplace = function(category) {
  console.log('Filtering marketplace by:', category);
  // In production, this would filter actual data
};

window.sortMarketplace = function(sort) {
  console.log('Sorting marketplace by:', sort);
  // In production, this would sort actual data
};

window.openArtworkDetail = function(id) {
  alert('Opening artwork details for ID: ' + id + '\n\nThis would show a detailed view of the artwork with purchase options.');
};

/* ================= COMMUNITY ================= */
window.showCommunityTab = function(tab) {
  const tabs = document.querySelectorAll('#communitySection .community-tab');
  const buttons = document.querySelectorAll('#communitySection .tab-btn');
  
  tabs.forEach(t => t.classList.remove('active'));
  buttons.forEach(b => b.classList.remove('active'));
  
  const targetTab = document.getElementById(tab + 'Tab');
  if (targetTab) targetTab.classList.add('active');
  
  if (event && event.target) {
    event.target.classList.add('active');
  }
};

window.createPost = function() {
  const postContent = document.getElementById('postContent');
  if (!postContent) return;
  
  const content = postContent.value.trim();
  if (!content) {
    alert('Please write something to post');
    return;
  }
  
  // Create post simulation
  const feedPosts = document.getElementById('feedPosts');
  if (feedPosts) {
    const newPost = document.createElement('div');
    newPost.className = 'post-card';
    newPost.innerHTML = `
      <div class="post-header">
        <img src="${currentUser?.photoURL || 'assets/default-avatar.png'}" class="post-author-img">
        <div class="post-author-info">
          <h4>${currentUser?.displayName || 'User'}</h4>
          <span class="post-meta">Just now • <span class="role-badge ${userRole}">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span></span>
        </div>
        <button class="post-menu"><i class="fas fa-ellipsis-h"></i></button>
      </div>
      <div class="post-content-text">${content}</div>
      <div class="post-stats">
        <span><i class="fas fa-heart"></i> 0</span>
        <span><i class="fas fa-comment"></i> 0</span>
        <span><i class="fas fa-share"></i> 0</span>
      </div>
      <div class="post-actions-bar">
        <button class="action-like"><i class="far fa-heart"></i> Like</button>
        <button class="action-comment"><i class="far fa-comment"></i> Comment</button>
        <button class="action-share"><i class="far fa-share-square"></i> Share</button>
      </div>
    `;
    
    feedPosts.insertBefore(newPost, feedPosts.firstChild);
  }
  
  postContent.value = '';
  alert('Post created successfully! 🎨');
};

/* ================= COMMISSIONS ================= */
window.showCommissionsTab = function(tab) {
  const tabs = document.querySelectorAll('#commissionsSection .commissions-tab');
  const buttons = document.querySelectorAll('#commissionsSection .tab-btn');
  
  tabs.forEach(t => t.classList.remove('active'));
  buttons.forEach(b => b.classList.remove('active'));
  
  if (tab === 'open') {
    const openTab = document.getElementById('openCommissions');
    if (openTab) openTab.classList.add('active');
    if (buttons[0]) buttons[0].classList.add('active');
  } else if (tab === 'requests') {
    const requestsTab = document.getElementById('requestsTab');
    if (requestsTab) requestsTab.classList.add('active');
    if (buttons[1]) buttons[1].classList.add('active');
  } else if (tab === 'tenders') {
    const tendersTab = document.getElementById('tendersTab');
    if (tendersTab) tendersTab.classList.add('active');
    if (buttons[2]) buttons[2].classList.add('active');
  }
};

/* ================= PROFILE ================= */
window.showProfileTab = function(tab) {
  const tabs = document.querySelectorAll('#profileSection .profile-tab');
  const buttons = document.querySelectorAll('#profileSection .tab-btn');
  
  tabs.forEach(t => t.classList.remove('active'));
  buttons.forEach(b => b.classList.remove('active'));
  
  const targetTab = document.getElementById('profile' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (targetTab) targetTab.classList.add('active');
  
  if (event && event.target) {
    event.target.classList.add('active');
  }
};

window.openEditProfile = function() {
  alert('Edit Profile Modal\n\nIn a full implementation, this would open a form to edit your profile information, bio, skills, and contact details.');
};

/* ================= AI ASSISTANT ================= */
window.toggleAIAssistant = function() {
  const ai = document.getElementById('aiAssistant');
  if (ai) {
    ai.style.display = ai.style.display === 'none' ? 'flex' : 'none';
  }
};

window.handleAIInput = function(event) {
  if (event.key === 'Enter') {
    sendAIMessage();
  }
};

window.sendAIMessage = function() {
  const input = document.getElementById('aiInput');
  const messages = document.getElementById('aiMessages');
  
  if (!input || !messages) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  // Add user message
  const userMsg = document.createElement('div');
  userMsg.className = 'ai-message user';
  userMsg.innerHTML = `<p>${message}</p>`;
  messages.appendChild(userMsg);
  
  input.value = '';
  messages.scrollTop = messages.scrollHeight;
  
  // Simulate AI response
  setTimeout(() => {
    const responses = [
      {
        query: ['price', 'cost', 'sell', 'money'],
        response: `<p>Great question about pricing! Here are some tips:</p>
<ul>
<li>Research similar artists' work</li>
<li>Consider time, materials, and expertise</li>
<li>Start competitive, then increase with demand</li>
<li>Factor in platform fees</li>
</ul>
<p>Would you like more specific guidance?</p>`
      },
      {
        query: ['inspiration', 'idea', 'create', 'creative'],
        response: `<p>Here are some ways to find inspiration:</p>
<ul>
<li>Explore the Exhibition section</li>
<li>Join community discussions</li>
<li>Try the weekly art challenges</li>
<li>Look at trending styles in Marketplace</li>
</ul>
<p>Keep creating! 🎨</p>`
      },
      {
        query: ['default'],
        response: `<p>Thank you for your question! I'm here to help with:</p>
<ul>
<li>Finding art inspiration</li>
<li>Pricing your artwork</li>
<li>Marketing tips</li>
<li>Technical questions</li>
<li>Platform features</li>
</ul>
<p>Could you be more specific so I can assist you better?</p>`
      }
    ];
    
    // Find matching response
    let response = responses.find(r => r.query.includes('default'));
    for (let r of responses) {
      if (r.query !== 'default' && r.query.some(keyword => message.toLowerCase().includes(keyword))) {
        response = r;
        break;
      }
    }
    
    const botMsg = document.createElement('div');
    botMsg.className = 'ai-message bot';
    botMsg.innerHTML = response.response;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
  }, 1000);
};

/* ================= CHAT WIDGET ================= */
window.toggleChatWidget = function() {
  const chat = document.getElementById('chatWidget');
  if (chat) {
    chat.style.display = chat.style.display === 'none' ? 'flex' : 'none';
  }
};

window.sendChatMessage = function() {
  const input = document.getElementById('chatWidgetInput');
  const messages = document.getElementById('chatMessages');
  
  if (!input || !messages) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  // Add user message
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message sent';
  msgDiv.innerHTML = `
    <div class="message-content">
      <p>${message}</p>
      <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    </div>
  `;
  messages.appendChild(msgDiv);
  
  input.value = '';
  messages.scrollTop = messages.scrollHeight;
  
  // Simulate response
  setTimeout(() => {
    const responses = [
      "That's awesome! Keep creating! 🎨",
      "I'd love to see your work!",
      "Great to hear from you!",
      "Welcome to the community!"
    ];
    
    const responseDiv = document.createElement('div');
    responseDiv.className = 'chat-message received';
    responseDiv.innerHTML = `
      <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User">
      <div class="message-content">
        <p>${responses[Math.floor(Math.random() * responses.length)]}</p>
        <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
    `;
    messages.appendChild(responseDiv);
    messages.scrollTop = messages.scrollHeight;
  }, 1500);
};

/* ================= UTILITY FUNCTIONS ================= */

// Handle click outside modals
document.addEventListener('click', function(e) {
  const authModal = document.getElementById('authModal');
  if (e.target === authModal) {
    closeAuthModal();
  }
});

// Handle escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeAuthModal();
    const ai = document.getElementById('aiAssistant');
    if (ai && ai.style.display !== 'none') {
      toggleAIAssistant();
    }
    const chat = document.getElementById('chatWidget');
    if (chat && chat.style.display !== 'none') {
      toggleChatWidget();
    }
  }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Initialize profile if user exists
if (localStorage.getItem('dkanan_user')) {
  currentUser = JSON.parse(localStorage.getItem('dkanan_user'));
  updateUIForAuth();
  updateProfileSection();
}

console.log('DKANAN Script Loaded Successfully ✅');


/* ================= LOGIN MODAL ================= */
function openLogin() {
  document.getElementById("loginModal").style.display = "flex";
}

function closeLogin() {
  document.getElementById("loginModal").style.display = "none";
}


/* ================= ABOUT TOGGLE ================= */
function toggleAbout() {
  const about = document.getElementById("aboutSection");

  if (about.style.display === "block") {
    about.style.display = "none";
  } else {
    about.style.display = "block";
  }
}


/* ================= SIGNUP ================= */
function signupUser() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Account Created ✅");
    })
    .catch((error) => {
      alert(error.message);
    });
}


/* ================= LOGIN ================= */
function loginUser() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {

      alert("Login Successful 🚀");

      user.isLoggedIn = true;
      user.role = "artist";
      user.plan = "free";

      localStorage.setItem("user", JSON.stringify(user));

      updateUI();
      closeLogin();

    })
    .catch((error) => {
      alert(error.message);
    });
}


/* ================= LOGOUT ================= */
function logoutUser() {

  signOut(auth).then(() => {

    user.isLoggedIn = false;
    user.role = "viewer";
    user.plan = "free";

    localStorage.removeItem("user");

    updateUI();

    alert("Logged Out");

  });
}


/* ================= INIT ================= */
window.addEventListener("load", () => {
  updateUI();
});