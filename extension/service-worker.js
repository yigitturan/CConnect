// service-worker.js (Manifest V3 service worker script)

const FIREBASE_API_KEY = "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU";
const FIREBASE_DATABASE_URL = "https://cconnectyigit-default-rtdb.firebaseio.com/";

console.log("[SW] Service worker başlatıldı.");

chrome.runtime.onInstalled.addListener(() => {
    console.log("[SW] Extension yüklendi.");
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => console.log("[SidePanel] Yan panel ayarlandı."))
        .catch(error => console.error("[SidePanel] Yan panel hatası:", error));
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[SW] Mesaj alındı:", message);
    
    if (!message || !message.action) {
        console.warn("[SW] Geçersiz mesaj:", message);
        sendResponse({ success: false, error: "INVALID_MESSAGE" });
        return false;
    }

    switch (message.action) {
        case "login":
        case "signup":
            handleAuthRequest(message, sendResponse);
            return true;
            
        case "googleLogin":
            handleGoogleAuth(sendResponse);
            return true;
            
        case "logout":
            handleLogout(sendResponse);
            return false;
            
        case "getVideoInfo":
            handleGetVideoInfo(sendResponse);
            return true;
            
        case "setVideoTime":
            handleSetVideoTime(message, sendResponse);
            return true;
            
        case "playVideo":
            handlePlayVideo(sendResponse);
            return true;
            
        case "pauseVideo":
            handlePauseVideo(sendResponse);
            return true;
            
        case "videoStateChanged":
            // Content script'ten gelen video durum değişiklikleri
            console.log("[SW] Video durum değişikliği:", message.videoState);
            sendResponse({ success: true });
            return false;
            
        default:
            console.warn("[SW] Bilinmeyen action:", message.action);
            sendResponse({ success: false, error: "UNKNOWN_ACTION" });
            return false;
    }
});

// Video bilgilerini almak için aktif sekmeye mesaj gönder
async function handleGetVideoInfo(sendResponse) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            sendResponse({ success: false, error: "Aktif sekme bulunamadı" });
            return;
        }

        const activeTab = tabs[0];
        console.log("[SW] Video bilgisi alınıyor, tab:", activeTab.id);
        
        // Önce content script'i enjekte et
        try {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content-script.js']
            });
            console.log("[SW] Content script enjekte edildi");
        } catch (injectError) {
            console.log("[SW] Content script enjekte edilemedi (zaten var olabilir):", injectError.message);
        }
        
        // Kısa bir bekleme sonrası mesaj gönder
        setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, { action: "getVideoInfo" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("[SW] Content script mesaj hatası:", chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: "Video bilgisi alınamadı: " + chrome.runtime.lastError.message });
                } else {
                    console.log("[SW] Video bilgisi alındı:", response);
                    sendResponse(response || { success: false, error: "Boş yanıt" });
                }
            });
        }, 500);
        
    } catch (error) {
        console.error("[SW] Video bilgisi alma genel hatası:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Video süresini ayarlamak için aktif sekmeye mesaj gönder
async function handleSetVideoTime(message, sendResponse) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            sendResponse({ success: false, error: "Aktif sekme bulunamadı" });
            return;
        }

        const activeTab = tabs[0];
        console.log("[SW] Video süresi ayarlanıyor:", message.currentTime);
        
        // Önce content script'i enjekte et
        try {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content-script.js']
            });
        } catch (injectError) {
            console.log("[SW] Content script zaten mevcut");
        }
        
        setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, { 
                action: "setVideoTime",
                currentTime: message.currentTime
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("[SW] Video süre ayarlama hatası:", chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    console.log("[SW] Video süresi ayarlandı:", response);
                    sendResponse(response || { success: false, error: "Boş yanıt" });
                }
            });
        }, 200);
        
    } catch (error) {
        console.error("[SW] Video süre ayarlama genel hatası:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Video oynatma
async function handlePlayVideo(sendResponse) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            sendResponse({ success: false, error: "Aktif sekme bulunamadı" });
            return;
        }

        const activeTab = tabs[0];
        
        try {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content-script.js']
            });
        } catch (injectError) {
            console.log("[SW] Content script zaten mevcut");
        }
        
        setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, { action: "playVideo" }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse(response || { success: false, error: "Boş yanıt" });
                }
            });
        }, 200);
        
    } catch (error) {
        console.error("[SW] Video oynatma hatası:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Video duraklama
async function handlePauseVideo(sendResponse) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            sendResponse({ success: false, error: "Aktif sekme bulunamadı" });
            return;
        }

        const activeTab = tabs[0];
        
        try {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ['content-script.js']
            });
        } catch (injectError) {
            console.log("[SW] Content script zaten mevcut");
        }
        
        setTimeout(() => {
            chrome.tabs.sendMessage(activeTab.id, { action: "pauseVideo" }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse(response || { success: false, error: "Boş yanıt" });
                }
            });
        }, 200);
        
    } catch (error) {
        console.error("[SW] Video duraklama hatası:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Google ile giriş işlemi
async function handleGoogleAuth(sendResponse) {
    try {
        console.log("[Auth] Google giriş başlatılıyor");

        const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/auth';
        const CLIENT_ID = '731610663845-lcusivrfp2viicfthssffm6kkdfih5i2.apps.googleusercontent.com';
        const REDIRECT_URI = 'https://ncajffobbacfcdafelncglekbkpoieem.chromiumapp.org';
        const SCOPE = 'email profile';
        
        const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&response_type=token` +
                        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                        `&scope=${encodeURIComponent(SCOPE)}`;
        
        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        }, async function(redirectUrl) {
            if (chrome.runtime.lastError) {
                console.error('[Auth] Auth hatası:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            
            if (!redirectUrl) {
                sendResponse({ success: false, error: 'Authentication failed' });
                return;
            }
            
            try {
                // Token'ı ayıkla
                const url = new URL(redirectUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const accessToken = params.get('access_token');
                
                if (!accessToken) {
                    sendResponse({ success: false, error: 'No access token' });
                    return;
                }
                
                // Kullanıcı bilgilerini al
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                const userInfo = await userInfoResponse.json();
                
                // Firebase'e kaydet
                const loginResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requestUri: REDIRECT_URI,
                        postBody: `access_token=${accessToken}&providerId=google.com`,
                        returnSecureToken: true
                    })
                });
                
                const firebaseData = await loginResponse.json();
                
                if (!loginResponse.ok) {
                    sendResponse({ success: false, error: firebaseData.error?.message || 'Firebase auth failed' });
                    return;
                }
                
                const userId = firebaseData.localId;
                const email = firebaseData.email || userInfo.email;
                const displayName = firebaseData.displayName || userInfo.name || email.split('@')[0];
                
                // Kullanıcıyı veritabanına kaydet
                await fetch(`${FIREBASE_DATABASE_URL}/users/${userId}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email, 
                        nickname: displayName,
                        photoUrl: userInfo.picture || null
                    })
                });
                
                sendResponse({ success: true, nickname: displayName });
                
            } catch (error) {
                console.error('[Auth] İşlem hatası:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
    } catch (err) {
        console.error("[Auth] Google auth genel hatası:", err);
        sendResponse({ success: false, error: err.message });
    }
}

// Normal auth işlemleri
async function handleAuthRequest(message, sendResponse) {
    const { email, password, nickname } = message;
    console.log(`[Auth] ${message.action} işlemi:`, email);
    
    if (message.action === "signup") {
        if (password.length < 12) {
            sendResponse({ success: false, error: "PASSWORD_TOO_SHORT" });
            return;
        }
        if (!/[A-Z]/.test(password)) {
            sendResponse({ success: false, error: "PASSWORD_NO_UPPERCASE" });
            return;
        }
        if (!/[a-z]/.test(password)) {
            sendResponse({ success: false, error: "PASSWORD_NO_LOWERCASE" });
            return;
        }
    }
    
    const url = message.action === "signup" ?
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}` :
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error("[Auth] Auth hatası:", data);
            sendResponse({ success: false, error: data.error?.message || "AUTH_ERROR" });
            return;
        }

        const userId = data.localId;

        if (message.action === "signup" && nickname) {
            await fetch(`${FIREBASE_DATABASE_URL}/users/${userId}.json`, {
                method: "PUT",
                headers: { 'Content-Type': "application/json" },
                body: JSON.stringify({ email, nickname })
            });
        }

        // Kullanıcı bilgilerini al
        const userDataResponse = await fetch(`${FIREBASE_DATABASE_URL}/users/${userId}.json`);
        const userData = await userDataResponse.json();
        const storedNickname = userData?.nickname || email.split('@')[0]; 

        sendResponse({ success: true, nickname: storedNickname });
        
    } catch (err) {
        console.error("[Auth] Network hatası:", err);
        sendResponse({ success: false, error: "NETWORK_ERROR" });
    }
}

function handleLogout(sendResponse) {
    console.log("[Auth] Çıkış yapılıyor");
    chrome.identity.clearAllCachedAuthTokens(() => {
        console.log("[Auth] Token'lar temizlendi");
    });
    sendResponse({ success: true });
}