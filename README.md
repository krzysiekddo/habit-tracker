# Habits — tygodniowy tracker nawyków

**Adres:** https://krzysiekddo.github.io/habit-tracker/

Czarno-biały tracker w stylu starej gazety (Ultra + Young Serif + Jost).
Czysty HTML/CSS/JS bez budowania — hostowany za darmo na GitHub Pages,
dane w Firebase (logowanie Google, synchronizacja telefon ↔ komputer, działa offline).

## Struktura

```
index.html              strona
css/styles.css          cały wygląd
js/app.js               logika interfejsu
js/dates.js             daty (tydzień od poniedziałku)
js/store-local.js       zapis w przeglądarce (tryb lokalny)
js/store-firebase.js    zapis w Firebase
js/firebase-config.js   ← TU wklejasz klucze Firebase
firestore.rules         reguły bezpieczeństwa bazy (wklejasz w konsoli Firebase)
sw.js, manifest...      PWA — instalacja na ekranie głównym telefonu, praca offline
fonts/, icons/          czcionki (OFL / Apache) i ikony
```

Dopóki `firebase-config.js` jest pusty, aplikacja działa w **trybie lokalnym**
(dane tylko w tej jednej przeglądarce).

> Uwaga: plik `index.html` otwarty dwuklikiem (file://) nie zadziała — przeglądarki
> blokują wtedy moduły JS. Aplikację oglądaj przez GitHub Pages (albo lokalny serwer).

---

## Krok 1 — Firebase (baza + logowanie)

1. Wejdź na https://console.firebase.google.com → **Dodaj projekt** → nazwa np. `nawyki`
   (Google Analytics możesz wyłączyć).
2. **Authentication** → *Rozpocznij* → zakładka *Sign-in method* → **Google** → włącz → zapisz.
3. **Firestore Database** → *Utwórz bazę danych* → lokalizacja `europe-central2 (Warszawa)`
   → tryb **produkcyjny**.
4. W Firestore zakładka **Reguły** → wklej zawartość pliku `firestore.rules` → *Opublikuj*.
5. ⚙ **Ustawienia projektu** → *Twoje aplikacje* → ikona **`</>`** (Web) → nazwa `Nawyki`
   (bez Firebase Hosting) → skopiuj obiekt `firebaseConfig` i wklej jego wartości
   do `js/firebase-config.js`.
6. Po założeniu strony na GitHubie (krok 2): **Authentication → Settings → Authorized domains**
   → *Add domain* → `krzysiekddo.github.io`.

Plan Spark (darmowy) w zupełności wystarcza; nie wymaga karty.

## Krok 2 — GitHub Pages (hosting)

Najprościej przez **GitHub Desktop** (ma git w środku, nie trzeba terminala):

1. Zainstaluj https://desktop.github.com i zaloguj się swoim kontem GitHub.
2. *File → Add local repository* → wskaż ten folder → kliknij **create a repository**
   → *Create repository*.
3. **Publish repository** → odznacz *Keep this code private* (darmowe Pages wymagają
   publicznego repo — dane i tak są chronione przez Firebase) → *Publish*.
4. Na github.com w repo: **Settings → Pages** → *Source: Deploy from a branch*
   → branch `main`, folder `/ (root)` → *Save*.
5. Po ~1 minucie strona działa pod **https://krzysiekddo.github.io/habit-tracker/**

Każda późniejsza zmiana: GitHub Desktop → *Commit to main* → *Push origin*.

## Krok 3 — telefon

Otwórz adres strony → zaloguj się Google →
- **Android (Chrome):** menu ⋮ → *Dodaj do ekranu głównego* / *Zainstaluj aplikację*.
- **iPhone (Safari):** przycisk *Udostępnij* → *Do ekranu początkowego*.

## Aktualizacje a pamięć offline

Service worker zawsze najpierw pobiera świeżą wersję z sieci, więc zmiany widać
po odświeżeniu. Przy większych zmianach podbij `CACHE = "habits-v2"` w `sw.js`.

## Motywy

Wybór motywu: ikona palety w prawym górnym rogu. Każdy motyw ma wersję jasną i ciemną
(przełącznik księżyc/słońce).

Dodanie nowego motywu:
1. W `css/themes.css` skopiuj blok istniejącego motywu (`[data-skin="..."]` + wersja `[data-theme="dark"]`),
   zmień id i wartości zmiennych (kolory, czcionki, ramki, zaokrąglenia, cienie).
2. Dopisz motyw do listy w `js/themes.js` (id, nazwa PL/EN, krótki opis).
3. Jeśli używa nowej czcionki — dodaj plik do `fonts/` i `@font-face` na górze `css/themes.css`
   (oraz do listy plików w `sw.js`, żeby działał offline).

Zdjęcia w motywie „Szkło” pochodzą z Unsplash (licencja Unsplash):
Fabio Fistarol (Nowy Jork w dzień), Ryan Fleischer (Nowy Jork nocą).
Są wczytywane z images.unsplash.com i zapamiętywane przez aplikację do pracy offline.
