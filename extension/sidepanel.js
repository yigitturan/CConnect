// ================== VIDEO SYNC APP v4 - ENGLISH VERSION ==================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Video Sync App v4 starting...");
  
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
    syncing: false
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
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302'
          ] 
        },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
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
  
  // ================== FIREBASE SETUP - CSP COMPLIANT ==================
  
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
      // CSP compliant Firebase initialization
      if (typeof firebase === 'undefined') {
        console.error("❌ Firebase SDK not loaded");
        return false;
      }
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      // Get database reference
      appState.database = firebase.database();
      
      // CSP specific settings
      if (appState.database) {
        // Force WebSocket usage (instead of long polling)
        appState.database.goOnline();
        
        console.log("✅ Firebase initialized (CSP compliant)");
        return true;
      }
      
      console.error("❌ Firebase database could not be initialized");
      return false;
      
    } catch (error) {
      console.error("❌ Firebase error:", error);
      showMessage("Firebase connection error!", true);
      return false;
    }
  }
  
  // ================== UTILITY FUNCTIONS ==================
  
  function showMessage(message, isError = false) {
    if (elements.statusEl) {
      elements.statusEl.textContent = message;
      elements.statusEl.style.color = isError ? "#ef4444" : "#10b981";
      elements.statusEl.classList.remove("hidden");
      setTimeout(() => {
        elements.statusEl.textContent = "";
        elements.statusEl.classList.add("hidden");
      }, 5000);
    }
    console.log(isError ? "❌" : "✅", message);
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
  
  // ================== PASSWORD VALIDATION ==================
  
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
        const validation = validatePassword(password);
        
        let errorElement = document.getElementById("password-requirements");
        if (!errorElement) {
          errorElement = document.createElement("div");
          errorElement.id = "password-requirements";
          errorElement.style.fontSize = "12px";
          errorElement.style.marginTop = "5px";
          elements.signupPasswordInput.parentNode.insertBefore(errorElement, elements.signupPasswordInput.nextSibling);
        }
        
        if (!validation.isValid) {
          elements.signupPasswordInput.setCustomValidity(validation.errors.join(", "));
          errorElement.innerHTML = validation.errors.map(err => `<p style="color: #f59e0b; margin: 2px 0;">${err}</p>`).join("");
        } else {
          elements.signupPasswordInput.setCustomValidity("");
          errorElement.innerHTML = "<p style='color: #10b981; margin: 2px 0;'>✓ Password requirements met</p>";
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
        
        // Deactivate all tabs
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // Activate selected tab
        tab.classList.add('active');
        
        // Show related content
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
  
  // ================== AUTH SYSTEM ==================
  
  function initAuth() {
    // Screen transitions
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
    
    // Login
    if (elements.loginBtn) {
      elements.loginBtn.addEventListener("click", async () => {
        const email = elements.emailInput?.value?.trim();
        const password = elements.passwordInput?.value?.trim();
        
        if (!email || !password) {
          showMessage("Email and password are required!", true);
          return;
        }
        
        showMessage("Signing in...");
        
        try {
          const response = await sendToBackground("login", { email, password });
          if (response.success) {
            appState.currentUser = response.nickname;
            showMainApp();
            showMessage("Login successful!");
          } else {
            showMessage("Login error: " + (response.error || "Unknown error"), true);
          }
        } catch (error) {
          showMessage("Login error!", true);
        }
      });
    }
    
    // Signup
    if (elements.signupBtn) {
      elements.signupBtn.addEventListener("click", async () => {
        const email = elements.signupEmailInput?.value?.trim();
        const password = elements.signupPasswordInput?.value?.trim();
        const nickname = elements.nicknameInput?.value?.trim();
        
        if (!email || !password || !nickname) {
          showMessage("All fields are required!", true);
          return;
        }
        
        const validation = validatePassword(password);
        if (!validation.isValid) {
          showMessage("Password requirements: " + validation.errors.join(", "), true);
          return;
        }
        
        showMessage("Creating account...");
        
        try {
          const response = await sendToBackground("signup", { email, password, nickname });
          if (response.success) {
            showMessage("Registration successful! You can now sign in.");
            if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
            if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
          } else {
            showMessage("Registration error: " + (response.error || "Unknown error"), true);
          }
        } catch (error) {
          showMessage("Registration error!", true);
        }
      });
    }
    
    // Google login
    if (elements.googleLoginBtn) {
      elements.googleLoginBtn.addEventListener("click", async () => {
        showMessage("Signing in with Google...");
        
        try {
          const response = await sendToBackground("googleLogin");
          if (response.success) {
            appState.currentUser = response.nickname;
            showMainApp();
            showMessage("Google login successful!");
          } else {
            showMessage("Google login error!", true);
          }
        } catch (error) {
          showMessage("Google login error!", true);
        }
      });
    }
    
    // Logout
    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener("click", () => {
        performLogout();
      });
    }
    
    console.log("🔐 Auth system initialized");
  }
  
  function showMainApp() {
    if (elements.loginScreen) elements.loginScreen.classList.add("hidden");
    if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
    if (elements.appContainer) elements.appContainer.classList.remove("hidden");
    
    const welcomeMsg = document.getElementById("welcomeMsg");
    if (welcomeMsg) welcomeMsg.textContent = `Hello, ${appState.currentUser}`;
    
    // Activate first tab
    const firstTab = document.querySelector('.nav-tab');
    if (firstTab) firstTab.click();
  }
  
  function performLogout() {
    cleanup();
    appState.currentUser = "";
    
    if (elements.appContainer) elements.appContainer.classList.add("hidden");
    if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
    
    // Clear forms
    if (elements.emailInput) elements.emailInput.value = "";
    if (elements.passwordInput) elements.passwordInput.value = "";
    
    showMessage("Logged out successfully.");
  }
  
  async function sendToBackground(action, data = {}) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({ success: false, error: "Chrome runtime not available" });
        return;
      }
      
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false });
        }
      });
    });
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
            
            // Switch to video tab
            const videoTab = document.querySelector('.nav-tab[data-tab="video"]');
            if (videoTab) videoTab.click();
            
            // Start systems
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
            
            // Switch to chat tab
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
        
        // Return to rooms tab
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
        
        // Return to rooms tab
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
  
  // ================== MASTER-FOLLOWER SYSTEM ==================
  
  async function startMasterFollowerSystem(roomId) {
    console.log("👑 Starting Master-Follower system...");
    
    try {
      masterSystem.active = true;
      masterSystem.roomRef = appState.database.ref(`masterControl/${roomId}/currentMaster`);
      masterSystem.usersRef = appState.database.ref(`masterControl/${roomId}/users`);
      
      // Register user
      await masterSystem.usersRef.child(appState.currentUser).set({
        nickname: appState.currentUser,
        online: true,
        lastSeen: Date.now()
      });
      
      // Disconnect handler
      masterSystem.usersRef.child(appState.currentUser).onDisconnect().remove();
      
      // Listen for master changes
      masterSystem.listener = masterSystem.roomRef.on('value', (snapshot) => {
        const newMaster = snapshot.val();
        
        if (newMaster) {
          masterSystem.currentMaster = newMaster;
          masterSystem.iAmMaster = (newMaster === appState.currentUser);
          updateMasterUI();
          
          console.log("👑 Master:", newMaster, "Am I master:", masterSystem.iAmMaster);
        } else if (!masterSystem.currentMaster) {
          // First joiner becomes master
          setMaster(appState.currentUser);
        }
      });
      
      // Start heartbeat
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
    }, 5000); // Every 5 seconds
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
    
    if (elements.masterToggleBtn) {
      elements.masterToggleBtn.innerHTML = `
        <span class="btn-icon">👑</span>
        <span class="btn-text">Switch Master</span>
      `;
    }
    
    // When master changes, restart follower timer
    if (videoSync.active) {
      // Clear previous follower timer
      if (videoSync.followerTimer) {
        clearInterval(videoSync.followerTimer);
        videoSync.followerTimer = null;
      }
      
      // If I'm now a follower, start timer
      if (!masterSystem.iAmMaster) {
        videoSync.followerTimer = setInterval(async () => {
          if (!videoSync.active) return;
          
          try {
            const videoState = await getVideoState();
            if (videoState.success) {
              const data = {
                currentTime: Math.round(videoState.currentTime * 10) / 10,
                paused: videoState.paused,
                url: videoState.url || "",
                timestamp: Date.now(),
                isMaster: false,
                nickname: appState.currentUser
              };
              
              await videoSync.myRef.set(data);
            }
          } catch (error) {
            console.error("Follower state sharing error:", error);
          }
        }, 3000);
      }
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
      
      // Reset UI
      if (elements.masterStatus) elements.masterStatus.textContent = "---";
      if (elements.currentMaster) elements.currentMaster.textContent = "---";
      
      console.log("🛑 Master-Follower system stopped");
    }
  }
  
  // Master toggle
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
  
  // ================== VIDEO SYNC SYSTEM ==================
  
  async function startVideoSync(roomId) {
    console.log("🎬 Starting video sync...");
    
    try {
      videoSync.active = true;
      videoSync.roomRef = appState.database.ref(`videoSync/${roomId}/states`);
      videoSync.myRef = videoSync.roomRef.child(appState.currentUser);
      
      // Master state sharing
      videoSync.updateTimer = setInterval(async () => {
        if (!videoSync.active || !masterSystem.iAmMaster || videoSync.syncing) return;
        
        try {
          const videoState = await getVideoState();
          if (videoState.success) {
            const data = {
              currentTime: Math.round(videoState.currentTime * 10) / 10,
              paused: videoState.paused,
              url: videoState.url || "",
              timestamp: Date.now(),
              isMaster: true
            };
            
            // Compare with previous state
            if (!videoSync.lastState || 
                Math.abs(data.currentTime - videoSync.lastState.currentTime) > 1 ||
                data.paused !== videoSync.lastState.paused ||
                data.url !== videoSync.lastState.url) {
              
              await videoSync.myRef.set(data);
              videoSync.lastState = data;
              updateVideoTimes(data.currentTime, 0);
              
              console.log("📤 Master state sent:", data.currentTime, data.paused);
            }
          }
        } catch (error) {
          console.error("Video sync sharing error:", error);
        }
      }, 2000);
      
      // Follower listening
      videoSync.listener = videoSync.roomRef.on('value', (snapshot) => {
        if (!snapshot.exists() || videoSync.syncing) return;
        
        try {
          const states = snapshot.val();
          
          if (masterSystem.iAmMaster) {
            // Master: Only show own state
            const myState = states[appState.currentUser];
            if (myState) {
              updateVideoTimes(myState.currentTime, 0);
            }
          } else {
            // Follower: Show both master and self
            const masterState = Object.values(states || {}).find(state => 
              state.isMaster && state.nickname !== appState.currentUser
            );
            
            const myState = states[appState.currentUser];
            
            if (masterState && myState) {
              updateVideoTimes(myState.currentTime, masterState.currentTime);
              syncToMaster(masterState);
            } else if (masterState) {
              updateVideoTimes(0, masterState.currentTime);
              syncToMaster(masterState);
            }
          }
        } catch (error) {
          console.error("Video sync listening error:", error);
        }
      });
      
      // Followers also share their state (for display only)
      if (!masterSystem.iAmMaster) {
        videoSync.followerTimer = setInterval(async () => {
          if (!videoSync.active) return;
          
          try {
            const videoState = await getVideoState();
            if (videoState.success) {
              const data = {
                currentTime: Math.round(videoState.currentTime * 10) / 10,
                paused: videoState.paused,
                url: videoState.url || "",
                timestamp: Date.now(),
                isMaster: false,
                nickname: appState.currentUser
              };
              
              await videoSync.myRef.set(data);
            }
          } catch (error) {
            console.error("Follower state sharing error:", error);
          }
        }, 3000); // Followers update every 3 seconds
      }
      
      updateSyncStatus("🎬 Video sync active");
      console.log("✅ Video sync started");
      
    } catch (error) {
      console.error("❌ Video sync startup error:", error);
      updateSyncStatus("❌ Video sync error");
    }
  }
  
  async function syncToMaster(masterState) {
    if (videoSync.syncing) return;
    
    try {
      videoSync.syncing = true;
      
      const myState = await getVideoState();
      if (!myState.success) return;
      
      const timeDiff = Math.abs(myState.currentTime - masterState.currentTime);
      const pauseDiff = myState.paused !== masterState.paused;
      
      console.log("🔍 Sync check:", {
        myTime: myState.currentTime,
        masterTime: masterState.currentTime,
        timeDiff: timeDiff.toFixed(1),
        pauseDiff
      });
      
      if (timeDiff > 2 || pauseDiff) {
        console.log("🔄 Syncing to master...");
        updateSyncStatus("🔄 Synchronizing...");
        
        // Set pause/play state
        if (pauseDiff) {
          if (masterState.paused && !myState.paused) {
            await executeVideoAction('pauseVideo');
            await sleep(300);
          } else if (!masterState.paused && myState.paused) {
            await executeVideoAction('playVideo');
            await sleep(300);
          }
        }
        
        // Set time difference
        if (timeDiff > 3) {
          await executeVideoAction('setVideoTime', masterState.currentTime);
          await sleep(500);
        }
        
        updateSyncStatus("✅ Synchronized");
        console.log("✅ Synchronization complete");
        
      } else {
        updateSyncStatus("✅ In Sync - " + timeDiff.toFixed(1) + "s diff");
      }
    } catch (error) {
      console.error("Sync error:", error);
      updateSyncStatus("❌ Sync error");
    } finally {
      setTimeout(() => {
        videoSync.syncing = false;
      }, 1000);
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
      
      updateSyncStatus("⏸️ Video sync stopped");
      updateVideoTimes(0, 0);
      
      console.log("🛑 Video sync stopped");
    }
  }
  
  // ================== CHAT SYSTEM ==================
  
  function startChatSystem(roomId) {
    console.log("💬 Starting chat system...");
    
    try {
      chatSystem.active = true;
      chatSystem.messagesRef = appState.database.ref(`chatMessages/${roomId}`);
      
      // Listen for messages
      chatSystem.listener = chatSystem.messagesRef.on("value", (snapshot) => {
        if (elements.messagesContainer) {
          elements.messagesContainer.innerHTML = "";
          
          if (snapshot.exists()) {
            const messages = snapshot.val();
            Object.entries(messages)
              .sort(([,a], [,b]) => a.timestamp - b.timestamp)
              .forEach(([key, message]) => displayMessage(message));
            
            scrollToBottom();
          }
        }
      });
      
      // Setup message sending
      setupMessageSending();
      
      console.log("✅ Chat system started");
      
    } catch (error) {
      console.error("❌ Chat startup error:", error);
      showMessage("Chat system error!", true);
    }
  }
  
  function setupMessageSending() {
    // Send button
    if (elements.sendMessageBtn) {
      elements.sendMessageBtn.onclick = sendMessage;
    }
    
    // Enter key
    if (elements.messageInput) {
      elements.messageInput.onkeypress = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendMessage();
        }
      };
    }
  }
  
  async function sendMessage() {
    const message = elements.messageInput?.value?.trim();
    if (!message || !chatSystem.active) return;
    
    try {
      await chatSystem.messagesRef.push({
        sender: appState.currentUser,
        text: message,
        timestamp: Date.now()
      });
      
      if (elements.messageInput) elements.messageInput.value = "";
      
    } catch (error) {
      console.error("Message sending error:", error);
      showMessage("Message sending error!", true);
    }
  }
  
  function displayMessage(message) {
    if (!elements.messagesContainer) return;
    
    const messageEl = document.createElement("div");
    messageEl.textContent = `${message.sender}: ${message.text}`;
    messageEl.className = message.sender === appState.currentUser ? "sent-message" : "received-message";
    
    // User color
    const colors = ["#8b5cf6", "#ef4444", "#f59e0b", "#10b981", "#3b82f6"];
    const colorIndex = message.sender.charCodeAt(0) % colors.length;
    messageEl.style.backgroundColor = colors[colorIndex];
    
    elements.messagesContainer.appendChild(messageEl);
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
  
  // ================== WEBRTC VIDEO CHAT ==================
  
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
        
        // Start WebRTC signaling
        if (appState.currentVideoRoom) {
          await setupWebRTCSignaling(appState.currentVideoRoom);
        }
        
      } catch (error) {
        console.error("Camera startup error:", error);
        updateVideoStatus("Camera/microphone access error: " + error.message);
        elements.startButton.disabled = false;
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
      
      // Check if room exists
      const roomSnapshot = await webrtcSystem.roomRef.once('value');
      
      if (!roomSnapshot.exists()) {
        // Create room (caller)
        await createWebRTCRoom();
      } else {
        // Join room (callee)
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
      
      // Add local stream
      if (webrtcSystem.localStream) {
        webrtcSystem.localStream.getTracks().forEach(track => {
          webrtcSystem.peerConnection.addTrack(track, webrtcSystem.localStream);
        });
      }
      
      // Start ICE candidates first
      collectICECandidates('caller', 'callee');
      
      // Create offer
      const offer = await webrtcSystem.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await webrtcSystem.peerConnection.setLocalDescription(offer);
      
      // Save to Firebase
      await webrtcSystem.roomRef.set({
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        created: Date.now()
      });
      
      // Listen for answer
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
      
      // Add local stream
      if (webrtcSystem.localStream) {
        webrtcSystem.localStream.getTracks().forEach(track => {
          webrtcSystem.peerConnection.addTrack(track, webrtcSystem.localStream);
        });
      }
      
      // Start ICE candidates first
      collectICECandidates('callee', 'caller');
      
      // Set remote description
      const offer = new RTCSessionDescription(roomData.offer);
      await webrtcSystem.peerConnection.setRemoteDescription(offer);
      
      // Create answer
      const answer = await webrtcSystem.peerConnection.createAnswer();
      await webrtcSystem.peerConnection.setLocalDescription(answer);
      
      // Save answer to Firebase
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
    
    // Remote stream
    webrtcSystem.remoteStream = new MediaStream();
    if (elements.remoteVideo) {
      elements.remoteVideo.srcObject = webrtcSystem.remoteStream;
    }
    
    // Track events
    webrtcSystem.peerConnection.ontrack = (event) => {
      console.log("Remote track received");
      event.streams[0].getTracks().forEach(track => {
        webrtcSystem.remoteStream.addTrack(track);
      });
    };
    
    // Connection state
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
    
    // Send local ICE candidates
    webrtcSystem.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📡 ${localName} ICE candidate sending`);
        localCandidatesRef.push(event.candidate.toJSON()).catch(error => {
          console.error("ICE candidate sending error:", error);
        });
      }
    };
    
    // Listen for remote ICE candidates
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
    // Camera button
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
    
    // Microphone button
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
    // Stop streams
    if (webrtcSystem.localStream) {
      webrtcSystem.localStream.getTracks().forEach(track => track.stop());
      webrtcSystem.localStream = null;
    }
    
    if (webrtcSystem.remoteStream) {
      webrtcSystem.remoteStream.getTracks().forEach(track => track.stop());
      webrtcSystem.remoteStream = null;
    }
    
    // Close peer connection
    if (webrtcSystem.peerConnection) {
      webrtcSystem.peerConnection.close();
      webrtcSystem.peerConnection = null;
    }
    
    // Clean Firebase listeners
    if (webrtcSystem.roomRef) {
      webrtcSystem.roomRef.off();
      webrtcSystem.roomRef = null;
    }
    
    // Clear video elements
    if (elements.localVideo) elements.localVideo.srcObject = null;
    if (elements.remoteVideo) elements.remoteVideo.srcObject = null;
    
    // Reset buttons
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
    
    stopVideoSync();
    stopMasterFollowerSystem();
    stopChatSystem();
    stopWebRTC();
    
    // Reset state
    appState.currentVideoRoom = "";
    appState.currentChatRoom = "";
    
    // Reset UI
    resetUI();
    
    console.log("✅ Cleanup completed");
  }
  
  function resetUI() {
    // Code fields
    if (elements.currentVideoCode) elements.currentVideoCode.textContent = "---";
    if (elements.currentChatCode) elements.currentChatCode.textContent = "---";
    if (elements.videoCodeInput) elements.videoCodeInput.value = "";
    if (elements.chatCodeInput) elements.chatCodeInput.value = "";
    
    // Containers
    if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
    if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
    if (elements.videoCodeDisplay) elements.videoCodeDisplay.classList.add("hidden");
    if (elements.chatCodeDisplay) elements.chatCodeDisplay.classList.add("hidden");
    
    // Status
    updateSyncStatus("⏸️ Synchronization off");
    updateVideoTimes(0, 0);
    
    if (elements.masterStatus) elements.masterStatus.textContent = "---";
    if (elements.currentMaster) elements.currentMaster.textContent = "---";
    if (elements.videoStatus) elements.videoStatus.textContent = "Click to start call";
    
    // Generated codes
    if (elements.generatedVideoCode) elements.generatedVideoCode.textContent = "-";
    if (elements.generatedChatCode) elements.generatedChatCode.textContent = "-";
  }
  
  // ================== STARTUP SYSTEM ==================
  
  function initApp() {
    console.log("🚀 Video Sync App v4 starting...");
    
    try {
      // Initialize Firebase
      if (!initFirebase()) {
        throw new Error("Firebase could not be initialized");
      }
      
      // Start systems in order
      setupPasswordValidation();
      initTabNavigation();
      initAuth();
      initRoomManagement();
      initMasterToggle();
      initWebRTC();
      
      // Initial UI state
      setInitialUIState();
      
      // Global event listeners
      setupGlobalEventListeners();
      
      appState.initialized = true;
      console.log("✅ App successfully started");
      showMessage("Video Sync App ready!");
      
    } catch (error) {
      console.error("❌ App startup error:", error);
      showMessage("Application startup error: " + error.message, true);
    }
  }
  
  function setInitialUIState() {
    // Auth screens
    if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
    if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
    if (elements.appContainer) elements.appContainer.classList.add("hidden");
    
    // Containers
    if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
    if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
    
    // Rooms section active
    if (elements.roomsSection) elements.roomsSection.classList.remove("hidden");
    
    // Activate first tab
    const firstTab = document.querySelector('.nav-tab[data-tab="rooms"]');
    if (firstTab) firstTab.classList.add('active');
    
    // Reset status
    resetUI();
    
    console.log("🎨 Initial UI state set");
  }
  
  function setupGlobalEventListeners() {
    // Global error handling
    window.addEventListener('error', (event) => {
      console.error("🚨 Global error:", event.error);
      showMessage("System error occurred!", true);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error("🚨 Promise rejection:", event.reason);
      showMessage("Connection error!", true);
    });
    
    // Cleanup on page close
    window.addEventListener('beforeunload', () => {
      console.log("📄 Page closing, cleaning up...");
      cleanup();
    });
    
    // Visibility change - tab switching
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log("👁️ Tab hidden");
      } else {
        console.log("👁️ Tab visible");
        // Refresh heartbeat
        if (masterSystem.active && masterSystem.usersRef) {
          masterSystem.usersRef.child(appState.currentUser).update({
            lastSeen: Date.now(),
            online: true
          });
        }
      }
    });
    
    console.log("🔧 Global event listeners set up");
  }
  
  // ================== GLOBAL API ==================
  
  // Global API for debugging and control
  window.videoSyncApp = {
    version: "4.0.0",
    appState,
    masterSystem,
    videoSync,
    chatSystem,
    webrtcSystem,
    elements,
    
    // Functions
    cleanup,
    showMessage,
    updateSyncStatus,
    
    // Debug functions
    getStatus: () => ({
      initialized: appState.initialized,
      currentUser: appState.currentUser,
      currentVideoRoom: appState.currentVideoRoom,
      currentChatRoom: appState.currentChatRoom,
      masterActive: masterSystem.active,
      videoSyncActive: videoSync.active,
      chatActive: chatSystem.active,
      iAmMaster: masterSystem.iAmMaster
    }),
    
    forceSync: () => {
      if (videoSync.active && !masterSystem.iAmMaster) {
        console.log("🔄 Manual sync triggered...");
        // Trigger manual sync
      }
    }
  };
  
  // Start the app
  initApp();
  
  console.log("🎉 Video Sync App v4 fully loaded!");
  console.log("📋 For debugging: window.videoSyncApp");
  
});