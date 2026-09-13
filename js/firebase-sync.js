// Synchronizacja postępu (które godziny są przeczytane) przez Firebase.
// Ten moduł NIE dotyka treści liturgicznych — synchronizuje wyłącznie
// Twoje własne, lokalnie generowane dane (true/false per godzina/dzień).
//
// Aby włączyć: uzupełnij js/firebase-config.js swoimi danymi projektu
// (patrz README.md, sekcja "Synchronizacja przez Firebase").

import { firebaseConfig, firebaseEnabled } from "./firebase-config.js";

if (!firebaseEnabled) {
  console.info(
    "Brewiarz LG: synchronizacja Firebase wyłączona — uzupełnij js/firebase-config.js, aby ją włączyć."
  );
  window.dispatchEvent(new CustomEvent("brewiarz-sync-unavailable"));
} else {
  init();
}

async function init() {
  try {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    ]);

    const {
      getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    } = authMod;
    const {
      getFirestore, doc, setDoc, onSnapshot, collection, getDocs,
    } = fsMod;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();

    function dayDocRef(uid, dateKey) {
      return doc(db, "users", uid, "days", dateKey);
    }

    window.BrewiarzSync = {
      currentUser: null,

      onAuthChange(cb) {
        onAuthStateChanged(auth, (user) => {
          window.BrewiarzSync.currentUser = user;
          cb(user);
        });
      },

      signIn() {
        return signInWithPopup(auth, provider).catch((e) =>
          console.error("Logowanie nieudane:", e)
        );
      },

      signOutUser() {
        return signOut(auth);
      },

      async pushDay(dateKey, data) {
        const user = window.BrewiarzSync.currentUser;
        if (!user) return;
        try {
          await setDoc(
            dayDocRef(user.uid, dateKey),
            { ...data, updatedAt: Date.now() },
            { merge: true }
          );
        } catch (e) {
          console.error("Zapis do Firestore nieudany:", e);
        }
      },

      subscribeDay(dateKey, cb) {
        const user = window.BrewiarzSync.currentUser;
        if (!user) return () => {};
        return onSnapshot(dayDocRef(user.uid, dateKey), (snap) => {
          if (snap.exists()) cb(snap.data());
        }, (e) => console.error("Nasłuch Firestore nieudany:", e));
      },

      async fetchHistory() {
        const user = window.BrewiarzSync.currentUser;
        if (!user) return {};
        try {
          const col = collection(db, "users", user.uid, "days");
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

    window.dispatchEvent(new CustomEvent("brewiarz-sync-ready"));
  } catch (e) {
    console.error("Nie udało się załadować Firebase SDK (sprawdź połączenie z internetem):", e);
    window.dispatchEvent(new CustomEvent("brewiarz-sync-unavailable"));
  }
}
