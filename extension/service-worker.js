// service-worker.js (Manifest V3 service worker script)

const FIREBASE_API_KEY = "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU";

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
        case "logout":
            handleLogout(sendResponse);
            return true;
        default:
            console.warn("[SW] Bilinmeyen action türü:", message.action);
            sendResponse({ success: false, error: "UNKNOWN_ACTION" });
    }
});

async function handleAuthRequest(message, sendResponse) {
    const { email, password } = message;
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
        } else {
            console.log("[Auth] İşlem başarılı, token alındı.");
            chrome.storage.local.set({ idToken: data.idToken, refreshToken: data.refreshToken, userEmail: email });
            sendResponse({ success: true });
        }
    } catch (err) {
        console.error("[Auth] Ağ hatası:", err);
        sendResponse({ success: false, error: err.message });
    }
}

function handleLogout(sendResponse) {
    console.log("[Auth] Çıkış yapılıyor...");
    chrome.storage.local.remove(["idToken", "refreshToken", "userEmail"], () => {
        console.log("[Auth] Tokenlar temizlendi.");
        sendResponse({ success: true });
    });
}
