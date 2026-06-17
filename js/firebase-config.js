import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAm1kUybEIgaKVidqkkYlmvIBx898v0WLI",
  authDomain: "alfaaz-42650.firebaseapp.com",
  projectId: "alfaaz-42650",
  storageBucket: "alfaaz-42650.firebasestorage.app",
  messagingSenderId: "631548568640",
  appId: "1:631548568640:web:ba945bca435cccf231aba5",
  measurementId: "G-MS0GEMVDXW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Make available globally for all scripts
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.googleProvider = googleProvider;

export { app, analytics, db, auth, googleProvider };
