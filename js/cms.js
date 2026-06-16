import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Global state
let cmsData = {};
let isAdminMode = false;
let auth;
let db;

document.addEventListener('DOMContentLoaded', () => {
  // Wait a tick for firebase-config.js to initialize window.firebaseAuth
  setTimeout(initCMS, 100);
});

async function initCMS() {
  if (!window.firebaseAuth || !window.firebaseDb) {
    console.error("Firebase not initialized globally. CMS cannot load.");
    return;
  }
  auth = window.firebaseAuth;
  db = window.firebaseDb;

  // 1. Fetch live content and hydrate DOM
  await fetchAndHydrate();

  // 2. Check Admin State
  onAuthStateChanged(auth, (user) => {
    if (user && window.location.hash === '#admin') {
      enableAdminMode();
    } else if (window.location.hash === '#admin') {
      showAdminLogin();
    }
  });

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#admin') {
      if (auth.currentUser) enableAdminMode();
      else showAdminLogin();
    } else {
      disableAdminMode();
    }
  });
}

// ─── DATA SYNC ──────────────────────────────────────────────

async function fetchAndHydrate() {
  try {
    const docRef = doc(db, 'siteContent', 'main');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      cmsData = docSnap.data();
    } else {
      console.warn("No CMS data found. Starting fresh.");
      cmsData = {};
    }
    hydrateDOM();
  } catch (error) {
    console.error("Error fetching CMS data:", error);
  }
}

function hydrateDOM() {
  const elements = document.querySelectorAll('[data-cms-key]');
  elements.forEach(el => {
    const key = el.getAttribute('data-cms-key');
    const value = getNestedValue(cmsData, key);
    
    if (value) {
      if (el.tagName === 'IMG') {
        el.src = value;
      } else {
        el.innerHTML = value;
      }
    }
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const deep = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  deep[last] = value;
}

// ─── ADMIN EDITING ──────────────────────────────────────────

function enableAdminMode() {
  if (isAdminMode) return;
  isAdminMode = true;
  document.body.classList.add('cms-admin-active');

  const elements = document.querySelectorAll('[data-cms-key]');
  elements.forEach(el => {
    if (el.tagName === 'IMG') {
      el.style.border = '2px dashed #ff0055';
      el.style.cursor = 'pointer';
      el.title = "Click to change image URL";
      el.onclick = function(e) {
        e.preventDefault();
        const currentUrl = el.src;
        const newUrl = prompt("Enter new image URL:", currentUrl);
        if (newUrl && newUrl.trim() !== "") {
          el.src = newUrl;
        }
      };
    } else {
      el.contentEditable = "true";
      el.style.outline = '1px dashed #7B5CE5';
      el.style.padding = '2px';
      el.title = "Click to edit text";
    }
  });

  injectAdminWidget();
}

function disableAdminMode() {
  if (!isAdminMode) return;
  isAdminMode = false;
  document.body.classList.remove('cms-admin-active');

  const elements = document.querySelectorAll('[data-cms-key]');
  elements.forEach(el => {
    if (el.tagName === 'IMG') {
      el.style.border = '';
      el.style.cursor = '';
      el.onclick = null;
    } else {
      el.contentEditable = "false";
      el.style.outline = '';
      el.style.padding = '';
    }
  });

  const widget = document.getElementById('cms-admin-widget');
  if (widget) widget.remove();
}

async function saveCMSChanges() {
  const btn = document.getElementById('cms-save-btn');
  btn.textContent = "Saving...";
  btn.disabled = true;

  // Crawl DOM and build new object
  const newCmsData = JSON.parse(JSON.stringify(cmsData)); // deep clone
  const elements = document.querySelectorAll('[data-cms-key]');
  
  elements.forEach(el => {
    const key = el.getAttribute('data-cms-key');
    const value = el.tagName === 'IMG' ? el.src : el.innerHTML.trim();
    setNestedValue(newCmsData, key, value);
  });

  try {
    const docRef = doc(db, 'siteContent', 'main');
    await setDoc(docRef, newCmsData);
    alert("Website content saved successfully!");
  } catch (error) {
    console.error("Error saving CMS data:", error);
    alert("Failed to save changes. Make sure your Firebase rules allow writes.");
  } finally {
    btn.textContent = "Save Changes";
    btn.disabled = false;
  }
}

// ─── UI INJECTIONS ──────────────────────────────────────────

function injectAdminWidget() {
  if (document.getElementById('cms-admin-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'cms-admin-widget';
  widget.innerHTML = `
    <div style="position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:15px 20px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.2);z-index:99999;font-family:sans-serif;display:flex;align-items:center;gap:15px;">
      <div style="font-size:14px;font-weight:bold;">✨ Admin Mode</div>
      <button id="cms-save-btn" style="background:#7B5CE5;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:bold;">Save Changes</button>
      <button id="cms-exit-btn" style="background:transparent;color:#ff4444;border:1px solid #ff4444;padding:8px 16px;border-radius:6px;cursor:pointer;">Exit</button>
    </div>
  `;
  document.body.appendChild(widget);

  document.getElementById('cms-save-btn').addEventListener('click', saveCMSChanges);
  document.getElementById('cms-exit-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.hash = '';
      window.location.reload();
    });
  });
}

function showAdminLogin() {
  if (document.getElementById('cms-login-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'cms-login-modal';
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
      <div style="background:#fff;padding:30px;border-radius:12px;width:100%;max-width:350px;">
        <h2 style="margin:0 0 20px;color:#111;text-align:center;">Admin Login</h2>
        <input type="email" id="cms-email" placeholder="Admin Email" style="width:100%;padding:12px;margin-bottom:15px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        <input type="password" id="cms-pass" placeholder="Password" style="width:100%;padding:12px;margin-bottom:20px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        <button id="cms-login-btn" style="width:100%;background:#111;color:#fff;padding:12px;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">Log In to Edit</button>
        <button id="cms-cancel-btn" style="width:100%;background:transparent;color:#666;padding:12px;border:none;margin-top:10px;cursor:pointer;">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('cms-login-btn').addEventListener('click', async () => {
    const email = document.getElementById('cms-email').value;
    const pass = document.getElementById('cms-pass').value;
    const btn = document.getElementById('cms-login-btn');
    btn.textContent = 'Loading...';
    
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      modal.remove();
      // onAuthStateChanged will catch this and call enableAdminMode()
    } catch (e) {
      alert("Login failed: " + e.message);
      btn.textContent = 'Log In to Edit';
    }
  });

  document.getElementById('cms-cancel-btn').addEventListener('click', () => {
    modal.remove();
    window.location.hash = '';
  });
}
