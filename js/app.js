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
  const HISTORY_DAYS = 14;

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

      const open = document.createElement("a");
      open.className = "hour-open";
      open.href = BASE_URL + hour.link;
      open.target = "_blank";
      open.rel = "noopener";
      open.title = `Otwórz „${hour.name}” na brewiarz.pl`;
      open.textContent = "↗";
      // Otwarcie tekstu automatycznie proponuje odhaczenie po powrocie.
      open.addEventListener("click", () => {
        setTimeout(() => maybeSuggestCheck(hour.id), 400);
      });

      row.appendChild(check);
      row.appendChild(info);
      row.appendChild(open);
      list.appendChild(row);
    });
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
  }

  function resetToday() {
    if (!confirm("Wyczyścić zaznaczenia dla dzisiejszego dnia?")) return;
    dayState = {};
    saveDay(currentDateKey, dayState);
    renderHours();
    renderProgress();
    renderHistory();
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

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
