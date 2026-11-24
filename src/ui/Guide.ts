import { BUBBLE_COLORS } from '../config/gameConfig';
import { LEVELS } from '../data/levels';
import { esc, pct, t } from '../i18n';
import { aimDemo, HAND_SVG, matchDemo } from './Tutorial';

/**
 * « Comment jouer » : toutes les règles, illustrées, consultables à tout
 * moment depuis la carte des niveaux.
 */
const GOLD_WALL = '<i class="g-wall"></i>';

function ballImg(src: string | undefined, color: number): string {
  if (src) return `<img class="g-ball" src="${src}" alt="" draggable="false" />`;
  const tint = `#${BUBBLE_COLORS[color % BUBBLE_COLORS.length].tint.toString(16).padStart(6, '0')}`;
  return `<i class="g-ball dot" style="background:${tint}"></i>`;
}

export function renderGuide(container: HTMLElement, bubbles: string[] | undefined, photo: string): void {
  const b = (i: number): string => ballImg(bubbles?.[i], i);
  const first = LEVELS[0];
  const sections: Array<[string, string, string]> = [
    [
      t('guide.goal.t'),
      matchDemo(bubbles?.[2], photo),
      t('guide.goal.p', { p: pct(first.objective.revealPercent) }),
    ],
    [
      t('guide.aim.t'),
      aimDemo(),
      t('guide.aim.p'),
    ],
    [
      t('guide.match.t'),
      `<div class="g-row">${b(0)}${b(0)}${b(0)}<span class="g-eq">=</span><span class="g-pop">💥</span></div>`,
      t('guide.match.p'),
    ],
    [
      t('guide.fall.t'),
      `<div class="g-row g-fall">${b(1)}${b(3)}${b(4)}</div>`,
      t('guide.fall.p'),
    ],
    [
      t('guide.walls.t'),
      `<div class="g-row">${GOLD_WALL}<span class="g-eq">↗ ↖</span></div>`,
      t('guide.walls.p'),
    ],
    [
      t('guide.swap.t'),
      `<div class="g-row">${b(5)}<span class="g-eq">⇄</span>${b(2)}<span class="g-timer">3</span></div>`,
      t('guide.swap.p'),
    ],
    [
      t('guide.shots.t'),
      '<div class="g-row"><span class="g-shots">● 24</span><span class="g-line"></span></div>',
      t('guide.shots.p'),
    ],
    [
      t('guide.stars.t'),
      '<div class="g-row g-stars">★★★</div>',
      t('guide.stars.p'),
    ],
    [
      t('guide.more.t'),
      `<div class="g-row">${HAND_SVG}</div>`,
      t('guide.more.p'),
    ],
  ];
  container.innerHTML = sections
    .map(
      ([title, visual, text]) => `<section class="g-sec">
        <h4>${esc(title)}</h4>
        <div class="g-visual">${visual}</div>
        <p>${esc(text)}</p>
      </section>`,
    )
    .join('');
}
