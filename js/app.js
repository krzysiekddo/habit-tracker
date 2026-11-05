import { firebaseConfig } from "./firebase-config.js";
import {
  toKey, fromKey, today, addDays, startOfWeek, isoWeek, isoDow,
  monthGen, monthNom, rangeLabel,
} from "./dates.js";
import { t, N, lang, setLang, applyStatic } from "./i18n.js";
import { SKINS, DEFAULT_SKIN } from "./themes.js";

const useFirebase = Boolean(firebaseConfig.apiKey);
const store = await import(useFirebase ? "./store-firebase.js" : "./store-local.js");

// ---------- animacje ----------
// Elementy są przerysowywane przy każdej zmianie, więc animacjom podajemy ujemne opóźnienie
// równe czasowi, który już minął — dzięki temu nie zaczynają się od nowa przy kolejnym renderze.
const motion = { introStart: 0, knownIds: null, fresh: new Map(), toggled: null };
const now = () => performance.now();
function shiftFor(t0, max) {
  const el = now() - t0;
  return el < max ? `${-Math.round(el)}ms` : null;
}
function tickIntro() {
  if (!motion.introStart) return;
  const s = shiftFor(motion.introStart, 2600);
  if (s) document.documentElement.style.setProperty("--intro-shift", s);
  else { document.documentElement.classList.remove("intro"); motion.introStart = 0; }
}

// animacja wejścia — patrz playIntro()
let introTimer = 0;
let started = false;

// przewijanie programowe kart dnia (telefon) — patrz scrollToActive()
let scrollTarget = null;
let scrollTimer = 0;

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
  strip: $("strip"), week: $("week"), index: $("index-list"), events: $("events-list"), eventsSection: $("events-section"), addEvent: $("add-event-btn"), modeNote: $("mode-note"),
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
      ? t("signedIn", { who: user.email || user.displayName || "—" })
      : t("localMode");
    state.user = user;
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
  catch (e) { el.authError.textContent = t("signInError") + (e?.code || ""); }
});
el.signOut.addEventListener("click", () => store.signOut());

// Odtwarza animację wejścia (przy otwarciu aplikacji i po zmianie motywu).
function playIntro() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  root.classList.remove("intro");
  void root.offsetWidth;              // wymusza ponowne uruchomienie animacji CSS
  motion.introStart = now();
  root.style.setProperty("--intro-shift", "0ms");
  root.classList.add("intro");
  clearTimeout(introTimer);
  introTimer = setTimeout(tickIntro, 2700);
}

function start() {
  if (!started) { started = true; playIntro(); }
  stop();
  unsubHabits = store.watchHabits((list) => {
    const ids = new Set(list.map((h) => h.id));
    if (motion.knownIds) for (const id of ids) if (!motion.knownIds.has(id)) motion.fresh.set(id, now());
    motion.knownIds = ids;
    state.habits = list;
    render();
  });
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
  el.issueNo.textContent = t("issueNo", { n: isoWeek(thu) });
  el.issueDate.textContent = `${monthNom(thu)} ${thu.getFullYear()}`;
  el.weekRange.textContent = rangeLabel(state.weekStart);

  const diff = Math.round((state.weekStart - startOfWeek(today())) / (7 * 86400000));
  el.weekLabel.textContent =
    diff === 0 ? t("thisWeek") :
    diff === -1 ? t("lastWeek") :
    diff === 1 ? t("nextWeek") :
    t("weekN", { n: isoWeek(thu) });
  el.todayBtn.disabled = diff === 0 && state.activeIdx === isoDow(today()) - 1;

  // postęp tygodnia pod winietą
  let done = 0, total = 0;
  for (const d of weekDates()) { const st = dayStats(d); done += st.done; total += st.total; }
  el.progress.innerHTML = total
    ? t("progress", { label: esc(el.weekLabel.textContent), done, total })
    : t("progressNone", { label: esc(el.weekLabel.textContent) });
}

function render() {
  tickIntro();
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
      const fresh = motion.fresh.has(h.id) ? shiftFor(motion.fresh.get(h.id), 1200) : null;
      const just = on && motion.toggled?.k === k ? shiftFor(motion.toggled.t, 900) : null;
      const liAttr = fresh ? ` class="is-new" style="--anim-shift:${fresh}"` : "";
      const btnCls = just ? "habit just-checked" : "habit";
      const btnStyle = just ? ` style="--anim-shift:${just}"` : "";
      return `<li${liAttr}><button class="${btnCls}"${btnStyle} type="button" aria-pressed="${on}" data-k="${esc(k)}">
        <span class="box" aria-hidden="true"></span><span class="habit-name"><span class="habit-text">${esc(h.name)}</span>${isEvent(h) ? `<span class="habit-tag">${t("eventTag")}</span>` : ""}</span></button></li>`;
    }).join("");

    return `<section class="${cls.join(" ")}" style="--i:${3 + i}" data-idx="${i}" aria-label="${N().long[i]} ${d.getDate()} ${monthGen(d)}">
      <header class="day-head">
        <span class="day-dow">${N().long[i]}</span>
        <span class="day-num">${d.getDate()}</span>
        <span class="day-month">${monthGen(d)}</span>
        ${total ? `<span class="day-count">${done}/${total}</span>` : ""}
      </header>
      ${total ? `<ul class="habits">${items}</ul>` : `<p class="day-empty">${state.habits.length ? t("dayOff") : t("noHabits")}</p>`}
    </section>`;
  }).join("");

  el.week.scrollLeft = scroll;
  if (scrollTarget != null) el.week.scrollTo({ left: scrollTarget, behavior: "smooth" });
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
      aria-label="${N().long[i]} ${d.getDate()}">
      <span class="strip-dow">${N().short[i]}</span><span class="strip-num">${d.getDate()}</span></button>`;
  }).join("");
}

function renderIndex() {
  if (!state.habits.length) {
    el.index.innerHTML = `<li class="index-empty">${t("indexEmpty")}</li>`;
    el.eventsSection.hidden = true;
    el.events.innerHTML = "";
    return;
  }
  const habits = state.habits.filter((h) => !isEvent(h));
  const tKey = toKey(today());
  const events = state.habits.filter(isEvent).sort((x, y) => x.date.localeCompare(y.date));
  // nadchodzące najpierw, minione na końcu
  const upcoming = events.filter((h) => h.date >= tKey);
  const past = events.filter((h) => h.date < tKey).reverse();

  const freshAttr = (h) => {
    const s = motion.fresh.has(h.id) ? shiftFor(motion.fresh.get(h.id), 1200) : null;
    return s ? ` is-new" style="--anim-shift:${s}` : "";
  };
  const habitRow = (h, i) => `
    <li class="index-row${freshAttr(h)}">
      <span class="index-no">${String(i + 1).padStart(2, "0")}</span>
      <span class="index-name">${esc(h.name)}</span>
      <span class="index-days" aria-label="${t("daysAria", { d: h.days.map((d) => N().short[d - 1]).join(", ") })}">
        ${N().letter.map((l, j) => `<span class="${h.days.includes(j + 1) ? "on" : "off"}" aria-hidden="true">${l}</span>`).join("")}
      </span>
      <button class="btn btn-sm" type="button" data-edit="${esc(h.id)}">${t("edit")}</button>
    </li>`;

  const eventRow = (h) => {
    const d = fromKey(h.date);
    return `
    <li class="index-row ${h.date < tKey ? "is-past" : ""}${freshAttr(h)}">
      <span class="index-no index-date"><b>${d.getDate()}</b>${N().monShort[d.getMonth()]}</span>
      <span class="index-name">${esc(h.name)}</span>
      <span class="index-when">${N().long[isoDow(d) - 1]}${d.getFullYear() !== today().getFullYear() ? " " + d.getFullYear() : ""}</span>
      <button class="btn btn-sm" type="button" data-edit="${esc(h.id)}">${t("edit")}</button>
    </li>`;
  };

  el.index.innerHTML = habits.length
    ? habits.map(habitRow).join("")
    : `<li class="index-empty">${t("noRecurring")}</li>`;
  el.eventsSection.hidden = !events.length;
  el.events.innerHTML = [...upcoming, ...past].map(eventRow).join("");
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
  motion.toggled = next ? { k, t: now() } : null;
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
  const ws = startOfWeek(today());
  const sameWeek = toKey(ws) === toKey(state.weekStart);
  state.weekStart = ws;
  state.activeIdx = isoDow(today()) - 1;
  if (!sameWeek) subscribeWeek();   // ten sam tydzień — bez ponownego pobierania i przerysowania w trakcie przewijania
  render();
  scrollToActive(sameWeek);
});

// ---------- widok jednego dnia (telefon) ----------
// Przewijanie programowe: na czas ruchu wyłączamy przyciąganie kart (scroll-snap-stop zatrzymywało
// przewijanie na pierwszej karcie po drodze) i ignorujemy zdarzenia scroll, które zmieniałyby aktywny dzień.
function scrollToActive(smooth) {
  if (!isMobile()) return;
  const card = el.week.children[state.activeIdx];
  if (!card) return;
  scrollTarget = card.offsetLeft - el.week.children[0].offsetLeft;
  el.week.style.scrollSnapType = "none";
  el.week.scrollTo({ left: scrollTarget, behavior: smooth ? "smooth" : "auto" });
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(finishScroll, smooth ? 700 : 30);
}
function finishScroll() {
  if (scrollTarget == null) return;
  el.week.scrollLeft = scrollTarget;   // na wypadek, gdyby ruch został przerwany
  scrollTarget = null;
  el.week.style.scrollSnapType = "";
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
  if (!isMobile() || scrollTarget != null) return;
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
  el.picker.innerHTML = N().short.map((l, i) =>
    `<button type="button" class="day-toggle" data-d="${i + 1}" aria-pressed="${pickedDays.has(i + 1)}" aria-label="${N().long[i]}">${l}</button>`
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
  el.kicker.textContent = editing ? t("kickerEdit") : ev ? t("kickerOnce") : t("kickerNew");
  el.title.textContent = editing
    ? (ev ? t("titleEditEvent") : t("titleEditHabit"))
    : (ev ? t("titleAddEvent") : t("titleAddHabit"));
  el.name.placeholder = ev ? t("phEvent") : t("phHabit");
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

[el.index, el.events].forEach((list) => list.addEventListener("click", (e) => {
  const b = e.target.closest("[data-edit]");
  if (!b) return;
  const h = state.habits.find((x) => x.id === b.dataset.edit);
  if (h) openDialog(h);
}));
// „+ Dodaj” w sekcji wydarzeń otwiera okno od razu w trybie wydarzenia
el.addEvent.addEventListener("click", () => { openDialog(); el.oneoff.checked = true; syncDialogMode(); });

el.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = el.name.value.trim().replace(/\s+/g, " ");
  const ev = el.oneoff.checked;
  const days = [...pickedDays].sort((a, b) => a - b);
  if (!name) { el.formError.textContent = ev ? t("errNameEvent") : t("errNameHabit"); el.name.focus(); return; }
  if (ev && !/^\d{4}-\d{2}-\d{2}$/.test(el.date.value)) { el.formError.textContent = t("errDate"); return; }
  if (!ev && !days.length) { el.formError.textContent = t("errDays"); return; }

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
  el.del.textContent = t("del");
}
el.del.addEventListener("click", () => {
  if (!el.del.classList.contains("armed")) {
    el.del.classList.add("armed");
    el.del.textContent = t("delSure");
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

// ---------- tryb ciemny ----------
const themeBtn = document.getElementById("theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');
function syncThemeColor() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  if (bg) themeMeta?.setAttribute("content", bg);
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  syncThemeColor();
  if (document.getElementById("skin-dialog").open) renderSkins();
  themeBtn.setAttribute("aria-label", theme === "dark" ? t("toLight") : t("toDark"));
  themeBtn.setAttribute("aria-pressed", String(theme === "dark"));
}
applyTheme(document.documentElement.dataset.theme || "light");
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("habits:theme", next); } catch { /* ignoruj */ }
});

// ---------- motywy ----------
const skinBtn = document.getElementById("skin-toggle");
const skinDialog = document.getElementById("skin-dialog");
const skinList = document.getElementById("skin-list");

function currentSkin() {
  const s = document.documentElement.dataset.skin;
  return SKINS.some((x) => x.id === s) ? s : DEFAULT_SKIN;
}
function applySkin(id) {
  document.documentElement.dataset.skin = id;
  try { localStorage.setItem("habits:skin", id); } catch { /* ignoruj */ }
  syncThemeColor();
}
const glassCtl = document.getElementById("glass-ctl");
const glassRange = document.getElementById("glass-range");
const glassVal = document.getElementById("glass-val");
function readGlass() {
  try { const g = localStorage.getItem("habits:glass"); if (g !== null && !isNaN(+g)) return Math.max(0, Math.min(100, +g)); } catch { /* ignoruj */ }
  return 50;
}
function applyGlass(v, save) {
  document.documentElement.style.setProperty("--glass-t", String(1 - v / 100));
  glassRange.value = String(v);
  glassRange.style.setProperty("--fill", `${v}%`);
  glassVal.textContent = `${v}%`;
  if (save) { try { localStorage.setItem("habits:glass", String(v)); } catch { /* ignoruj */ } }
}
applyGlass(readGlass(), false);
glassRange.addEventListener("input", () => applyGlass(Number(glassRange.value), true));

function renderSkins() {
  glassCtl.hidden = currentSkin() !== "szklo";
  const mode = document.documentElement.dataset.theme || "light";
  const cur = currentSkin();
  const L = document.documentElement.lang === "en" ? "en" : "pl";
  skinList.innerHTML = SKINS.map((s) => `
    <button type="button" class="skin-card" data-skin="${s.id}" data-theme="${mode}" aria-pressed="${s.id === cur}">
      <span class="skin-check" aria-hidden="true">✓</span>
      <span class="skin-sample">Aa</span>
      <span class="skin-row"><span class="box on" aria-hidden="true"></span>${esc(t("skinSample"))}</span>
      <span class="skin-name">${esc(s.name[L])}</span>
      <span class="skin-desc">${esc(s.desc[L])}</span>
    </button>`).join("");
}
skinBtn.addEventListener("click", () => { renderSkins(); skinDialog.showModal(); });
document.getElementById("skin-close").addEventListener("click", () => skinDialog.close());
skinDialog.addEventListener("click", (e) => {
  if (e.target === skinDialog) { skinDialog.close(); return; }
  const card = e.target.closest(".skin-card");
  if (!card) return;
  const changed = card.dataset.skin !== currentSkin();
  applySkin(card.dataset.skin);
  renderSkins();
  if (changed) {
    // zamknij okno i pokaż nowy motyw z jego animacją wejścia (od góry strony)
    skinDialog.close();
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!el.app.hidden) playIntro();
  }
});
if (!SKINS.some((x) => x.id === document.documentElement.dataset.skin)) applySkin(DEFAULT_SKIN);

// ---------- język ----------
const langBtn = document.getElementById("lang-toggle");
function refreshLang() {
  applyStatic();
  langBtn.textContent = t("langBtn");
  langBtn.setAttribute("aria-label", t("langAria"));
  applyTheme(document.documentElement.dataset.theme || "light");
  if (state.user) el.modeNote.textContent = useFirebase
    ? t("signedIn", { who: state.user.email || state.user.displayName || "—" })
    : t("localMode");
  if (skinDialog.open) renderSkins();
  if (el.dialog.open) { syncDialogMode(); if (el.del.classList.contains("armed")) el.del.textContent = t("delSure"); else el.del.textContent = t("del"); renderPicker(); }
  render();
}
langBtn.addEventListener("click", () => {
  setLang(document.documentElement.lang === "pl" ? "en" : "pl");
  refreshLang();
});
refreshLang();

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
