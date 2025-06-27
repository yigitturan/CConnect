// ================== GELİŞMİŞ SERVICE WORKER - TAMAMEN EKSİKSİZ VERSİYON ==================
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
  CONTENT_SCRIPT_TIMEOUT: 5000,
  VIDEO_OPERATION_TIMEOUT: 8000,
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
      // Ping test
      case "ping":
        console.log("[SW] 📡 Ping alındı");
        sendResponse({ success: true, pong: true, timestamp: Date.now() });
        break;
        
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
        
      // Bilinmeyen action
      default:
        console.warn(`[SW] ❓ Bilinmeyen action: ${action}`);
        sendResponse({ success: false, error: "UNKNOWN_ACTION", action });
    }
    
  } catch (error) {
    console.error("[SW] 💥 Mesaj işleme hatası:", error);
    serviceWorkerState.performanceMetrics.errorCount++;
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
    
    console.log(`[SW] 🎯 Aktif tab: ${activeTab.id} - ${activeTab.url}`);
    
    // Video sitesi kontrolü (isteğe bağlı)
    if (!isVideoSite(activeTab.url)) {
      console.warn(`[SW] ⚠️ Video sitesi değil: ${activeTab.url}`);
      // Yine de devam et, kullanıcı farklı bir sitede video izliyor olabilir
    }
    
    // Content script'i hazırla
    await ensureContentScript(activeTab.id);
    
    // Video bilgilerini al
    const response = await sendMessageToContentScript(activeTab.id, { 
      action: "getVideoInfo" 
    }, CONFIG.VIDEO_OPERATION_TIMEOUT);
    
    if (response && response.success) {
      console.log("[SW] ✅ Video bilgileri alındı:", {
        duration: response.duration,
        currentTime: response.currentTime,
        paused: response.paused,
        playerType: response.playerType
      });
      serviceWorkerState.performanceMetrics.videoOperations++;
    } else {
      console.warn("[SW] ⚠️ Video bilgileri alınamadı:", response);
    }
    
    sendResponse(response || { success: false, error: "NO_RESPONSE_FROM_CONTENT_SCRIPT" });
    
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
    }, CONFIG.VIDEO_OPERATION_TIMEOUT);
    
    if (response && response.success) {
      console.log(`[SW] ✅ Video zamanı ayarlandı: ${targetTime}s → ${response.actualTime}s`);
      serviceWorkerState.performanceMetrics.videoOperations++;
    } else {
      console.warn(`[SW] ⚠️ Video zaman ayarlama başarısız:`, response);
    }
    
    sendResponse(response || { success: false, error: "NO_RESPONSE_FROM_CONTENT_SCRIPT" });
    
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
  
  const response = await sendMessageToContentScript(activeTab.id, { 
    action 
  }, CONFIG.VIDEO_OPERATION_TIMEOUT);
  
  if (response && response.success) {
    serviceWorkerState.performanceMetrics.videoOperations++;
    console.log(`[SW] ✅ Video aksiyonu başarılı: ${action}`);
  } else {
    console.warn(`[SW] ⚠️ Video aksiyonu başarısız: ${action}`, response);
  }
  
  return response || { success: false, error: "NO_RESPONSE_FROM_CONTENT_SCRIPT" };
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.AUTH_TIMEOUT);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
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
    
    if (error.name === 'AbortError') {
      sendResponse({ 
        success: false, 
        error: "AUTH_TIMEOUT", 
        details: "Authentication request timed out" 
      });
    } else {
      sendResponse({ 
        success: false, 
        error: "NETWORK_ERROR", 
        details: error.message 
      });
    }
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function signInWithGoogle(accessToken) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.AUTH_TIMEOUT);
  
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${CONFIG.FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestUri: CONFIG.REDIRECT_URI,
        postBody: `access_token=${accessToken}&providerId=google.com`,
        returnSecureToken: true
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Firebase auth failed');
    }
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function saveUserData(userId, userData) {
  const dataToSave = {
    ...userData,
    lastLogin: Date.now(),
    updatedAt: Date.now()
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataToSave),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to save user data');
    }
    
    console.log("[SW] ✅ User data başarıyla kaydedildi:", userId);
    return await response.json();
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[SW] ❌ User data kaydetme hatası:", error);
    throw error;
  }
}

async function updateLastLogin(userId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}/lastLogin.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Date.now()),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn("[SW] ⚠️ Last login güncellenemedi");
    } else {
      console.log("[SW] ✅ Last login güncellendi:", userId);
    }
  } catch (error) {
    console.warn("[SW] ⚠️ Last login güncellenemedi:", error);
  }
}

async function getUserData(userId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}.json`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log("[SW] ✅ User data alındı:", userId);
      return data;
    } else {
      console.warn("[SW] ⚠️ User data bulunamadı:", userId);
      return null;
    }
  } catch (error) {
    console.warn("[SW] ⚠️ User data alınamadı:", error);
    return null;
  }
}

// ================== CONTENT SCRIPT YÖNETİMİ ==================

// Content script'in yüklendiğinden emin ol
async function ensureContentScript(tabId) {
  // Zaten enjekte edilmiş mi kontrol et
  if (serviceWorkerState.contentScriptInjected.has(tabId)) {
    console.log(`[SW] ✅ Content script zaten mevcut: tab ${tabId}`);
    return true;
  }
  
  try {
    // Ping ile kontrol et
    const pingResponse = await sendMessageToContentScript(tabId, { action: "ping" }, 2000);
    if (pingResponse && pingResponse.pong) {
      serviceWorkerState.contentScriptInjected.add(tabId);
      console.log(`[SW] ✅ Content script zaten çalışıyor: tab ${tabId}`);
      return true;
    }
  } catch (error) {
    // Script yüklenmemiş, enjekte et
    console.log(`[SW] 📝 Content script enjekte ediliyor: tab ${tabId}`);
  }
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js']
    });
    
    // Yüklenmesi için bekle
    await sleep(1000);
    
    // Ping ile test et
    const testResponse = await sendMessageToContentScript(tabId, { action: "ping" }, 3000);
    if (testResponse && testResponse.pong) {
      serviceWorkerState.contentScriptInjected.add(tabId);
      console.log(`[SW] ✅ Content script başarıyla enjekte edildi: tab ${tabId}`);
      return true;
    } else {
      throw new Error("Content script enjekte edildi ama ping başarısız");
    }
    
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
    
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
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

// ================== CLEANUP VE MAINTENANCE ==================

// Periyodik temizlik
setInterval(() => {
  // Eski tab kayıtlarını temizle
  chrome.tabs.query({}, (tabs) => {
    const activeTabs = new Set(tabs.map(tab => tab.id));
    
    for (const tabId of serviceWorkerState.contentScriptInjected) {
      if (!activeTabs.has(tabId)) {
        serviceWorkerState.contentScriptInjected.delete(tabId);
        console.log(`[SW] 🧹 Eski tab kaydı temizlendi: ${tabId}`);
      }
    }
  });
}, 2 * 60 * 1000); // 2 dakikada bir

// ================== EMERGENCY HANDLERS ==================

// Acil durum mesaj işleyicisi
chrome.runtime.onConnect.addListener((port) => {
  console.log(`[SW] 🔌 Port bağlantısı: ${port.name}`);
  
  port.onMessage.addListener((message) => {
    console.log(`[SW] 📨 Port mesajı:`, message);
    
    if (message.action === 'emergency_reset') {
      console.log("[SW] 🚨 Acil durum reset başlatılıyor...");
      
      // Content script cache'ini temizle
      serviceWorkerState.contentScriptInjected.clear();
      
      // Performans metriklerini sıfırla
      serviceWorkerState.performanceMetrics = {
        messageCount: 0,
        errorCount: 0,
        videoOperations: 0,
        authAttempts: 0,
        lastActivity: Date.now(),
        startTime: Date.now()
      };
      
      port.postMessage({ success: true, message: "Reset tamamlandı" });
    }
  });
  
  port.onDisconnect.addListener(() => {
    console.log(`[SW] 🔌 Port bağlantısı kesildi: ${port.name}`);
  });
});

// ================== EXTENSION LIFECYCLE MANAGEMENT ==================

// Extension suspend edildiğinde
chrome.runtime.onSuspend.addListener(() => {
  console.log("[SW] 😴 Service worker suspend ediliyor...");
  
  // Son durumu kaydet
  const finalReport = getPerformanceReport();
  console.log("[SW] 📊 Final performans raporu:", finalReport);
});

// Extension suspend cancelled edildiğinde  
chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log("[SW] 🔄 Service worker suspend iptal edildi");
  serviceWorkerState.isReady = true;
});

// ================== MESSAGE ROUTING HELPERS ==================

// Mesaj tipine göre timeout belirleme
function getTimeoutForAction(action) {
  switch (action) {
    case 'ping':
      return 1000;
    case 'getVideoInfo':
      return CONFIG.VIDEO_OPERATION_TIMEOUT;
    case 'setVideoTime':
    case 'playVideo':
    case 'pauseVideo':
      return CONFIG.VIDEO_OPERATION_TIMEOUT;
    default:
      return CONFIG.CONTENT_SCRIPT_TIMEOUT;
  }
}

// Retry mekanizması ile mesaj gönderme
async function sendMessageWithRetry(tabId, message, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeout = getTimeoutForAction(message.action);
      const response = await sendMessageToContentScript(tabId, message, timeout);
      
      console.log(`[SW] ✅ Mesaj başarılı (${attempt}. deneme): ${message.action}`);
      return response;
      
    } catch (error) {
      lastError = error;
      console.warn(`[SW] ⚠️ Mesaj başarısız (${attempt}/${maxRetries}): ${message.action}`, error.message);
      
      if (attempt < maxRetries) {
        // Content script'i yeniden enjekte etmeyi dene
        if (error.message.includes('Could not establish connection')) {
          try {
            serviceWorkerState.contentScriptInjected.delete(tabId);
            await ensureContentScript(tabId);
          } catch (injectionError) {
            console.error(`[SW] ❌ Content script re-injection başarısız:`, injectionError);
          }
        }
        
        // Exponential backoff
        await sleep(CONFIG.RETRY_DELAY * attempt);
      }
    }
  }
  
  throw lastError;
}

// ================== ADVANCED ERROR RECOVERY ==================

// Hata kurtarma mekanizması
async function attemptErrorRecovery(tabId, originalError) {
  console.log(`[SW] 🔧 Hata kurtarma başlatılıyor: tab ${tabId}`);
  
  try {
    // 1. Tab'ın hala aktif olduğunu kontrol et
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      throw new Error("Tab no longer exists");
    }
    
    // 2. Content script cache'ini temizle
    serviceWorkerState.contentScriptInjected.delete(tabId);
    
    // 3. Content script'i yeniden enjekte et
    await ensureContentScript(tabId);
    
    console.log(`[SW] ✅ Hata kurtarma başarılı: tab ${tabId}`);
    return true;
    
  } catch (recoveryError) {
    console.error(`[SW] ❌ Hata kurtarma başarısız: tab ${tabId}`, recoveryError);
    return false;
  }
}

// ================== HEALTH CHECK SYSTEM ==================

// Sistem sağlık kontrolü
async function performHealthCheck() {
  console.log("[SW] 🏥 Sistem sağlık kontrolü başlatılıyor...");
  
  const healthReport = {
    timestamp: Date.now(),
    serviceWorker: {
      status: serviceWorkerState.isReady ? 'healthy' : 'unhealthy',
      uptime: Date.now() - serviceWorkerState.performanceMetrics.startTime,
      messageCount: serviceWorkerState.performanceMetrics.messageCount,
      errorCount: serviceWorkerState.performanceMetrics.errorCount
    },
    contentScripts: {
      injectedCount: serviceWorkerState.contentScriptInjected.size,
      activeTabId: serviceWorkerState.activeTabId
    },
    issues: []
  };
  
  // Sorun tespiti
  if (serviceWorkerState.performanceMetrics.errorCount > 10) {
    healthReport.issues.push("High error count detected");
  }
  
  if (serviceWorkerState.performanceMetrics.messageCount === 0 && 
      Date.now() - serviceWorkerState.performanceMetrics.startTime > 60000) {
    healthReport.issues.push("No messages received in last minute");
  }
  
  console.log("[SW] 🏥 Sağlık raporu:", healthReport);
  return healthReport;
}

// Periyodik sağlık kontrolü
setInterval(performHealthCheck, 10 * 60 * 1000); // 10 dakikada bir

// ================== SYSTEM STATUS ==================

// Sistem durumu kontrolü
function getSystemStatus() {
  return {
    serviceWorker: {
      isReady: serviceWorkerState.isReady,
      activeTabId: serviceWorkerState.activeTabId,
      contentScriptsCount: serviceWorkerState.contentScriptInjected.size
    },
    performance: getPerformanceReport(),
    config: {
      contentScriptTimeout: CONFIG.CONTENT_SCRIPT_TIMEOUT,
      videoOperationTimeout: CONFIG.VIDEO_OPERATION_TIMEOUT,
      authTimeout: CONFIG.AUTH_TIMEOUT,
      maxRetries: CONFIG.MAX_RETRIES
    },
    supportedSites: SUPPORTED_VIDEO_SITES.length
  };
}

// Debug bilgileri için
if (typeof globalThis !== 'undefined') {
  globalThis.getServiceWorkerStatus = getSystemStatus;
  globalThis.getPerformanceReport = getPerformanceReport;
}

// ================== FINAL INITIALIZATION ==================

// Son hazırlık işlemleri
setTimeout(() => {
  console.log("[SW] 🎯 Service worker tamamen hazır!");
  
  // İlk sağlık kontrolü
  performHealthCheck();
  
  // Extension bilgilerini logla
  const extInfo = getExtensionInfo();
  console.log(`[SW] 📋 Extension: ${extInfo.name} v${extInfo.version}`);
  
}, 1000);

// Global hata yakalayıcı (son çare)
if (typeof process !== 'undefined') {
  process.on?.('uncaughtException', (error) => {
    console.error('[SW] 💥 Uncaught Exception:', error);
    serviceWorkerState.performanceMetrics.errorCount++;
  });

  process.on?.('unhandledRejection', (reason, promise) => {
    console.error('[SW] 🚫 Unhandled Rejection at:', promise, 'reason:', reason);
    serviceWorkerState.performanceMetrics.errorCount++;
  });
}

// ================== FİNAL SETUP ==================

// Service worker hazır
console.log("[SW] 🚀 CSP uyumlu service worker sistemi hazır!");
console.log("[SW] 📋 Desteklenen özellikler:");
console.log("  ✅ Gelişmiş video senkronizasyonu");
console.log("  ✅ Google OAuth entegrasyonu");
console.log("  ✅ Çoklu platform desteği");
console.log("  ✅ Firebase real-time database");
console.log("  ✅ Güvenli content script yönetimi");
console.log("  ✅ CSP uyumlu Firebase entegrasyonu");
console.log("  ✅ Comprehensive error handling");
console.log("  ✅ Video sitesi otomatik algılama");
console.log("  ✅ Timeout ve retry mekanizmaları");
console.log("  ✅ Performance monitoring");
console.log("  ✅ Health check system");
console.log("  ✅ Advanced error recovery");
console.log("  ✅ Emergency handlers");

serviceWorkerState.isReady = true;

console.log("[SW] 🚀✨ Service Worker tamamen yüklendi ve eksiksiz hale getirildi!");
console.log("[SW] 📊 Debug fonksiyonları:");
console.log("  - globalThis.getServiceWorkerStatus()");
console.log("  - globalThis.getPerformanceReport()");

// Final durum raporu
setTimeout(() => {
  const finalStatus = getSystemStatus();
  console.log("[SW] 🎉 Final sistem durumu:", finalStatus);
}, 2000);