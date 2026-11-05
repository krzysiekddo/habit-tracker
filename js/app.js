import { firebaseConfig } from "./firebase-config.js";
import {
  toKey, fromKey, today, addDays, startOfWeek, isoWeek, isoDow,
  DOW_LONG, DOW_SHORT, DOW_LETTER, monthGen, monthNom, rangeLabel,
} from "./dates.js";

const useFirebase = Boolean(firebaseConfig.apiKey);
const MONTH_SHORT = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const store = await import(useFirebase ? "./store-firebase.js" : "./store-local.js");

// ---------- stan ----------
const state = {
  habits: [],
  done: new Set(),
  weekStart: startOfWeek(today()),
  activeIdx: isoDow(today()) - 1,
  editingId: null,
};
let unsubHabits = null;
let unsubDone = null;

// ---------- elementy ----------
const $ = (id) => document.getElementById(id);
const el = {
  auth: $("auth"), app: $("app"), signIn: $("sign-in"), signOut: $("sign-out"), authError: $("auth-error"),
  issueNo: $("issue-no"), issueDate: $("issue-date"), progress: $("week-progress"),
  weekLabel: $("week-label"), weekRange: $("week-range"),
  prev: $("prev-week"), next: $("next-week"), todayBtn: $("today-btn"),
  add: $("add-btn"), add2: $("add-btn-2"), fab: $("fab"),
  strip: $("strip"), week: $("week"), index: $("index-list"), modeNote: $("mode-note"),
  dialog: $("habit-dialog"), form: $("habit-form"), name: $("habit-name"),
  picker: $("days-picker"), kicker: $("dialog-kicker"), title: $("dialog-title"),
  close: $("dialog-close"), cancel: $("cancel-btn"), del: $("delete-btn"), formError: $("form-error"),
  oneoff: $("oneoff-input"), dateField: $("date-field"), date: $("event-date"), daysField: $("days-field"),
};

const mobileMq = window.matchMedia("(max-width: 760px)");
const isMobile = () => mobileMq.matches;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const weekDates = () => Array.from({ length: 7 }, (_, i) => addDays(state.weekStart, i));

const isEvent = (h) => Boolean(h.date);

const habitsFor = (date) => {
  const key = toKey(date);
  const dow = isoDow(date);
  const habits = state.habits.filter((h) => !isEvent(h) && (h.days || []).includes(dow) && (!h.start || key >= h.start));
  const events = state.habits.filter((h) => isEvent(h) && h.date === key);
  return [...habits, ...events];
};

// ---------- autoryzacja ----------
store.init((user) => {
  if (user) {
    el.auth.hidden = true;
    el.app.hidden = false;
    el.fab.hidden = false;
    el.signOut.hidden = !useFirebase;
    el.modeNote.textContent = useFirebase
      ? `Zalogowano: ${user.email || user.displayName || "—"}`
      : "Tryb lokalny — dane zapisują się tylko w tej przeglądarce.";
    start();
  } else {
    stop();
    el.app.hidden = true;
    el.fab.hidden = true;
    el.auth.hidden = false;
    el.signOut.hidden = true;
    el.modeNote.textContent = "";
  }
});

el.signIn.addEventListener("click", async () => {
  el.authError.textContent = "";
  try { await store.signIn(); }
  catch (e) { el.authError.textContent = "Nie udało się zalogować. " + (e?.code || ""); }
});
el.signOut.addEventListener("click", () => store.signOut());

function start() {
  stop();
  unsubHabits = store.watchHabits((list) => { state.habits = list; render(); });
  subscribeWeek();
  renderHeader();
  requestAnimationFrame(() => scrollToActive(false));
}

function stop() {
  unsubHabits?.(); unsubHabits = null;
  unsubDone?.(); unsubDone = null;
}

function subscribeWeek() {
  unsubDone?.();
  const from = toKey(state.weekStart);
  const to = toKey(addDays(state.weekStart, 6));
  unsubDone = store.watchDone(from, to, (set) => { state.done = set; render(); });
}

// ---------- render ----------
function renderHeader() {
  const thu = addDays(state.weekStart, 3);
  el.issueNo.textContent = `Nr ${isoWeek(thu)}`;
  el.issueDate.textContent = `${monthNom(thu)} ${thu.getFullYear()}`;
  el.weekRange.textContent = rangeLabel(state.weekStart);

  const diff = Math.round((state.weekStart - startOfWeek(today())) / (7 * 86400000));
  el.weekLabel.textContent =
    diff === 0 ? "Ten tydzień" :
    diff === -1 ? "Poprzedni tydzień" :
    diff === 1 ? "Następny tydzień" :
    `Tydzień ${isoWeek(thu)}`;
  el.todayBtn.disabled = diff === 0 && state.activeIdx === isoDow(today()) - 1;

  // postęp tygodnia pod winietą
  let done = 0, total = 0;
  for (const d of weekDates()) { const st = dayStats(d); done += st.done; total += st.total; }
  el.progress.innerHTML = total
    ? `${esc(el.weekLabel.textContent)}: <strong>${done}</strong> z <strong>${total}</strong> wykonane`
    : `${esc(el.weekLabel.textContent)}: brak zaplanowanych nawyków`;
}

function render() {
  renderHeader();
  renderWeek();
  renderStrip();
  renderIndex();
}

function dayStats(date) {
  const key = toKey(date);
  const hs = habitsFor(date);
  const done = hs.filter((h) => state.done.has(`${h.id}|${key}`)).length;
  return { hs, done, total: hs.length, key };
}

function renderWeek() {
  const tKey = toKey(today());
  const scroll = el.week.scrollLeft;
  const focusedKey = document.activeElement?.dataset?.k;

  el.week.innerHTML = weekDates().map((d, i) => {
    const { hs, done, total, key } = dayStats(d);
    const cls = ["day"];
    if (key === tKey) cls.push("is-today");
    if (total && done === total) cls.push("is-complete");

    const items = hs.map((h) => {
      const k = `${h.id}|${key}`;
      const on = state.done.has(k);
      return `<li><button class="habit" type="button" aria-pressed="${on}" data-k="${esc(k)}">
        <span class="box" aria-hidden="true"></span><span class="habit-name">${esc(h.name)}${isEvent(h) ? `<span class="habit-tag">Wydarzenie</span>` : ""}</span></button></li>`;
    }).join("");

    return `<section class="${cls.join(" ")}" data-idx="${i}" aria-label="${DOW_LONG[i]} ${d.getDate()} ${monthGen(d)}">
      <header class="day-head">
        <span class="day-dow">${DOW_LONG[i]}</span>
        <span class="day-num">${d.getDate()}</span>
        <span class="day-month">${monthGen(d)}</span>
        ${total ? `<span class="day-count">${done}/${total}</span>` : ""}
      </header>
      ${total ? `<ul class="habits">${items}</ul>` : `<p class="day-empty">${state.habits.length ? "Dzień wolny." : "Brak nawyków."}</p>`}
    </section>`;
  }).join("");

  el.week.scrollLeft = scroll;
  if (focusedKey) el.week.querySelector(`[data-k="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

function renderStrip() {
  const tKey = toKey(today());
  el.strip.innerHTML = weekDates().map((d, i) => {
    const { done, total, key } = dayStats(d);
    const cls = ["strip-day"];
    if (key === tKey) cls.push("is-today");
    if (total && done === total) cls.push("is-complete");
    return `<button class="${cls.join(" ")}" type="button" role="tab" data-idx="${i}" aria-selected="${i === state.activeIdx}"
      aria-label="${DOW_LONG[i]} ${d.getDate()}">
      <span class="strip-dow">${DOW_SHORT[i]}</span><span class="strip-num">${d.getDate()}</span></button>`;
  }).join("");
}

function renderIndex() {
  if (!state.habits.length) {
    el.index.innerHTML = `<li class="index-empty">Spis jest pusty. Dodaj pierwszy nawyk — wystarczy nazwa i dni.</li>`;
    return;
  }
  const habits = state.habits.filter((h) => !isEvent(h));
  const tKey = toKey(today());
  const events = state.habits.filter(isEvent).sort((x, y) => x.date.localeCompare(y.date));
  // nadchodzące najpierw, minione na końcu
  const upcoming = events.filter((h) => h.date >= tKey);
  const past = events.filter((h) => h.date < tKey).reverse();

  const habitRow = (h, i) => `
    <li class="index-row">
      <span class="index-no">${String(i + 1).padStart(2, "0")}</span>
      <span class="index-name">${esc(h.name)}</span>
      <span class="index-days" aria-label="Dni: ${h.days.map((d) => DOW_SHORT[d - 1]).join(", ")}">
        ${DOW_LETTER.map((l, j) => `<span class="${h.days.includes(j + 1) ? "on" : "off"}" aria-hidden="true">${l}</span>`).join("")}
      </span>
      <button class="btn btn-sm" type="button" data-edit="${esc(h.id)}">Edytuj</button>
    </li>`;

  const eventRow = (h) => {
    const d = fromKey(h.date);
    return `
    <li class="index-row ${h.date < tKey ? "is-past" : ""}">
      <span class="index-no index-date"><b>${d.getDate()}</b>${MONTH_SHORT[d.getMonth()]}</span>
      <span class="index-name">${esc(h.name)}</span>
      <span class="index-when">${DOW_LONG[isoDow(d) - 1]}${d.getFullYear() !== today().getFullYear() ? " " + d.getFullYear() : ""}</span>
      <button class="btn btn-sm" type="button" data-edit="${esc(h.id)}">Edytuj</button>
    </li>`;
  };

  let html = habits.map(habitRow).join("");
  if (!habits.length) html += `<li class="index-empty">Brak stałych nawyków.</li>`;
  if (events.length) {
    html += `<li class="index-sub">Wydarzenia</li>`;
    html += [...upcoming, ...past].map(eventRow).join("");
  }
  el.index.innerHTML = html;
}

// ---------- odhaczanie ----------
el.week.addEventListener("click", (e) => {
  const btn = e.target.closest(".habit");
  if (!btn) return;
  const k = btn.dataset.k;
  const sep = k.lastIndexOf("|");
  const habitId = k.slice(0, sep);
  const date = k.slice(sep + 1);
  const next = !state.done.has(k);
  // natychmiastowa reakcja interfejsu
  if (next) state.done.add(k); else state.done.delete(k);
  render();
  if (navigator.vibrate && isMobile()) navigator.vibrate(8);
  Promise.resolve(store.setDone(habitId, date, next)).catch((err) => console.error("Zapis nieudany", err));
});

// ---------- nawigacja tygodnia ----------
function goWeek(delta) {
  state.weekStart = addDays(state.weekStart, delta * 7);
  const isThisWeek = toKey(state.weekStart) === toKey(startOfWeek(today()));
  state.activeIdx = isThisWeek ? isoDow(today()) - 1 : 0;
  subscribeWeek();
  render();
  scrollToActive(false);
}
el.prev.addEventListener("click", () => goWeek(-1));
el.next.addEventListener("click", () => goWeek(1));
el.todayBtn.addEventListener("click", () => {
  state.weekStart = startOfWeek(today());
  state.activeIdx = isoDow(today()) - 1;
  subscribeWeek();
  render();
  scrollToActive(true);
});

// ---------- widok jednego dnia (telefon) ----------
function scrollToActive(smooth) {
  if (!isMobile()) return;
  const card = el.week.children[state.activeIdx];
  if (!card) return;
  el.week.scrollTo({ left: card.offsetLeft - el.week.children[0].offsetLeft, behavior: smooth ? "smooth" : "auto" });
}

el.strip.addEventListener("click", (e) => {
  const b = e.target.closest(".strip-day");
  if (!b) return;
  state.activeIdx = Number(b.dataset.idx);
  renderStrip();
  renderHeader();
  scrollToActive(true);
});

let scrollRaf = 0;
el.week.addEventListener("scroll", () => {
  if (!isMobile()) return;
  cancelAnimationFrame(scrollRaf);
  scrollRaf = requestAnimationFrame(() => {
    const first = el.week.children[0];
    const second = el.week.children[1];
    if (!first || !second) return;
    const step = second.offsetLeft - first.offsetLeft;
    const idx = Math.max(0, Math.min(6, Math.round(el.week.scrollLeft / step)));
    if (idx !== state.activeIdx) {
      state.activeIdx = idx;
      renderStrip();
      renderHeader();
    }
  });
}, { passive: true });

// Przesunięcie poza ostatni / pierwszy dzień przełącza tydzień.
let touchX = null;
el.week.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
el.week.addEventListener("touchend", (e) => {
  if (touchX == null || !isMobile()) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  const max = el.week.scrollWidth - el.week.clientWidth;
  if (dx < -70 && state.activeIdx === 6 && el.week.scrollLeft >= max - 2) goWeek(1);
  else if (dx > 70 && state.activeIdx === 0 && el.week.scrollLeft <= 2) {
    goWeek(-1);
    state.activeIdx = 6; render(); scrollToActive(false);
  }
}, { passive: true });

mobileMq.addEventListener("change", () => scrollToActive(false));

// ---------- okno nawyku ----------
let pickedDays = new Set();

function renderPicker() {
  el.picker.innerHTML = DOW_SHORT.map((l, i) =>
    `<button type="button" class="day-toggle" data-d="${i + 1}" aria-pressed="${pickedDays.has(i + 1)}" aria-label="${DOW_LONG[i]}">${l}</button>`
  ).join("");
}

el.picker.addEventListener("click", (e) => {
  const b = e.target.closest(".day-toggle");
  if (!b) return;
  const d = Number(b.dataset.d);
  pickedDays.has(d) ? pickedDays.delete(d) : pickedDays.add(d);
  renderPicker();
});

el.form.querySelector(".presets").addEventListener("click", (e) => {
  const b = e.target.closest("[data-preset]");
  if (!b) return;
  pickedDays = new Set(b.dataset.preset.split(",").map(Number));
  renderPicker();
});

// domyślna data wydarzenia: dzień oglądany na telefonie, na komputerze dziś (albo poniedziałek oglądanego tygodnia)
function defaultEventDate() {
  const week = weekDates();
  if (isMobile()) return toKey(week[state.activeIdx]);
  const t = toKey(today());
  return week.some((d) => toKey(d) === t) ? t : toKey(week[0]);
}

function syncDialogMode() {
  const ev = el.oneoff.checked;
  const editing = Boolean(state.editingId);
  el.dateField.hidden = !ev;
  el.daysField.hidden = ev;
  el.kicker.textContent = editing ? "Korekta" : ev ? "Jednorazowo" : "Nowa rubryka";
  el.title.textContent = editing
    ? (ev ? "Edytuj wydarzenie" : "Edytuj nawyk")
    : (ev ? "Dodaj wydarzenie" : "Dodaj nawyk");
  el.name.placeholder = ev ? "np. Wizyta u dentysty" : "np. Poranny spacer";
  el.formError.textContent = "";
}
el.oneoff.addEventListener("change", syncDialogMode);

function openDialog(habit = null) {
  state.editingId = habit?.id ?? null;
  el.name.value = habit?.name ?? "";
  const ev = habit ? isEvent(habit) : false;
  pickedDays = new Set(habit && !ev ? habit.days : [1, 2, 3, 4, 5, 6, 7]);
  el.oneoff.checked = ev;
  el.date.value = ev ? habit.date : defaultEventDate();
  syncDialogMode();
  el.del.hidden = !habit;
  disarmDelete();
  el.formError.textContent = "";
  renderPicker();
  el.dialog.showModal();
  if (!isMobile()) el.name.focus();
}

const closeDialog = () => el.dialog.close();

[el.add, el.add2, el.fab].forEach((b) => b.addEventListener("click", () => openDialog()));
el.close.addEventListener("click", closeDialog);
el.cancel.addEventListener("click", closeDialog);
el.dialog.addEventListener("click", (e) => { if (e.target === el.dialog) closeDialog(); });

el.index.addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (!b) return;
  const h = state.habits.find((x) => x.id === b.dataset.edit);
  if (h) openDialog(h);
});

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.name.value.trim().replace(/\s+/g, " ");
  const ev = el.oneoff.checked;
  const days = [...pickedDays].sort((a, b) => a - b);
  if (!name) { el.formError.textContent = ev ? "Nadaj wydarzeniu nazwę." : "Nadaj nawykowi nazwę."; el.name.focus(); return; }
  if (ev && !/^\d{4}-\d{2}-\d{2}$/.test(el.date.value)) { el.formError.textContent = "Wybierz datę wydarzenia."; return; }
  if (!ev && !days.length) { el.formError.textContent = "Wybierz przynajmniej jeden dzień."; return; }

  const fields = ev
    ? { name, date: el.date.value, days: [] }
    // nowy nawyk obowiązuje od poniedziałku bieżącego tygodnia (żeby dało się uzupełnić ostatnie dni)
    : { name, days, date: null };
  const prev = state.habits.find((h) => h.id === state.editingId);
  if (prev && !ev && isEvent(prev)) fields.start = toKey(startOfWeek(today()));
  const op = state.editingId
    ? store.updateHabit(state.editingId, fields)
    : store.addHabit(ev ? fields : { ...fields, start: toKey(startOfWeek(today())) });
  Promise.resolve(op).catch((err) => console.error("Zapis nieudany", err));
  closeDialog();

  // po dodaniu wydarzenia pokaż tydzień i dzień, na który wypada
  if (ev) {
    const d = fromKey(fields.date);
    const ws = startOfWeek(d);
    const changed = toKey(ws) !== toKey(state.weekStart);
    state.weekStart = ws;
    state.activeIdx = isoDow(d) - 1;
    if (changed) subscribeWeek();
    render();
    scrollToActive(!changed);
  }
});

let armTimer = 0;
function disarmDelete() {
  clearTimeout(armTimer);
  el.del.classList.remove("armed");
  el.del.textContent = "Usuń";
}
el.del.addEventListener("click", () => {
  if (!el.del.classList.contains("armed")) {
    el.del.classList.add("armed");
    el.del.textContent = "Na pewno?";
    armTimer = setTimeout(disarmDelete, 3000);
    return;
  }
  const id = state.editingId;
  disarmDelete();
  closeDialog();
  Promise.resolve(store.deleteHabit(id)).catch((err) => console.error("Usuwanie nieudane", err));
});

// ---------- odświeżenie o północy / po powrocie do aplikacji ----------
let lastDay = toKey(today());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const now = toKey(today());
  if (now !== lastDay) {
    lastDay = now;
    state.weekStart = startOfWeek(today());
    state.activeIdx = isoDow(today()) - 1;
    subscribeWeek();
    render();
    scrollToActive(false);
  }
});

// ---------- blokada zoomu (iOS ignoruje user-scalable=no w Safari) ----------
["gesturestart", "gesturechange", "gestureend"].forEach((t) =>
  document.addEventListener(t, (e) => e.preventDefault(), { passive: false })
);

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
