// Magazyn w chmurze: Firebase Auth (Google) + Firestore z pamięcią offline.
// Struktura danych:
//   users/{uid}/habits/{habitId}          { name, days:[1..7], start:"RRRR-MM-DD", order }
//                                         wydarzenie jednorazowe: { name, date:"RRRR-MM-DD", days:[], order }
//   users/{uid}/done/{habitId}_{date}     { habitId, date:"RRRR-MM-DD" }

import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc,
  query, where, getDocs, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

let user = null;
let cachedOrder = 0;

const habitsCol = () => collection(db, "users", user.uid, "habits");
const doneCol = () => collection(db, "users", user.uid, "done");

export const mode = "firebase";

export function init(onUser) {
  onAuthStateChanged(auth, (u) => {
    user = u;
    onUser(u ? { displayName: u.displayName, email: u.email } : null);
  });
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // Gdy przeglądarka blokuje okienka (np. aplikacja na ekranie głównym) — przekierowanie.
    if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (e && e.code === "auth/popup-closed-by-user") return;
    throw e;
  }
}

export async function signOut() {
  await fbSignOut(auth);
}

export function watchHabits(cb) {
  return onSnapshot(habitsCol(), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    cachedOrder = list.reduce((m, h) => Math.max(m, h.order ?? 0), 0);
    cb(list);
  });
}

export function watchDone(from, to, cb) {
  const q = query(doneCol(), where("date", ">=", from), where("date", "<=", to));
  return onSnapshot(q, (snap) => {
    const s = new Set();
    snap.forEach((d) => { const x = d.data(); s.add(`${x.habitId}|${x.date}`); });
    cb(s);
  });
}

export async function getDone(from, to) {
  const snap = await getDocs(query(doneCol(), where("date", ">=", from), where("date", "<=", to)));
  const s = new Set();
  snap.forEach((d) => { const x = d.data(); s.add(`${x.habitId}|${x.date}`); });
  return s;
}

// Zapisów nie „czekamy” w UI — Firestore pokazuje zmianę od razu i dosyła ją,
// gdy jest internet. Dlatego funkcje zwracają obietnicę, ale app jej nie blokuje.

export function addHabit(fields) {
  const ref = doc(habitsCol());
  cachedOrder += 1;
  return setDoc(ref, { ...fields, order: cachedOrder });
}

export function updateHabit(id, patch) {
  return updateDoc(doc(habitsCol(), id), patch);
}

export function reorderHabits(ids) {
  const batch = writeBatch(db);
  ids.forEach((id, i) => batch.update(doc(habitsCol(), id), { order: i + 1 }));
  return batch.commit();
}

export async function deleteHabit(id) {
  await deleteDoc(doc(habitsCol(), id));
  const snap = await getDocs(query(doneCol(), where("habitId", "==", id)));
  let batch = writeBatch(db);
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    if (++n % 450 === 0) { await batch.commit(); batch = writeBatch(db); }
  }
  await batch.commit();
}

export function setDone(habitId, date, done) {
  const ref = doc(doneCol(), `${habitId}_${date}`);
  return done ? setDoc(ref, { habitId, date }) : deleteDoc(ref);
}

// ---------- szybkie zadania: users/{uid}/todos/{id} { text, created } ----------
const todosCol = () => collection(db, "users", user.uid, "todos");
export function watchTodos(cb) {
  return onSnapshot(todosCol(), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.created ?? 0) - (b.created ?? 0));
    cb(list);
  });
}
export function addTodo(text) {
  return setDoc(doc(todosCol()), { text, created: Date.now() });
}
export function completeTodo(id) {
  return deleteDoc(doc(todosCol(), id));
}
