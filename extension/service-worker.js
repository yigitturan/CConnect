// service-worker.js (Manifest V3 service worker script)

const FIREBASE_API_KEY = "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU";
const FIREBASE_DATABASE_URL = "https://cconnectyigit-default-rtdb.firebaseio.com/"; // Firebase Realtime Database URL

console.log("[SW] Service worker başlatıldı.");

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .then(() => console.log("[SidePanel] Uzantı simgesine tıklandığında yan panel açılacak."))
        .catch(error => console.error("[SidePanel] Yan panel ayarı başarısız:", error));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[SW] Mesaj alındı:", message);
    if (!message || !message.action) {
        console.warn("[SW] Tanınmayan mesaj formatı:", message);
        return;
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
            return true;
        case "openVideoChat":
            handleVideoChat(message, sendResponse);
            return true;
        case "getVideoInfo":
            handleGetVideoInfo(sendResponse);
            return true;
        case "setVideoTime":
            handleSetVideoTime(message, sendResponse);
            return true;
        default:
            console.warn("[SW] Bilinmeyen action türü:", message.action);
            sendResponse({ success: false, error: "UNKNOWN_ACTION" });
    }
});

// Video bilgilerini almak için aktif sekmeye mesaj gönder
async function handleGetVideoInfo(sendResponse) {
    try {
        // Aktif sekmeyi bul
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            sendResponse({ success: false, error: "Aktif sekme bulunamadı" });
            return;
        }

        const activeTab = tabs[0];
        
        // Content script'e mesaj gönder
        chrome.tabs.sendMessage(activeTab.id, { action: "getVideoInfo" }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script yüklenmediyse veya cevap vermediyse
                // Content script'i enjekte et ve tekrar dene
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content-script.js']
                }).then(() => {
                    // Script enjekte edildikten sonra tekrar dene
                    setTimeout(() => {
                        chrome.tabs.sendMessage(activeTab.id, { action: "getVideoInfo" }, (response) => {
                            if (chrome.runtime.lastError) {
                                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                            } else {
                                sendResponse(response);
                            }
                        });
                    }, 100); // Enjekte edilen script'in yüklenmesi için kısa bir bekleme
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            } else {
                sendResponse(response);
            }
        });
    } catch (error) {
        console.error("[Video] Video bilgisi alma hatası:", error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true; // Asenkron sendResponse için
}

// Video süresini ayarlamak için aktif sekmeye mesaj gönder
async function handleSetVideoTime(message, sendResponse) {
    try {
        // Aktif sekmeyi bul
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
            sendResponse({ success: false, error: "Aktif sekme bulunamadı" });
            return;
        }

        const activeTab = tabs[0];
        
        // Content script'e mesaj gönder
        chrome.tabs.sendMessage(activeTab.id, { 
            action: "setVideoTime",
            currentTime: message.currentTime
        }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script yüklenmediyse veya cevap vermediyse
                // Content script'i enjekte et ve tekrar dene
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content-script.js']
                }).then(() => {
                    // Script enjekte edildikten sonra tekrar dene
                    setTimeout(() => {
                        chrome.tabs.sendMessage(activeTab.id, { 
                            action: "setVideoTime",
                            currentTime: message.currentTime
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                            } else {
                                sendResponse(response);
                            }
                        });
                    }, 100); // Enjekte edilen script'in yüklenmesi için kısa bir bekleme
                }).catch(error => {
                    sendResponse({ success: false, error: error.message });
                });
            } else {
                sendResponse(response);
            }
        });
    } catch (error) {
        console.error("[Video] Video süresini ayarlama hatası:", error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true; // Asenkron sendResponse için
}

// Google ile giriş işlemi - Firebase REST API kullanarak direkt yöntem
async function handleGoogleAuth(sendResponse) {
    try {
        console.log("[Auth] Google ile giriş işlemi başlatılıyor");

        // Google Sign-In ekranını aç
        const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/auth';
        const RESPONSE_TYPE = 'token';
        
        // Google OAuth parametreleri
        const CLIENT_ID = '731610663845-lcusivrfp2viicfthssffm6kkdfih5i2.apps.googleusercontent.com';
        
        // Redirect URI'yi tam olarak Cloud Console'daki gibi belirtin (eğik çizgisiz)
        const REDIRECT_URI = 'https://ncajffobbacfcdafelncglekbkpoieem.chromiumapp.org';
        const SCOPE = 'email profile';
        
        // Yetkilendirme URL'sini oluştur
        const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}` +
                        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
                        `&scope=${encodeURIComponent(SCOPE)}`;
        
        console.log("[Auth] Auth URL:", authUrl);
        
        // Chrome identity API ile yetkilendirme penceresini aç
        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
        }, async function(redirectUrl) {
            if (chrome.runtime.lastError) {
                console.error('[Auth] Auth flow error:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            
            if (!redirectUrl) {
                console.error('[Auth] No redirect URL');
                sendResponse({ success: false, error: 'Authentication failed' });
                return;
            }
            
            console.log('[Auth] Redirect URL:', redirectUrl);
            
            // Token'ı URL'den ayıkla
            const url = new URL(redirectUrl);
            const params = new URLSearchParams(url.hash.substring(1)); // # işaretini atla
            const accessToken = params.get('access_token');
            
            if (!accessToken) {
                console.error('[Auth] No access token found');
                sendResponse({ success: false, error: 'No access token returned' });
                return;
            }
            
            console.log('[Auth] Got access token, fetching user info');
            
            try {
                // Google profile bilgilerini al
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo?alt=json', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                
                if (!userInfoResponse.ok) {
                    throw new Error('Failed to fetch user info');
                }
                
                const userInfo = await userInfoResponse.json();
                console.log('[Auth] User info:', userInfo);
                
                // Firebase ile Google kimliği kullanarak oturum aç
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
                    console.error('[Auth] Firebase sign-in error:', firebaseData);
                    sendResponse({ success: false, error: firebaseData.error?.message || 'Firebase authentication failed' });
                    return;
                }
                
                // Kullanıcı bilgilerini al
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
                console.error('[Auth] Error during authentication:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
    } catch (err) {
        console.error("[Auth] Google auth genel hata:", err);
        sendResponse({ success: false, error: err.message });
    }
    
    // Bu özel dönüş, asenkron tamamlanacak sendResponse'un çalışmasını sağlar
    return true;
}

async function handleAuthRequest(message, sendResponse) {
    const { email, password, nickname } = message;
    console.log(`[Auth] ${message.action.toUpperCase()} işlemi:`, email);
    
    // Şifre doğrulama
    if (message.action === "signup") {
        // Şifre doğrulama kontrolleri
        if (password.length < 12) {
            sendResponse({ success: false, error: "PASSWORD_TOO_SHORT", message: "Şifre en az 12 karakter uzunluğunda olmalıdır." });
            return;
        }
        
        if (!/[A-Z]/.test(password)) {
            sendResponse({ success: false, error: "PASSWORD_NO_UPPERCASE", message: "Şifre en az bir büyük harf içermelidir." });
            return;
        }
        
        if (!/[a-z]/.test(password)) {
            sendResponse({ success: false, error: "PASSWORD_NO_LOWERCASE", message: "Şifre en az bir küçük harf içermelidir." });
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
            console.error("[Auth] İşlem başarısız:", data);
            
            // Daha iyi hata mesajları için hata türlerine göre işlem
            let friendlyError = data.error?.message || "UNKNOWN_ERROR";
            
            // Giriş hataları için daha anlayışlı mesajlar
            switch (friendlyError) {
                case "EMAIL_EXISTS":
                    friendlyError = "Bu e-posta adresi zaten kullanımda.";
                    break;
                case "INVALID_LOGIN_CREDENTIALS":
                case "INVALID_PASSWORD":
                    friendlyError = "Hatalı e-posta veya şifre. Lütfen tekrar deneyin.";
                    break;
                case "USER_DISABLED":
                    friendlyError = "Bu kullanıcı hesabı devre dışı bırakılmış.";
                    break;
                case "EMAIL_NOT_FOUND":
                case "USER_NOT_FOUND":
                    friendlyError = "Bu e-posta adresine kayıtlı kullanıcı bulunamadı.";
                    break;
                case "TOO_MANY_ATTEMPTS_TRY_LATER":
                    friendlyError = "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
                    break;
                case "WEAK_PASSWORD":
                    friendlyError = "Şifre en az 6 karakter uzunluğunda olmalıdır.";
                    break;
                default:
                    friendlyError = `İşlem sırasında bir hata oluştu: ${friendlyError}`;
            }
            
            sendResponse({ success: false, error: data.error?.message, friendlyError });
            return;
        }

        console.log("[Auth] İşlem başarılı, token alındı.");
        const userId = data.localId;

        if (message.action === "signup" && nickname) {
            // Kullanıcının nickini veritabanına kaydet
            await fetch(`${FIREBASE_DATABASE_URL}/users/${userId}.json`, {
                method: "PUT",
                headers: { 'Content-Type': "application/json" },
                body: JSON.stringify({ email, nickname })
            });
        }

        // Kullanıcının nickini veritabanından al
        const userDataResponse = await fetch(`${FIREBASE_DATABASE_URL}/users/${userId}.json`);
        const userData = await userDataResponse.json();
        const storedNickname = userData?.nickname || email; 

        sendResponse({ success: true, nickname: storedNickname });
    } catch (err) {
        console.error("[Auth] Ağ hatası:", err);
        sendResponse({ success: false, error: err.message, friendlyError: "Ağ bağlantısında bir sorun oluştu. Lütfen internet bağlantınızı kontrol edin." });
    }
}

function handleLogout(sendResponse) {
    console.log("[Auth] Çıkış yapılıyor...");
    // Chrome identity ile ilgili oturum bilgilerini temizleme
    chrome.identity.clearAllCachedAuthTokens(() => {
        console.log("[Auth] Tüm kimlik doğrulama token'ları temizlendi");
    });
    sendResponse({ success: true });
}

async function handleVideoChat(message, sendResponse) {
    try {
        console.log("[VideoChat] Video görüşmesi başlatılıyor:", message.roomId);
        // Yan panelde video chat bileşenini yükle
        sendResponse({ success: true, roomId: message.roomId });
    } catch (err) {
        console.error("[VideoChat] Hata:", err);
        sendResponse({ success: false, error: err.message });
    }
}