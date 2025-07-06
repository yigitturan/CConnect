// ================== CLEAN SERVICE WORKER - VIDEO SYNC EXTENSION ==================
// Manifest V3 Service Worker - Sıfırdan yazılmış temiz versiyon

console.log("[SW] 🚀 Video Sync Extension Service Worker başlatılıyor...");

// ================== CONFIGURATION ==================

const CONFIG = {
  // Firebase ayarları
  FIREBASE_API_KEY: "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU",
  FIREBASE_DATABASE_URL: "https://cconnectyigit-default-rtdb.firebaseio.com/",
  FIREBASE_AUTH_DOMAIN: "cconnectyigit.firebaseapp.com",
  
  // Google OAuth ayarları
  GOOGLE_CLIENT_ID: "731610663845-lcusivrfp2viicfthssffm6kkdfih5i2.apps.googleusercontent.com",
  REDIRECT_URI: "https://ncajffobbacfcdafelncglekbkpoieem.chromiumapp.org",
  
  // Timeout ayarları
  CONTENT_SCRIPT_TIMEOUT: 5000,
  VIDEO_OPERATION_TIMEOUT: 8000,
  AUTH_TIMEOUT: 15000,
  
  // Retry ayarları
  MAX_RETRIES: 3,
  RETRY_DELAY: 500
};

// Desteklenen video siteleri
const SUPPORTED_VIDEO_SITES = [
  'youtube.com', 'youtu.be', 'netflix.com', 'vimeo.com', 'twitch.tv',
  'primevideo.com', 'disneyplus.com', 'hulu.com', 'dailymotion.com'
];

// ================== GLOBAL STATE ==================

let serviceWorkerState = {
  isReady: false,
  activeTabId: null,
  contentScriptInjected: new Set(),
  performanceMetrics: {
    messageCount: 0,
    errorCount: 0,
    videoOperations: 0,
    authAttempts: 0,
    authSuccess: 0,
    authFailures: 0,
    lastActivity: Date.now(),
    startTime: Date.now()
  }
};

// ================== SERVICE WORKER LIFECYCLE ==================

// Extension kurulum
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[SW] 📦 Extension ${details.reason}`);
  
  // Side panel ayarla
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log("[SW] ✅ Side panel configured"))
    .catch(error => console.error("[SW] ❌ Side panel error:", error));
  
  serviceWorkerState.isReady = true;
});

// Extension başlatma
chrome.runtime.onStartup.addListener(() => {
  console.log("[SW] 🟢 Extension started");
  serviceWorkerState.isReady = true;
  serviceWorkerState.startTime = Date.now();
});

// ================== ERROR HANDLING ==================

// Global error handling
self.addEventListener('error', (event) => {
  console.error('[SW] 💥 Global Error:', event.error);
  serviceWorkerState.performanceMetrics.errorCount++;
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] 🚫 Unhandled Promise Rejection:', event.reason);
  serviceWorkerState.performanceMetrics.errorCount++;
  event.preventDefault();
});

// ================== MESSAGE SYSTEM ==================

// Ana mesaj listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Performance tracking
  serviceWorkerState.performanceMetrics.messageCount++;
  serviceWorkerState.performanceMetrics.lastActivity = Date.now();
  
  console.log(`[SW] 📨 Message:`, { action: message?.action });
  
  // Mesaj validasyonu
  if (!message || typeof message.action !== 'string') {
    console.warn("[SW] ⚠️ Invalid message:", message);
    sendResponse({ success: false, error: "INVALID_MESSAGE_FORMAT" });
    return false;
  }
  
  // Mesaj routing
  handleMessage(message, sender, sendResponse);
  return true; // Async response için
});

// Ana mesaj handler
async function handleMessage(message, sender, sendResponse) {
  try {
    const { action } = message;
    
    switch (action) {
      case "ping":
        sendResponse({ success: true, pong: true, timestamp: Date.now() });
        break;
        
      case "login":
      case "signup":
        await handleAuth(message, sendResponse);
        break;
        
      case "googleLogin":
        await handleGoogleAuth(sendResponse);
        break;
        
      case "logout":
        await handleLogout(sendResponse);
        break;
      
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
      
      case "videoStateChanged":
        sendResponse({ success: true });
        break;
        
      default:
        console.warn(`[SW] ❓ Unknown action: ${action}`);
        sendResponse({ success: false, error: "UNKNOWN_ACTION" });
    }
    
  } catch (error) {
    console.error("[SW] 💥 Message handling error:", error);
    serviceWorkerState.performanceMetrics.errorCount++;
    sendResponse({ 
      success: false, 
      error: "MESSAGE_PROCESSING_ERROR", 
      details: error.message 
    });
  }
}

// ================== AUTHENTICATION SYSTEM ==================

// Email/Password Authentication
async function handleAuth(message, sendResponse) {
  const { action, email, password, nickname } = message;
  
  console.log(`[SW] 🔐 ${action} başlatılıyor: ${email}`);
  serviceWorkerState.performanceMetrics.authAttempts++;
  
  try {
    // Input validation
    if (!email || !password) {
      throw new Error("EMAIL_PASSWORD_REQUIRED");
    }
    
    if (!isValidEmail(email)) {
      throw new Error("INVALID_EMAIL_FORMAT");
    }
    
    // Signup için ek validasyon
    if (action === "signup") {
      if (!nickname || nickname.trim().length < 2) {
        throw new Error("NICKNAME_REQUIRED");
      }
      
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        throw new Error("PASSWORD_VALIDATION_FAILED");
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
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password,
        returnSecureToken: true
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "UNKNOWN_AUTH_ERROR" } }));
      throw new Error(errorData.error?.message || `HTTP_${response.status}`);
    }
    
    const data = await response.json();
    const userId = data.localId;
    
    // User data işlemleri
    let displayName = email.split('@')[0];
    
    try {
      if (isSignup && nickname) {
        await saveUserData(userId, { email: email.trim(), nickname: nickname.trim() });
        displayName = nickname.trim();
      } else if (!isSignup) {
        const userData = await getUserData(userId);
        if (userData && userData.nickname) {
          displayName = userData.nickname;
        }
        await updateLastLogin(userId);
      }
    } catch (dataError) {
      console.warn("[SW] ⚠️ User data operation failed:", dataError);
    }
    
    serviceWorkerState.performanceMetrics.authSuccess++;
    console.log(`[SW] ✅ ${action} successful: ${displayName}`);
    sendResponse({ success: true, nickname: displayName });
    
  } catch (error) {
    serviceWorkerState.performanceMetrics.authFailures++;
    console.error(`[SW] ❌ ${action} error:`, error);
    
    let errorCode = error.message;
    if (error.name === 'AbortError') {
      errorCode = "AUTH_TIMEOUT";
    } else if (error.message.includes('fetch')) {
      errorCode = "NETWORK_ERROR";
    }
    
    sendResponse({ 
      success: false, 
      error: errorCode,
      details: error.message 
    });
  }
}

// Google Authentication
async function handleGoogleAuth(sendResponse) {
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
          throw new Error("AUTH_CANCELLED");
        }
        
        // Token'ı çıkar
        const accessToken = extractAccessToken(redirectUrl);
        if (!accessToken) {
          throw new Error("NO_ACCESS_TOKEN");
        }
        
        // User info al
        const userInfo = await fetchGoogleUserInfo(accessToken);
        
        // Firebase'e kaydet
        const firebaseData = await signInWithGoogle(accessToken);
        
        // User data kaydet
        const userId = firebaseData.localId;
        const email = firebaseData.email || userInfo.email;
        const displayName = firebaseData.displayName || userInfo.name || email.split('@')[0];
        
        try {
          await saveUserData(userId, {
            email,
            nickname: displayName,
            photoUrl: userInfo.picture,
            provider: 'google'
          });
        } catch (dataError) {
          console.warn("[SW] ⚠️ Google user data save failed:", dataError);
        }
        
        serviceWorkerState.performanceMetrics.authSuccess++;
        console.log("[SW] ✅ Google authentication successful:", displayName);
        sendResponse({ success: true, nickname: displayName });
        
      } catch (error) {
        serviceWorkerState.performanceMetrics.authFailures++;
        console.error("[SW] ❌ Google auth error:", error);
        sendResponse({ 
          success: false, 
          error: "GOOGLE_AUTH_ERROR", 
          details: error.message 
        });
      }
    });
    
  } catch (error) {
    serviceWorkerState.performanceMetrics.authFailures++;
    console.error("[SW] ❌ Google auth setup error:", error);
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
    await new Promise((resolve) => {
      chrome.identity.clearAllCachedAuthTokens(() => {
        if (chrome.runtime.lastError) {
          console.warn("[SW] ⚠️ Token clear warning:", chrome.runtime.lastError);
        }
        resolve();
      });
    });
    
    console.log("[SW] ✅ Logout successful");
    sendResponse({ success: true });
    
  } catch (error) {
    console.error("[SW] ❌ Logout error:", error);
    sendResponse({ 
      success: false, 
      error: "LOGOUT_ERROR", 
      details: error.message 
    });
  }
}

// ================== AUTH HELPER FUNCTIONS ==================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("PASSWORD_TOO_SHORT");
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
    scope: 'email profile',
    prompt: 'select_account'
  });
  return `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;
}

function extractAccessToken(redirectUrl) {
  try {
    const url = new URL(redirectUrl);
    const params = new URLSearchParams(url.hash.substring(1));
    return params.get('access_token');
  } catch (error) {
    console.error("[SW] Token extraction error:", error);
    return null;
  }
}

async function fetchGoogleUserInfo(accessToken) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
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
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        requestUri: CONFIG.REDIRECT_URI,
        postBody: `access_token=${accessToken}&providerId=google.com`,
        returnSecureToken: true
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "FIREBASE_GOOGLE_AUTH_FAILED" } }));
      throw new Error(errorData.error?.message || 'Firebase Google auth failed');
    }
    
    return await response.json();
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
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(dataToSave),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to save user data: ${response.status}`);
    }
    
    console.log("[SW] ✅ User data saved:", userId);
    return await response.json();
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function updateLastLogin(userId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}/lastLogin.json`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(Date.now()),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log("[SW] ✅ Last login updated:", userId);
    }
  } catch (error) {
    console.warn("[SW] ⚠️ Last login update error:", error);
  }
}

async function getUserData(userId) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${CONFIG.FIREBASE_DATABASE_URL}/users/${userId}.json`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.warn("[SW] ⚠️ User data retrieval error:", error);
    return null;
  }
}

// ================== VIDEO OPERATIONS ==================

// Video bilgilerini al
async function handleGetVideoInfo(sendResponse) {
  console.log("[SW] 📺 Video info requested...");
  
  try {
    const activeTab = await getActiveTab();
    if (!activeTab) {
      sendResponse({ success: false, error: "NO_ACTIVE_TAB" });
      return;
    }
    
    await ensureContentScript(activeTab.id);
    
    const response = await sendMessageToContentScript(activeTab.id, { 
      action: "getVideoInfo" 
    }, CONFIG.VIDEO_OPERATION_TIMEOUT);
    
    if (response && response.success) {
      serviceWorkerState.performanceMetrics.videoOperations++;
      console.log("[SW] ✅ Video info retrieved");
    } else {
      console.warn("[SW] ⚠️ Video info failed:", response);
    }
    
    sendResponse(response || { success: false, error: "NO_RESPONSE_FROM_CONTENT_SCRIPT" });
    
  } catch (error) {
    console.error("[SW] ❌ Video info error:", error);
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
  
  console.log(`[SW] ⏭️ Setting video time: ${targetTime}s`);
  
  try {
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
      serviceWorkerState.performanceMetrics.videoOperations++;
      console.log(`[SW] ✅ Video time set: ${targetTime}s`);
    }
    
    sendResponse(response || { success: false, error: "NO_RESPONSE_FROM_CONTENT_SCRIPT" });
    
  } catch (error) {
    console.error("[SW] ❌ Video time setting error:", error);
    sendResponse({ 
      success: false, 
      error: "SET_TIME_ERROR", 
      details: error.message 
    });
  }
}

// Video oynat
async function handlePlayVideo(sendResponse) {
  console.log("[SW] ▶️ Play video...");
  
  try {
    const result = await executeVideoAction("playVideo");
    sendResponse(result);
  } catch (error) {
    console.error("[SW] ❌ Play video error:", error);
    sendResponse({ 
      success: false, 
      error: "PLAY_VIDEO_ERROR", 
      details: error.message 
    });
  }
}

// Video duraklat
async function handlePauseVideo(sendResponse) {
  console.log("[SW] ⏸️ Pause video...");
  
  try {
    const result = await executeVideoAction("pauseVideo");
    sendResponse(result);
  } catch (error) {
    console.error("[SW] ❌ Pause video error:", error);
    sendResponse({ 
      success: false, 
      error: "PAUSE_VIDEO_ERROR", 
      details: error.message 
    });
  }
}

// Video aksiyonu çalıştır
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
    console.log(`[SW] ✅ Video action successful: ${action}`);
  }
  
  return response || { success: false, error: "NO_RESPONSE_FROM_CONTENT_SCRIPT" };
}

// ================== CONTENT SCRIPT MANAGEMENT ==================

// Content script'in yüklenmesini sağla
async function ensureContentScript(tabId) {
  if (serviceWorkerState.contentScriptInjected.has(tabId)) {
    return true;
  }
  
  try {
    // Ping ile test et
    const pingResponse = await sendMessageToContentScript(tabId, { action: "ping" }, 2000);
    if (pingResponse && pingResponse.pong) {
      serviceWorkerState.contentScriptInjected.add(tabId);
      console.log(`[SW] ✅ Content script already running: tab ${tabId}`);
      return true;
    }
  } catch (error) {
    console.log(`[SW] 📝 Content script injecting: tab ${tabId}`);
  }
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js']
    });
    
    await sleep(1000);
    
    const testResponse = await sendMessageToContentScript(tabId, { action: "ping" }, 3000);
    if (testResponse && testResponse.pong) {
      serviceWorkerState.contentScriptInjected.add(tabId);
      console.log(`[SW] ✅ Content script injected: tab ${tabId}`);
      return true;
    } else {
      throw new Error("Content script injected but ping failed");
    }
    
  } catch (error) {
    console.error(`[SW] ❌ Content script injection failed: tab ${tabId}`, error);
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

// ================== TAB MANAGEMENT ==================

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
    console.error("[SW] ❌ Failed to get active tab:", error);
    return null;
  }
}

// Video sitesi mi kontrol et
function isVideoSite(url) {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return SUPPORTED_VIDEO_SITES.some(site => lowerUrl.includes(site));
}

// Tab event listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    serviceWorkerState.contentScriptInjected.delete(tabId);
    
    if (tab.url && isVideoSite(tab.url)) {
      console.log(`[SW] 📺 Video site detected: ${tab.url}`);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  serviceWorkerState.contentScriptInjected.delete(tabId);
  console.log(`[SW] 🗑️ Tab closed: ${tabId}`);
});

// ================== UTILITY FUNCTIONS ==================

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

// ================== PERFORMANCE MONITORING ==================

function getPerformanceReport() {
  const uptime = Date.now() - serviceWorkerState.performanceMetrics.startTime;
  const lastActivity = Date.now() - serviceWorkerState.performanceMetrics.lastActivity;
  
  return {
    ...serviceWorkerState.performanceMetrics,
    uptime: Math.floor(uptime / 1000),
    lastActivity: Math.floor(lastActivity / 1000),
    contentScriptsInjected: serviceWorkerState.contentScriptInjected.size,
    isReady: serviceWorkerState.isReady,
    authSuccessRate: serviceWorkerState.performanceMetrics.authAttempts > 0 
      ? (serviceWorkerState.performanceMetrics.authSuccess / serviceWorkerState.performanceMetrics.authAttempts * 100).toFixed(1) + '%'
      : '0%'
  };
}

// Performance raporu (her 5 dakikada)
setInterval(() => {
  const report = getPerformanceReport();
  if (report.messageCount > 0) {
    console.log("[SW] 📊 Performance report:", report);
  }
}, 5 * 60 * 1000);

// ================== CLEANUP ==================

// Tab temizliği (her 2 dakikada)
setInterval(() => {
  chrome.tabs.query({}, (tabs) => {
    const activeTabs = new Set(tabs.map(tab => tab.id));
    
    for (const tabId of serviceWorkerState.contentScriptInjected) {
      if (!activeTabs.has(tabId)) {
        serviceWorkerState.contentScriptInjected.delete(tabId);
        console.log(`[SW] 🧹 Cleaned old tab: ${tabId}`);
      }
    }
  });
}, 2 * 60 * 1000);

// ================== HEALTH CHECK ==================

async function performHealthCheck() {
  console.log("[SW] 🏥 Health check...");
  
  const healthReport = {
    timestamp: Date.now(),
    serviceWorker: {
      status: serviceWorkerState.isReady ? 'healthy' : 'unhealthy',
      uptime: Date.now() - serviceWorkerState.performanceMetrics.startTime,
      messageCount: serviceWorkerState.performanceMetrics.messageCount,
      errorCount: serviceWorkerState.performanceMetrics.errorCount,
      authSuccessRate: serviceWorkerState.performanceMetrics.authAttempts > 0 
        ? (serviceWorkerState.performanceMetrics.authSuccess / serviceWorkerState.performanceMetrics.authAttempts * 100).toFixed(1) + '%'
        : '0%'
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
  
  if (serviceWorkerState.performanceMetrics.authFailures > serviceWorkerState.performanceMetrics.authSuccess) {
    healthReport.issues.push("Auth failure rate is high");
  }
  
  console.log("[SW] 🏥 Health report:", healthReport);
  return healthReport;
}

// Health check (her 10 dakikada)
setInterval(performHealthCheck, 10 * 60 * 1000);

// ================== SYSTEM STATUS ==================

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

// ================== DEBUG INTERFACE ==================

// Debug fonksiyonları
if (typeof globalThis !== 'undefined') {
  globalThis.serviceWorkerDebug = {
    getState: () => serviceWorkerState,
    getConfig: () => CONFIG,
    performHealthCheck,
    getSystemStatus,
    getPerformanceReport,
    clearContentScriptCache: () => {
      serviceWorkerState.contentScriptInjected.clear();
      console.log("[SW] 🧹 Content script cache cleared");
    },
    resetMetrics: () => {
      serviceWorkerState.performanceMetrics = {
        messageCount: 0,
        errorCount: 0,
        videoOperations: 0,
        authAttempts: 0,
        authSuccess: 0,
        authFailures: 0,
        lastActivity: Date.now(),
        startTime: Date.now()
      };
      console.log("[SW] 📊 Metrics reset");
    }
  };
}

// ================== EMERGENCY HANDLERS ==================

// Emergency reset handler
chrome.runtime.onConnect.addListener((port) => {
  console.log(`[SW] 🔌 Port connection: ${port.name}`);
  
  port.onMessage.addListener((message) => {
    if (message.action === 'emergency_reset') {
      console.log("[SW] 🚨 Emergency reset initiated...");
      
      // Cache'leri temizle
      serviceWorkerState.contentScriptInjected.clear();
      
      // Metrikleri sıfırla
      serviceWorkerState.performanceMetrics = {
        messageCount: 0,
        errorCount: 0,
        videoOperations: 0,
        authAttempts: 0,
        authSuccess: 0,
        authFailures: 0,
        lastActivity: Date.now(),
        startTime: Date.now()
      };
      
      port.postMessage({ success: true, message: "Reset completed" });
    }
  });
  
  port.onDisconnect.addListener(() => {
    console.log(`[SW] 🔌 Port disconnected: ${port.name}`);
  });
});

// ================== INITIALIZATION ==================

// Service worker'ı başlat
async function initializeServiceWorker() {
  console.log("[SW] 🚀 Initializing service worker...");
  
  try {
    // Ready state
    serviceWorkerState.isReady = true;
    
    // Cache'leri temizle
    serviceWorkerState.contentScriptInjected.clear();
    
    // Performance tracking başlat
    serviceWorkerState.performanceMetrics.startTime = Date.now();
    
    console.log("[SW] ✅ Service worker initialization completed");
    
  } catch (error) {
    console.error("[SW] ❌ Service worker initialization failed:", error);
    serviceWorkerState.isReady = false;
  }
}

// ================== EXTENSION LIFECYCLE ==================

// Extension suspend
chrome.runtime.onSuspend.addListener(() => {
  console.log("[SW] 😴 Service worker suspending...");
  
  const finalReport = getPerformanceReport();
  console.log("[SW] 📊 Final performance report:", finalReport);
});

// Extension suspend cancelled
chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log("[SW] 🔄 Service worker suspend cancelled");
  serviceWorkerState.isReady = true;
});

// ================== FINAL SETUP ==================

// Service worker'ı başlat
initializeServiceWorker();

// Final durum raporu
setTimeout(() => {
  const finalStatus = getSystemStatus();
  console.log("[SW] 🎉 Final system status:", finalStatus);
  
  console.log("[SW] 🚀✨ SERVICE WORKER FULLY LOADED!");
  console.log("[SW] 📋 Ready features:");
  console.log("  ✅ Email/Password Authentication");
  console.log("  ✅ Google OAuth Authentication");
  console.log("  ✅ Video Synchronization");
  console.log("  ✅ Content Script Management");
  console.log("  ✅ Firebase Integration");
  console.log("  ✅ Performance Monitoring");
  console.log("  ✅ Error Handling");
  console.log("  ✅ Health Check System");
  
}, 2000);

// Debug komutları
console.log("[SW] 🔧 Debug commands:");
console.log("  - globalThis.serviceWorkerDebug.getState()");
console.log("  - globalThis.serviceWorkerDebug.performHealthCheck()");
console.log("  - globalThis.serviceWorkerDebug.getSystemStatus()");
console.log("  - globalThis.serviceWorkerDebug.clearContentScriptCache()");
console.log("  - globalThis.serviceWorkerDebug.resetMetrics()");

// Final ready message
setTimeout(() => {
  console.log("[SW] 🎯 SERVICE WORKER TAMAMEN HAZIR!");
  console.log(`[SW] ⏰ Yükleme zamanı: ${new Date().toLocaleString('tr-TR')}`);
  console.log(`[SW] 🔢 Extension versiyon: ${chrome.runtime.getManifest().version}`);
  console.log("[SW] 🏁 Initialization complete - Ready for use!");
}, 3000);