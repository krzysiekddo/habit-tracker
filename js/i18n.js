// Tłumaczenia interfejsu (PL / EN). Treści dodane przez użytkownika (nazwy nawyków) nie są tłumaczone.

const KEY = "habits:lang";

const NAMES = {
  pl: {
    long: ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"],
    short: ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"],
    letter: ["P", "W", "Ś", "C", "P", "S", "N"],
    monGen: ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"],
    monNom: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
    monShort: ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"],
  },
  en: {
    long: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    short: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    letter: ["M", "T", "W", "T", "F", "S", "S"],
    monGen: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monNom: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

const STR = {
  pl: {
    issueKind: "Wydanie tygodniowe",
    issueNo: "Nr {n}",
    thisWeek: "Ten tydzień", lastWeek: "Poprzedni tydzień", nextWeek: "Następny tydzień", weekN: "Tydzień {n}",
    progress: "{label}: <strong>{done}</strong> z <strong>{total}</strong> wykonane",
    progressNone: "{label}: brak zaplanowanych nawyków",
    dayOff: "Dzień wolny.", noHabits: "Brak nawyków.",
    indexTitle: "Spis nawyków", events: "Wydarzenia",
    indexEmpty: "Spis jest pusty. Dodaj pierwszy nawyk — wystarczy nazwa i dni.",
    noRecurring: "Brak stałych nawyków.",
    edit: "Edytuj", daysAria: "Dni: {d}", eventTag: "Wydarzenie",
    signInKicker: "Habits", signInTitle: "Zaloguj się,<br><em>by zobaczyć swój tydzień.</em>",
    signInBtn: "Zaloguj przez Google", signInError: "Nie udało się zalogować. ",
    signedIn: "Zalogowano: {who}", localMode: "Tryb lokalny — dane zapisują się tylko w tej przeglądarce.",
    signOut: "Wyloguj",
    weekNav: "Nawigacja tygodnia", prevWeek: "Poprzedni tydzień", nextWeekAria: "Następny tydzień",
    today: "Dziś", add: "+ Dodaj", stripAria: "Dni tygodnia", fabAria: "Dodaj nawyk",
    kickerEdit: "Korekta", kickerOnce: "Jednorazowo", kickerNew: "Nowa rubryka",
    titleEditEvent: "Edytuj wydarzenie", titleEditHabit: "Edytuj nawyk",
    titleAddEvent: "Dodaj wydarzenie", titleAddHabit: "Dodaj nawyk",
    close: "Zamknij", name: "Nazwa", phHabit: "np. Poranny spacer", phEvent: "np. Wizyta u dentysty",
    oneoff: "Wydarzenie jednorazowe", date: "Data", days: "Dni",
    everyDay: "Codziennie", weekdays: "Dni robocze", weekend: "Weekend",
    errNameEvent: "Nadaj wydarzeniu nazwę.", errNameHabit: "Nadaj nawykowi nazwę.",
    errDate: "Wybierz datę wydarzenia.", errDays: "Wybierz przynajmniej jeden dzień.",
    del: "Usuń", delSure: "Na pewno?", cancel: "Anuluj", save: "Zapisz",
    toLight: "Włącz tryb jasny", toDark: "Włącz tryb ciemny",
    langBtn: "EN", langAria: "Switch to English",
    skinAria: "Wybierz motyw", skinKicker: "Wygląd", skinTitle: "Motyw", skinSample: "Spacer",
    glassLabel: "Przezroczystość szkła", glassTinted: "Przyciemnione", glassClear: "Przejrzyste",
  },
  en: {
    issueKind: "Weekly edition",
    issueNo: "No. {n}",
    thisWeek: "This week", lastWeek: "Last week", nextWeek: "Next week", weekN: "Week {n}",
    progress: "{label}: <strong>{done}</strong> of <strong>{total}</strong> done",
    progressNone: "{label}: nothing planned",
    dayOff: "Day off.", noHabits: "No habits yet.",
    indexTitle: "All habits", events: "Events",
    indexEmpty: "Nothing here yet. Add your first habit — just a name and the days.",
    noRecurring: "No recurring habits.",
    edit: "Edit", daysAria: "Days: {d}", eventTag: "Event",
    signInKicker: "Habits", signInTitle: "Sign in<br><em>to see your week.</em>",
    signInBtn: "Sign in with Google", signInError: "Couldn't sign in. ",
    signedIn: "Signed in: {who}", localMode: "Local mode — data is saved only in this browser.",
    signOut: "Sign out",
    weekNav: "Week navigation", prevWeek: "Previous week", nextWeekAria: "Next week",
    today: "Today", add: "+ Add", stripAria: "Days of the week", fabAria: "Add habit",
    kickerEdit: "Revision", kickerOnce: "One-off", kickerNew: "New entry",
    titleEditEvent: "Edit event", titleEditHabit: "Edit habit",
    titleAddEvent: "Add event", titleAddHabit: "Add habit",
    close: "Close", name: "Name", phHabit: "e.g. Morning walk", phEvent: "e.g. Dentist appointment",
    oneoff: "One-time event", date: "Date", days: "Days",
    everyDay: "Every day", weekdays: "Weekdays", weekend: "Weekend",
    errNameEvent: "Give the event a name.", errNameHabit: "Give the habit a name.",
    errDate: "Pick a date for the event.", errDays: "Pick at least one day.",
    del: "Delete", delSure: "Sure?", cancel: "Cancel", save: "Save",
    toLight: "Switch to light mode", toDark: "Switch to dark mode",
    langBtn: "PL", langAria: "Przełącz na polski",
    skinAria: "Choose theme", skinKicker: "Appearance", skinTitle: "Theme", skinSample: "Walk",
    glassLabel: "Glass transparency", glassTinted: "Tinted", glassClear: "Clear",
  },
};

function initial() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "pl" || saved === "en") return saved;
  } catch { /* ignoruj */ }
  return (navigator.language || "pl").toLowerCase().startsWith("pl") ? "pl" : "en";
}

export let lang = initial();
document.documentElement.lang = lang;

export const N = () => NAMES[lang];

export function t(key, vars = {}) {
  let s = STR[lang][key] ?? STR.pl[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export function setLang(next) {
  lang = next;
  document.documentElement.lang = next;
  try { localStorage.setItem(KEY, next); } catch { /* ignoruj */ }
  applyStatic();
}

/** Uzupełnia statyczne teksty oznaczone atrybutami data-i18n*. */
export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
}
