// Brewiarz LG — logika aplikacji
// Nie pobiera ani nie przechowuje treści liturgicznych z brewiarz.pl —
// jedynie linkuje do właściwej podstrony na dany dzień i zapamiętuje
// lokalnie (localStorage), które godziny użytkownik już odmówił.

(function () {
  "use strict";

  // Kody parametru link= używane przez brewiarz.pl/dzis.php?link=XX
  // (potwierdzone na podstawie aktualnych adresów serwisu brewiarz.pl)
  const HOURS = [
    { id: "gc", name: "Godzina Czytań",          time: "w dowolnej chwili dnia", link: "gc" },
    { id: "jt", name: "Jutrznia",                 time: "modlitwa poranna",       link: "jt" },
    { id: "m1", name: "Modlitwa przedpołudniowa", time: "ok. 9:00",               link: "m1" },
    { id: "m2", name: "Modlitwa południowa",      time: "ok. 12:00",              link: "m2" },
    { id: "m3", name: "Modlitwa popołudniowa",    time: "ok. 15:00",              link: "m3" },
    { id: "np", name: "Nieszpory",                time: "modlitwa wieczorna",     link: "np" },
    { id: "k",  name: "Kompleta",                 time: "przed snem",             link: "k"  },
  ];

  const BASE_URL = "https://brewiarz.pl/dzis.php?link=";
  const STORAGE_PREFIX = "brewiarz-lg:";
  const THEME_KEY = "brewiarz-lg:theme";
  const CALIBRATION_KEY = "brewiarz-lg:frameCalibration";
  const HISTORY_DAYS = 14;

  const DEFAULT_CALIBRATION = { top: 0, left: 0, scale: 100 };

  const $ = (sel) => document.querySelector(sel);

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function storageKeyFor(dateKey) {
    return STORAGE_PREFIX + dateKey;
  }

  function loadDay(dateKey) {
    try {
      const raw = localStorage.getItem(storageKeyFor(dateKey));
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Nie udało się odczytać danych z localStorage:", e);
      return {};
    }
  }

  function saveDay(dateKey, data) {
    try {
      localStorage.setItem(storageKeyFor(dateKey), JSON.stringify(data));
    } catch (e) {
      console.error("Nie udało się zapisać danych do localStorage:", e);
    }
  }

  function formatDateLabel(date) {
    return date.toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // ---------- Render ----------

  let currentDateKey = todayKey();
  let dayState = loadDay(currentDateKey);
  let openPanelHourId = null; // tylko jeden panel z tekstem otwarty naraz
  let remoteUnsubscribe = null;

  // ---------- Kalibracja podglądu tekstu (ramka) ----------

  function loadCalibration() {
    try {
      const raw = localStorage.getItem(CALIBRATION_KEY);
      return raw ? { ...DEFAULT_CALIBRATION, ...JSON.parse(raw) } : { ...DEFAULT_CALIBRATION };
    } catch (e) {
      return { ...DEFAULT_CALIBRATION };
    }
  }

  function saveCalibration(cal) {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(cal));
  }

  function applyCalibrationToFrame(frameEl, cal) {
    frameEl.style.top = `-${cal.top}px`;
    frameEl.style.left = `-${cal.left}px`;
    frameEl.style.transform = `scale(${cal.scale / 100})`;
  }

  function renderHeader() {
    $("#todayLabel").textContent = formatDateLabel(new Date());
  }

  function renderProgress() {
    const doneCount = HOURS.filter((h) => dayState[h.id]).length;
    $("#progressText").textContent = `${doneCount} / ${HOURS.length} przeczytane`;
    $("#progressFill").style.width = `${(doneCount / HOURS.length) * 100}%`;
  }

  function renderHours() {
    const list = $("#hoursList");
    list.innerHTML = "";

    HOURS.forEach((hour) => {
      const done = !!dayState[hour.id];

      const row = document.createElement("div");
      row.className = "hour-row" + (done ? " done" : "");
      row.dataset.hourId = hour.id;

      const check = document.createElement("button");
      check.className = "hour-check" + (done ? " checked" : "");
      check.setAttribute("aria-pressed", done ? "true" : "false");
      check.setAttribute("aria-label", `Oznacz „${hour.name}” jako przeczytaną`);
      check.textContent = "✓";
      check.addEventListener("click", () => toggleHour(hour.id));

      const info = document.createElement("div");
      info.className = "hour-info";
      const time = document.createElement("div");
      time.className = "hour-time";
      time.textContent = hour.time;
      const name = document.createElement("div");
      name.className = "hour-name";
      name.textContent = hour.name;
      info.appendChild(time);
      info.appendChild(name);

      const textToggle = document.createElement("button");
      textToggle.className = "hour-text-toggle" + (openPanelHourId === hour.id ? " active" : "");
      textToggle.textContent = openPanelHourId === hour.id ? "ukryj" : "pokaż tekst";
      textToggle.addEventListener("click", () => toggleTextPanel(hour));

      const open = document.createElement("a");
      open.className = "hour-open";
      open.href = BASE_URL + hour.link;
      open.target = "_blank";
      open.rel = "noopener";
      open.title = `Otwórz „${hour.name}” na brewiarz.pl w nowej karcie`;
      open.textContent = "↗";
      open.addEventListener("click", () => {
        setTimeout(() => maybeSuggestCheck(hour.id), 400);
      });

      row.appendChild(check);
      row.appendChild(info);
      row.appendChild(textToggle);
      row.appendChild(open);
      list.appendChild(row);

      if (openPanelHourId === hour.id) {
        list.appendChild(buildTextPanel(hour));
      }
    });
  }

  function toggleTextPanel(hour) {
    openPanelHourId = openPanelHourId === hour.id ? null : hour.id;
    renderHours();
  }

  function buildTextPanel(hour) {
    const tpl = document.getElementById("textPanelTemplate");
    const node = tpl.content.firstElementChild.cloneNode(true);

    const frame = node.querySelector(".frame-el");
    const url = BASE_URL + hour.link;
    frame.src = url;

    const fallbackLink = node.querySelector(".frame-fallback-link");
    fallbackLink.href = url;

    const cal = loadCalibration();
    applyCalibrationToFrame(frame, cal);

    const topCtrl = node.querySelector(".ctrl-top");
    const leftCtrl = node.querySelector(".ctrl-left");
    const scaleCtrl = node.querySelector(".ctrl-scale");
    topCtrl.value = cal.top;
    leftCtrl.value = cal.left;
    scaleCtrl.value = cal.scale;

    function updateFromControls() {
      const next = {
        top: Number(topCtrl.value),
        left: Number(leftCtrl.value),
        scale: Number(scaleCtrl.value),
      };
      applyCalibrationToFrame(frame, next);
      saveCalibration(next);
    }
    topCtrl.addEventListener("input", updateFromControls);
    leftCtrl.addEventListener("input", updateFromControls);
    scaleCtrl.addEventListener("input", updateFromControls);

    node.querySelector(".ctrl-reset").addEventListener("click", () => {
      topCtrl.value = DEFAULT_CALIBRATION.top;
      leftCtrl.value = DEFAULT_CALIBRATION.left;
      scaleCtrl.value = DEFAULT_CALIBRATION.scale;
      updateFromControls();
    });

    return node;
  }

  function maybeSuggestCheck(hourId) {
    // Gdy użytkownik wraca do karty po otwarciu tekstu, dyskretnie
    // podświetlamy checkbox, zamiast automatycznie go zaznaczać —
    // decyzję zawsze podejmuje użytkownik.
    const row = document.querySelector(`.hour-row[data-hour-id="${hourId}"]`);
    if (row && !dayState[hourId]) {
      row.classList.add("done");
      setTimeout(() => {
        if (!dayState[hourId]) row.classList.remove("done");
      }, 1500);
    }
  }

  function toggleHour(hourId) {
    dayState[hourId] = !dayState[hourId];
    saveDay(currentDateKey, dayState);
    renderHours();
    renderProgress();
    renderHistory();
    if (window.BrewiarzSync) window.BrewiarzSync.pushDay(currentDateKey, dayState);
  }

  function resetToday() {
    if (!confirm("Wyczyścić zaznaczenia dla dzisiejszego dnia?")) return;
    dayState = {};
    saveDay(currentDateKey, dayState);
    renderHours();
    renderProgress();
    renderHistory();
    if (window.BrewiarzSync) window.BrewiarzSync.pushDay(currentDateKey, dayState);
  }

  // ---------- Historia ----------

  function renderHistory() {
    const body = $("#historyBody");
    body.innerHTML = "";

    for (let i = 1; i <= HISTORY_DAYS; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const raw = localStorage.getItem(storageKeyFor(key));
      if (!raw) continue;

      let data = {};
      try { data = JSON.parse(raw); } catch (e) { continue; }
      const done = HOURS.filter((h) => data[h.id]).length;
      if (done === 0) continue;

      const row = document.createElement("div");
      row.className = "history-row";
      const label = document.createElement("span");
      label.textContent = d.toLocaleDateString("pl-PL", {
        weekday: "short", day: "numeric", month: "short",
      });
      const pct = document.createElement("span");
      pct.className = "pct";
      pct.textContent = `${done} / ${HOURS.length}`;
      row.appendChild(label);
      row.appendChild(pct);
      body.appendChild(row);
    }

    if (!body.children.length) {
      body.innerHTML = '<div class="history-row"><span>Brak jeszcze zapisanej historii.</span></div>';
    }
  }

  // ---------- Motyw ----------

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    $("#themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    applyTheme(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  // ---------- Synchronizacja Firebase (opcjonalna) ----------

  function updateSyncButton(syncCode) {
    const btn = $("#syncBtn");
    if (syncCode) {
      btn.textContent = `🔄 ${syncCode}`;
      btn.title = "Zsynchronizowano tym kodem. Kliknij, aby go zobaczyć albo zakończyć synchronizację.";
    } else {
      btn.textContent = "🔄 Synchronizuj";
      btn.title = "Utwórz kod synchronizacji albo wpisz kod z innego urządzenia";
    }
  }

  function subscribeRemoteForToday() {
    if (remoteUnsubscribe) { remoteUnsubscribe(); remoteUnsubscribe = null; }
    if (!window.BrewiarzSync || !window.BrewiarzSync.syncCode) return;
    remoteUnsubscribe = window.BrewiarzSync.subscribeDay(currentDateKey, (remoteData) => {
      const { updatedAt, ...hoursOnly } = remoteData || {};
      dayState = hoursOnly;
      saveDay(currentDateKey, dayState);
      renderHours();
      renderProgress();
      renderHistory();
    });
  }

  function initSync() {
    // Moduł Firebase (js/firebase-sync.js) ładuje SDK asynchronicznie z CDN,
    // więc może jeszcze nie być gotowy w chwili DOMContentLoaded — czekamy
    // wtedy na zdarzenie "brewiarz-sync-ready".
    if (!window.BrewiarzSync) {
      const btn = $("#syncBtn");
      btn.disabled = true;
      btn.textContent = "🔄 …";
      window.addEventListener("brewiarz-sync-ready", () => {
        btn.disabled = false;
        wireSyncUI();
      }, { once: true });
      window.addEventListener("brewiarz-sync-unavailable", () => {
        btn.style.display = "none";
      }, { once: true });
      return;
    }
    wireSyncUI();
  }

  async function pullAfterLinking() {
    // Po utworzeniu/dołączeniu do kodu: wypchnij bieżący stan, zacznij
    // nasłuchiwać zmian z innych urządzeń i dociągnij historię z chmury.
    await window.BrewiarzSync.pushDay(currentDateKey, dayState);
    subscribeRemoteForToday();
    const remoteHistory = await window.BrewiarzSync.fetchHistory(HISTORY_DAYS);
    Object.entries(remoteHistory).forEach(([dateKey, data]) => {
      const { updatedAt, ...hoursOnly } = data || {};
      saveDay(dateKey, hoursOnly);
    });
    renderHistory();
  }

  async function handleSyncClick() {
    const sync = window.BrewiarzSync;
    if (!sync) return;

    if (sync.syncCode) {
      const answer = window.prompt(
        `Ten sprzęt jest zsynchronizowany kodem: ${sync.syncCode}\n\n` +
          `Wpisz ten sam kod na kolejnym urządzeniu, aby je też połączyć.\n\n` +
          `Aby zakończyć synchronizację TYLKO na tym urządzeniu (dane w chmurze zostają), wpisz: wypisz`
      );
      if (answer && answer.trim().toLowerCase() === "wypisz") {
        sync.unlink();
        updateSyncButton(null);
        if (remoteUnsubscribe) { remoteUnsubscribe(); remoteUnsubscribe = null; }
      }
      return;
    }

    const entered = window.prompt(
      "Synchronizacja między urządzeniami — bez logowania przez Google:\n\n" +
        "• To PIERWSZE urządzenie: zostaw pole puste i kliknij OK — dostaniesz kod do wpisania na drugim urządzeniu.\n" +
        "• Masz już kod z innego urządzenia: wpisz go poniżej."
    );
    if (entered === null) return; // anulowano

    try {
      let code;
      if (entered.trim() === "") {
        code = await sync.createSyncCode();
        window.alert(
          `Twój kod synchronizacji: ${code}\n\nWpisz go na drugim urządzeniu (przycisk 🔄 Synchronizuj), aby połączyć postęp.`
        );
      } else {
        code = await sync.joinSyncCode(entered);
      }
      updateSyncButton(code);
      await pullAfterLinking();
    } catch (e) {
      console.error(e);
      window.alert("Nie udało się zsynchronizować: " + (e && e.message ? e.message : "nieznany błąd"));
    }
  }

  function wireSyncUI() {
    if (!window.BrewiarzSync) return;

    $("#syncBtn").addEventListener("click", handleSyncClick);

    window.BrewiarzSync.onAuthChange((user, syncCode) => {
      updateSyncButton(syncCode);
      if (syncCode) subscribeRemoteForToday();
    });
  }

  // ---------- Auto-aktualizacja Service Workera ----------

  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("sw.js").then((registration) => {
      // Sprawdzaj co jakiś czas i przy powrocie do karty, czy jest nowsza wersja.
      setInterval(() => registration.update(), 60 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update();
      });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            $("#updateBanner").classList.remove("hidden");
            $("#updateReloadBtn").onclick = () => {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            };
          }
        });
      });
    }).catch((e) => console.error("Rejestracja service workera nieudana:", e));

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }

  // ---------- Codzienna zmiana daty w tle ----------

  function watchForMidnight() {
    setInterval(() => {
      const key = todayKey();
      if (key !== currentDateKey) {
        currentDateKey = key;
        dayState = loadDay(currentDateKey);
        renderHeader();
        renderHours();
        renderProgress();
        renderHistory();
        subscribeRemoteForToday();
      }
    }, 60 * 1000);
  }

  // ---------- Start ----------

  function init() {
    initTheme();
    renderHeader();
    renderHours();
    renderProgress();
    renderHistory();
    watchForMidnight();

    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#resetDay").addEventListener("click", resetToday);
    $("#toggleHistory").addEventListener("click", () => {
      const body = $("#historyBody");
      const btn = $("#toggleHistory");
      const hidden = body.classList.toggle("hidden");
      btn.textContent = hidden ? "Pokaż historię ostatnich dni ▾" : "Ukryj historię ▴";
    });

    initServiceWorker();
    initSync();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
