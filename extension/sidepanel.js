document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("login-screen");
    const signupScreen = document.getElementById("signup-screen");
    const userInfoDiv = document.getElementById("user-info");
    const chatScreen = document.getElementById("chat-screen");
    const messagesContainer = document.getElementById("messages-container");
    
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const signupEmailInput = document.getElementById("signup-email");
    const signupPasswordInput = document.getElementById("signup-password");
    const nicknameInput = document.getElementById("nickname");
    
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    
    const messageInput = document.getElementById("messageInput");
    const sendMessageBtn = document.getElementById("sendMessageBtn");
    
    // Video Chat elements
    const openVideoChatBtn = document.getElementById("openVideoChatBtn");
    const roomControlsSection = document.getElementById("roomControlsSection");
    const roomIdInput = document.getElementById("roomIdInput");
    const joinRoomBtn = document.getElementById("joinRoomBtn");
    const copyRoomIdBtn = document.getElementById("copyRoomIdBtn");
    
    let currentUserNickname = "";
    let currentRoomId = "";
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
    
    // Kullanıcı renklerini belirleme
    const colorMap = new Map();
    function getRandomColor() {
      const colors = ["#8E44AD", "#C0392B", "#D35400"]; 
      return colors[Math.floor(Math.random() * colors.length)];
    }
    
    function getUserColor(username) {
      if (!colorMap.has(username)) {
        colorMap.set(username, getRandomColor());
      }
      return colorMap.get(username);
    }
    
    // Hata veya durum mesajları gösterme
    function showStatus(message, isError = false) {
      statusP.textContent = message;
      statusP.style.color = isError ? "red" : "green";
      setTimeout(() => {
        statusP.textContent = "";
      }, 5000);
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
      
      chrome.runtime.sendMessage({ action: "signup", email, password, nickname }, (response) => {
        if (response?.success) {
          loginScreen.classList.remove("hidden");
          signupScreen.classList.add("hidden");
        } else {
          showStatus("Kayıt hatası: " + (response.error || "Bilinmeyen hata"), true);
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
          userInfoDiv.classList.remove("hidden");
          chatScreen.classList.remove("hidden");
          loadMessages();
        } else {
          showStatus("Giriş hatası: " + (response.error || "Bilinmeyen hata"), true);
        }
      });
    });
    
    // Çıkış yapma işlemi
    logoutBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "logout" }, (response) => {
        if (response?.success) {
          loginScreen.classList.remove("hidden");
          signupScreen.classList.add("hidden");
          userInfoDiv.classList.add("hidden");
          chatScreen.classList.add("hidden");
          messagesContainer.innerHTML = "";
          
          // Video chat container'ı da gizle
          const videoContainer = document.getElementById('video-chat-container');
          if (videoContainer) {
            videoContainer.classList.add('hidden');
          }
        }
      });
    });
    
    // Video görüşmesi başlatma işlemi
    openVideoChatBtn.addEventListener("click", async () => {
      try {
        // Rastgele bir oda ID'si oluştur
        const roomId = Math.floor(Math.random() * 1000000000).toString();
        
        // Firebase'de oda oluştur
        await database.ref('webrtc-rooms/' + roomId).set({
          created: firebase.database.ServerValue.TIMESTAMP,
          createdBy: currentUserNickname
        });
        
        currentRoomId = roomId;
        roomIdInput.value = roomId;
        roomControlsSection.classList.remove('hidden');
        
        // Video görüşme penceresini yan panelde aç
        openVideoChatWindow(roomId);
      } catch (error) {
        console.error('Error creating room:', error);
        alert('Oda oluşturma hatası: ' + error.message);
      }
    });
    
    // Odaya katılma işlemi
    joinRoomBtn.addEventListener("click", async () => {
      const roomId = roomIdInput.value.trim();
      
      if (!roomId) {
        alert('Lütfen bir Oda ID girin');
        return;
      }
      
      try {
        // Oda var mı kontrol et
        const roomSnapshot = await database.ref('webrtc-rooms/' + roomId).once('value');
        
        if (!roomSnapshot.exists()) {
          alert('Oda bulunamadı. Lütfen Oda ID\'yi kontrol edin.');
          return;
        }
        
        currentRoomId = roomId;
        
        // Video görüşme penceresini yan panelde aç
        openVideoChatWindow(roomId);
      } catch (error) {
        console.error('Error joining room:', error);
        alert('Odaya katılma hatası: ' + error.message);
      }
    });
    
    // Oda ID'yi kopyala
    copyRoomIdBtn.addEventListener("click", () => {
      roomIdInput.select();
      document.execCommand('copy');
      alert('Oda ID kopyalandı!');
    });
    
    // Video görüşme penceresini yan panelde aç
    function openVideoChatWindow(roomId) {
      // Chat ekranını gizle
      document.getElementById('chat-screen').classList.add('hidden');
      
      // Video chat alanını oluştur (eğer daha önce oluşturulmadıysa)
      if (!document.getElementById('video-chat-container')) {
        const videoContainer = document.createElement('div');
        videoContainer.id = 'video-chat-container';
        videoContainer.innerHTML = `
            <div class="video-header">
                <h2>Video Görüşmesi</h2>
                <button id="backToChat" class="back-button">Sohbete Dön</button>
            </div>
            <div class="videos">
                <video id="localVideo" autoplay muted playsinline></video>
                <video id="remoteVideo" autoplay playsinline></video>
            </div>
            <div class="controls">
                <button id="startButton">Kamerayı Başlat</button>
                <button id="hangupButton" disabled>Görüşmeyi Sonlandır</button>
            </div>
            <div id="roomInfo">
                <p>Oda ID: <span id="roomIdDisplay">${roomId}</span></p>
                <p>Durum: <span id="status">Başlamak için kamerayı başlat</span></p>
            </div>
        `;
        document.body.appendChild(videoContainer);
        
        // Video chat başlatma ve kontrol işlevlerini ekleyin
        initializeVideoChat(roomId);
        
        // Sohbete dön butonu
        document.getElementById('backToChat').addEventListener('click', () => {
          document.getElementById('video-chat-container').classList.add('hidden');
          document.getElementById('chat-screen').classList.remove('hidden');
        });
      } else {
        document.getElementById('video-chat-container').classList.remove('hidden');
        document.getElementById('roomIdDisplay').textContent = roomId;
      }
    }
    
    // Video chat işlevlerini başlat
    async function initializeVideoChat(roomId) {
      // HTML elementleri
      const localVideo = document.getElementById('localVideo');
      const remoteVideo = document.getElementById('remoteVideo');
      const startButton = document.getElementById('startButton');
      const hangupButton = document.getElementById('hangupButton');
      const statusElement = document.getElementById('status');
      
      // Değişkenler
      let localStream;
      let remoteStream;
      let peerConnection;
      let roomRef;
      
      // STUN/TURN sunucuları
      const servers = {
        iceServers: [
          {
            urls: [
              'stun:stun1.l.google.com:19302',
              'stun:stun2.l.google.com:19302',
            ],
          },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10,
      };
      
      // Event listenerları ekleme
      startButton.addEventListener('click', startCamera);
      hangupButton.addEventListener('click', hangUp);
      
      // Kamera başlatma fonksiyonu
      async function startCamera() {
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          
          localVideo.srcObject = localStream;
          startButton.disabled = true;
          hangupButton.disabled = false;
          
          updateStatus('Kamera başlatıldı. Görüşmeye bağlanılıyor...');
          
          if (roomId) {
            roomRef = database.ref('webrtc-rooms/' + roomId);
            await joinOrCreateCall();
          } else {
            updateStatus('Oda ID bulunamadı, görüşme başlatılamıyor.');
          }
        } catch (error) {
          console.error('Error starting camera:', error);
          updateStatus('Kamera başlatma hatası: ' + error.message);
          alert('Kamera erişimi reddedildi veya bir hata oluştu.');
        }
      }
      
      // Çağrı oluşturma veya katılma
      async function joinOrCreateCall() {
        try {
          const roomSnapshot = await roomRef.once('value');
          
          if (!roomSnapshot.exists()) {
            await setupAsHost();
          } else {
            if (roomSnapshot.val().offer) {
              await setupAsParticipant(roomSnapshot.val());
            } else {
              await setupAsHost();
            }
          }
        } catch (error) {
          console.error('Error joining/creating call:', error);
          updateStatus('Görüşme başlatma hatası: ' + error.message);
        }
      }
      
      // Sunucu olarak kurulum (teklif oluşturma)
      async function setupAsHost() {
        try {
          updateStatus('Görüşme başlatılıyor...');
          
          // Peer connection oluştur
          peerConnection = createPeerConnection();
          
          // Yerel medya akışlarını peer connection'a ekle
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
          
          // ICE adaylarını topla
          collectIceCandidates(roomRef, 'caller', 'callee');
          
          // Bir teklif oluştur
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          // Teklifi Firebase'e kaydet
          const roomWithOffer = {
            offer: {
              type: offer.type,
              sdp: offer.sdp
            },
            hostNickname: currentUserNickname,
            created: firebase.database.ServerValue.TIMESTAMP
          };
          
          await roomRef.update(roomWithOffer);
          
          updateStatus('Görüşme başlatıldı. Katılımcı bekleniyor...');
        } catch (error) {
          console.error('Error setting up as host:', error);
          updateStatus('Görüşme başlatma hatası: ' + error.message);
        }
      }
      
      // Katılımcı olarak kurulum (yanıt oluşturma)
      async function setupAsParticipant(roomData) {
        try {
          updateStatus('Görüşmeye katılınıyor...');
          
          // Peer connection oluştur
          peerConnection = createPeerConnection();
          
          // Yerel medya akışlarını peer connection'a ekle
          localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
          });
          
          // ICE adaylarını topla
          collectIceCandidates(roomRef, 'callee', 'caller');
          
          // roomData'dan teklifi işle
          const offer = roomData.offer;
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          
          // Bir yanıt oluştur
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          // Yanıtı Firebase'e kaydet
          const roomWithAnswer = {
            answer: {
              type: answer.type,
              sdp: answer.sdp
            },
            participantNickname: currentUserNickname
          };
          
          await roomRef.update(roomWithAnswer);
          
          updateStatus('Görüşmeye katılındı. Bağlantı kuruluyor...');
        } catch (error) {
          console.error('Error setting up as participant:', error);
          updateStatus('Görüşmeye katılma hatası: ' + error.message);
        }
      }
      
      // ICE adaylarını topla
      function collectIceCandidates(roomRef, localName, remoteName) {
        // Yerel ICE adaylarını sakla
        const candidatesCollection = roomRef.child(localName + 'Candidates');
        
        // ICE adaylarını dinle
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            candidatesCollection.push(event.candidate.toJSON());
          }
        };
        
        // Uzak ICE adaylarını dinle
        roomRef.child(remoteName + 'Candidates').on('child_added', snapshot => {
          const candidate = new RTCIceCandidate(snapshot.val());
          peerConnection.addIceCandidate(candidate).catch(e => {
            console.error('Error adding ICE candidate:', e);
          });
        });
        
        // Oda değişikliklerini dinle (yanıt arama)
        roomRef.on('value', async snapshot => {
          const data = snapshot.val();
          if (!data) return;
          
          // Eğer biz arayan tarafsak ve bir yanıt varsa
          if (localName === 'caller' && data.answer) {
            const answer = new RTCSessionDescription(data.answer);
            if (peerConnection.signalingState !== 'stable') {
              await peerConnection.setRemoteDescription(answer).catch(e => {
                console.error('Error setting remote description:', e);
              });
              updateStatus('Yanıt alındı. Bağlantı kuruluyor...');
            }
          }
        });
      }
      
      // Peer connection oluştur
      function createPeerConnection() {
        const pc = new RTCPeerConnection(servers);
        
        // Uzak akışı ayarla
        remoteStream = new MediaStream();
        remoteVideo.srcObject = remoteStream;
        
        // Uzak medya izlerini işle
        pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
          });
        };
        
        // Bağlantı durumu değişiklikleri
        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected') {
            updateStatus('Bağlandı! Görüşmenin keyfini çıkarın.');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            updateStatus('Bağlantı kesildi veya başarısız oldu.');
          }
        };
        
        // ICE bağlantı durumu değişiklikleri
        pc.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', pc.iceConnectionState);
          if (pc.iceConnectionState === 'connected') {
            updateStatus('Bağlantı başarılı. Görüşme aktif.');
          } else if (pc.iceConnectionState === 'failed') {
            updateStatus('Bağlantı başarısız oldu. Tekrar deneyebilirsiniz.');
          }
        };
        
        return pc;
      }
      
      // Durumu güncelle
      function updateStatus(message) {
        statusElement.textContent = message;
        console.log('Status:', message);
      }
      
      // Görüşmeyi sonlandır
      function hangUp() {
        if (peerConnection) {
          peerConnection.close();
          peerConnection = null;
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
          roomRef.off(); // Dinleyicileri kaldır
        }
        
        startButton.disabled = false;
        hangupButton.disabled = true;
        
        updateStatus('Görüşme sonlandırıldı.');
      }
    }
    
    // Mesaj gönderme işlemi
    sendMessageBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
    
    async function sendMessage() {
      const message = messageInput.value.trim();
      if (message === "") return;
      
      const newMessage = {
        sender: currentUserNickname,
        text: message,
        timestamp: Date.now()
      };
      
      try {
        const response = await fetch("https://cconnectyigit-default-rtdb.firebaseio.com/messages.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMessage)
        });
        
        if (!response.ok) {
          throw new Error("Mesaj gönderme başarısız");
        }
        
        messageInput.value = "";
        setTimeout(loadMessages, 500);
      } catch (error) {
        console.error("Mesaj gönderme hatası:", error);
      }
    }
    
    // Mesajları yükleme fonksiyonu
    async function loadMessages() {
      try {
        const response = await fetch("https://cconnectyigit-default-rtdb.firebaseio.com/messages.json");
        if (!response.ok) throw new Error("Mesajları alma başarısız");
        
        const data = await response.json();
        messagesContainer.innerHTML = "";
        
        if (data && Object.keys(data).length > 0) {
          Object.values(data).forEach((message) => {
            const messageElement = document.createElement("div");
            messageElement.textContent = `${message.sender}: ${message.text}`;
            messageElement.classList.add(message.sender === currentUserNickname ? "sent-message" : "received-message");
            messageElement.style.backgroundColor = getUserColor(message.sender);
            
            messagesContainer.appendChild(messageElement);
          });
          
          scrollToBottom();
        }
      } catch (error) {
        console.error("Mesajları yükleme hatası:", error);
      }
    }
    
    function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    setInterval(loadMessages, 3000);
    loadMessages();
  });