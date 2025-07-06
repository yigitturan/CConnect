// ================== FIXED SIDEPANEL - AUTH ERRORS RESOLVED ==================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Fixed Video Sync App v4.1 starting...");
  
  // ================== GLOBAL STATE ==================
  
  let appState = {
    currentUser: "",
    currentVideoRoom: "",
    currentChatRoom: "",
    database: null,
    initialized: false
  };
  
  // Master-Follower system
  let masterSystem = {
    active: false,
    currentMaster: "",
    iAmMaster: false,
    roomRef: null,
    usersRef: null,
    listener: null,
    heartbeatTimer: null
  };
  
  // Video sync system
  let videoSync = {
    active: false,
    roomRef: null,
    myRef: null,
    listener: null,
    updateTimer: null,
    followerTimer: null,
    lastState: null,
    syncing: false,
    lastSyncTime: 0,
    syncCooldown: 4000,
    maxSyncDifference: 2.5,
    consecutiveSyncs: 0,
    maxConsecutiveSyncs: 2
  };
  
  // Chat system
  let chatSystem = {
    active: false,
    messagesRef: null,
    listener: null
  };
  
  // WebRTC system
  let webrtcSystem = {
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    roomRef: null,
    isCameraOn: true,
    isMicOn: true,
    servers: {
      iceServers: [
        { 
          urls: [
            'stun:stun1.l.google.com:19302', 
            'stun:stun2.l.google.com:19302'
          ] 
        }
      ],
      iceCandidatePoolSize: 10
    }
  };
  
  // ================== DOM ELEMENTS ==================
  
  const elements = {
    // Main containers
    loginScreen: document.getElementById("login-screen"),
    signupScreen: document.getElementById("signup-screen"),
    appContainer: document.getElementById("app-container"),
    roomsSection: document.getElementById("rooms-section"),
    videoContainer: document.getElementById("video-chat-container"),
    chatContainer: document.getElementById("chat-container"),
    
    // Auth
    emailInput: document.getElementById("email"),
    passwordInput: document.getElementById("password"),
    signupEmailInput: document.getElementById("signup-email"),
    signupPasswordInput: document.getElementById("signup-password"),
    nicknameInput: document.getElementById("nickname"),
    loginBtn: document.getElementById("loginBtn"),
    signupBtn: document.getElementById("signupBtn"),
    googleLoginBtn: document.getElementById("googleLoginBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    statusEl: document.getElementById("status"),
    showSignupLink: document.getElementById("showSignup"),
    showLoginLink: document.getElementById("showLogin"),
    
    // Master-Follower
    masterToggleBtn: document.getElementById("masterToggleBtn"),
    masterStatus: document.getElementById("masterStatus"),
    currentMaster: document.getElementById("currentMaster"),
    
    // Video sync
    syncStatus: document.getElementById("syncStatus"),
    currentVideoTime: document.getElementById("currentVideoTime"),
    remoteVideoTime: document.getElementById("remoteVideoTime"),
    
    // Room management
    createVideoChatCodeBtn: document.getElementById("createVideoChatCodeBtn"),
    createChatCodeBtn: document.getElementById("createChatCodeBtn"),
    generatedVideoCode: document.getElementById("generatedVideoCode"),
    generatedChatCode: document.getElementById("generatedChatCode"),
    videoCodeDisplay: document.getElementById("videoCodeDisplay"),
    chatCodeDisplay: document.getElementById("chatCodeDisplay"),
    copyVideoCodeBtn: document.getElementById("copyVideoCodeBtn"),
    copyChatCodeBtn: document.getElementById("copyChatCodeBtn"),
    videoCodeInput: document.getElementById("videoCodeInput"),
    chatCodeInput: document.getElementById("chatCodeInput"),
    joinVideoRoomBtn: document.getElementById("joinVideoRoomBtn"),
    joinChatRoomBtn: document.getElementById("joinChatRoomBtn"),
    currentVideoCode: document.getElementById("currentVideoCode"),
    currentChatCode: document.getElementById("currentChatCode"),
    closeVideoChat: document.getElementById("closeVideoChat"),
    closeChatRoom: document.getElementById("closeChatRoom"),
    
    // Chat
    messagesContainer: document.getElementById("messages-container"),
    messageInput: document.getElementById("messageInput"),
    sendMessageBtn: document.getElementById("sendMessageBtn"),
    
    // Video chat
    localVideo: document.getElementById("localVideo"),
    remoteVideo: document.getElementById("remoteVideo"),
    startButton: document.getElementById("startButton"),
    hangupButton: document.getElementById("hangupButton"),
    cameraToggle: document.getElementById("cameraToggle"),
    micToggle: document.getElementById("micToggle"),
    videoStatus: document.getElementById("videoStatus")
  };
  
  // ================== FIREBASE SETUP - FIXED ==================
  
  const firebaseConfig = {
    apiKey: "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU",
    authDomain: "cconnectyigit.firebaseapp.com",
    databaseURL: "https://cconnectyigit-default-rtdb.firebaseio.com",
    projectId: "cconnectyigit",
    storageBucket: "cconnectyigit.appspot.com",
    messagingSenderId: "731610663845",
    appId: "1:731610663845:web:c0c1f537d86e391169764c",
    measurementId: "G-ZFHHZN4V5P"
  };
  
  function initFirebase() {
    try {
      if (typeof firebase === 'undefined') {
        console.error("❌ Firebase SDK not loaded");
        showMessage("Firebase SDK could not be loaded. Please refresh the page.", true);
        return false;
      }
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase app initialized");
      }
      
      appState.database = firebase.database();
      
      if (appState.database) {
        appState.database.goOnline();
        console.log("✅ Firebase database connected");
        
        // Connection test
        appState.database.ref('.info/connected').on('value', (snapshot) => {
          const connected = snapshot.val();
          console.log(`🔗 Firebase connection status: ${connected ? 'Connected' : 'Disconnected'}`);
        });
        
        return true;
      }
      
      throw new Error("Firebase database could not be initialized");
      
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      showMessage("Firebase connection failed. Please check your internet connection.", true);
      return false;
    }
  }
  
  // ================== UTILITY FUNCTIONS ==================
  
  function showMessage(message, isError = false) {
    console.log(isError ? "❌" : "✅", message);
    
    if (elements.statusEl) {
      elements.statusEl.textContent = message;
      elements.statusEl.className = isError ? "status-message error" : "status-message success";
      elements.statusEl.classList.remove("hidden");
      
      // Auto hide after 5 seconds
      setTimeout(() => {
        if (elements.statusEl) {
          elements.statusEl.classList.add("hidden");
          elements.statusEl.textContent = "";
        }
      }, 5000);
    }
    
    // Create toast notification
    createToastNotification(message, isError);
  }
  
  function createToastNotification(message, isError = false) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    
    // Style the toast
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isError ? '#ef4444' : '#10b981'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }
    }, 4000);
  }
  
  function updateSyncStatus(status) {
    if (elements.syncStatus) {
      elements.syncStatus.textContent = status;
      elements.syncStatus.style.color = status.includes("❌") ? "#ef4444" : 
                                        status.includes("✅") ? "#10b981" : "#f59e0b";
    }
  }
  
  function updateVideoTimes(myTime, remoteTime) {
    if (elements.currentVideoTime) elements.currentVideoTime.textContent = formatTime(myTime);
    if (elements.remoteVideoTime) elements.remoteVideoTime.textContent = formatTime(remoteTime);
  }
  
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  function generateCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ================== FIXED PASSWORD VALIDATION ==================
  
  function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  function setupPasswordValidation() {
    if (elements.signupPasswordInput) {
      elements.signupPasswordInput.addEventListener("input", () => {
        const password = elements.signupPasswordInput.value.trim();
        
        if (password.length === 0) {
          elements.signupPasswordInput.setCustomValidity("");
          return;
        }
        
        const validation = validatePassword(password);
        
        if (!validation.isValid) {
          elements.signupPasswordInput.setCustomValidity(validation.errors.join(", "));
        } else {
          elements.signupPasswordInput.setCustomValidity("");
        }
      });
    }
  }
  
  // ================== TAB NAVIGATION ==================
  
  function initTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        
        tab.classList.add('active');
        
        switch(targetTab) {
          case 'rooms':
            if (elements.roomsSection) elements.roomsSection.classList.remove('hidden');
            break;
          case 'video':
            if (elements.videoContainer) elements.videoContainer.classList.remove('hidden');
            break;
          case 'chat':
            if (elements.chatContainer) elements.chatContainer.classList.remove('hidden');
            break;
        }
        
        console.log("📂 Tab switched:", targetTab);
      });
    });
    
    console.log("📁 Tab navigation initialized");
  }
  
  // ================== FIXED AUTH SYSTEM ==================
  
  function initAuth() {
    // Screen navigation
    if (elements.showSignupLink) {
      elements.showSignupLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (elements.loginScreen) elements.loginScreen.classList.add("hidden");
        if (elements.signupScreen) elements.signupScreen.classList.remove("hidden");
      });
    }
    
    if (elements.showLoginLink) {
      elements.showLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
        if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
      });
    }
    
    // Fixed Login
    if (elements.loginBtn) {
      elements.loginBtn.addEventListener("click", async () => {
        const email = elements.emailInput?.value?.trim();
        const password = elements.passwordInput?.value?.trim();
        
        if (!email || !password) {
          showMessage("Please enter both email and password!", true);
          return;
        }
        
        if (!isValidEmail(email)) {
          showMessage("Please enter a valid email address!", true);
          return;
        }
        
        // Disable button during login
        elements.loginBtn.disabled = true;
        elements.loginBtn.textContent = "Signing in...";
        
        try {
          showMessage("Signing in...");
          
          const response = await sendToBackground("login", { email, password });
          
          if (response && response.success) {
            appState.currentUser = response.nickname || email.split('@')[0];
            showMainApp();
            showMessage("Welcome back!");
          } else {
            const errorMsg = getReadableErrorMessage(response?.error);
            showMessage(errorMsg, true);
          }
        } catch (error) {
          console.error("Login error:", error);
          showMessage("Login failed. Please try again.", true);
        } finally {
          // Re-enable button
          elements.loginBtn.disabled = false;
          elements.loginBtn.innerHTML = `
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10,17 15,12 10,7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span>Sign In</span>
          `;
        }
      });
    }
    
    // Fixed Signup
    if (elements.signupBtn) {
      elements.signupBtn.addEventListener("click", async () => {
        const email = elements.signupEmailInput?.value?.trim();
        const password = elements.signupPasswordInput?.value?.trim();
        const nickname = elements.nicknameInput?.value?.trim();
        
        if (!email || !password || !nickname) {
          showMessage("Please fill in all fields!", true);
          return;
        }
        
        if (!isValidEmail(email)) {
          showMessage("Please enter a valid email address!", true);
          return;
        }
        
        if (nickname.length < 2) {
          showMessage("Nickname must be at least 2 characters!", true);
          return;
        }
        
        const validation = validatePassword(password);
        if (!validation.isValid) {
          showMessage("Password requirements: " + validation.errors.join(", "), true);
          return;
        }
        
        // Disable button during signup
        elements.signupBtn.disabled = true;
        elements.signupBtn.textContent = "Creating account...";
        
        try {
          showMessage("Creating your account...");
          
          const response = await sendToBackground("signup", { email, password, nickname });
          
          if (response && response.success) {
            showMessage("Account created successfully! You can now sign in.");
            // Switch to login screen
            if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
            if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
            // Pre-fill email
            if (elements.emailInput) elements.emailInput.value = email;
          } else {
            const errorMsg = getReadableErrorMessage(response?.error);
            showMessage(errorMsg, true);
          }
        } catch (error) {
          console.error("Signup error:", error);
          showMessage("Account creation failed. Please try again.", true);
        } finally {
          // Re-enable button
          elements.signupBtn.disabled = false;
          elements.signupBtn.innerHTML = `
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Create Account</span>
          `;
        }
      });
    }
    
    // Fixed Google Login
    if (elements.googleLoginBtn) {
      elements.googleLoginBtn.addEventListener("click", async () => {
        // Disable button during login
        elements.googleLoginBtn.disabled = true;
        elements.googleLoginBtn.textContent = "Signing in with Google...";
        
        try {
          showMessage("Signing in with Google...");
          
          const response = await sendToBackground("googleLogin");
          
          if (response && response.success) {
            appState.currentUser = response.nickname || "User";
            showMainApp();
            showMessage("Google sign-in successful!");
          } else {
            const errorMsg = getReadableErrorMessage(response?.error);
            showMessage(errorMsg, true);
          }
        } catch (error) {
          console.error("Google login error:", error);
          showMessage("Google sign-in failed. Please try again.", true);
        } finally {
          // Re-enable button
          elements.googleLoginBtn.disabled = false;
          elements.googleLoginBtn.innerHTML = `
            <svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          `;
        }
      });
    }
    
    // Logout
    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener("click", () => {
        performLogout();
      });
    }
    
    // Enter key support
    if (elements.passwordInput) {
      elements.passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && elements.loginBtn && !elements.loginBtn.disabled) {
          elements.loginBtn.click();
        }
      });
    }
    
    if (elements.signupPasswordInput) {
      elements.signupPasswordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && elements.signupBtn && !elements.signupBtn.disabled) {
          elements.signupBtn.click();
        }
      });
    }
    
    console.log("🔐 Fixed auth system initialized");
  }
  
  // ================== HELPER FUNCTIONS ==================
  
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  function getReadableErrorMessage(error) {
    if (!error) return "An unknown error occurred. Please try again.";
    
    // Firebase error codes to readable messages
    const errorMap = {
      'EMAIL_EXISTS': 'An account with this email already exists.',
      'OPERATION_NOT_ALLOWED': 'Email/password accounts are not enabled.',
      'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many unsuccessful attempts. Please try again later.',
      'EMAIL_NOT_FOUND': 'No account found with this email address.',
      'INVALID_PASSWORD': 'The password is incorrect.',
      'USER_DISABLED': 'This account has been disabled.',
      'INVALID_EMAIL': 'The email address is invalid.',
      'WEAK_PASSWORD': 'The password is too weak.',
      'PASSWORD_VALIDATION_FAILED': 'Password does not meet requirements.',
      'GOOGLE_AUTH_ERROR': 'Google sign-in failed. Please try again.',
      'NETWORK_ERROR': 'Network error. Please check your connection.',
      'AUTH_TIMEOUT': 'Authentication request timed out. Please try again.'
    };
    
    const errorKey = typeof error === 'string' ? error : error.code || error.message;
    return errorMap[errorKey] || `Error: ${errorKey}`;
  }
  
  function showMainApp() {
    if (elements.loginScreen) elements.loginScreen.classList.add("hidden");
    if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
    if (elements.appContainer) elements.appContainer.classList.remove("hidden");
    
    const welcomeMsg = document.getElementById("welcomeMsg");
    if (welcomeMsg) welcomeMsg.textContent = `Hello, ${appState.currentUser}!`;
    
    // Switch to rooms tab
    const roomsTab = document.querySelector('.nav-tab[data-tab="rooms"]');
    if (roomsTab) roomsTab.click();
    
    console.log("✅ Main app shown for user:", appState.currentUser);
  }
  
  function performLogout() {
    console.log("🚪 Performing logout...");
    
    try {
      // Clean up all systems
      cleanup();
      
      // Reset state
      appState.currentUser = "";
      
      // Show login screen
      if (elements.appContainer) elements.appContainer.classList.add("hidden");
      if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
      
      // Clear inputs
      if (elements.emailInput) elements.emailInput.value = "";
      if (elements.passwordInput) elements.passwordInput.value = "";
      if (elements.signupEmailInput) elements.signupEmailInput.value = "";
      if (elements.signupPasswordInput) elements.signupPasswordInput.value = "";
      if (elements.nicknameInput) elements.nicknameInput.value = "";
      
      showMessage("Logged out successfully.");
      console.log("✅ Logout completed");
    } catch (error) {
      console.error("❌ Logout error:", error);
      showMessage("Logout completed.", false); // Don't show error to user
    }
  }
  
  async function sendToBackground(action, data = {}) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.error("Chrome runtime not available");
        resolve({ success: false, error: "CHROME_RUNTIME_NOT_AVAILABLE" });
        return;
      }
      
      const timeout = setTimeout(() => {
        console.error("Background script timeout");
        resolve({ success: false, error: "BACKGROUND_SCRIPT_TIMEOUT" });
      }, 30000); // 30 second timeout
      
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          console.error("Chrome runtime error:", chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: "NO_RESPONSE" });
        }
      });
    });
  }
  
  // ================== REMAINING SYSTEMS (UNCHANGED FOR NOW) ==================
  
  // Master-Follower System (keeping existing implementation)
  async function startMasterFollowerSystem(roomId) {
    console.log("👑 Starting Master-Follower system...");
    
    try {
      masterSystem.active = true;
      masterSystem.roomRef = appState.database.ref(`masterControl/${roomId}/currentMaster`);
      masterSystem.usersRef = appState.database.ref(`masterControl/${roomId}/users`);
      
      await masterSystem.usersRef.child(appState.currentUser).set({
        nickname: appState.currentUser,
        online: true,
        lastSeen: Date.now()
      });
      
      masterSystem.usersRef.child(appState.currentUser).onDisconnect().remove();
      
      masterSystem.listener = masterSystem.roomRef.on('value', (snapshot) => {
        const newMaster = snapshot.val();
        
        if (newMaster) {
          masterSystem.currentMaster = newMaster;
          masterSystem.iAmMaster = (newMaster === appState.currentUser);
          updateMasterUI();
          
          console.log("👑 Master:", newMaster, "Am I master:", masterSystem.iAmMaster);
        } else if (!masterSystem.currentMaster) {
          setMaster(appState.currentUser);
        }
      });
      
      startHeartbeat();
      updateMasterUI();
      console.log("✅ Master-Follower system started");
      
    } catch (error) {
      console.error("❌ Master-Follower startup error:", error);
      showMessage("Master system error!", true);
    }
  }
  
  function startHeartbeat() {
    masterSystem.heartbeatTimer = setInterval(async () => {
      if (masterSystem.active && masterSystem.usersRef) {
        try {
          await masterSystem.usersRef.child(appState.currentUser).update({
            lastSeen: Date.now(),
            online: true
          });
        } catch (error) {
          console.error("Heartbeat error:", error);
        }
      }
    }, 5000);
  }
  
  async function setMaster(nickname) {
    try {
      await masterSystem.roomRef.set(nickname);
      console.log("👑 Master set:", nickname);
    } catch (error) {
      console.error("Master setting error:", error);
    }
  }
  
  function updateMasterUI() {
    if (elements.masterStatus) {
      elements.masterStatus.textContent = masterSystem.iAmMaster ? "👑 YOU ARE MASTER" : "👤 Follower";
      elements.masterStatus.style.color = masterSystem.iAmMaster ? "#ffd700" : "#888";
      elements.masterStatus.style.fontWeight = masterSystem.iAmMaster ? "bold" : "normal";
    }
    
    if (elements.currentMaster) {
      elements.currentMaster.textContent = masterSystem.currentMaster || "---";
    }
    
    if (videoSync.active) {
      console.log("🔄 Role changed, restarting timers");
      videoSync.syncing = false;
      videoSync.lastSyncTime = 0;
      videoSync.consecutiveSyncs = 0;
      startRoleBasedTimers();
    }
  }
  
  function stopMasterFollowerSystem() {
    if (masterSystem.active) {
      masterSystem.active = false;
      
      if (masterSystem.heartbeatTimer) {
        clearInterval(masterSystem.heartbeatTimer);
        masterSystem.heartbeatTimer = null;
      }
      
      if (masterSystem.listener && masterSystem.roomRef) {
        masterSystem.roomRef.off('value', masterSystem.listener);
        masterSystem.listener = null;
      }
      
      if (masterSystem.usersRef && appState.currentUser) {
        masterSystem.usersRef.child(appState.currentUser).remove();
      }
      
      masterSystem.currentMaster = "";
      masterSystem.iAmMaster = false;
      
      if (elements.masterStatus) elements.masterStatus.textContent = "---";
      if (elements.currentMaster) elements.currentMaster.textContent = "---";
      
      console.log("🛑 Master-Follower system stopped");
    }
  }

  // ================== VIDEO SYNC SYSTEM ==================
  
  async function startVideoSync(roomId) {
    console.log("🎬 Starting Enhanced Video Sync...");
    
    try {
      videoSync.active = true;
      videoSync.roomRef = appState.database.ref(`videoSync/${roomId}/states`);
      videoSync.myRef = videoSync.roomRef.child(appState.currentUser);
      
      videoSync.syncing = false;
      videoSync.lastSyncTime = 0;
      videoSync.consecutiveSyncs = 0;
      
      if (videoSync.listener) {
        videoSync.roomRef.off('value', videoSync.listener);
      }
      videoSync.listener = videoSync.roomRef.on('value', handleVideoStateChange);
      
      startRoleBasedTimers();
      
      updateSyncStatus("🎬 Video sync active");
      console.log("✅ Enhanced Video sync started");
      
    } catch (error) {
      console.error("❌ Video sync startup error:", error);
      updateSyncStatus("❌ Video sync error");
    }
  }

  function startRoleBasedTimers() {
    if (videoSync.updateTimer) {
      clearInterval(videoSync.updateTimer);
      videoSync.updateTimer = null;
    }
    
    if (videoSync.followerTimer) {
      clearInterval(videoSync.followerTimer);
      videoSync.followerTimer = null;
    }
    
    if (masterSystem.iAmMaster) {
      videoSync.updateTimer = setInterval(async () => {
        if (!videoSync.active || !masterSystem.iAmMaster) return;
        
        try {
          const videoState = await getVideoState();
          if (videoState.success) {
            const masterData = {
              currentTime: Number(videoState.currentTime.toFixed(2)) || 0,
              paused: Boolean(videoState.paused),
              url: videoState.videoUrl || "",
              timestamp: Date.now(),
              isMaster: true,
              nickname: appState.currentUser
            };
            
            if (!videoSync.lastState || 
                Math.abs(masterData.currentTime - videoSync.lastState.currentTime) > 0.8 ||
                masterData.paused !== videoSync.lastState.paused) {
              
              await videoSync.myRef.set(masterData);
              videoSync.lastState = masterData;
              updateVideoTimes(masterData.currentTime, 0);
              
              console.log("📤 Master broadcast:", masterData.currentTime, masterData.paused);
            }
          }
        } catch (error) {
          console.error("Master broadcast error:", error);
        }
      }, 2000);
      
    } else {
      videoSync.followerTimer = setInterval(async () => {
        if (!videoSync.active || masterSystem.iAmMaster) return;
        
        try {
          const videoState = await getVideoState();
          if (videoState.success) {
            const followerData = {
              currentTime: Number(videoState.currentTime.toFixed(2)),
              paused: Boolean(videoState.paused),
              url: videoState.videoUrl || "",
              timestamp: Date.now(),
              isMaster: false,
              nickname: appState.currentUser
            };
            
            await videoSync.myRef.set(followerData);
          }
        } catch (error) {
          console.error("Follower report error:", error);
        }
      }, 4000);
    }
    
    console.log(`🔄 Timers started - Role: ${masterSystem.iAmMaster ? 'Master 👑' : 'Follower 👤'}`);
  }

  function findMasterState(states) {
    for (const nickname in states) {
      if (states[nickname].isMaster) {
        return states[nickname];
      }
    }
    return null;
  }

  function handleVideoStateChange(snapshot) {
    if (!snapshot.exists()) return;
    
    try {
      const states = snapshot.val();
      
      if (masterSystem.iAmMaster) {
        const myState = states[appState.currentUser];
        if (myState) {
          updateVideoTimes(myState.currentTime, 0);
        }
        return;
      }
      
      const masterState = findMasterState(states);
      const myState = states[appState.currentUser];
      
      if (!masterState) {
        console.log("⚠️ Master state not found");
        return;
      }
      
      if (!myState) {
        console.log("⚠️ My state not found");
        return;
      }
      
      updateVideoTimes(myState.currentTime, masterState.currentTime);
      safeSyncToMaster(masterState, myState);
      
    } catch (error) {
      console.error("Video state change error:", error);
    }
  }

  async function safeSyncToMaster(masterState, myState) {
    if (videoSync.syncing) {
      return;
    }
    
    const now = Date.now();
    if (now - videoSync.lastSyncTime < 4000) {
      return;
    }
    
    const timeDiff = Math.abs(myState.currentTime - masterState.currentTime);
    const pauseDiff = myState.paused !== masterState.paused;
    
    const needsTimeSync = timeDiff > 3.0;
    const needsPauseSync = pauseDiff;
    
    if (!needsTimeSync && !needsPauseSync) {
      updateSyncStatus(`✅ Synced - ${timeDiff.toFixed(1)}s diff`);
      return;
    }
    
    console.log("🔄 SAFE SYNC:", {
      timeDiff: timeDiff.toFixed(2),
      pauseDiff,
      masterTime: masterState.currentTime,
      myTime: myState.currentTime
    });
    
    videoSync.syncing = true;
    videoSync.lastSyncTime = now;
    
    try {
      updateSyncStatus("🔄 Syncing...");
      
      if (pauseDiff) {
        if (masterState.paused && !myState.paused) {
          console.log("⏸️ Pausing to match master");
          await executeVideoAction('pauseVideo');
          await sleep(400);
        } else if (!masterState.paused && myState.paused) {
          console.log("▶️ Playing to match master");
          await executeVideoAction('playVideo');
          await sleep(400);
        }
      }
      
      if (needsTimeSync) {
        console.log(`⏭️ Time sync: ${myState.currentTime}s → ${masterState.currentTime}s`);
        const success = await executeVideoAction('setVideoTime', masterState.currentTime);
        
        if (success) {
          console.log("✅ Time sync successful");
          updateSyncStatus("✅ Time synced!");
        } else {
          console.log("❌ Time sync failed");
          updateSyncStatus("❌ Sync failed");
        }
      } else {
        console.log("✅ Pause sync successful");
        updateSyncStatus("✅ State synced!");
      }
      
    } catch (error) {
      console.error("Sync error:", error);
      updateSyncStatus("❌ Sync error");
    } finally {
      setTimeout(() => {
        videoSync.syncing = false;
        console.log("🔓 Sync flag cleared");
      }, 3000);
    }
  }
  
  async function getVideoState() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({ success: false, error: "Chrome runtime not available" });
        return;
      }
      
      chrome.runtime.sendMessage({ action: "getVideoInfo" }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false });
        }
      });
    });
  }
  
  async function executeVideoAction(action, value = null) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve(false);
        return;
      }
      
      const message = { action };
      if (value !== null) message.currentTime = value;
      
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error(`Video action ${action} error:`, chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(response?.success || false);
        }
      });
    });
  }
  
  function stopVideoSync() {
    if (videoSync.active) {
      videoSync.active = false;
      
      if (videoSync.updateTimer) {
        clearInterval(videoSync.updateTimer);
        videoSync.updateTimer = null;
      }
      
      if (videoSync.followerTimer) {
        clearInterval(videoSync.followerTimer);
        videoSync.followerTimer = null;
      }
      
      if (videoSync.listener && videoSync.roomRef) {
        videoSync.roomRef.off('value', videoSync.listener);
        videoSync.listener = null;
      }
      
      if (videoSync.myRef) {
        videoSync.myRef.remove();
      }
      
      videoSync.lastState = null;
      videoSync.syncing = false;
      videoSync.lastSyncTime = 0;
      videoSync.consecutiveSyncs = 0;
      
      updateSyncStatus("⏸️ Video sync stopped");
      updateVideoTimes(0, 0);
      
      console.log("🛑 Video sync stopped");
    }
  }
  
  // ================== ROOM MANAGEMENT ==================
  
  function initRoomManagement() {
    // Create video code
    if (elements.createVideoChatCodeBtn) {
      elements.createVideoChatCodeBtn.addEventListener("click", async () => {
        const code = generateCode();
        try {
          await appState.database.ref(`videoRooms/${code}`).set({
            createdBy: appState.currentUser,
            createdAt: Date.now()
          });
          
          if (elements.generatedVideoCode) elements.generatedVideoCode.textContent = code;
          if (elements.videoCodeDisplay) elements.videoCodeDisplay.classList.remove("hidden");
          showMessage("Video room code created: " + code);
        } catch (error) {
          showMessage("Code creation error!", true);
        }
      });
    }
    
    // Create chat code
    if (elements.createChatCodeBtn) {
      elements.createChatCodeBtn.addEventListener("click", async () => {
        const code = generateCode();
        try {
          await appState.database.ref(`chatRooms/${code}`).set({
            createdBy: appState.currentUser,
            createdAt: Date.now()
          });
          
          if (elements.generatedChatCode) elements.generatedChatCode.textContent = code;
          if (elements.chatCodeDisplay) elements.chatCodeDisplay.classList.remove("hidden");
          showMessage("Chat room code created: " + code);
        } catch (error) {
          showMessage("Code creation error!", true);
        }
      });
    }
    
    // Copy codes
    if (elements.copyVideoCodeBtn) {
      elements.copyVideoCodeBtn.addEventListener("click", () => {
        const code = elements.generatedVideoCode?.textContent;
        if (code && code !== "-") {
          copyToClipboard(code, "Video code copied!");
        }
      });
    }
    
    if (elements.copyChatCodeBtn) {
      elements.copyChatCodeBtn.addEventListener("click", () => {
        const code = elements.generatedChatCode?.textContent;
        if (code && code !== "-") {
          copyToClipboard(code, "Chat code copied!");
        }
      });
    }
    
    // Join video room
    if (elements.joinVideoRoomBtn) {
      elements.joinVideoRoomBtn.addEventListener("click", async () => {
        const code = elements.videoCodeInput?.value?.trim();
        if (!code) {
          showMessage("Please enter a video room code!", true);
          return;
        }
        
        try {
          const snapshot = await appState.database.ref(`videoRooms/${code}`).once('value');
          if (snapshot.exists()) {
            appState.currentVideoRoom = code;
            if (elements.currentVideoCode) elements.currentVideoCode.textContent = code;
            if (elements.videoContainer) elements.videoContainer.classList.remove("hidden");
            
            const videoTab = document.querySelector('.nav-tab[data-tab="video"]');
            if (videoTab) videoTab.click();
            
            await startMasterFollowerSystem(code);
            await startVideoSync(code);
            
            showMessage("Joined video room!");
          } else {
            showMessage("Invalid video room code!", true);
          }
        } catch (error) {
          showMessage("Room join error!", true);
        }
      });
    }
    
    // Join chat room
    if (elements.joinChatRoomBtn) {
      elements.joinChatRoomBtn.addEventListener("click", async () => {
        const code = elements.chatCodeInput?.value?.trim();
        if (!code) {
          showMessage("Please enter a chat room code!", true);
          return;
        }
        
        try {
          const snapshot = await appState.database.ref(`chatRooms/${code}`).once('value');
          if (snapshot.exists()) {
            appState.currentChatRoom = code;
            if (elements.currentChatCode) elements.currentChatCode.textContent = code;
            if (elements.chatContainer) elements.chatContainer.classList.remove("hidden");
            
            const chatTab = document.querySelector('.nav-tab[data-tab="chat"]');
            if (chatTab) chatTab.click();
            
            startChatSystem(code);
            showMessage("Joined chat room!");
          } else {
            showMessage("Invalid chat room code!", true);
          }
        } catch (error) {
          showMessage("Chat join error!", true);
        }
      });
    }
    
    // Close rooms
    if (elements.closeVideoChat) {
      elements.closeVideoChat.addEventListener("click", () => {
        stopVideoSync();
        stopMasterFollowerSystem();
        stopWebRTC();
        
        appState.currentVideoRoom = "";
        if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
        if (elements.currentVideoCode) elements.currentVideoCode.textContent = "---";
        if (elements.videoCodeInput) elements.videoCodeInput.value = "";
        
        const roomsTab = document.querySelector('.nav-tab[data-tab="rooms"]');
        if (roomsTab) roomsTab.click();
        
        showMessage("Video room closed.");
      });
    }
    
    if (elements.closeChatRoom) {
      elements.closeChatRoom.addEventListener("click", () => {
        stopChatSystem();
        
        appState.currentChatRoom = "";
        if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
        if (elements.currentChatCode) elements.currentChatCode.textContent = "---";
        if (elements.chatCodeInput) elements.chatCodeInput.value = "";
        
        const roomsTab = document.querySelector('.nav-tab[data-tab="rooms"]');
        if (roomsTab) roomsTab.click();
        
        showMessage("Chat room closed.");
      });
    }
    
    console.log("🏠 Room management initialized");
  }
  
  function copyToClipboard(text, successMessage) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showMessage(successMessage);
      }).catch(() => {
        fallbackCopyToClipboard(text, successMessage);
      });
    } else {
      fallbackCopyToClipboard(text, successMessage);
    }
  }
  
  function fallbackCopyToClipboard(text, successMessage) {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    showMessage(successMessage);
  }
  
  // ================== MASTER TOGGLE ==================
  
  function initMasterToggle() {
    if (elements.masterToggleBtn) {
      elements.masterToggleBtn.addEventListener("click", async () => {
        if (!masterSystem.active) {
          showMessage("Master system not active!", true);
          return;
        }
        
        try {
          const usersSnapshot = await masterSystem.usersRef.once('value');
          const users = usersSnapshot.val() || {};
          const onlineUsers = Object.keys(users).filter(user => users[user].online);
          
          if (onlineUsers.length < 2) {
            showMessage("At least 2 users required!", true);
            return;
          }
          
          const currentIndex = onlineUsers.indexOf(masterSystem.currentMaster);
          const nextIndex = (currentIndex + 1) % onlineUsers.length;
          const nextMaster = onlineUsers[nextIndex];
          
          await setMaster(nextMaster);
          showMessage(`Master changed to: ${nextMaster}`);
        } catch (error) {
          console.error("Master switching error:", error);
          showMessage("Master switching error!", true);
        }
      });
    }
  }
  
  // ================== CHAT SYSTEM ==================
  
  function startChatSystem(roomId) {
    console.log("💬 Starting chat system...");
    
    try {
      chatSystem.active = true;
      chatSystem.messagesRef = appState.database.ref(`chatMessages/${roomId}`);
      
      chatSystem.listener = chatSystem.messagesRef.on("value", (snapshot) => {
        if (elements.messagesContainer) {
          elements.messagesContainer.innerHTML = "";
          
          if (snapshot.exists()) {
            const messages = snapshot.val();
            Object.entries(messages)
              .sort(([,a], [,b]) => a.timestamp - b.timestamp)
              .forEach(([key, message]) => displayMessage(message));
            
            scrollToBottom();
          } else {
            // Show empty state
            elements.messagesContainer.innerHTML = `
              <div class="empty-state">
                <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p class="empty-text">No messages yet.<br>Start the conversation!</p>
              </div>
            `;
          }
        }
      });
      
      setupMessageSending();
      
      console.log("✅ Chat system started");
      
    } catch (error) {
      console.error("❌ Chat startup error:", error);
      showMessage("Chat system error!", true);
    }
  }
  
  function setupMessageSending() {
    if (elements.sendMessageBtn) {
      elements.sendMessageBtn.onclick = sendMessage;
    }
    
    if (elements.messageInput) {
      elements.messageInput.onkeypress = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendMessage();
        }
      };
      
      // Character counter
      elements.messageInput.oninput = () => {
        const current = elements.messageInput.value.length;
        const max = 500;
        const counter = document.querySelector('.character-counter');
        if (counter) {
          counter.textContent = `${current}/${max} characters`;
          counter.style.color = current > max * 0.9 ? '#ef4444' : '#888';
        }
      };
    }
  }
  
  async function sendMessage() {
    const message = elements.messageInput?.value?.trim();
    if (!message || !chatSystem.active) return;
    
    if (message.length > 500) {
      showMessage("Message too long! Maximum 500 characters.", true);
      return;
    }
    
    try {
      await chatSystem.messagesRef.push({
        sender: appState.currentUser,
        text: message,
        timestamp: Date.now()
      });
      
      if (elements.messageInput) elements.messageInput.value = "";
      
      // Update character counter
      const counter = document.querySelector('.character-counter');
      if (counter) {
        counter.textContent = '0/500 characters';
        counter.style.color = '#888';
      }
      
    } catch (error) {
      console.error("Message sending error:", error);
      showMessage("Message sending error!", true);
    }
  }
  
  function displayMessage(message) {
    if (!elements.messagesContainer) return;
    
    const messageEl = document.createElement("div");
    messageEl.className = `message ${message.sender === appState.currentUser ? 'sent' : 'received'}`;
    
    const senderEl = document.createElement("div");
    senderEl.className = "message-sender";
    senderEl.textContent = message.sender;
    
    const textEl = document.createElement("div");
    textEl.className = "message-text";
    textEl.textContent = message.text;
    
    const timeEl = document.createElement("div");
    timeEl.className = "message-time";
    timeEl.textContent = formatMessageTime(message.timestamp);
    
    messageEl.appendChild(senderEl);
    messageEl.appendChild(textEl);
    messageEl.appendChild(timeEl);
    
    elements.messagesContainer.appendChild(messageEl);
  }
  
  function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  function scrollToBottom() {
    if (elements.messagesContainer) {
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }
  }
  
  function stopChatSystem() {
    if (chatSystem.active) {
      chatSystem.active = false;
      
      if (chatSystem.listener && chatSystem.messagesRef) {
        chatSystem.messagesRef.off("value", chatSystem.listener);
        chatSystem.listener = null;
      }
      
      if (elements.messagesContainer) {
        elements.messagesContainer.innerHTML = "";
      }
      
      console.log("🛑 Chat system stopped");
    }
  }
  
  // ================== WEBRTC SYSTEM ==================
  
  function initWebRTC() {
    if (!elements.startButton || !elements.hangupButton) return;
    
    // Start button
    elements.startButton.onclick = async () => {
      try {
        updateVideoStatus("Starting camera...");
        
        webrtcSystem.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        if (elements.localVideo) {
          elements.localVideo.srcObject = webrtcSystem.localStream;
          elements.localVideo.style.transform = "scaleX(-1)";
        }
        
        elements.startButton.disabled = true;
        elements.hangupButton.disabled = false;
        
        updateVideoStatus("Call started");
        updateMediaButtons();
        
        if (appState.currentVideoRoom) {
          await setupWebRTCSignaling(appState.currentVideoRoom);
        }
        
      } catch (error) {
        console.error("Camera startup error:", error);
        updateVideoStatus("Camera/microphone access error: " + error.message);
        elements.startButton.disabled = false;
        showMessage("Camera access denied. Please allow camera and microphone access.", true);
      }
    };
    
    // Hangup button
    elements.hangupButton.onclick = () => {
      stopWebRTC();
    };
    
    // Camera toggle
    if (elements.cameraToggle) {
      elements.cameraToggle.onclick = () => {
        if (webrtcSystem.localStream) {
          const videoTrack = webrtcSystem.localStream.getVideoTracks()[0];
          if (videoTrack) {
            webrtcSystem.isCameraOn = !webrtcSystem.isCameraOn;
            videoTrack.enabled = webrtcSystem.isCameraOn;
            updateMediaButtons();
            updateVideoStatus(webrtcSystem.isCameraOn ? "Camera on" : "Camera off");
          }
        }
      };
    }
    
    // Microphone toggle
    if (elements.micToggle) {
      elements.micToggle.onclick = () => {
        if (webrtcSystem.localStream) {
          const audioTrack = webrtcSystem.localStream.getAudioTracks()[0];
          if (audioTrack) {
            webrtcSystem.isMicOn = !webrtcSystem.isMicOn;
            audioTrack.enabled = webrtcSystem.isMicOn;
            updateMediaButtons();
            updateVideoStatus(webrtcSystem.isMicOn ? "Microphone on" : "Microphone off");
          }
        }
      };
    }
    
    console.log("📹 WebRTC initialized");
  }
  
  async function setupWebRTCSignaling(roomId) {
    try {
      webrtcSystem.roomRef = appState.database.ref(`webrtcRooms/${roomId}`);
      
      const roomSnapshot = await webrtcSystem.roomRef.once('value');
      
      if (!roomSnapshot.exists()) {
        await createWebRTCRoom();
      } else {
        await joinWebRTCRoom();
      }
      
    } catch (error) {
      console.error("WebRTC signaling error:", error);
      updateVideoStatus("Connection error: " + error.message);
    }
  }
  
  async function createWebRTCRoom() {
    try {
      updateVideoStatus("Creating room...");
      
      webrtcSystem.peerConnection = new RTCPeerConnection(webrtcSystem.servers);
      setupPeerConnectionEvents();
      
      if (webrtcSystem.localStream) {
        webrtcSystem.localStream.getTracks().forEach(track => {
          webrtcSystem.peerConnection.addTrack(track, webrtcSystem.localStream);
        });
      }
      
      collectICECandidates('caller', 'callee');
      
      const offer = await webrtcSystem.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await webrtcSystem.peerConnection.setLocalDescription(offer);
      
      await webrtcSystem.roomRef.set({
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        created: Date.now()
      });
      
      webrtcSystem.roomRef.on('value', async (snapshot) => {
        const data = snapshot.val();
        if (data?.answer && webrtcSystem.peerConnection.signalingState === 'have-local-offer') {
          try {
            const answer = new RTCSessionDescription(data.answer);
            await webrtcSystem.peerConnection.setRemoteDescription(answer);
            updateVideoStatus("Answer received, connecting...");
          } catch (error) {
            console.error("Answer processing error:", error);
            updateVideoStatus("Connection error");
          }
        }
      });
      
      updateVideoStatus("Waiting for participant...");
      
    } catch (error) {
      console.error("Room creation error:", error);
      updateVideoStatus("Room creation error: " + error.message);
    }
  }
  
  async function joinWebRTCRoom() {
    try {
      updateVideoStatus("Joining room...");
      
      const roomSnapshot = await webrtcSystem.roomRef.once('value');
      const roomData = roomSnapshot.val();
      
      if (!roomData?.offer) {
        updateVideoStatus("Invalid room");
        return;
      }
      
      webrtcSystem.peerConnection = new RTCPeerConnection(webrtcSystem.servers);
      setupPeerConnectionEvents();
      
      if (webrtcSystem.localStream) {
        webrtcSystem.localStream.getTracks().forEach(track => {
          webrtcSystem.peerConnection.addTrack(track, webrtcSystem.localStream);
        });
      }
      
      collectICECandidates('callee', 'caller');
      
      const offer = new RTCSessionDescription(roomData.offer);
      await webrtcSystem.peerConnection.setRemoteDescription(offer);
      
      const answer = await webrtcSystem.peerConnection.createAnswer();
      await webrtcSystem.peerConnection.setLocalDescription(answer);
      
      await webrtcSystem.roomRef.update({
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      });
      
      updateVideoStatus("Connecting...");
      
    } catch (error) {
      console.error("Room join error:", error);
      updateVideoStatus("Room join error: " + error.message);
    }
  }
  
  function setupPeerConnectionEvents() {
    if (!webrtcSystem.peerConnection) return;
    
    webrtcSystem.remoteStream = new MediaStream();
    if (elements.remoteVideo) {
      elements.remoteVideo.srcObject = webrtcSystem.remoteStream;
    }
    
    webrtcSystem.peerConnection.ontrack = (event) => {
      console.log("Remote track received");
      event.streams[0].getTracks().forEach(track => {
        webrtcSystem.remoteStream.addTrack(track);
      });
    };
    
    webrtcSystem.peerConnection.onconnectionstatechange = () => {
      const state = webrtcSystem.peerConnection.connectionState;
      console.log("Connection state:", state);
      
      switch (state) {
        case 'connected':
          updateVideoStatus("Connected! Call is active.");
          break;
        case 'disconnected':
          updateVideoStatus("Connection lost");
          break;
        case 'failed':
          updateVideoStatus("Connection failed");
          break;
      }
    };
  }
  
  function collectICECandidates(localName, remoteName) {
    const localCandidatesRef = webrtcSystem.roomRef.child(`${localName}Candidates`);
    const remoteCandidatesRef = webrtcSystem.roomRef.child(`${remoteName}Candidates`);
    
    webrtcSystem.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📡 ${localName} ICE candidate sending`);
        localCandidatesRef.push(event.candidate.toJSON()).catch(error => {
          console.error("ICE candidate sending error:", error);
        });
      }
    };
    
    remoteCandidatesRef.on('child_added', async (snapshot) => {
      const candidateData = snapshot.val();
      console.log(`📡 ${remoteName} ICE candidate received`);
      
      try {
        const candidate = new RTCIceCandidate(candidateData);
        await webrtcSystem.peerConnection.addIceCandidate(candidate);
        console.log(`✅ ${remoteName} ICE candidate added`);
      } catch (error) {
        console.error(`❌ ${remoteName} ICE candidate add error:`, error);
      }
    });
  }
  
  function updateMediaButtons() {
    if (elements.cameraToggle) {
      const cameraOn = elements.cameraToggle.querySelector('.camera-on');
      const cameraOff = elements.cameraToggle.querySelector('.camera-off');
      
      if (cameraOn && cameraOff) {
        if (webrtcSystem.isCameraOn) {
          cameraOn.classList.remove('hidden');
          cameraOff.classList.add('hidden');
          elements.cameraToggle.classList.add('active');
          elements.cameraToggle.classList.remove('inactive');
        } else {
          cameraOn.classList.add('hidden');
          cameraOff.classList.remove('hidden');
          elements.cameraToggle.classList.remove('active');
          elements.cameraToggle.classList.add('inactive');
        }
      }
    }
    
    if (elements.micToggle) {
      const micOn = elements.micToggle.querySelector('.mic-on');
      const micOff = elements.micToggle.querySelector('.mic-off');
      
      if (micOn && micOff) {
        if (webrtcSystem.isMicOn) {
          micOn.classList.remove('hidden');
          micOff.classList.add('hidden');
          elements.micToggle.classList.add('active');
          elements.micToggle.classList.remove('inactive');
        } else {
          micOn.classList.add('hidden');
          micOff.classList.remove('hidden');
          elements.micToggle.classList.remove('active');
          elements.micToggle.classList.add('inactive');
        }
      }
    }
  }
  
  function updateVideoStatus(message) {
    if (elements.videoStatus) {
      elements.videoStatus.textContent = message;
    }
    console.log("📹", message);
  }
  
  function stopWebRTC() {
    if (webrtcSystem.localStream) {
      webrtcSystem.localStream.getTracks().forEach(track => track.stop());
      webrtcSystem.localStream = null;
    }
    
    if (webrtcSystem.remoteStream) {
      webrtcSystem.remoteStream.getTracks().forEach(track => track.stop());
      webrtcSystem.remoteStream = null;
    }
    
    if (webrtcSystem.peerConnection) {
      webrtcSystem.peerConnection.close();
      webrtcSystem.peerConnection = null;
    }
    
    if (webrtcSystem.roomRef) {
      webrtcSystem.roomRef.off();
      webrtcSystem.roomRef = null;
    }
    
    if (elements.localVideo) elements.localVideo.srcObject = null;
    if (elements.remoteVideo) elements.remoteVideo.srcObject = null;
    
    if (elements.startButton) elements.startButton.disabled = false;
    if (elements.hangupButton) elements.hangupButton.disabled = true;
    
    webrtcSystem.isCameraOn = true;
    webrtcSystem.isMicOn = true;
    
    updateVideoStatus("Call ended");
    console.log("🛑 WebRTC stopped");
  }
  
  // ================== CLEANUP FUNCTIONS ==================
  
  function cleanup() {
    console.log("🧹 Cleaning up...");
    
    try {
      stopVideoSync();
      stopMasterFollowerSystem();
      stopChatSystem();
      stopWebRTC();
      
      appState.currentVideoRoom = "";
      appState.currentChatRoom = "";
      
      resetUI();
      
      console.log("✅ Cleanup completed");
    } catch (error) {
      console.error("❌ Cleanup error:", error);
    }
  }
  
  function resetUI() {
    try {
      if (elements.currentVideoCode) elements.currentVideoCode.textContent = "---";
      if (elements.currentChatCode) elements.currentChatCode.textContent = "---";
      if (elements.videoCodeInput) elements.videoCodeInput.value = "";
      if (elements.chatCodeInput) elements.chatCodeInput.value = "";
      
      if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
      if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
      if (elements.videoCodeDisplay) elements.videoCodeDisplay.classList.add("hidden");
      if (elements.chatCodeDisplay) elements.chatCodeDisplay.classList.add("hidden");
      
      updateSyncStatus("⏸️ Synchronization off");
      updateVideoTimes(0, 0);
      
      if (elements.masterStatus) elements.masterStatus.textContent = "---";
      if (elements.currentMaster) elements.currentMaster.textContent = "---";
      if (elements.videoStatus) elements.videoStatus.textContent = "Ready to start video call";
      
      if (elements.generatedVideoCode) elements.generatedVideoCode.textContent = "------";
      if (elements.generatedChatCode) elements.generatedChatCode.textContent = "------";
    } catch (error) {
      console.error("UI reset error:", error);
    }
  }
  
  // ================== STARTUP SYSTEM ==================
  
  function initApp() {
    console.log("🚀 Fixed Video Sync App v4.1 starting...");
    
    try {
      // Add CSS animations for toast notifications
      addToastStyles();
      
      if (!initFirebase()) {
        throw new Error("Firebase could not be initialized");
      }
      
      setupPasswordValidation();
      initTabNavigation();
      initAuth();
      initRoomManagement();
      initMasterToggle();
      initWebRTC();
      
      setInitialUIState();
      setupGlobalEventListeners();
      
      appState.initialized = true;
      console.log("✅ Fixed app successfully started");
      showMessage("Video Sync App ready! Please sign in to continue.");
      
    } catch (error) {
      console.error("❌ App startup error:", error);
      showMessage("Application startup error. Please refresh the page.", true);
    }
  }
  
  function addToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .status-message {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        margin-top: 12px;
      }
      
      .status-message.success {
        background-color: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }
      
      .status-message.error {
        background-color: #fee2e2;
        color: #991b1b;
        border: 1px solid #fca5a5;
      }
      
      .message {
        margin-bottom: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        max-width: 80%;
      }
      
      .message.sent {
        background-color: #6366f1;
        color: white;
        margin-left: auto;
      }
      
      .message.received {
        background-color: #f3f4f6;
        color: #374151;
      }
      
      .message-sender {
        font-size: 12px;
        font-weight: 600;
        opacity: 0.8;
        margin-bottom: 4px;
      }
      
      .message-text {
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }
      
      .message-time {
        font-size: 11px;
        opacity: 0.6;
        margin-top: 4px;
      }
      
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        opacity: 0.6;
      }
      
      .empty-icon {
        margin-bottom: 16px;
        opacity: 0.5;
      }
      
      .empty-text {
        color: #6b7280;
        font-size: 14px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }
  
  function setInitialUIState() {
    try {
      if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
      if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
      if (elements.appContainer) elements.appContainer.classList.add("hidden");
      
      if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
      if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
      
      if (elements.roomsSection) elements.roomsSection.classList.remove("hidden");
      
      const firstTab = document.querySelector('.nav-tab[data-tab="rooms"]');
      if (firstTab) firstTab.classList.add('active');
      
      resetUI();
      
      console.log("🎨 Initial UI state set");
    } catch (error) {
      console.error("UI initialization error:", error);
    }
  }
  
  function setupGlobalEventListeners() {
    try {
      window.addEventListener('error', (event) => {
        console.error("🚨 Global error:", event.error);
        serviceWorkerState.performanceMetrics.errorCount++;
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        console.error("🚨 Promise rejection:", event.reason);
        event.preventDefault();
      });
      
      window.addEventListener('beforeunload', () => {
        console.log("📄 Page closing, cleaning up...");
        cleanup();
      });
      
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log("👁️ Tab hidden");
        } else {
          console.log("👁️ Tab visible");
          if (masterSystem.active && masterSystem.usersRef && appState.currentUser) {
            masterSystem.usersRef.child(appState.currentUser).update({
              lastSeen: Date.now(),
              online: true
            }).catch(error => {
              console.error("Heartbeat update error:", error);
            });
          }
        }
      });
      
      console.log("🔧 Global event listeners set up");
    } catch (error) {
      console.error("Event listener setup error:", error);
    }
  }
  
  // ================== GLOBAL API AND DEBUG ==================
  
  window.videoSyncApp = {
    version: "4.1.0-fixed-auth",
    appState,
    masterSystem,
    videoSync,
    chatSystem,
    webrtcSystem,
    elements,
    
    cleanup,
    showMessage,
    updateSyncStatus,
    performLogout,
    
    getStatus: () => ({
      initialized: appState.initialized,
      currentUser: appState.currentUser,
      currentVideoRoom: appState.currentVideoRoom,
      currentChatRoom: appState.currentChatRoom,
      masterActive: masterSystem.active,
      videoSyncActive: videoSync.active,
      chatActive: chatSystem.active,
      iAmMaster: masterSystem.iAmMaster,
      syncing: videoSync.syncing,
      lastSyncTime: videoSync.lastSyncTime,
      consecutiveSyncs: videoSync.consecutiveSyncs
    }),
    
    resetSync: () => {
      videoSync.syncing = false;
      videoSync.lastSyncTime = 0;
      videoSync.consecutiveSyncs = 0;
      console.log("🔄 Sync state manually reset");
      updateSyncStatus("🔄 Sync reset");
    },
    
    // Emergency reset function
    emergencyReset: () => {
      console.log("🚨 Emergency reset initiated");
      cleanup();
      location.reload();
    }
  };

  window.authDebug = {
    testLogin: async (email, password) => {
      console.log("🧪 Testing login:", email);
      return await sendToBackground("login", { email, password });
    },
    
    testSignup: async (email, password, nickname) => {
      console.log("🧪 Testing signup:", email);
      return await sendToBackground("signup", { email, password, nickname });
    },
    
    checkElements: () => {
      const elementsStatus = {};
      Object.keys(elements).forEach(key => {
        elementsStatus[key] = !!elements[key];
      });
      console.log("🔍 Elements status:", elementsStatus);
      return elementsStatus;
    },
    
    getFirebaseStatus: () => {
      return {
        configured: !!appState.database,
        connected: appState.database ? "Unknown" : false
      };
    }
  };
  
  // Start the app
  initApp();
  
  console.log("🎉 Fixed Video Sync App v4.1 fully loaded!");
  console.log("📋 For debugging: window.videoSyncApp.getStatus()");
  console.log("🔧 Auth debugging: window.authDebug.checkElements()");
  console.log("🚨 Emergency reset: window.videoSyncApp.emergencyReset()");
  
});