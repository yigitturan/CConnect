document.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("login-screen");
  const signupScreen = document.getElementById("signup-screen");
  const userInfoDiv = document.getElementById("user-info");
  const chatScreen = document.getElementById("chat-screen");
  const messagesContainer = document.getElementById("messages-container");

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

  let currentUserNickname = "";
  const statusP = document.getElementById("status");

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

  // Kullanıcı renklerini belirleme
  const colorMap = new Map();
  // Kullanıcı renklerini belirleme (Sadece RGB renklerinden rastgele seçer)

// Kullanıcı renklerini belirleme (Mat Mor, Kırmızı, Sarı, Turuncu arasından rastgele seçer)
// Kullanıcı renklerini belirleme (Mat Mor, Mat Kırmızı, Mat Turuncu arasından rastgele seçer)
function getRandomColor() {
  const colors = ["#8E44AD", "#C0392B", "#D35400"]; 
  return colors[Math.floor(Math.random() * colors.length)];
}




  function getUserColor(username) {
      if (!colorMap.has(username)) {
          colorMap.set(username, getRandomColor());
      }
      return colorMap.get(username);
  }

  // Kayıt olma işlemi
  signupBtn.addEventListener("click", () => {
      const email = signupEmailInput.value.trim();
      const password = signupPasswordInput.value.trim();
      const nickname = nicknameInput.value.trim();

      if (!email || !password || !nickname) {
          showStatus("Tüm alanları doldurun!", true);
          return;
      }

      chrome.runtime.sendMessage({ action: "signup", email, password, nickname }, (response) => {
          if (response?.success) {
              loginScreen.classList.remove("hidden");
              signupScreen.classList.add("hidden");
          } else {
              showStatus("Kayıt hatası: " + (response.error || "Bilinmeyen hata"), true);
          }
      });
  });

  // Giriş yapma işlemi
  loginBtn.addEventListener("click", () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      if (!email || !password) {
          showStatus("Lütfen tüm alanları doldurun!", true);
          return;
      }

      chrome.runtime.sendMessage({ action: "login", email, password }, (response) => {
          if (response?.success) {
              currentUserNickname = response.nickname;
              loginScreen.classList.add("hidden");
              signupScreen.classList.add("hidden");
              userInfoDiv.classList.remove("hidden");
              chatScreen.classList.remove("hidden");
              loadMessages();
          } else {
              showStatus("Giriş hatası: " + (response.error || "Bilinmeyen hata"), true);
          }
      });
  });

  // Çıkış yapma işlemi
  logoutBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "logout" }, (response) => {
          if (response?.success) {
              loginScreen.classList.remove("hidden");
              signupScreen.classList.add("hidden");
              userInfoDiv.classList.add("hidden");
              chatScreen.classList.add("hidden");
              messagesContainer.innerHTML = "";
          }
      });
  });

  // Mesaj gönderme işlemi
  sendMessageBtn.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
          event.preventDefault();
          sendMessage();
      }
  });

  async function sendMessage() {
      const message = messageInput.value.trim();
      if (message === "") return;

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
              throw new Error("Mesaj gönderme başarısız");
          }

          messageInput.value = "";
          setTimeout(loadMessages, 500);
      } catch (error) {
          console.error("Mesaj gönderme hatası:", error);
      }
  }

  // Mesajları yükleme fonksiyonu
  async function loadMessages() {
      try {
          const response = await fetch("https://cconnectyigit-default-rtdb.firebaseio.com/messages.json");
          if (!response.ok) throw new Error("Mesajları alma başarısız");

          const data = await response.json();
          messagesContainer.innerHTML = "";

          if (data && Object.keys(data).length > 0) {
              Object.values(data).forEach((message) => {
                  const messageElement = document.createElement("div");
                  messageElement.textContent = `${message.sender}: ${message.text}`;
                  messageElement.classList.add(message.sender === currentUserNickname ? "sent-message" : "received-message");
                  messageElement.style.backgroundColor = getUserColor(message.sender);

                  messagesContainer.appendChild(messageElement);
              });

              scrollToBottom();
          }
      } catch (error) {
          console.error("Mesajları yükleme hatası:", error);
      }
  }

  function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  setInterval(loadMessages, 3000);
  loadMessages();
});
