// ================== CONTENT SCRIPT - TAMAMEN TAMİR EDİLMİŞ VERSİYON ==================

console.log("[ContentScript] 🚀 Tamamen tamir edilmiş video senkronizasyon content script yükleniyor...");

// ================== GLOBAL DEĞİŞKENLER VE YAPILANDIRMA ==================

let contentScriptState = {
  isReady: false,
  lastVideoCheck: 0,
  currentVideo: null,
  videoObserver: null,
  urlObserver: null,
  isProcessing: false,
  debugMode: true,
  lastSeekTime: 0,        // Son seek zamanı
  seekCooldown: 3000,     // 3 saniye seek cooldown
  isSeeking: false,       // Şu anda seek yapılıyor mu?
  seekThreshold: 2.0      // Sadece 2+ saniye farkta seek yap
};

// Performans ve güvenilirlik ayarları
const CONTENT_CONFIG = {
  VIDEO_CHECK_INTERVAL: 500,    // Video kontrolü için interval
  ACTION_TIMEOUT: 3000,         // Video action timeout
  RETRY_DELAY: 200,            // Retry gecikmesi
  MAX_RETRIES: 3,              // Maksimum retry sayısı
  PLATFORM_WAIT: 300,          // Platform özel işlemler için bekleme
  STATE_CHECK_DELAY: 400       // Durum kontrolü gecikmesi
};

// Debug logging fonksiyonu
function log(message, data = null) {
  if (contentScriptState.debugMode) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data) {
      console.log(`[CS ${timestamp}] ${message}`, data);
    } else {
      console.log(`[CS ${timestamp}] ${message}`);
    }
  }
}

// ================== VİDEO BULMA VE KONTROL SİSTEMİ ==================

// Video bulma algoritması - geliştirilmiş
function findActiveVideo() {
  const startTime = performance.now();
  log("🔍 Aktif video aranıyor...");
  
  const videos = document.querySelectorAll('video');
  
  if (videos.length === 0) {
    log("❌ Sayfada video bulunamadı");
    return null;
  }
  
  log(`📺 ${videos.length} video elementi bulundu`);
  
  let bestVideo = null;
  let highestScore = 0;
  
  // Her video için skor hesapla ve en iyisini seç
  for (const video of videos) {
    try {
      const score = calculateVideoScore(video);
      log(`📊 Video skoru: ${score}`, {
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        readyState: video.readyState,
        dimensions: `${video.videoWidth}x${video.videoHeight}`,
        visible: isVideoVisible(video)
      });
      
      if (score > highestScore && score > 500) { // Minimum threshold eklendi
        highestScore = score;
        bestVideo = video;
      }
    } catch (error) {
      log(`⚠️ Video skorlama hatası:`, error);
    }
  }
  
  if (bestVideo) {
    const endTime = performance.now();
    log(`✅ En uygun video seçildi (${(endTime - startTime).toFixed(1)}ms):`, {
      score: highestScore,
      currentTime: bestVideo.currentTime,
      duration: bestVideo.duration,
      paused: bestVideo.paused,
      readyState: bestVideo.readyState
    });
    
    contentScriptState.currentVideo = bestVideo;
    setupVideoEventListeners(bestVideo);
  } else {
    log("❌ Uygun video bulunamadı");
  }
  
  return bestVideo;
}

// Video skorlama sistemi - kapsamlı
function calculateVideoScore(video) {
  let score = 0;
  
  try {
    // 1. Temel gereksinimler
    if (!video || video.readyState < 1) {
      return 0; // Hiç puan verme
    }
    
    // 2. Oynatılma durumu (en yüksek puan)
    if (!video.paused && video.currentTime > 0 && video.readyState >= 3) {
      score += 3000; // Çok yüksek puan
    } else if (video.currentTime > 0) {
      score += 1500; // Yine yüksek ama biraz daha az
    }
    
    // 3. Hazırlık durumu
    if (video.readyState >= 3) { // HAVE_FUTURE_DATA veya üzeri
      score += 800;
    } else if (video.readyState >= 2) { // HAVE_CURRENT_DATA
      score += 400;
    }
    
    // 4. Video boyutları ve görünürlük
    const rect = video.getBoundingClientRect();
    if (rect.width > 200 && rect.height > 150) {
      score += 600;
      
      // Viewport içinde görünürlük kontrolü
      if (isVideoVisible(video)) {
        score += 400;
      }
    }
    
    // 5. Video süresi
    if (video.duration && video.duration > 10) {
      score += 300;
      
      // Uzun videolar için bonus
      if (video.duration > 60) {
        score += 200;
      }
    }
    
    // 6. Ses durumu
    if (!video.muted && video.volume > 0) {
      score += 150;
    }
    
    // 7. Platform özel bonuslar
    const playerType = detectPlayerType();
    if (isMainPlayerVideo(video, playerType)) {
      score += 1000; // Çok yüksek platform bonusu
    }
    
    // 8. Z-index ve CSS görünürlük
    const computedStyle = window.getComputedStyle(video);
    if (computedStyle.visibility === 'visible' && computedStyle.display !== 'none') {
      score += 200;
    }
    
    // 9. Video kaynağı var mı
    if (video.src || video.currentSrc || video.querySelectorAll('source').length > 0) {
      score += 300;
    }
    
  } catch (error) {
    log(`⚠️ Skorlama hatası:`, error);
    return 0;
  }
  
  return score;
}

// Video görünürlük kontrolü
function isVideoVisible(video) {
  try {
    const rect = video.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Viewport içinde mi?
    const inViewport = (
      rect.top < viewportHeight &&
      rect.bottom > 0 &&
      rect.left < viewportWidth &&
      rect.right > 0
    );
    
    if (!inViewport) return false;
    
    // CSS görünürlük
    const style = window.getComputedStyle(video);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Video event listener'ları kurma
function setupVideoEventListeners(video) {
  // Mevcut listener'ları temizle
  video.removeEventListener('timeupdate', onVideoTimeUpdate);
  video.removeEventListener('play', onVideoStateChange);
  video.removeEventListener('pause', onVideoStateChange);
  video.removeEventListener('seeked', onVideoStateChange);
  
  // Yeni listener'ları ekle
  video.addEventListener('timeupdate', onVideoTimeUpdate);
  video.addEventListener('play', onVideoStateChange);
  video.addEventListener('pause', onVideoStateChange);
  video.addEventListener('seeked', onVideoStateChange);
  
  log("🎧 Video event listener'ları kuruldu");
}

function onVideoTimeUpdate(event) {
  // Throttle updates to prevent spam
  const now = Date.now();
  if (now - contentScriptState.lastVideoCheck < 500) {
    return;
  }
  contentScriptState.lastVideoCheck = now;
}

function onVideoStateChange(event) {
  const video = event.target;
  log(`🎬 Video durum değişikliği: ${event.type}`, {
    currentTime: video.currentTime,
    paused: video.paused
  });
  
  // Background'a bildir
  try {
    chrome.runtime.sendMessage({
      action: "videoStateChanged",
      eventType: event.type,
      currentTime: video.currentTime,
      paused: video.paused,
      timestamp: Date.now()
    });
  } catch (error) {
    // Ignore errors
  }
}

// Görünür alan hesaplama
function calculateVisibleArea(rect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
  const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
  
  if (visibleWidth <= 0 || visibleHeight <= 0) {
    return 0;
  }
  
  const visibleArea = visibleWidth * visibleHeight;
  const totalArea = rect.width * rect.height;
  
  return totalArea > 0 ? visibleArea / totalArea : 0;
}

// ================== PLATFORM ALGıLAMA SİSTEMİ ==================

function detectPlayerType() {
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  
  const platforms = [
    { test: (u, h) => u.includes("youtube.com") || u.includes("youtu.be"), type: "youtube" },
    { test: (u, h) => u.includes("netflix.com"), type: "netflix" },
    { test: (u, h) => u.includes("vimeo.com"), type: "vimeo" },
    { test: (u, h) => u.includes("twitch.tv"), type: "twitch" },
    { test: (u, h) => u.includes("amazon.com/gp/video") || u.includes("primevideo.com"), type: "primevideo" },
    { test: (u, h) => u.includes("disneyplus.com"), type: "disney" },
    { test: (u, h) => u.includes("hulu.com"), type: "hulu" },
    { test: (u, h) => u.includes("hbo") || h.includes("max.com"), type: "hbo" },
    { test: (u, h) => u.includes("dailymotion.com"), type: "dailymotion" },
    { test: (u, h) => u.includes("facebook.com") || u.includes("fb.watch"), type: "facebook" },
    { test: (u, h) => u.includes("instagram.com"), type: "instagram" },
    { test: (u, h) => u.includes("tiktok.com"), type: "tiktok" }
  ];
  
  for (const platform of platforms) {
    if (platform.test(url, hostname)) {
      log(`🎯 Platform algılandı: ${platform.type}`);
      return platform.type;
    }
  }
  
  log("🔧 Generic platform");
  return "generic";
}

// Ana player video mu kontrol et - kapsamlı
function isMainPlayerVideo(video, playerType) {
  try {
    switch (playerType) {
      case "youtube":
        return video.closest('.html5-video-player') !== null ||
               video.closest('#movie_player') !== null ||
               video.id === 'video-stream' ||
               video.classList.contains('video-stream');
      
      case "netflix":
        return video.closest('.watch-video') !== null || 
               video.getAttribute('data-uia') === 'video-canvas' ||
               video.closest('.NFPlayer') !== null ||
               video.classList.contains('nf-video-player');
      
      case "vimeo":
        return video.closest('.vp-video-wrapper') !== null ||
               video.closest('.player') !== null ||
               video.classList.contains('vp-video');
      
      case "twitch":
        return video.closest('.video-player') !== null ||
               video.closest('[data-a-target="video-player"]') !== null;
      
      case "primevideo":
        return video.closest('.dv-player-fullscreen') !== null ||
               video.closest('.atvwebplayersdk-player') !== null ||
               video.closest('[data-testid="dv-web-player"]') !== null;
      
      case "disney":
        return video.closest('.btm-media-client-element') !== null ||
               video.closest('[data-testid="video-player"]') !== null;
      
      case "hulu":
        return video.closest('.video-player') !== null ||
               video.closest('[data-testid="vilos-player"]') !== null;
      
      default:
        // Genel HTML5 video kontrolleri - kapsamlı
        return video.hasAttribute('src') || 
               video.querySelectorAll('source').length > 0 ||
               video.closest('[class*="player"]') !== null ||
               video.closest('[class*="video"]') !== null ||
               video.closest('[data-testid*="player"]') !== null ||
               video.closest('[data-testid*="video"]') !== null;
    }
  } catch (error) {
    log(`⚠️ Main player kontrolü hatası:`, error);
    return false;
  }
}

// ================== MESAJ DİNLEYİCİ VE YÖNLENDİRİCİ ==================

// Chrome extension mesaj dinleyicisi
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log(`📨 Mesaj alındı:`, { action: request?.action });
  
  // Mesaj validasyonu
  if (!request || typeof request.action !== 'string') {
    log(`⚠️ Geçersiz mesaj formatı:`, request);
    sendResponse({ success: false, error: "INVALID_MESSAGE_FORMAT" });
    return false;
  }
  
  // Eğer işlem devam ediyorsa, kısa bir süre beklet
  if (contentScriptState.isProcessing) {
    setTimeout(() => {
      handleMessage(request, sendResponse);
    }, 100);
  } else {
    handleMessage(request, sendResponse);
  }
  
  return true; // Async response için
});

async function handleMessage(request, sendResponse) {
  const { action } = request;
  
  // İşlem bayrağını set et
  contentScriptState.isProcessing = true;
  
  try {
    switch (action) {
      case "ping":
        sendResponse({ 
          success: true, 
          pong: true, 
          ready: contentScriptState.isReady,
          timestamp: Date.now()
        });
        break;
        
      case "getVideoInfo":
        await handleGetVideoInfo(sendResponse);
        break;
        
      case "setVideoTime":
        await handleSetVideoTime(request, sendResponse);
        break;
        
      case "playVideo":
        await handlePlayVideo(sendResponse);
        break;
        
      case "pauseVideo":
        await handlePauseVideo(sendResponse);
        break;
        
      default:
        log(`❓ Bilinmeyen action: ${action}`);
        sendResponse({ success: false, error: "UNKNOWN_ACTION", action });
    }
  } catch (error) {
    log(`💥 Mesaj işleme hatası:`, error);
    sendResponse({ 
      success: false, 
      error: "MESSAGE_PROCESSING_ERROR", 
      details: error.message 
    });
  } finally {
    // İşlem bayrağını temizle
    setTimeout(() => {
      contentScriptState.isProcessing = false;
    }, 100);
  }
}

// ================== VİDEO BİLGİSİ ALMA ==================

async function handleGetVideoInfo(sendResponse) {
  try {
    const activeVideo = findActiveVideo();
    
    if (!activeVideo) {
      log("❌ Aktif video bulunamadı");
      sendResponse({ 
        success: false, 
        error: "NO_ACTIVE_VIDEO",
        message: "Sayfada aktif video bulunamadı",
        url: window.location.href,
        pageTitle: document.title
      });
      return;
    }
    
    // Video bilgilerini topla
    const videoInfo = {
      success: true,
      currentTime: Number(activeVideo.currentTime.toFixed(3)) || 0,
      duration: Number(activeVideo.duration.toFixed(3)) || 0,
      paused: Boolean(activeVideo.paused),
      videoUrl: window.location.href,
      pageTitle: document.title,
      playerType: detectPlayerType(),
      readyState: activeVideo.readyState,
      networkState: activeVideo.networkState,
      playbackRate: activeVideo.playbackRate || 1,
      volume: activeVideo.volume || 1,
      muted: activeVideo.muted || false,
      videoWidth: activeVideo.videoWidth || 0,
      videoHeight: activeVideo.videoHeight || 0,
      ended: activeVideo.ended || false,
      seeking: activeVideo.seeking || false,
      timestamp: Date.now()
    };
    
    log("✅ Video bilgileri toplandı:", {
      currentTime: videoInfo.currentTime,
      duration: videoInfo.duration,
      paused: videoInfo.paused,
      playerType: videoInfo.playerType,
      readyState: videoInfo.readyState
    });
    
    sendResponse(videoInfo);
    
  } catch (error) {
    log("❌ Video bilgisi alma hatası:", error);
    sendResponse({
      success: false,
      error: "GET_VIDEO_INFO_ERROR",
      details: error.message
    });
  }
}

// ================== VIDEO ZAMAN AYARLAMA - DÖNGÜ ÖNLEYİCİ İLE ==================

async function handleSetVideoTime(request, sendResponse) {
  const targetTime = parseFloat(request.currentTime);
  const now = Date.now();
  
  log(`⏭️ Video zamanı ayarlanıyor: ${targetTime}s`);
  
  try {
    // *** DÖNGÜ ÖNLEYİCİ KONTROLLER ***
    
    // 1. Şu anda seek yapılıyor mu kontrol et
    if (contentScriptState.isSeeking) {
      log("🚫 Zaten seek yapılıyor, istek reddediliyor");
      sendResponse({ 
        success: false, 
        error: "SEEK_IN_PROGRESS",
        message: "Seek zaten devam ediyor"
      });
      return;
    }
    
    // 2. Cooldown period kontrol et
    if (now - contentScriptState.lastSeekTime < contentScriptState.seekCooldown) {
      const remainingCooldown = contentScriptState.seekCooldown - (now - contentScriptState.lastSeekTime);
      log(`⏳ Seek cooldown aktif, ${remainingCooldown}ms kaldı`);
      sendResponse({ 
        success: false, 
        error: "SEEK_COOLDOWN",
        message: `Seek cooldown aktif`,
        remainingMs: remainingCooldown
      });
      return;
    }
    
    // 3. Hedef zaman validasyonu
    if (isNaN(targetTime) || targetTime < 0) {
      sendResponse({ 
        success: false, 
        error: "INVALID_TIME_VALUE",
        message: "Geçersiz zaman değeri"
      });
      return;
    }
    
    const activeVideo = findActiveVideo();
    if (!activeVideo) {
      sendResponse({ 
        success: false, 
        error: "NO_ACTIVE_VIDEO",
        message: "Video bulunamadı" 
      });
      return;
    }
    
    // 4. Seek'in gerçekten gerekli olup olmadığını kontrol et
    const currentTime = activeVideo.currentTime;
    const timeDiff = Math.abs(currentTime - targetTime);
    
    if (timeDiff < contentScriptState.seekThreshold) {
      log(`✅ Zaman farkı çok küçük (${timeDiff.toFixed(2)}s), seek gerekli değil`);
      sendResponse({
        success: true,
        message: "Zaman zaten senkronize",
        targetTime: targetTime,
        actualTime: currentTime,
        timeDifference: timeDiff,
        skipped: true
      });
      return;
    }
    
    // *** KORUNMALI SEEK İŞLEMİ GERÇEKLEŞTİR ***
    
    contentScriptState.isSeeking = true;
    contentScriptState.lastSeekTime = now;
    
    log(`🎯 Seek yapılıyor: ${currentTime.toFixed(2)}s → ${targetTime.toFixed(2)}s (fark: ${timeDiff.toFixed(2)}s)`);
    
    const success = await performSetTime(activeVideo, targetTime);
    
    // Seek'in tamamlanması için bekle
    await sleep(CONTENT_CONFIG.STATE_CHECK_DELAY);
    
    const finalTime = activeVideo.currentTime;
    const finalDiff = Math.abs(finalTime - targetTime);
    
    log(`⏱️ Seek sonucu:`, {
      target: targetTime,
      actual: finalTime,
      diff: finalDiff,
      success: success && finalDiff < 3
    });
    
    sendResponse({
      success: success && finalDiff < 3,
      message: success ? "Video zamanı ayarlandı" : "Video zamanı ayarlanamadı",
      targetTime: targetTime,
      actualTime: finalTime,
      timeDifference: finalDiff,
      playerType: detectPlayerType()
    });
    
  } catch (error) {
    log("❌ Video zaman ayarlama hatası:", error);
    sendResponse({
      success: false,
      error: "SET_TIME_ERROR",
      details: error.message
    });
  } finally {
    // Her zaman seeking flag'ini temizle
    setTimeout(() => {
      contentScriptState.isSeeking = false;
    }, 1000);
  }
}

// Zaman ayarlama işlemi
async function performSetTime(video, targetTime) {
  const playerType = detectPlayerType();
  
  try {
    // Platform özel zaman ayarlama dene
    const platformSuccess = await tryPlatformSpecificSeek(playerType, targetTime, video);
    if (platformSuccess) {
      log("✅ Platform özel seek başarılı");
      return true;
    }
    
    // Fallback: Doğrudan video elementi
    return await tryDirectVideoSeek(video, targetTime);
    
  } catch (error) {
    log("❌ Zaman ayarlama hatası:", error);
    return false;
  }
}

// Platform özel seek işlemi
async function tryPlatformSpecificSeek(playerType, targetTime, video) {
  try {
    switch (playerType) {
      case "youtube":
        return await handleYouTubeSeek(targetTime);
      case "netflix":
        return await handleNetflixSeek(targetTime, video);
      case "vimeo":
        return await handleVimeoSeek(targetTime);
      default:
        return false;
    }
  } catch (error) {
    log(`❌ Platform özel seek hatası (${playerType}):`, error);
    return false;
  }
}

// YouTube özel seek
async function handleYouTubeSeek(targetTime) {
  // YouTube Player API denemesi
  if (window.ytplayer && typeof window.ytplayer.seekTo === 'function') {
    try {
      window.ytplayer.seekTo(targetTime, true);
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ YouTube API seek başarılı");
      return true;
    } catch (error) {
      log("⚠️ YouTube API seek hatası:", error);
    }
  }
  
  // YouTube internal player API denemesi
  if (window.yt && window.yt.player && window.yt.player.getPlayerByElement) {
    try {
      const playerElement = document.querySelector('#movie_player');
      if (playerElement) {
        const player = window.yt.player.getPlayerByElement(playerElement);
        if (player && typeof player.seekTo === 'function') {
          player.seekTo(targetTime, true);
          await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
          log("✅ YouTube internal API seek başarılı");
          return true;
        }
      }
    } catch (error) {
      log("⚠️ YouTube internal API seek hatası:", error);
    }
  }
  
  return false;
}

// Netflix özel seek
async function handleNetflixSeek(targetTime, video) {
  if (!video || !video.duration) return false;
  
  try {
    // Progress bar kontrolü - kapsamlı
    const progressSelectors = [
      '.scrubber-bar',
      '.progress-bar',
      '[data-uia="progress-bar"]',
      '.timeline-scrubber-bar'
    ];
    
    for (const selector of progressSelectors) {
      const progressBar = document.querySelector(selector);
      if (progressBar) {
        const percentage = targetTime / video.duration;
        const rect = progressBar.getBoundingClientRect();
        const clickX = rect.left + (rect.width * percentage);
        
        // Click event simülasyonu
        const clickEvent = new MouseEvent('click', {
          clientX: clickX,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          cancelable: true
        });
        
        progressBar.dispatchEvent(clickEvent);
        await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
        
        log("✅ Netflix progress bar seek başarılı");
        return true;
      }
    }
  } catch (error) {
    log("⚠️ Netflix seek hatası:", error);
  }
  
  return false;
}

// Vimeo özel seek
async function handleVimeoSeek(targetTime) {
  // Vimeo player API denemesi
  if (window.Vimeo && window.Vimeo.Player) {
    try {
      const iframe = document.querySelector('iframe[src*="vimeo"]');
      if (iframe) {
        const player = new window.Vimeo.Player(iframe);
        await player.setCurrentTime(targetTime);
        log("✅ Vimeo API seek başarılı");
        return true;
      }
    } catch (error) {
      log("⚠️ Vimeo API seek hatası:", error);
    }
  }
  
  return false;
}

// Doğrudan video seek
async function tryDirectVideoSeek(video, targetTime) {
  try {
    const wasPlaying = !video.paused;
    const originalTime = video.currentTime;
    
    log(`🎯 Doğrudan seek: ${originalTime.toFixed(2)}s → ${targetTime.toFixed(2)}s`);
    
    // Seeking event listener ekle
    let seekingResolved = false;
    const seekingPromise = new Promise((resolve) => {
      const onSeeked = () => {
        if (!seekingResolved) {
          seekingResolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve(true);
        }
      };
      
      video.addEventListener('seeked', onSeeked);
      
      // Timeout ekle
      setTimeout(() => {
        if (!seekingResolved) {
          seekingResolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve(false);
        }
      }, CONTENT_CONFIG.ACTION_TIMEOUT);
    });
    
    // Zaman ayarla
    video.currentTime = targetTime;
    
    // Seeking'in tamamlanmasını bekle
    const seekSuccess = await seekingPromise;
    
    // Oynatmaya devam et (eğer oynatılıyorsa)
    if (wasPlaying && video.paused) {
      setTimeout(() => {
        if (video.paused) {
          video.play().catch(error => {
            log("⚠️ Seek sonrası play hatası:", error);
          });
        }
      }, 200);
    }
    
    log(`${seekSuccess ? '✅' : '❌'} Doğrudan seek sonucu: ${video.currentTime.toFixed(2)}s`);
    return seekSuccess;
    
  } catch (error) {
    log("❌ Doğrudan seek hatası:", error);
    return false;
  }
}

// ================== VIDEO OYNATMA ==================

async function handlePlayVideo(sendResponse) {
  log("▶️ Video oynatma işlemi başlatılıyor...");
  
  try {
    const activeVideo = findActiveVideo();
    if (!activeVideo) {
      sendResponse({ 
        success: false, 
        error: "NO_ACTIVE_VIDEO",
        message: "Aktif video bulunamadı" 
      });
      return;
    }
    
    log(`📊 Mevcut durum:`, {
      paused: activeVideo.paused,
      currentTime: activeVideo.currentTime,
      readyState: activeVideo.readyState
    });
    
    // Eğer zaten oynatılıyorsa
    if (!activeVideo.paused) {
      log("✅ Video zaten oynatılıyor");
      sendResponse({
        success: true,
        message: "Video zaten oynatılıyor",
        wasPaused: false,
        currentTime: activeVideo.currentTime
      });
      return;
    }
    
    // Play işlemini gerçekleştir
    const success = await performPlayAction(activeVideo);
    
    // Sonuç kontrolü
    await sleep(CONTENT_CONFIG.STATE_CHECK_DELAY);
    const finalState = !activeVideo.paused;
    
    log(`🎬 Play işlemi sonucu:`, {
      actionSuccess: success,
      finalPlaying: finalState,
      currentTime: activeVideo.currentTime
    });
    
    sendResponse({
      success: success && finalState,
      message: success && finalState ? "Video oynatma başarılı" : "Video oynatma başarısız",
      wasPaused: true,
      currentPlaying: finalState,
      currentTime: activeVideo.currentTime,
      playerType: detectPlayerType()
    });
    
  } catch (error) {
    log("❌ Video oynatma hatası:", error);
    sendResponse({
      success: false,
      error: "PLAY_VIDEO_ERROR",
      details: error.message
    });
  }
}

// Play aksiyonu gerçekleştir
async function performPlayAction(video) {
  const playerType = detectPlayerType();
  
  try {
    // Platform özel play dene
    const platformSuccess = await tryPlatformSpecificPlay(playerType);
    if (platformSuccess) {
      log("✅ Platform özel play başarılı");
      return true;
    }
    
    // Fallback: Doğrudan video elementi
    return await tryDirectVideoPlay(video);
    
  } catch (error) {
    log("❌ Play aksiyonu hatası:", error);
    return false;
  }
}

// Platform özel play işlemi
async function tryPlatformSpecificPlay(playerType) {
  try {
    switch (playerType) {
      case "youtube":
        return await handleYouTubePlay();
      case "netflix":
        return await handleNetflixPlay();
      case "vimeo":
        return await handleVimeoPlay();
      case "twitch":
        return await handleTwitchPlay();
      case "primevideo":
        return await handlePrimeVideoPlay();
      case "disney":
        return await handleDisneyPlay();
      case "hulu":
        return await handleHuluPlay();
      default:
        return false;
    }
  } catch (error) {
    log(`❌ Platform özel play hatası (${playerType}):`, error);
    return false;
  }
}

// YouTube özel play
async function handleYouTubePlay() {
  // YouTube Player API denemesi
  if (window.ytplayer && typeof window.ytplayer.playVideo === 'function') {
    try {
      window.ytplayer.playVideo();
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ YouTube API play başarılı");
      return true;
    } catch (error) {
      log("⚠️ YouTube API play hatası:", error);
    }
  }
  
  // Button kontrolü - kapsamlı
  const playSelectors = [
    '.ytp-play-button[aria-label*="Play"], .ytp-play-button[title*="Play"]',
    '.ytp-play-button[aria-label*="Oynat"], .ytp-play-button[title*="Oynat"]',
    '.ytp-large-play-button',
    'button[aria-label*="Play"]',
    '.html5-video-player .ytp-play-button'
  ];
  
  for (const selector of playSelectors) {
    const button = document.querySelector(selector);
    if (button) {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const title = button.getAttribute('title') || '';
      
      if (ariaLabel.toLowerCase().includes('play') || 
          ariaLabel.includes('Oynat') ||
          title.toLowerCase().includes('play') ||
          title.includes('Oynat')) {
        
        button.click();
        await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
        log("✅ YouTube button play başarılı");
        return true;
      }
    }
  }
  
  // Klavye kısayolu denemesi
  try {
    const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (playerContainer) {
      playerContainer.focus();
      playerContainer.dispatchEvent(new KeyboardEvent('keydown', { 
        code: 'Space', 
        key: ' ', 
        bubbles: true,
        cancelable: true
      }));
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ YouTube keyboard play başarılı");
      return true;
    }
  } catch (error) {
    log("⚠️ YouTube keyboard play hatası:", error);
  }
  
  return false;
}

// Netflix özel play
async function handleNetflixPlay() {
  const playSelectors = [
    '[data-uia="control-play-pause-play"]',
    '.button-nfplayerPlay',
    '[aria-label*="Play"]',
    'button[data-uia*="play"]',
    '.watch-video button[aria-label*="Play"]'
  ];
  
  for (const selector of playSelectors) {
    const button = document.querySelector(selector);
    if (button) {
      button.click();
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log(`✅ Netflix button play başarılı: ${selector}`);
      return true;
    }
  }
  
  // Klavye kısayolu denemesi
  try {
    const videoContainer = document.querySelector('.watch-video') || document.querySelector('.NFPlayer');
    if (videoContainer) {
      videoContainer.dispatchEvent(new KeyboardEvent('keydown', { 
        code: 'Space', 
        key: ' ',
        bubbles: true,
        cancelable: true
      }));
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ Netflix keyboard play başarılı");
      return true;
    }
  } catch (error) {
    log("⚠️ Netflix keyboard play hatası:", error);
  }
  
  return false;
}

// Diğer platformlar için play fonksiyonları
async function handleVimeoPlay() {
  const selectors = ['.vp-overlay-play-button', '.play', 'button[aria-label*="Play"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handleTwitchPlay() {
  const selectors = ['[data-a-target="player-play-pause-button"]', 'button[aria-label*="Play"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handlePrimeVideoPlay() {
  const selectors = ['[data-testid="play-pause-button"]', 'button[aria-label*="Play"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handleDisneyPlay() {
  const selectors = ['button[data-testid="play-pause-button"]', 'button[aria-label*="Play"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handleHuluPlay() {
  const selectors = ['button[data-automation-id="play-pause-button"]', 'button[aria-label*="Play"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

// Doğrudan video play
async function tryDirectVideoPlay(video) {
  try {
    if (!video.paused) {
      log("✅ Video zaten oynatılıyor");
      return true;
    }
    
    log("🎬 Doğrudan video.play() çağrılıyor");
    
    // Play promise'i await et
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      await playPromise;
      log("✅ Doğrudan video.play() promise başarılı");
    } else {
      log("✅ Doğrudan video.play() başarılı (promise yok)");
    }
    
    return true;
    
  } catch (error) {
    log("❌ Doğrudan video.play() hatası:", error);
    return false;
  }
}

// ================== VIDEO DURAKLAMA ==================

async function handlePauseVideo(sendResponse) {
  log("⏸️ Video duraklama işlemi başlatılıyor...");
  
  try {
    const activeVideo = findActiveVideo();
    if (!activeVideo) {
      sendResponse({ 
        success: false, 
        error: "NO_ACTIVE_VIDEO",
        message: "Aktif video bulunamadı" 
      });
      return;
    }
    
    log(`📊 Mevcut durum:`, {
      paused: activeVideo.paused,
      currentTime: activeVideo.currentTime,
      readyState: activeVideo.readyState
    });
    
    // Eğer zaten duraklatılmışsa
    if (activeVideo.paused) {
      log("✅ Video zaten duraklatılmış");
      sendResponse({
        success: true,
        message: "Video zaten duraklatılmış",
        wasPlaying: false,
        currentTime: activeVideo.currentTime
      });
      return;
    }
    
    // Pause işlemini gerçekleştir
    const success = await performPauseAction(activeVideo);
    
    // Sonuç kontrolü
    await sleep(CONTENT_CONFIG.STATE_CHECK_DELAY);
    const finalState = activeVideo.paused;
    
    log(`⏸️ Pause işlemi sonucu:`, {
      actionSuccess: success,
      finalPaused: finalState,
      currentTime: activeVideo.currentTime
    });
    
    sendResponse({
      success: success && finalState,
      message: success && finalState ? "Video duraklama başarılı" : "Video duraklama başarısız",
      wasPlaying: true,
      currentPaused: finalState,
      currentTime: activeVideo.currentTime,
      playerType: detectPlayerType()
    });
    
  } catch (error) {
    log("❌ Video duraklama hatası:", error);
    sendResponse({
      success: false,
      error: "PAUSE_VIDEO_ERROR",
      details: error.message
    });
  }
}

// Pause aksiyonu gerçekleştir
async function performPauseAction(video) {
  const playerType = detectPlayerType();
  
  try {
    // Platform özel pause dene
    const platformSuccess = await tryPlatformSpecificPause(playerType);
    if (platformSuccess) {
      log("✅ Platform özel pause başarılı");
      return true;
    }
    
    // Fallback: Doğrudan video elementi
    return tryDirectVideoPause(video);
    
  } catch (error) {
    log("❌ Pause aksiyonu hatası:", error);
    return false;
  }
}

// Platform özel pause işlemi
async function tryPlatformSpecificPause(playerType) {
  try {
    switch (playerType) {
      case "youtube":
        return await handleYouTubePause();
      case "netflix":
        return await handleNetflixPause();
      case "vimeo":
        return await handleVimeoPause();
      case "twitch":
        return await handleTwitchPause();
      case "primevideo":
        return await handlePrimeVideoPause();
      case "disney":
        return await handleDisneyPause();
      case "hulu":
        return await handleHuluPause();
      default:
        return false;
    }
  } catch (error) {
    log(`❌ Platform özel pause hatası (${playerType}):`, error);
    return false;
  }
}

// YouTube özel pause
async function handleYouTubePause() {
  // YouTube Player API denemesi
  if (window.ytplayer && typeof window.ytplayer.pauseVideo === 'function') {
    try {
      window.ytplayer.pauseVideo();
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ YouTube API pause başarılı");
      return true;
    } catch (error) {
      log("⚠️ YouTube API pause hatası:", error);
    }
  }
  
  // Button kontrolü
  const pauseSelectors = [
    '.ytp-play-button[aria-label*="Pause"], .ytp-play-button[title*="Pause"]',
    '.ytp-play-button[aria-label*="Duraklat"], .ytp-play-button[title*="Duraklat"]',
    'button[aria-label*="Pause"]',
    '.html5-video-player .ytp-play-button'
  ];
  
  for (const selector of pauseSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const title = button.getAttribute('title') || '';
      
      if (ariaLabel.toLowerCase().includes('pause') || 
          ariaLabel.includes('Duraklat') ||
          title.toLowerCase().includes('pause') ||
          title.includes('Duraklat')) {
        
        button.click();
        await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
        log("✅ YouTube button pause başarılı");
        return true;
      }
    }
  }
  
  // Klavye kısayolu denemesi
  try {
    const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (playerContainer) {
      playerContainer.focus();
      playerContainer.dispatchEvent(new KeyboardEvent('keydown', { 
        code: 'Space', 
        key: ' ', 
        bubbles: true,
        cancelable: true
      }));
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ YouTube keyboard pause başarılı");
      return true;
    }
  } catch (error) {
    log("⚠️ YouTube keyboard pause hatası:", error);
  }
  
  return false;
}

// Netflix özel pause
async function handleNetflixPause() {
  const pauseSelectors = [
    '[data-uia="control-play-pause-pause"]',
    '.button-nfplayerPause',
    '[aria-label*="Pause"]',
    'button[data-uia*="pause"]',
    '.watch-video button[aria-label*="Pause"]'
  ];
  
  for (const selector of pauseSelectors) {
    const button = document.querySelector(selector);
    if (button) {
      button.click();
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log(`✅ Netflix button pause başarılı: ${selector}`);
      return true;
    }
  }
  
  // Klavye kısayolu denemesi
  try {
    const videoContainer = document.querySelector('.watch-video') || document.querySelector('.NFPlayer');
    if (videoContainer) {
      videoContainer.dispatchEvent(new KeyboardEvent('keydown', { 
        code: 'Space', 
        key: ' ',
        bubbles: true,
        cancelable: true
      }));
      await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
      log("✅ Netflix keyboard pause başarılı");
      return true;
    }
  } catch (error) {
    log("⚠️ Netflix keyboard pause hatası:", error);
  }
  
  // K tuşu denemesi (Netflix shortcut)
  try {
    document.dispatchEvent(new KeyboardEvent('keydown', { 
      code: 'KeyK', 
      key: 'k',
      bubbles: true,
      cancelable: true
    }));
    await sleep(CONTENT_CONFIG.PLATFORM_WAIT);
    log("✅ Netflix K key pause başarılı");
    return true;
  } catch (error) {
    log("⚠️ Netflix K key pause hatası:", error);
  }
  
  return false;
}

// Diğer platformlar için pause fonksiyonları
async function handleVimeoPause() {
  const selectors = ['.pause', 'button[aria-label*="Pause"]', '.vp-controls .pause'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handleTwitchPause() {
  const selectors = ['[data-a-target="player-play-pause-button"]', 'button[aria-label*="Pause"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handlePrimeVideoPause() {
  const selectors = ['[data-testid="play-pause-button"]', 'button[aria-label*="Pause"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handleDisneyPause() {
  const selectors = ['button[data-testid="play-pause-button"]', 'button[aria-label*="Pause"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

async function handleHuluPause() {
  const selectors = ['button[data-automation-id="play-pause-button"]', 'button[aria-label*="Pause"]'];
  return await trySelectorsClick(selectors, CONTENT_CONFIG.PLATFORM_WAIT);
}

// Doğrudan video pause
function tryDirectVideoPause(video) {
  try {
    if (video.paused) {
      log("✅ Video zaten duraklatılmış");
      return true;
    }
    
    log("⏸️ Doğrudan video.pause() çağrılıyor");
    video.pause();
    
    log("✅ Doğrudan video.pause() başarılı");
    return true;
    
  } catch (error) {
    log("❌ Doğrudan video.pause() hatası:", error);
    return false;
  }
}

// ================== YARDIMCI FONKSİYONLAR ==================

// Selector denemesi için yardımcı fonksiyon
async function trySelectorsClick(selectors, delay = CONTENT_CONFIG.PLATFORM_WAIT) {
  for (const selector of selectors) {
    try {
      const button = document.querySelector(selector);
      if (button) {
        button.click();
        await sleep(delay);
        log(`✅ Selector click başarılı: ${selector}`);
        return true;
      }
    } catch (error) {
      log(`⚠️ Selector click hatası (${selector}):`, error);
    }
  }
  return false;
}

// Sleep fonksiyonu
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ================== İNİTİALİZATİON VE CLEANUP ==================

// Content script başlatma
function initializeContentScript() {
  log("🚀 İçerik betiği başlatılıyor...");
  
  // Script durumunu ayarla
  contentScriptState.isReady = true;
  contentScriptState.lastVideoCheck = Date.now();
  
  // URL değişikliklerini izle
  setupUrlObserver();
  
  // Video değişikliklerini izle
  setupVideoObserver();
  
  // Sayfa yüklendiğinde video kontrol et
  setTimeout(() => {
    const video = findActiveVideo();
    if (video) {
      log("✅ Başlangıçta video bulundu:", {
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        playerType: detectPlayerType()
      });
    } else {
      log("⚠️ Başlangıçta video bulunamadı");
    }
  }, 2000);
  
  log("✅ İçerik betiği hazır");
}

// URL değişikliklerini izle (SPA'lar için)
function setupUrlObserver() {
  let currentUrl = window.location.href;
  
  contentScriptState.urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      log("🔄 URL değişti:", currentUrl);
      
      // Video önbelleğini temizle
      contentScriptState.currentVideo = null;
      
      // Kısa bir gecikme sonrası video kontrol et
      setTimeout(() => {
        const video = findActiveVideo();
        if (video) {
          log("✅ URL değişikliği sonrası video bulundu");
        }
      }, 1500);
    }
  });
  
  if (document.body) {
    contentScriptState.urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Video değişikliklerini izle
function setupVideoObserver() {
  contentScriptState.videoObserver = new MutationObserver(() => {
    // Periyodik kontrol (çok sık tetiklenmesini önle)
    const now = Date.now();
    if (now - contentScriptState.lastVideoCheck > CONTENT_CONFIG.VIDEO_CHECK_INTERVAL) {
      contentScriptState.lastVideoCheck = now;
      contentScriptState.currentVideo = null; // Cache'i temizle
    }
  });
  
  if (document.body) {
    contentScriptState.videoObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'currentTime', 'paused']
    });
  }
}

// Cleanup fonksiyonu
function cleanup() {
  log("🧹 Temizlik yapılıyor...");
  
  if (contentScriptState.urlObserver) {
    contentScriptState.urlObserver.disconnect();
    contentScriptState.urlObserver = null;
  }
  
  if (contentScriptState.videoObserver) {
    contentScriptState.videoObserver.disconnect();
    contentScriptState.videoObserver = null;
  }
  
  contentScriptState.isReady = false;
  contentScriptState.currentVideo = null;
}

// Sayfa kapatıldığında cleanup
window.addEventListener('beforeunload', cleanup);

// ================== BAŞLATMA ==================

// Content script'i başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

log("🎬 Tamamen tamir edilmiş video kontrol sistemi yüklendi ve hazır!");