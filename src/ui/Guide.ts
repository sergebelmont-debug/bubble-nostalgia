import { BUBBLE_COLORS } from '../config/gameConfig';
import { LEVELS } from '../data/levels';
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
      'Le but',
      matchDemo(bubbles?.[2], photo),
      `Une photographie de Serge Belmont est cachée sous le brouillard. Chaque boule éclatée dissipe le brouillard autour d’elle. Dévoilez le pourcentage demandé (par exemple ${first.objective.revealPercent} % au niveau 1) pour gagner et ajouter la photo à votre Collection.`,
    ],
    [
      'Viser et tirer',
      aimDemo(),
      'Posez le doigt n’importe où sur l’écran et glissez : la ligne pointillée montre le chemin de la boule et le cercle l’endroit exact où elle se posera. Relâchez pour tirer. Pour annuler, ramenez le doigt sous le canon avant de relâcher.',
    ],
    [
      'Associer 3 couleurs',
      `<div class="g-row">${b(0)}${b(0)}${b(0)}<span class="g-eq">=</span><span class="g-pop">💥</span></div>`,
      'Quand la boule tirée touche un groupe de sa couleur et forme au moins 3 boules identiques, tout le groupe éclate. Plus le groupe est grand, plus il rapporte de points.',
    ],
    [
      'Les boules qui tombent',
      `<div class="g-row g-fall">${b(1)}${b(3)}${b(4)}</div>`,
      'Les boules qui ne sont plus reliées au plafond tombent : elles percent le brouillard sur leur passage jusqu’en bas de la photo et rapportent des points en plus. Visez les boules qui en retiennent beaucoup d’autres !',
    ],
    [
      'Rebonds et murs',
      `<div class="g-row">${GOLD_WALL}<span class="g-eq">↗ ↖</span></div>`,
      'La boule rebondit sur les bords de l’écran. À partir du niveau 3, des murs dorés incassables apparaissent dans la partie haute : la boule rebondit aussi dessus. Servez-vous-en pour atteindre les boules cachées derrière. Une boule renvoyée vers le bas est perdue.',
    ],
    [
      'Changer de boule',
      `<div class="g-row">${b(5)}<span class="g-eq">⇄</span>${b(2)}<span class="g-timer">3</span></div>`,
      'En bas à gauche, la boule suivante : touchez-la pour l’échanger avec celle du canon. Si vous ne tirez pas pendant 3 secondes (compteur en bas à droite), la boule change toute seule pour une autre couleur, sans vous coûter de tir.',
    ],
    [
      'Tirs et ligne de danger',
      '<div class="g-row"><span class="g-shots">● 24</span><span class="g-line"></span></div>',
      'Le nombre de tirs est limité (compteur en haut). La barre du haut montre la part de photo dévoilée et le trait de l’objectif. Si une boule se pose sous la ligne pointillée près du canon, la partie est perdue.',
    ],
    [
      'Étoiles et score',
      '<div class="g-row g-stars">★★★</div>',
      'Les tirs qui vous restent à la fin rapportent un bonus : 3 étoiles s’il vous reste au moins 35 % de vos tirs, 2 étoiles à partir de 12 %, 1 étoile sinon. Vous pouvez rejouer un niveau terminé pour améliorer votre score.',
    ],
    [
      'Collection, classement, réglages',
      `<div class="g-row">${HAND_SVG}</div>`,
      'Chaque niveau réussi ajoute sa photo à la Collection. Dans Classement, choisissez un pseudo (sans compte) : votre score total est la somme de vos meilleurs scores. La roue dentée règle le volume de la musique et des effets sonores.',
    ],
  ];
  container.innerHTML = sections
    .map(
      ([title, visual, text]) => `<section class="g-sec">
        <h4>${title}</h4>
        <div class="g-visual">${visual}</div>
        <p>${text}</p>
      </section>`,
    )
    .join('');
}
