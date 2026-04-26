// DKANAN - Social Media Integration Module
// Share to Facebook, Twitter, Reddit, embed Instagram & YouTube

const SocialModule = (function() {
  'use strict';
  
  // Social platform configs
  const PLATFORMS = {
    facebook: {
      name: 'Facebook',
      icon: 'fab fa-facebook',
      color: '#1877F2',
      shareUrl: 'https://www.facebook.com/sharer/sharer.php'
    },
    twitter: {
      name: 'Twitter',
      icon: 'fab fa-twitter',
      color: '#1DA1F2',
      shareUrl: 'https://twitter.com/intent/tweet'
    },
    reddit: {
      name: 'Reddit',
      icon: 'fab fa-reddit',
      color: '#FF4500',
      shareUrl: 'https://www.reddit.com/submit'
    },
    linkedin: {
      name: 'LinkedIn',
      icon: 'fab fa-linkedin',
      color: '#0A66C2',
      shareUrl: 'https://www.linkedin.com/sharing/share-offsite'
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: 'fab fa-whatsapp',
      color: '#25D366',
      shareUrl: 'https://api.whatsapp.com/send'
    },
    pinterest: {
      name: 'Pinterest',
      icon: 'fab fa-pinterest',
      color: '#BD081C',
      shareUrl: 'https://pinterest.com/pinterest/pinit'
    }
  };
  
  // Share post/artwork
  function sharePost(postId, content, imageUrl = '', title = '') {
    const shareData = {
      postId,
      content: content || 'Check out this artwork on DKANAN!',
      imageUrl,
      title: title || 'DKANAN - Art Platform',
      url: `${window.location.origin}/post/${postId}`
    };
    
    showShareModal(shareData);
  }
  
  // Share artwork
  function shareArtwork(artworkId, title, imageUrl, price = '') {
    const shareData = {
      artworkId,
      content: `Check out "${title}" on DKANAN! ${price ? `Price: $${price}` : ''}`,
      imageUrl,
      title: title,
      url: `${window.location.origin}/artwork/${artworkId}`
    };
    
    showShareModal(shareData);
  }
  
  // Share to specific platform
  function shareToPlatform(platform, shareData) {
    const config = PLATFORMS[platform];
    if (!config) return;
    
    let url = '';
    const encodedUrl = encodeURIComponent(shareData.url);
    const encodedText = encodeURIComponent(shareData.content);
    const encodedTitle = encodeURIComponent(shareData.title);
    
    switch (platform) {
      case 'facebook':
        url = `${config.shareUrl}?u=${encodedUrl}`;
        break;
      case 'twitter':
        url = `${config.shareUrl}?text=${encodedText}&url=${encodedUrl}`;
        break;
      case 'reddit':
        url = `${config.shareUrl}?url=${encodedUrl}&title=${encodedTitle}`;
        break;
      case 'linkedin':
        url = `${config.shareUrl}?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        url = `${config.shareUrl}?text=${encodedText}%20${encodedUrl}`;
        break;
      case 'pinterest':
        url = `${config.shareUrl}?url=${encodedUrl}&media=${encodeURIComponent(shareData.imageUrl)}&description=${encodedTitle}`;
        break;
    }
    
    // Open in new window
    window.open(url, '_blank', 'width=600,height=400');
  }
  
  // Copy link to clipboard
  function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
      showNotification('Link copied to clipboard!', 'success');
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showNotification('Link copied!', 'success');
    });
  }
  
  // Show share modal
  function showShareModal(shareData) {
    const modal = document.getElementById('shareModal');
    if (!modal) {
      // Create modal if not exists
      createShareModal();
    }
    
    const modalEl = document.getElementById('shareModal');
    modalEl.dataset.shareUrl = shareData.url;
    modalEl.dataset.shareText = shareData.content;
    modalEl.dataset.shareImage = shareData.imageUrl;
    
    // Render platform buttons
    const container = document.getElementById('sharePlatforms');
    if (container) {
      container.innerHTML = Object.entries(PLATFORMS).map(([key, platform]) => `
        <button class="share-platform-btn" style="background:${platform.color}" 
                onclick="SocialModule.shareToPlatform('${key}', {
                  url: '${shareData.url}',
                  content: '${shareData.content}',
                  imageUrl: '${shareData.imageUrl}',
                  title: '${shareData.title}'
                })">
          <i class="${platform.icon}"></i>
          <span>${platform.name}</span>
        </button>
      `).join('');
    }
    
    // Show modal
    document.getElementById('shareModal').style.display = 'flex';
  }
  
  // Create share modal
  function createShareModal() {
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content share-modal">
        <div class="modal-header">
          <h3>Share</h3>
          <button onclick="document.getElementById('shareModal').style.display='none'">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="share-platforms" id="sharePlatforms"></div>
          <div class="share-link">
            <input type="text" id="shareLinkInput" readonly>
            <button onclick="SocialModule.copyLink(document.getElementById('shareLinkInput').value)">
              <i class="fas fa-copy"></i> Copy
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  // Embed Instagram post
  function embedInstagram(postUrl, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Extract Instagram post ID
    const match = postUrl.match(/instagram\.com\/p\/([^\/]+)/);
    if (!match) {
      container.innerHTML = '<p>Invalid Instagram URL</p>';
      return;
    }
    
    const postId = match[1];
    container.innerHTML = `
      <iframe src="https://www.instagram.com/p/${postId}/embed" 
              frameborder="0" scrolling="no" allowtransparency="true">
      </iframe>
    `;
  }
  
  // Embed YouTube video
  function embedYouTube(videoUrl, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Extract video ID
    let videoId = '';
    const patterns = [
      /youtube\.com\/watch\?v=([^\&]+)/,
      /youtu\.be\/([^\?]+)/,
      /youtube\.com\/embed\/([^\?]+)/
    ];
    
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }
    
    if (!videoId) {
      container.innerHTML = '<p>Invalid YouTube URL</p>';
      return;
    }
    
    const { width = '100%', height = '315', autoplay = false } = options;
    const autoplayParam = autoplay ? '?autoplay=1' : '';
    
    container.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${videoId}${autoplayParam}"
        width="${width}" 
        height="${height}"
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
  }
  
  // Embed TikTok video
  function embedTikTok(videoUrl, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Extract TikTok video ID
    const match = videoUrl.match(/tiktok\.com\/@[\w]+\/video\/(\d+)/);
    if (!match) {
      container.innerHTML = '<p>Invalid TikTok URL</p>';
      return;
    }
    
    const videoId = match[1];
    container.innerHTML = `
      <iframe 
        src="https://www.tiktok.com/player/video/${videoId}?autoplay=0"
        frameborder="0" 
        allowtransparency="true"
        allowfullscreen>
      </iframe>
    `;
  }
  
  // Native share API (mobile)
  async function nativeShare(title, text, url) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return { success: true };
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error);
        }
        return { success: false, error: error.message };
      }
    }
    
    // Fallback to modal
    showShareModal({ title, content: text, url });
    return { success: false };
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
    PLATFORMS,
    sharePost,
    shareArtwork,
    shareToPlatform,
    copyLink,
    showShareModal,
    embedInstagram,
    embedYouTube,
    embedTikTok,
    nativeShare
  };
})();

window.SocialModule = SocialModule;