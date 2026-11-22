import { isOnline, ONLINE } from '../config/online';
import { LEVELS } from '../data/levels';
import { loadSave } from './SaveService';

/**
 * Classement anonyme : pas de compte. Chaque appareil possède un identifiant
 * et un jeton secret (stockés ici, jamais affichés) ; le joueur choisit un
 * pseudo. Les meilleurs scores par niveau sont envoyés au serveur, qui les
 * vérifie (voir supabase/classement.sql).
 */
const KEY = 'sbbr-player-v1';

interface Identity {
  id: string;
  token: string;
  pseudo: string | null;
  /** Dernier score envoyé avec succès, par identifiant de niveau. */
  sent: Record<string, number>;
}

export interface BoardRow {
  rank: number;
  pseudo: string;
  total: number;
  levels: number;
  stars: number;
  is_me: boolean;
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let cache: Identity | null = null;

function identity(): Identity {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw) as Identity;
  } catch {
    /* ignoré */
  }
  if (!cache?.id || !cache.token) cache = { id: uuid(), token: `${uuid()}${uuid()}`, pseudo: null, sent: {} };
  cache.sent ??= {};
  persist();
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* stockage indisponible */
  }
}

const MESSAGES: Record<string, string> = {
  pseudo_pris: 'Ce pseudo est déjà pris, choisissez-en un autre.',
  pseudo_longueur: 'Le pseudo doit faire entre 3 et 16 caractères.',
  pseudo_caracteres: 'Lettres, chiffres, espaces, points, tirets et « _ » uniquement.',
  trop_rapide: 'Un instant… réessayez dans quelques secondes.',
};

export class BoardError extends Error {}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 9000);
  let res: Response;
  try {
    res = await fetch(`${ONLINE.url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: ONLINE.key, Authorization: `Bearer ${ONLINE.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    throw new BoardError('Classement indisponible : vérifiez votre connexion.');
  } finally {
    window.clearTimeout(timer);
  }
  if (!res.ok) {
    let code = '';
    try {
      code = ((await res.json()) as { message?: string }).message ?? '';
    } catch {
      /* réponse illisible */
    }
    throw new BoardError(MESSAGES[code] ?? 'Le classement n’a pas pu être mis à jour.');
  }
  return (await res.json()) as T;
}

export const playerPseudo = (): string | null => identity().pseudo;

export async function setPseudo(pseudo: string): Promise<string> {
  const me = identity();
  const saved = await rpc<string>('set_pseudo', { p_id: me.id, p_token: me.token, p_pseudo: pseudo });
  me.pseudo = saved;
  persist();
  await syncScores();
  return saved;
}

let syncing: Promise<void> | null = null;

/**
 * Envoie, dans l'ordre des niveaux, les meilleurs scores pas encore envoyés.
 * Silencieux : sans réseau, on réessaiera plus tard (prochaine victoire,
 * prochaine ouverture du classement).
 */
export function syncScores(): Promise<void> {
  if (!isOnline() || !identity().pseudo) return Promise.resolve();
  syncing ??= (async () => {
    const me = identity();
    const best = loadSave().best;
    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const b = best[level.id];
      if (!b) break; // progression : les niveaux suivants ne sont pas encore réussis
      if ((me.sent[level.id] ?? -1) >= b.score) continue;
      const stored = await rpc<number>('submit_score', {
        p_id: me.id,
        p_token: me.token,
        p_level: level.number,
        p_score: b.score,
        p_stars: Math.max(1, Math.min(3, b.stars)),
      });
      me.sent[level.id] = Math.max(stored, b.score);
      persist();
    }
  })()
    .catch(() => {
      /* réessai plus tard */
    })
    .finally(() => {
      syncing = null;
    });
  return syncing;
}

export async function fetchBoard(): Promise<{ top: BoardRow[]; me: BoardRow | null }> {
  await syncScores();
  const me = identity();
  const [top, mine] = await Promise.all([
    rpc<BoardRow[]>('get_leaderboard', { p_limit: 50 }),
    me.pseudo ? rpc<BoardRow[]>('get_player_rank', { p_id: me.id }) : Promise.resolve([] as BoardRow[]),
  ]);
  const myRow = mine[0] ?? null;
  for (const row of top) row.is_me = Boolean(myRow && row.pseudo === myRow.pseudo);
  return { top, me: myRow };
}
