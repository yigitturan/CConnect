document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("login-screen");
  const signupScreen = document.getElementById("signup-screen");
  const appContainer = document.getElementById("app-container");
  const userInfoDiv = document.getElementById("user-info");
  const chatContainer = document.getElementById("chat-container");
  const videoContainer = document.getElementById("video-chat-container");
  const messagesContainer = document.getElementById("messages-container");
  
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const signupEmailInput = document.getElementById("signup-email");
  const signupPasswordInput = document.getElementById("signup-password");
  const nicknameInput = document.getElementById("nickname");
  
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  
  // Password validation rules
  const passwordValidation = {
    minLength: 12,
    hasUpperCase: /[A-Z]/.test.bind(/[A-Z]/),
    hasLowerCase: /[a-z]/.test.bind(/[a-z]/)
  };
  
  // Function to check if password meets requirements
  function validatePassword(password) {
    const errors = [];
    
    if (password.length < passwordValidation.minLength) {
      errors.push(`Şifre en az ${passwordValidation.minLength} karakter olmalıdır.`);
    }
    
    if (!passwordValidation.hasUpperCase(password)) {
      errors.push("Şifre en az bir büyük harf içermelidir.");
    }
    
    if (!passwordValidation.hasLowerCase(password)) {
      errors.push("Şifre en az bir küçük harf içermelidir.");
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
  
  // Kod Oluşturma Elemanları
  const createVideoChatCodeBtn = document.getElementById("createVideoChatCodeBtn");
  const createChatCodeBtn = document.getElementById("createChatCodeBtn");
  const videoCodeDisplay = document.getElementById("videoCodeDisplay");
  const chatCodeDisplay = document.getElementById("chatCodeDisplay");
  const generatedVideoCode = document.getElementById("generatedVideoCode");
  const generatedChatCode = document.getElementById("generatedChatCode");
  const copyVideoCodeBtn = document.getElementById("copyVideoCodeBtn");
  const copyChatCodeBtn = document.getElementById("copyChatCodeBtn");
  
  // Kod Giriş Elemanları
  const videoCodeInput = document.getElementById("videoCodeInput");
  const chatCodeInput = document.getElementById("chatCodeInput");
  const joinVideoRoomBtn = document.getElementById("joinVideoRoomBtn");
  const joinChatRoomBtn = document.getElementById("joinChatRoomBtn");
  const currentVideoCode = document.getElementById("currentVideoCode");
  const currentChatCode = document.getElementById("currentChatCode");
  
  // Kapat Butonları
  const closeVideoChat = document.getElementById("closeVideoChat");
  const closeChatRoom = document.getElementById("closeChatRoom");
  
  let currentUserNickname = "";
  let currentVideoRoomId = "";
  let currentChatRoomId = "";
  let currentMessagesRef = null;
  let messagesListener = null;
  let videoSyncCleanup = null;
  const statusP = document.getElementById("status");
  
  // Firebase config
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
  
  // Initialize Firebase
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const database = firebase.database();
  
  document.getElementById("showSignup").addEventListener("click", (event) => {
    event.preventDefault();
    loginScreen.classList.add("hidden");
    signupScreen.classList.remove("hidden");
  });
  
  document.getElementById("showLogin").addEventListener("click", (event) => {
    event.preventDefault();
    signupScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  });
  
  // Add input validation feedback for signup password
  signupPasswordInput.addEventListener("input", () => {
    const password = signupPasswordInput.value.trim();
    const validation = validatePassword(password);
    
    if (!validation.isValid) {
      signupPasswordInput.setCustomValidity(validation.errors.join("\n"));
      
      // Show validation messages below the input field
      let errorElement = document.getElementById("password-requirements");
      if (!errorElement) {
        errorElement = document.createElement("div");
        errorElement.id = "password-requirements";
        errorElement.classList.add("validation-message");
        signupPasswordInput.parentNode.insertBefore(errorElement, signupPasswordInput.nextSibling);
      }
      
      errorElement.innerHTML = validation.errors.map(err => `<p>${err}</p>`).join("");
      errorElement.style.color = "orange";
      errorElement.style.fontSize = "12px";
      errorElement.style.marginTop = "4px";
    } else {
      signupPasswordInput.setCustomValidity("");
      const errorElement = document.getElementById("password-requirements");
      if (errorElement) {
        errorElement.innerHTML = "<p>✓ Şifre gereksinimleri karşılandı.</p>";
        errorElement.style.color = "green";
      }
    }
  });
  
  // Kullanıcı renklerini belirleme
  const colorMap = new Map();
  function getRandomColor() {
    const colors = ["#8E44AD", "#C0392B", "#D35400", "#27AE60", "#2980B9"]; 
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  function getUserColor(username) {
    if (!colorMap.has(username)) {
      colorMap.set(username, getRandomColor());
    }
    return colorMap.get(username);
  }
  // Rastgele kod oluşturma (6 karakter alfanümerik)
  function generateRandomCode() {
    const codeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += codeChars.charAt(Math.floor(Math.random() * codeChars.length));
    }
    return code;
  }
  
  // Hata veya durum mesajları gösterme
  function showStatus(message, isError = false) {
    statusP.textContent = message;
    statusP.style.color = isError ? "red" : "green";
    setTimeout(() => {
      statusP.textContent = "";
    }, 5000);
  }
  
  // Google ile giriş işlemi
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "googleLogin" }, (response) => {
        if (response?.success) {
          currentUserNickname = response.nickname;
          loginScreen.classList.add("hidden");
          signupScreen.classList.add("hidden");
          appContainer.classList.remove("hidden");
          document.getElementById("welcomeMsg").textContent = `Merhaba, ${currentUserNickname}`;
        } else {
          showStatus("Google ile giriş hatası: " + (response?.error || "Bilinmeyen hata"), true);
        }
      });
    });
  }
  
  // Kayıt olma işlemi
  signupBtn.addEventListener("click", () => {
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value.trim();
    const nickname = nicknameInput.value.trim();
    
    if (!email || !password || !nickname) {
      showStatus("Tüm alanları doldurun!", true);
      return;
    }
    
    // Şifre doğrulaması yap
    const validation = validatePassword(password);
    if (!validation.isValid) {
      showStatus("Şifre gereksinimleri karşılanmıyor: " + validation.errors.join(" "), true);
      return;
    }
    
    chrome.runtime.sendMessage({ action: "signup", email, password, nickname }, (response) => {
      if (response?.success) {
        loginScreen.classList.remove("hidden");
        signupScreen.classList.add("hidden");
        showStatus("Kayıt başarılı, şimdi giriş yapabilirsiniz.");
      } else {
        let errorMessage = "Kayıt hatası";
        
        // Firebase hata mesajlarını daha anlaşılır yap
        if (response?.error) {
          switch (response.error) {
            case "EMAIL_EXISTS":
              errorMessage = "Bu e-posta adresi zaten kullanımda.";
              break;
            case "OPERATION_NOT_ALLOWED":
              errorMessage = "E-posta ve şifre ile giriş aktif değil.";
              break;
            case "TOO_MANY_ATTEMPTS_TRY_LATER":
              errorMessage = "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
              break;
            default:
              errorMessage = `Kayıt hatası: ${response.error}`;
          }
        }
        
        showStatus(errorMessage, true);
      }
    });
  });
  
  // Giriş yapma işlemi
  loginBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      showStatus("Lütfen tüm alanları doldurun!", true);
      return;
    }
    
    chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
      if (response?.success) {
        currentUserNickname = response.nickname;
        loginScreen.classList.add("hidden");
        signupScreen.classList.add("hidden");
        appContainer.classList.remove("hidden");
        document.getElementById("welcomeMsg").textContent = `Merhaba, ${currentUserNickname}`;
      } else {
        let errorMessage = "Giriş hatası";
        
        // Firebase hata mesajlarını daha anlaşılır yap
        if (response?.error) {
          switch (response.error) {
            case "INVALID_LOGIN_CREDENTIALS":
              errorMessage = "Hatalı e-posta veya şifre. Lütfen tekrar deneyin.";
              break;
            case "USER_DISABLED":
              errorMessage = "Bu kullanıcı hesabı devre dışı bırakılmış.";
              break;
            case "USER_NOT_FOUND":
              errorMessage = "Bu e-posta adresine kayıtlı kullanıcı bulunamadı.";
              break;
            case "INVALID_PASSWORD":
              errorMessage = "Hatalı şifre. Lütfen tekrar deneyin.";
              break;
            case "TOO_MANY_ATTEMPTS_TRY_LATER":
              errorMessage = "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
              break;
            default:
              errorMessage = `Giriş hatası: ${response.error}`;
          }
        }
        
        showStatus(errorMessage, true);
      }
    });
  });
  
  // Çıkış yapma işlemi
  logoutBtn.addEventListener("click", () => {
    // Aktif odalardan çık
    closeVideoChatRoom();
    closeChatRoomFunc();
    
    chrome.runtime.sendMessage({ action: "logout" }, (response) => {
      if (response?.success) {
        loginScreen.classList.remove("hidden");
        appContainer.classList.add("hidden");
        resetAllRooms();
      }
    });
  });
  
  // Tüm odaları ve durumları sıfırla
  function resetAllRooms() {
    // Video odası sıfırlama
    videoContainer.classList.add("hidden");
    currentVideoRoomId = "";
    currentVideoCode.textContent = "---";
    videoCodeInput.value = "";
    videoCodeDisplay.classList.add("hidden");
    generatedVideoCode.textContent = "-";
    
    // Chat odası sıfırlama
    chatContainer.classList.add("hidden");
    currentChatRoomId = "";
    currentChatCode.textContent = "---";
    chatCodeInput.value = "";
    chatCodeDisplay.classList.add("hidden");
    generatedChatCode.textContent = "-";
    
    // Mesajları temizle
    messagesContainer.innerHTML = "";
    messageInput.value = "";
    
    // Dinleyicileri kaldır
    if (messagesListener && currentMessagesRef) {
      currentMessagesRef.off("value", messagesListener);
      messagesListener = null;
      currentMessagesRef = null;
    }
  }
  
  // Video Kodu Oluşturma
  createVideoChatCodeBtn.addEventListener("click", async () => {
    const code = generateRandomCode();
    
    try {
      // Firebase'de oda oluştur
      const roomRef = database.ref('videoRooms/' + code);
      
      // Odanın var olup olmadığını kontrol et
      const snapshot = await roomRef.once('value');
      if (snapshot.exists()) {
        alert("Bu kod zaten kullanılıyor. Lütfen tekrar deneyin.");
        return;
      }
      
      // Yeni odayı kaydet
      await roomRef.set({
        createdBy: currentUserNickname,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Arayüzü güncelle
      generatedVideoCode.textContent = code;
      videoCodeDisplay.classList.remove("hidden");
      
      console.log(`Video odası kodu oluşturuldu: ${code}`);
    } catch (error) {
      console.error("Video kodu oluşturma hatası:", error);
      alert("Video kodu oluşturulurken bir hata oluştu: " + error.message);
    }
  });
  
  // Chat Kodu Oluşturma
  createChatCodeBtn.addEventListener("click", async () => {
    const code = generateRandomCode();
    
    try {
      // Firebase'de oda oluştur
      const roomRef = database.ref('chatRooms/' + code);
      
      // Odanın var olup olmadığını kontrol et
      const snapshot = await roomRef.once('value');
      if (snapshot.exists()) {
        alert("Bu kod zaten kullanılıyor. Lütfen tekrar deneyin.");
        return;
      }
      
      // Yeni odayı kaydet
      await roomRef.set({
        createdBy: currentUserNickname,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Arayüzü güncelle
      generatedChatCode.textContent = code;
      chatCodeDisplay.classList.remove("hidden");
      
      console.log(`Chat odası kodu oluşturuldu: ${code}`);
    } catch (error) {
      console.error("Chat kodu oluşturma hatası:", error);
      alert("Chat kodu oluşturulurken bir hata oluştu: " + error.message);
    }
  });
  // Video kodu kopyalama
  copyVideoCodeBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(generatedVideoCode.textContent).then(() => {
      alert("Video kodu kopyalandı!");
    }).catch(err => {
      console.error("Kopyalama hatası:", err);
      // Alternatif kopyalama yöntemi
      const tempInput = document.createElement("input");
      tempInput.value = generatedVideoCode.textContent;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      alert("Video kodu kopyalandı!");
    });
  });
  
  // Chat kodu kopyalama
  copyChatCodeBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(generatedChatCode.textContent).then(() => {
      alert("Chat kodu kopyalandı!");
    }).catch(err => {
      console.error("Kopyalama hatası:", err);
      // Alternatif kopyalama yöntemi
      const tempInput = document.createElement("input");
      tempInput.value = generatedChatCode.textContent;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      alert("Chat kodu kopyalandı!");
    });
  });
  
  // Video odasına katılma
  joinVideoRoomBtn.addEventListener("click", async () => {
    const code = videoCodeInput.value.trim();
    if (!code) {
      alert("Lütfen bir video kodu girin.");
      return;
    }
    
    try {
      // Oda var mı kontrol et
      const roomRef = database.ref('videoRooms/' + code);
      const snapshot = await roomRef.once('value');
      
      if (!snapshot.exists()) {
        alert("Geçersiz video kodu. Lütfen doğru kodu girdiğinizden emin olun.");
        return;
      }
      
      // Odaya katıl
      currentVideoRoomId = code;
      currentVideoCode.textContent = code;
      videoContainer.classList.remove("hidden");
      
      // Video chat başlat
      initializeVideoChat(code);
      
      console.log(`Video odasına katılındı: ${code}`);
    } catch (error) {
      console.error("Video odasına katılma hatası:", error);
      alert("Video odasına katılırken bir hata oluştu: " + error.message);
    }
  });
  
  // Chat odasına katılma
  joinChatRoomBtn.addEventListener("click", async () => {
    const code = chatCodeInput.value.trim();
    if (!code) {
      alert("Lütfen bir chat kodu girin.");
      return;
    }
    
    try {
      // Oda var mı kontrol et
      const roomRef = database.ref('chatRooms/' + code);
      const snapshot = await roomRef.once('value');
      
      if (!snapshot.exists()) {
        alert("Geçersiz chat kodu. Lütfen doğru kodu girdiğinizden emin olun.");
        return;
      }
      
      // Aktif başka bir chat odası varsa önce onu kapat
      if (currentChatRoomId) {
        closeChatRoomFunc();
      }
      
      // Odaya katıl
      currentChatRoomId = code;
      currentChatCode.textContent = code;
      chatContainer.classList.remove("hidden");
      
      // Mesajları yükle
      loadChatRoomMessages(code);
      
      console.log(`Chat odasına katılındı: ${code}`);
    } catch (error) {
      console.error("Chat odasına katılma hatası:", error);
      alert("Chat odasına katılırken bir hata oluştu: " + error.message);
    }
  });
  
  // Video chat kapatma
  closeVideoChat.addEventListener("click", () => {
    closeVideoChatRoom();
  });
  
  // Chat odası kapatma
  closeChatRoom.addEventListener("click", () => {
    closeChatRoomFunc();
  });
  
  // Video chat odasını kapat
  function closeVideoChatRoom() {
    if (currentVideoRoomId) {
      // WebRTC bağlantısını kapat
      if (window.currentPeerConnection) {
        window.currentPeerConnection.close();
        window.currentPeerConnection = null;
      }
      
      // Yerel ve uzak medya akışını kapat
      const localVideo = document.getElementById('localVideo');
      const remoteVideo = document.getElementById('remoteVideo');
      
      if (localVideo && localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
      }
      
      if (remoteVideo && remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
      }
      
      // Firebase dinleyicilerini kaldır
      const roomRef = database.ref('rooms/' + currentVideoRoomId);
      roomRef.off();
      
      // UI güncelle
      videoContainer.classList.add('hidden');
      const startButton = document.getElementById('startButton');
      const hangupButton = document.getElementById('hangupButton');
      const videoStatus = document.getElementById('videoStatus');
      
      if (startButton) startButton.disabled = false;
      if (hangupButton) hangupButton.disabled = true;
      if (videoStatus) videoStatus.textContent = "Görüşmeyi başlatmak için tıklayın";
      
      currentVideoRoomId = "";
      currentVideoCode.textContent = "---";
      
      console.log("Video chat odası kapatıldı.");
    }

    // Video senkronizasyon temizliği
    if (typeof videoSyncCleanup === 'function') {
      videoSyncCleanup();
      videoSyncCleanup = null;
    }
    
    // Senkronizasyon durumu sıfırla
    const syncStatus = document.getElementById('syncStatus');
    const currentVideoTime = document.getElementById('currentVideoTime');
    const remoteVideoTime = document.getElementById('remoteVideoTime');
    
    if (syncStatus) syncStatus.textContent = "Bekleniyor";
    if (currentVideoTime) currentVideoTime.textContent = "00:00";
    if (remoteVideoTime) remoteVideoTime.textContent = "00:00";
  }
  
  // Chat odasını kapat
  function closeChatRoomFunc() {
    if (currentChatRoomId) {
      // Mesaj dinleyicisini kaldır
      if (messagesListener && currentMessagesRef) {
        currentMessagesRef.off("value", messagesListener);
        messagesListener = null;
      }
      
      // Arayüzü güncelle
      chatContainer.classList.add("hidden");
      messagesContainer.innerHTML = "";
      messageInput.value = "";
      currentChatRoomId = "";
      currentChatCode.textContent = "---";
      currentMessagesRef = null;
      
      console.log("Chat odası kapatıldı.");
    }
  }
  
  // Chat odası mesajlarını yükle
  function loadChatRoomMessages(roomCode) {
    // Önce mevcut dinleyiciyi temizle
    if (messagesListener && currentMessagesRef) {
      currentMessagesRef.off("value", messagesListener);
    }
    
    // Yeni mesaj referansını ayarla
    currentMessagesRef = database.ref('chatMessages/' + roomCode);
    
    // Mesajları dinlemeye başla
    messagesListener = currentMessagesRef.on("value", (snapshot) => {
      messagesContainer.innerHTML = "";
      
      if (snapshot.exists()) {
        const messages = snapshot.val();
        
        Object.values(messages).forEach((message) => {
          const messageElement = document.createElement("div");
          messageElement.textContent = `${message.sender}: ${message.text}`;
          messageElement.classList.add(message.sender === currentUserNickname ? "sent-message" : "received-message");
          messageElement.style.backgroundColor = getUserColor(message.sender);
          
          messagesContainer.appendChild(messageElement);
        });
        
        scrollToBottom();
      }
    });
  }
  
  // Mesaj gönderme
  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  });
  
  async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentChatRoomId) return;
    
    const newMessage = {
      sender: currentUserNickname,
      text: message,
      timestamp: Date.now()
    };
    
    try {
      // Chat odası mesajı gönder
      await database.ref('chatMessages/' + currentChatRoomId).push(newMessage);
      messageInput.value = "";
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
      alert("Mesaj gönderilirken bir hata oluştu: " + error.message);
    }
  }
  
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  // Video chat işlevlerini başlat
  function initializeVideoChat(roomId) {
    // Global değişkenler
    let localStream;
    let remoteStream;
    let peerConnection;
    let roomRef;
    let isCameraOn = true;
    let isMicOn = true;
    
    // HTML elementleri
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    const startButton = document.getElementById('startButton');
    const hangupButton = document.getElementById('hangupButton');
    const cameraToggle = document.getElementById('cameraToggle');
    const micToggle = document.getElementById('micToggle');
    const cameraOnIcon = cameraToggle.querySelector('.camera-on');
    const cameraOffIcon = cameraToggle.querySelector('.camera-off');
    const micOnIcon = micToggle.querySelector('.mic-on');
    const micOffIcon = micToggle.querySelector('.mic-off');
    const videoStatus = document.getElementById('videoStatus');
    
    // STUN/TURN sunucuları
    const servers = {
      iceServers: [
        {
          urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun.l.google.com:19302'
          ],
        },
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        },
        {
          urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
          credential: 'webrtc',
          username: 'webrtc'
        }
      ],
      iceCandidatePoolSize: 10,
    };
    
    // Event listenerları ekleme
    startButton.addEventListener('click', startCall);
    hangupButton.addEventListener('click', hangUp);
    cameraToggle.addEventListener('click', toggleCamera);
    micToggle.addEventListener('click', toggleMic);
    
    // Oda referansını oluştur
    roomRef = database.ref('rooms/' + roomId);
    
    // Kamera ve mikrofon durumunu güncelle
    function updateMediaUI() {
      if (isCameraOn) {
        cameraOnIcon.classList.remove('hidden');
        cameraOffIcon.classList.add('hidden');
        cameraToggle.classList.remove('inactive');
        cameraToggle.classList.add('active');
      } else {
        cameraOnIcon.classList.add('hidden');
        cameraOffIcon.classList.remove('hidden');
        cameraToggle.classList.remove('active');
        cameraToggle.classList.add('inactive');
      }
      
      if (isMicOn) {
        micOnIcon.classList.remove('hidden');
        micOffIcon.classList.add('hidden');
        micToggle.classList.remove('inactive');
        micToggle.classList.add('active');
      } else {
        micOnIcon.classList.add('hidden');
        micOffIcon.classList.remove('hidden');
        micToggle.classList.remove('active');
        micToggle.classList.add('inactive');
      }
      
      // Butonları kamera/mikrofon yoksa devre dışı bırak
      if (!localStream) {
        cameraToggle.classList.add('disabled');
        micToggle.classList.add('disabled');
      } else {
        cameraToggle.classList.remove('disabled');
        micToggle.classList.remove('disabled');
      }
    }
    
    // Kamera durumunu değiştir
    function toggleCamera() {
      if (!localStream) return;
      
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length === 0) return;
      
      isCameraOn = !isCameraOn;
      videoTracks[0].enabled = isCameraOn;
      updateMediaUI();
      
      // Kamera durumunu güncelle
      if (isCameraOn) {
        updateStatus('Kamera açıldı');
      } else {
        updateStatus('Kamera kapatıldı');
      }
    }
    
    // Mikrofon durumunu değiştir
    function toggleMic() {
      if (!localStream) return;
      
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) return;
      
      isMicOn = !isMicOn;
      audioTracks[0].enabled = isMicOn;
      updateMediaUI();
      
      // Mikrofon durumunu güncelle
      if (isMicOn) {
        updateStatus('Mikrofon açıldı');
      } else {
        updateStatus('Mikrofon kapatıldı');
      }
    }
    
    // Görüşmeyi başlatma fonksiyonu
    async function startCall() {
      try {
        updateStatus('Görüşme başlatılıyor...');
        
        // Butonları devre dışı bırak
        startButton.disabled = true;
        
        try {
          // Kamera ve mikrofon izinlerini iste
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          
          updateStatus('Kamera başlatıldı. Görüşme bağlanıyor...');
          
          // Yerel videoyu göster
          localVideo.srcObject = localStream;
          localVideo.style.transform = "scaleX(-1)";
          
          hangupButton.disabled = false;
          
          isCameraOn = true;
          isMicOn = true;
          updateMediaUI();
          
          if (roomId) {
            // Odanın durumunu kontrol et
            const roomSnapshot = await roomRef.once('value');
            
            if (!roomSnapshot.exists() || !roomSnapshot.val()?.offer) {
              // Oda yoksa veya oda var ama offer yoksa, oda oluştur
              await createRoom();
            } else {
              // Oda varsa ve offer varsa, odaya katıl
              await joinRoom();
            }
          } else {
            updateStatus('Oda ID bulunamadı, görüşme başlatılamıyor.');
            startButton.disabled = false;
          }
          
        } catch (mediaError) {
          console.error('Medya erişim hatası:', mediaError);
          
          if (mediaError.name === 'NotAllowedError' || mediaError.name === 'SecurityError') {
            updateStatus('Kamera veya mikrofon izni reddedildi. İzin ayarlarını kontrol edin.');
            
            chrome.tabs.create({ 
              url: "chrome://settings/content/siteDetails?site=chrome-extension%3A%2F%2Ffcpiknpeamjplkmljimfmbbhmickddpl" 
            });
          } else if (mediaError.name === 'NotFoundError') {
            updateStatus('Kamera veya mikrofon bulunamadı.');
          } else {
            updateStatus('Kamera ve mikrofon erişimi sağlanamadı: ' + mediaError.message);
          }
          
          startButton.disabled = false;
        }
      } catch (error) {
        console.error('Error starting call:', error);
        updateStatus('Görüşme başlatma hatası: ' + error.message);
        startButton.disabled = false;
      }
    }
    
    // Peer bağlantısı oluşturma
    function createPeerConnection() {
      console.log("Peer bağlantısı oluşturuluyor");
      
      // Yeni bir peer bağlantısı oluştur
      const pc = new RTCPeerConnection(servers);
      
      // Uzak medya akışını ayarla
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
      
      // Track olayı yöneticisi
      pc.ontrack = (event) => {
        console.log("Uzak track alındı:", event.streams);
        
        // Tüm akışlardan tüm izleri ekle
        event.streams.forEach(stream => {
          stream.getTracks().forEach(track => {
            console.log("Uzak track uzak akışa ekleniyor:", track);
            remoteStream.addTrack(track);
          });
        });
      };
      
      // Bağlantı durumu değişikliği yöneticisi
      pc.onconnectionstatechange = () => {
        console.log("Bağlantı durumu:", pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          updateStatus('Bağlandı! Görüşmenin keyfini çıkarın.');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          updateStatus('Bağlantı kesildi veya başarısız oldu.');
        }
      };
      
      // ICE bağlantı durumu değişikliği yöneticisi
      pc.oniceconnectionstatechange = () => {
        console.log("ICE bağlantı durumu:", pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          updateStatus('Bağlantı başarılı. Görüşme aktif.');
        } else if (pc.iceConnectionState === 'failed') {
          updateStatus('Bağlantı başarısız oldu. Tekrar deneyebilirsiniz.');
        }
      };
      
      // Signaling durumu değişikliklerini izle
      pc.onsignalingstatechange = () => {
        console.log("Signaling durumu:", pc.signalingState);
      };
      
      // ICE toplama durumu değişikliklerini izle
      pc.onicegatheringstatechange = () => {
        console.log("ICE toplama durumu:", pc.iceGatheringState);
      };
      
      // Yerel izleri peer bağlantısına ekle
      if (localStream) {
        localStream.getTracks().forEach(track => {
          console.log("Yerel track peer bağlantısına ekleniyor:", track);
          pc.addTrack(track, localStream);
        });
      } else {
        console.warn("Peer bağlantısı oluştururken yerel akış mevcut değil");
      }
      
      return pc;
    }
    
    // Oda oluşturma işlevi
    async function createRoom() {
      try {
        updateStatus("Oda oluşturuluyor...");
        
        // Peer bağlantısı oluştur
        peerConnection = createPeerConnection();
        window.currentPeerConnection = peerConnection;
        
        // ICE adaylarını topla ve Firebase'de sakla
        collectIceCandidates(roomRef, 'caller', 'callee');
        
        // Teklif oluştur
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        // Yerel açıklamayı ayarla
        await peerConnection.setLocalDescription(offer);
        
        // Teklifi Firebase'e kaydet
        const roomWithOffer = {
          offer: {
            type: offer.type,
            sdp: offer.sdp
          },
          created: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Oda silmeyi ayarla
        roomRef.onDisconnect().remove();
        
        // Odayı Firebase'e kaydet
        await roomRef.set(roomWithOffer);
        
        updateStatus("Oda oluşturuldu! Katılımcı bekleniyor...");
      } catch (error) {
        console.error("Error creating room:", error);
        updateStatus("Oda oluşturma hatası: " + error.message);
      }
    }
    
    // Odaya katılma işlevi
    async function joinRoom() {
      try {
        updateStatus("Odaya katılınıyor: " + roomId);
        
        // Odayı Firebase'den al
        const roomSnapshot = await roomRef.once('value');
        const roomData = roomSnapshot.val();
        
        if (!roomData || !roomData.offer) {
          updateStatus("Oda bulundu fakat teklif bulunamadı. Lütfen farklı bir oda deneyin.");
          return;
        }
        
        // Peer bağlantısı oluştur
        peerConnection = createPeerConnection();
        window.currentPeerConnection = peerConnection;
        
        // ICE adaylarını topla ve Firebase'de sakla
        collectIceCandidates(roomRef, 'callee', 'caller');
        
        // Oda teklifini al ve uzak açıklamayı ayarla
        const offer = roomData.offer;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Yanıt oluştur
        const answer = await peerConnection.createAnswer();
        
        // Yerel açıklamayı ayarla
        await peerConnection.setLocalDescription(answer);
        
        // Firebase'e yanıt kaydet
        const roomWithAnswer = {
          answer: {
            type: answer.type,
            sdp: answer.sdp
          }
        };
        
        await roomRef.update(roomWithAnswer);
        
        updateStatus("Odaya katılındı! Bağlantı kuruluyor...");
      } catch (error) {
        console.error("Error joining room:", error);
        updateStatus("Odaya katılma hatası: " + error.message);
      }
    }
    
    // ICE adaylarını topla ve Firebase'de sakla
    function collectIceCandidates(roomRef, localName, remoteName) {
      // Yerel ICE adaylarını saklayacak koleksiyonu tanımla
      const candidatesCollection = roomRef.child(localName + 'Candidates');
      
      // ICE adaylarını dinle
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Yeni ICE adayı:", event.candidate.candidate);
          const json = event.candidate.toJSON();
          candidatesCollection.push(json);
        }
      };
      
      // Karşı tarafın ICE adaylarını dinle ve ekle
      roomRef.child(remoteName + 'Candidates').on('child_added', async snapshot => {
        try {
          const candidate = new RTCIceCandidate(snapshot.val());
          await peerConnection.addIceCandidate(candidate);
          console.log("Uzak ICE adayı eklendi");
        } catch (error) {
          console.error("ICE adayı ekleme hatası:", error);
        }
      });
      
      // Oda değişikliklerini dinle (yanıt beklerken)
      roomRef.on('value', async snapshot => {
        const data = snapshot.val();
        if (!data) return;
        
        // Arayan kişiysen ve bir yanıt varsa, uzak açıklamayı ayarla
        if (localName === 'caller' && data.answer && peerConnection.signalingState !== 'stable') {
          try {
            const answer = new RTCSessionDescription(data.answer);
            await peerConnection.setRemoteDescription(answer);
            console.log("Uzak açıklama başarıyla ayarlandı");
            updateStatus("Yanıt alındı. Bağlantı kuruluyor...");
          } catch (error) {
            console.error("Uzak açıklamayı ayarlarken hata:", error);
          }
        }
      });
    }
    
    // Video senkronizasyon özelliklerini başlat
    function initVideoSyncFeatures(roomId) {
      // Video senkronizasyon özelliği kodlarını buraya ekleyin
      // Bu fonksiyon, video senkronizasyonu için gerekli olan temizleme fonksiyonunu döndürmeli
      return function() {
        // Temizleme kodları
      };
    }
    
    // Görüşmeyi sonlandır
    function hangUp() {
      if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        window.currentPeerConnection = null;
      }
      
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localVideo.srcObject = null;
      }
      
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteVideo.srcObject = null;
      }
      
      if (roomRef) {
        // Dinleyicileri kaldır
        roomRef.off();
      }
      
      startButton.disabled = false;
      hangupButton.disabled = true;
      
      // Kamera ve mikrofon butonlarını devre dışı bırak
      cameraToggle.classList.add('disabled');
      micToggle.classList.add('disabled');
      
      updateStatus("Görüşme sonlandırıldı.");
    }
    
    // Durumu güncelle
    function updateStatus(message) {
      videoStatus.textContent = message;
      console.log("Durum:", message);
    }
    
    // Başlangıç durumunda UI güncelle
    updateMediaUI();
    
    // Video senkronizasyon özelliklerini başlat
    videoSyncCleanup = initVideoSyncFeatures(roomId);
    
    return {
      close: hangUp
    };
  }
});