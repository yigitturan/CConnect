// ================== GELİŞMİŞ SERVICE WORKER - TAMAMEN YENİDEN YAZILDI ==================
// Manifest V3 Service Worker - Video Senkronizasyon Extension'ı için

console.log("[SW] 🚀 Gelişmiş service worker başlatılıyor...");

// ================== YAPILANDIRMA VE SABITLER ==================

const CONFIG = {
  FIREBASE_API_KEY: "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU",
  FIREBASE_DATABASE_URL: "https://cconnectyigit-default-rtdb.firebaseio.com/",
  FIREBASE_AUTH_DOMAIN: "cconnectyigit.firebaseapp.com",
  GOOGLE_CLIENT_ID: "731610663845-lcusivrfp2viicfthssffm6kkdfih5i2.apps.googleusercontent.com",
  REDIRECT_URI: "https://ncajffobbacfcdafelncglekbkpoieem.chromiumapp.org",
  
  // Timeout ayarları
  CONTENT_SCRIPT_TIMEOUT: 1000,
  VIDEO_OPERATION_TIMEOUT: 5000,
  AUTH_TIMEOUT: 30000,
  
  // Retry ayarları
  MAX_RETRIES: 3,
  RETRY_DELAY: 500
};

// Desteklenen video siteleri
const SUPPORTED_VIDEO_SITES = [
  'youtube.com', 'youtu.be', 'netflix.com', 'vimeo.com', 'twitch.tv',
  'primevideo.com', 'amazon.com/gp/video', 'disneyplus.com', 'hulu.com',
  'hbo', 'max.com', 'dailymotion.com', 'facebook.com', 'instagram.com',
  'tiktok.com', 'video', 'watch', 'player'
];

// ================== GLOBAL DEĞIŞKENLER ==================

let serviceWorkerState = {
  isReady: false,
  activeTabId: null,
  contentScriptInjected: new Set(),
  performanceMetrics: {
    messageCount: 0,
    errorCount: 0,
    videoOperations: 0,
    authAttempts: 0,
    lastActivity: Date.now(),
    startTime: Date.now()
  }
};

// ================== SERVICE WORKER LIFECYCLE ==================

// Extension kurulduğunda
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[SW] 📦 Extension ${details.reason}:`, details);
  
  // Side panel ayarla
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log("[SW] ✅ Side panel yapılandırıldı"))
    .catch(error => console.error("[SW] ❌ Side panel hatası:", error));
  
  // İlk kurulum mesajı
  if (details.reason === 'install') {
    console.log("[SW] 🎉 İlk kurulum tamamlandı - Hoş geldiniz!");
  } else if (details.reason === 'update') {
    const oldVersion = details.previousVersion;
    const newVersion = chrome.runtime.getManifest().version;
    console.log(`[SW] 🔄 Güncelleme: ${oldVersion} → ${newVersion}`);
  }
  
  serviceWorkerState.isReady = true;
});

// Extension başlatıldığında
chrome.runtime.onStartup.addListener(() => {
  console.log("[SW] 🟢 Extension başlatıldı");
  serviceWorkerState.isReady = true;
  serviceWorkerState.startTime = Date.now();
});

// ================== GLOBAL ERROR HANDLING ==================

self.addEventListener('error', (event) => {
  console.error('[SW] 💥 Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
  serviceWorkerState.performanceMetrics.errorCount++;
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] 🚫 Unhandled Promise Rejection:', event.reason);
  serviceWorkerState.performanceMetrics.errorCount++;
  event.preventDefault();
});

// ================== MESAJ YÖNETİM SİSTEMİ ==================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Performans takibi
  serviceWorkerState.performanceMetrics.messageCount++;
  serviceWorkerState.performanceMetrics.lastActivity = Date.now();
  
  console.log(`[SW] 📨 Mesaj alındı:`, { action: message?.action, sender: sender?.tab?.id });
  
  // Mesaj validasyonu
  if (!message || typeof message.action !== 'string') {
    console.warn("[SW] ⚠️ Geçersiz mesaj formatı:", message);
    sendResponse({ success: false, error: "INVALID_MESSAGE_FORMAT" });
    return false;
  }
  
  // Mesaj routing
  handleMessage(message, sender, sendResponse);
  return true; // Async response için
});

// Ana mesaj işleyici
async function handleMessage(message, sender, sendResponse) {
  try {
    const { action } = message;
    
    switch (action) {
      // Authentication işlemleri
      case "login":
      case "signup":
        await handleAuthenticationRequest(message, sendResponse);
        break;
        
      case "googleLogin":
        await handleGoogleAuthentication(sendResponse);
        break;
        
      case "logout":
        await handleLogout(sendResponse);
        break;
      
      // Video işlemleri
      case "getVideoInfo":
        await handleGetVideoInfo(sendResponse);
        break;
        
      case "setVideoTime":
        await handleSetVideoTime(message, sendResponse);
        break;
        
      case "playVideo":
        await handlePlayVideo(sendResponse);
        break;
        
      case "pauseVideo":
        await handlePauseVideo(sendResponse);
        break;
      
      // Content script mesajları
      case "videoStateChanged":
        handleVideoStateChange(message, sendResponse);
        break;
        
      case "ping":
        sendResponse({ success: true, pong: true });
        break;
        
      // Bilinmeyen action
      default:
        console.warn(`[SW] ❓ Bilinmeyen action: ${action}`);
        sendResponse({ success: false, error: "UNKNOWN_ACTION", action });
    }
    
  } catch (error) {
    console.error("[SW] 💥 Mesaj işleme hatası:", error);
    sendResponse({ 
      success: false, 
      error: "MESSAGE_PROCESSING_ERROR", 
      details: error.message 
    });
  }
}

// ================== VIDEO İŞLEMLERİ ==================

// Video bilgilerini al
async function handleGetVideoInfo(sendResponse) {
  console.log("[SW] 📺 Video bilgileri isteniyor...");
  
  try {
    const activeTab = await getActiveTab();
    if (!activeTab) {
      sendResponse({ success: false, error: "NO_ACTIVE_TAB" });
      return;
    }
    
    // Video sitesi kontrolü
    if (!isVideoSite(activeTab.url)) {
      sendResponse({ 
        success: false, 
        error: "UNSUPPORTED_SITE",
        message: "Bu site video senkronizasyonu için desteklenmiyor",
        url: activeTab.url
      });
      return;
    }
    
    // Content script'i hazırla
    await ensureContentScript(activeTab.id);
    
    // Video bilgilerini al
    const response = await sendMessageToContentScript(activeTab.id, { action: "getVideoInfo" });
    
    if (response && response.success) {
      console.log("[SW] ✅ Video bilgileri alındı:", {
        duration: response.duration,
        currentTime: response.currentTime,
        paused: response.paused,
        playerType: response.playerType
      });
      serviceWorkerState.performanceMetrics.videoOperations++;
    }
    
    sendResponse(response);
    
  } catch (error) {
    console.error("[SW] ❌ Video bilgisi alma hatası:", error);
    sendResponse({ 
      success: false, 
      error: "VIDEO_INFO_ERROR", 
      details: error.message 
    });
  }
}

// Video zamanını ayarla
async function handleSetVideoTime(message, sendResponse) {
  const targetTime = parseFloat(message.currentTime);
  
  console.log(`[SW] ⏭️ Video zamanı ayarlanıyor: ${targetTime}s`);
  
  try {
    // Validasyon
    if (isNaN(targetTime) || targetTime < 0) {
      sendResponse({ success: false, error: "INVALID_TIME_VALUE" });
      return;
    }
    
    const activeTab = await getActiveTab();
    if (!activeTab) {
      sendResponse({ success: false, error: "NO_ACTIVE_TAB" });
      return;
    }
    
    await ensureContentScript(activeTab.id);
    
    const response = await sendMessageToContentScript(activeTab.id, {
      action: "setVideoTime",
      currentTime: targetTime
    });
    
    if (response && response.success) {
      console.log(`[SW] ✅ Video zamanı ayarlandı: ${targetTime}s`);
      serviceWorkerState.performanceMetrics.videoOperations++;
    }
    
    sendResponse(response);
    
  } catch (error) {
    console.error("[SW] ❌ Video zaman ayarlama hatası:", error);
    sendResponse({ 
      success: false, 
      error: "SET_TIME_ERROR", 
      details: error.message 
    });
  }
}

// Video oynat
async function handlePlayVideo(sendResponse) {
  console.log("[SW] ▶️ Video oynatma işlemi...");
  
  try {
    const result = await executeVideoAction("playVideo");
    sendResponse(result);
  } catch (error) {
    console.error("[SW] ❌ Video oynatma hatası:", error);
    sendResponse({ 
      success: false, 
      error: "PLAY_VIDEO_ERROR", 
      details: error.message 
    });
  }
}

// Video duraklat
async function handlePauseVideo(sendResponse) {
  console.log("[SW] ⏸️ Video duraklama işlemi...");
  
  try {
    const result = await executeVideoAction("pauseVideo");
    sendResponse(result);
  } catch (error) {
    console.error("[SW] ❌ Video duraklama hatası:", error);
    sendResponse({ 
      success: false, 
      error: "PAUSE_VIDEO_ERROR", 
      details: error.message 
    });
  }
}

// Video aksiyonu çalıştır (yardımcı fonksiyon)
async function executeVideoAction(action) {
  const activeTab = await getActiveTab();
  if (!activeTab) {
    return { success: false, error: "NO_ACTIVE_TAB" };
  }
  
  await ensureContentScript(activeTab.id);
  
  const response = await sendMessageToContentScript(activeTab.id, { action });
  
  if (response && response.success) {
    serviceWorkerState.performanceMetrics.videoOperations++;
    console.log(`[SW] ✅ Video aksiyonu başarılı: ${action}`);
  }
  
  return response;
}

// Video durum değişikliği
function handleVideoStateChange(message, sendResponse) {
  console.log("[SW] 🎬 Video durum değişikliği:", message.videoState);
  sendResponse({ success: true });
}

// ================== AUTHENTICATION İŞLEMLERİ ==================

// Normal auth (email/password)
async function handleAuthenticationRequest(message, sendResponse) {
  const { action, email, password, nickname } = message;
  
  console.log(`[SW] 🔐 ${action} işlemi başlatılıyor: ${email}`);
  serviceWorkerState.performanceMetrics.authAttempts++;
  
  try {
    // Şifre validasyonu (signup için)
    if (action === "signup") {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        sendResponse({ 
          success: false, 
          error: "PASSWORD_VALIDATION_FAILED", 
          details: passwordErrors 
        });
        return;
      }
    }
    
    // Firebase endpoint
    const isSignup = action === "signup";
    const endpoint = isSignup
      ? `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CONFIG.FIREBASE_API_KEY}`
      : `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CONFIG.FIREBASE_API_KEY}`;
    
    // Auth request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[SW] ❌ ${action} hatası:`, data.error);
      sendResponse({ 
        success: false, 
        error: data.error?.message || "AUTHENTICATION_FAILED" 
      });
      return;
    }
    
    const userId = data.localId;
    
    // Kullanıcı verisini kaydet/güncelle
    if (isSignup && nickname) {
      await saveUserData(userId, { email, nickname });
    } else if (!isSignup) {
      await updateLastLogin(userId);
    }
    
    // Kullanıcı bilgilerini al
    const userData = await getUserData(userId);
    const displayName = userData?.nickname || email.split('@')[0];
    
    console.log(`[SW] ✅ ${action} başarılı: ${displayName}`);
    sendResponse({ success: true, nickname: displayName });
    
  } catch (error) {
    console.error(`[SW] 💥 ${action} network hatası:`, error);
    sendResponse({ 
      success: false, 
      error: "NETWORK_ERROR", 
      details: error.message 
    });
  }
}

// Google authentication
async function handleGoogleAuthentication(sendResponse) {
  console.log("[SW] 🔐 Google authentication başlatılıyor...");
  serviceWorkerState.performanceMetrics.authAttempts++;
  
  try {
    const authUrl = buildGoogleAuthUrl();
    
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (redirectUrl) => {
      try {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        
        if (!redirectUrl) {
          throw new Error("Authentication cancelled");
        }
        
        // Token'ı çıkar
        const accessToken = extractAccessToken(redirectUrl);
        if (!accessToken) {
          throw new Error("No access token received");
        }
        
        // Kullanıcı bilgilerini al
        const userInfo = await fetchGoogleUserInfo(accessToken);
        
        // Firebase'e kaydet
        const firebaseData = await signInWithGoogle(accessToken);
        
        // Kullanıcı verisini kaydet
        const userId = firebaseData.localId;
        const email = firebaseData.email || userInfo.email;
        const displayName = firebaseData.displayName || userInfo.name || email.split('@')[0];
        
        await saveUserData(userId, {
          email,
          nickname: displayName,
          photoUrl: userInfo.picture,
          provider: 'google'
        });
        
        console.log("[SW] ✅ Google authentication başarılı:", displayName);
        sendResponse({ success: true, nickname: displayName });
        
      } catch (error) {
        console.error("[SW] ❌ Google auth callback hatası:", error);
        sendResponse({ 
          success: false, 
          error: "GOOGLE_AUTH_ERROR", 
          details: error.message 
        });
      }
    });
    
  } catch (error) {
    console.error("[SW] 💥 Google auth genel hatası:", error);
    sendResponse({ 
      success: false, 
      error: "GOOGLE_AUTH_SETUP_ERROR", 
      details: error.message 
    });
  }
}

// Logout
async function handleLogout(sendResponse) {
  console.log("[SW] 🚪 Logout işlemi...");
  
  try {
    // Chrome identity cache'ini temizle
    await new Promise((resolve) => {
      chrome.identity.clearAllCachedAuthTokens(resolve);
    });
    
    console.log("[SW] ✅ Logout başarılı");
    sendResponse({ success: true });
    
  } catch (error) {
    console.error("[SW] ❌ Logout hatası:", error);
    sendResponse({ 
      success: false, 
      error: "LOGOUT_ERROR", 
      details: error.message 
    });
  }
}

// ================== YARDIMCI FONKSİYONLAR - AUTH ==================

function validatePassword(password) {
  const errors = [];
  
  if (password.length < 12) errors.push("PASSWORD_TOO_SHORT");
  if (!/[A-Z]/.test(password)) errors.push("PASSWORD_NO_UPPERCASE");
  if (!/[a-z]/.test(password)) errors.push("PASSWORD_NO_LOWERCASE");
  if (!/[0-9]/.test(password)) errors.push("PASSWORD_NO_NUMBER");
  
  return errors;
}

function buildGoogleAuthUrl() {
  const params = new URLSearchParams({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    response_type: 'token',
    redirect_uri: CONFIG.REDIRECT_URI,
    scope: 'email profile'
  });
  
  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
}

function extractAccessToken(redirectUrl) {
  try {
    const url = new URL(redirectUrl);
    const params = new URLSearchParams(url.hash.substring(1));
    return params.get('access_token');
  } catch (error) {
    console.error("[SW] Token extraction hatası:", error);
    return null;
  }
}

async function fetchGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  return await response.json();
}

async function signInWithGoogle(accessToken) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${CONFIG.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestUri: CONFIG.REDIRECT_URI,
      postBody: `access_token=${accessToken}&providerId=google.com`,
      returnSecureToken: true
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Firebase auth failed');
  }
  
  return data;
}

async function saveUserData(userId, userData) {
  const dataToSave = {
    ...userData,
    lastLogin: Date.now(),
    updatedAt: Date.now()
  };
  
  const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataToSave)
  });
  
  if (!response.ok) {
    throw new Error('Failed to save user data');
  }
}

async function updateLastLogin(userId) {
  const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}/lastLogin.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Date.now())
  });
  
  if (!response.ok) {
    console.warn("[SW] ⚠️ Last login güncellenemedi");
  }
}

async function getUserData(userId) {
  try {
    const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("[SW] ⚠️ User data alınamadı:", error);
  }
  return null;
}

// ================== CONTENT SCRIPT YÖNETİMİ ==================

// Content script'in yüklendiğinden emin ol
async function ensureContentScript(tabId) {
  // Zaten enjekte edilmiş mi kontrol et
  if (serviceWorkerState.contentScriptInjected.has(tabId)) {
    return true;
  }
  
  try {
    // Ping ile kontrol et
    const pingResponse = await sendMessageToContentScript(tabId, { action: "ping" }, 1000);
    if (pingResponse && pingResponse.pong) {
      serviceWorkerState.contentScriptInjected.add(tabId);
      return true;
    }
  } catch (error) {
    // Script yüklenmemiş, enjekte et
  }
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js']
    });
    
    // Yüklenmesi için bekle
    await sleep(800);
    
    serviceWorkerState.contentScriptInjected.add(tabId);
    console.log(`[SW] ✅ Content script enjekte edildi: tab ${tabId}`);
    return true;
    
  } catch (error) {
    console.error(`[SW] ❌ Content script enjekte edilemedi: tab ${tabId}`, error);
    throw new Error(`Content script injection failed: ${error.message}`);
  }
}

// Content script'e mesaj gönder
async function sendMessageToContentScript(tabId, message, timeout = CONFIG.CONTENT_SCRIPT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Content script timeout: ${timeout}ms`));
    }, timeout);
    
    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// ================== TAB YÖNETİMİ ==================

// Aktif tab'ı al
async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      serviceWorkerState.activeTabId = tabs[0].id;
      return tabs[0];
    }
    return null;
  } catch (error) {
    console.error("[SW] ❌ Aktif tab alınamadı:", error);
    return null;
  }
}

// Video sitesi kontrolü
function isVideoSite(url) {
  if (!url) return false;
  
  const lowerUrl = url.toLowerCase();
  return SUPPORTED_VIDEO_SITES.some(site => lowerUrl.includes(site));
}

// Tab event listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Content script injection state'ini temizle
    serviceWorkerState.contentScriptInjected.delete(tabId);
    
    if (tab.url && isVideoSite(tab.url)) {
      console.log(`[SW] 📺 Video sitesi tespit edildi: ${tab.url}`);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  serviceWorkerState.contentScriptInjected.delete(tabId);
  console.log(`[SW] 🗑️ Tab kapatıldı, temizlik yapıldı: ${tabId}`);
});

// ================== UTILITY FONKSİYONLAR ==================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getExtensionInfo() {
  const manifest = chrome.runtime.getManifest();
  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description
  };
}

// ================== PERFORMANCE MONİTORİNG ==================

// Performans raporu
function getPerformanceReport() {
  const uptime = Date.now() - serviceWorkerState.performanceMetrics.startTime;
  const lastActivity = Date.now() - serviceWorkerState.performanceMetrics.lastActivity;
  
  return {
    ...serviceWorkerState.performanceMetrics,
    uptime: Math.floor(uptime / 1000),
    lastActivity: Math.floor(lastActivity / 1000),
    contentScriptsInjected: serviceWorkerState.contentScriptInjected.size,
    isReady: serviceWorkerState.isReady
  };
}

// Periyodik performans raporu (development için)
setInterval(() => {
  const report = getPerformanceReport();
  if (report.messageCount > 0) {
    console.log("[SW] 📊 Performans raporu:", report);
  }
}, 5 * 60 * 1000); // 5 dakikada bir

// ================== FİNAL SETUP ==================

// Service worker hazır
console.log("[SW] 🚀 Gelişmiş service worker sistemi hazır!");
console.log("[SW] 📋 Desteklenen özellikler:");
console.log("  ✅ Gelişmiş video senkronizasyonu");
console.log("  ✅ Google OAuth entegrasyonu");
console.log("  ✅ Çoklu platform desteği");
console.log("  ✅ Firebase real-time database");
console.log("  ✅ Güvenli content script yönetimi");
console.log("  ✅ Performans monitoring");
console.log("  ✅ Comprehensive error handling");

serviceWorkerState.isReady = true;