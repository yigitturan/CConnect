document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("login-screen");
  const signupScreen = document.getElementById("signup-screen");
  const userInfoDiv = document.getElementById("user-info");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const signupEmailInput = document.getElementById("signup-email");
  const signupPasswordInput = document.getElementById("signup-password");
  const nicknameInput = document.getElementById("nickname");

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  
  const welcomeMsg = document.getElementById("welcomeMsg");
  const statusP = document.getElementById("status");

  // Ekran değiştirme butonları
  document.getElementById("showSignup").addEventListener("click", () => {
      loginScreen.classList.add("hidden");
      signupScreen.classList.remove("hidden");
  });

  document.getElementById("showLogin").addEventListener("click", () => {
      signupScreen.classList.add("hidden");
      loginScreen.classList.remove("hidden");
  });

  loginBtn.addEventListener("click", () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      showStatus("");
      chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
          if (response?.success) {
              showStatus("Giriş başarılı!");
              loginScreen.classList.add("hidden");
              signupScreen.classList.add("hidden");
              userInfoDiv.classList.remove("hidden");
              welcomeMsg.textContent = `Merhaba, ${response.nickname}!`;
          } else {
              showStatus("Giriş hatası: " + (response.error || "Bilinmeyen hata"), true);
          }
      });
  });

  signupBtn.addEventListener("click", () => {
      const email = signupEmailInput.value;
      const password = signupPasswordInput.value;
      const nickname = nicknameInput.value;
      showStatus("");
      chrome.runtime.sendMessage({ action: "signup", email, password, nickname }, (response) => {
          if (response?.success) {
              showStatus("Kayıt başarılı!");
              signupScreen.classList.add("hidden");
              loginScreen.classList.remove("hidden");
          } else {
              showStatus("Kayıt hatası: " + (response.error || "Bilinmeyen hata"), true);
          }
      });
  });

  logoutBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "logout" }, () => {
          showStatus("Çıkış yapıldı.");
          loginScreen.classList.remove("hidden");
          signupScreen.classList.add("hidden");
          userInfoDiv.classList.add("hidden");
      });
  });

  function showStatus(msg, isError = false) {
      statusP.style.color = isError ? "red" : "green";
      statusP.textContent = msg;
  }
});
