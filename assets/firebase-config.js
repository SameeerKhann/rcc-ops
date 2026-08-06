/* =====================================================================
   OPTIONAL — cross-device sync + Chrome notifications for Sameer & Dmitry
   ---------------------------------------------------------------------
   The app runs fine WITHOUT this (local to one device). To let you and
   Dmitry share tasks live across computers and get notified:

   1. Go to https://console.firebase.google.com  →  Add project (free).
   2. Build → Firestore Database → Create database → Start in TEST mode.
   3. Project settings (gear) → "Your apps" → Web app (</>) → register.
   4. Copy the firebaseConfig values it shows into the object below.
   5. Save this file, refresh the app. Top-right menu should say
      "☁ Cloud sync on". Give the same file to Dmitry (it's in the repo).

   Note: TEST mode is open for 30 days — fine to start. Ask me later and
   I'll add simple security rules.
   ===================================================================== */
window.RCC_FIREBASE = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
