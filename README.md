# 😒 La Caissière la Plus Insupportable

Jeu web humoristique, entièrement en français : vous incarnez **Josiane**, caissière de
supermarché. Le but n'est pas de bien faire votre travail — c'est de devenir la caissière
**la plus insupportable du magasin**… sans vous faire licencier.

## Lancer le jeu

Aucune installation, aucune dépendance, aucun serveur nécessaire :

```
ouvrir index.html dans un navigateur
```

(ou, si vous préférez un serveur local : `python3 -m http.server` puis
<http://localhost:8000>). Fonctionne sur ordinateur et sur mobile.

## Le principe

Chaque client passe à la caisse selon la même boucle : accueil → scan des articles →
demandes et problèmes → annonce du prix → encaissement → départ → client suivant.

À chaque situation, vous choisissez votre réplique parmi cinq tons :

| Ton | Exemple |
|---|---|
| 😊 gentil | « Bien sûr ! » |
| 🙂 neutre | « Oui, oui... » |
| 😒 sec | « C'est bon, ce sont des tomates, pas des diamants. » |
| 😤 méchant | « Vous voulez que je vous l'écrive en gros ? » |
| 😈 diabolique | « Vous voulez que je vous offre le magasin aussi ? » |

## Les jauges

| Jauge | Effet |
|---|---|
| 😈 **Désagréabilité** (0→100) | votre score : monte à chaque méchanceté |
| 👔 **Risque de licenciement** (0→100) | à 100 %, le responsable arrive et la partie est perdue |
| ⭐ **Réputation** | baisse avec les plaintes et les avis négatifs |
| 🧘 **Patience** | descend quand vous êtes aimable ; à zéro, Josiane **craque** toute seule |
| ⚡ **Vitesse** | si vous traînez, la file s'allonge et le risque monte |
| 💰 **Chiffre d'affaires** | un client qui part sans payer, c'est de l'argent perdu |

Tout l'enjeu : trouver **jusqu'où on peut aller sans se faire virer**.

## Actions permanentes

En plus des dialogues : 🔴 **Scanner** (un appui par article, avec le BIP),
💰 **Encaisser**, et les petites cruautés gratuites — 😮‍💨 **Soupirer**,
🙄 **Lever les yeux au ciel**, 🐌 **Pause imprévue** (temps d'attente volontaire),
📢 **Contrôle de prix** hurlé dans le micro. Chacune a un nombre d'usages limité par client.

## Contenu

- **16 profils de clients** avec dialogues propres : la dame qui cherche sa monnaie, le
  client pressé, celui qui veut absolument son ticket, la cliente qui demande si la carte
  marche, le roi des 47 cartes de fidélité, celui qui a oublié un article, la dame aux
  tomates fragiles, le payeur en pièces, la cliente au téléphone, l'inspecteur des prix,
  le parent de Kevin, le raconteur de vie, la suspicieuse, le silencieux, le déjà énervé,
  monsieur sans-contact.
- **14 événements aléatoires** : scanner en panne, article sans code-barres, prix différent,
  TPE HS, rouleau de ticket fini, erreur sur le ticket, passage du responsable, file qui
  s'allonge, demande d'ouvrir une autre caisse, collègue qui appelle, promo qui ne marche
  pas, portefeuille oublié, remboursement, paiement en pièces.
- **Réactions des clients** : soupirs, sarcasmes, rires, colère, plainte écrite, appel au
  responsable, coup de téléphone à un proche, départ de la caisse, avis une étoile,
  client traumatisé.
- **5 journées** de difficulté croissante, de la petite supérette au MégaMarché du samedi
  après-midi, avec déblocage progressif de répliques, de clients, de magasins et de caisses.
- **6 titres de fin de journée** (« Caissière adorable » → « Légende de la mauvaise humeur »)
  et **6 fins de partie** avec leur petite scène : Employée modèle, Journée normale, Terreur
  de la caisse, Le responsable veut vous parler, Vous êtes licenciée, Légende.
- **Sons synthétisés** en WebAudio (bip du scanner, tapis, tiroir-caisse, paiement accepté
  ou refusé, soupirs, murmures de la file, musique d'ambiance) avec bouton 🔊 pour couper.

## Commandes

- **Souris / tactile** : tout se joue au clic ou au doigt.
- **Clavier** : `1`–`5` choisissent une réplique, `Espace` scanne / encaisse, `S` soupire,
  `Y` lève les yeux au ciel.

La progression (jour atteint, meilleur score) est sauvegardée dans le navigateur
(`localStorage`). Le menu ☰ permet de reprendre, recommencer la journée ou repartir de zéro.

## Structure des fichiers

```
index.html        structure de la page
css/style.css     style cartoon, animations, mise en page responsive
js/audio.js       moteur audio (sons synthétisés, aucun fichier externe)
js/data.js        clients, dialogues, événements, journées, titres et fins
js/faces.js       générateur de visages cartoon en SVG (expressions exagérées)
js/ui.js          rendu, animations, écrans et overlays
js/engine.js      moteur de jeu : boucle, jauges, réactions, score, fins
js/main.js        démarrage et branchement des contrôles
```

L'humour est volontairement absurde et caricatural : aucune attaque envers un groupe de
personnes, aucune vulgarité — juste une caissière de très, très mauvaise humeur.
