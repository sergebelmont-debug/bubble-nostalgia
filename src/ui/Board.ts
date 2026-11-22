import { BoardError, fetchBoard, playerPseudo, setPseudo, type BoardRow } from '../services/Leaderboard';

/** Écran « Classement » : pseudo du joueur et meilleurs scores cumulés. */
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fmt = (n: number): string => Number(n).toLocaleString('fr-FR');

function rowHtml(r: BoardRow): string {
  const medal = r.rank <= 3 ? ` medal-${r.rank}` : '';
  return `<li class="board-row${r.is_me ? ' me' : ''}${medal}">
    <span class="b-rank">${r.rank}</span>
    <span class="b-name">${esc(r.pseudo)}</span>
    <span class="b-levels">${r.levels} niv. · ★ ${r.stars}</span>
    <span class="b-score">${fmt(r.total)}</span>
  </li>`;
}

let requestId = 0;

export function renderBoard(): void {
  const status = $('board-status');
  const list = $('board-list');
  const form = $('board-form');
  const meBox = $('board-me');
  const input = $<HTMLInputElement>('board-pseudo');
  const pseudo = playerPseudo();

  form.classList.toggle('hidden', Boolean(pseudo));
  meBox.classList.toggle('hidden', !pseudo);
  $('board-form-msg').textContent = '';
  if (pseudo) $('board-me-name').textContent = pseudo;
  $('board-me-rank').textContent = '';

  status.textContent = 'Chargement du classement…';
  list.innerHTML = '';
  const id = ++requestId;
  fetchBoard().then(
    ({ top, me }) => {
      if (id !== requestId) return;
      list.innerHTML = top.map(rowHtml).join('');
      status.textContent = top.length ? '' : 'Personne au classement pour l’instant. Soyez le premier !';
      if (me) {
        $('board-me-rank').textContent = `${me.rank}ᵉ · ${fmt(me.total)} points`;
        if (!top.some((r) => r.is_me)) list.insertAdjacentHTML('beforeend', `<li class="board-gap">…</li>${rowHtml({ ...me, is_me: true })}`);
      } else if (pseudo) {
        $('board-me-rank').textContent = 'Terminez le niveau 1 pour entrer au classement.';
      }
    },
    (e: unknown) => {
      if (id !== requestId) return;
      status.textContent = e instanceof BoardError ? e.message : 'Classement indisponible.';
    },
  );

  input.value = pseudo ?? '';
}

export function initBoard(onClick: () => void): void {
  const form = $<HTMLFormElement>('board-form');
  const input = $<HTMLInputElement>('board-pseudo');
  const submit = $<HTMLButtonElement>('btn-board-save');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onClick();
    const value = input.value.trim();
    const msg = $('board-form-msg');
    if (value.length < 3 || value.length > 16) {
      msg.textContent = 'Le pseudo doit faire entre 3 et 16 caractères.';
      return;
    }
    submit.disabled = true;
    msg.textContent = 'Enregistrement…';
    setPseudo(value).then(
      () => {
        submit.disabled = false;
        renderBoard();
      },
      (err: unknown) => {
        submit.disabled = false;
        msg.textContent = err instanceof BoardError ? err.message : 'Le pseudo n’a pas pu être enregistré.';
      },
    );
  });

  $('btn-board-edit').addEventListener('click', () => {
    onClick();
    $('board-me').classList.add('hidden');
    form.classList.remove('hidden');
    input.focus();
  });
}
