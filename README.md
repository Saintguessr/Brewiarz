# Brewiarz LG — Liturgia Godzin na dziś

Prosta aplikacja webowa (PWA), która pokazuje listę siedmiu godzin
brewiarzowych na dany dzień z linkami do aktualnej treści na
[brewiarz.pl](https://brewiarz.pl), oraz pozwala odhaczyć, którą godzinę
już się odmówiło. Stan zaznaczeń zapisywany jest lokalnie w przeglądarce
(`localStorage`) — bez żadnego serwera ani konta.

## Funkcje

- 📅 Automatycznie pokazuje dzisiejszą datę i siedem godzin: Godzina
  Czytań, Jutrznia, Modlitwa przedpołudniowa/południowa/popołudniowa,
  Nieszpory, Kompleta.
- 🔗 Każda godzina linkuje bezpośrednio do właściwej podstrony
  `brewiarz.pl/dzis.php?link=...` — zawsze aktualnej na dany dzień.
- ✅ Zaznaczanie „przeczytane” per godzina, zapisywane lokalnie,
  z automatycznym resetem następnego dnia.
- 📊 Pasek postępu i krótka historia ostatnich 14 dni.
- 🌙 Tryb jasny/ciemny.
- 📱 Instalowalna jako PWA (działa offline jako powłoka aplikacji —
  sama treść liturgiczna zawsze pobierana jest na żywo z brewiarz.pl).

## Dlaczego nie pobiera tekstów bezpośrednio do aplikacji?

Teksty liturgiczne na brewiarz.pl są chronione prawem autorskim
(© Konferencja Episkopatu Polski i Wydawnictwo Pallottinum). Ta aplikacja
celowo **nie kopiuje ani nie przechowuje** żadnych fragmentów tekstu —
jedynie prowadzi użytkownika do właściwej strony na danym dzień i
zapamiętuje postęp lokalnie. Dzięki temu treść zawsze jest aktualna i
w pełni zgodna z zasadami serwisu źródłowego.

## Uruchomienie lokalne

Nie jest wymagany żaden backend ani build — to zwykłe pliki statyczne.

```bash
# najprościej: dowolny lokalny serwer HTTP, np.
python3 -m http.server 8080
# potem otwórz http://localhost:8080
```

Można też po prostu otworzyć `index.html` bezpośrednio w przeglądarce,
choć rejestracja service workera (offline) wymaga serwera HTTP(S)
(lub `localhost`).

## Wdrożenie na GitHub Pages

1. Utwórz nowe repozytorium na GitHubie, np. `brewiarz-lg`.
2. W tym katalogu:
   ```bash
   git init
   git add .
   git commit -m "Pierwsza wersja aplikacji Brewiarz LG"
   git branch -M main
   git remote add origin https://github.com/<twoja-nazwa>/brewiarz-lg.git
   git push -u origin main
   ```
3. W ustawieniach repozytorium: **Settings → Pages → Branch: `main` / folder `/ (root)`**.
4. Po chwili aplikacja będzie dostępna pod
   `https://<twoja-nazwa>.github.io/brewiarz-lg/`.

## Struktura projektu

```
brewiarz-lg/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   └── style.css
├── js/
│   └── app.js
└── icons/
    └── icon.svg
```

## Konfiguracja godzin

Lista godzin i odpowiadające im parametry `link=` z brewiarz.pl znajdują
się na górze pliku `js/app.js` w tablicy `HOURS` — łatwo dodać kolejną
pozycję (np. Godzinę Czytań w dwóch częściach) lub zmienić opisowe pory dnia.

## Licencja

Kod aplikacji: licencja MIT (patrz `LICENSE`). Treści liturgiczne
dostępne pod linkami należą do ich właścicieli (KEP / Pallottinum) i nie
są częścią tego repozytorium.
