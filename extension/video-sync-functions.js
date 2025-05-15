// Video senkronizasyon işlevleri
function initVideoSyncFeatures(roomId) {
    console.log("[Sync] Video senkronizasyon özellikleri başlatılıyor - Oda ID:", roomId);
    
    // HTML elemanları
    const syncVideoBtn = document.getElementById('syncVideoBtn');
    const syncStatus = document.getElementById('syncStatus');
    const currentVideoTime = document.getElementById('currentVideoTime');
    const remoteVideoTime = document.getElementById('remoteVideoTime');
    
    // Senkronizasyon bilgisi alanını oluştur
    const syncInfoDiv = document.createElement('div');
    syncInfoDiv.className = 'video-info';
    syncInfoDiv.innerHTML = '<p>Aktif sekmedeki video senkronize edilecek</p>';
    
    // Senkronizasyon bölümüne bilgi alanını ekle
    const syncSection = document.getElementById('video-sync-section');
    syncSection.appendChild(syncInfoDiv);
    
    // Firebase referansı
    const syncRef = firebase.database().ref('videoSync/' + roomId);
    let isProcessingSync = false; // Çift senkronizasyonu önlemek için
    
    // Firebase'den son senkronizasyon verisini al
    syncRef.once('value', (snapshot) => {
      const syncData = snapshot.val();
      if (syncData) {
        remoteVideoTime.textContent = formatTime(syncData.currentTime);
        
        // Eğer şu anki kullanıcı göndermemişse ve 10 saniyeden yeni ise, bilgilendir
        if (syncData.sender !== currentUserNickname && Date.now() - syncData.timestamp < 10000) {
          syncStatus.textContent = `${syncData.sender} son olarak senkronize etti`;
          syncStatus.className = 'status-info';
        }
      }
    });
    
    // Senkronizasyon düğmesine tıklama olayı ekle
    syncVideoBtn.addEventListener('click', async () => {
      try {
        if (isProcessingSync) return; // Zaten işlem yapılıyorsa çık
        isProcessingSync = true;
        
        // Buton durumunu güncelle
        syncVideoBtn.disabled = true;
        syncStatus.textContent = "Aktif video aranıyor...";
        syncStatus.className = 'status-syncing sync-animation';
        
        // Servis worker'a mesaj gönder ve video bilgisini al
        chrome.runtime.sendMessage({ action: "getVideoInfo" }, async (response) => {
          console.log("[Sync] Video bilgisi yanıtı:", response);
          
          if (!response || !response.success) {
            syncStatus.textContent = "Aktif sekmede video bulunamadı!";
            syncStatus.className = 'status-error';
            syncVideoBtn.disabled = false;
            isProcessingSync = false;
            return;
          }
          
          const videoTime = response.currentTime;
          const videoDuration = response.duration;
          const videoUrl = response.videoUrl;
          const pageTitle = response.pageTitle || "Video";
          
          // Süreyi formatlayıp göster
          currentVideoTime.textContent = formatTime(videoTime);
          
          // Bilgi bölümünü güncelle
          syncInfoDiv.innerHTML = `
            <p><strong>Sayfa:</strong> ${limitText(pageTitle, 30)}</p>
            <p><strong>URL:</strong> ${limitText(videoUrl, 40)}</p>
            <p><strong>Toplam süre:</strong> ${formatTime(videoDuration)}</p>
          `;
          
          // Senkronizasyon verisini Firebase'e gönder
          const syncData = {
            sender: currentUserNickname,
            currentTime: videoTime,
            duration: videoDuration,
            url: videoUrl,
            pageTitle: pageTitle,
            timestamp: firebase.database.ServerValue.TIMESTAMP
          };
          
          try {
            await syncRef.set(syncData);
            syncStatus.textContent = "Senkronizasyon gönderildi!";
            syncStatus.className = 'status-success';
            console.log("[Sync] Video süresi gönderildi:", videoTime);
          } catch (error) {
            syncStatus.textContent = "Gönderme hatası: " + error.message;
            syncStatus.className = 'status-error';
            console.error("[Sync] Senkronizasyon gönderme hatası:", error);
          }
          
          syncVideoBtn.disabled = false;
          isProcessingSync = false;
        });
      } catch (error) {
        syncStatus.textContent = "Hata: " + error.message;
        syncStatus.className = 'status-error';
        console.error("[Sync] Senkronizasyon hatası:", error);
        syncVideoBtn.disabled = false;
        isProcessingSync = false;
      }
    });
    
    // Karşı tarafın senkronizasyonunu dinle
    syncRef.on('value', async (snapshot) => {
      const syncData = snapshot.val();
      if (!syncData) return;
      
      // Kendi gönderdiğimiz veriyi işleme - süreyi güncelle
      if (syncData.sender === currentUserNickname) {
        currentVideoTime.textContent = formatTime(syncData.currentTime);
        return;
      }
      
      // Karşı tarafın gönderdiği veriyi işle
      console.log("[Sync] Karşı taraftan video senkronizasyon verisi alındı:", syncData);
      
      // Alınan süreyi göster
      remoteVideoTime.textContent = formatTime(syncData.currentTime);
      
      // Bilgi mesajını güncelle
      syncStatus.textContent = `${syncData.sender} video süresini gönderdi`;
      syncStatus.className = 'status-info';
      
      // Senkronize etme butonunu oluştur
      const applySyncBtn = document.createElement('button');
      applySyncBtn.textContent = 'Bu süreye senkronize et';
      applySyncBtn.className = 'sync-btn';
      applySyncBtn.style.marginTop = '8px';
      applySyncBtn.style.width = '100%';
      
      // Bilgi alanını güncelle
      syncInfoDiv.innerHTML = `
        <p><strong>${syncData.sender} tarafından:</strong></p>
        <p><strong>Sayfa:</strong> ${limitText(syncData.pageTitle || "Video", 30)}</p>
        <p><strong>Süre:</strong> ${formatTime(syncData.currentTime)} / ${formatTime(syncData.duration)}</p>
      `;
      
      // Apply butonunu eklemeden önce mevcut butonları kaldır
      const existingApplyBtn = syncInfoDiv.querySelector('.sync-btn');
      if (existingApplyBtn) {
        existingApplyBtn.remove();
      }
      
      // Apply butonunu ekle
      syncInfoDiv.appendChild(applySyncBtn);
      
      // Apply butonuna tıklama olayı ekle
      applySyncBtn.addEventListener('click', async () => {
        try {
          applySyncBtn.disabled = true;
          syncStatus.textContent = "Senkronizasyon uygulanıyor...";
          syncStatus.className = 'status-syncing sync-animation';
          
          // Servis worker'a mesaj gönder ve video süresini ayarla
          chrome.runtime.sendMessage({
            action: "setVideoTime",
            currentTime: syncData.currentTime
          }, (response) => {
            console.log("[Sync] Video süresi ayarlama yanıtı:", response);
            
            if (response && response.success) {
              syncStatus.textContent = "Video senkronize edildi!";
              syncStatus.className = 'status-success';
              currentVideoTime.textContent = formatTime(syncData.currentTime);
            } else {
              syncStatus.textContent = "Video senkronize edilemedi: " + (response?.message || "Bilinmeyen hata");
              syncStatus.className = 'status-error';
            }
            
            applySyncBtn.disabled = false;
          });
        } catch (error) {
          console.error("[Sync] Video süresini ayarlama hatası:", error);
          syncStatus.textContent = "Senkronizasyon hatası: " + error.message;
          syncStatus.className = 'status-error';
          applySyncBtn.disabled = false;
        }
      });
    });
    
    // Oda kapatıldığında dinleyiciyi kaldır
    return function cleanup() {
      syncRef.off();
    };
  }
  
  // Süreyi dakika:saniye formatına çevir
  function formatTime(timeInSeconds) {
    if (isNaN(timeInSeconds)) return "00:00";
    
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Metni belirli bir uzunlukta kesip "..." ekle
  function limitText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }