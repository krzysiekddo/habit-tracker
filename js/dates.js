// Pomocnicze funkcje dat — wszystko w czasie lokalnym, tydzień od poniedziałku.

const pad = (n) => String(n).padStart(2, "0");

/** Date -> "RRRR-MM-DD" */
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "RRRR-MM-DD" -> Date (północ lokalnie) */
export const fromKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** 1 = poniedziałek … 7 = niedziela */
export const isoDow = (d) => ((d.getDay() + 6) % 7) + 1;

export const startOfWeek = (d) => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -(isoDow(d) - 1));

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y0) / 86400000 + 1) / 7);
}

import { N, lang } from "./i18n.js";

export const monthGen = (d) => N().monGen[d.getMonth()];
export const monthNom = (d) => N().monNom[d.getMonth()];

/** PL: "2–8 listopada 2026" / EN: "2–8 November 2026" */
export function rangeLabel(start) {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth) return `${start.getDate()}–${end.getDate()} ${monthGen(end)} ${end.getFullYear()}`;
  const left = `${start.getDate()} ${monthGen(start)}${sameYear ? "" : " " + start.getFullYear()}`;
  return `${left} – ${end.getDate()} ${monthGen(end)} ${end.getFullYear()}`;
}
