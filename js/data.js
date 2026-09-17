/* ============================================================
   DONNÉES DU JEU — dialogues, clients, événements, journées, fins
   Tous les textes sont en français.
   Tons : 0 = gentil, 1 = neutre, 2 = sec, 3 = méchant, 4 = diabolique
   ============================================================ */

/* Effets par défaut selon le ton (irr = irritation du client, mech = points
   de désagréabilité, rep = réputation, risk = risque de licenciement,
   pat = patience récupérée par la caissière, vit = vitesse, cash = euros) */
const TONS = {
  0: { irr: -25, mech: 0,  rep: 3,  risk: -2, pat: -3, vit: 0,  nom: 'gentil' },
  1: { irr: -6,  mech: 1,  rep: 0,  risk: 0,  pat: 0,  vit: 1,  nom: 'neutre' },
  2: { irr: 11,  mech: 5,  rep: -3, risk: 0,  pat: 4,  vit: 0,  nom: 'sec' },
  3: { irr: 19,  mech: 10, rep: -6, risk: 1,  pat: 6,  vit: -1, nom: 'méchant' },
  4: { irr: 26,  mech: 16, rep: -10,risk: 2,  pat: 9,  vit: -2, nom: 'diabolique' }
};

/* Niveau de désagréabilité visé par chaque ton : la jauge glisse vers cette
   cible, ce qui oblige à rester durablement odieuse pour dépasser 80. */
const CIBLES_MECHANCETE = [0, 18, 52, 78, 100];

/* Fabrique une réplique : k(emoji, texte, ton, jourDeDeblocage, surcharges) */
function k(e, t, ton, d, extra) {
  const base = TONS[ton];
  return Object.assign({
    e: e, t: t, ton: ton, d: d || 1,
    irr: base.irr, mech: base.mech, rep: base.rep,
    risk: base.risk, pat: base.pat, vit: base.vit, cash: 0
  }, extra || {});
}

/* ============================================================
   RÉPLIQUES GÉNÉRIQUES (par phase, débloquées au fil des jours)
   ============================================================ */
const GEN = {
  accueil: [
    k('😊', "« Bonjour ! Bienvenue, je vous en prie. »", 0, 1),
    k('🙂', "« Bonjour. »", 1, 1),
    k('😐', "« ... » (ne rien dire du tout)", 2, 1),
    k('😒', "« Bonjour. » (sur le ton de quelqu'un qui annonce un décès)", 2, 1),
    k('🙄', "« Ah. Encore un. »", 3, 1),
    k('😤', "« Vous avez vu l'heure ? J'allais souffler. »", 3, 2),
    k('😈', "« Bonjour... enfin, si on veut. »", 4, 2),
    k('😈', "« Vous êtes sûr de vouloir passer à MA caisse ? »", 4, 3),
    k('👋', "« Bonjour ! Comment allez-vous aujourd'hui ? »", 0, 2),
    k('😑', "« Suivant. » (alors qu'il est déjà là)", 3, 3),
    k('🥱', "« Bonjouuur. » (bâillement de trois secondes en plein milieu)", 3, 4),
    k('😈', "« Tiens, la file avait besoin de plus de souffrance. »", 4, 5)
  ],
  prix: [
    k('😊', "« Cela vous fait {P}, quand vous voulez. »", 0, 1),
    k('🙂', "« {P} s'il vous plaît. »", 1, 1),
    k('😐', "« {P}. » (ton d'annonce de gare)", 2, 1),
    k('😒', "« {P}. Et non, je ne peux rien y faire. »", 2, 1),
    k('🙄', "« {P}. Vous voulez que je vous l'écrive en gros ? »", 3, 2),
    k('😈', "« {P}. Le beurre coûte cher, la vie est dure, bonne journée. »", 3, 2),
    k('😈', "« {P}. Vous pouvez faire semblant d'être surpris, tout le monde le fait. »", 4, 3),
    k('💸', "« {P}. Oui. {P}. Je répète pour le plaisir de vous voir pâlir. »", 4, 4),
    k('😶', "(montrer l'écran du doigt sans rien dire)", 3, 3),
    k('😈', "« {P}. Vous voulez un plan de financement ? »", 4, 5)
  ],
  depart: [
    k('😊', "« Merci beaucoup, très bonne journée à vous ! »", 0, 1),
    k('🙂', "« Au revoir. »", 1, 1),
    k('😐', "« Suivant. »", 2, 1),
    k('😒', "« Voilà. Vous pouvez partir maintenant. »", 2, 1),
    k('🙄', "« Bonne journée. » (regard qui dit exactement le contraire)", 3, 2),
    k('😈', "« Au revoir, et surtout : à jamais. »", 3, 2),
    k('😈', "« Poussez-vous, vous bloquez la joie de vivre des autres. »", 4, 3),
    k('👉', "« La sortie est derrière vous. Comme votre chariot. »", 4, 4),
    k('😈', "« Merci d'avoir choisi notre magasin. Enfin, choisi... »", 4, 5),
    k('🤐', "(ne rien dire et regarder fixement le client suivant)", 3, 3)
  ]
};

/* ============================================================
   RÉACTIONS DU CLIENT selon son irritation
   ============================================================ */
const REACTIONS = {
  calme: [
    "« D'accord, merci. »", "« Très bien. »", "« Ah, parfait. »",
    "« Vous êtes aimable, ça fait plaisir. »", "« Bonne journée à vous aussi. »",
    "« Ça, c'est du service. »"
  ],
  agace: [
    "« ...Bon. »", "« Charmant. »", "« Ah oui, quand même. »",
    "« Je note le ton, hein. »", "« Mmh. »", "« On sent la passion du métier. »",
    "« Vous avez mal dormi ou c'est un choix de vie ? »"
  ],
  enerve: [
    "« Non mais je rêve. »", "« Vous vous entendez parler ? »",
    "« C'est votre façon de parler aux clients ? »", "« Je paie, je vous rappelle. »",
    "« Franchement, c'est du grand n'importe quoi. »",
    "« Vous croyez que c'est agréable ? »", "« Bon, je vais me calmer, MOI. »"
  ],
  furieux: [
    "« C'EST UN SCANDALE ! »", "« Je veux voir quelqu'un. MAINTENANT. »",
    "« Vous n'avez pas le droit de me parler comme ça ! »",
    "« Je vais faire un signalement, ça ne va pas se passer comme ça ! »",
    "« Trente ans que je viens ici ! TRENTE ANS ! »",
    "« Où est la caméra ? C'est filmé, ça ? »"
  ],
  rire: [
    "« Ha ! Alors là, bravo, je ne m'y attendais pas. »",
    "« (rire nerveux) Vous êtes terrible, vous. »",
    "« J'adore. Vous êtes une légende, vous savez ça ? »",
    "« (rit) Bon, au moins c'est franc. »"
  ],
  sarcasme: [
    "« Merveilleux. Vraiment. Quel accueil. »",
    "« Non non, prenez votre temps, j'ai toute ma vie. »",
    "« Je mettrai cinq étoiles, promis. »",
    "« C'est vous qui faites la formation des nouveaux, j'imagine ? »"
  ]
};

/* Réactions extrêmes quand l'irritation atteint 100 */
const EXTREMES = [
  { id: 'plainte',    txt: "« Ça suffit. Je vais faire une réclamation écrite. »", ico: '🗣️',
    eff: { risk: 8, mech: 8, rep: -7 }, stat: 'plaintes' },
  { id: 'responsable',txt: "« APPELEZ-MOI LE RESPONSABLE ! TOUT DE SUITE ! »", ico: '👔',
    eff: { risk: 12, mech: 12, rep: -10 }, stat: 'responsable', resp: true },
  { id: 'quitte',     txt: "« Gardez vos courses. Je m'en vais. »", ico: '🚪',
    eff: { risk: 6, mech: 14, rep: -8, perteCaddie: true }, stat: 'partis' },
  { id: 'avis',       txt: "« Je sors mon téléphone. Une étoile. UNE. »", ico: '⭐',
    eff: { risk: 7, mech: 10, rep: -12 }, stat: 'avis' },
  { id: 'pleure',     txt: "« Je... non, rien. » (la lèvre tremble)", ico: '😭',
    eff: { risk: 5, mech: 18, rep: -6 }, stat: 'traumatises' },
  { id: 'crie',       txt: "« NON MAIS VOUS ÊTES MALADE ?! »", ico: '📢',
    eff: { risk: 6, mech: 11, rep: -6 }, stat: 'enerves' },
  { id: 'appelle',    txt: "« Allô ? Non, tu ne vas pas me croire. Je te mets sur haut-parleur. »", ico: '📞',
    eff: { risk: 7, mech: 13, rep: -8 }, stat: 'avis' }
];

/* ============================================================
   PROFILS DE CLIENTS
   ============================================================ */
const CLIENTS = [

  /* ---------- 1. La cliente qui cherche sa monnaie ---------- */
  {
    id: 'monnaie', nom: 'Madame Colette', emoji: '👵', d: 1, art: 6, paiement: 'monnaie',
    desc: "Cherche sa monnaie depuis 1998",
    face: { peau: '#f3d0b0', cheveux: 'chignon', couleur: '#cfd3d6', lunettes: true, vetement: '#b46bb0' },
    arrivee: "« Bonjour ma petite dame. Attendez, je crois que j'ai l'appoint... »",
    beats: [
      { l: "« Attendez, attendez... j'ai une pièce de deux euros quelque part. Elle était là ce matin. »",
        c: [
          k('😊', "« Prenez votre temps, il n'y a pas d'urgence. »", 0, 1),
          k('🙂', "« D'accord. »", 1, 1),
          k('😒', "« Elle était là ce matin, mais nous on est l'après-midi. »", 2, 1),
          k('🙄', "« Fouillez, fouillez. Je vieillis très bien debout. »", 3, 1),
          k('😈', "« Si vous la trouvez, encadrez-la, ce sera un événement historique. »", 4, 2)
        ] },
      { l: "« Ah non, ça c'est un bouton. Et ça c'est une pièce de franc. Vous prenez les francs ? »",
        c: [
          k('😊', "« Non, mais gardez-la, elle a de la valeur sentimentale. »", 0, 1),
          k('🙂', "« Non, madame, plus depuis un moment. »", 1, 1),
          k('😐', "« On prend l'euro. Depuis 2002. »", 2, 1),
          k('😒', "« On prend l'euro, la carte, et la bonne volonté. Il vous reste deux options. »", 3, 2),
          k('😈', "« Oui, oui, on prend les francs, les drachmes et les coquillages. Posez tout là. »", 4, 3)
        ] },
      { l: "« Voilà ! J'ai trouvé ! ... Ah non, il manque huit centimes. »",
        c: [
          k('😊', "« Ce n'est rien, je les mets de ma poche. »", 0, 1, { cash: -1, rep: 6 }),
          k('🙂', "« Ce n'est pas grave, on arrondit. »", 1, 1),
          k('😒', "« Huit centimes. On va les chercher ensemble ou bien ? »", 2, 1),
          k('😤', "« Je vais compter à voix haute pour vous aider. Un. Deux. Trois... »", 3, 2),
          k('😈', "« Huit centimes. La file entière a vieilli de deux ans pour huit centimes. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 2. Le client pressé ---------- */
  {
    id: 'presse', nom: 'Monsieur Chrono', emoji: '🏃', d: 1, art: 4, paiement: 'sanscontact',
    desc: "Est en retard sur sa propre vie",
    face: { peau: '#e8b98b', cheveux: 'court', couleur: '#3b2b20', lunettes: false, vetement: '#3d6fd6', barbe: true },
    arrivee: "« Vite vite vite, je suis garé en double file ! »",
    beats: [
      { l: "« Vous pouvez accélérer un peu, s'il vous plaît ? Je suis très pressé. »",
        c: [
          k('😊', "« Bien sûr, je fais au plus vite ! »", 0, 1, { vit: 4 }),
          k('🙂', "« Je fais ce que je peux. »", 1, 1),
          k('😒', "« Je vais au rythme du scanner, pas au rythme de votre stress. »", 2, 1),
          k('🐌', "« Bien sûr. » (et scanner deux fois plus lentement)", 3, 1, { vit: -6, mech: 14 }),
          k('😈', "« Je peux même ralentir, si vous préférez. Regardez : je ra-len-tis. »", 4, 2, { vit: -8, mech: 18 })
        ] },
      { l: "« Franchement, il n'y a qu'une caisse ouverte, c'est n'importe quoi ! »",
        c: [
          k('😊', "« Je comprends, je vais appeler une collègue. »", 0, 1),
          k('🙂', "« Je transmettrai. »", 1, 1),
          k('😒', "« Je transmettrai à la direction, qui transmettra au vent. »", 2, 1),
          k('🙄', "« Ouvrez-en une, tiens. Vous avez l'air plein d'énergie. »", 3, 2),
          k('😈', "« Il y a une caisse automatique. Elle est en panne, mais elle est là. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 3. Le client qui veut absolument son ticket ---------- */
  {
    id: 'ticket', nom: 'Monsieur Justificatif', emoji: '🧾', d: 1, art: 7, paiement: 'carte',
    desc: "Archive ses tickets depuis douze ans",
    face: { peau: '#f0c9a4', cheveux: 'chauve', couleur: '#5a4a3a', lunettes: true, vetement: '#6b8e4e' },
    arrivee: "« Bonjour. Je voudrais le ticket. Le ticket papier. Imprimé. »",
    beats: [
      { l: "« Vous me donnez bien le ticket ? C'est pour ma comptabilité. »",
        c: [
          k('😊', "« Bien sûr, le voilà, je vous le plie même. »", 0, 1),
          k('🙂', "« Oui, il sort. »", 1, 1),
          k('😐', "« Il sort quand il veut. »", 2, 1),
          k('😒', "« Votre comptabilité de deux yaourts et d'un paquet de chips, oui. »", 3, 1),
          k('😈', "« Il s'imprime. Lentement. Comme votre journée. »", 4, 2)
        ] },
      { l: "« Il est un peu froissé. Vous pourriez m'en réimprimer un ? »",
        c: [
          k('😊', "« Aucun souci, je vous en fais un neuf. »", 0, 1),
          k('🙂', "« Je peux faire un duplicata. »", 1, 1),
          k('😒', "« Froissé mais valable. Comme nous tous. »", 2, 1),
          k('🙄', "« Je vais le repasser aussi, pendant que j'y suis ? »", 3, 2),
          k('😈', "« Je vous le refais en trois exemplaires, un pour vous, un pour l'État, un pour la postérité. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 4. Le silencieux ---------- */
  {
    id: 'silencieux', nom: 'Le Silencieux', emoji: '😐', d: 1, art: 5, paiement: 'carte',
    desc: "N'a pas prononcé un mot depuis 2011",
    face: { peau: '#d9a978', cheveux: 'court', couleur: '#1e1e1e', lunettes: false, vetement: '#4a4a55' },
    arrivee: "« ... » (pose ses articles sans un regard)",
    beats: [
      { l: "« ... »",
        c: [
          k('😊', "« Bonjour ! Vous allez bien ? »", 0, 1),
          k('🙂', "« ... » (respecter le silence)", 1, 1),
          k('😐', "« On va faire comme si vous aviez dit bonjour. »", 2, 1),
          k('😒', "« Vous êtes très reposant. Continuez. »", 2, 2),
          k('😈', "« C'est fascinant. Un client qui ne parle pas. Je vais pleurer de joie. »", 3, 2)
        ] },
      { l: "« ... » (il désigne le terminal du menton)",
        c: [
          k('😊', "« Oui bien sûr, c'est prêt, allez-y. »", 0, 1),
          k('🙂', "« Vous pouvez insérer. »", 1, 1),
          k('😐', "« Le menton, c'est charmant, mais ça ne paie pas. »", 2, 1),
          k('🙄', "« Un mot. Un seul. Je ne demande pas une conférence. »", 3, 2),
          k('😈', "« Je vais deviner, tiens. Vous voulez... un câlin ? »", 4, 3)
        ] }
    ]
  },

  /* ---------- 5. La cliente qui demande si la carte marche ---------- */
  {
    id: 'carte', nom: 'Madame Carte-Bleue', emoji: '💳', d: 2, art: 8, paiement: 'carte',
    desc: "Redemande toujours si la carte fonctionne",
    face: { peau: '#f6d8bb', cheveux: 'long', couleur: '#c26b2c', lunettes: false, vetement: '#e26aa0' },
    arrivee: "« Bonjour, dites-moi, la carte bancaire, ça marche aujourd'hui ? »",
    beats: [
      { l: "« La carte, ça fonctionne ? Parce que la dernière fois, ça ne marchait pas. »",
        c: [
          k('😊', "« Oui, tout fonctionne parfaitement aujourd'hui. »", 0, 1),
          k('🙂', "« Oui, ça marche. »", 1, 1),
          k('😐', "« On est un magasin. En 2026. »", 2, 1),
          k('😒', "« Non, on est passés au troc. Vous avez des chèvres ? »", 3, 1),
          k('😈', "« Ça marche, sauf pour les gens qui demandent si ça marche. »", 4, 2)
        ] },
      { l: "« Et le sans contact ? Il est plafonné à combien déjà ? Et si je dépasse ? »",
        c: [
          k('😊', "« Cinquante euros, au-delà on tape le code, c'est tout simple. »", 0, 1),
          k('🙂', "« Cinquante euros. »", 1, 1),
          k('😐', "« Au-delà, il vous demande le code. Le terminal parle, vous savez. »", 2, 1),
          k('🙄', "« Le plafond est écrit sur le terminal. En très gros. Juste là. »", 3, 2),
          k('😈', "« Le plafond est à cinquante. Comme mon niveau d'intérêt, qui est à zéro. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 6. Le client qui a oublié un article ---------- */
  {
    id: 'oubli', nom: 'Monsieur Encore-Un-Truc', emoji: '🛍️', d: 2, art: 9, paiement: 'carte',
    desc: "A toujours oublié quelque chose au fond du magasin",
    face: { peau: '#e2b183', cheveux: 'casquette', couleur: '#2f6fa8', lunettes: false, vetement: '#37a06e' },
    arrivee: "« Bonjour ! Ah zut, j'ai oublié le lait. Je peux y aller vite fait ? »",
    beats: [
      { l: "« Je reviens tout de suite, hein ! Vous gardez mes courses ? »",
        c: [
          k('😊', "« Allez-y, je vous garde ça, pas de problème ! »", 0, 1, { vit: -3 }),
          k('🙂', "« Faites vite. »", 1, 1),
          k('😒', "« Le lait est au fond. Tout au fond. Bon courage. »", 2, 1),
          k('🙄', "« Prenez aussi de quoi tenir le siège, tant qu'à faire. »", 3, 2),
          k('😈', "« Je garde vos courses... et je les rescanne toutes à votre retour. »", 4, 3, { vit: -5, mech: 6 })
        ] },
      { l: "« (revenu, essoufflé) Ah, finalement j'ai pris trois trucs en plus, ça vous embête ? »",
        c: [
          k('😊', "« Pas du tout, je vous les ajoute. »", 0, 1, { cash: 9 }),
          k('🙂', "« Je les scanne. »", 1, 1, { cash: 7 }),
          k('😐', "« Trois trucs. Trois. Pas quatre. »", 2, 1, { cash: 7 }),
          k('😒', "« Vous voulez pas faire vos courses pendant que vous y êtes ? Ah si, pardon. »", 3, 1, { cash: 5 }),
          k('😈', "« Allez-y, remplissez le tapis. La file adore les surprises. »", 4, 2, { cash: 4 })
        ] }
    ]
  },

  /* ---------- 6 bis. La cliente aux articles fragiles ---------- */
  {
    id: 'fragile', nom: 'Madame Tomates', emoji: '🍅', d: 2, art: 8, paiement: 'carte',
    desc: "Ses tomates valent plus que vous",
    face: { peau: '#f4d2b2', cheveux: 'long', couleur: '#6b4a2b', lunettes: false, vetement: '#4aa86b' },
    arrivee: "« Bonjour, vous pouvez faire attention à ne pas écraser mes tomates ? »",
    beats: [
      { l: "« Bonjour, vous pouvez faire attention à ne pas écraser mes tomates ? »",
        c: [
          k('😊', "« Bien sûr ! Je les mets sur le dessus. »", 0, 1),
          k('😐', "« Oui, oui... »", 1, 1),
          k('😒', "« C'est bon, ce sont des tomates, pas des diamants. »", 2, 1),
          k('😈', "« Si elles survivent au transport jusqu'à chez vous, ce sera déjà bien. »", 3, 2),
          k('💥', "(poser la bouteille de lessive dessus, très lentement, en soutenant son regard)", 4, 3, { mech: 20 })
        ] },
      { l: "« Et les œufs, vous pouvez les mettre à part ? Et le pain ? Et pas le pain sur les œufs. »",
        c: [
          k('😊', "« Je vous fais trois sacs séparés, ne vous inquiétez pas. »", 0, 1),
          k('🙂', "« D'accord. »", 1, 1),
          k('😐', "« Je n'ai que deux mains et un tapis. »", 2, 1),
          k('🙄', "« Vous voulez un plan de rangement ? Je peux faire un schéma. »", 3, 2),
          k('😈', "« Œufs, pain, tomates, tout dans le même sac. C'est la roulette du supermarché. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 7. Le raconteur de vie ---------- */
  {
    id: 'bavard', nom: 'Monsieur Toute-Ma-Vie', emoji: '🗣️', d: 2, art: 6, paiement: 'especes',
    desc: "Va vous raconter son opération du genou",
    face: { peau: '#efc49d', cheveux: 'gris', couleur: '#9b9b9b', lunettes: true, vetement: '#d6a33d', barbe: true },
    arrivee: "« Bonjour ! Alors, vous n'allez pas me croire, ce matin, figurez-vous... »",
    beats: [
      { l: "« ...et donc le docteur me dit : « Monsieur, votre genou, c'est plus un genou. » Vous imaginez ? »",
        c: [
          k('😊', "« Oh là là, j'espère que ça va mieux ! »", 0, 1),
          k('🙂', "« Ah oui. »", 1, 1),
          k('😐', "« Mmh. »", 2, 1),
          k('😒', "« Et mon oreille, c'est plus une oreille. On est deux. »", 3, 1),
          k('😈', "« Passionnant. Vraiment. Je vais en faire une série en huit saisons. »", 4, 2)
        ] },
      { l: "« Attendez, le plus drôle c'est mon voisin. Je vous raconte ? C'est long mais c'est bien. »",
        c: [
          k('😊', "« Allez-y, je vous écoute ! »", 0, 1, { vit: -4 }),
          k('🙂', "« Si vous voulez. »", 1, 1, { vit: -2 }),
          k('😐', "« Résumez. En un mot. »", 2, 1),
          k('🙄', "« C'est long mais c'est bien : ce sont exactement les mots que personne ne veut entendre en caisse. »", 3, 2),
          k('😈', "« Non. La réponse est non. Voilà, on a gagné dix minutes tous les deux. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 8. Le roi des cartes de fidélité ---------- */
  {
    id: 'fidelite', nom: 'Le Roi des Cartes', emoji: '🎟️', d: 3, art: 10, paiement: 'carte',
    desc: "47 cartes de fidélité, dont 44 périmées",
    face: { peau: '#dba377', cheveux: 'queue', couleur: '#43342a', lunettes: true, vetement: '#7d5ad6' },
    arrivee: "« Bonjour ! Attendez, j'ai la carte. J'ai LES cartes, en fait. »",
    beats: [
      { l: "« Alors : celle-ci, celle-là, celle du magasin d'à côté... vous prenez laquelle ? »",
        c: [
          k('😊', "« Je regarde avec vous, ne vous inquiétez pas. »", 0, 1),
          k('🙂', "« La nôtre, c'est la verte. »", 1, 1),
          k('😐', "« La verte. Uniquement la verte. »", 2, 1),
          k('😒', "« Vous avez plus de cartes que d'amis, c'est impressionnant. »", 3, 1),
          k('😈', "« Étalez tout, on va faire une exposition. La file paiera l'entrée. »", 4, 2)
        ] },
      { l: "« Et j'ai aussi ce bon de réduction. Il est de 2021 mais bon, ça doit passer, non ? »",
        c: [
          k('😊', "« Je tente, on ne sait jamais ! »", 0, 1, { cash: -2 }),
          k('🙂', "« Je vais essayer. »", 1, 1),
          k('😐', "« Il est périmé. »", 2, 1),
          k('🙄', "« 2021. Il a l'âge d'aller à l'école, votre bon. »", 3, 2),
          k('😈', "« Ça doit passer ? Mais oui. Et moi je dois gagner au loto. On rêve tous. »", 4, 3)
        ] },
      { l: "« Bon, et si je prends une carte supplémentaire, j'ai combien de points ? »",
        c: [
          k('😊', "« Je vous explique le programme, c'est très avantageux. »", 0, 1),
          k('🙂', "« Un point par euro. »", 1, 1),
          k('😐', "« Des points. Beaucoup de points. Aucun intérêt. »", 2, 1),
          k('😒', "« Assez pour obtenir, au bout de neuf ans, un porte-clés. »", 3, 2),
          k('😈', "« Vous aurez assez de points pour acheter... encore une carte. C'est un piège. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 9. L'inspecteur des prix ---------- */
  {
    id: 'verificateur', nom: "L'Inspecteur des Prix", emoji: '🔍', d: 3, art: 12, paiement: 'carte',
    desc: "Vérifie chaque prix, un par un, à voix haute",
    face: { peau: '#f0c49a', cheveux: 'court', couleur: '#6b6b6b', lunettes: true, vetement: '#c94f4f' },
    arrivee: "« Bonjour. Je surveille l'écran, hein. Je regarde tout. »",
    beats: [
      { l: "« Attendez ! Les biscuits, c'était 2,15 € en rayon, là vous m'avez mis 2,35 €. »",
        c: [
          k('😊', "« Vous avez raison, je corrige immédiatement, désolée. »", 0, 1, { cash: -1, rep: 5 }),
          k('🙂', "« Je vérifie. »", 1, 1),
          k('😐', "« C'est le prix caisse. »", 2, 1),
          k('😒', "« Vingt centimes. Vous allez vous en remettre, j'y crois. »", 3, 1),
          k('😈', "« Allez le rechercher, on comparera. Je vous attends. Enfin, la file vous attend. »", 4, 2, { vit: -5 })
        ] },
      { l: "« Et là, le yaourt, il était en promotion « 2 achetés = 1 offert ». Ça n'apparaît pas. »",
        c: [
          k('😊', "« Je vais appeler pour vérifier la promo, un instant. »", 0, 1),
          k('🙂', "« La promo se fait automatiquement en fin de ticket. »", 1, 1),
          k('😐', "« Si elle ne s'affiche pas, c'est qu'elle n'existe pas. »", 2, 1),
          k('🙄', "« Évidemment. Tout est toujours en promotion quand on arrive à la caisse. »", 3, 2),
          k('😈', "« Vous voulez que je vous offre le magasin aussi ? »", 4, 3)
        ] },
      { l: "« Je vais compter les articles avec vous. Un... deux... trois... »",
        c: [
          k('😊', "« On compte ensemble, ça ira plus vite. »", 0, 1),
          k('🙂', "« Comme vous voulez. »", 1, 1),
          k('😐', "« Douze. C'est douze. J'ai fait l'école. »", 2, 1),
          k('😒', "« Quatre... cinq... on va y arriver, monsieur, courage. »", 3, 2),
          k('😈', "« Continuez. Moi je pars en pause à midi, avec ou sans vous. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 10. Monsieur sans contact ---------- */
  {
    id: 'sanscontact', nom: 'Monsieur Sans-Contact', emoji: '🧓', d: 3, art: 5, paiement: 'sanscontact',
    desc: "Ne comprend pas ce paiement magique",
    face: { peau: '#f3d4b4', cheveux: 'gris', couleur: '#bdbdbd', lunettes: true, vetement: '#5b83c4' },
    arrivee: "« Bonjour. Alors, je fais comment avec le sans... le sans quoi déjà ? »",
    beats: [
      { l: "« Je la pose ? Je l'enfonce ? Je la frotte ? »",
        c: [
          k('😊', "« Posez-la juste au-dessus, sans appuyer, voilà, parfait ! »", 0, 1),
          k('🙂', "« Posez-la sur l'écran. »", 1, 1),
          k('😐', "« Ni frotter, ni enfoncer. Poser. »", 2, 1),
          k('😒', "« Ne la frottez pas, ce n'est pas une lampe magique. »", 3, 1),
          k('😈', "« Frottez. Faites un vœu. Ça marchera aussi bien. »", 4, 2)
        ] },
      { l: "« Ça n'a pas bipé ! Ça n'a pas bipé, hein ? Ça a bipé ? »",
        c: [
          k('😊', "« Si, si, c'est validé, tout va bien. »", 0, 1),
          k('🙂', "« C'est passé. »", 1, 1),
          k('😐', "« Ça a bipé. Moi je l'ai entendu. »", 2, 1),
          k('🙄', "« Ça a bipé trois fois. Le magasin entier a entendu. »", 3, 2),
          k('😈', "« Ça n'a pas bipé. Recommencez. » (ça avait bipé)", 4, 3, { mech: 8, vit: -3 })
        ] }
    ]
  },

  /* ---------- 11. Le téléphoné ---------- */
  {
    id: 'telephone', nom: 'Madame Allô-Oui', emoji: '📱', d: 4, art: 8, paiement: 'sanscontact',
    desc: "Au téléphone du début à la fin",
    face: { peau: '#e6b489', cheveux: 'long', couleur: '#2b2b2b', lunettes: false, vetement: '#e8a33d', accessoire: 'telephone' },
    arrivee: "« ...non mais attends, je suis à la caisse, je te rappelle. Enfin non, reste. »",
    beats: [
      { l: "« (au téléphone) Oui... oui... non... attends... (à vous, sans regarder) c'est combien ? »",
        c: [
          k('😊', "« Je vous laisse finir votre appel, aucun souci. »", 0, 1),
          k('🙂', "« Je vous dis ça tout de suite. »", 1, 1),
          k('😐', "« Je parlerai quand vous raccrocherez. »", 2, 1),
          k('😒', "« Dites à votre correspondant que la caisse attend. Il sera ravi. »", 3, 1),
          k('😈', "« ALLÔ ? OUI, BONJOUR, C'EST LA CAISSE, ON VOUS ATTEND ! »", 4, 2, { mech: 6 })
        ] },
      { l: "« (toujours au téléphone) Attends, elle me parle. Non mais attends. Oui ? Quoi ? »",
        c: [
          k('😊', "« Prenez votre temps, je patiente. »", 0, 1),
          k('🙂', "« Le terminal vous attend. »", 1, 1),
          k('😐', "« Je répète pour la troisième fois : c'est à vous. »", 2, 1),
          k('🙄', "« Vous voulez que je mette le haut-parleur, qu'on en profite tous ? »", 3, 2),
          k('😈', "« Je vais parler très fort dans votre téléphone. Ça s'appelle la vengeance passive. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 12. Le parent débordé ---------- */
  {
    id: 'parent', nom: 'Le Parent de Kevin', emoji: '🧒', d: 4, art: 14, paiement: 'carte',
    desc: "Kevin touche tout. Kevin est partout.",
    face: { peau: '#dfae82', cheveux: 'queue', couleur: '#4b3a2b', lunettes: false, vetement: '#3aa39a', accessoire: 'enfant' },
    arrivee: "« KEVIN ! On ne touche pas ! Bonjour. KEVIN ! »",
    beats: [
      { l: "« (Kevin ouvre un paquet de bonbons) Il l'a ouvert... bon, on le prend, hein. »",
        c: [
          k('😊', "« Ce n'est pas grave, ça arrive tout le temps ! »", 0, 1, { cash: 3 }),
          k('🙂', "« Je le compte. »", 1, 1, { cash: 3 }),
          k('😐', "« Ouvert = acheté. C'est la règle du monde. »", 2, 1, { cash: 3 }),
          k('😒', "« Kevin a un bel avenir en négociation commerciale. »", 3, 1, { cash: 3 }),
          k('😈', "« Je vais le scanner deux fois, une fois pour le paquet, une fois pour l'ambiance. »", 4, 2, { cash: 6, mech: 6 })
        ] },
      { l: "« KEVIN ! Descends de là ! ... Excusez-le, il est fatigué. »",
        c: [
          k('😊', "« Ils sont tous comme ça à cet âge, ne vous en faites pas. »", 0, 1),
          k('🙂', "« Ce n'est rien. »", 1, 1),
          k('😐', "« Fatigué. Bien sûr. Nous aussi. »", 2, 1),
          k('😒', "« Il est fatigué, moi je suis usée, on fait la paire. »", 3, 1),
          k('😈', "« Kevin est sur le tapis roulant. Je scanne Kevin ? Je scanne Kevin. » BIP.", 4, 2, { mech: 12 })
        ] }
    ]
  },

  /* ---------- 13. Le payeur en pièces ---------- */
  {
    id: 'pieces', nom: 'Monsieur Petite-Monnaie', emoji: '💶', d: 4, art: 7, paiement: 'pieces',
    desc: "Paie 34 € en pièces de 1 centime",
    face: { peau: '#caa07a', cheveux: 'casquette', couleur: '#7d6b3a', lunettes: false, vetement: '#8a6d4f', barbe: true },
    arrivee: "« Bonjour ! J'ai vidé la tirelire, ça vous dérange pas ? »",
    beats: [
      { l: "« (il pose un sac de pièces qui fait un bruit terrible) Voilà. Y'a tout, normalement. »",
        c: [
          k('😊', "« On va compter ça tranquillement ensemble. »", 0, 1, { vit: -4 }),
          k('🙂', "« Je compte. »", 1, 1, { vit: -3 }),
          k('😐', "« Vous avez compté avant de venir ? Non. Évidemment. »", 2, 1),
          k('😒', "« Un sac de pièces. Le cauchemar de tout être humain normalement constitué. »", 3, 1),
          k('😈', "« Je vais compter une par une. À voix haute. Très lentement. Un... centime... »", 4, 2, { vit: -8, mech: 14 })
        ] },
      { l: "« Ah, et il y a peut-être deux boutons dedans, faites pas attention. »",
        c: [
          k('😊', "« Je les mets de côté, ce n'est rien. »", 0, 1),
          k('🙂', "« Je les enlève. »", 1, 1),
          k('😐', "« Les boutons ne sont pas une monnaie. Pour l'instant. »", 2, 1),
          k('🙄', "« Deux boutons, un jeton de caddie et un espoir. Il manque huit euros. »", 3, 2),
          k('😈', "« Je garde les boutons. Vous, vous gardez la honte. »", 4, 3)
        ] }
    ]
  },

  /* ---------- 14. Le suspicieux ---------- */
  {
    id: 'suspicieux', nom: 'Madame Vous-M-Avez-Compté-En-Trop', emoji: '🤨', d: 5, art: 11, paiement: 'carte',
    desc: "Est certaine qu'on la vole",
    face: { peau: '#f2cba6', cheveux: 'chignon', couleur: '#5a3a28', lunettes: true, vetement: '#8d4b8d' },
    arrivee: "« Bonjour. Je vous préviens tout de suite : je vérifie le ticket. »",
    beats: [
      { l: "« Là ! Vous avez scanné le fromage deux fois ! Je l'ai VU ! »",
        c: [
          k('😊', "« Je regarde... vous avez raison, je l'annule tout de suite. »", 0, 1, { cash: -3, rep: 5 }),
          k('🙂', "« Je vérifie le ticket. »", 1, 1),
          k('😐', "« Il y a deux fromages. Dans votre panier. Regardez. »", 2, 1),
          k('😒', "« Vous avez vu quoi exactement ? Le bip ? Il bipe pour tout, c'est son métier. »", 3, 1),
          k('😈', "« Je l'ai scanné deux fois par vengeance. Non, je plaisante. Peut-être. »", 4, 2)
        ] },
      { l: "« Et le total me paraît élevé. Beaucoup trop élevé. Vous êtes sûre de votre machine ? »",
        c: [
          k('😊', "« Je vous détaille le ticket ligne par ligne, on va vérifier. »", 0, 1),
          k('🙂', "« La machine calcule toute seule. »", 1, 1),
          k('😐', "« La machine ne se trompe pas. Les paniers, si. »", 2, 1),
          k('🙄', "« Le total est élevé parce que vous avez mis beaucoup de choses. C'est mathématique. »", 3, 2),
          k('😈', "« Oui, je majore au hasard depuis ce matin. Vous êtes la première à le remarquer. »", 4, 3, { risk: 6 })
        ] }
    ]
  },

  /* ---------- 15. Le déjà énervé ---------- */
  {
    id: 'enerve', nom: 'Monsieur Déjà-Énervé', emoji: '😤', d: 5, art: 9, paiement: 'carte', irrBase: 35,
    desc: "Était déjà furieux sur le parking",
    face: { peau: '#e8a77e', cheveux: 'court', couleur: '#2a2a2a', lunettes: false, vetement: '#c43b3b', barbe: true },
    arrivee: "« VINGT MINUTES ! Vingt minutes d'attente ! C'est inadmissible ! »",
    beats: [
      { l: "« Et évidemment vous, vous êtes tranquille derrière votre caisse ! »",
        c: [
          k('😊', "« Je suis désolée pour l'attente, vraiment. »", 0, 1, { irr: -18 }),
          k('🙂', "« Je fais au mieux. »", 1, 1),
          k('😐', "« Tranquille, oui. C'est exactement le mot. »", 2, 1),
          k('😒', "« Tranquille ? J'ai vu des choses aujourd'hui que vous n'imaginez pas. »", 3, 1),
          k('😈', "« Oui, je suis très bien ici. Merci de le remarquer. »", 4, 2)
        ] },
      { l: "« Et il n'y a même pas de sacs ! COMMENT je fais, moi ?! »",
        c: [
          k('😊', "« Je vous en trouve un, je reviens. »", 0, 1, { cash: -1 }),
          k('🙂', "« Ils sont à 0,15 €, juste là. »", 1, 1, { cash: 1 }),
          k('😐', "« Il y en a. Derrière vous. Depuis toujours. »", 2, 1),
          k('🙄', "« Avec les bras. Comme nos ancêtres. »", 3, 2),
          k('😈', "« Vous faites comme tout le monde : mal, et en criant. »", 4, 3)
        ] }
    ]
  }
];

/* Articles possibles sur le tapis */
const ARTICLES_EMOJI = ['🥛','🍞','🧀','🍎','🍌','🥕','🍫','🧻','🥫','🧃','🍪','🥐','🍝','🧴','🥚','🍇','🥬','🧼','☕','🍗','🥔','🫒','🍕','🧊'];

/* ============================================================
   ÉVÉNEMENTS ALÉATOIRES
   ============================================================ */
const EVENEMENTS = [
  {
    id: 'scanner-ko', ico: '🔴', titre: "Le scanner ne fonctionne plus",
    l: "(le scanner fait un bruit sourd et s'éteint) Le client : « Ah bah voilà, c'est reparti. »",
    c: [
      k('😊', "« Un instant, je saisis le code à la main. »", 0, 1, { vit: -2 }),
      k('🙂', "« Je tape le code manuellement. »", 1, 1, { vit: -1 }),
      k('😐', "« Il boude. Ça arrive. »", 2, 1),
      k('😒', "« Il est comme moi : il en a assez. On attend tous les deux. »", 3, 1, { vit: -3 }),
      k('😈', "« Tant pis, je vais taper les codes de mémoire. Lentement. Très lentement. »", 4, 2, { vit: -6, mech: 6 })
    ]
  },
  {
    id: 'code-barre', ico: '🏷️', titre: "Un article n'a pas de code-barres",
    l: "« Ah, celui-là il n'a pas d'étiquette. Il est gratuit alors ? » (petit rire)",
    c: [
      k('😊', "« Je vais chercher le prix, deux secondes ! »", 0, 1, { vit: -2 }),
      k('🙂', "« Je vais demander le prix. »", 1, 1),
      k('😐', "« Non. Rien n'est gratuit. Jamais. »", 2, 1),
      k('😒', "« Chaque jour, quelqu'un fait cette blague. Chaque jour. »", 3, 1),
      k('😈', "« Allez le rechercher vous-même, rayon 4, tout au fond, à gauche. »", 4, 2, { vit: -6, mech: 8 })
    ]
  },
  {
    id: 'prix-different', ico: '💱', titre: "Le prix affiché est différent",
    l: "« En rayon c'était 3,20 €. Là c'est 4,10 €. Expliquez-moi. »",
    c: [
      k('😊', "« Je vous fais le prix affiché en rayon, c'est normal. »", 0, 1, { cash: -2, rep: 5 }),
      k('🙂', "« Je fais un contrôle de prix. »", 1, 1, { vit: -2 }),
      k('😐', "« C'est le prix caisse qui fait foi. »", 2, 1),
      k('😒', "« L'étiquette ment peut-être. Les étiquettes mentent beaucoup, en ce moment. »", 3, 1),
      k('😈', "« Les prix montent. Comme la mer. On n'y peut rien. Suivant ! »", 4, 2)
    ]
  },
  {
    id: 'tpe-panne', ico: '💳', titre: "Le terminal bancaire tombe en panne",
    l: "(l'écran du TPE affiche : ERREUR 34) Le client : « ...c'est grave ? »",
    c: [
      k('😊', "« On recommence calmement, ça va marcher. »", 0, 1),
      k('🙂', "« Je relance le terminal. »", 1, 1, { vit: -2 }),
      k('😐', "« Erreur 34. Personne ne sait ce que c'est. Moi non plus. »", 2, 1),
      k('😒', "« C'est grave, oui. Pour vous. Vous avez du liquide ? »", 3, 1),
      k('😈', "« Erreur 34 : « client trop long ». C'est une vraie erreur, je vous assure. »", 4, 2)
    ]
  },
  {
    id: 'rouleau', ico: '🧻', titre: "Le rouleau de ticket est terminé",
    l: "(la caisse crache un ticket blanc, tout blanc) Le client : « Je le voulais, ce ticket... »",
    c: [
      k('😊', "« Je change le rouleau tout de suite, une seconde ! »", 0, 1, { vit: -2 }),
      k('🙂', "« Je change le rouleau. »", 1, 1, { vit: -1 }),
      k('😐', "« Plus de rouleau. Plus de preuve. Souvenez-vous bien du total. »", 2, 1),
      k('😒', "« Le ticket est blanc. C'est très moderne, c'est du minimalisme. »", 3, 1),
      k('😈', "« Prenez-le quand même. Encadrez-le. « Ticket, 2026, technique mixte ». »", 4, 2)
    ]
  },
  {
    id: 'erreur-ticket', ico: '🧾', titre: "Le client trouve une erreur sur son ticket",
    l: "« Attendez. Là. Vous m'avez compté 6 yaourts. J'en ai 4. »",
    c: [
      k('😊', "« Vous avez raison, je vous rembourse la différence. »", 0, 1, { cash: -3, rep: 6 }),
      k('🙂', "« Je vérifie et je corrige. »", 1, 1),
      k('😐', "« Vous en avez 6. Je les ai comptés. Deux fois. »", 2, 1),
      k('😒', "« Peut-être que deux yaourts se cachent. Ils font ça, les yaourts. »", 3, 1),
      k('😈', "« Considérez-les comme un investissement dans mon bonheur personnel. »", 4, 2, { risk: 5 })
    ]
  },
  {
    id: 'responsable-passe', ico: '👔', titre: "Le responsable passe derrière la caisse",
    l: "Le responsable : « Alors, Josiane ? Tout va bien de ce côté ? »",
    resp: true,
    c: [
      k('😇', "« Tout va très bien, les clients sont adorables ! »", 0, 1, { risk: -10, rep: 4 }),
      k('🙂', "« Ça va. »", 1, 1, { risk: -3 }),
      k('😐', "« Ça pourrait aller mieux. Beaucoup mieux. »", 2, 1, { risk: 3 }),
      k('😒', "« Tout va bien tant que personne ne me parle. »", 3, 1, { risk: 8 }),
      k('😈', "« Non. Et vous êtes dans mon champ de vision. »", 4, 2, { risk: 16, mech: 20 })
    ]
  },
  {
    id: 'file-longue', ico: '👥', titre: "Une longue file se forme",
    l: "(douze personnes derrière, des soupirs en stéréo) Une voix : « Non mais c'est pas possible ! »",
    c: [
      k('😊', "« J'accélère, merci de votre patience ! »", 0, 1, { vit: 6, rep: 4 }),
      k('🙂', "« Je fais au plus vite. »", 1, 1, { vit: 3 }),
      k('😐', "« La file est un concept. Respirez. »", 2, 1),
      k('😒', "« Plus vous soupirez, plus je ralentis. C'est physique. »", 3, 1, { vit: -4, mech: 8 }),
      k('😈', "« (fort) SI ÇA NE VA PAS, IL Y A UNE TRÈS BELLE SORTIE AU FOND ! »", 4, 2, { vit: -3, mech: 16, risk: 6 })
    ]
  },
  {
    id: 'autre-caisse', ico: '🛒', titre: "Un client demande d'ouvrir une autre caisse",
    l: "« Vous pouvez pas ouvrir une deuxième caisse ? Franchement ! »",
    c: [
      k('😊', "« J'appelle une collègue en renfort tout de suite. »", 0, 1, { rep: 5, vit: 4 }),
      k('🙂', "« Je vais voir ce que je peux faire. »", 1, 1),
      k('😐', "« Il n'y a personne d'autre. Il n'y a que moi. »", 2, 1),
      k('😒', "« Bien sûr. Je me dédouble. Vous préférez ma moitié gauche ? »", 3, 1),
      k('😈', "« Ouvrez-la vous-même, il y a des tabourets. »", 4, 2)
    ]
  },
  {
    id: 'collegue', ico: '🙋', titre: "Une collègue vous appelle",
    l: "Sandrine, du rayon frais : « Josiaaaane ! Tu peux venir deux minutes ?! »",
    c: [
      k('😊', "« J'arrive dès que j'ai fini ce client ! »", 0, 1),
      k('🙂', "« Deux minutes, Sandrine. »", 1, 1),
      k('😐', "« Non. »", 2, 1),
      k('😒', "« Sandrine a toujours besoin de moi au pire moment. Toujours. »", 3, 1, { vit: -3 }),
      k('😈', "« (à Sandrine, très fort) JE SUIS EN TRAIN DE VIVRE UN ENFER, SANDRINE ! »", 4, 2, { mech: 14, risk: 7 })
    ]
  },
  {
    id: 'promo-ko', ico: '🏷️', titre: "Une promotion ne fonctionne pas",
    l: "« Le deuxième devait être à moitié prix. Ça n'a pas marché. »",
    c: [
      k('😊', "« Je vous applique la remise manuellement, pas de souci. »", 0, 1, { cash: -3, rep: 5 }),
      k('🙂', "« Je regarde la promo. »", 1, 1),
      k('😐', "« La promo s'est terminée hier soir à 20 h. »", 2, 1),
      k('😒', "« Les promos, c'est comme les bonnes résolutions : ça ne tient jamais. »", 3, 1),
      k('😈', "« Elle ne marche pas parce que le destin ne veut pas que vous économisiez. »", 4, 2)
    ]
  },
  {
    id: 'portefeuille', ico: '👛', titre: "Le client a oublié son portefeuille",
    l: "« Oh non... je crois que j'ai laissé mon portefeuille dans la voiture. »",
    c: [
      k('😊', "« Allez-y, je mets vos courses de côté, prenez votre temps. »", 0, 1, { vit: -3, rep: 6 }),
      k('🙂', "« Je garde le ticket en attente. »", 1, 1, { vit: -2 }),
      k('😐', "« Vous avez deux minutes. Après j'annule. »", 2, 1),
      k('😒', "« Dans la voiture. Comme la moitié des gens. La voiture est un coffre-fort collectif. »", 3, 1),
      k('😈', "« J'annule tout. Vous recommencerez plus tard. Depuis le début. »", 4, 2, { mech: 14, cash: -12 })
    ]
  },
  {
    id: 'remboursement', ico: '↩️', titre: "Le client demande un remboursement",
    l: "« Je voudrais me faire rembourser ce paquet. Il est ouvert, mais bon. »",
    c: [
      k('😊', "« Je vous le rembourse, aucun problème. »", 0, 1, { cash: -5, rep: 6 }),
      k('🙂', "« Il faut aller à l'accueil pour ça. »", 1, 1),
      k('😐', "« Ouvert et à moitié mangé, quand même. »", 2, 1),
      k('😒', "« Vous voulez aussi être remboursé du temps que ça me prend ? »", 3, 1),
      k('😈', "« Je vous rembourse en points de fidélité. Vous en aurez deux. Bravo. »", 4, 2)
    ]
  },
  {
    id: 'pieces-event', ico: '🪙', titre: "Le client veut payer avec énormément de pièces",
    l: "« Ça vous embête si je paie en pièces ? J'ai plein de jaunes. »",
    c: [
      k('😊', "« Pas du tout, ça m'arrange même pour la caisse ! »", 0, 1, { vit: -3, rep: 5 }),
      k('🙂', "« Allez-y. »", 1, 1, { vit: -2 }),
      k('😐', "« Comptez-les. Vous. »", 2, 1),
      k('😒', "« Des jaunes. Formidable. Mon moment préféré de la journée. »", 3, 1),
      k('😈', "« Je vais recompter derrière vous. Trois fois. Vous allez adorer. »", 4, 2, { vit: -7, mech: 12 })
    ]
  }
];

/* ============================================================
   JOURNÉES (progression)
   ============================================================ */
const JOURS = [
  {
    n: 1, magasin: "Supérette du Coin", caisse: 3, clients: 5, chanceEvent: 0.18,
    ouverture: 9 * 60, fermeture: 12 * 60 + 30, fileMax: 4,
    intro: "Premier jour. Une petite supérette de quartier, trois clients par heure et une radio qui grésille. Personne ne se méfie encore de vous.",
    deblocages: ["Répliques de base", "Clients : la dame à la monnaie, le pressé, le ticket, le silencieux"]
  },
  {
    n: 2, magasin: "Supérette du Coin", caisse: 3, clients: 7, chanceEvent: 0.32,
    ouverture: 9 * 60, fermeture: 13 * 60, fileMax: 5,
    intro: "Deuxième jour. Le bouche-à-oreille fonctionne : les gens viennent voir « la caissière bizarre ». Et le scanner commence à faire des siennes.",
    deblocages: ["Nouvelles répliques (ton sec et méchant)", "Clients : Madame Carte-Bleue, Monsieur Encore-Un-Truc, Madame Tomates, Monsieur Toute-Ma-Vie", "Événements aléatoires plus fréquents"]
  },
  {
    n: 3, magasin: "Marché Malin", caisse: 5, clients: 9, chanceEvent: 0.45,
    ouverture: 9 * 60, fermeture: 13 * 60 + 30, fileMax: 6,
    intro: "Nouveau magasin, le Marché Malin. Plus grand, plus bruyant, et une clientèle qui vérifie chaque centime.",
    deblocages: ["Répliques diaboliques", "Clients : le Roi des Cartes, l'Inspecteur des Prix, Monsieur Sans-Contact", "Nouveau magasin : Marché Malin", "Caisse n°5"]
  },
  {
    n: 4, magasin: "Hyper Grognon", caisse: 8, clients: 11, chanceEvent: 0.58,
    ouverture: 17 * 60, fermeture: 20 * 60 + 30, fileMax: 8,
    intro: "Heure de pointe à l'Hyper Grognon. Tout le monde sort du travail, tout le monde est fatigué, et vous êtes fatiguée d'eux.",
    deblocages: ["Répliques de fin de journée", "Clients : Madame Allô-Oui, le Parent de Kevin, Monsieur Petite-Monnaie", "Nouveau magasin : Hyper Grognon", "Caisse n°8"]
  },
  {
    n: 5, magasin: "MégaMarché du Samedi", caisse: 12, clients: 13, chanceEvent: 0.7,
    ouverture: 14 * 60, fermeture: 19 * 60, fileMax: 10,
    intro: "Samedi après-midi. MégaMarché. La file dépasse le rayon surgelés. Quelque part, un enfant hurle depuis onze minutes. C'est votre grand jour.",
    deblocages: ["Répliques légendaires", "Clients : Madame Vous-M'Avez-Compté-En-Trop, Monsieur Déjà-Énervé", "Nouveau magasin : MégaMarché", "Caisse n°12 — le boss final"]
  }
];

/* ============================================================
   TITRES DE FIN DE JOURNÉE
   ============================================================ */
const TITRES = [
  { min: 0,  nom: "Caissière adorable",             ico: '🏆', txt: "Les clients vous ont souri. C'est inquiétant." },
  { min: 20, nom: "Caissière blasée",                ico: '😐', txt: "Vous faites votre travail. Ni plus, ni moins. Surtout ni plus." },
  { min: 40, nom: "Reine du soupir",                 ico: '😮‍💨', txt: "Votre soupir est devenu un bruit de fond du magasin." },
  { min: 60, nom: "Terreur de la caisse",            ico: '😈', txt: "On change de file en vous voyant. Certains rebroussent chemin." },
  { min: 78, nom: "Fléau du supermarché",            ico: '💀', txt: "Des gens racontent leur passage en caisse à leur psychologue." },
  { min: 85, nom: "Légende de la mauvaise humeur",   ico: '👑', txt: "Votre nom se murmure dans tous les supermarchés du département." }
];

/* ============================================================
   FINS DE PARTIE
   ============================================================ */
const FINS = {
  licenciee: {
    id: 'licenciee', ico: '💼', titre: "Vous êtes licenciée",
    scene: "Le responsable pose une main sur votre épaule. « Josiane. Venez dans mon bureau. Prenez vos affaires, en fait. » Le tiroir-caisse se referme tout seul, comme un adieu. Dans la file, quelqu'un applaudit.",
    couleur: '#e8453c'
  },
  modele: {
    id: 'modele', ico: '🏆', titre: "Employée modèle",
    scene: "On vous remet un diplôme plastifié « Sourire du Trimestre ». Vos collègues vous applaudissent mollement. Vous rentrez chez vous avec un bon d'achat de 5 € et un vide immense.",
    couleur: '#2fb457'
  },
  normale: {
    id: 'normale', ico: '😐', titre: "Journée normale",
    scene: "Vous éteignez la lumière de la caisse. Personne ne vous a remarquée. Personne ne s'est plaint. Demain, vous recommencerez, et ce sera exactement pareil. C'est peut-être ça, la paix.",
    couleur: '#7d8798'
  },
  terreur: {
    id: 'terreur', ico: '😈', titre: "Terreur de la caisse",
    scene: "La file entière est traumatisée. Un homme est reparti sans ses courses. Une dame a juré de ne plus jamais faire d'achats. Le responsable vous regarde de loin, sans oser approcher. Vous soupirez. Bien.",
    couleur: '#8b5cf6'
  },
  convocation: {
    id: 'convocation', ico: '📢', titre: "Le responsable veut vous parler",
    scene: "Huit réclamations écrites. Un dossier avec votre nom dessus, et un post-it rose : « À VOIR LUNDI ». Vous partez en week-end avec une boule au ventre et un sourire au coin des lèvres. Ça valait le coup.",
    couleur: '#ff8a3d'
  },
  legende: {
    id: 'legende', ico: '👑', titre: "Légende",
    scene: "Vous avez atteint l'insupportable absolu sans jamais franchir la ligne. Le responsable n'a rien pu prouver. Les clients n'ont rien pu dire. Votre badge brille. Quelque part, une caissière débutante entend parler de vous et décide de changer de métier.",
    couleur: '#ffcb2b'
  }
};

/* Phrases d'ambiance de la file d'attente */
const MURMURES = [
  "« Elle le fait exprès, non ? »",
  "« J'ai congelé sur place. »",
  "« Regardez, elle soupire encore. »",
  "« Je change de file. »",
  "« Moi je dis rien, hein, mais quand même. »",
  "« C'est elle dont on parle sur internet ? »",
  "« Mon surgelé a fondu. »",
  "« On est là depuis l'ouverture. »"
];

/* ============================================================
   PHASE DE PAIEMENT (selon le moyen de paiement du client)
   ============================================================ */
const PAIEMENTS = {
  carte: {
    l: "« Je vous mets la carte. Le code, c'est... attendez, je l'ai en tête. »",
    c: [
      k('😊', "« Prenez votre temps, le terminal est patient. »", 0, 1),
      k('🙂', "« Quand vous voulez. »", 1, 1),
      k('😐', "« Le terminal va s'endormir. »", 2, 1),
      k('😒', "« Votre code a quatre chiffres. Il en manque trois. »", 3, 1),
      k('😈', "« Si vous vous trompez trois fois, la carte est avalée. Ce serait dommage. Ou drôle. »", 4, 2)
    ]
  },
  sanscontact: {
    l: "« Je peux payer sans contact ? Je pose là ? »",
    c: [
      k('😊', "« Oui, posez juste au-dessus, c'est immédiat. »", 0, 1),
      k('🙂', "« Oui, allez-y. »", 1, 1),
      k('😐', "« Posez. Ne collez pas. »", 2, 1),
      k('😒', "« Sans contact, oui. Comme notre relation, idéalement. »", 3, 1),
      k('😈', "« Posez, retirez, reposez, retirez. Voilà. Non, ça n'a rien fait. »", 4, 2, { vit: -4 })
    ]
  },
  especes: {
    l: "« Je vous donne 50 €, vous avez la monnaie ? »",
    c: [
      k('😊', "« Bien sûr, je vous rends tout de suite. »", 0, 1),
      k('🙂', "« Oui, j'ai la monnaie. »", 1, 1),
      k('😐', "« J'ai la monnaie. Pour l'instant. »", 2, 1),
      k('😒', "« Un billet de 50 pour 12 € d'achats. Un classique du genre. »", 3, 1),
      k('😈', "« Je vais vous rendre en pièces de vingt centimes. Toutes. »", 4, 2, { mech: 6, vit: -3 })
    ]
  },
  pieces: {
    l: "(il commence à poser les pièces une par une sur le comptoir) « Dix... vingt... trente... »",
    c: [
      k('😊', "« Je compte avec vous, ça ira plus vite. »", 0, 1, { vit: -2 }),
      k('🙂', "« D'accord, je compte. »", 1, 1, { vit: -2 }),
      k('😐', "« Il y a des sachets pour ça. Ça existe. »", 2, 1),
      k('😒', "« Prenez votre temps. Le magasin ferme dans trois heures. »", 3, 1, { vit: -4 }),
      k('😈', "« (tout recompter à voix haute depuis le début, deux fois) »", 4, 2, { vit: -8, mech: 14 })
    ]
  },
  monnaie: {
    l: "« Attendez... j'ai l'appoint. Je l'avais. Je l'AVAIS. »",
    c: [
      k('😊', "« Ce n'est pas grave, donnez-moi ce que vous avez. »", 0, 1),
      k('🙂', "« Comme vous voulez. »", 1, 1),
      k('😐', "« Vous ne l'avez plus. Acceptez-le. »", 2, 1),
      k('😒', "« L'appoint, c'est comme la jeunesse : on croit l'avoir encore. »", 3, 1),
      k('😈', "« Je vais attendre. Silencieusement. En vous fixant droit dans les yeux. »", 4, 2, { vit: -6, mech: 12 })
    ]
  }
};

/* Réponses de la caissière pendant le scan (style de scan) */
const STYLES_SCAN = [
  k('😊', "Scanner soigneusement, en rangeant les articles fragiles.", 0, 1, { vit: 2 }),
  k('🙂', "Scanner normalement.", 1, 1, { vit: 3 }),
  k('🐌', "Scanner très lentement, un article toutes les trente secondes.", 2, 1, { vit: -6, mech: 8 }),
  k('💥', "Lancer les articles au bout du tapis.", 3, 2, { vit: 4, mech: 12 }),
  k('😈', "Scanner les œufs en dernier. Et les poser sous les bouteilles.", 4, 3, { vit: 2, mech: 16 })
];
