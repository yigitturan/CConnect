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
        default:
            console.warn("[SW] Bilinmeyen action türü:", message.action);
            sendResponse({ success: false, error: "UNKNOWN_ACTION" });
    }
});

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
            sendResponse({ success: false, error: data.error?.message || "UNKNOWN_ERROR" });
            return;
        }

        console.log("[Auth] İşlem başarılı, token alındı.");
        const userId = data.localId;

        if (message.action === "signup" && nickname) {
            // Kullanıcının nickini veritabanına kaydet
            await fetch(`${FIREBASE_DATABASE_URL}/users/${userId}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
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
        sendResponse({ success: false, error: err.message });
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