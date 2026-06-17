import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyByz8g6GkpsMSS4eAyGjDWVgz46J7BbPWQ",
  authDomain: "aalfaz-860ee.firebaseapp.com",
  projectId: "aalfaz-860ee",
  storageBucket: "aalfaz-860ee.firebasestorage.app",
  messagingSenderId: "94527970456",
  appId: "1:94527970456:web:d6379ed051df8380ee44ed",
  measurementId: "G-B4FCVQW43L"
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
