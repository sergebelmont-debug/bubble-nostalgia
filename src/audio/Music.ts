import { musicUrl } from './musicFiles';
import { sfx } from './Sfx';

/**
 * MUSIQUE
 * -------
 * Une piste à la fois, lue en boucle par un élément <audio> (lecture en
 * continu, sans tout charger en mémoire). Changement de piste en fondu.
 *
 * Le son passe par le circuit Web Audio des bruitages (un nœud de volume par
 * piste, puis un volume général de la musique) : c'est la seule façon de
 * régler le volume sur iPhone, où le volume d'un élément <audio> est ignoré.
 *
 * Les navigateurs mobiles interdisent de lancer un son avant le premier geste
 * du joueur : la piste demandée est mémorisée et démarre au premier toucher.
 *
 * SEUL endroit qui connaît le dossier des musiques : les niveaux ne donnent
 * que le nom du fichier (voir data/levels.ts).
 */
const FADE_S = 0.7;

interface Track {
  el: HTMLAudioElement;
  gain: GainNode | null;
  /** Niveau du fondu (0–1), utilisé quand Web Audio est indisponible. */
  fade: number;
}

class MusicPlayer {
  private track: Track | null = null;
  private file: string | null = null;
  private unlocked = false;
  private hidden = false;
  private _volume = 0.6;
  private out: GainNode | null = null;

  /** Volume de la musique (0–1). */
  get volume(): number {
    return this._volume;
  }

  /** Piste à jouer (nom de fichier), ou null pour le silence. */
  play(file: string | null): void {
    if (file === this.file) {
      this.sync();
      return;
    }
    this.file = file;
    const old = this.track;
    this.track = null;
    if (old) this.fadeOut(old);
    if (!file) return;
    // Le morceau est téléchargé chiffré puis déchiffré en mémoire (voir musicFiles.ts).
    musicUrl(file).then(
      (url) => {
        if (this.file !== file || this.track) return; // une autre piste a été demandée entre-temps
        const el = new Audio(url);
        el.loop = true;
        el.preload = 'auto';
        this.track = { el, gain: null, fade: 0 };
        this.applyFallbackVolume(this.track);
        this.sync();
      },
      () => {
        /* clé ou fichier indisponible : le jeu reste jouable, sans musique */
      },
    );
  }

  setVolume(volume: number): void {
    this._volume = Math.max(0, Math.min(1, volume));
    const ctx = sfx.audioContext;
    if (this.out && ctx) this.out.gain.setTargetAtTime(this._volume, ctx.currentTime, 0.03);
    if (this.track) this.applyFallbackVolume(this.track);
    this.sync();
  }

  /** À appeler depuis un geste du joueur (toucher / clic), après sfx.unlock(). */
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

  /** État résumé pour les tests automatisés. */
  debugState() {
    const t = this.track;
    return {
      file: this.file,
      playing: Boolean(t && !t.el.paused),
      time: t ? Math.round(t.el.currentTime * 10) / 10 : 0,
      volume: this._volume,
      webAudio: Boolean(t?.gain),
      gain: t?.gain ? Math.round(t.gain.gain.value * 100) / 100 : null,
      out: this.out ? Math.round(this.out.gain.value * 100) / 100 : null,
      unlocked: this.unlocked,
    };
  }

  /** Branche la piste sur le circuit Web Audio (une seule fois par piste). */
  private connect(t: Track): void {
    const ctx = sfx.audioContext;
    if (t.gain || !ctx) return;
    try {
      if (!this.out) {
        this.out = ctx.createGain();
        this.out.gain.value = this._volume;
        this.out.connect(ctx.destination);
      }
      const src = ctx.createMediaElementSource(t.el);
      t.gain = ctx.createGain();
      t.gain.gain.value = 0;
      src.connect(t.gain).connect(this.out);
      t.el.volume = 1;
    } catch {
      t.gain = null;
    }
  }

  private applyFallbackVolume(t: Track): void {
    if (!t.gain) t.el.volume = this._volume * t.fade;
  }

  private sync(): void {
    const t = this.track;
    if (!t) return;
    if (!this.unlocked || this._volume <= 0 || this.hidden) {
      t.el.pause();
      return;
    }
    this.connect(t);
    if (t.el.paused) {
      t.el.play().then(
        () => this.fadeIn(t),
        () => {
          /* lecture refusée par le navigateur : nouvel essai au prochain geste */
          this.unlocked = false;
        },
      );
    }
  }

  private fadeIn(t: Track): void {
    const ctx = sfx.audioContext;
    if (t.gain && ctx) {
      const g = t.gain.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(1, ctx.currentTime + FADE_S);
      return;
    }
    this.animateFade(t, 1);
  }

  private fadeOut(t: Track): void {
    const stop = (): void => {
      t.el.pause();
      t.el.removeAttribute('src');
      t.el.load();
    };
    if (t.el.paused) {
      stop();
      return;
    }
    const ctx = sfx.audioContext;
    if (t.gain && ctx) {
      const g = t.gain.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(g.value, ctx.currentTime);
      g.linearRampToValueAtTime(0, ctx.currentTime + FADE_S);
      window.setTimeout(stop, FADE_S * 1000 + 60);
      return;
    }
    this.animateFade(t, 0, stop);
  }

  /** Fondu sans Web Audio (navigateurs anciens). */
  private animateFade(t: Track, to: number, done?: () => void): void {
    const start = performance.now();
    const from = t.fade;
    const timer = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / (FADE_S * 1000));
      t.fade = from + (to - from) * p;
      this.applyFallbackVolume(t);
      if (p >= 1) {
        window.clearInterval(timer);
        done?.();
      }
    }, 40);
  }
}

export const music = new MusicPlayer();
