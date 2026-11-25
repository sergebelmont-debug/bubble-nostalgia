import { isOnline, ONLINE } from '../config/online';

/**
 * MESURE D'AUDIENCE ANONYME
 * -------------------------
 * Conçue pour l'exemption de consentement de la CNIL :
 *  • un identifiant tiré au hasard par appareil (aucun nom, aucune adresse IP
 *    enregistrée par le jeu, rien n'est partagé ni croisé) ;
 *  • uniquement des mesures sur l'usage du jeu (parties, durée, retours) ;
 *  • le joueur peut refuser à tout moment (Réglages → Confidentialité) ;
 *  • les données sont effacées au bout de 13 mois (côté serveur).
 *
 * Les événements sont regroupés et envoyés toutes les 20 secondes, et au
 * moment où le joueur quitte la page.
 */
const VISITOR_KEY = 'sbbr-visitor-v1';
const OPTOUT_KEY = 'sbbr-analytics-optout';
const FLUSH_MS = 20000;

type EventType =
  | 'open'
  | 'time'
  | 'level_start'
  | 'level_end'
  | 'collection'
  | 'photo'
  | 'guide'
  | 'board'
  | 'pseudo'
  | 'lang'
  | 'optout';

interface AnalyticsEvent {
  type: EventType;
  level?: number;
  seconds?: number;
  percent?: number;
  result?: 'won' | 'lost' | 'quit';
  lang?: string;
  src?: string;
  device?: string;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible */
  }
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Provenance : ?src=… dans le lien, sinon le site d'où vient le visiteur. */
function source(): string {
  const param = new URLSearchParams(location.search).get('src');
  if (param) return param.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 30) || 'direct';
  let host = '';
  try {
    host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
  } catch {
    /* référent illisible */
  }
  if (!host || host === location.hostname) return host ? 'site' : 'direct';
  const known: Array<[RegExp, string]> = [
    [/(^|\.)facebook\.com$|(^|\.)fb\.com$|messenger\.com$/, 'facebook'],
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)youtube\.com$|youtu\.be$/, 'youtube'],
    [/(^|\.)google\./, 'google'],
    [/(^|\.)whatsapp\./, 'whatsapp'],
    [/(^|\.)submithub\.com$/, 'submithub'],
    [/(^|\.)spotify\.com$/, 'spotify'],
    [/(^|\.)(twitter|x)\.com$|^t\.co$/, 'x'],
    [/sergebelmont\.com$/, 'site'],
  ];
  for (const [re, name] of known) if (re.test(host)) return name;
  return 'autre';
}

function device(): 'mobile' | 'tablet' | 'desktop' {
  const touch = navigator.maxTouchPoints > 0;
  const w = Math.min(screen.width, screen.height);
  if (touch && w < 600) return 'mobile';
  if (touch) return 'tablet';
  return 'desktop';
}

class Analytics {
  private queue: AnalyticsEvent[] = [];
  private visitor = '';
  private readonly session = uuid();
  private timer = 0;
  private activeSince = 0;
  private activeMs = 0;
  private started = false;
  private level: { number: number; since: number; percent: number } | null = null;

  get optedOut(): boolean {
    return read(OPTOUT_KEY) === '1';
  }

  private get enabled(): boolean {
    // Uniquement sur le vrai site : les essais en local ne faussent pas les chiffres.
    const realSite = /(^|\.)sergebelmont\.com$/.test(location.hostname);
    return realSite && isOnline() && !this.optedOut;
  }

  /** À appeler une fois au démarrage. */
  start(lang: string): void {
    if (this.started) return;
    this.started = true;
    if (!this.enabled) return;
    this.visitor = read(VISITOR_KEY) ?? '';
    if (!this.visitor) {
      this.visitor = uuid();
      write(VISITOR_KEY, this.visitor);
    }
    this.push({ type: 'open', lang, src: source(), device: device() });
    this.activeSince = document.hidden ? 0 : performance.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseClock();
        this.flush(true);
      } else if (!this.activeSince) {
        this.activeSince = performance.now();
      }
    });
    window.addEventListener('pagehide', () => {
      this.endLevel('quit');
      this.pauseClock();
      this.flush(true);
    });
    this.timer = window.setInterval(() => {
      this.pauseClock();
      if (!document.hidden) this.activeSince = performance.now();
      this.flush(false);
    }, FLUSH_MS);
  }

  /** Le joueur refuse (ou accepte de nouveau) la mesure d'audience. */
  setOptOut(out: boolean): void {
    if (out) {
      if (this.enabled) {
        this.push({ type: 'optout' });
        this.flush(true);
      }
      write(OPTOUT_KEY, '1');
      write(VISITOR_KEY, null); // l'identifiant est supprimé de l'appareil
      this.queue = [];
      window.clearInterval(this.timer);
    } else {
      write(OPTOUT_KEY, null);
      this.started = false;
      this.start(document.documentElement.lang);
    }
  }

  track(type: EventType, extra: Omit<AnalyticsEvent, 'type'> = {}): void {
    if (!this.enabled || !this.visitor) return;
    this.push({ type, ...extra });
  }

  levelStart(number: number): void {
    this.endLevel('quit');
    this.level = { number, since: performance.now(), percent: 0 };
    this.track('level_start', { level: number });
  }

  levelProgress(percent: number): void {
    if (this.level) this.level.percent = percent;
  }

  /** Fin de niveau : gagné, perdu, ou abandonné (retour à la carte, page quittée…). */
  endLevel(result: 'won' | 'lost' | 'quit', percent?: number): void {
    if (!this.level) return;
    const seconds = Math.round((performance.now() - this.level.since) / 1000);
    this.track('level_end', { level: this.level.number, result, seconds, percent: percent ?? this.level.percent });
    this.level = null;
  }

  private pauseClock(): void {
    if (!this.activeSince) return;
    this.activeMs += performance.now() - this.activeSince;
    this.activeSince = 0;
  }

  private push(e: AnalyticsEvent): void {
    this.queue.push(e);
    if (this.queue.length >= 40) this.flush(false);
  }

  private flush(leaving: boolean): void {
    if (!this.enabled || !this.visitor) return;
    const secs = Math.round(this.activeMs / 1000);
    if (secs > 0) {
      this.queue.push({ type: 'time', seconds: secs });
      this.activeMs = 0;
    }
    if (!this.queue.length) return;
    const events = this.queue.splice(0, 50);
    try {
      void fetch(`${ONLINE.url.replace(/\/$/, '')}/rest/v1/rpc/log_events`, {
        method: 'POST',
        headers: { apikey: ONLINE.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_visitor: this.visitor, p_session: this.session, p_events: events }),
        keepalive: leaving,
      }).catch(() => {
        /* hors ligne : ces mesures sont perdues, sans gêner le jeu */
      });
    } catch {
      /* ignoré */
    }
  }
}

export const analytics = new Analytics();
