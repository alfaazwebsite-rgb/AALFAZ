import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDA7rlTknOIh4-FZNIfir8oyVXG1kwisLI",
  authDomain: "aalfaz-4244d.firebaseapp.com",
  projectId: "aalfaz-4244d",
  storageBucket: "aalfaz-4244d.firebasestorage.app",
  messagingSenderId: "7297252372",
  appId: "1:7297252372:web:e70d660de7121e142bbb01",
  measurementId: "G-R9VGWGKBRN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Make available globally for vanilla JS usage
window.firebaseApp = app;
window.firebaseDb = db;

export { app, analytics, db };
