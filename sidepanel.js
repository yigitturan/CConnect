// sidepanel.js
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const googleLoginButton = document.getElementById("googleLogin");
const logoutButton = document.getElementById("logout");
const welcomeText = document.getElementById("welcomeText");

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    welcomeText.innerHTML = `Hoş geldiniz, <b>${user.displayName}</b>!<br>
    <img src="${user.photoURL}" width="50" style="border-radius:50%;">`;
    googleLoginButton.style.display = "none";
    logoutButton.style.display = "block";
  } else {
    welcomeText.innerText = "Google ile Giriş Yap";
    googleLoginButton.style.display = "block";
    logoutButton.style.display = "none";
  }
});

googleLoginButton.addEventListener("click", async () => {
  try {
    const result = await firebase.auth().signInWithPopup(provider);
    console.log("Giriş Başarılı:", result.user);
  } catch (error) {
    console.error("Hata:", error);
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await firebase.auth().signOut();
    alert("Çıkış yapıldı!");
  } catch (error) {
    alert(`Hata: ${error.message}`);
  }
});
