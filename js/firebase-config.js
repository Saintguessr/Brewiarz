// Wklej tutaj konfigurację swojego projektu Firebase
// (Konsola Firebase → Ustawienia projektu → Twoje aplikacje → SDK setup and configuration).
// To NIE są dane tajne — Firebase web API keys są publiczne z założenia,
// bezpieczeństwo zapewniają reguły Firestore (patrz README.md).
export const firebaseConfig = {
  apiKey: "AIzaSyCeeaqUsoU2l2ABkfOZAuoZKfjzgCObrfI",
  authDomain: "brewiarz-lg.firebaseapp.com",
  projectId: "brewiarz-lg",
  storageBucket: "brewiarz-lg.firebasestorage.app",
  messagingSenderId: "66943500162",
  appId: "1:66943500162:web:53e921ce51164e3e29599b",
};

// Jeśli kiedyś zechcesz wyłączyć synchronizację bez usuwania konfiguracji,
// możesz tymczasowo ustawić poniższą stałą na false.
export const firebaseEnabled = true;
