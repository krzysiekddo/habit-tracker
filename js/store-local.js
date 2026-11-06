// Magazyn lokalny (localStorage) — ten sam interfejs co store-firebase.js.

const KEY = "nawyki:v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { habits: d.habits || [], done: d.done || {}, todos: d.todos || [] };
    }
  } catch { /* brak dostępu do pamięci — działamy w RAM */ }
  return { habits: [], done: {}, todos: [] };
}

let data = load();
const habitListeners = new Set();
const doneListeners = new Set();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignoruj */ }
  emit();
}

const todoListeners = new Set();
function emitTodos() { const list = [...data.todos]; todoListeners.forEach((cb) => cb(list)); }

function emit() {
  emitTodos();
  const habits = [...data.habits].sort((a, b) => a.order - b.order);
  habitListeners.forEach((cb) => cb(habits));
  doneListeners.forEach((l) => l.cb(doneSet(l.from, l.to)));
}

function doneSet(from, to) {
  const s = new Set();
  for (const k of Object.keys(data.done)) {
    const date = k.slice(k.lastIndexOf("|") + 1);
    if (date >= from && date <= to) s.add(k);
  }
  return s;
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) { data = load(); emit(); }
});

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const mode = "local";

export function init(onUser) {
  onUser({ displayName: null, local: true });
}

export async function signIn() {}
export async function signOut() {}

export function watchHabits(cb) {
  habitListeners.add(cb);
  cb([...data.habits].sort((a, b) => a.order - b.order));
  return () => habitListeners.delete(cb);
}

export function watchDone(from, to, cb) {
  const l = { from, to, cb };
  doneListeners.add(l);
  cb(doneSet(from, to));
  return () => doneListeners.delete(l);
}

export async function getDone(from, to) { return doneSet(from, to); }

export async function addHabit(fields) {
  const order = data.habits.reduce((m, h) => Math.max(m, h.order), 0) + 1;
  data.habits.push({ ...fields, id: uid(), order });
  save();
}

export async function updateHabit(id, patch) {
  const h = data.habits.find((x) => x.id === id);
  if (h) Object.assign(h, patch);
  save();
}

export async function reorderHabits(ids) {
  ids.forEach((id, i) => { const h = data.habits.find((x) => x.id === id); if (h) h.order = i + 1; });
  save();
}

export async function deleteHabit(id) {
  data.habits = data.habits.filter((h) => h.id !== id);
  for (const k of Object.keys(data.done)) if (k.startsWith(id + "|")) delete data.done[k];
  save();
}

export async function setDone(habitId, date, done) {
  const k = `${habitId}|${date}`;
  if (done) data.done[k] = 1; else delete data.done[k];
  save();
}

// ---------- szybkie zadania (jednorazowe: odhaczenie = usunięcie) ----------
export function watchTodos(cb) {
  todoListeners.add(cb);
  cb([...data.todos]);
  return () => todoListeners.delete(cb);
}
export async function addTodo(text) {
  data.todos.push({ id: uid(), text, created: Date.now() });
  save();
}
export async function completeTodo(id) {
  data.todos = data.todos.filter((x) => x.id !== id);
  save();
}
