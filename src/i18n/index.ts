import { loadSave, writeSave } from '../services/SaveService';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr, type Dict, type TextKey } from './fr';
import { it } from './it';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { ro } from './ro';
import { ru } from './ru';
import { tr } from './tr';

/**
 * TRADUCTIONS
 * -----------
 * `t('cle', { n: 3 })` renvoie le texte dans la langue choisie.
 * Ajouter une langue : copier fr.ts, traduire, puis l'ajouter à LANGS.
 */
export type Lang = 'fr' | 'en' | 'ru' | 'es' | 'pt' | 'pl' | 'tr' | 'ro' | 'de' | 'it' | 'nl';

/** Étoile à 5 branches (drapeau turc). */
function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    // Une pointe tournée vers le croissant (à gauche), comme sur le drapeau.
    const a = Math.PI + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.4 : r;
    pts.push(`${(cx + Math.cos(a) * d).toFixed(2)},${(cy + Math.sin(a) * d).toFixed(2)}`);
  }
  return pts.join(' ');
}

const flag = (inner: string): string =>
  `<svg class="flag" viewBox="0 0 30 20" aria-hidden="true" preserveAspectRatio="none">${inner}</svg>`;
/** États-Unis : 13 bandes, canton bleu semé d'étoiles (points). */
const US_FLAG = (() => {
  const h = 20 / 13;
  let s = '<rect width="30" height="20" fill="#FFFFFF"/>';
  for (let i = 0; i < 13; i += 2) s += `<rect y="${(i * h).toFixed(3)}" width="30" height="${h.toFixed(3)}" fill="#B22234"/>`;
  s += `<rect width="12" height="${(7 * h).toFixed(3)}" fill="#3C3B6E"/>`;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      if (r % 2 === 1 && c === 5) continue;
      const x = 1.1 + c * 1.95 + (r % 2 ? 0.97 : 0);
      s += `<circle cx="${x.toFixed(2)}" cy="${(1.1 + r * 2.05).toFixed(2)}" r="0.42" fill="#FFFFFF"/>`;
    }
  }
  return s;
})();

/** Portugal : vert et rouge, sphère armillaire simplifiée. */
const PT_FLAG =
  '<rect width="30" height="20" fill="#DA291C"/><rect width="12" height="20" fill="#046A38"/><circle cx="12" cy="10" r="3.6" fill="#FFE900"/><circle cx="12" cy="10" r="2.2" fill="#DA291C"/>';

/** Brésil : losange jaune, globe bleu et bande blanche. */
const BR_FLAG =
  '<rect width="30" height="20" fill="#009C3B"/><polygon points="2.6,10 15,2.2 27.4,10 15,17.8" fill="#FFDF00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.6 9.1Q15 7.6 19.5 10.9" stroke="#FFFFFF" stroke-width="0.9" fill="none"/>';

const vert = (a: string, b: string, c: string): string =>
  flag(`<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`);
const horiz = (a: string, b: string, c: string): string =>
  flag(`<rect width="30" height="6.67" fill="${a}"/><rect y="6.67" width="30" height="6.67" fill="${b}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>`);

export const LANGS: Array<{ code: Lang; name: string; locale: string; flag: string; dict: Dict }> = [
  { code: 'fr', name: 'Français', locale: 'fr-FR', dict: fr, flag: vert('#0055A4', '#FFFFFF', '#EF4135') },
  {
    code: 'en',
    name: 'English',
    locale: 'en-US',
    dict: en,
    flag: flag(US_FLAG),
  },
  { code: 'ru', name: 'Русский', locale: 'ru-RU', dict: ru, flag: horiz('#FFFFFF', '#0039A6', '#D52B1E') },
  {
    code: 'es',
    name: 'Español',
    locale: 'es-ES',
    dict: es,
    flag: flag('<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>'),
  },
  {
    code: 'pt',
    name: 'Português',
    locale: 'pt-PT',
    dict: pt,
    // Portugal et Brésil, côte à côte.
    flag: `<span class="flag-pair">${flag(PT_FLAG)}${flag(BR_FLAG)}</span>`,
  },
  {
    code: 'pl',
    name: 'Polski',
    locale: 'pl-PL',
    dict: pl,
    flag: flag('<rect width="30" height="10" fill="#FFFFFF"/><rect y="10" width="30" height="10" fill="#DC143C"/>'),
  },
  {
    code: 'tr',
    name: 'Türkçe',
    locale: 'tr-TR',
    dict: tr,
    flag: flag(
      `<rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#FFF"/><circle cx="12.3" cy="10" r="4" fill="#E30A17"/><polygon points="${star(17, 10, 2.4)}" fill="#FFF"/>`,
    ),
  },
  { code: 'ro', name: 'Română', locale: 'ro-RO', dict: ro, flag: vert('#002B7F', '#FCD116', '#CE1126') },
  { code: 'de', name: 'Deutsch', locale: 'de-DE', dict: de, flag: horiz('#000000', '#DD0000', '#FFCE00') },
  { code: 'it', name: 'Italiano', locale: 'it-IT', dict: it, flag: vert('#009246', '#FFFFFF', '#CE2B37') },
  { code: 'nl', name: 'Nederlands', locale: 'nl-NL', dict: nl, flag: horiz('#AE1C28', '#FFFFFF', '#21468B') },
];

const byCode = new Map(LANGS.map((l) => [l.code, l]));

/** Langue de départ : celle choisie, sinon celle du navigateur, sinon le français. */
function initialLang(): Lang {
  const saved = loadSave().lang;
  if (saved && byCode.has(saved as Lang)) return saved as Lang;
  for (const pref of navigator.languages ?? [navigator.language]) {
    const code = String(pref).slice(0, 2).toLowerCase() as Lang;
    if (byCode.has(code)) return code;
  }
  return 'fr';
}

let current = initialLang();
const listeners: Array<() => void> = [];

export const lang = (): Lang => current;
export const langInfo = (code: Lang = current) => byCode.get(code)!;

export function setLang(code: Lang): void {
  if (!byCode.has(code) || code === current) return;
  current = code;
  writeSave({ lang: code });
  document.documentElement.lang = code;
  for (const fn of listeners) fn();
}

/** Appelé à chaque changement de langue. */
export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

type Vars = Record<string, string | number>;

export function t(key: TextKey, vars?: Vars): string {
  const raw = (langInfo().dict[key] ?? fr[key]) as string;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : raw;
}

/** Nombre au format de la langue (séparateur des milliers). */
export const num = (n: number): string => Number(n).toLocaleString(langInfo().locale);

/** Pourcentage au format de la langue (« 70 % », « 70% », « %70 »). */
export const pct = (n: number): string => t('pct', { n });

/** Titre traduit d'un niveau (index à partir de 0). */
export const levelTitle = (index: number): string => langInfo().dict.levels[index] ?? fr.levels[index] ?? '';

/** Échappe un texte destiné à du HTML. */
export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Met à jour les textes fixes de la page :
 *   data-i18n="cle"            → texte
 *   data-i18n-aria="cle"       → aria-label
 *   data-i18n-title="cle"      → title
 *   data-i18n-placeholder="cle"→ placeholder
 */
export function applyStatic(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const text = t(el.dataset.i18n as TextKey);
    if (text.includes('\n')) el.innerHTML = esc(text).replace(/\n/g, '<br />');
    else el.textContent = text;
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as TextKey));
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as TextKey);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as TextKey);
  });
  document.documentElement.lang = current;
}
