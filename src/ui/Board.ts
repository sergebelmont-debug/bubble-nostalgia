import { esc, num, t } from '../i18n';
import { analytics } from '../services/Analytics';
import { BoardError, fetchBoard, playerPseudo, setPseudo, type BoardRow } from '../services/Leaderboard';

/** Écran « Classement » : pseudo du joueur et meilleurs scores cumulés. */
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const fmt = num;

function rowHtml(r: BoardRow): string {
  const medal = r.rank <= 3 ? ` medal-${r.rank}` : '';
  return `<li class="board-row${r.is_me ? ' me' : ''}${medal}">
    <span class="b-rank">${r.rank}</span>
    <span class="b-name">${esc(r.pseudo)}</span>
    <span class="b-levels">${esc(t('board.levels', { n: r.levels }))} · ★ ${r.stars}</span>
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

  status.textContent = t('board.loading');
  list.innerHTML = '';
  const id = ++requestId;
  fetchBoard().then(
    ({ top, me }) => {
      if (id !== requestId) return;
      list.innerHTML = top.map(rowHtml).join('');
      status.textContent = top.length ? '' : t('board.empty');
      if (me) {
        $('board-me-rank').textContent = t('board.myRank', { rank: t('rank', { n: me.rank }), total: fmt(me.total) });
        if (!top.some((r) => r.is_me)) list.insertAdjacentHTML('beforeend', `<li class="board-gap">…</li>${rowHtml({ ...me, is_me: true })}`);
      } else if (pseudo) {
        $('board-me-rank').textContent = t('board.firstLevel');
      }
    },
    (e: unknown) => {
      if (id !== requestId) return;
      status.textContent = e instanceof BoardError ? e.message : t('board.unavailable');
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
      msg.textContent = t('board.length');
      return;
    }
    submit.disabled = true;
    msg.textContent = t('board.saving');
    setPseudo(value).then(
      () => {
        submit.disabled = false;
        analytics.track('pseudo');
        renderBoard();
      },
      (err: unknown) => {
        submit.disabled = false;
        msg.textContent = err instanceof BoardError ? err.message : t('board.saveFailed');
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
