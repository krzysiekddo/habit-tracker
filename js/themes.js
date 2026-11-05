// Lista motywów. Każdy wpis musi mieć swój blok w css/themes.css ([data-skin="id"] + wersja ciemna).
export const SKINS = [
  { id: "gazeta",   name: { pl: "Gazeta",   en: "Newspaper" }, desc: { pl: "Czerń i biel, grube ramki",       en: "Black & white, heavy frames" } },
  { id: "marker",   name: { pl: "Marker",   en: "Marker" },    desc: { pl: "Żółty zakreślacz, wersaliki",     en: "Yellow highlighter, all caps" } },
  { id: "papier",   name: { pl: "Papier",   en: "Paper" },     desc: { pl: "Kremowy papier, rdzawy akcent",   en: "Cream paper, rust accent" } },
  { id: "terminal", name: { pl: "Terminal", en: "Terminal" },  desc: { pl: "Maszynopis, zielony fosfor",      en: "Monospace, green phosphor" } },
  { id: "pastel",   name: { pl: "Pastel",   en: "Pastel" },    desc: { pl: "Zaokrąglony, lawendowy",          en: "Rounded, lavender" } },
];
export const DEFAULT_SKIN = "gazeta";
