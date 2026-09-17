# 😒 La Caissière la Plus Insupportable

Jeu web humoristique **en vue subjective (FPS)**, entièrement en français : vous êtes
**Josiane**, caissière de supermarché, et vous voyez le magasin par ses yeux, depuis sa
caisse. Le but n'est pas de bien faire votre travail — c'est de devenir la caissière
**la plus insupportable du magasin**… sans vous faire licencier.

Le décor est rendu en 3D avec [three.js](https://threejs.org), embarqué dans le dépôt
(`js/vendor/`) : aucun CDN, le jeu fonctionne hors ligne.

## Lancer le jeu

Aucune installation, aucune dépendance, aucun serveur nécessaire :

```
ouvrir index.html dans un navigateur
```

(ou, si vous préférez un serveur local : `python3 -m http.server` puis
<http://localhost:8000>). Fonctionne sur ordinateur et sur mobile.

## La vue subjective

Vous êtes debout derrière la caisse. Devant vous : le tapis roulant, les articles que le
client décharge, le scanner, le terminal de paiement, la caisse enregistreuse, la zone
d'ensachage — et vos propres mains, qui attrapent les articles, les passent devant le
scanner et vont chercher la monnaie dans le tiroir. En face, le client vous regarde dans
les yeux ; derrière lui, la file s'allonge ; au fond, les rayons, les néons et les autres
caisses.

| Action | Comment |
|---|---|
| Regarder autour de soi | bouger la souris (la caméra suit avec de l'inertie) |
| Pivoter plus vite | glisser en maintenant le bouton |
| Scanner un article | cliquer le **scanner** ou directement l'**article** |
| Encaisser | cliquer le **terminal de paiement** |
| Faire répéter le client | cliquer sur **le client** |
| Répondre | touches <kbd>1</kbd>…<kbd>5</kbd> ou clic sur la réponse |
| Petites cruautés | <kbd>S</kbd> soupirer, <kbd>Y</kbd> yeux au ciel, <kbd>P</kbd> pause, <kbd>C</kbd> contrôle de prix |
| Menu / réglages | <kbd>Échap</kbd> ou les boutons en haut à droite |

Sur mobile : glisser pour regarder, toucher pour interagir.

Le viseur s'allume et affiche le nom de l'objet quand il est utilisable. Les réglages
permettent d'ajuster la **sensibilité de la souris** et de couper le **flou de mouvement**
ou le **tremblement de caméra**.

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

En plus des dialogues : les petites cruautés gratuites — 😮‍💨 **Soupirer**,
🙄 **Lever les yeux au ciel** (la caméra part littéralement au plafond), 🐌 **Pause
imprévue** (temps d'attente volontaire), 📢 **Contrôle de prix** hurlé dans le micro.
Chacune a un nombre d'usages limité par client.

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
- **Animations du client** : il décharge son caddie, vous regarde, soupire, regarde sa
  montre, croise les bras, sort son portefeuille, tend sa carte, prend son sac et s'en va.
  Ses expressions faciales suivent son irritation, du sourire poli à la fureur.
- **Sons synthétisés** en WebAudio (bip du scanner, tapis, tiroir-caisse, paiement accepté
  ou refusé, soupirs) et **ambiance de magasin** : bourdonnement des néons, bips des autres
  caisses, brouhaha, roulement de caddies, musique d'ascenseur et annonces au micro
  sous-titrées à l'écran. Bouton 🔊 pour tout couper.

## Commandes

Voir le tableau plus haut. <kbd>Espace</kbd> sert de raccourci pour scanner ou encaisser
sans viser, et <kbd>Échap</kbd> ouvre le menu.

La progression (jour atteint, meilleur score) est sauvegardée dans le navigateur
(`localStorage`). Le menu ☰ permet de reprendre, recommencer la journée ou repartir de zéro.

## Structure des fichiers

```
index.html          page et calques de l'ATH
css/style.css       ATH discret, réponses, overlays, mise en page responsive
js/vendor/          three.js r137 (build UMD, licence MIT) — embarqué, pas de CDN
js/audio.js         sons synthétisés + ambiance du magasin (aucun fichier audio)
js/data.js          clients, dialogues, événements, journées, titres et fins
js/faces.js         expressions : version SVG (2D) et version canvas (texture 3D)
js/scene3d.js       scène 3D : magasin, caisse, client, file, mains, caméra FPS
js/ui.js            façade d'affichage : pilote la 3D et l'ATH
js/engine.js        moteur de jeu : boucle, jauges, réactions, score, fins
js/main.js          démarrage, souris, tactile et clavier
```

Le passage en vue subjective n'a touché que la présentation : `engine.js` et `data.js`
gardent les mêmes mécaniques, les mêmes dialogues et les mêmes sauvegardes. `ui.js` expose
exactement la même façade qu'avant (`UI.majHUD`, `UI.clientArrive`, `UI.afficherChoix`…),
mais la traduit en scène 3D.

L'humour est volontairement absurde et caricatural : aucune attaque envers un groupe de
personnes, aucune vulgarité — juste une caissière de très, très mauvaise humeur.
