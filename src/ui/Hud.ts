import { bus, type LevelResult } from '../app/bus';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { DESIGN_W } from '../config/gameConfig';
import { LEVELS, MENU_MUSIC } from '../data/levels';
import type { MenuArt } from '../render/menuArt';
import { homePhotoUrl } from '../services/PhotoService';
import { loadSave, writeSave } from '../services/SaveService';
import { isOnline } from '../config/online';
import { playerPseudo, syncScores } from '../services/Leaderboard';
import { initBoard, renderBoard } from './Board';
import { collectedCount, renderCollection } from './Collection';
import { renderHomeArt } from './HomeArt';
import { renderMap, totalStars } from './LevelMap';
import { lessonFor, resetLessons, showLesson } from './Tutorial';

/** Interface HTML : accueil, carte des niveaux, barre d'état, écrans de fin de niveau. */
export interface UiActions {
  startLevel(levelIndex: number): void;
  /** Dessins des boules et du canon pour le décor du menu (null tant que le jeu n'est pas prêt). */
  menuArt(): MenuArt | null;
  /** Met la scène de jeu en pause (carte affichée). */
  pause(): void;
  /** Relance la scène de jeu (retour à l'accueil). */
  resume(): void;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;


export function initUi(actions: UiActions): void {
  const hud = $('hud');
  const home = $('overlay-start');
  const map = $('screen-map');
  const end = $('overlay-end');
  const collection = $('screen-collection');
  const viewer = $('photo-viewer');
  const scoreEl = $('hud-score');
  const shotsPill = $('hud-shots').parentElement!;
  const settings = $('screen-settings');
  const board = $('screen-board');
  let levelIndex = 0;
  let lastScore = 0;
  let homeArtDone = false;

  $('home-photo').style.backgroundImage = `url("${homePhotoUrl()}")`;

  const hideAll = (): void => {
    for (const el of [hud, home, map, end, collection, viewer, settings, board]) el.classList.add('hidden');
  };

  const showHome = (): void => {
    hideAll();
    const save = loadSave();
    const stars = totalStars();
    $('home-progress').textContent =
      save.unlocked > 0 ? `★ ${stars} · Niveau ${Math.min(save.unlocked + 1, LEVELS.length)} sur ${LEVELS.length}` : '';
    $('home-collection').textContent = `${collectedCount()} / ${LEVELS.length}`;
    home.classList.remove('hidden');
    music.play(MENU_MUSIC);
    actions.resume();
  };

  const showBoard = (): void => {
    hideAll();
    actions.pause();
    board.classList.remove('hidden');
    music.play(MENU_MUSIC);
    renderBoard();
  };

  // Le classement n'apparaît que si le serveur est configuré (config/online.ts).
  $('btn-board').classList.toggle('hidden', !isOnline());
  initBoard(() => sfx.click());
  $('btn-board').addEventListener('click', () => {
    sfx.unlock();
    sfx.click();
    showBoard();
  });
  $('btn-board-home').addEventListener('click', () => {
    sfx.click();
    showHome();
  });

  const showCollection = (): void => {
    hideAll();
    actions.pause();
    const count = collectedCount();
    $('collection-count').textContent = `${count} / ${LEVELS.length}`;
    $('collection-fill').style.width = `${(count / LEVELS.length) * 100}%`;
    $('collection-hint').textContent =
      count === 0
        ? 'Terminez un niveau pour obtenir sa photographie.'
        : count === LEVELS.length
          ? 'Collection complète. Bravo !'
          : 'Terminez les niveaux pour obtenir les photographies grisées.';
    renderCollection($('collection-grid'), {
      onOpen: (url, caption) => {
        sfx.click();
        $<HTMLImageElement>('viewer-img').src = url;
        $('viewer-caption').textContent = caption;
        viewer.classList.remove('hidden');
      },
      onLocked: () => sfx.bounce(),
    });
    $('collection-scroll').scrollTop = 0;
    music.play(MENU_MUSIC);
    collection.classList.remove('hidden');
  };

  const showMap = (): void => {
    hideAll();
    actions.pause();
    map.classList.remove('hidden');
    music.play(MENU_MUSIC);
    $('map-stars').textContent = `${totalStars()} / ${LEVELS.length * 3}`;
    const scroll = $('map-scroll');
    const currentY = renderMap($('map-path'), {
      onPick: (i) => play(i),
      onLocked: () => sfx.bounce(),
    });
    const unit = $('stage').clientWidth / DESIGN_W;
    scroll.scrollTop = currentY * unit - scroll.clientHeight / 2;
  };

  const play = (index: number): void => {
    sfx.click();
    hideAll();
    hud.classList.remove('hidden');
    music.play(LEVELS[Math.max(0, Math.min(index, LEVELS.length - 1))].music);
    actions.startLevel(Math.max(0, Math.min(index, LEVELS.length - 1)));
  };

  // ── Réglages du son : deux curseurs, appliqués et mémorisés immédiatement.
  const musicInput = $<HTMLInputElement>('music-volume');
  const sfxInput = $<HTMLInputElement>('sfx-volume');
  const pct = (v: number): number => Math.round(v * 100);
  const renderVolumes = (): void => {
    musicInput.value = String(pct(music.volume));
    sfxInput.value = String(pct(sfx.volume));
    $('music-value').textContent = `${pct(music.volume)} %`;
    $('sfx-value').textContent = `${pct(sfx.volume)} %`;
    for (const input of [musicInput, sfxInput]) input.style.setProperty('--fill', `${input.value}%`);
  };
  const initial = loadSave();
  sfx.setVolume(initial.sfxVolume);
  music.setVolume(initial.musicVolume);
  renderVolumes();

  musicInput.addEventListener('input', () => {
    music.setVolume(Number(musicInput.value) / 100);
    renderVolumes();
  });
  musicInput.addEventListener('change', () => writeSave({ musicVolume: music.volume }));
  let lastPreview = 0;
  sfxInput.addEventListener('input', () => {
    sfx.setVolume(Number(sfxInput.value) / 100);
    renderVolumes();
    // Petit son d'essai pour entendre le nouveau volume.
    const now = performance.now();
    if (now - lastPreview > 120) {
      lastPreview = now;
      sfx.pop(2);
    }
  });
  sfxInput.addEventListener('change', () => writeSave({ sfxVolume: sfx.volume }));

  let pausedForSettings = false;
  const openSettings = (): void => {
    sfx.click();
    $('btn-replay-tips').textContent = 'Revoir les explications du jeu';
    renderVolumes();
    pausedForSettings = !hud.classList.contains('hidden');
    if (pausedForSettings) actions.pause();
    settings.classList.remove('hidden');
  };
  const closeSettings = (): void => {
    settings.classList.add('hidden');
    writeSave({ musicVolume: music.volume, sfxVolume: sfx.volume });
    if (pausedForSettings) actions.resume();
    pausedForSettings = false;
    sfx.click();
  };
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-home-settings').addEventListener('click', openSettings);
  $('btn-settings-close').addEventListener('click', closeSettings);
  $('btn-replay-tips').addEventListener('click', () => {
    resetLessons();
    sfx.click();
    $('btn-replay-tips').textContent = 'Les explications réapparaîtront au niveau 1.';
  });
  settings.addEventListener('click', (e) => {
    if (e.target === settings) closeSettings();
  });

  // Les navigateurs n'autorisent le son qu'après un premier geste du joueur.
  const firstGesture = (): void => {
    sfx.unlock();
    music.unlock();
  };
  window.addEventListener('pointerdown', firstGesture, { capture: true });
  window.addEventListener('keydown', firstGesture, { capture: true });

  $('btn-play').addEventListener('click', () => {
    sfx.unlock();
    sfx.click();
    showMap();
  });
  $('btn-collection').addEventListener('click', () => {
    sfx.unlock();
    sfx.click();
    showCollection();
  });
  $('btn-collection-home').addEventListener('click', () => {
    sfx.click();
    showHome();
  });
  viewer.addEventListener('click', () => {
    sfx.click();
    viewer.classList.add('hidden');
  });
  $('btn-map-home').addEventListener('click', () => {
    sfx.click();
    showHome();
  });
  $('btn-map').addEventListener('click', () => {
    sfx.click();
    showMap();
  });
  $('btn-end-map').addEventListener('click', () => {
    sfx.click();
    showMap();
  });
  $('btn-restart').addEventListener('click', () => play(levelIndex));
  $('btn-again').addEventListener('click', () => play(levelIndex));
  $('btn-next').addEventListener('click', () => play(levelIndex + 1));

  bus.on('ready', (e) => {
    // Explications pour les nouveaux joueurs (une seule fois).
    const lesson = hud.classList.contains('hidden') ? null : lessonFor(e.levelIndex);
    if (lesson) {
      // La scène est encore en création : la pause est appliquée juste après.
      window.setTimeout(() => actions.pause(), 0);
      showLesson(lesson, () => actions.resume());
    }
    if (!homeArtDone) {
      const art = actions.menuArt();
      if (art) {
        renderHomeArt($('home-bubbles'), $('home-cannon'), art);
        homeArtDone = true;
      }
    }
    levelIndex = e.levelIndex;
    lastScore = 0;
  });

  bus.on('hud', (s) => {
    $('hud-level').textContent = String(s.levelNumber);
    $('hud-shots').textContent = String(s.shots);
    shotsPill.classList.toggle('low', s.shots > 0 && s.shots <= 5);
    if (s.score !== lastScore) {
      lastScore = s.score;
      scoreEl.textContent = s.score.toLocaleString('fr-FR');
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    }
    $('reveal-fill').style.width = `${s.percent}%`;
    $('reveal-target').style.left = `${s.target}%`;
    $('reveal-text').textContent = `${s.percent} % · objectif ${s.target} %`;
  });

  const showEnd = (r: LevelResult, won: boolean): void => {
    // Si le joueur a quitté le niveau entre-temps, on n'affiche rien.
    if (hud.classList.contains('hidden')) return;
    $('end-title').textContent = won ? 'Photo révélée !' : r.reason === 'line' ? 'Les boules ont débordé…' : 'Plus de tirs…';
    $('end-sub').textContent = won
      ? `Niveau ${r.levelNumber} · « ${r.title} »`
      : `La photo n'était révélée qu'à ${r.percent} %. Encore un effort !`;
    const stars = $('end-stars');
    stars.classList.toggle('hidden', !won);
    [...stars.children].forEach((el, i) => el.classList.toggle('on', i < r.stars));
    $('end-score').textContent = r.score.toLocaleString('fr-FR');
    $('end-percent').textContent = `${won ? 100 : r.percent} %`;
    $('end-shots').textContent = String(r.shotsLeft);
    const next = $('btn-next');
    const again = $('btn-again');
    next.classList.toggle('hidden', !won || !r.hasNext);
    again.textContent = won ? 'Rejouer' : 'Réessayer';
    again.className = `btn ${won && r.hasNext ? 'secondary' : 'primary'}`;
    $('end-note').textContent = won && !r.hasNext ? 'Bravo ! De nouveaux niveaux arrivent bientôt.' : '';
    end.classList.remove('hidden');
  };

  bus.on('win', (r) => {
    showEnd(r, true);
    if (isOnline()) {
      void syncScores();
      if (!playerPseudo() && !$('end-note').textContent) {
        $('end-note').textContent = 'Choisissez un pseudo dans « Classement » pour comparer vos scores.';
      }
    }
  });
  bus.on('lose', (r) => showEnd(r, false));

  showHome();
}
