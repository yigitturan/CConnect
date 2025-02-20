import { initializeApp } from "./lib/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "./lib/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB69u3UFUyEX0F237B7MKMRTm-mfSvEqJU",
    authDomain: "cconnectyigit.firebaseapp.com",
    projectId: "cconnectyigit",
    storageBucket: "cconnectyigit.firebasestorage.app",
    messagingSenderId: "731610663845",
    appId: "1:731610663845:web:c0c1f537d86e391169764c",
    measurementId: "G-ZFHHZN4V5P"
  };
  

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged };
