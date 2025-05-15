// Content script - aktif sekmedeki video elementleriyle etkileşim sağlar
console.log("[Content Script] Video senkronizasyon content script yüklendi");

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoInfo") {
    // Sayfadaki tüm video elementlerini bul
    const videos = document.querySelectorAll('video');
    
    if (videos.length === 0) {
      console.log("[Content] Sayfada video bulunamadı");
      sendResponse({success: false, message: "Sayfada video bulunamadı"});
      return true;
    }
    
    // Oynatılan veya sayfada en üstteki videoyu bul
    let activeVideo = null;
    
    // Önce oynayan videoyu bul
    for (const video of videos) {
      if (!video.paused && video.currentTime > 0 && video.readyState > 2) {
        activeVideo = video;
        break;
      }
    }
    
    // Oynayan video yoksa en görünür olan videoyu bul (viewport içinde)
    if (!activeVideo) {
      let maxVisibility = 0;
      
      for (const video of videos) {
        const rect = video.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) { // En az 100x100 piksel boyutunda olmalı
          // Viewport içindeki görünürlüğünü hesapla
          const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
          const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
          
          if (visibleWidth > 0 && visibleHeight > 0) {
            const visibleArea = visibleWidth * visibleHeight;
            if (visibleArea > maxVisibility) {
              maxVisibility = visibleArea;
              activeVideo = video;
            }
          }
        }
      }
    }
    
    // Hala bir video bulunamadıysa, ilk videoyu al
    if (!activeVideo && videos.length > 0) {
      activeVideo = videos[0];
    }
    
    if (activeVideo) {
      console.log("[Content] Aktif video bulundu:", activeVideo);
      
      // Video bilgilerini gönder
      const videoInfo = {
        success: true,
        currentTime: activeVideo.currentTime,
        duration: activeVideo.duration,
        paused: activeVideo.paused,
        videoUrl: window.location.href,
        pageTitle: document.title,
        playerType: detectPlayerType()
      };
      
      console.log("[Content] Video bilgileri:", videoInfo);
      sendResponse(videoInfo);
    } else {
      console.log("[Content] Aktif video bulunamadı");
      sendResponse({success: false, message: "Aktif video bulunamadı"});
    }
    
    return true;
  }
  
  if (request.action === "setVideoTime") {
    // Sayfadaki tüm video elementlerini bul
    const videos = document.querySelectorAll('video');
    
    if (videos.length === 0) {
      console.log("[Content] Sayfada video bulunamadı");
      sendResponse({success: false, message: "Sayfada video bulunamadı"});
      return true;
    }
    
    // Oynatılan veya sayfada en üstteki videoyu bul
    let activeVideo = null;
    
    // Önce oynayan videoyu bul
    for (const video of videos) {
      if (!video.paused && video.currentTime > 0) {
        activeVideo = video;
        break;
      }
    }
    
    // Oynayan video yoksa en görünür olan videoyu bul (viewport içinde)
    if (!activeVideo) {
      let maxVisibility = 0;
      
      for (const video of videos) {
        const rect = video.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) { // En az 100x100 piksel boyutunda olmalı
          // Viewport içindeki görünürlüğünü hesapla
          const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
          const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
          
          if (visibleWidth > 0 && visibleHeight > 0) {
            const visibleArea = visibleWidth * visibleHeight;
            if (visibleArea > maxVisibility) {
              maxVisibility = visibleArea;
              activeVideo = video;
            }
          }
        }
      }
    }
    
    // Hala bir video bulunamadıysa, ilk videoyu al
    if (!activeVideo && videos.length > 0) {
      activeVideo = videos[0];
    }
    
    if (activeVideo) {
      console.log("[Content] Video bulundu, süre ayarlanıyor:", request.currentTime);
      
      try {
        // Videonun süresini ayarla
        activeVideo.currentTime = parseFloat(request.currentTime);
        
        // Video duraklatılmışsa ve oynatılabiliyorsa, oynatmayı dene
        if (activeVideo.paused && !document.hidden) {
          // Özel video oynatıcılarını kontrol et
          const playerType = detectPlayerType();
          
          if (playerType === "youtube") {
            // YouTube için oynatma tuşuna basma işlemi
            const playButton = document.querySelector('.ytp-play-button');
            if (playButton && playButton.getAttribute('aria-label').includes('Oynat')) {
              playButton.click();
            }
          } else if (playerType === "vimeo") {
            // Vimeo için oynatma tuşuna basma işlemi
            const playButton = document.querySelector('.play');
            if (playButton) {
              playButton.click();
            }
          } else {
            // Standart HTML5 video kontrolü
            activeVideo.play()
              .then(() => {
                console.log("[Content] Video başarıyla başlatıldı");
              })
              .catch(error => {
                console.error("[Content] Video başlatma hatası:", error);
              });
          }
        }
        
        sendResponse({
          success: true,
          message: "Video süresi başarıyla ayarlandı",
          newTime: activeVideo.currentTime
        });
      } catch (error) {
        console.error("[Content] Video süresini ayarlama hatası:", error);
        sendResponse({
          success: false,
          message: "Video süresi ayarlanamadı: " + error.message
        });
      }
    } else {
      console.log("[Content] Aktif video bulunamadı");
      sendResponse({success: false, message: "Aktif video bulunamadı"});
    }
    
    return true;
  }
  
  return false;
});

// Video oynatıcı tipini algılama
function detectPlayerType() {
  const url = window.location.href;
  const host = window.location.hostname;
  
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  } else if (url.includes("vimeo.com")) {
    return "vimeo";
  } else if (url.includes("netflix.com")) {
    return "netflix";
  } else if (url.includes("amazon.com/gp/video") || url.includes("primevideo.com")) {
    return "primevideo";
  } else if (url.includes("disneyplus.com")) {
    return "disney";
  } else if (url.includes("hulu.com")) {
    return "hulu";
  } else if (url.includes("hbo")) {
    return "hbo";
  } else {
    return "generic";
  }
}