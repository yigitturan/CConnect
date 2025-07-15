// ================== TAMAMEN DÜZELTİLMİŞ SIDEPANEL - VIDEO SYNC & CHAT ==================
// Tüm sorunlar çözülmüş, temiz ve optimize edilmiş versiyon + Shared Note System

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Düzeltilmiş Video Sync App v6 başlatılıyor...");
  
  // ================== GLOBAL STATE ==================
  
  let appState = {
    currentUser: "",
    currentVideoRoom: "",
    currentChatRoom: "",
    database: null,
    initialized: false
  };
  
  // Master-Follower system - düzeltilmiş
  let masterSystem = {
    active: false,
    currentMaster: "",
    iAmMaster: false,
    roomRef: null,
    usersRef: null,
    listener: null,
    heartbeatTimer: null
  };
  
  // Video sync system - tamamen düzeltilmiş
  let videoSync = {
    active: false,
    roomRef: null,
    myRef: null,
    listener: null,
    activeTimer: null,          // Tek timer sistemi
    lastState: null,
    syncing: false,
    lastSyncTime: 0,           
    syncCooldown: 5000,         // 5 saniye cooldown (daha uzun)
    maxSyncDifference: 3.0,     // 3 saniye farkta sync yap
    consecutiveSyncs: 0,       
    maxConsecutiveSyncs: 3,     
    urgentSyncThreshold: 6.0,   // 6+ saniye fark için acil sync
    role: null                  // 'master' veya 'follower'
  };
  
  // Shared note system
  let sharedNoteSystem = {
    active: false,
    roomRef: null,
    listener: null,
    updateTimer: null,
    lastContent: "",
    isUpdating: false
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
    
    // Shared note
    sharedNoteInput: document.getElementById("sharedNoteInput"),
    sharedNoteLastUpdated: document.getElementById("sharedNoteLastUpdated"),
    clearSharedNote: document.getElementById("clearSharedNote"),
    
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
  
  // ================== FIREBASE SETUP ==================
  
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
        return false;
      }
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      appState.database = firebase.database();
      
      if (appState.database) {
        appState.database.goOnline();
        console.log("✅ Firebase initialized");
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
  
  // ================== AUTH SYSTEM ==================
  
  function initAuth() {
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
    
    const firstTab = document.querySelector('.nav-tab');
    if (firstTab) firstTab.click();
  }
  
  function performLogout() {
    cleanup();
    appState.currentUser = "";
    
    if (elements.appContainer) elements.appContainer.classList.add("hidden");
    if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
    
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
  
  // ================== SHARED NOTE SYSTEM ==================
  
  async function startSharedNoteSystem(roomId) {
    console.log("📝 Starting Shared Note system...");
    
    try {
      sharedNoteSystem.active = true;
      sharedNoteSystem.roomRef = appState.database.ref(`sharedNotes/${roomId}`);
      
      // Listen for changes
      sharedNoteSystem.listener = sharedNoteSystem.roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        updateSharedNoteUI(data);
      });
      
      // Setup input listeners
      setupSharedNoteInput();
      
      console.log("✅ Shared Note system started");
      
    } catch (error) {
      console.error("❌ Shared Note startup error:", error);
      showMessage("Shared note system error!", true);
    }
  }
  
  function setupSharedNoteInput() {
    if (!elements.sharedNoteInput) return;
    
    let typingTimer;
    const typingDelay = 1000; // 1 second delay after typing stops
    
    elements.sharedNoteInput.addEventListener('input', () => {
      const content = elements.sharedNoteInput.value.trim();
      
      // Clear existing timer
      clearTimeout(typingTimer);
      
      // Detect if it's a link
      const isLink = isValidUrl(content);
      elements.sharedNoteInput.classList.toggle('has-link', isLink);
      
      // Set new timer to update after user stops typing
      typingTimer = setTimeout(async () => {
        if (!sharedNoteSystem.isUpdating) {
          await updateSharedNote(content);
        }
      }, typingDelay);
    });
    
    // Handle enter key for immediate update
    elements.sharedNoteInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        clearTimeout(typingTimer);
        const content = elements.sharedNoteInput.value.trim();
        await updateSharedNote(content);
      }
    });
    
    // Clear button
    if (elements.clearSharedNote) {
      elements.clearSharedNote.addEventListener('click', async () => {
        await updateSharedNote("");
      });
    }
  }
  
  async function updateSharedNote(content) {
    if (!sharedNoteSystem.active || sharedNoteSystem.isUpdating) return;
    
    try {
      sharedNoteSystem.isUpdating = true;
      
      const noteData = {
        content: content,
        lastUpdatedBy: appState.currentUser,
        timestamp: Date.now()
      };
      
      await sharedNoteSystem.roomRef.set(noteData);
      
      console.log("📝 Shared note updated:", content.substring(0, 50) + (content.length > 50 ? "..." : ""));
      
    } catch (error) {
      console.error("Shared note update error:", error);
      showMessage("Note update error!", true);
    } finally {
      setTimeout(() => {
        sharedNoteSystem.isUpdating = false;
      }, 500);
    }
  }
  
  function updateSharedNoteUI(data) {
    if (!elements.sharedNoteInput || !elements.sharedNoteLastUpdated) return;
    
    const container = elements.sharedNoteInput.closest('.shared-note-container');
    
    if (data && data.content !== undefined) {
      const content = data.content || "";
      const lastUpdatedBy = data.lastUpdatedBy || "Unknown";
      const timestamp = data.timestamp || Date.now();
      
      // Only update if content is different (avoid self-update loops)
      if (elements.sharedNoteInput.value !== content) {
        elements.sharedNoteInput.value = content;
        
        // Add update animation
        elements.sharedNoteInput.classList.add('updated');
        setTimeout(() => {
          elements.sharedNoteInput.classList.remove('updated');
        }, 600);
      }
      
      // Update status
      if (content) {
        const timeAgo = getTimeAgo(timestamp);
        elements.sharedNoteLastUpdated.textContent = `Updated by ${lastUpdatedBy} ${timeAgo}`;
        
        // Check if it's a link
        const isLink = isValidUrl(content);
        elements.sharedNoteInput.classList.toggle('has-link', isLink);
        
        // Add content styling
        if (container) {
          container.classList.add('has-content');
        }
      } else {
        elements.sharedNoteLastUpdated.textContent = "No content";
        elements.sharedNoteInput.classList.remove('has-link');
        
        if (container) {
          container.classList.remove('has-content');
        }
      }
      
      sharedNoteSystem.lastContent = content;
      
    } else {
      // No data
      elements.sharedNoteInput.value = "";
      elements.sharedNoteLastUpdated.textContent = "No content";
      elements.sharedNoteInput.classList.remove('has-link');
      
      if (container) {
        container.classList.remove('has-content');
      }
    }
  }
  
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      // Check for common URL patterns without protocol
      const urlPattern = /^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}([\/\w\.-]*)*\/?$/;
      return urlPattern.test(string);
    }
  }
  
  function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) {
      return "just now";
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  }
  
  function stopSharedNoteSystem() {
    if (sharedNoteSystem.active) {
      sharedNoteSystem.active = false;
      
      if (sharedNoteSystem.listener && sharedNoteSystem.roomRef) {
        sharedNoteSystem.roomRef.off('value', sharedNoteSystem.listener);
        sharedNoteSystem.listener = null;
      }
      
      if (sharedNoteSystem.updateTimer) {
        clearTimeout(sharedNoteSystem.updateTimer);
        sharedNoteSystem.updateTimer = null;
      }
      
      // Reset UI
      if (elements.sharedNoteInput) {
        elements.sharedNoteInput.value = "";
        elements.sharedNoteInput.classList.remove('has-link', 'updated');
      }
      
      if (elements.sharedNoteLastUpdated) {
        elements.sharedNoteLastUpdated.textContent = "No content";
      }
      
      const container = elements.sharedNoteInput?.closest('.shared-note-container');
      if (container) {
        container.classList.remove('has-content');
      }
      
      sharedNoteSystem.lastContent = "";
      sharedNoteSystem.isUpdating = false;
      
      console.log("🛑 Shared Note system stopped");
    }
  }
  
  // ================== MASTER-FOLLOWER SYSTEM ==================
  
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
  
  // ================== TAMAMEN DÜZELTİLMİŞ UPDATE MASTER UI ==================
  
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
    
    // *** TAMAMEN DÜZELTİLMİŞ ROLE DEĞİŞİM SİSTEMİ ***
    if (videoSync.active) {
      console.log("🔄 Role changed, performing COMPLETE cleanup and restart...");
      
      // EKLE: Önce role'ü set et
      const newRole = masterSystem.iAmMaster ? 'master' : 'follower';
      videoSync.role = newRole; 

      // 1. TEK TİMER SİSTEMİ - TÜM TİMER'LARI TEMİZLE
      stopVideoSyncTimer();
      
      // 2. STATE'LERİ SIFIRLA
      videoSync.syncing = false;
      videoSync.lastSyncTime = 0;
      videoSync.consecutiveSyncs = 0;
      videoSync.role = masterSystem.iAmMaster ? 'master' : 'follower';
      
      // 3. UZUN BEKLEME VE TEMİZ BAŞLATMA
      setTimeout(() => {
        if (videoSync.active) {
          startVideoSyncTimer();
          console.log("✅ Clean timer restarted for role:", videoSync.role);
        }
      }, 3000); // 3 saniye bekleme (daha uzun)
    }
    
    // UI sync status güncelle
    if (masterSystem.iAmMaster) {
      updateSyncStatus("👑 Master - Broadcasting state");
    } else {
      updateSyncStatus("👤 Follower - Syncing to master");
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
  
  // ================== TAMAMEN DÜZELTİLMİŞ VIDEO SYNC SYSTEM ==================
  
  async function startVideoSync(roomId) {
    console.log("🎬 Starting FIXED Video Sync...");
    
    try {
      videoSync.active = true;
      videoSync.roomRef = appState.database.ref(`videoSync/${roomId}/states`);
      videoSync.myRef = videoSync.roomRef.child(appState.currentUser);
      videoSync.role = masterSystem.iAmMaster ? 'master' : 'follower';
      
      // *** TAMAMEN DÜZELTİLMİŞ STATE RESET ***
      videoSync.syncing = false;
      videoSync.lastSyncTime = 0;
      videoSync.consecutiveSyncs = 0;
      
      // *** TEK LISTENER SETUP ***
      if (videoSync.listener) {
        videoSync.roomRef.off('value', videoSync.listener);
      }
      videoSync.listener = videoSync.roomRef.on('value', handleVideoStateChange);
      
      // *** TEK TİMER SİSTEMİ BAŞLAT ***
      startVideoSyncTimer();
      
      updateSyncStatus("🎬 Video sync active");
      console.log("✅ FIXED Video sync started with role:", videoSync.role);
      
    } catch (error) {
      console.error("❌ Video sync startup error:", error);
      updateSyncStatus("❌ Video sync error");
    }
  }
  
  // ================== TEK TİMER SİSTEMİ - TAMAMEN DÜZELTİLMİŞ ==================
  
  function startVideoSyncTimer() {
    // Önce mevcut timer'ı temizle
    stopVideoSyncTimer();
    
    if (!videoSync.active) return;
    
    const role = masterSystem.iAmMaster ? 'master' : 'follower';
    videoSync.role = role;
    
    if (role === 'master') {
      // *** MASTER: 2 saniyede bir broadcast ***
      videoSync.activeTimer = setInterval(async () => {
        if (!videoSync.active || !masterSystem.iAmMaster) {
          stopVideoSyncTimer();
          return;
        }
        
        try {
          const videoState = await getVideoState();
          if (videoState.success) {
            const masterData = {
              currentTime: Number(videoState.currentTime.toFixed(2)),
              paused: Boolean(videoState.paused),
              url: videoState.videoUrl || window.location.href,
              timestamp: Date.now(),
              isMaster: true,
              nickname: appState.currentUser,
              playbackRate: videoState.playbackRate || 1,
              duration: videoState.duration || 0
            };
            
            await videoSync.myRef.set(masterData);
            videoSync.lastState = masterData;
            
            // UI güncelle - sadece kendi süreyi göster
            updateVideoTimes(masterData.currentTime, 0);
            
            console.log("📤 Master broadcast:", {
              time: masterData.currentTime.toFixed(1),
              paused: masterData.paused
            });
          }
        } catch (error) {
          console.error("Master broadcast error:", error);
        }
      }, 2000); // Master 2 saniyede bir
      
    } else {
      // *** FOLLOWER: 3 saniyede bir rapor ***
      videoSync.activeTimer = setInterval(async () => {
        if (!videoSync.active || masterSystem.iAmMaster) {
          stopVideoSyncTimer();
          return;
        }
        
        try {
          const videoState = await getVideoState();
          if (videoState.success) {
            const followerData = {
              currentTime: Number(videoState.currentTime.toFixed(2)),
              paused: Boolean(videoState.paused),
              url: videoState.videoUrl || window.location.href,
              timestamp: Date.now(),
              isMaster: false,
              nickname: appState.currentUser,
              playbackRate: videoState.playbackRate || 1,
              duration: videoState.duration || 0
            };
            
            await videoSync.myRef.set(followerData);
          }
        } catch (error) {
          console.error("Follower report error:", error);
        }
      }, 3000); // Follower 3 saniyede bir
    }
    
    console.log(`🔄 Clean timer started - Role: ${role} (Timer ID: ${videoSync.activeTimer})`);
  }
  
  function stopVideoSyncTimer() {
    if (videoSync.activeTimer) {
      clearInterval(videoSync.activeTimer);
      videoSync.activeTimer = null;
      console.log("🛑 Video sync timer stopped");
    }
  }
  
  // ================== MASTER STATE BULMA - DÜZELTİLMİŞ ==================

function findMasterState(states) {
  const masterUser = masterSystem.currentMaster;
  
  if (!masterUser) {
    console.log("⚠️ No current master set");
    return null;
  }
  
  const masterState = states[masterUser];
  
  if (!masterState) {
    console.log(`⚠️ Master ${masterUser} state not found in Firebase`);
    return null;
  }
  
  // *** YENİ: Timestamp kontrolü ***
  const stateAge = Date.now() - masterState.timestamp;
  if (stateAge > 15000) {
    console.log(`⚠️ Master state too old: ${stateAge}ms`);
    return null;
  }
  
  // *** YENİ: Temel değer kontrolleri ***
  if (typeof masterState.currentTime !== 'number' || isNaN(masterState.currentTime) || masterState.currentTime < 0) {
    console.log(`⚠️ Invalid master currentTime: ${masterState.currentTime}`);
    return null;
  }
  
  console.log(`👑 Master state found: ${masterUser} at ${masterState.currentTime.toFixed(1)}s`);
  return masterState;
}

  function validateStateObject(state, source) {
    if (!state) {
      console.warn(`⚠️ Null state from ${source}`);
      return false;
    }
    
    if (typeof state.currentTime !== 'number' || isNaN(state.currentTime) || state.currentTime < 0) {
      console.warn(`⚠️ Invalid currentTime from ${source}:`, state.currentTime);
      return false;
    }
    
    if (typeof state.paused !== 'boolean') {
      console.warn(`⚠️ Invalid paused state from ${source}:`, state.paused);
      return false;
    }
    
    if (!state.timestamp || typeof state.timestamp !== 'number') {
      console.warn(`⚠️ Invalid timestamp from ${source}:`, state.timestamp);
      return false;
    }
    
    const stateAge = Date.now() - state.timestamp;
    if (stateAge > 15000) {
      console.warn(`⚠️ Stale state from ${source}, age: ${stateAge}ms`);
      return false;
    }
    
    return true;
  }
  
  // ================== VIDEO STATE CHANGE HANDLER - DÜZELTİLMİŞ ==================

function handleVideoStateChange(snapshot) {
  if (!snapshot.exists()) return;
  
  try {
    const states = snapshot.val();
    
    if (masterSystem.iAmMaster) {
      // *** MASTER: Sadece kendi durumunu göster ***
      const myState = states[appState.currentUser];
      
      if (myState && validateStateObject(myState, 'master_self')) {
        updateVideoTimes(myState.currentTime, 0);
      }
      return; // Master hiçbir zaman sync yapmaz!
    }
    
    // *** FOLLOWER: Master'a sync yap ***
    const masterState = findMasterState(states);
    const myState = states[appState.currentUser];
    
    if (!masterState) {
      console.log("⚠️ No valid master state found");
      updateVideoTimes(myState?.currentTime || 0, 0);
      return;
    }
    
    if (!myState || !validateStateObject(myState, 'follower_self')) {
      console.log("⚠️ No valid follower state found");
      updateVideoTimes(0, masterState.currentTime);
      return;
    }
    
    // UI güncelle
    updateVideoTimes(myState.currentTime, masterState.currentTime);
    
    // Sync işlemi
    performVideoSync(masterState, myState);
    
  } catch (error) {
    console.error("Video state change error:", error);
  }
}
  
  // ================== SYNC İŞLEMİ - BASIT VE GÜVENLİ ==================

async function performVideoSync(masterState, myState) {
  const now = Date.now();
  
  // *** DÖNGÜ ÖNLEYİCİ KONTROLLER ***
  
  // 1. Zaten sync yapılıyor mu?
  if (videoSync.syncing) {
    return;
  }
  
  // 2. Cooldown kontrolü
  if (now - videoSync.lastSyncTime < videoSync.syncCooldown) {
    return;
  }
  
  // 3. State yaşı kontrolü
  const masterAge = now - masterState.timestamp;
  const myAge = now - myState.timestamp;
  
  if (masterAge > 10000 || myAge > 10000) {
    console.log("⚠️ Stale state detected, skipping sync");
    return;
  }
  
  // *** FARK HESAPLAMA ***
  const timeDiff = Math.abs(myState.currentTime - masterState.currentTime);
  const pauseStateDiff = myState.paused !== masterState.paused;
  
  // Küçük farklar için sync yapma
  if (timeDiff < videoSync.maxSyncDifference && !pauseStateDiff) {
    updateSyncStatus(`✅ Synced - ${timeDiff.toFixed(1)}s diff`);
    return;
  }
  
  // *** SYNC İŞLEMİNİ GERÇEKLEŞTİR ***
  console.log("🔄 Performing sync:", {
    masterTime: masterState.currentTime.toFixed(2),
    myTime: myState.currentTime.toFixed(2),
    timeDiff: timeDiff.toFixed(2),
    pauseStateDiff
  });
  
  videoSync.syncing = true;
  videoSync.lastSyncTime = now;
  
  try {
    updateSyncStatus("🔄 Synchronizing...");
    
    let syncSuccess = false;
    
    // 1. Pause/Play state sync (önce bu)
    if (pauseStateDiff) {
      if (masterState.paused && !myState.paused) {
        console.log("⏸️ Syncing to pause");
        await executeVideoAction('pauseVideo');
        await sleep(300);
      } else if (!masterState.paused && myState.paused) {
        console.log("▶️ Syncing to play");
        await executeVideoAction('playVideo');
        await sleep(300);
      }
    }
    
        // 2. Time sync (sonra bu)
    if (timeDiff > videoSync.maxSyncDifference) {
      console.log(`⏭️ Syncing time: ${myState.currentTime.toFixed(2)}s → ${masterState.currentTime.toFixed(2)}s`);
      
      // *** YENİ: Network compensation ***
      let targetTime = masterState.currentTime;
      const masterAge = now - masterState.timestamp;
      if (!masterState.paused && masterAge > 1000) {
        const compensationSeconds = masterAge / 1000;
        targetTime += Math.min(compensationSeconds, 2); // Max 2 saniye kompensasyon
        console.log(`🔧 Network compensation: +${compensationSeconds.toFixed(1)}s`);
      }
      
      const timeSuccess = await executeVideoAction('setVideoTime', targetTime);
      syncSuccess = timeSuccess;
      
      if (timeSuccess) {
        // Sync sonrası play state kontrolü
        if (!masterState.paused) {
          setTimeout(async () => {
            const currentState = await getVideoState();
            if (currentState.success && currentState.paused) {
              console.log("🔄 Restarting video after time sync");
              await executeVideoAction('playVideo');
            }
          }, 800);
        }
      }
    } else {
      syncSuccess = true;
    }
    
    // Sonuç
    if (syncSuccess) {
      updateSyncStatus(`✅ Sync successful`);
      videoSync.consecutiveSyncs = 0;
    } else {
      updateSyncStatus(`❌ Sync failed`);
      videoSync.consecutiveSyncs++;
    }
    
  } catch (error) {
    console.error("Sync error:", error);
    updateSyncStatus("❌ Sync error");
    videoSync.consecutiveSyncs++;
  } finally {
    // Her zaman syncing flag'ini temizle
    setTimeout(() => {
      videoSync.syncing = false;
    }, 1500);
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
    
    // Tek timer sistemini durdur
    stopVideoSyncTimer();
    
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
    videoSync.role = null;
    
    updateSyncStatus("⏸️ Video sync stopped");
    updateVideoTimes(0, 0);
    
    console.log("🛑 Video sync stopped completely");
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
          
          // Switch to video tab
          const videoTab = document.querySelector('.nav-tab[data-tab="video"]');
          if (videoTab) videoTab.click();
          
          // Start systems
          await startMasterFollowerSystem(code);
          await startVideoSync(code);
          await startSharedNoteSystem(code);
          
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
      stopSharedNoteSystem();
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
  
  // Mesaj içeriği
  const isOwn = message.sender === appState.currentUser;
  
  // HTML yapısı
  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-sender">${message.sender}</span>
      <span class="message-time">${formatMessageTime(message.timestamp)}</span>
    </div>
    <div class="message-text">${escapeHtml(message.text)}</div>
  `;
  
  // CSS sınıfları
  messageEl.className = isOwn ? "message own-message" : "message other-message";
  
  // Renk sistemi (diğer kişiler için)
  if (!isOwn) {
    const colors = ["#8b5cf6", "#ef4444", "#f59e0b", "#10b981", "#3b82f6"];
    const colorIndex = message.sender.charCodeAt(0) % colors.length;
    const senderEl = messageEl.querySelector('.message-sender');
    if (senderEl) {
      senderEl.style.backgroundColor = colors[colorIndex];
    }
  }
  
  elements.messagesContainer.appendChild(messageEl);
}

// Yardımcı fonksiyonlar
function formatMessageTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Bugünse sadece saat:dakika
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // Eski mesajlar için tarih de
  return date.toLocaleString('tr-TR', { 
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
    elements.remoteVideo.style.transform = "scaleX(-1)";
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
  
  stopVideoSync();
  stopMasterFollowerSystem();
  stopSharedNoteSystem();
  stopChatSystem();
  stopWebRTC();
  
  appState.currentVideoRoom = "";
  appState.currentChatRoom = "";
  
  resetUI();
  
  console.log("✅ Cleanup completed");
}

function resetUI() {
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
  if (elements.videoStatus) elements.videoStatus.textContent = "Click to start call";
  
  if (elements.generatedVideoCode) elements.generatedVideoCode.textContent = "-";
  if (elements.generatedChatCode) elements.generatedChatCode.textContent = "-";
}

// ================== STARTUP SYSTEM ==================

function initApp() {
  console.log("🚀 Fixed Video Sync App v6 starting...");
  
  try {
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
    showMessage("Fixed Video Sync App v6 ready!");
    
  } catch (error) {
    console.error("❌ App startup error:", error);
    showMessage("Application startup error: " + error.message, true);
  }
}

function setInitialUIState() {
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
}

function setupGlobalEventListeners() {
  window.addEventListener('error', (event) => {
    console.error("🚨 Global error:", event.error);
    showMessage("System error occurred!", true);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error("🚨 Promise rejection:", event.reason);
    showMessage("Connection error!", true);
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

// ================== EMERGENCY RECOVERY SYSTEM ==================

function emergencyRecovery() {
  console.log("🚨 Emergency recovery starting...");
  
  try {
    // 1. Stop all timers aggressively
    stopVideoSyncTimer();
    
    if (masterSystem.heartbeatTimer) {
      clearInterval(masterSystem.heartbeatTimer);
      masterSystem.heartbeatTimer = null;
    }
    
    // Clear any remaining timers
    for (let i = 1; i < 99999; i++) {
      try {
        clearInterval(i);
        clearTimeout(i);
      } catch (e) {
        // Ignore errors
      }
    }
    
    // 2. Reset all states
    videoSync.syncing = false;
    videoSync.lastSyncTime = 0;
    videoSync.consecutiveSyncs = 0;
    videoSync.role = null;
    
    // 3. Restart systems if active
    if (videoSync.active && appState.currentVideoRoom) {
      setTimeout(() => {
        console.log("🔄 Restarting video sync after emergency recovery...");
        videoSync.role = masterSystem.iAmMaster ? 'master' : 'follower';
        startVideoSyncTimer();
      }, 3000);
    }
    
    if (masterSystem.active) {
      setTimeout(() => {
        console.log("🔄 Restarting heartbeat after emergency recovery...");
        startHeartbeat();
      }, 2000);
    }
    
    updateSyncStatus("🔧 Emergency recovery completed");
    showMessage("Emergency recovery completed successfully!");
    console.log("✅ Emergency recovery completed");
    
  } catch (error) {
    console.error("❌ Emergency recovery failed:", error);
    showMessage("Emergency recovery failed: " + error.message, true);
  }
}

// ================== DEBUG AND MONITORING ==================

function getSystemStatus() {
  return {
    timestamp: Date.now(),
    version: "6.0.0-completely-fixed-with-shared-notes",
    appState: {
      initialized: appState.initialized,
      currentUser: appState.currentUser,
      currentVideoRoom: appState.currentVideoRoom,
      currentChatRoom: appState.currentChatRoom
    },
    masterSystem: {
      active: masterSystem.active,
      iAmMaster: masterSystem.iAmMaster,
      currentMaster: masterSystem.currentMaster,
      heartbeatActive: !!masterSystem.heartbeatTimer
    },
    videoSync: {
      active: videoSync.active,
      role: videoSync.role,
      syncing: videoSync.syncing,
      lastSyncTime: videoSync.lastSyncTime,
      consecutiveSyncs: videoSync.consecutiveSyncs,
      timerActive: !!videoSync.activeTimer,
      syncCooldown: videoSync.syncCooldown,
      maxSyncDifference: videoSync.maxSyncDifference
    },
    sharedNoteSystem: {
      active: sharedNoteSystem.active,
      listenerActive: !!sharedNoteSystem.listener,
      lastContent: sharedNoteSystem.lastContent,
      isUpdating: sharedNoteSystem.isUpdating
    },
    chatSystem: {
      active: chatSystem.active,
      listenerActive: !!chatSystem.listener
    },
    webrtcSystem: {
      hasLocalStream: !!webrtcSystem.localStream,
      hasRemoteStream: !!webrtcSystem.remoteStream,
      connectionState: webrtcSystem.peerConnection?.connectionState || 'none',
      isCameraOn: webrtcSystem.isCameraOn,
      isMicOn: webrtcSystem.isMicOn
    }
  };
}

function getSyncDebugInfo() {
  return {
    timestamp: Date.now(),
    videoSyncActive: videoSync.active,
    masterSystemActive: masterSystem.active,
    iAmMaster: masterSystem.iAmMaster,
    currentMaster: masterSystem.currentMaster,
    currentRole: videoSync.role,
    syncing: videoSync.syncing,
    lastSyncTime: videoSync.lastSyncTime,
    consecutiveSyncs: videoSync.consecutiveSyncs,
    cooldownRemaining: Math.max(0, videoSync.syncCooldown - (Date.now() - videoSync.lastSyncTime)),
    timers: {
      activeTimer: !!videoSync.activeTimer,
      heartbeatTimer: !!masterSystem.heartbeatTimer
    },
    settings: {
      syncCooldown: videoSync.syncCooldown,
      maxSyncDifference: videoSync.maxSyncDifference,
      urgentSyncThreshold: videoSync.urgentSyncThreshold,
      maxConsecutiveSyncs: videoSync.maxConsecutiveSyncs
    }
  };
}

function resetSyncState() {
  videoSync.syncing = false;
  videoSync.lastSyncTime = 0;
  videoSync.consecutiveSyncs = 0;
  console.log("🔄 Sync state manually reset");
  updateSyncStatus("🔄 Sync reset");
}

// ================== GLOBAL API ==================

window.videoSyncApp = {
  version: "6.0.0-completely-fixed-with-shared-notes",
  appState,
  masterSystem,
  videoSync,
  sharedNoteSystem,
  chatSystem,
  webrtcSystem,
  elements,
  
  // Core functions
  cleanup,
  showMessage,
  updateSyncStatus,
  emergencyRecovery,
  
  // Debug functions
  getSyncDebugInfo,
  resetSyncState,
  getSystemStatus,
  
  // Status function
  getStatus: getSystemStatus,
  
  // Convenience functions
  resetSync: resetSyncState,
  debugSync: getSyncDebugInfo,
  emergency: emergencyRecovery,
  
  // Timer control
  stopTimer: stopVideoSyncTimer,
  startTimer: startVideoSyncTimer,
  
  // Advanced debug
  getVideoState: getVideoState,
  executeVideoAction: executeVideoAction,
  
  // Emergency functions
  clearAllTimers: () => {
    for (let i = 1; i < 99999; i++) {
      try {
        clearInterval(i);
        clearTimeout(i);
      } catch (e) {}
    }
    console.log("🧹 All timers cleared");
  }
};

// ================== INITIALIZATION ==================

// Start the app
initApp();

// ================== FINAL STATUS REPORTING ==================

setTimeout(() => {
  const status = getSystemStatus();
  console.log("🎉 FIXED VIDEO SYNC APP v6 WITH SHARED NOTES FULLY LOADED!");
  console.log("📊 System Status:", status);
  console.log("📋 Available debug commands:");
  console.log("  - window.videoSyncApp.getStatus()");
  console.log("  - window.videoSyncApp.getSyncDebugInfo()");
  console.log("  - window.videoSyncApp.resetSyncState()");
  console.log("  - window.videoSyncApp.emergencyRecovery()");
  console.log("🔧 Emergency functions:");
  console.log("  - window.videoSyncApp.cleanup()");
  console.log("  - window.videoSyncApp.clearAllTimers()");
  console.log("  - window.videoSyncApp.stopTimer()");
  console.log("  - window.videoSyncApp.startTimer()");
  
  console.log("🎯 MAJOR FIXES APPLIED:");
  console.log("  ✅ Single timer system (no more conflicts)");
  console.log("  ✅ Proper role-based cleanup");
  console.log("  ✅ Extended cooldown periods (5s)");
  console.log("  ✅ Enhanced error recovery");
  console.log("  ✅ Removed Enhanced system conflicts");
  console.log("  ✅ Improved state management");
  console.log("  ✅ Emergency recovery system");
  console.log("  ✅ Shared Note system integrated");
  
}, 2000);

// Final ready message
setTimeout(() => {
  console.log("🎯 VIDEO SYNC APP WITH SHARED NOTES TAMAMEN DÜZELTİLDİ!");
  console.log(`⏰ Yükleme zamanı: ${new Date().toLocaleString('tr-TR')}`);
  console.log(`🔢 App versiyon: v6.0.0-completely-fixed-with-shared-notes`);
  console.log("🔧 Düzeltilen ana sorunlar:");
  console.log("  ✅ Çifte timer sistemi kaldırıldı");
  console.log("  ✅ Enhanced sistem çakışması çözüldü");
  console.log("  ✅ Role değişim timer cleanup'ı düzeltildi");
  console.log("  ✅ Sync cooldown 5 saniyeye çıkarıldı");
  console.log("  ✅ Emergency recovery sistemi eklendi");
  console.log("  ✅ Tüm state management'lar temizlendi");
  console.log("  ✅ Shared Note sistemi eklendi");
  console.log("🏁 Initialization complete - Ready for stable synchronized video experience with shared notes!");
}, 3000);

});

// ================== END OF FILE ==================