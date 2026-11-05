// Lista motywów. Każdy wpis musi mieć swój blok w css/themes.css ([data-skin="id"] + wersja ciemna).
export const SKINS = [
  { id: "gazeta",   name: { pl: "Gazeta",   en: "Newspaper" }, desc: { pl: "Czerń i biel, grube ramki",       en: "Black & white, heavy frames" } },
  { id: "marker",   name: { pl: "Marker",   en: "Marker" },    desc: { pl: "Żółty zakreślacz, wersaliki",     en: "Yellow highlighter, all caps" } },
  { id: "szklo",    name: { pl: "Szkło",    en: "Glass" },     desc: { pl: "Nowy Jork w tle, szkło jak w iOS", en: "New York backdrop, iOS-like glass" } },
  { id: "pastel",   name: { pl: "Pastel",   en: "Pastel" },    desc: { pl: "Zaokrąglony, miękkie kolory",     en: "Rounded, soft colors" } },
];
export const DEFAULT_SKIN = "gazeta";
