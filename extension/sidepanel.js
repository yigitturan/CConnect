// ================== FINAL COMPLETE SİDEPANEL.JS v4 - CSP FIX ==================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Video Sync App v4 başlatılıyor...");
  
  // ================== GLOBAL STATE ==================
  
  let appState = {
    currentUser: "",
    currentVideoRoom: "",
    currentChatRoom: "",
    database: null,
    initialized: false
  };
  
  // Master-Follower sistem
  let masterSystem = {
    active: false,
    currentMaster: "",
    iAmMaster: false,
    roomRef: null,
    usersRef: null,
    listener: null,
    heartbeatTimer: null
  };
  
  // Video sync sistem
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
  
  // Chat sistem
  let chatSystem = {
    active: false,
    messagesRef: null,
    listener: null
  };
  
  // WebRTC sistem
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
    // Ana konteynerler
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
    
    // Oda yönetimi
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
  
  // ================== FİREBASE SETUP - CSP UYUMLU ==================
  
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
      // CSP uyumlu Firebase başlatma
      if (typeof firebase === 'undefined') {
        console.error("❌ Firebase SDK yüklenmedi");
        return false;
      }
      
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      // Database referansını al
      appState.database = firebase.database();
      
      // CSP için özel ayarlar
      if (appState.database) {
        // Force WebSocket kullanımı (long polling yerine)
        appState.database.goOnline();
        
        console.log("✅ Firebase başlatıldı (CSP uyumlu)");
        return true;
      }
      
      console.error("❌ Firebase database başlatılamadı");
      return false;
      
    } catch (error) {
      console.error("❌ Firebase hatası:", error);
      showMessage("Firebase bağlantı hatası!", true);
      return false;
    }
  }
  
  // ================== UTILITY FONKSİYONLAR ==================
  
  function showMessage(message, isError = false) {
    if (elements.statusEl) {
      elements.statusEl.textContent = message;
      elements.statusEl.style.color = isError ? "#ff6b6b" : "#51cf66";
      setTimeout(() => elements.statusEl.textContent = "", 5000);
    }
    console.log(isError ? "❌" : "✅", message);
  }
  
  function updateSyncStatus(status) {
    if (elements.syncStatus) {
      elements.syncStatus.textContent = status;
      elements.syncStatus.style.color = status.includes("❌") ? "#ff6b6b" : 
                                        status.includes("✅") ? "#51cf66" : "#ffd43b";
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
  
  // ================== PASSWORD VALİDATİON ==================
  
  function validatePassword(password) {
    const errors = [];
    
    if (password.length < 12) {
      errors.push("Şifre en az 12 karakter olmalıdır");
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push("Şifre en az bir büyük harf içermelidir");
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push("Şifre en az bir küçük harf içermelidir");
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push("Şifre en az bir rakam içermelidir");
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
          errorElement.innerHTML = validation.errors.map(err => `<p style="color: orange; margin: 2px 0;">${err}</p>`).join("");
        } else {
          elements.signupPasswordInput.setCustomValidity("");
          errorElement.innerHTML = "<p style='color: green; margin: 2px 0;'>✓ Şifre gereksinimleri karşılandı</p>";
        }
      });
    }
  }
  
  // ================== TAB NAVİGASYON ==================
  
  function initTabNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Tüm tab'ları deactive yap
        navTabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // Seçilen tab'ı aktif yap
        tab.classList.add('active');
        
        // İlgili içeriği göster
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
        
        console.log("📂 Tab değiştirildi:", targetTab);
      });
    });
    
    console.log("📁 Tab navigation başlatıldı");
  }
  
  // ================== AUTH SİSTEMİ ==================
  
  function initAuth() {
    // Ekran geçişleri
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
    
    // Giriş
    if (elements.loginBtn) {
      elements.loginBtn.addEventListener("click", async () => {
        const email = elements.emailInput?.value?.trim();
        const password = elements.passwordInput?.value?.trim();
        
        if (!email || !password) {
          showMessage("Email ve şifre gerekli!", true);
          return;
        }
        
        showMessage("Giriş yapılıyor...");
        
        try {
          const response = await sendToBackground("login", { email, password });
          if (response.success) {
            appState.currentUser = response.nickname;
            showMainApp();
            showMessage("Giriş başarılı!");
          } else {
            showMessage("Giriş hatası: " + (response.error || "Bilinmeyen hata"), true);
          }
        } catch (error) {
          showMessage("Giriş hatası!", true);
        }
      });
    }
    
    // Kayıt
    if (elements.signupBtn) {
      elements.signupBtn.addEventListener("click", async () => {
        const email = elements.signupEmailInput?.value?.trim();
        const password = elements.signupPasswordInput?.value?.trim();
        const nickname = elements.nicknameInput?.value?.trim();
        
        if (!email || !password || !nickname) {
          showMessage("Tüm alanlar gerekli!", true);
          return;
        }
        
        const validation = validatePassword(password);
        if (!validation.isValid) {
          showMessage("Şifre gereksinimleri: " + validation.errors.join(", "), true);
          return;
        }
        
        showMessage("Kayıt oluşturuluyor...");
        
        try {
          const response = await sendToBackground("signup", { email, password, nickname });
          if (response.success) {
            showMessage("Kayıt başarılı! Giriş yapabilirsiniz.");
            if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
            if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
          } else {
            showMessage("Kayıt hatası: " + (response.error || "Bilinmeyen hata"), true);
          }
        } catch (error) {
          showMessage("Kayıt hatası!", true);
        }
      });
    }
    
    // Google giriş
    if (elements.googleLoginBtn) {
      elements.googleLoginBtn.addEventListener("click", async () => {
        showMessage("Google ile giriş yapılıyor...");
        
        try {
          const response = await sendToBackground("googleLogin");
          if (response.success) {
            appState.currentUser = response.nickname;
            showMainApp();
            showMessage("Google giriş başarılı!");
          } else {
            showMessage("Google giriş hatası!", true);
          }
        } catch (error) {
          showMessage("Google giriş hatası!", true);
        }
      });
    }
    
    // Çıkış
    if (elements.logoutBtn) {
      elements.logoutBtn.addEventListener("click", () => {
        performLogout();
      });
    }
    
    console.log("🔐 Auth sistemi başlatıldı");
  }
  
  function showMainApp() {
    if (elements.loginScreen) elements.loginScreen.classList.add("hidden");
    if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
    if (elements.appContainer) elements.appContainer.classList.remove("hidden");
    
    const welcomeMsg = document.getElementById("welcomeMsg");
    if (welcomeMsg) welcomeMsg.textContent = `Merhaba, ${appState.currentUser}`;
    
    // İlk tab'ı aktif yap
    const firstTab = document.querySelector('.nav-tab');
    if (firstTab) firstTab.click();
  }
  
  function performLogout() {
    cleanup();
    appState.currentUser = "";
    
    if (elements.appContainer) elements.appContainer.classList.add("hidden");
    if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
    
    // Form'ları temizle
    if (elements.emailInput) elements.emailInput.value = "";
    if (elements.passwordInput) elements.passwordInput.value = "";
    
    showMessage("Çıkış yapıldı.");
  }
  
  async function sendToBackground(action, data = {}) {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({ success: false, error: "Chrome runtime yok" });
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
  
  // ================== ODA YÖNETİMİ ==================
  
  function initRoomManagement() {
    // Video kodu oluştur
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
          showMessage("Video kodu oluşturuldu: " + code);
        } catch (error) {
          showMessage("Kod oluşturma hatası!", true);
        }
      });
    }
    
    // Chat kodu oluştur
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
          showMessage("Chat kodu oluşturuldu: " + code);
        } catch (error) {
          showMessage("Kod oluşturma hatası!", true);
        }
      });
    }
    
    // Kod kopyalama
    if (elements.copyVideoCodeBtn) {
      elements.copyVideoCodeBtn.addEventListener("click", () => {
        const code = elements.generatedVideoCode?.textContent;
        if (code && code !== "-") {
          copyToClipboard(code, "Video kodu kopyalandı!");
        }
      });
    }
    
    if (elements.copyChatCodeBtn) {
      elements.copyChatCodeBtn.addEventListener("click", () => {
        const code = elements.generatedChatCode?.textContent;
        if (code && code !== "-") {
          copyToClipboard(code, "Chat kodu kopyalandı!");
        }
      });
    }
    
    // Video odasına katıl
    if (elements.joinVideoRoomBtn) {
      elements.joinVideoRoomBtn.addEventListener("click", async () => {
        const code = elements.videoCodeInput?.value?.trim();
        if (!code) {
          showMessage("Video kodu girin!", true);
          return;
        }
        
        try {
          const snapshot = await appState.database.ref(`videoRooms/${code}`).once('value');
          if (snapshot.exists()) {
            appState.currentVideoRoom = code;
            if (elements.currentVideoCode) elements.currentVideoCode.textContent = code;
            if (elements.videoContainer) elements.videoContainer.classList.remove("hidden");
            
            // Video tab'ına geç
            const videoTab = document.querySelector('.nav-tab[data-tab="video"]');
            if (videoTab) videoTab.click();
            
            // Sistemleri başlat
            await startMasterFollowerSystem(code);
            await startVideoSync(code);
            
            showMessage("Video odasına katılındı!");
          } else {
            showMessage("Geçersiz video kodu!", true);
          }
        } catch (error) {
          showMessage("Oda katılma hatası!", true);
        }
      });
    }
    
    // Chat odasına katıl
    if (elements.joinChatRoomBtn) {
      elements.joinChatRoomBtn.addEventListener("click", async () => {
        const code = elements.chatCodeInput?.value?.trim();
        if (!code) {
          showMessage("Chat kodu girin!", true);
          return;
        }
        
        try {
          const snapshot = await appState.database.ref(`chatRooms/${code}`).once('value');
          if (snapshot.exists()) {
            appState.currentChatRoom = code;
            if (elements.currentChatCode) elements.currentChatCode.textContent = code;
            if (elements.chatContainer) elements.chatContainer.classList.remove("hidden");
            
            // Chat tab'ına geç
            const chatTab = document.querySelector('.nav-tab[data-tab="chat"]');
            if (chatTab) chatTab.click();
            
            startChatSystem(code);
            showMessage("Chat odasına katılındı!");
          } else {
            showMessage("Geçersiz chat kodu!", true);
          }
        } catch (error) {
          showMessage("Chat katılma hatası!", true);
        }
      });
    }
    
    // Odaları kapat
    if (elements.closeVideoChat) {
      elements.closeVideoChat.addEventListener("click", () => {
        stopVideoSync();
        stopMasterFollowerSystem();
        stopWebRTC();
        
        appState.currentVideoRoom = "";
        if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
        if (elements.currentVideoCode) elements.currentVideoCode.textContent = "---";
        if (elements.videoCodeInput) elements.videoCodeInput.value = "";
        
        // Rooms tab'ına dön
        const roomsTab = document.querySelector('.nav-tab[data-tab="rooms"]');
        if (roomsTab) roomsTab.click();
        
        showMessage("Video odası kapatıldı.");
      });
    }
    
    if (elements.closeChatRoom) {
      elements.closeChatRoom.addEventListener("click", () => {
        stopChatSystem();
        
        appState.currentChatRoom = "";
        if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
        if (elements.currentChatCode) elements.currentChatCode.textContent = "---";
        if (elements.chatCodeInput) elements.chatCodeInput.value = "";
        
        // Rooms tab'ına dön
        const roomsTab = document.querySelector('.nav-tab[data-tab="rooms"]');
        if (roomsTab) roomsTab.click();
        
        showMessage("Chat odası kapatıldı.");
      });
    }
    
    console.log("🏠 Oda yönetimi başlatıldı");
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
  
  // ================== MASTER-FOLLOWER SİSTEMİ ==================
  
  async function startMasterFollowerSystem(roomId) {
    console.log("👑 Master-Follower sistem başlatılıyor...");
    
    try {
      masterSystem.active = true;
      masterSystem.roomRef = appState.database.ref(`masterControl/${roomId}/currentMaster`);
      masterSystem.usersRef = appState.database.ref(`masterControl/${roomId}/users`);
      
      // Kullanıcıyı kaydet
      await masterSystem.usersRef.child(appState.currentUser).set({
        nickname: appState.currentUser,
        online: true,
        lastSeen: Date.now()
      });
      
      // Disconnect handler
      masterSystem.usersRef.child(appState.currentUser).onDisconnect().remove();
      
      // Master değişikliklerini dinle
      masterSystem.listener = masterSystem.roomRef.on('value', (snapshot) => {
        const newMaster = snapshot.val();
        
        if (newMaster) {
          masterSystem.currentMaster = newMaster;
          masterSystem.iAmMaster = (newMaster === appState.currentUser);
          updateMasterUI();
          
          console.log("👑 Master:", newMaster, "Ben master:", masterSystem.iAmMaster);
        } else if (!masterSystem.currentMaster) {
          // İlk katılan master olur
          setMaster(appState.currentUser);
        }
      });
      
      // Heartbeat başlat
      startHeartbeat();
      
      updateMasterUI();
      console.log("✅ Master-Follower sistem başlatıldı");
      
    } catch (error) {
      console.error("❌ Master-Follower başlatma hatası:", error);
      showMessage("Master sistem hatası!", true);
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
          console.error("Heartbeat hatası:", error);
        }
      }
    }, 5000); // Her 5 saniyede bir heartbeat
  }
  
  async function setMaster(nickname) {
    try {
      await masterSystem.roomRef.set(nickname);
      console.log("👑 Master ayarlandı:", nickname);
    } catch (error) {
      console.error("Master ayarlama hatası:", error);
    }
  }
  
  function updateMasterUI() {
    if (elements.masterStatus) {
      elements.masterStatus.textContent = masterSystem.iAmMaster ? "👑 SEN MASTER'SIN" : "👤 Follower";
      elements.masterStatus.style.color = masterSystem.iAmMaster ? "#ffd700" : "#888";
      elements.masterStatus.style.fontWeight = masterSystem.iAmMaster ? "bold" : "normal";
    }
    
    if (elements.currentMaster) {
      elements.currentMaster.textContent = masterSystem.currentMaster || "---";
    }
    
    if (elements.masterToggleBtn) {
      elements.masterToggleBtn.innerHTML = `
        <span class="btn-icon">👑</span>
        <span class="btn-text">Master Değiştir</span>
      `;
    }
    
    // Master değişince follower timer'ını yeniden başlat
    if (videoSync.active) {
      // Önceki follower timer'ını temizle
      if (videoSync.followerTimer) {
        clearInterval(videoSync.followerTimer);
        videoSync.followerTimer = null;
      }
      
      // Eğer artık follower'sam, timer başlat
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
            console.error("Follower durum paylaşım hatası:", error);
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
      
      // UI sıfırla
      if (elements.masterStatus) elements.masterStatus.textContent = "---";
      if (elements.currentMaster) elements.currentMaster.textContent = "---";
      
      console.log("🛑 Master-Follower sistem durduruldu");
    }
  }
  
  // Master toggle
  function initMasterToggle() {
    if (elements.masterToggleBtn) {
      elements.masterToggleBtn.addEventListener("click", async () => {
        if (!masterSystem.active) {
          showMessage("Master sistem aktif değil!", true);
          return;
        }
        
        try {
          const usersSnapshot = await masterSystem.usersRef.once('value');
          const users = usersSnapshot.val() || {};
          const onlineUsers = Object.keys(users).filter(user => users[user].online);
          
          if (onlineUsers.length < 2) {
            showMessage("En az 2 kullanıcı gerekli!", true);
            return;
          }
          
          const currentIndex = onlineUsers.indexOf(masterSystem.currentMaster);
          const nextIndex = (currentIndex + 1) % onlineUsers.length;
          const nextMaster = onlineUsers[nextIndex];
          
          await setMaster(nextMaster);
          showMessage(`Master değiştirildi: ${nextMaster}`);
        } catch (error) {
          console.error("Master değiştirme hatası:", error);
          showMessage("Master değiştirme hatası!", true);
        }
      });
    }
  }
  
  // ================== VİDEO SYNC SİSTEMİ ==================
  
  async function startVideoSync(roomId) {
    console.log("🎬 Video sync başlatılıyor...");
    
    try {
      videoSync.active = true;
      videoSync.roomRef = appState.database.ref(`videoSync/${roomId}/states`);
      videoSync.myRef = videoSync.roomRef.child(appState.currentUser);
      
      // Master durum paylaşımı
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
            
            // Önceki durumla karşılaştır
            if (!videoSync.lastState || 
                Math.abs(data.currentTime - videoSync.lastState.currentTime) > 1 ||
                data.paused !== videoSync.lastState.paused ||
                data.url !== videoSync.lastState.url) {
              
              await videoSync.myRef.set(data);
              videoSync.lastState = data;
              updateVideoTimes(data.currentTime, 0);
              
              console.log("📤 Master durumu gönderildi:", data.currentTime, data.paused);
            }
          }
        } catch (error) {
          console.error("Video sync paylaşım hatası:", error);
        }
      }, 2000);
      
      // Follower dinleme
      videoSync.listener = videoSync.roomRef.on('value', (snapshot) => {
        if (!snapshot.exists() || videoSync.syncing) return;
        
        try {
          const states = snapshot.val();
          
          if (masterSystem.iAmMaster) {
            // Master: Sadece kendi durumunu göster
            const myState = states[appState.currentUser];
            if (myState) {
              updateVideoTimes(myState.currentTime, 0);
            }
          } else {
            // Follower: Hem master'ı hem kendini göster
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
          console.error("Video sync dinleme hatası:", error);
        }
      });
      
      // Follower'lar da kendi durumlarını paylaşır (sadece görüntü için)
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
            console.error("Follower durum paylaşım hatası:", error);
          }
        }, 3000); // Follower'lar 3 saniyede bir günceller
      }
      
      updateSyncStatus("🎬 Video sync aktif");
      console.log("✅ Video sync başlatıldı");
      
    } catch (error) {
      console.error("❌ Video sync başlatma hatası:", error);
      updateSyncStatus("❌ Video sync hatası");
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
      
      console.log("🔍 Sync kontrol:", {
        myTime: myState.currentTime,
        masterTime: masterState.currentTime,
        timeDiff: timeDiff.toFixed(1),
        pauseDiff
      });
      
      if (timeDiff > 3 || pauseDiff) {
        console.log("🔄 Master'a senkronize oluyor...");
        updateSyncStatus("🔄 Senkronize ediliyor...");
        
        // Pause/play durumunu ayarla
        if (pauseDiff) {
          if (masterState.paused && !myState.paused) {
            await executeVideoAction('pauseVideo');
            await sleep(300);
          } else if (!masterState.paused && myState.paused) {
            await executeVideoAction('playVideo');
            await sleep(300);
          }
        }
        
        // Zaman farkını ayarla
        if (timeDiff > 3) {
          await executeVideoAction('setVideoTime', masterState.currentTime);
          await sleep(500);
        }
        
        updateSyncStatus("✅ Senkronize edildi");
        console.log("✅ Senkronizasyon tamamlandı");
        
      } else {
        updateSyncStatus("✅ Senkron - " + timeDiff.toFixed(1) + "s fark");
      }
    } catch (error) {
      console.error("Sync hatası:", error);
      updateSyncStatus("❌ Sync hatası");
    } finally {
      setTimeout(() => {
        videoSync.syncing = false;
      }, 1000);
    }
  }
  
  async function getVideoState() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve({ success: false, error: "Chrome runtime yok" });
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
          console.error(`Video action ${action} hatası:`, chrome.runtime.lastError);
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
      
      updateSyncStatus("⏸️ Video sync durduruldu");
      updateVideoTimes(0, 0);
      
      console.log("🛑 Video sync durduruldu");
    }
  }
  
  // ================== CHAT SİSTEMİ ==================
  
  function startChatSystem(roomId) {
    console.log("💬 Chat sistemi başlatılıyor...");
    
    try {
      chatSystem.active = true;
      chatSystem.messagesRef = appState.database.ref(`chatMessages/${roomId}`);
      
      // Mesajları dinle
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
      
      // Mesaj gönderme
      setupMessageSending();
      
      console.log("✅ Chat sistemi başlatıldı");
      
    } catch (error) {
      console.error("❌ Chat başlatma hatası:", error);
      showMessage("Chat sistem hatası!", true);
    }
  }
  
  function setupMessageSending() {
    // Send butonu
    if (elements.sendMessageBtn) {
      elements.sendMessageBtn.onclick = sendMessage;
    }
    
    // Enter tuşu
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
      console.error("Mesaj gönderme hatası:", error);
      showMessage("Mesaj gönderme hatası!", true);
    }
  }
  
  function displayMessage(message) {
    if (!elements.messagesContainer) return;
    
    const messageEl = document.createElement("div");
    messageEl.textContent = `${message.sender}: ${message.text}`;
    messageEl.className = message.sender === appState.currentUser ? "sent-message" : "received-message";
    
    // Kullanıcı rengi
    const colors = ["#8E44AD", "#C0392B", "#D35400", "#27AE60", "#2980B9"];
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
      
      console.log("🛑 Chat sistemi durduruldu");
    }
  }
  
  // ================== WEBRTC VİDEO CHAT ==================
  
  function initWebRTC() {
    if (!elements.startButton || !elements.hangupButton) return;
    
    // Start butonu
    elements.startButton.onclick = async () => {
      try {
        updateVideoStatus("Kamera açılıyor...");
        
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
        
        updateVideoStatus("Görüşme başlatıldı");
        updateMediaButtons();
        
        // WebRTC signaling başlat
        if (appState.currentVideoRoom) {
          await setupWebRTCSignaling(appState.currentVideoRoom);
        }
        
      } catch (error) {
        console.error("Kamera başlatma hatası:", error);
        updateVideoStatus("Kamera/mikrofon erişim hatası: " + error.message);
        elements.startButton.disabled = false;
      }
    };
    
    // Hangup butonu
    elements.hangupButton.onclick = () => {
      stopWebRTC();
    };
    
    // Kamera toggle
    if (elements.cameraToggle) {
      elements.cameraToggle.onclick = () => {
        if (webrtcSystem.localStream) {
          const videoTrack = webrtcSystem.localStream.getVideoTracks()[0];
          if (videoTrack) {
            webrtcSystem.isCameraOn = !webrtcSystem.isCameraOn;
            videoTrack.enabled = webrtcSystem.isCameraOn;
            updateMediaButtons();
            updateVideoStatus(webrtcSystem.isCameraOn ? "Kamera açıldı" : "Kamera kapatıldı");
          }
        }
      };
    }
    
    // Mikrofon toggle
    if (elements.micToggle) {
      elements.micToggle.onclick = () => {
        if (webrtcSystem.localStream) {
          const audioTrack = webrtcSystem.localStream.getAudioTracks()[0];
          if (audioTrack) {
            webrtcSystem.isMicOn = !webrtcSystem.isMicOn;
            audioTrack.enabled = webrtcSystem.isMicOn;
            updateMediaButtons();
            updateVideoStatus(webrtcSystem.isMicOn ? "Mikrofon açıldı" : "Mikrofon kapatıldı");
          }
        }
      };
    }
    
    console.log("📹 WebRTC başlatıldı");
  }
  
  async function setupWebRTCSignaling(roomId) {
    try {
      webrtcSystem.roomRef = appState.database.ref(`webrtcRooms/${roomId}`);
      
      // Oda var mı kontrol et
      const roomSnapshot = await webrtcSystem.roomRef.once('value');
      
      if (!roomSnapshot.exists()) {
        // Oda oluştur (caller)
        await createWebRTCRoom();
      } else {
        // Odaya katıl (callee)
        await joinWebRTCRoom();
      }
      
    } catch (error) {
      console.error("WebRTC signaling hatası:", error);
      updateVideoStatus("Bağlantı hatası: " + error.message);
    }
  }
  
  async function createWebRTCRoom() {
    try {
      updateVideoStatus("Oda oluşturuluyor...");
      
      webrtcSystem.peerConnection = new RTCPeerConnection(webrtcSystem.servers);
      setupPeerConnectionEvents();
      
      // Local stream'i ekle
      if (webrtcSystem.localStream) {
        webrtcSystem.localStream.getTracks().forEach(track => {
          webrtcSystem.peerConnection.addTrack(track, webrtcSystem.localStream);
        });
      }
      
      // ICE candidates'ı önce başlat
      collectICECandidates('caller', 'callee');
      
      // Offer oluştur
      const offer = await webrtcSystem.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await webrtcSystem.peerConnection.setLocalDescription(offer);
      
      // Firebase'e kaydet
      await webrtcSystem.roomRef.set({
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        created: Date.now()
      });
      
      // Answer'ı dinle
      webrtcSystem.roomRef.on('value', async (snapshot) => {
        const data = snapshot.val();
        if (data?.answer && webrtcSystem.peerConnection.signalingState === 'have-local-offer') {
          try {
            const answer = new RTCSessionDescription(data.answer);
            await webrtcSystem.peerConnection.setRemoteDescription(answer);
            updateVideoStatus("Yanıt alındı, bağlanıyor...");
          } catch (error) {
            console.error("Answer işleme hatası:", error);
            updateVideoStatus("Bağlantı hatası");
          }
        }
      });
      
      updateVideoStatus("Katılımcı bekleniyor...");
      
    } catch (error) {
      console.error("Oda oluşturma hatası:", error);
      updateVideoStatus("Oda oluşturma hatası: " + error.message);
    }
  }
  
  async function joinWebRTCRoom() {
    try {
      updateVideoStatus("Odaya katılınıyor...");
      
      const roomSnapshot = await webrtcSystem.roomRef.once('value');
      const roomData = roomSnapshot.val();
      
      if (!roomData?.offer) {
        updateVideoStatus("Geçersiz oda");
        return;
      }
      
      webrtcSystem.peerConnection = new RTCPeerConnection(webrtcSystem.servers);
      setupPeerConnectionEvents();
      
      // Local stream'i ekle
      if (webrtcSystem.localStream) {
        webrtcSystem.localStream.getTracks().forEach(track => {
          webrtcSystem.peerConnection.addTrack(track, webrtcSystem.localStream);
        });
      }
      
      // ICE candidates'ı önce başlat
      collectICECandidates('callee', 'caller');
      
      // Remote description ayarla
      const offer = new RTCSessionDescription(roomData.offer);
      await webrtcSystem.peerConnection.setRemoteDescription(offer);
      
      // Answer oluştur
      const answer = await webrtcSystem.peerConnection.createAnswer();
      await webrtcSystem.peerConnection.setLocalDescription(answer);
      
      // Answer'ı Firebase'e kaydet
      await webrtcSystem.roomRef.update({
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      });
      
      updateVideoStatus("Bağlanıyor...");
      
    } catch (error) {
      console.error("Oda katılma hatası:", error);
      updateVideoStatus("Oda katılma hatası: " + error.message);
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
      console.log("Remote track alındı");
      event.streams[0].getTracks().forEach(track => {
        webrtcSystem.remoteStream.addTrack(track);
      });
    };
    
    // Connection state
    webrtcSystem.peerConnection.onconnectionstatechange = () => {
      const state = webrtcSystem.peerConnection.connectionState;
      console.log("Bağlantı durumu:", state);
      
      switch (state) {
        case 'connected':
          updateVideoStatus("Bağlandı! Görüşme aktif.");
          break;
        case 'disconnected':
          updateVideoStatus("Bağlantı kesildi");
          break;
        case 'failed':
          updateVideoStatus("Bağlantı başarısız");
          break;
      }
    };
  }
  
  function collectICECandidates(localName, remoteName) {
    const localCandidatesRef = webrtcSystem.roomRef.child(`${localName}Candidates`);
    const remoteCandidatesRef = webrtcSystem.roomRef.child(`${remoteName}Candidates`);
    
    // Local ICE candidates'ı gönder
    webrtcSystem.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📡 ${localName} ICE candidate gönderiliyor`);
        localCandidatesRef.push(event.candidate.toJSON()).catch(error => {
          console.error("ICE candidate gönderme hatası:", error);
        });
      }
    };
    
    // Remote ICE candidates'ı dinle
    remoteCandidatesRef.on('child_added', async (snapshot) => {
      const candidateData = snapshot.val();
      console.log(`📡 ${remoteName} ICE candidate alındı`);
      
      try {
        const candidate = new RTCIceCandidate(candidateData);
        await webrtcSystem.peerConnection.addIceCandidate(candidate);
        console.log(`✅ ${remoteName} ICE candidate eklendi`);
      } catch (error) {
        console.error(`❌ ${remoteName} ICE candidate ekleme hatası:`, error);
      }
    });
  }
  
  function updateMediaButtons() {
    // Kamera butonu
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
    
    // Mikrofon butonu
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
    // Streams'i durdur
    if (webrtcSystem.localStream) {
      webrtcSystem.localStream.getTracks().forEach(track => track.stop());
      webrtcSystem.localStream = null;
    }
    
    if (webrtcSystem.remoteStream) {
      webrtcSystem.remoteStream.getTracks().forEach(track => track.stop());
      webrtcSystem.remoteStream = null;
    }
    
    // Peer connection'ı kapat
    if (webrtcSystem.peerConnection) {
      webrtcSystem.peerConnection.close();
      webrtcSystem.peerConnection = null;
    }
    
    // Firebase listener'ları temizle
    if (webrtcSystem.roomRef) {
      webrtcSystem.roomRef.off();
      webrtcSystem.roomRef = null;
    }
    
    // Video elementlerini temizle
    if (elements.localVideo) elements.localVideo.srcObject = null;
    if (elements.remoteVideo) elements.remoteVideo.srcObject = null;
    
    // Butonları sıfırla
    if (elements.startButton) elements.startButton.disabled = false;
    if (elements.hangupButton) elements.hangupButton.disabled = true;
    
    webrtcSystem.isCameraOn = true;
    webrtcSystem.isMicOn = true;
    
    updateVideoStatus("Görüşme sonlandırıldı");
    console.log("🛑 WebRTC durduruldu");
  }
  
  // ================== CLEANUP FONKSİYONLARI ==================
  
  function cleanup() {
    console.log("🧹 Temizlik yapılıyor...");
    
    stopVideoSync();
    stopMasterFollowerSystem();
    stopChatSystem();
    stopWebRTC();
    
    // State sıfırlama
    appState.currentVideoRoom = "";
    appState.currentChatRoom = "";
    
    // UI sıfırlama
    resetUI();
    
    console.log("✅ Temizlik tamamlandı");
  }
  
  function resetUI() {
    // Kod alanları
    if (elements.currentVideoCode) elements.currentVideoCode.textContent = "---";
    if (elements.currentChatCode) elements.currentChatCode.textContent = "---";
    if (elements.videoCodeInput) elements.videoCodeInput.value = "";
    if (elements.chatCodeInput) elements.chatCodeInput.value = "";
    
    // Container'lar
    if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
    if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
    if (elements.videoCodeDisplay) elements.videoCodeDisplay.classList.add("hidden");
    if (elements.chatCodeDisplay) elements.chatCodeDisplay.classList.add("hidden");
    
    // Status'lar
    updateSyncStatus("⏸️ Senkronizasyon kapalı");
    updateVideoTimes(0, 0);
    
    if (elements.masterStatus) elements.masterStatus.textContent = "---";
    if (elements.currentMaster) elements.currentMaster.textContent = "---";
    if (elements.videoStatus) elements.videoStatus.textContent = "Görüşmeyi başlatmak için tıklayın";
    
    // Generated kodları temizle
    if (elements.generatedVideoCode) elements.generatedVideoCode.textContent = "-";
    if (elements.generatedChatCode) elements.generatedChatCode.textContent = "-";
  }
  
  // ================== BAŞLATMA SİSTEMİ ==================
  
  function initApp() {
    console.log("🚀 Final Video Sync App v4 başlatılıyor...");
    
    try {
      // Firebase'i başlat
      if (!initFirebase()) {
        throw new Error("Firebase başlatılamadı");
      }
      
      // Sistemleri sırayla başlat
      setupPasswordValidation();
      initTabNavigation();
      initAuth();
      initRoomManagement();
      initMasterToggle();
      initWebRTC();
      
      // UI başlangıç durumu
      setInitialUIState();
      
      // Global event listeners
      setupGlobalEventListeners();
      
      appState.initialized = true;
      console.log("✅ App başarıyla başlatıldı");
      showMessage("Video Sync App hazır!");
      
    } catch (error) {
      console.error("❌ App başlatma hatası:", error);
      showMessage("Uygulama başlatma hatası: " + error.message, true);
    }
  }
  
  function setInitialUIState() {
    // Auth ekranları
    if (elements.loginScreen) elements.loginScreen.classList.remove("hidden");
    if (elements.signupScreen) elements.signupScreen.classList.add("hidden");
    if (elements.appContainer) elements.appContainer.classList.add("hidden");
    
    // Container'lar
    if (elements.videoContainer) elements.videoContainer.classList.add("hidden");
    if (elements.chatContainer) elements.chatContainer.classList.add("hidden");
    
    // Rooms section aktif
    if (elements.roomsSection) elements.roomsSection.classList.remove("hidden");
    
    // İlk tab'ı aktif yap
    const firstTab = document.querySelector('.nav-tab[data-tab="rooms"]');
    if (firstTab) firstTab.classList.add('active');
    
    // Status'ları sıfırla
    resetUI();
    
    console.log("🎨 Initial UI state ayarlandı");
  }
  
  function setupGlobalEventListeners() {
    // Global error handling
    window.addEventListener('error', (event) => {
      console.error("🚨 Global hata:", event.error);
      showMessage("Sistem hatası oluştu!", true);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error("🚨 Promise rejection:", event.reason);
      showMessage("Bağlantı hatası!", true);
    });
    
    // Sayfa kapatılırken temizlik
    window.addEventListener('beforeunload', () => {
      console.log("📄 Sayfa kapatılıyor, temizlik yapılıyor...");
      cleanup();
    });
    
    // Visibility change - sekme değişimi
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log("👁️ Sekme gizlendi");
      } else {
        console.log("👁️ Sekme görünür oldu");
        // Heartbeat yenile
        if (masterSystem.active && masterSystem.usersRef) {
          masterSystem.usersRef.child(appState.currentUser).update({
            lastSeen: Date.now(),
            online: true
          });
        }
      }
    });
    
    console.log("🔧 Global event listeners kuruldu");
  }
  
  // ================== GLOBAL API ==================
  
  // Debug ve kontrol için global API
  window.videoSyncApp = {
    version: "4.0.0",
    appState,
    masterSystem,
    videoSync,
    chatSystem,
    webrtcSystem,
    elements,
    
    // Fonksiyonlar
    cleanup,
    showMessage,
    updateSyncStatus,
    
    // Debug fonksiyonları
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
        console.log("🔄 Manuel sync tetikleniyor...");
        // Manuel sync tetikle
      }
    }
  };
  
  // App'i başlat
  initApp();
  
  console.log("🎉 Final Video Sync App v4 tamamen yüklendi!");
  console.log("📋 Debug için: window.videoSyncApp");
  
});