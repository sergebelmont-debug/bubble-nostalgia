/**
 * MUSIQUE
 * -------
 * Une piste à la fois, lue en boucle par un élément <audio> (lecture en
 * continu, sans tout charger en mémoire). Changement de piste en fondu.
 *
 * Les navigateurs mobiles interdisent de lancer un son avant le premier geste
 * du joueur : la piste demandée est mémorisée et démarre au premier toucher.
 *
 * SEUL endroit qui connaît le dossier des musiques : les niveaux ne donnent
 * que le nom du fichier (voir data/levels.ts).
 */
const MUSIC_DIR = 'assets/audio/music/';
const VOLUME = 0.55;
const FADE_MS = 700;

class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private file: string | null = null;
  private unlocked = false;
  private hidden = false;
  private _muted = false;
  private fadeTimer = 0;

  get muted(): boolean {
    return this._muted;
  }

  /** Piste à jouer (nom de fichier), ou null pour le silence. */
  play(file: string | null): void {
    if (file === this.file) {
      this.sync();
      return;
    }
    this.file = file;
    const old = this.audio;
    this.audio = null;
    if (old) this.fadeOut(old);
    if (!file) return;
    const audio = new Audio(`${import.meta.env.BASE_URL}${MUSIC_DIR}${file}`);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    this.audio = audio;
    this.sync();
  }

  /** État résumé pour les tests automatisés. */
  debugState() {
    const a = this.audio;
    return { file: this.file, playing: Boolean(a && !a.paused), time: a ? Math.round(a.currentTime * 10) / 10 : 0, volume: a ? Math.round(a.volume * 100) / 100 : 0, unlocked: this.unlocked, muted: this._muted };
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    this.sync();
  }

  /** À appeler depuis un geste du joueur (toucher / clic). */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.sync();
  }

  /** Application en arrière-plan (appel, autre onglet) : pause. */
  suspend(): void {
    this.hidden = true;
    this.sync();
  }

  resume(): void {
    this.hidden = false;
    this.sync();
  }

  private sync(): void {
    const a = this.audio;
    if (!a) return;
    if (!this.unlocked || this._muted || this.hidden) {
      a.pause();
      return;
    }
    if (a.paused) {
      a.play().then(
        () => this.fadeIn(a),
        () => {
          /* lecture refusée par le navigateur : nouvel essai au prochain geste */
          this.unlocked = false;
        },
      );
    }
  }

  private fadeIn(a: HTMLAudioElement): void {
    window.clearInterval(this.fadeTimer);
    const start = performance.now();
    const from = a.volume;
    this.fadeTimer = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / FADE_MS);
      a.volume = from + (VOLUME - from) * p;
      if (p >= 1 || a !== this.audio) window.clearInterval(this.fadeTimer);
    }, 40);
  }

  private fadeOut(a: HTMLAudioElement): void {
    if (a.paused) {
      a.removeAttribute('src');
      return;
    }
    const start = performance.now();
    const from = a.volume;
    const timer = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / FADE_MS);
      a.volume = from * (1 - p);
      if (p >= 1) {
        window.clearInterval(timer);
        a.pause();
        a.removeAttribute('src');
        a.load();
      }
    }, 40);
  }
}

export const music = new MusicPlayer();
