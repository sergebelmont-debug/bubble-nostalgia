import { LEVELS } from '../data/levels';
import { esc, pct, t } from '../i18n';
import { loadSave, writeSave } from '../services/SaveService';

/**
 * AIDE AUX NOUVEAUX JOUEURS
 * -------------------------
 * Objectif : jouer tout de suite en ayant compris l'essentiel.
 *  • 1re partie : UNE carte animée (3 boules de même couleur → la photo se
 *    dévoile ; glisser pour viser), puis une main animée près du canon
 *    jusqu'au premier tir (sans bloquer le jeu).
 *  • 1er niveau avec des murs : un court bandeau, sans pause.
 *  • Tout le détail reste consultable dans « Comment jouer » (carte des niveaux).
 */
export type Tip = 'intro' | 'murs';

export function tipFor(levelIndex: number): Tip | null {
  const seen = loadSave().tips;
  if (levelIndex === 0 && !seen.includes('intro') && !seen.includes('bases')) return 'intro';
  const firstWalls = LEVELS.findIndex((l) => l.walls?.length);
  if (levelIndex === firstWalls && !seen.includes('murs')) return 'murs';
  return null;
}

function markSeen(tip: Tip): void {
  const tips = loadSave().tips;
  if (!tips.includes(tip)) writeSave({ tips: [...tips, tip] });
}

const $ = (id: string): HTMLElement => document.getElementById(id)!;

/** Main qui pointe (illustration). */
export const HAND_SVG =
  '<svg class="hand" viewBox="0 0 40 50" aria-hidden="true"><path d="M15 5a4 4 0 0 1 8 0v15l9 1.6a5 5 0 0 1 4.2 5.9l-2.4 12.2A6 6 0 0 1 27.9 45H18a6 6 0 0 1-4.9-2.6L5.6 31.6a4 4 0 0 1 6.2-5L15 30z" /></svg>';

/** Boule : image du jeu si disponible, sinon pastille colorée. */
function ball(src: string | undefined, cls = ''): string {
  return src
    ? `<img class="ball ${cls}" src="${src}" alt="" draggable="false" />`
    : `<i class="ball dot ${cls}"></i>`;
}

/** Démonstration animée : 3 boules identiques éclatent, la photo se dévoile. */
export function matchDemo(bubble: string | undefined, photo: string): string {
  return `<div class="demo-match" aria-hidden="true">
    <div class="demo-balls">${ball(bubble, 'b1')}${ball(bubble, 'b2')}${ball(bubble, 'b3')}</div>
    <span class="demo-arrow">→</span>
    <div class="demo-photo"><img src="${photo}" alt="" draggable="false" /><i class="demo-fog"></i></div>
  </div>`;
}

/** Démonstration animée de la visée : trajectoire qui rebondit, doigt qui glisse. */
export function aimDemo(): string {
  return `<div class="demo-aim" aria-hidden="true">
    <svg viewBox="0 0 220 130">
      <rect x="6" y="4" width="208" height="122" rx="10" class="demo-board" />
      <path class="demo-path" d="M110 112 L200 58 L150 12" />
      <circle cx="150" cy="16" r="9" class="demo-target" />
      <circle cx="110" cy="112" r="11" class="demo-cannon" />
    </svg>
    <div class="demo-hand">${HAND_SVG}</div>
  </div>`;
}

/** Carte d'accueil de la toute première partie. */
export function showIntro(opts: { target: number; photo: string; bubble?: string }, onDone: () => void): void {
  const root = $('intro');
  root.innerHTML = `<div class="intro-card" role="dialog" aria-labelledby="intro-title">
    <h3 id="intro-title">${esc(t('intro.title'))}</h3>
    ${matchDemo(opts.bubble, opts.photo)}
    <p class="intro-line">${t('intro.matchHtml')}</p>
    ${aimDemo()}
    <p class="intro-line">${t('intro.aimHtml')}</p>
    <p class="intro-goal">${t('intro.goalHtml', { p: esc(pct(opts.target)) })}</p>
    <button id="btn-intro-go" class="btn primary" type="button">${esc(t('intro.go'))}</button>
  </div>`;
  root.classList.remove('hidden');
  $('btn-intro-go').addEventListener('click', () => {
    root.classList.add('hidden');
    root.innerHTML = '';
    markSeen('intro');
    onDone();
  });
}

/** Main animée près du canon, jusqu'au premier tir. Ne bloque pas le jeu. */
export function showAimHint(): void {
  $('aim-hint').classList.remove('hidden');
}

export function hideAimHint(): void {
  $('aim-hint').classList.add('hidden');
}

let toastTimer = 0;

/** Court bandeau d'information (sans pause). */
export function showWallsTip(): void {
  const toast = $('tip-toast');
  toast.innerHTML = `<b>${esc(t('walls.title'))}</b><span>${esc(t('walls.text'))}</span>`;
  toast.classList.remove('hidden');
  markSeen('murs');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 5000);
}

export function hideTips(): void {
  window.clearTimeout(toastTimer);
  for (const id of ['intro', 'aim-hint', 'tip-toast']) $(id).classList.add('hidden');
}
