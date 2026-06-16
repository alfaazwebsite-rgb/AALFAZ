/**
 * auth.js — Firebase Authentication logic for Aalfaz customer accounts
 * Handles: Email/Password sign-up/sign-in, Google Sign-In, Sign-out
 * Saves user profile to Firestore on first sign-up.
 * Depends on: firebase-config.js (must be loaded first as a module)
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Wait for firebase-config.js to expose auth + db
function waitForFirebase(cb) {
  if (window.firebaseAuth && window.firebaseDb) return cb(window.firebaseAuth, window.firebaseDb);
  const t = setInterval(() => {
    if (window.firebaseAuth && window.firebaseDb) {
      clearInterval(t);
      cb(window.firebaseAuth, window.firebaseDb);
    }
  }, 50);
}

// ── Save user profile to Firestore on first sign-up ───────────────
async function saveUserProfile(auth, db, user, extra = {}) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // New user — create document
    await setDoc(ref, {
      uid: user.uid,
      name: extra.name || user.displayName || '',
      email: user.email,
      phone: extra.phone || '',
      country: extra.country || sessionStorage.getItem('aalfaz_currency_key') || 'IN',
      createdAt: serverTimestamp(),
      addresses: [],
      orders: []
    });
  }
}

// ── Email/Password Sign-Up ─────────────────────────────────────────
export async function signUpWithEmail(firstName, lastName, email, password, phone, country) {
  return new Promise((resolve, reject) => {
    waitForFirebase(async (auth, db) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = `${firstName} ${lastName}`.trim();
        await updateProfile(cred.user, { displayName });
        await saveUserProfile(auth, db, cred.user, { name: displayName, phone, country });
        resolve(cred.user);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Email/Password Sign-In ─────────────────────────────────────────
export async function signInWithEmail(email, password) {
  return new Promise((resolve, reject) => {
    waitForFirebase(async (auth, db) => {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        resolve(cred.user);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Google Sign-In ─────────────────────────────────────────────────
export async function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    waitForFirebase(async (auth, db) => {
      try {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        await saveUserProfile(auth, db, cred.user, { name: cred.user.displayName });
        resolve(cred.user);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Sign Out ───────────────────────────────────────────────────────
export async function signOutUser() {
  return new Promise((resolve, reject) => {
    waitForFirebase(async (auth) => {
      try {
        await signOut(auth);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Password Reset Email ───────────────────────────────────────────
export async function resetPassword(email) {
  return new Promise((resolve, reject) => {
    waitForFirebase(async (auth) => {
      try {
        await sendPasswordResetEmail(auth, email);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Get current user's Firestore profile ──────────────────────────
export async function getUserProfile(uid) {
  return new Promise((resolve, reject) => {
    waitForFirebase(async (auth, db) => {
      try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        resolve(snap.exists() ? snap.data() : null);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Listen for auth state changes ─────────────────────────────────
export function onAuthChange(callback) {
  waitForFirebase((auth) => {
    onAuthStateChanged(auth, callback);
  });
}

// ── Error message helper ───────────────────────────────────────────
export function getAuthErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use':    'An account with this email already exists.',
    'auth/invalid-email':           'Please enter a valid email address.',
    'auth/weak-password':           'Password must be at least 6 characters.',
    'auth/user-not-found':          'No account found with this email.',
    'auth/wrong-password':          'Incorrect password. Please try again.',
    'auth/invalid-credential':      'Invalid email or password.',
    'auth/too-many-requests':       'Too many attempts. Please wait and try again.',
    'auth/popup-closed-by-user':    'Google sign-in was cancelled.',
    'auth/network-request-failed':  'Network error. Please check your connection.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
}
