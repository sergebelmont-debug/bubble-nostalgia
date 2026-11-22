/** Sauvegarde locale de la progression (localStorage, tolérante aux navigateurs qui le bloquent). */
const KEY = 'sbbr-save-v1';

export interface SaveData {
  /** Index du plus haut niveau débloqué. */
  unlocked: number;
  /** Meilleur score et étoiles par identifiant de niveau. */
  best: Record<string, { score: number; stars: number }>;
  /** Volume des bruitages (0–1). */
  sfxVolume: number;
  /** Volume de la musique (0–1). */
  musicVolume: number;
}

const DEFAULTS: SaveData = { unlocked: 0, best: {}, sfxVolume: 0.8, musicVolume: 0.6 };

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  let data: SaveData = { ...DEFAULTS, best: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const old = JSON.parse(raw) as Partial<SaveData> & { muted?: boolean; musicMuted?: boolean };
      data = { ...data, ...old };
      // Anciennes sauvegardes : son ou musique « coupé » devient volume 0.
      if (old.sfxVolume === undefined && old.muted) data.sfxVolume = 0;
      if (old.musicVolume === undefined && old.musicMuted) data.musicVolume = 0;
      delete (data as { muted?: boolean }).muted;
      delete (data as { musicMuted?: boolean }).musicMuted;
    }
  } catch {
    /* stockage indisponible : on joue sans sauvegarde */
  }
  cache = data;
  return data;
}

export function writeSave(patch: Partial<SaveData>): SaveData {
  const data = { ...loadSave(), ...patch };
  cache = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignoré */
  }
  return data;
}

export function recordResult(levelId: string, levelIndex: number, score: number, stars: number): void {
  const save = loadSave();
  const prev = save.best[levelId];
  const best = { ...save.best };
  if (!prev || score > prev.score) best[levelId] = { score, stars: Math.max(stars, prev?.stars ?? 0) };
  writeSave({ best, unlocked: Math.max(save.unlocked, levelIndex + 1) });
}
