document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("login-screen");
  const signupScreen = document.getElementById("signup-screen");
  const userInfoDiv = document.getElementById("user-info");
  const chatScreen = document.getElementById("chat-screen");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const signupEmailInput = document.getElementById("signup-email");
  const signupPasswordInput = document.getElementById("signup-password");
  const nicknameInput = document.getElementById("nickname");

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const messagesContainer = document.getElementById("messages-container");

  let currentUserNickname = "";
  const statusP = document.getElementById("status");

  // ✅ Kayıt ol ve giriş ekranı geçişleri düzeltildi
  document.getElementById("showSignup").addEventListener("click", (event) => {
      event.preventDefault();
      loginScreen.classList.add("hidden");
      signupScreen.classList.remove("hidden");
  });

  document.getElementById("showLogin").addEventListener("click", (event) => {
      event.preventDefault();
      signupScreen.classList.add("hidden");
      loginScreen.classList.remove("hidden");
  });

  signupBtn.addEventListener("click", () => {
      const email = signupEmailInput.value;
      const password = signupPasswordInput.value;
      const nickname = nicknameInput.value;

      if (!email || !password || !nickname) {
          showStatus("Tüm alanları doldurun!", true);
          return;
      }

      showStatus("Kayıt işlemi yapılıyor...");

      chrome.runtime.sendMessage({ action: "signup", email, password, nickname }, (response) => {
          if (response?.success) {
              showStatus("Kayıt başarılı! Giriş ekranına yönlendiriliyorsunuz.");
              console.log("[Signup Success] Yeni kullanıcı oluşturuldu:", email);
              signupScreen.classList.add("hidden");
              loginScreen.classList.remove("hidden");
          } else {
              showStatus("Kayıt hatası: " + (response.error || "Bilinmeyen hata"), true);
              console.error("[Signup Error] Firebase kayıt başarısız:", response.error);
          }
      });
  });

  loginBtn.addEventListener("click", () => {
      const email = emailInput.value;
      const password = passwordInput.value;
      chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
          if (response?.success) {
              currentUserNickname = response.nickname;
              loginScreen.classList.add("hidden");
              signupScreen.classList.add("hidden");
              userInfoDiv.classList.remove("hidden");
              chatScreen.classList.remove("hidden");
              loadMessages();
          }
      });
  });

  sendMessageBtn.addEventListener("click", async () => {
      const message = messageInput.value.trim();
      if (message === "") {
          showStatus("Boş mesaj gönderilemez!", true);
          return;
      }

      const newMessage = {
          sender: currentUserNickname,
          text: message,
          timestamp: Date.now()
      };

      try {
          const response = await fetch("https://cconnectyigit-default-rtdb.firebaseio.com/messages.json", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newMessage)
          });

          if (!response.ok) {
              throw new Error(`Mesaj gönderme başarısız: ${response.status} ${response.statusText}`);
          }

          showStatus("Mesaj gönderildi!");
          messageInput.value = "";
          loadMessages();
      } catch (error) {
          showStatus("Mesaj gönderme hatası!", true);
          console.error("[SendMessage Error]", error);
      }
  });

  async function loadMessages() {
      try {
          const response = await fetch("https://cconnectyigit-default-rtdb.firebaseio.com/messages.json");

          if (!response.ok) {
              throw new Error(`Mesajları alma başarısız: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          messagesContainer.innerHTML = "";

          if (data && Object.keys(data).length > 0) {
              Object.values(data).forEach((message) => {
                  const messageElement = document.createElement("p");
                  messageElement.textContent = `${message.sender}: ${message.text}`;
                  messagesContainer.appendChild(messageElement);
              });
          } else {
              messagesContainer.innerHTML = "<p>Henüz mesaj yok. İlk mesajı sen gönder!</p>";
          }
      } catch (error) {
          showStatus("Mesajları yükleme hatası!", true);
          console.error("[LoadMessages Error]", error);
      }
  }

  setInterval(loadMessages, 3000);

  function showStatus(msg, isError = false) {
      statusP.style.color = isError ? "red" : "green";
      statusP.textContent = msg;
  }
});
