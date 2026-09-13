// Wklej tutaj konfigurację swojego projektu Firebase
// (Konsola Firebase → Ustawienia projektu → Twoje aplikacje → SDK setup and configuration).
// To NIE są dane tajne — Firebase web API keys są publiczne z założenia,
// bezpieczeństwo zapewniają reguły Firestore (patrz README.md).
export const firebaseConfig = {
  apiKey: 
const firebaseConfig = {
  apiKey: "AIzaSyCeeaqUsoU2l2ABkfOZAuoZKfjzgCObrfI",
  authDomain: "brewiarz-lg.firebaseapp.com",
  projectId: "brewiarz-lg",
  storageBucket: "brewiarz-lg.firebasestorage.app",
  messagingSenderId: "66943500162",
  appId: "1:66943500162:web:53e921ce51164e3e29599b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);,
  authDomain: "TWOJ-PROJEKT.firebaseapp.com",
  projectId: "TWOJ-PROJEKT",
  storageBucket: "TWOJ-PROJEKT.appspot.com",
  messagingSenderId: "WKLEJ_TUTAJ",
  appId: "WKLEJ_TUTAJ",
};

// Jeśli nie chcesz jeszcze konfigurować Firebase, zostaw jak jest —
// aplikacja wykryje brak poprawnej konfiguracji i po prostu będzie
// działać wyłącznie lokalnie (bez przycisku logowania).
export const firebaseEnabled = firebaseConfig.apiKey !== "WKLEJ_TUTAJ";
