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
- 📖 Podgląd samego tekstu modlitwy pod przyciskiem „pokaż tekst” — bez
  menu i reszty strony brewiarz.pl (patrz sekcja niżej), plus link do
  pełnej strony w nowej karcie.
- ✅ Zaznaczanie „przeczytane” per godzina, zapisywane lokalnie,
  z automatycznym resetem następnego dnia.
- 📊 Pasek postępu i krótka historia ostatnich 14 dni.
- 🔄 Opcjonalna synchronizacja postępu między urządzeniami przez Firebase.
- 🆕 Automatyczne wykrywanie nowej wersji aplikacji z przyciskiem „Odśwież”.
- 🌙 Tryb jasny/ciemny.
- 📱 Instalowalna jako PWA (działa offline jako powłoka aplikacji —
  sama treść liturgiczna zawsze pobierana jest na żywo z brewiarz.pl).

## Dlaczego tekst wyświetla się w ramce, a nie jest wbudowany w kod?

Teksty liturgiczne na brewiarz.pl są chronione prawem autorskim
(© Konferencja Episkopatu Polski i Wydawnictwo Pallottinum), niezależnie
od tego, że aplikacja jest do użytku osobistego. Dlatego ta aplikacja
celowo **nie kopiuje, nie parsuje ani nie przechowuje** żadnych fragmentów
tekstu we własnym kodzie czy bazie danych. Zamiast tego pod każdą godziną
możesz rozwinąć podgląd, który ładuje właściwą stronę `brewiarz.pl`
**na żywo** w ramce (`<iframe>`) i wizualnie przycina widok tak, by było
widać głównie sam tekst modlitwy, bez menu z boku. To zwykła technika
CSS (przycięcie/przesunięcie widoku), a nie kopiowanie treści — treść
zawsze pochodzi bezpośrednio ze strony źródłowej i jest zawsze aktualna.

### Kalibracja podglądu

Nie mam możliwości sprawdzenia dokładnego układu CSS strony brewiarz.pl
z tego środowiska, więc zamiast sztywnych wartości dodałem suwaki:

- **↕** — przesunięcie w pionie (np. żeby schować górne menu i dojechać do treści modlitwy),
- **↔** — przesunięcie w poziomie (żeby schować lewe/prawe menu),
- **🔍** — skala powiększenia tekstu,
- **domyślne** — resetuje do wartości wyjściowych.

Wystarczy ustawić raz (dla dowolnej godziny — ustawienie jest wspólne dla
wszystkich, bo strony mają ten sam szablon) — zapamiętuje się w przeglądarce.
Jeśli mimo to tekst się nie pokazuje wcale (biały/pusty obszar), oznacza to,
że brewiarz.pl blokuje osadzanie w ramce (nagłówek `X-Frame-Options`) —
wtedy skorzystaj z linku „otwórz ją bezpośrednio” pod ramką.

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
│   ├── app.js
│   ├── firebase-sync.js
│   └── firebase-config.js   ← tu wklejasz swoją konfigurację Firebase
└── icons/
    └── icon.svg
```

## Automatyczna aktualizacja aplikacji

Aplikacja rejestruje service workera, który:

- cache'uje wyłącznie pliki powłoki aplikacji (HTML/CSS/JS) — nigdy
  treści z brewiarz.pl ani z Firebase/CDN,
- sprawdza w tle co godzinę oraz przy każdym powrocie do karty, czy na
  serwerze (GitHub Pages) pojawiła się nowsza wersja plików,
- gdy wykryje nową wersję, pokazuje na górze banner „Dostępna nowa
  wersja aplikacji” z przyciskiem **Odśwież** — nowa wersja aktywuje się
  dopiero po Twoim potwierdzeniu (żeby nic nie podmienić „pod ręką”
  w trakcie modlitwy).

Aby to zadziałało po wgraniu zmian na GitHub Pages, wystarczy je po
prostu wypchnąć (`git push`) — przeglądarki użytkowników same wykryją
różnicę w pliku `sw.js` przy kolejnym sprawdzeniu. Jeśli chcesz wymusić
błyskawiczne wykrycie zmiany, możesz dodatkowo podbić `CACHE_VERSION`
na górze `sw.js`.

## Synchronizacja przez Firebase (opcjonalna)

Domyślnie aplikacja działa w 100% lokalnie (dane tylko w przeglądarce).
Jeśli chcesz mieć swój postęp zsynchronizowany między telefonem a
komputerem, skonfiguruj własny, darmowy projekt Firebase:

1. Wejdź na [console.firebase.google.com](https://console.firebase.google.com)
   i utwórz nowy projekt (np. `brewiarz-lg`).
2. **Authentication → Sign-in method** → włącz dostawcę **Google**.
3. **Authentication → Settings → Authorized domains** → dodaj domenę,
   pod którą będzie działać aplikacja, np. `<twoja-nazwa>.github.io`
   (oraz `localhost` do testów lokalnych).
4. **Firestore Database → Create database** → utwórz bazę (tryb produkcyjny).
5. W zakładce **Rules** wklej i opublikuj:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/days/{day} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   Dzięki temu każdy użytkownik widzi i zapisuje wyłącznie własne dane.
6. **Ustawienia projektu (ikona ⚙️) → Twoje aplikacje → Dodaj aplikację → Web (`</>`)**
   → skopiuj wygenerowany obiekt `firebaseConfig`.
7. Wklej go do pliku `js/firebase-config.js` w tym repozytorium (zastępując
   wartości `WKLEJ_TUTAJ`), zapisz, zacommituj i wypchnij.

Po zalogowaniu (przycisk „🔄 Zaloguj” w prawym górnym rogu) aplikacja
zacznie zapisywać zaznaczenia w Twoim Firestore i synchronizować je
w czasie rzeczywistym między urządzeniami, na których jesteś zalogowany
tym samym kontem Google.

> Klucz `apiKey` w konfiguracji Firebase **nie jest tajny** — to
> standardowy, publiczny identyfikator po stronie klienta. Bezpieczeństwo
> danych zapewniają reguły Firestore z punktu 5, a nie ukrywanie tego pliku.

Jeśli nie chcesz korzystać z synchronizacji, po prostu zostaw
`js/firebase-config.js` bez zmian — przycisk logowania sam zniknie,
a aplikacja będzie działać wyłącznie lokalnie jak dotychczas.

## Konfiguracja godzin

Lista godzin i odpowiadające im parametry `link=` z brewiarz.pl znajdują
się na górze pliku `js/app.js` w tablicy `HOURS` — łatwo dodać kolejną
pozycję (np. Godzinę Czytań w dwóch częściach) lub zmienić opisowe pory dnia.

## Licencja

Kod aplikacji: licencja MIT (patrz `LICENSE`). Treści liturgiczne
dostępne pod linkami należą do ich właścicieli (KEP / Pallottinum) i nie
są częścią tego repozytorium.
