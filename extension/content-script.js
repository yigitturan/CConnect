// Content script - aktif sekmedeki video elementleriyle etkileşim sağlar
console.log("[Content Script] Video senkronizasyon content script yüklendi");

// Video bulma ve kontrol fonksiyonları
function findActiveVideo() {
  const videos = document.querySelectorAll('video');
  
  if (videos.length === 0) {
    console.log("[Content] Sayfada video bulunamadı");
    return null;
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
  
  return activeVideo;
}

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
  } else if (url.includes("twitch.tv")) {
    return "twitch";
  } else if (url.includes("dailymotion.com")) {
    return "dailymotion";
  } else {
    return "generic";
  }
}

// Platforma özel video kontrolü
function controlVideoPlayback(video, action, value = null) {
  const playerType = detectPlayerType();
  
  console.log(`[Content] Video kontrolü: ${action}, Platform: ${playerType}`);
  
  switch (action) {
    case "play":
      return handlePlay(video, playerType);
    case "pause":
      return handlePause(video, playerType);
    case "setTime":
      return handleSetTime(video, playerType, value);
    default:
      console.warn("[Content] Bilinmeyen video kontrolü:", action);
      return false;
  }
}

function handlePlay(video, playerType) {
  try {
    switch (playerType) {
      case "youtube":
        // YouTube için oynatma tuşuna basma işlemi
        const playButton = document.querySelector('.ytp-play-button');
        if (playButton && playButton.getAttribute('aria-label')?.includes('Oynat')) {
          playButton.click();
          return true;
        }
        break;
      
      case "vimeo":
        // Vimeo için oynatma tuşuna basma işlemi
        const vimeoPlayButton = document.querySelector('.play');
        if (vimeoPlayButton) {
          vimeoPlayButton.click();
          return true;
        }
        break;
      
      case "netflix":
        // Netflix için play butonu
        const netflixPlayButton = document.querySelector('[data-uia="control-play-pause-play"]');
        if (netflixPlayButton) {
          netflixPlayButton.click();
          return true;
        }
        break;
      
      case "twitch":
        // Twitch için play butonu
        const twitchPlayButton = document.querySelector('[data-a-target="player-play-pause-button"]');
        if (twitchPlayButton && twitchPlayButton.getAttribute('aria-label')?.includes('Play')) {
          twitchPlayButton.click();
          return true;
        }
        break;
        
      default:
        // Standart HTML5 video kontrolü
        if (video && video.paused) {
          return video.play().then(() => {
            console.log("[Content] Video başarıyla başlatıldı");
            return true;
          }).catch(error => {
            console.error("[Content] Video başlatma hatası:", error);
            return false;
          });
        }
        break;
    }
    
    // Fallback - direkt video elementini kullan
    if (video && video.paused) {
      return video.play().then(() => true).catch(() => false);
    }
    
    return false;
  } catch (error) {
    console.error("[Content] Play kontrol hatası:", error);
    return false;
  }
}

function handlePause(video, playerType) {
  try {
    switch (playerType) {
      case "youtube":
        const pauseButton = document.querySelector('.ytp-play-button');
        if (pauseButton && pauseButton.getAttribute('aria-label')?.includes('Duraklat')) {
          pauseButton.click();
          return true;
        }
        break;
      
      case "vimeo":
        const vimeoPauseButton = document.querySelector('.pause');
        if (vimeoPauseButton) {
          vimeoPauseButton.click();
          return true;
        }
        break;
      
      case "netflix":
        const netflixPauseButton = document.querySelector('[data-uia="control-play-pause-pause"]');
        if (netflixPauseButton) {
          netflixPauseButton.click();
          return true;
        }
        break;
      
      case "twitch":
        const twitchPauseButton = document.querySelector('[data-a-target="player-play-pause-button"]');
        if (twitchPauseButton && twitchPauseButton.getAttribute('aria-label')?.includes('Pause')) {
          twitchPauseButton.click();
          return true;
        }
        break;
        
      default:
        if (video && !video.paused) {
          video.pause();
          return true;
        }
        break;
    }
    
    // Fallback
    if (video && !video.paused) {
      video.pause();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[Content] Pause kontrol hatası:", error);
    return false;
  }
}

function handleSetTime(video, playerType, targetTime) {
  try {
    console.log(`[Content] Video süresi ayarlanıyor: ${targetTime}s`);
    
    if (!video || targetTime === null || targetTime === undefined) {
      return false;
    }
    
    const wasPlaying = !video.paused;
    
    // Video süresini ayarla
    video.currentTime = parseFloat(targetTime);
    
    // Platform özel işlemler
    switch (playerType) {
      case "youtube":
        // YouTube'da zaman değişikliği sonrası oynatmayı kontrol et
        setTimeout(() => {
          if (wasPlaying && video.paused) {
            handlePlay(video, playerType);
          }
        }, 200);
        break;
      
      case "netflix":
        // Netflix'te seek sonrası güncelleme
        const seekBar = document.querySelector('.scrubber-head');
        if (seekBar) {
          // Netflix'in kendi seek mekanizmasını tetikle
          const event = new Event('mousedown');
          seekBar.dispatchEvent(event);
        }
        
        setTimeout(() => {
          if (wasPlaying && video.paused) {
            handlePlay(video, playerType);
          }
        }, 300);
        break;
        
      default:
        // Standart video element için
        setTimeout(() => {
          if (wasPlaying && video.paused) {
            handlePlay(video, playerType);
          }
        }, 100);
        break;
    }
    
    console.log(`[Content] Video süresi ${targetTime}s olarak ayarlandı, oynatma durumu: ${wasPlaying ? 'devam edecek' : 'duraklatılmış kalacak'}`);
    return true;
    
  } catch (error) {
    console.error("[Content] SetTime kontrol hatası:", error);
    return false;
  }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content] Mesaj alındı:", request);
  
  if (request.action === "getVideoInfo") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      console.log("[Content] Aktif video bulunamadı");
      sendResponse({success: false, message: "Sayfada aktif video bulunamadı"});
      return true;
    }
    
    console.log("[Content] Aktif video bulundu:", activeVideo);
    
    // Video bilgilerini gönder
    const videoInfo = {
      success: true,
      currentTime: activeVideo.currentTime || 0,
      duration: activeVideo.duration || 0,
      paused: activeVideo.paused,
      videoUrl: window.location.href,
      pageTitle: document.title,
      playerType: detectPlayerType(),
      readyState: activeVideo.readyState,
      networkState: activeVideo.networkState,
      playbackRate: activeVideo.playbackRate || 1
    };
    
    console.log("[Content] Video bilgileri:", videoInfo);
    sendResponse(videoInfo);
    return true;
  }
  
  if (request.action === "setVideoTime") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      console.log("[Content] Video süresini ayarlamak için aktif video bulunamadı");
      sendResponse({success: false, message: "Aktif video bulunamadı"});
      return true;
    }
    
    console.log("[Content] Video süresi ayarlanıyor:", request.currentTime);
    
    try {
      const success = handleSetTime(activeVideo, detectPlayerType(), request.currentTime);
      
      if (success) {
        sendResponse({
          success: true,
          message: "Video süresi başarıyla ayarlandı",
          newTime: activeVideo.currentTime,
          playerType: detectPlayerType()
        });
      } else {
        sendResponse({
          success: false,
          message: "Video süresini ayarlama başarısız"
        });
      }
      
    } catch (error) {
      console.error("[Content] Video süresini ayarlama hatası:", error);
      sendResponse({
        success: false,
        message: "Video süresi ayarlanamadı: " + error.message
      });
    }
    
    return true;
  }
  
  if (request.action === "playVideo") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      sendResponse({success: false, message: "Aktif video bulunamadı"});
      return true;
    }
    
    const success = handlePlay(activeVideo, detectPlayerType());
    sendResponse({
      success: success,
      message: success ? "Video oynatma başarılı" : "Video oynatma başarısız"
    });
    return true;
  }
  
  if (request.action === "pauseVideo") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      sendResponse({success: false, message: "Aktif video bulunamadı"});
      return true;
    }
    
    const success = handlePause(activeVideo, detectPlayerType());
    sendResponse({
      success: success,
      message: success ? "Video durdurma başarılı" : "Video durdurma başarısız"
    });
    return true;
  }
  
  return false;
});

// Video event listeners - gerçek zamanlı olayları yakalamak için
let lastVideoState = null;
let videoEventInterval = null;

function startVideoEventTracking() {
  if (videoEventInterval) {
    clearInterval(videoEventInterval);
  }
  
  videoEventInterval = setInterval(() => {
    const activeVideo = findActiveVideo();
    if (!activeVideo) return;
    
    const currentState = {
      currentTime: Math.floor(activeVideo.currentTime * 10) / 10,
      paused: activeVideo.paused,
      duration: activeVideo.duration,
      url: window.location.href
    };
    
    // Video durumu değişti mi kontrol et
    if (!lastVideoState || 
        Math.abs(lastVideoState.currentTime - currentState.currentTime) > 0.5 ||
        lastVideoState.paused !== currentState.paused ||
        lastVideoState.url !== currentState.url) {
      
      console.log("[Content] Video durumu değişti:", currentState);
      
      // Extension'a video durumu değişikliğini bildir
      chrome.runtime.sendMessage({
        action: "videoStateChanged",
        videoState: currentState
      }).catch(error => {
        // Extension kapalıysa hata alabilir, bu normal
        console.log("[Content] Extension'a mesaj gönderilemedi:", error.message);
      });
      
      lastVideoState = currentState;
    }
  }, 500); // Her 0.5 saniyede kontrol et
}

// Sayfa yüklendiğinde video event tracking'i başlat
window.addEventListener('load', () => {
  setTimeout(() => {
    const activeVideo = findActiveVideo();
    if (activeVideo) {
      console.log("[Content] Sayfa yüklendi, video event tracking başlatılıyor");
      startVideoEventTracking();
      
      console.log("[Content] Aktif video bulundu:", {
        currentTime: activeVideo.currentTime,
        duration: activeVideo.duration,
        paused: activeVideo.paused,
        playerType: detectPlayerType()
      });
    }
  }, 2000);
});

// Video olaylarını direkt dinle (ek kontrol için)
document.addEventListener('play', (e) => {
  if (e.target.tagName === 'VIDEO') {
    console.log("[Content] Video play eventi:", e.target);
    chrome.runtime.sendMessage({
      action: "videoStateChanged",
      videoState: {
        currentTime: e.target.currentTime,
        paused: false,
        duration: e.target.duration,
        url: window.location.href,
        event: 'play'
      }
    }).catch(() => {});
  }
}, true);

document.addEventListener('pause', (e) => {
  if (e.target.tagName === 'VIDEO') {
    console.log("[Content] Video pause eventi:", e.target);
    chrome.runtime.sendMessage({
      action: "videoStateChanged",
      videoState: {
        currentTime: e.target.currentTime,
        paused: true,
        duration: e.target.duration,
        url: window.location.href,
        event: 'pause'
      }
    }).catch(() => {});
  }
}, true);

document.addEventListener('seeked', (e) => {
  if (e.target.tagName === 'VIDEO') {
    console.log("[Content] Video seeked eventi:", e.target.currentTime);
    chrome.runtime.sendMessage({
      action: "videoStateChanged",
      videoState: {
        currentTime: e.target.currentTime,
        paused: e.target.paused,
        duration: e.target.duration,
        url: window.location.href,
        event: 'seeked'
      }
    }).catch(() => {});
  }
}, true);

// URL değişikliklerini izle (SPA'lar için)
let currentUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log("[Content] URL değişti, video tracking yeniden başlatılıyor");
    
    // Kısa bir gecikme sonrası yeni videoyu bul
    setTimeout(() => {
      startVideoEventTracking();
    }, 1000);
  }
});

urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

console.log("[Content] Video event tracking sistemi hazır");// Content script - aktif sekmedeki video elementleriyle etkileşim sağlar
console.log("[Content Script] Video senkronizasyon content script yüklendi");

// Video bulma ve kontrol fonksiyonları
function findActiveVideo() {
  const videos = document.querySelectorAll('video');
  
  if (videos.length === 0) {
    console.log("[Content] Sayfada video bulunamadı");
    return null;
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
  
  return activeVideo;
}

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
  } else if (url.includes("twitch.tv")) {
    return "twitch";
  } else if (url.includes("dailymotion.com")) {
    return "dailymotion";
  } else {
    return "generic";
  }
}

// Platforma özel video kontrolü
function controlVideoPlayback(video, action, value = null) {
  const playerType = detectPlayerType();
  
  console.log(`[Content] Video kontrolü: ${action}, Platform: ${playerType}`);
  
  switch (action) {
    case "play":
      return handlePlay(video, playerType);
    case "pause":
      return handlePause(video, playerType);
    case "setTime":
      return handleSetTime(video, playerType, value);
    default:
      console.warn("[Content] Bilinmeyen video kontrolü:", action);
      return false;
  }
}

function handlePlay(video, playerType) {
  try {
    switch (playerType) {
      case "youtube":
        // YouTube için oynatma tuşuna basma işlemi
        const playButton = document.querySelector('.ytp-play-button');
        if (playButton && playButton.getAttribute('aria-label')?.includes('Oynat')) {
          playButton.click();
          return true;
        }
        break;
      
      case "vimeo":
        // Vimeo için oynatma tuşuna basma işlemi
        const vimeoPlayButton = document.querySelector('.play');
        if (vimeoPlayButton) {
          vimeoPlayButton.click();
          return true;
        }
        break;
      
      case "netflix":
        // Netflix için play butonu
        const netflixPlayButton = document.querySelector('[data-uia="control-play-pause-play"]');
        if (netflixPlayButton) {
          netflixPlayButton.click();
          return true;
        }
        break;
      
      case "twitch":
        // Twitch için play butonu
        const twitchPlayButton = document.querySelector('[data-a-target="player-play-pause-button"]');
        if (twitchPlayButton && twitchPlayButton.getAttribute('aria-label')?.includes('Play')) {
          twitchPlayButton.click();
          return true;
        }
        break;
        
      default:
        // Standart HTML5 video kontrolü
        if (video && video.paused) {
          return video.play().then(() => {
            console.log("[Content] Video başarıyla başlatıldı");
            return true;
          }).catch(error => {
            console.error("[Content] Video başlatma hatası:", error);
            return false;
          });
        }
        break;
    }
    
    // Fallback - direkt video elementini kullan
    if (video && video.paused) {
      return video.play().then(() => true).catch(() => false);
    }
    
    return false;
  } catch (error) {
    console.error("[Content] Play kontrol hatası:", error);
    return false;
  }
}

function handlePause(video, playerType) {
  try {
    switch (playerType) {
      case "youtube":
        const pauseButton = document.querySelector('.ytp-play-button');
        if (pauseButton && pauseButton.getAttribute('aria-label')?.includes('Duraklat')) {
          pauseButton.click();
          return true;
        }
        break;
      
      case "vimeo":
        const vimeoPauseButton = document.querySelector('.pause');
        if (vimeoPauseButton) {
          vimeoPauseButton.click();
          return true;
        }
        break;
      
      case "netflix":
        const netflixPauseButton = document.querySelector('[data-uia="control-play-pause-pause"]');
        if (netflixPauseButton) {
          netflixPauseButton.click();
          return true;
        }
        break;
      
      case "twitch":
        const twitchPauseButton = document.querySelector('[data-a-target="player-play-pause-button"]');
        if (twitchPauseButton && twitchPauseButton.getAttribute('aria-label')?.includes('Pause')) {
          twitchPauseButton.click();
          return true;
        }
        break;
        
      default:
        if (video && !video.paused) {
          video.pause();
          return true;
        }
        break;
    }
    
    // Fallback
    if (video && !video.paused) {
      video.pause();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[Content] Pause kontrol hatası:", error);
    return false;
  }
}

function handleSetTime(video, playerType, targetTime) {
  try {
    console.log(`[Content] Video süresi ayarlanıyor: ${targetTime}s`);
    
    if (!video || targetTime === null || targetTime === undefined) {
      return false;
    }
    
    // Video süresini ayarla
    video.currentTime = parseFloat(targetTime);
    
    // Platform özel işlemler
    switch (playerType) {
      case "youtube":
        // YouTube'da zaman değişikliği sonrası oynatmayı kontrol et
        setTimeout(() => {
          if (video.paused) {
            handlePlay(video, playerType);
          }
        }, 100);
        break;
      
      case "netflix":
        // Netflix'te seek sonrası güncelleme
        const seekBar = document.querySelector('.scrubber-head');
        if (seekBar) {
          // Netflix'in kendi seek mekanizmasını tetikle
          const event = new Event('mousedown');
          seekBar.dispatchEvent(event);
        }
        break;
        
      default:
        // Standart video element için
        if (video.paused && !document.hidden) {
          setTimeout(() => {
            handlePlay(video, playerType);
          }, 100);
        }
        break;
    }
    
    console.log(`[Content] Video süresi ${targetTime}s olarak ayarlandı`);
    return true;
    
  } catch (error) {
    console.error("[Content] SetTime kontrol hatası:", error);
    return false;
  }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content] Mesaj alındı:", request);
  
  if (request.action === "getVideoInfo") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      console.log("[Content] Aktif video bulunamadı");
      sendResponse({success: false, message: "Sayfada aktif video bulunamadı"});
      return true;
    }
    
    console.log("[Content] Aktif video bulundu:", activeVideo);
    
    // Video bilgilerini gönder
    const videoInfo = {
      success: true,
      currentTime: activeVideo.currentTime || 0,
      duration: activeVideo.duration || 0,
      paused: activeVideo.paused,
      videoUrl: window.location.href,
      pageTitle: document.title,
      playerType: detectPlayerType(),
      readyState: activeVideo.readyState,
      networkState: activeVideo.networkState
    };
    
    console.log("[Content] Video bilgileri:", videoInfo);
    sendResponse(videoInfo);
    return true;
  }
  
  if (request.action === "setVideoTime") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      console.log("[Content] Video süresini ayarlamak için aktif video bulunamadı");
      sendResponse({success: false, message: "Aktif video bulunamadı"});
      return true;
    }
    
    console.log("[Content] Video süresi ayarlanıyor:", request.currentTime);
    
    try {
      const success = handleSetTime(activeVideo, detectPlayerType(), request.currentTime);
      
      if (success) {
        sendResponse({
          success: true,
          message: "Video süresi başarıyla ayarlandı",
          newTime: activeVideo.currentTime,
          playerType: detectPlayerType()
        });
      } else {
        sendResponse({
          success: false,
          message: "Video süresini ayarlama başarısız"
        });
      }
      
    } catch (error) {
      console.error("[Content] Video süresini ayarlama hatası:", error);
      sendResponse({
        success: false,
        message: "Video süresi ayarlanamadı: " + error.message
      });
    }
    
    return true;
  }
  
  if (request.action === "playVideo") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      sendResponse({success: false, message: "Aktif video bulunamadı"});
      return true;
    }
    
    const success = handlePlay(activeVideo, detectPlayerType());
    sendResponse({
      success: success,
      message: success ? "Video oynatma başarılı" : "Video oynatma başarısız"
    });
    return true;
  }
  
  if (request.action === "pauseVideo") {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      sendResponse({success: false, message: "Aktif video bulunamadı"});
      return true;
    }
    
    const success = handlePause(activeVideo, detectPlayerType());
    sendResponse({
      success: success,
      message: success ? "Video durdurma başarılı" : "Video durdurma başarısız"
    });
    return true;
  }
  
  return false;
});

// Sayfa yüklendiğinde video bilgilerini logla
window.addEventListener('load', () => {
  setTimeout(() => {
    const activeVideo = findActiveVideo();
    if (activeVideo) {
      console.log("[Content] Sayfa yüklendi, aktif video bulundu:", {
        currentTime: activeVideo.currentTime,
        duration: activeVideo.duration,
        paused: activeVideo.paused,
        playerType: detectPlayerType()
      });
    }
  }, 2000);
});

// Video olaylarını dinle (debug için)
document.addEventListener('play', (e) => {
  if (e.target.tagName === 'VIDEO') {
    console.log("[Content] Video oynatılmaya başlandı:", e.target);
  }
}, true);

document.addEventListener('pause', (e) => {
  if (e.target.tagName === 'VIDEO') {
    console.log("[Content] Video duraklatıldı:", e.target);
  }
}, true);