import { bus, type HudState, type LevelResult } from '../app/bus';
import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { DESIGN_W } from '../config/gameConfig';
import { isOnline } from '../config/online';
import { LEVELS, MENU_MUSIC } from '../data/levels';
import { applyStatic, lang, LANGS, langInfo, levelTitle, num, onLangChange, pct, setLang, t, type Lang } from '../i18n';
import type { MenuArt } from '../render/menuArt';
import { playerPseudo, syncScores } from '../services/Leaderboard';
import { homePhotoUrl, photoUrl } from '../services/PhotoService';
import { loadSave, writeSave } from '../services/SaveService';
import { initBoard, renderBoard } from './Board';
import { collectedCount, renderCollection } from './Collection';
import { renderGuide } from './Guide';
import { renderHomeArt } from './HomeArt';
import { renderMap, totalStars } from './LevelMap';
import { HAND_SVG, hideAimHint, hideTips, showAimHint, showIntro, showWallsTip, tipFor } from './Tutorial';

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

const VERSION = '0.9';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const visible = (el: HTMLElement): boolean => !el.classList.contains('hidden');

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
  const guide = $('screen-guide');
  const picker = $('lang-picker');
  $('aim-hint').querySelector('.aim-hand')!.innerHTML = HAND_SVG;
  let levelIndex = 0;
  let lastScore = 0;
  let homeArtDone = false;
  let lastHud: HudState | null = null;
  let lastEnd: { r: LevelResult; won: boolean } | null = null;

  applyStatic();
  $('home-photo').style.backgroundImage = `url("${homePhotoUrl()}")`;

  const hideAll = (): void => {
    hideTips();
    for (const el of [hud, home, map, end, collection, viewer, settings, board, guide]) el.classList.add('hidden');
  };

  // ───────────────────────────── Accueil ─────────────────────────────
  const renderHome = (): void => {
    const save = loadSave();
    $('home-progress').textContent =
      save.unlocked > 0
        ? t('home.progress', {
            stars: totalStars(),
            level: Math.min(save.unlocked + 1, LEVELS.length),
            total: LEVELS.length,
          })
        : '';
    $('home-collection').textContent = `${collectedCount()} / ${LEVELS.length}`;
    $('home-version').textContent = t('home.version', { v: VERSION });
  };

  const showHome = (): void => {
    hideAll();
    renderHome();
    home.classList.remove('hidden');
    music.play(MENU_MUSIC);
    actions.resume();
  };

  // ───────────────────────────── Classement ─────────────────────────────
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

  // ───────────────────────────── Collection ─────────────────────────────
  const renderCollectionScreen = (): void => {
    const count = collectedCount();
    $('collection-count').textContent = `${count} / ${LEVELS.length}`;
    $('collection-fill').style.width = `${(count / LEVELS.length) * 100}%`;
    $('collection-hint').textContent = t(
      count === 0 ? 'collection.none' : count === LEVELS.length ? 'collection.all' : 'collection.some',
    );
    renderCollection($('collection-grid'), {
      onOpen: (url, caption) => {
        sfx.click();
        $<HTMLImageElement>('viewer-img').src = url;
        $('viewer-caption').textContent = caption;
        viewer.classList.remove('hidden');
      },
      onLocked: () => sfx.bounce(),
    });
  };

  const showCollection = (): void => {
    hideAll();
    actions.pause();
    renderCollectionScreen();
    $('collection-scroll').scrollTop = 0;
    music.play(MENU_MUSIC);
    collection.classList.remove('hidden');
  };

  // ───────────────────────────── Carte ─────────────────────────────
  const renderMapScreen = (): number => {
    $('map-stars').textContent = `${totalStars()} / ${LEVELS.length * 3}`;
    return renderMap($('map-path'), {
      onPick: (i) => play(i),
      onLocked: () => sfx.bounce(),
    });
  };

  const showMap = (): void => {
    hideAll();
    actions.pause();
    map.classList.remove('hidden');
    music.play(MENU_MUSIC);
    const currentY = renderMapScreen();
    const scroll = $('map-scroll');
    const unit = $('stage').clientWidth / DESIGN_W;
    scroll.scrollTop = currentY * unit - scroll.clientHeight / 2;
  };

  const play = (index: number): void => {
    sfx.click();
    hideAll();
    lastEnd = null;
    hud.classList.remove('hidden');
    music.play(LEVELS[Math.max(0, Math.min(index, LEVELS.length - 1))].music);
    actions.startLevel(Math.max(0, Math.min(index, LEVELS.length - 1)));
  };

  // ───────────────────────────── Réglages ─────────────────────────────
  const musicInput = $<HTMLInputElement>('music-volume');
  const sfxInput = $<HTMLInputElement>('sfx-volume');
  const percent = (v: number): number => Math.round(v * 100);
  const renderVolumes = (): void => {
    musicInput.value = String(percent(music.volume));
    sfxInput.value = String(percent(sfx.volume));
    $('music-value').textContent = pct(percent(music.volume));
    $('sfx-value').textContent = pct(percent(sfx.volume));
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

  // Choix de la langue : bouton à drapeau en bas à droite des réglages.
  const renderLangButton = (): void => {
    const info = langInfo();
    $('lang-current').innerHTML = `${info.flag}<span>${info.name}</span>`;
  };
  picker.innerHTML =
    `<p class="lang-title" data-i18n="settings.language"></p><div class="lang-grid">` +
    LANGS.map(
      (l) =>
        `<button type="button" class="lang-option" data-lang="${l.code}" lang="${l.code}">${l.flag}<span>${l.name}</span></button>`,
    ).join('') +
    `</div>`;
  const markCurrentLang = (): void => {
    picker.querySelectorAll<HTMLElement>('.lang-option').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
    });
  };
  $('btn-lang').addEventListener('click', () => {
    sfx.click();
    markCurrentLang();
    picker.classList.toggle('hidden');
  });
  picker.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.lang-option');
    if (!btn) return;
    sfx.click();
    setLang(btn.dataset.lang as Lang);
    picker.classList.add('hidden');
  });

  let pausedForSettings = false;
  const openSettings = (): void => {
    sfx.click();
    renderVolumes();
    renderLangButton();
    picker.classList.add('hidden');
    pausedForSettings = visible(hud);
    if (pausedForSettings) actions.pause();
    settings.classList.remove('hidden');
  };
  const closeSettings = (): void => {
    settings.classList.add('hidden');
    picker.classList.add('hidden');
    writeSave({ musicVolume: music.volume, sfxVolume: sfx.volume });
    if (pausedForSettings) actions.resume();
    pausedForSettings = false;
    sfx.click();
  };
  $('btn-settings').addEventListener('click', openSettings);
  $('btn-home-settings').addEventListener('click', openSettings);
  $('btn-settings-close').addEventListener('click', closeSettings);
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

  // ───────────────────────────── Navigation ─────────────────────────────
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
  // « Comment jouer » : toutes les règles, depuis la carte des niveaux.
  const renderGuideScreen = (): void => {
    renderGuide($('guide-content'), actions.menuArt()?.bubbles, photoUrl(LEVELS[0]) ?? homePhotoUrl());
  };
  $('btn-guide').addEventListener('click', () => {
    sfx.click();
    hideAll();
    renderGuideScreen();
    $('guide-scroll').scrollTop = 0;
    guide.classList.remove('hidden');
  });
  $('btn-guide-back').addEventListener('click', () => {
    sfx.click();
    showMap();
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

  // ───────────────────────────── Partie ─────────────────────────────
  bus.on('ready', (e) => {
    // Explications pour les nouveaux joueurs (une seule fois).
    hideTips();
    const tip = visible(hud) ? tipFor(e.levelIndex) : null;
    if (tip === 'intro') {
      // La scène est encore en création : la pause est appliquée juste après.
      window.setTimeout(() => actions.pause(), 0);
      const level = LEVELS[e.levelIndex];
      showIntro(
        {
          target: level.objective.revealPercent,
          photo: homePhotoUrl(),
          bubble: actions.menuArt()?.bubbles[2],
        },
        () => {
          actions.resume();
          showAimHint();
        },
      );
    } else if (tip === 'murs') {
      showWallsTip();
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

  const renderHud = (s: HudState): void => {
    $('hud-level').textContent = String(s.levelNumber);
    $('hud-shots').textContent = String(s.shots);
    shotsPill.classList.toggle('low', s.shots > 0 && s.shots <= 5);
    scoreEl.textContent = num(s.score);
    $('reveal-fill').style.width = `${s.percent}%`;
    $('reveal-target').style.left = `${s.target}%`;
    $('reveal-text').textContent = t('hud.reveal', { p: pct(s.percent), t: pct(s.target) });
  };

  bus.on('hud', (s) => {
    // Premier tir joué : la main d'aide à la visée disparaît.
    if (s.shots < LEVELS[levelIndex].shots) hideAimHint();
    lastHud = s;
    renderHud(s);
    if (s.score !== lastScore) {
      lastScore = s.score;
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    }
  });

  const renderEnd = (r: LevelResult, won: boolean): void => {
    $('end-title').textContent = t(won ? 'end.won' : r.reason === 'line' ? 'end.line' : 'end.shots');
    $('end-sub').textContent = won
      ? t('end.wonSub', { n: r.levelNumber, title: levelTitle(r.levelIndex) })
      : t('end.lostSub', { p: pct(r.percent) });
    const stars = $('end-stars');
    stars.classList.toggle('hidden', !won);
    [...stars.children].forEach((el, i) => el.classList.toggle('on', i < r.stars));
    $('end-score').textContent = num(r.score);
    $('end-percent').textContent = pct(won ? 100 : r.percent);
    $('end-shots').textContent = String(r.shotsLeft);
    const next = $('btn-next');
    const again = $('btn-again');
    next.classList.toggle('hidden', !won || !r.hasNext);
    again.textContent = t(won ? 'end.again' : 'end.retry');
    again.className = `btn ${won && r.hasNext ? 'secondary' : 'primary'}`;
    let note = won && !r.hasNext ? t('end.allDone') : '';
    if (won && !note && isOnline() && !playerPseudo()) note = t('end.pseudoHint');
    $('end-note').textContent = note;
  };

  const showEnd = (r: LevelResult, won: boolean): void => {
    // Si le joueur a quitté le niveau entre-temps, on n'affiche rien.
    if (!visible(hud)) return;
    lastEnd = { r, won };
    renderEnd(r, won);
    end.classList.remove('hidden');
  };

  bus.on('win', (r) => {
    showEnd(r, true);
    if (isOnline()) void syncScores();
  });
  bus.on('lose', (r) => showEnd(r, false));

  // ───────────────────────────── Changement de langue ─────────────────────────────
  // Tous les écrans visibles sont redessinés aussitôt dans la nouvelle langue.
  onLangChange(() => {
    applyStatic();
    renderVolumes();
    renderLangButton();
    markCurrentLang();
    renderHome();
    if (visible(map)) renderMapScreen();
    if (visible(collection)) renderCollectionScreen();
    if (visible(board)) renderBoard();
    if (visible(guide)) renderGuideScreen();
    if (lastHud) renderHud(lastHud);
    if (lastEnd && visible(end)) renderEnd(lastEnd.r, lastEnd.won);
  });

  showHome();
}
