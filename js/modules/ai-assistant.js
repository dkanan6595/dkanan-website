// DKANAN - AI Assistant Module
// Chatbot for artists, artwork suggestions, career guidance

const AIAssistantModule = (function() {
  'use strict';
  
  // State
  let isOpen = false;
  let conversationHistory = [];
  const MAX_HISTORY = 50;
  
  // Predefined responses and suggestions
  const ART_SUGGESTIONS = [
    "Try exploring abstract expressionism - it allows for emotional freedom",
    "Consider digital art combined with traditional mediums for unique pieces",
    "Experiment with mixed media to add depth and texture to your work",
    "Look into art therapy techniques for stress relief and creative expression",
    "Study the works of contemporary Indian artists for inspiration"
  ];
  
  const CAREER_GUIDANCE = [
    "Build a strong online portfolio and maintain consistency in posting",
    "Network with other artists both online and at local galleries",
    "Consider diversifying your income with prints, merchandise, and commissions",
    "Keep learning and evolving your style while staying true to your vision",
    "Document your creative process - it adds value to your artwork"
  ];
  
  const TECHNIQUE_TIPS = [
    "For better color mixing, use a limited palette and mix colors on the canvas",
    "Try the 'fat over lean' technique in oil painting to prevent cracking",
    "Use glazing to create depth and luminosity in acrylics",
    "Practice gesture drawing daily to improve your figure work",
    "Experiment with different brush techniques: dry brush, wet on wet, impasto"
  ];
  
  // Initialize
  function init() {
    // Load conversation from localStorage
    const saved = localStorage.getItem('dkanan_ai_conversation');
    if (saved) {
      conversationHistory = JSON.parse(saved);
    }
  }
  
  // Toggle AI Assistant
  function toggleAIAssistant() {
    isOpen = !isOpen;
    const container = document.getElementById('aiAssistantContainer');
    
    if (container) {
      container.style.display = isOpen ? 'flex' : 'none';
      
      if (isOpen && conversationHistory.length === 0) {
        // Send welcome message
        sendMessage("Hello! I'm your AI Art Assistant. I can help you with:\n\n🎨 Art suggestions & ideas\n💼 Career guidance\n🖌️ Technique tips\n💰 Pricing your work\n📢 Marketing your art\n\nHow can I help you today?", 'bot');
      }
    }
  }
  
  // Send message
  async function sendMessage(content, sender = 'user') {
    // Add to history
    conversationHistory.push({
      sender: sender,
      content: content,
      timestamp: Date.now()
    });
    
    // Trim history
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }
    
    // Save to localStorage
    localStorage.setItem('dkanan_ai_conversation', JSON.stringify(conversationHistory));
    
    // Render message
    renderMessage(content, sender);
    
    // If user message, generate response
    if (sender === 'user') {
      // Show typing indicator
      showTypingIndicator();
      
      // Generate response after delay
      setTimeout(() => {
        hideTypingIndicator();
        const response = generateResponse(content);
        sendMessage(response, 'bot');
      }, 1000 + Math.random() * 1000);
    }
    
    // Scroll to bottom
    scrollToBottom();
  }
  
  // Generate AI response
  function generateResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Greetings
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return "Hello! I'm here to help you with your artistic journey. What would you like to know?";
    }
    
    // Art ideas and suggestions
    if (message.includes('idea') || message.includes('suggest') || message.includes('inspiration')) {
      return getRandomSuggestion(ART_SUGGESTIONS) + "\n\nWould you like more suggestions?";
    }
    
    // Career guidance
    if (message.includes('career') || message.includes('business') || message.includes('money') || 
        message.includes('sell') || message.includes('price') || message.includes('marketing')) {
      return getRandomSuggestion(CAREER_GUIDANCE) + "\n\nWould you like more specific advice?";
    }
    
    // Technique and tips
    if (message.includes('technique') || message.includes('tip') || message.includes('how to') ||
        message.includes('learn') || message.includes('improve') || message.includes('skill')) {
      return getRandomSuggestion(TECHNIQUE_TIPS) + "\n\nWant to learn more about a specific technique?";
    }
    
    // Portfolio
    if (message.includes('portfolio') || message.includes('showcase') || message.includes('display')) {
      return "Here are portfolio tips:\n\n📸 Use high-quality images with consistent lighting\n📝 Write compelling descriptions for each piece\n🎯 Curate your best work - quality over quantity\n🌐 Use platforms like Behance, DeviantArt, or your own website\n📅 Update regularly to show growth\n\nWould you like more advice?";
    }
    
    // Commissions
    if (message.includes('commission') || message.includes('custom')) {
      return "Commission tips:\n\n💰 Set clear pricing based on size, complexity, and timeline\n📋 Create a contract with deliverables and revision limits\n⏰ Set realistic deadlines and communicate progress\n🎨 Ask for references and preferences upfront\n💳 Request deposit (usually 25-50%)\n\nNeed help with commission pricing?";
    }
    
    // Social media
    if (message.includes('social') || message.includes('instagram') || message.includes('facebook') ||
        message.includes('twitter') || message.includes('promote')) {
      return "Social media tips for artists:\n\n📱 Post consistently (3-5 times per week)\n🎨 Show your process - people love behind-the-scenes\n💬 Engage with your audience and other artists\n🏷️ Use relevant hashtags (mix of popular and niche)\n📅 Use analytics to understand what works\n🤝 Collaborate with other artists\n\nWant platform-specific advice?";
    }
    
    // Pricing
    if (message.includes('price') || message.includes('cost') || message.includes('expensive') ||
        message.includes('cheap') || message.includes('value')) {
      return "Pricing your art:\n\n🧮 Formula: (Hours × Hourly Rate) + Materials + Overhead\n📊 Research similar artists' prices\n💎 Consider your experience and reputation\n📈 Start higher - you can always negotiate down\n🎁 Don't undervalue your work\n\nWould you like a pricing calculator?";
    }
    
    // Materials
    if (message.includes('material') || message.includes('supply') || message.includes('paint') ||
        message.includes('canvas') || message.includes('tool')) {
      return "Material recommendations:\n\n🖌️ Start with quality basics - you can upgrade later\n📦 Buy in bulk for discounts\n🎨 For oils: Winsor & Newton, Gamblin\n🎨 For acrylics: Golden, Liquitex\n🖼️ For canvas: stretched canvas or panels\n✏️ For drawing: Prismacolor, Faber-Castell\n\nWhat medium do you work with?";
    }
    
    // Block/creative block
    if (message.includes('block') || message.includes('stuck') || message.includes('no idea') ||
        message.includes('blank')) {
      return "Overcoming creative block:\n\n🎲 Try random prompts or challenges\n🚶 Take a walk and observe your surroundings\n📚 Look at art books or visit galleries\n🎵 Listen to music or try a new environment\n✏️ Just start - don't wait for perfect ideas\n🔄 Try a different medium or technique\n\nRemember: creativity is a muscle - use it or lose it!";
    }
    
    // Thank you
    if (message.includes('thank') || message.includes('thanks')) {
      return "You're welcome! Feel free to ask if you have more questions. Good luck with your art journey! 🎨";
    }
    
    // Goodbye
    if (message.includes('bye') || message.includes('goodbye') || message.includes('see you')) {
      return "Goodbye! Remember: Every artist was once a beginner. Keep creating! 🌟";
    }
    
    // Default response
    return "I'm here to help with your artistic journey. You can ask me about:\n\n🎨 Art ideas & inspiration\n💼 Career & business tips\n🖌️ Techniques & skills\n💰 Pricing your work\n📢 Marketing & social media\n\nWhat would you like to know?";
  }
  
  // Get random suggestion
  function getRandomSuggestion(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  // Render message
  function renderMessage(content, sender) {
    const container = document.getElementById('aiMessages');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${sender}`;
    messageDiv.innerHTML = `
      ${sender === 'bot' ? '<img src="assets/ai-avatar.png" class="ai-avatar">' : ''}
      <div class="message-content">
        <p>${content}</p>
        <span class="message-time">${formatTime(Date.now())}</span>
      </div>
    `;
    
    container.appendChild(messageDiv);
    scrollToBottom();
  }
  
  // Show typing indicator
  function showTypingIndicator() {
    const container = document.getElementById('aiMessages');
    if (!container) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'ai-message bot typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
      <img src="assets/ai-avatar.png" class="ai-avatar">
      <div class="message-content">
        <span class="typing-dots">
          <span></span><span></span><span></span>
        </span>
      </div>
    `;
    
    container.appendChild(indicator);
    scrollToBottom();
  }
  
  // Hide typing indicator
  function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  // Clear conversation
  function clearConversation() {
    conversationHistory = [];
    localStorage.removeItem('dkanan_ai_conversation');
    
    const container = document.getElementById('aiMessages');
    if (container) {
      container.innerHTML = '';
    }
    
    sendMessage("Conversation cleared. How can I help you?", 'bot');
  }
  
  // Scroll to bottom
  function scrollToBottom() {
    const container = document.getElementById('aiMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
  
  // Format time
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Public API
  return {
    init,
    toggleAIAssistant,
    sendMessage,
    clearConversation
  };
})();

window.AIAssistantModule = AIAssistantModule;