import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "",
  authDomain: "extension--auth-firebase.firebaseapp.com",
  projectId: "extension--auth-firebase",
  storageBucket: "extension--auth-firebase.firebasestorage.app",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();

// This gives you a reference to the parent frame, i.e. the offscreen document.
const PARENT_FRAME = document.location.ancestorOrigins[0];

const PROVIDER = new GoogleAuthProvider();

function sendResponse(result) {
  window.parent.postMessage(JSON.stringify(result), PARENT_FRAME);
}

window.addEventListener('message', function({data}) {
  if (data.initAuth) {
    signInWithPopup(auth, PROVIDER)
      .then(sendResponse)
      .catch(sendResponse);
  }
});