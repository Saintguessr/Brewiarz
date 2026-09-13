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

Podczas instalacji nowej wersji service worker celowo pobiera pliki
powłoki z `{ cache: "reload" }` (z pominięciem zwykłego dyskowego cache
HTTP przeglądarki), więc to, co trafia do jego własnego magazynu
(`CacheStorage`), zawsze jest naprawdę najświeższą wersją z serwera —
a nie przypadkowo nieaktualną kopią sprzed odświeżenia. Po Twoim
potwierdzeniu w bannerze „Odśwież” aplikacja przełącza się dokładnie na
tę świeżo pobraną wersję.

## Synchronizacja przez Firebase (opcjonalna, bez konta Google)

Domyślnie aplikacja działa w 100% lokalnie (dane tylko w przeglądarce).
Jeśli chcesz mieć swój postęp zsynchronizowany między telefonem a
komputerem, skonfiguruj własny, darmowy projekt Firebase. Logowanie jest
**anonimowe** — nie zakładasz konta ani nie logujesz się przez Google;
urządzenia parujesz krótkim **kodem synchronizacji**, który sam generujesz
w aplikacji.

1. Wejdź na [console.firebase.google.com](https://console.firebase.google.com)
   i utwórz nowy projekt (np. `brewiarz-lg`).
2. **Authentication → Sign-in method** → włącz dostawcę **Anonymous**.
3. **Firestore Database → Create database** → utwórz bazę (tryb produkcyjny).
4. W zakładce **Rules** wklej i opublikuj:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /syncGroups/{code} {
         // Każdy zalogowany (choćby anonimowo) użytkownik może sprawdzić,
         // czy dany kod istnieje, żeby móc do niego dołączyć.
         allow get: if request.auth != null;

         // Utworzenie nowej grupy: dokładnie z jednym UID — swoim własnym.
         allow create: if request.auth != null
           && request.resource.data.uids is list
           && request.resource.data.uids.size() == 1
           && request.resource.data.uids[0] == request.auth.uid;

         // Dołączenie do istniejącej grupy: wolno dopisać WYŁĄCZNIE
         // własny UID, jeden na raz, do listy uczestników (max 6 urządzeń).
         allow update: if request.auth != null
           && resource.data.uids.size() < 6
           && request.resource.data.uids.size() == resource.data.uids.size() + 1
           && request.resource.data.uids.hasAll(resource.data.uids)
           && request.auth.uid in request.resource.data.uids;

         match /days/{day} {
           // Odczyt/zapis dni tylko dla UID-ów należących do tej grupy.
           allow read, write: if request.auth != null
             && request.auth.uid in
                get(/databases/$(database)/documents/syncGroups/$(code)).data.uids;
         }
       }
     }
   }
   ```
   Dzięki temu tylko urządzenia znające / należące do danego kodu widzą
   i zapisują dane tej konkretnej grupy.
5. **Ustawienia projektu (ikona ⚙️) → Twoje aplikacje → Dodaj aplikację → Web (`</>`)**
   → skopiuj wygenerowany obiekt `firebaseConfig`.
6. Wklej go do pliku `js/firebase-config.js` w tym repozytorium, zapisz,
   zacommituj i wypchnij.

### Jak sparować urządzenia

1. Na **pierwszym** urządzeniu kliknij „🔄 Synchronizuj”, zostaw pole
   puste i zatwierdź — aplikacja wygeneruje 6-znakowy **kod synchronizacji**
   (np. `7K9XPM`) i go pokaże.
2. Na **drugim** urządzeniu kliknij „🔄 Synchronizuj” i wpisz ten sam kod.
3. Od tej chwili oba urządzenia współdzielą te same zaznaczenia godzin —
   zmiana na jednym pojawia się na drugim w czasie rzeczywistym.
4. Kliknięcie „🔄 <kod>” na już połączonym urządzeniu pokazuje jego kod
   ponownie (przydatne, żeby sparować kolejne urządzenie) albo pozwala
   zakończyć synchronizację *tylko na tym urządzeniu* (dane w chmurze
   zostają nietknięte, można się później dołączyć ponownie tym samym kodem).

> Klucz `apiKey` w konfiguracji Firebase **nie jest tajny** — to
> standardowy, publiczny identyfikator po stronie klienta. Bezpieczeństwo
> danych zapewniają reguły Firestore z punktu 4, a nie ukrywanie tego pliku.
>
> Sam kod synchronizacji działa trochę jak hasło do Twojego postępu
> modlitwy (dane niskiej wrażliwości, ale jednak Twoje) — podawaj go tylko
> sobie, na kolejnym własnym urządzeniu, nie publicznie.

Jeśli nie chcesz korzystać z synchronizacji, po prostu zostaw
`js/firebase-config.js` bez zmian albo ustaw w nim `firebaseEnabled = false`
— przycisk synchronizacji sam zniknie, a aplikacja będzie działać
wyłącznie lokalnie jak dotychczas.

## Konfiguracja godzin

Lista godzin i odpowiadające im parametry `link=` z brewiarz.pl znajdują
się na górze pliku `js/app.js` w tablicy `HOURS` — łatwo dodać kolejną
pozycję (np. Godzinę Czytań w dwóch częściach) lub zmienić opisowe pory dnia.

## Licencja

Kod aplikacji: licencja MIT (patrz `LICENSE`). Treści liturgiczne
dostępne pod linkami należą do ich właścicieli (KEP / Pallottinum) i nie
są częścią tego repozytorium.
