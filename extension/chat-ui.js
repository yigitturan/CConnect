// ================== CCONNECT UI - EXTERNAL JAVASCRIPT ==================
// Chat functionality with enhanced features

document.addEventListener('DOMContentLoaded', function() {
    console.log('Cconnect UI loaded successfully');
    
    // Tab navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        
        tab.classList.add('active');
        
        const targetContent = document.getElementById(targetTab === 'rooms' ? 'rooms-section' : 
                                                      targetTab === 'video' ? 'video-chat-container' : 
                                                      'chat-container');
        if (targetContent) {
          targetContent.classList.remove('hidden');
        }
      });
    });
    
    // Chat functionality
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    const messagesContainer = document.getElementById('messages-container');
    const emptyState = document.getElementById('empty-state');
    const characterCounter = document.querySelector('.character-counter');
    
    // Demo messages for testing
    const demoMessages = [
      { sender: 'test30', text: 'good', timestamp: Date.now() - 10000 },
      { sender: 'alice', text: 'Hello everyone!', timestamp: Date.now() - 8000 },
      { sender: 'bob', text: 'How is the sync working?', timestamp: Date.now() - 5000 },
      { sender: 'charlie', text: 'Great feature!', timestamp: Date.now() - 2000 }
    ];
    
    // Message colors for different users
    const userColors = [
      '#6366f1', '#8b5cf6', '#10b981', '#f59e0b', 
      '#ef4444', '#3b82f6', '#06b6d4', '#84cc16'
    ];
    
    function getUserColor(username) {
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      return userColors[Math.abs(hash) % userColors.length];
    }
    
    function addMessage(sender, text, isOwn = false) {
      // Hide empty state
      if (emptyState) {
        emptyState.style.display = 'none';
      }
      
      // Create message element
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${isOwn ? 'own-message' : 'other-message'}`;
      
      // Create message content with badge-style username
      const senderColor = getUserColor(sender);
      messageDiv.innerHTML = `
        <span class="message-sender" style="--sender-color: ${senderColor}; background: ${senderColor};">${sender}</span>
        <span class="message-separator">:</span>
        <span class="message-text">${text}</span>
        <span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      `;
      
      // Add to container
      messagesContainer.appendChild(messageDiv);
      
      // Auto scroll to bottom with smooth animation
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
      
      // Add entrance animation
      requestAnimationFrame(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        requestAnimationFrame(() => {
          messageDiv.style.transition = 'all 0.3s ease-out';
          messageDiv.style.opacity = '1';
          messageDiv.style.transform = 'translateY(0)';
        });
      });
    }
    
    function sendMessage() {
      const text = messageInput.value.trim();
      if (!text) return;
      
      addMessage('You', text, true);
      messageInput.value = '';
      updateCharacterCounter();
      
      // Simulate response (demo)
      setTimeout(() => {
        const responses = [
          'Interesting!', 'I agree', 'That makes sense', 'Good point!', 
          'Thanks for sharing', 'Exactly!', 'Nice one', 'Cool!'
        ];
        const randomUser = ['alice', 'bob', 'charlie'][Math.floor(Math.random() * 3)];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomUser, randomResponse, false);
      }, 1000 + Math.random() * 2000);
    }
    
    function updateCharacterCounter() {
      if (messageInput && characterCounter) {
        const length = messageInput.value.length;
        characterCounter.textContent = `${length}/500 characters`;
        
        // Color coding for character limit
        if (length > 450) {
          characterCounter.style.color = '#ef4444';
        } else if (length > 350) {
          characterCounter.style.color = '#f59e0b';
        } else {
          characterCounter.style.color = '#94a3b8';
        }
      }
    }
    
    // Event listeners
    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendMessage();
        }
      });
      
      messageInput.addEventListener('input', updateCharacterCounter);
    }
    
    // Load demo messages for testing
    setTimeout(() => {
      demoMessages.forEach((msg, index) => {
        setTimeout(() => {
          addMessage(msg.sender, msg.text, false);
        }, index * 500);
      });
    }, 1000);
    
    // Demo: Show main app instead of login
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    // Auto-switch to chat tab for demo
    setTimeout(() => {
      const chatTab = document.querySelector('.nav-tab[data-tab="chat"]');
      if (chatTab) {
        chatTab.click();
      }
    }, 2000);
    
    // ================== INTEGRATION WITH EXISTING SIDEPANEL.JS ==================
    
    // Function to integrate with main chat system
    function integrateChatSystem() {
      // This function will be called by sidepanel.js to integrate the UI
      window.chatUI = {
        addMessage: addMessage,
        getUserColor: getUserColor,
        messagesContainer: messagesContainer,
        messageInput: messageInput,
        sendBtn: sendBtn
      };
      
      console.log('Chat UI integration ready');
    }
    
    // Call integration
    integrateChatSystem();
    
    // Export functions for sidepanel.js
    window.chatUIFunctions = {
      displayMessage: function(message) {
        // Enhanced version for sidepanel.js
        const messageEl = document.createElement("div");
        messageEl.className = message.sender === window.appState?.currentUser ? "own-message" : "other-message";
        
        const senderColor = getUserColor(message.sender);
        messageEl.innerHTML = `
          <span class="message-sender" style="background: ${senderColor};">${message.sender}</span>
          <span class="message-separator">:</span>
          <span class="message-text">${message.text}</span>
          <span class="message-time">${new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        `;
        
        if (messagesContainer) {
          messagesContainer.appendChild(messageEl);
          
          // Auto scroll
          setTimeout(() => {
            messagesContainer.scrollTo({
              top: messagesContainer.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
      },
      
      scrollToBottom: function() {
        if (messagesContainer) {
          messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
          });
        }
      },
      
      clearMessages: function() {
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
          if (emptyState) {
            emptyState.style.display = 'flex';
          }
        }
      }
    };
    
    console.log('Chat UI functions exported for sidepanel.js integration');
  });