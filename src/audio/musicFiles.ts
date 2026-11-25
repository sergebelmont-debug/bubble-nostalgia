/**
 * MUSIQUES CHIFFRÉES
 * ------------------
 * Le site ne contient pas les MP3 en clair, seulement des fichiers .bin
 * chiffrés (AES-GCM 256 : 12 octets d'IV, puis le contenu chiffré).
 * Le jeu les télécharge, les déchiffre dans le navigateur et les joue depuis
 * la mémoire : il n'existe plus de lien direct vers un MP3.
 *
 * La clé vient de VITE_MUSIC_KEY au moment de la construction :
 *   - en local : fichier .env.local (jamais envoyé sur GitHub) ;
 *   - en ligne : secret GitHub Actions MUSIC_KEY.
 * Chiffrer de nouveaux morceaux : `npm run music:encrypt` (voir scripts/).
 *
 * Limite : c'est un frein, pas un coffre-fort. Le son peut toujours être
 * enregistré pendant qu'il joue, et une personne très technique peut
 * retrouver la clé dans le code du site.
 */
const MUSIC_DIR = 'assets/audio/music/';
const KEEP = 3; // morceaux déchiffrés gardés en mémoire

let keyPromise: Promise<CryptoKey | null> | null = null;
const cache = new Map<string, Promise<string>>();

function key(): Promise<CryptoKey | null> {
  keyPromise ??= (async () => {
    const raw = import.meta.env.VITE_MUSIC_KEY as string | undefined;
    if (!raw || !crypto?.subtle) return null;
    try {
      const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      return await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
    } catch {
      return null;
    }
  })();
  return keyPromise;
}

/** Nom de fichier déclaré dans les niveaux (« menu.mp3 ») → fichier chiffré servi (« menu.bin »). */
export const encryptedName = (file: string): string => file.replace(/\.[a-z0-9]+$/i, '') + '.bin';

/**
 * Adresse temporaire (blob:) du morceau déchiffré, utilisable par un élément <audio>.
 * Rejette si la clé manque ou si le fichier est illisible : le jeu reste alors silencieux.
 */
export function musicUrl(file: string): Promise<string> {
  const hit = cache.get(file);
  if (hit) {
    // Remis en tête de file (le plus récemment utilisé).
    cache.delete(file);
    cache.set(file, hit);
    return hit;
  }
  const p = (async () => {
    const k = await key();
    if (!k) throw new Error('clé de musique absente');
    const res = await fetch(`${import.meta.env.BASE_URL}${MUSIC_DIR}${encryptedName(file)}`);
    if (!res.ok) throw new Error(`musique introuvable : ${file}`);
    const data = new Uint8Array(await res.arrayBuffer());
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, k, data.slice(12));
    return URL.createObjectURL(new Blob([plain], { type: 'audio/mpeg' }));
  })();
  p.catch(() => cache.delete(file));
  cache.set(file, p);
  // On ne garde que les derniers morceaux pour ménager la mémoire du téléphone.
  while (cache.size > KEEP) {
    const [oldest, url] = cache.entries().next().value as [string, Promise<string>];
    cache.delete(oldest);
    // Libéré un peu plus tard : le fondu de sortie peut encore l'utiliser.
    void url.then((u) => window.setTimeout(() => URL.revokeObjectURL(u), 5000), () => undefined);
  }
  return p;
}
