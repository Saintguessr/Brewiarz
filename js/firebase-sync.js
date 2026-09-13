// Synchronizacja postępu (które godziny są przeczytane) przez Firebase.
// Ten moduł NIE dotyka treści liturgicznych — synchronizuje wyłącznie
// Twoje własne, lokalnie generowane dane (true/false per godzina/dzień).
//
// Model logowania: WSZYSCY użytkownicy logują się anonimowo (bez hasła,
// bez konta Google) — to tylko spełnia wymóg Firebase "request.auth != null".
// Faktycznym "kluczem" łączącym Twoje urządzenia jest własny KOD
// SYNCHRONIZACJI, który sam wymyślasz i wpisujesz identycznie na każdym
// urządzeniu. Kod nigdy nie trafia do Firebase w postaci jawnej — zapisywany
// jest tylko jego skrót (SHA-256), który służy jako identyfikator dokumentu.
//
// UWAGA BEZPIECZEŃSTWA: to prosty mechanizm w stylu "kodu pokoju" — każdy,
// kto zna Twój dokładny kod synchronizacji, mógłby odczytać/nadpisać Twoje
// zaznaczenia. To akceptowalne dla osobistej, mało wrażliwej aplikacji do
// odhaczania modlitw, ale nie używaj tu hasła, którego używasz gdzie indziej.
//
// Aby włączyć: uzupełnij js/firebase-config.js swoimi danymi projektu
// i włącz w konsoli Firebase dostawcę logowania "Anonymous"
// (patrz README.md, sekcja "Synchronizacja przez Firebase").

import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

const SYNC_CODE_KEY = "brewiarz-lg:syncCode";

if (!firebaseEnabled) {
  console.info(
    "Brewiarz LG: synchronizacja Firebase wyłączona — uzupełnij js/firebase-config.js, aby ją włączyć."
  );
  window.dispatchEvent(new CustomEvent("brewiarz-sync-unavailable"));
} else {
  init();
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function init() {
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    ]);

    const { getAuth, signInAnonymously, onAuthStateChanged } = authMod;
    const { getFirestore, doc, setDoc, onSnapshot, collection, getDocs } = fsMod;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    function dayDocRef(syncHash, dateKey) {
      return doc(db, "sync", syncHash, "days", dateKey);
    }

    const sync = {
      currentUser: null,   // ustawiane po zalogowaniu anonimowym (zawsze, w tle)
      syncHash: null,      // ustawiane po podaniu kodu synchronizacji przez użytkownika
      syncCode: null,      // jawny kod — trzymany tylko lokalnie, na tym urządzeniu

      onAuthChange(cb) {
        onAuthStateChanged(auth, (user) => {
          sync.currentUser = user;
          if (user) {
            // Automatyczne, ciche logowanie anonimowe — bez pytania o cokolwiek.
            const savedCode = localStorage.getItem(SYNC_CODE_KEY);
            if (savedCode) {
              sync.connectSync(savedCode).then(() => cb({ connected: true, code: savedCode }));
            } else {
              cb({ connected: false });
            }
          } else {
            cb({ connected: false });
          }
        });
        signInAnonymously(auth).catch((e) => console.error("Logowanie anonimowe nieudane:", e));
      },

      isConnected() {
        return !!sync.syncHash;
      },

      async connectSync(code) {
        const trimmed = (code || "").trim();
        if (!trimmed) return false;
        sync.syncHash = await sha256Hex(trimmed);
        sync.syncCode = trimmed;
        localStorage.setItem(SYNC_CODE_KEY, trimmed);
        return true;
      },

      disconnectSync() {
        sync.syncHash = null;
        sync.syncCode = null;
        localStorage.removeItem(SYNC_CODE_KEY);
      },

      async pushDay(dateKey, data) {
        if (!sync.syncHash) return;
        try {
          await setDoc(
            dayDocRef(sync.syncHash, dateKey),
            { ...data, updatedAt: Date.now() },
            { merge: true }
          );
        } catch (e) {
          console.error("Zapis do Firestore nieudany:", e);
        }
      },

      subscribeDay(dateKey, cb) {
        if (!sync.syncHash) return () => {};
        return onSnapshot(dayDocRef(sync.syncHash, dateKey), (snap) => {
          if (snap.exists()) cb(snap.data());
        }, (e) => console.error("Nasłuch Firestore nieudany:", e));
      },

      async fetchHistory() {
        if (!sync.syncHash) return {};
        try {
          const col = collection(db, "sync", sync.syncHash, "days");
          const snaps = await getDocs(col);
          const result = {};
          snaps.forEach((s) => { result[s.id] = s.data(); });
          return result;
        } catch (e) {
          console.error("Pobranie historii z Firestore nieudane:", e);
          return {};
        }
      },
    };

    window.BrewiarzSync = sync;
    window.dispatchEvent(new CustomEvent("brewiarz-sync-ready"));
  } catch (e) {
    console.error("Nie udało się załadować Firebase SDK (sprawdź połączenie z internetem):", e);
    window.dispatchEvent(new CustomEvent("brewiarz-sync-unavailable"));
  }
}
