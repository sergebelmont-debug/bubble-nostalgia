-- ════════════════════════════════════════════════════════════════════════
-- CLASSEMENT ANONYME — Bubble Nostalgia
-- À exécuter une fois dans Supabase : SQL Editor → New query → coller → Run.
-- Peut être relancé sans risque (ne supprime aucune donnée).
--
-- Principe :
--  • aucun compte : chaque appareil crée un identifiant + un jeton secret
--    (stockés sur l'appareil) ; seul le hachage du jeton est enregistré ici ;
--  • les tables ne sont PAS accessibles directement depuis le jeu : tout passe
--    par les fonctions ci-dessous, qui vérifient chaque envoi côté serveur ;
--  • la clé publique (anon / publishable) suffit au jeu. Ne jamais mettre la
--    clé « service_role » / « secret » dans le jeu.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.players (
  id          uuid primary key,
  token_hash  bytea not null,
  pseudo      text  not null,
  pseudo_key  text  not null unique,          -- pseudo en minuscules : unicité
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.scores (
  player_id   uuid not null references public.players(id) on delete cascade,
  level       int  not null,
  score       int  not null,
  stars       int  not null,
  updated_at  timestamptz not null default now(),
  primary key (player_id, level)
);

-- Aucun accès direct aux tables depuis le jeu.
alter table public.players enable row level security;
alter table public.scores  enable row level security;
revoke all on public.players from anon, authenticated;
revoke all on public.scores  from anon, authenticated;

-- ── Réglages de vérification ────────────────────────────────────────────
-- Nombre de niveaux du jeu (à augmenter quand on ajoute des niveaux).
create or replace function public.bn_level_count() returns int
language sql immutable as $$ select 12 $$;
-- Score maximal crédible pour un niveau (les meilleures parties font ~10 000).
create or replace function public.bn_max_score() returns int
language sql immutable as $$ select 40000 $$;

-- Vérifie l'identité d'un joueur (identifiant + jeton secret).
create or replace function public.bn_check_player(p_id uuid, p_token text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from players
    where id = p_id and token_hash = sha256(convert_to(coalesce(p_token, ''), 'UTF8'))
  ) then
    raise exception 'joueur_inconnu';
  end if;
end $$;

-- ── Choisir / modifier son pseudo (crée le joueur la première fois) ──────
create or replace function public.set_pseudo(p_id uuid, p_token text, p_pseudo text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_pseudo text := regexp_replace(trim(coalesce(p_pseudo, '')), '\s+', ' ', 'g');
  v_key    text := lower(v_pseudo);
  v_hash   bytea := sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
begin
  if length(coalesce(p_token, '')) < 20 then raise exception 'jeton_invalide'; end if;
  if char_length(v_pseudo) < 3 or char_length(v_pseudo) > 16 then raise exception 'pseudo_longueur'; end if;
  if v_pseudo !~ '^[A-Za-z0-9À-ÖØ-öø-ÿ _.\-]+$' then raise exception 'pseudo_caracteres'; end if;
  if exists (select 1 from players where pseudo_key = v_key and id <> p_id) then
    raise exception 'pseudo_pris';
  end if;

  if exists (select 1 from players where id = p_id) then
    perform bn_check_player(p_id, p_token);
    update players set pseudo = v_pseudo, pseudo_key = v_key, updated_at = now() where id = p_id;
  else
    insert into players (id, token_hash, pseudo, pseudo_key) values (p_id, v_hash, v_pseudo, v_key);
  end if;
  return v_pseudo;
end $$;

-- ── Envoyer le meilleur score d'un niveau ────────────────────────────────
create or replace function public.submit_score(p_id uuid, p_token text, p_level int, p_score int, p_stars int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_prev timestamptz;
begin
  perform bn_check_player(p_id, p_token);
  if p_level < 1 or p_level > bn_level_count() then raise exception 'niveau_invalide'; end if;
  if p_score < 0 or p_score > bn_max_score() then raise exception 'score_invalide'; end if;
  if p_stars < 1 or p_stars > 3 then raise exception 'etoiles_invalides'; end if;
  -- Progression cohérente : un niveau ne compte que si le précédent est réussi.
  if p_level > 1 and not exists (select 1 from scores where player_id = p_id and level = p_level - 1) then
    raise exception 'niveau_precedent_manquant';
  end if;
  -- Anti-rafale : un envoi par niveau toutes les 5 secondes au plus.
  select updated_at into v_prev from scores where player_id = p_id and level = p_level;
  if v_prev is not null and v_prev > now() - interval '5 seconds' then
    raise exception 'trop_rapide';
  end if;

  insert into scores (player_id, level, score, stars) values (p_id, p_level, p_score, p_stars)
  on conflict (player_id, level) do update
    set score = greatest(scores.score, excluded.score),
        stars = greatest(scores.stars, excluded.stars),
        updated_at = now();
  return (select score from scores where player_id = p_id and level = p_level);
end $$;

-- ── Lire le classement ───────────────────────────────────────────────────
create or replace function public.get_leaderboard(p_limit int default 50)
returns table (rank bigint, pseudo text, total bigint, levels bigint, stars bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select * from (
    select rank() over (order by sum(s.score) desc, count(*) desc) as rank,
           p.pseudo, sum(s.score) as total, count(*) as levels, sum(s.stars) as stars, false as is_me
    from scores s join players p on p.id = s.player_id
    group by p.id, p.pseudo
  ) t
  order by rank, pseudo
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- Rang d'un joueur (pour l'afficher même s'il n'est pas dans les premiers).
create or replace function public.get_player_rank(p_id uuid)
returns table (rank bigint, pseudo text, total bigint, levels bigint, stars bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select * from (
    select rank() over (order by sum(s.score) desc, count(*) desc) as rank,
           p.pseudo, sum(s.score) as total, count(*) as levels, sum(s.stars) as stars, (p.id = p_id) as is_me
    from scores s join players p on p.id = s.player_id
    group by p.id, p.pseudo
  ) t
  where is_me;
$$;

-- Seules ces fonctions sont appelables par le jeu.
revoke all on function public.bn_check_player(uuid, text) from public, anon, authenticated;
grant execute on function public.set_pseudo(uuid, text, text) to anon;
grant execute on function public.submit_score(uuid, text, int, int, int) to anon;
grant execute on function public.get_leaderboard(int) to anon;
grant execute on function public.get_player_rank(uuid) to anon;
