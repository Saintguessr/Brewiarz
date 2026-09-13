// Synchronizacja postępu (które godziny są przeczytane) przez Firebase.
// Ten moduł NIE dotyka treści liturgicznych — synchronizuje wyłącznie
// Twoje własne, lokalnie generowane dane (true/false per godzina/dzień).
//
// Logowanie jest ANONIMOWE (bez konta Google) — urządzenia łączy się
// ze sobą krótkim KODEM SYNCHRONIZACJI zamiast wspólnego konta:
//   1) na pierwszym urządzeniu tworzysz kod (np. "7K9XPM"),
//   2) na drugim urządzeniu wpisujesz ten sam kod,
// od tej pory oba urządzenia współdzielą te same dane w Firestore
// pod ścieżką syncGroups/{kod}/days/{data}.
//
// Aby włączyć: uzupełnij js/firebase-config.js swoimi danymi projektu
// oraz włącz dostawcę logowania "Anonymous" w konsoli Firebase
// (patrz README.md, sekcja "Synchronizacja przez Firebase").

import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

const SYNC_CODE_KEY = "brewiarz-lg:syncCode";

// Alfabet kodu bez znaków łatwych do pomylenia (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

if (!firebaseEnabled) {
  console.info(
    "Brewiarz LG: synchronizacja Firebase wyłączona — uzupełnij js/firebase-config.js, aby ją włączyć."
  );
  window.dispatchEvent(new CustomEvent("brewiarz-sync-unavailable"));
} else {
  init();
}

function genCode() {
  const arr = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
  }
  return out;
}

function loadLocalCode() {
  return localStorage.getItem(SYNC_CODE_KEY);
}

function saveLocalCode(code) {
  if (code) localStorage.setItem(SYNC_CODE_KEY, code);
  else localStorage.removeItem(SYNC_CODE_KEY);
}

async function init() {
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    ]);

    const { getAuth, signInAnonymously, onAuthStateChanged } = authMod;
    const {
      getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot,
      collection, getDocs, arrayUnion,
    } = fsMod;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let authReadyResolve;
    const authReady = new Promise((resolve) => { authReadyResolve = resolve; });

    function groupRef(code) {
      return doc(db, "syncGroups", code);
    }
    function dayDocRef(code, dateKey) {
      return doc(db, "syncGroups", code, "days", dateKey);
    }

    const api = {
      currentUser: null,
      // Kod grupy synchronizacji, do której należy to urządzenie
      // (null = urządzenie jeszcze nie połączone z żadną grupą).
      syncCode: loadLocalCode(),

      onAuthChange(cb) {
        onAuthStateChanged(auth, (user) => {
          api.currentUser = user;
          if (authReadyResolve) { authReadyResolve(); authReadyResolve = null; }
          cb(user, api.syncCode);
        });
      },

      // Tworzy nową grupę synchronizacji i zwraca świeżo wygenerowany kod.
      async createSyncCode() {
        await authReady;
        const user = api.currentUser;
        if (!user) throw new Error("Logowanie anonimowe jeszcze się nie powiodło — spróbuj ponownie za chwilę.");

        let code = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = genCode();
          const snap = await getDoc(groupRef(candidate));
          if (!snap.exists()) { code = candidate; break; }
        }
        if (!code) throw new Error("Nie udało się wylosować wolnego kodu, spróbuj ponownie.");

        await setDoc(groupRef(code), { uids: [user.uid], createdAt: Date.now() });
        api.syncCode = code;
        saveLocalCode(code);
        return code;
      },

      // Dołącza to urządzenie do istniejącej grupy synchronizacji.
      async joinSyncCode(rawCode) {
        await authReady;
        const user = api.currentUser;
        if (!user) throw new Error("Logowanie anonimowe jeszcze się nie powiodło — spróbuj ponownie za chwilę.");

        const code = String(rawCode || "").trim().toUpperCase();
        if (!code) throw new Error("Podaj kod synchronizacji.");

        const snap = await getDoc(groupRef(code));
        if (!snap.exists()) throw new Error("Nie znaleziono takiego kodu synchronizacji.");

        const data = snap.data();
        if (!Array.isArray(data.uids) || !data.uids.includes(user.uid)) {
          await updateDoc(groupRef(code), { uids: arrayUnion(user.uid) });
        }

        api.syncCode = code;
        saveLocalCode(code);
        return code;
      },

      // Odłącza to urządzenie od grupy (dane w chmurze zostają nietknięte —
      // to tylko lokalna decyzja, żeby to urządzenie przestało synchronizować).
      unlink() {
        api.syncCode = null;
        saveLocalCode(null);
      },

      async pushDay(dateKey, data) {
        if (!api.syncCode || !api.currentUser) return;
        try {
          await setDoc(
            dayDocRef(api.syncCode, dateKey),
            { ...data, updatedAt: Date.now() },
            { merge: true }
          );
        } catch (e) {
          console.error("Zapis do Firestore nieudany:", e);
        }
      },

      subscribeDay(dateKey, cb) {
        if (!api.syncCode) return () => {};
        return onSnapshot(dayDocRef(api.syncCode, dateKey), (snap) => {
          if (snap.exists()) cb(snap.data());
        }, (e) => console.error("Nasłuch Firestore nieudany:", e));
      },

      async fetchHistory() {
        if (!api.syncCode) return {};
        try {
          const col = collection(db, "syncGroups", api.syncCode, "days");
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

    window.BrewiarzSync = api;

    // Logujemy się anonimowo od razu w tle. Samo logowanie anonimowe
    // niczego jeszcze nie synchronizuje — dopiero utworzenie lub wpisanie
    // kodu (createSyncCode / joinSyncCode) łączy urządzenie z grupą.
    signInAnonymously(auth).catch((e) => console.error("Logowanie anonimowe nieudane:", e));

    window.dispatchEvent(new CustomEvent("brewiarz-sync-ready"));
  } catch (e) {
    console.error("Nie udało się załadować Firebase SDK (sprawdź połączenie z internetem):", e);
    window.dispatchEvent(new CustomEvent("brewiarz-sync-unavailable"));
  }
}
