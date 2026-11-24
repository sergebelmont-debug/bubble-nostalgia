/**
 * TEXTES DE RÉFÉRENCE (français)
 * ------------------------------
 * Chaque langue reprend exactement ces clés (vérifié à la compilation).
 * `{nom}` est remplacé à l'affichage. Les clés finissant par `Html` peuvent
 * contenir <b> et <br> ; les autres sont du texte simple (un \n devient un
 * retour à la ligne).
 */
export const fr = {
  // Formats
  pct: '{n} %',
  rank: '{n}ᵉ',

  // Barre du haut pendant la partie
  'hud.level': 'Niveau',
  'hud.score': 'Score',
  'hud.shots': 'Tirs restants',
  'hud.reveal': '{p} · objectif {t}',
  'aria.settings': 'Réglages',
  'aria.restart': 'Recommencer le niveau',
  'aria.toMap': 'Retour à la carte des niveaux',
  'aria.home': 'Retour à l’accueil',

  // Accueil
  'home.tagline': 'Éclatez les boules, dissipez le brouillard\net révélez la photographie.',
  'home.play': 'Jouer',
  'home.collection': 'Collection',
  'home.board': 'Classement',
  'home.progress': '★ {stars} · Niveau {level} sur {total}',
  'home.version': 'Version {v}',

  // Carte des niveaux
  'map.title': 'Niveaux',
  'map.guide': '? Comment jouer',
  'map.locked': 'Niveau {n} verrouillé',
  'map.level': 'Niveau {n} : {title}',

  // Collection
  'collection.title': 'Collection',
  'collection.none': 'Terminez un niveau pour obtenir sa photographie.',
  'collection.all': 'Collection complète. Bravo !',
  'collection.some': 'Terminez les niveaux pour obtenir les photographies grisées.',
  'collection.photo': 'Photographie',
  'collection.owned': 'Photo {n} : {title}',
  'collection.lockedAria': 'Photo {n} verrouillée : terminez le niveau {n}',
  'collection.lockedTile': 'Niveau {n}',
  close: 'Fermer',

  // Réglages
  'settings.title': 'Réglages',
  'settings.music': 'Musique',
  'settings.sfx': 'Effets sonores',
  'settings.note': 'À 0 %, le son correspondant est coupé.',
  'settings.analytics': 'Statistiques anonymes',
  'settings.privacy': 'Confidentialité',
  'settings.language': 'Langue',

  // Classement
  'board.title': 'Classement',
  'board.label': 'Choisissez un pseudo pour apparaître au classement (pas de compte à créer)',
  'board.placeholder': 'Votre pseudo',
  'board.save': 'Valider',
  'board.edit': 'Modifier',
  'board.foot': 'Score total = somme de vos meilleurs scores sur chaque niveau.',
  'board.loading': 'Chargement du classement…',
  'board.empty': 'Personne au classement pour l’instant. Soyez le premier !',
  'board.firstLevel': 'Terminez le niveau 1 pour entrer au classement.',
  'board.myRank': '{rank} · {total} points',
  'board.levels': '{n} niv.',
  'board.saving': 'Enregistrement…',
  'board.unavailable': 'Classement indisponible.',
  'board.offline': 'Classement indisponible : vérifiez votre connexion.',
  'board.updateFailed': 'Le classement n’a pas pu être mis à jour.',
  'board.saveFailed': 'Le pseudo n’a pas pu être enregistré.',
  'board.taken': 'Ce pseudo est déjà pris, choisissez-en un autre.',
  'board.length': 'Le pseudo doit faire entre 3 et 16 caractères.',
  'board.chars': 'Lettres, chiffres, espaces, points, tirets et « _ » uniquement.',
  'board.tooFast': 'Un instant… réessayez dans quelques secondes.',

  // Fin de niveau
  'end.won': 'Photo révélée !',
  'end.line': 'Les boules ont débordé…',
  'end.shots': 'Plus de tirs…',
  'end.wonSub': 'Niveau {n} · « {title} »',
  'end.lostSub': 'La photo n’était révélée qu’à {p}. Encore un effort !',
  'end.score': 'Score',
  'end.revealed': 'Photo révélée',
  'end.shotsLeft': 'Tirs restants',
  'end.map': 'Carte',
  'end.mapAria': 'Carte des niveaux',
  'end.again': 'Rejouer',
  'end.retry': 'Réessayer',
  'end.next': 'Niveau suivant',
  'end.allDone': 'Bravo ! De nouveaux niveaux arrivent bientôt.',
  'end.pseudoHint': 'Choisissez un pseudo dans « Classement » pour comparer vos scores.',

  // Dans le jeu (canevas)
  'game.next': 'SUIVANTE',
  'game.change': 'CHANGEMENT',
  'game.lostShot': 'Tir perdu',

  // Aide de la première partie
  'intro.title': 'Comment jouer',
  'intro.matchHtml': '<b>3 boules de la même couleur</b> ou plus éclatent et dévoilent la photo.',
  'intro.aimHtml': '<b>Glissez</b> pour viser, <b>relâchez</b> pour tirer.',
  'intro.goalHtml': 'Objectif : <b>{p}</b> de la photo',
  'intro.go': 'C’est parti !',
  'aim.hint': 'Glissez puis relâchez',
  'walls.title': 'Nouveau : les murs',
  'walls.text': 'Incassables : la boule rebondit dessus comme sur les bords.',

  // Comment jouer (page complète)
  'guide.title': 'Comment jouer',
  'guide.goal.t': 'Le but',
  'guide.goal.p':
    'Une photographie de Serge Belmont est cachée sous le brouillard. Chaque boule éclatée dissipe le brouillard autour d’elle. Dévoilez le pourcentage demandé (par exemple {p} au niveau 1) pour gagner et ajouter la photo à votre Collection.',
  'guide.aim.t': 'Viser et tirer',
  'guide.aim.p':
    'Posez le doigt n’importe où sur l’écran et glissez : la ligne pointillée montre le chemin de la boule et le cercle l’endroit exact où elle se posera. Relâchez pour tirer. Pour annuler, ramenez le doigt sous le canon avant de relâcher.',
  'guide.match.t': 'Associer 3 couleurs',
  'guide.match.p':
    'Quand la boule tirée touche un groupe de sa couleur et forme au moins 3 boules identiques, tout le groupe éclate. Plus le groupe est grand, plus il rapporte de points.',
  'guide.fall.t': 'Les boules qui tombent',
  'guide.fall.p':
    'Les boules qui ne sont plus reliées au plafond tombent : elles percent le brouillard sur leur passage jusqu’en bas de la photo et rapportent des points en plus. Visez les boules qui en retiennent beaucoup d’autres !',
  'guide.walls.t': 'Rebonds et murs',
  'guide.walls.p':
    'La boule rebondit sur les bords de l’écran. À partir du niveau 3, des murs dorés incassables apparaissent dans la partie haute : la boule rebondit aussi dessus. Servez-vous-en pour atteindre les boules cachées derrière. Une boule renvoyée vers le bas est perdue.',
  'guide.swap.t': 'Changer de boule',
  'guide.swap.p':
    'En bas à gauche, la boule suivante : touchez-la pour l’échanger avec celle du canon. Si vous ne tirez pas pendant 3 secondes (compteur en bas à droite), la boule change toute seule pour une autre couleur, sans vous coûter de tir.',
  'guide.shots.t': 'Tirs et ligne de danger',
  'guide.shots.p':
    'Le nombre de tirs est limité (compteur en haut). La barre du haut montre la part de photo dévoilée et le trait de l’objectif. Si une boule se pose sous la ligne pointillée près du canon, la partie est perdue.',
  'guide.stars.t': 'Étoiles et score',
  'guide.stars.p':
    'Les tirs qui vous restent à la fin rapportent un bonus : 3 étoiles s’il vous reste au moins 35 % de vos tirs, 2 étoiles à partir de 12 %, 1 étoile sinon. Vous pouvez rejouer un niveau terminé pour améliorer votre score.',
  'guide.more.t': 'Collection, classement, réglages',
  'guide.more.p':
    'Chaque niveau réussi ajoute sa photo à la Collection. Dans Classement, choisissez un pseudo (sans compte) : votre score total est la somme de vos meilleurs scores. La roue dentée règle le volume de la musique et des effets sonores, et la langue.',

  // Titres des photographies, du niveau 1 au niveau 12
  levels: [
    'La rose et la montre',
    'Terrasse sur la mer',
    'Clair de lune',
    'Lecture au couchant',
    'La rose blanche',
    'Crépuscule',
    'La lettre',
    'Sous le grand arbre',
    'Jour de pluie',
    'L’accordéon',
    'La valse',
    'Promenade en bord de mer',
  ],
};

export type Dict = typeof fr;
export type TextKey = Exclude<keyof Dict, 'levels'>;
