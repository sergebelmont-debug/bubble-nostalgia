/**
 * CLASSEMENT EN LIGNE (Supabase)
 * ------------------------------
 * Renseigner ici l'adresse du projet Supabase et sa clé PUBLIQUE
 * (« anon » ou « publishable » dans Project Settings → API).
 * Cette clé est faite pour être visible dans le jeu : la sécurité repose sur
 * les fonctions de supabase/classement.sql, qui vérifient chaque envoi.
 *
 * NE JAMAIS mettre ici la clé « service_role » / « secret ».
 *
 * Tant que ces deux valeurs sont vides, le bouton « Classement » est masqué.
 */
export const ONLINE = {
  url: 'https://xfvyujzzrubpqzrimots.supabase.co',
  key: 'sb_publishable_0__DCATjWu45u9UGz6VG4g_ZvEUW_uF',
};

export const isOnline = (): boolean => Boolean(ONLINE.url && ONLINE.key);
