import { view } from '../app/view';
import { CANNON_FROM_BOTTOM, DESIGN_W } from '../config/gameConfig';
import { LEVELS } from '../data/levels';
import { loadSave, writeSave } from '../services/SaveService';

/**
 * EXPLICATIONS POUR LES NOUVEAUX JOUEURS
 * --------------------------------------
 * Une suite de cartes, chacune pouvant éclairer une zone de l'écran (le reste
 * est assombri). Affichées une seule fois : au premier lancement du niveau 1
 * (les bases), puis au premier niveau qui comporte des murs.
 * Le jeu est en pause pendant la lecture.
 */
type Spot =
  | { kind: 'circle'; x: number; y: number; r: number } // unités de jeu
  | { kind: 'element'; id: string; pad: number }; // élément HTML

interface Step {
  title: string;
  text: string;
  spots?: Spot[];
}

export interface Lesson {
  id: string;
  steps: Step[];
}

const cannonY = (): number => view.h - CANNON_FROM_BOTTOM;
const CX = DESIGN_W / 2;

function basics(target: number): Lesson {
  return {
    id: 'bases',
    steps: [
      {
        title: 'Bienvenue !',
        text: 'Une photographie de Serge Belmont est cachée sous le brouillard. Éclatez les boules pour la dévoiler.',
      },
      {
        title: 'Viser et tirer',
        text: 'Posez le doigt sur l’écran et glissez : la ligne pointillée montre le chemin de la boule et l’endroit où elle se posera. Relâchez pour tirer.',
        spots: [{ kind: 'circle', x: CX, y: cannonY() - 20, r: 130 }],
      },
      {
        title: '3 boules de la même couleur',
        text: 'Touchez un groupe d’au moins 3 boules de la même couleur que la vôtre (en comptant celle que vous tirez) : elles éclatent et le brouillard se dissipe à cet endroit.',
      },
      {
        title: 'Les boules qui tombent',
        text: 'Les boules qui ne sont plus accrochées au plafond tombent : elles dévoilent encore plus la photo et rapportent des points en plus.',
      },
      {
        title: 'Rebonds',
        text: 'La boule rebondit sur les bords de l’écran : servez-vous-en pour atteindre les boules cachées sur les côtés.',
      },
      {
        title: 'Changer de boule',
        text: 'À gauche, la boule suivante : touchez-la pour l’échanger avec celle du canon. Si vous ne tirez pas pendant 3 secondes, la boule change toute seule (compteur à droite).',
        spots: [
          { kind: 'circle', x: CX - 178, y: cannonY() + 44, r: 72 },
          { kind: 'circle', x: CX + 178, y: cannonY() + 44, r: 72 },
        ],
      },
      {
        title: 'Votre objectif',
        text: `Dévoilez ${target} % de la photo (barre en haut) avant d’avoir utilisé tous vos tirs (compteur à droite du score). Attention : si les boules descendent sous la ligne pointillée, la partie est perdue.`,
        spots: [
          { kind: 'element', id: 'reveal-bar-wrap', pad: 10 },
          { kind: 'element', id: 'hud-shots-pill', pad: 8 },
        ],
      },
    ],
  };
}

const WALLS: Lesson = {
  id: 'murs',
  steps: [
    {
      title: 'Nouveau : les murs',
      text: 'Les barres dorées sont incassables : la boule rebondit dessus comme sur les bords. Visez les murs pour atteindre les boules cachées derrière.',
    },
  ],
};

/** Leçon à montrer au lancement de ce niveau, ou null si déjà vue. */
export function lessonFor(levelIndex: number): Lesson | null {
  const seen = loadSave().tips;
  const level = LEVELS[levelIndex];
  if (levelIndex === 0 && !seen.includes('bases')) return basics(level.objective.revealPercent);
  const firstWalls = LEVELS.findIndex((l) => l.walls?.length);
  if (levelIndex === firstWalls && !seen.includes('murs')) return WALLS;
  return null;
}

/** Fait réapparaître toutes les explications. */
export function resetLessons(): void {
  writeSave({ tips: [] });
}

/** Rectangle arrondi (tracé SVG), pour percer le voile. */
function roundRect(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.min(r, w / 2, h / 2);
  return `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`;
}

const $ = (id: string): HTMLElement => document.getElementById(id)!;

/** Affiche une leçon ; `onDone` est appelé à la fin (ou si le joueur passe). */
export function showLesson(lesson: Lesson, onDone: () => void): void {
  const root = $('tutorial');
  const spots = $('tutorial-spots');
  const title = $('tutorial-title');
  const text = $('tutorial-text');
  const count = $('tutorial-count');
  const next = $('btn-tutorial-next');
  const skip = $('btn-tutorial-skip');
  const card = $('tutorial-card');
  let i = 0;

  const finish = (): void => {
    root.classList.add('hidden');
    next.onclick = null;
    skip.onclick = null;
    const tips = loadSave().tips;
    if (!tips.includes(lesson.id)) writeSave({ tips: [...tips, lesson.id] });
    onDone();
  };

  const render = (): void => {
    const step = lesson.steps[i];
    const last = i === lesson.steps.length - 1;
    title.textContent = step.title;
    text.textContent = step.text;
    count.textContent = lesson.steps.length > 1 ? `${i + 1} / ${lesson.steps.length}` : '';
    next.textContent = last ? 'C’est parti !' : 'Suivant';
    skip.classList.toggle('hidden', last);

    const stage = $('stage').getBoundingClientRect();
    const unit = stage.width / DESIGN_W;
    spots.innerHTML = '';
    const holes: string[] = [];
    let lowest = 0;
    let highest = Infinity;
    for (const s of step.spots ?? []) {
      let x: number;
      let y: number;
      let w: number;
      let h: number;
      let round = '50%';
      if (s.kind === 'circle') {
        x = (s.x - s.r) * unit;
        y = (s.y - s.r) * unit;
        w = h = s.r * 2 * unit;
      } else {
        const r = document.getElementById(s.id)?.getBoundingClientRect();
        if (!r) continue;
        const pad = s.pad * unit;
        x = r.left - stage.left - pad;
        y = r.top - stage.top - pad;
        w = r.width + pad * 2;
        h = r.height + pad * 2;
        round = `${h / 2}px`;
      }
      const el = document.createElement('div');
      el.className = 'tut-spot';
      el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${round}`;
      spots.appendChild(el);
      holes.push(roundRect(x, y, w, h, s.kind === 'circle' ? w / 2 : h / 2));
      lowest = Math.max(lowest, y + h);
      highest = Math.min(highest, y);
    }
    // Un seul voile sombre, percé à chaque zone éclairée.
    if (holes.length) {
      spots.insertAdjacentHTML(
        'afterbegin',
        `<svg width="${stage.width}" height="${stage.height}"><path fill-rule="evenodd" fill="rgba(10,4,8,0.62)" d="M0 0H${stage.width}V${stage.height}H0Z ${holes.join(' ')}"/></svg>`,
      );
    }
    root.classList.toggle('dim', !step.spots?.length);
    // La carte se place à l'écart des zones éclairées.
    const mid = stage.height / 2;
    card.classList.toggle('at-top', step.spots?.length ? highest > mid : false);
    card.classList.toggle('at-bottom', step.spots?.length ? lowest < mid : false);
  };

  next.onclick = () => {
    if (i < lesson.steps.length - 1) {
      i++;
      render();
    } else {
      finish();
    }
  };
  skip.onclick = finish;
  root.classList.remove('hidden');
  render();
}
