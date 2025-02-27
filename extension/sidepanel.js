document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("loginBtn");
    const signupBtn = document.getElementById("signupBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginFormDiv = document.getElementById("login-form");
    const userInfoDiv = document.getElementById("user-info");
    const welcomeMsg = document.getElementById("welcomeMsg");
    const statusP = document.getElementById("status");
  
    function showStatus(msg, isError = false) {
      statusP.style.color = isError ? "red" : "green";
      statusP.textContent = msg;
      console.log("[UI] Durum mesajı:", msg);
    }
  
    chrome.storage.local.get(["userEmail", "idToken"], (data) => {
      if (data.idToken) {
        loginFormDiv.style.display = "none";
        userInfoDiv.style.display = "block";
        welcomeMsg.textContent = `Merhaba, ${data.userEmail}!`;
        console.log("[UI] Kullanıcı zaten giriş yapmış:", data.userEmail);
      }
    });
  
    loginBtn.addEventListener("click", () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      showStatus("");
      chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
        if (response?.success) {
          showStatus("Giriş başarılı!");
          loginFormDiv.style.display = "none";
          userInfoDiv.style.display = "block";
          welcomeMsg.textContent = `Merhaba, ${email}!`;
        } else {
          showStatus("Giriş hatası: " + (response.error || "Bilinmeyen hata"), true);
        }
      });
    });
  
    signupBtn.addEventListener("click", () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      showStatus("");
      chrome.runtime.sendMessage({ action: "signup", email, password }, (response) => {
        if (response?.success) {
          showStatus("Kayıt başarılı!");
          loginFormDiv.style.display = "none";
          userInfoDiv.style.display = "block";
          welcomeMsg.textContent = `Merhaba, ${email}!`;
        } else {
          showStatus("Kayıt hatası: " + (response.error || "Bilinmeyen hata"), true);
        }
      });
    });
  
    logoutBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "logout" }, () => {
        showStatus("Çıkış yapıldı.");
        loginFormDiv.style.display = "block";
        userInfoDiv.style.display = "none";
      });
    });
  });
  