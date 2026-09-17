/* ============================================================
   INTERFACE — ATH discret par-dessus la scène 3D.
   Ce module expose exactement la même façade qu'avant (UI.*) :
   le moteur de jeu n'a pas changé, seule la présentation l'a.
   ============================================================ */
const UI = (function () {
  const el = {};
  let boutons = { scanner: false, encaisser: false };
  let clientCourant = null;
  let derniereReplique = null;
  let totalCourant = 0, nbScannes = 0;
  let survol = null;

  const JOURS_SEMAINE = ['MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];

  function init() {
    ['vue', 'hud', 'hud-jour', 'hud-heure', 'hud-magasin', 'hud-jauges', 'viseur', 'viseur-txt',
      'bulle-client', 'bulle-client-nom', 'bulle-client-txt', 'bulle-caissiere', 'annonce',
      'toasts', 'volants', 'zone-bas', 'titre-choix', 'choix', 'actions', 'systeme',
      'overlay', 'overlay-box', 'aide-souris']
      .forEach(id => { el[id] = document.getElementById(id); });

    Scene3D.init(el.vue);
    Scene3D.surFrame(majAncrages);
    Scene3D.surSurvol(majSurvol);

    // le viseur suit le pointeur (souris) ; il reste au centre au doigt
    el.vue.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      el.viseur.style.left = e.clientX + 'px';
      el.viseur.style.top = e.clientY + 'px';
      el.viseur.style.transform = 'translate(-50%,-50%)';
    });
    setTimeout(() => el['aide-souris'].classList.add('parti'), 9000);
  }

  /* ============================================================
     ATH
     ============================================================ */
  const pct = (v) => Math.max(0, Math.min(100, Math.round(v)));
  function jauge(id, valeur, texte, alerte) {
    const n = document.getElementById(id);
    if (!n) return;
    n.querySelector('.jg-val').textContent = texte;
    const barre = n.querySelector('i');
    if (barre) barre.style.width = pct(valeur) + '%';
    n.classList.toggle('alerte', !!alerte);
  }
  function heureTxt(min) {
    const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function majHUD(E) {
    el['hud-jour'].textContent = JOURS_SEMAINE[E.jour - 1] || ('JOUR ' + E.jour);
    el['hud-heure'].textContent = heureTxt(E.heure);
    el['hud-magasin'].textContent = E.cfg ? E.cfg.magasin : '';
    jauge('jg-mech', E.mech, Math.round(E.mech) + ' %');
    jauge('jg-risk', E.risk, Math.round(E.risk) + ' %', E.risk >= 75);
    jauge('jg-caisse', 0, E.argent.toFixed(2).replace('.', ',') + ' €');
    jauge('jg-rep', E.rep, Math.round(E.rep));
    jauge('jg-pat', E.pat, Math.round(E.pat), E.pat <= 20);
    jauge('jg-vit', E.vit, Math.round(E.vit));
    jauge('jg-file', 0, E.file.length);
  }

  function preparerJour(E) {
    el.hud.classList.remove('hidden');
    Scene3D.majEnseigne(E.cfg.magasin);
    Scene3D.majNumeroCaisse(E.cfg.caisse);
    Scene3D.ecranTpe('');
    Scene3D.scannerCasse(false);
    Scene3D.responsable(false);
    Scene3D.majTotal(0);
    bulleClient(null); bulleCaissiere(null);
    Son.ambianceMagasin(true);
    if (matchMedia('(max-width:640px)').matches && E.jour === 1) {
      toast('👆 Glissez pour regarder autour de vous, touchez les objets.', 'info');
    }
  }

  /* ============================================================
     Client
     ============================================================ */
  function clientArrive(cl) {
    clientCourant = cl;
    totalCourant = 0; nbScannes = 0;
    Scene3D.nouveauClient(cl.face);
    Scene3D.majTotal(0);
    // le client décharge son caddie sur le tapis
    setTimeout(() => {
      if (clientCourant === cl) Scene3D.poserArticles(cl.articles);
    }, 700);
    if (cl.profil.id === 'telephone') setTimeout(() => Scene3D.animClient('telephone'), 1100);
    toast(cl.profil.emoji + ' ' + cl.nom + " — " + cl.profil.desc, 'info');
    Son.caddie();
  }

  function clientPart() {
    clientCourant = null;
    derniereReplique = null;
    Scene3D.clientPart();
    Scene3D.viderArticles();
    bulleClient(null);
    bulleCaissiere(null);
  }

  function humeurClient(h) {
    Scene3D.humeurClient(h);
    if (h === 'furieux' || h === 'enerve') Scene3D.secousse(0.12);
  }

  /* la caissière n'est pas visible (on est dans ses yeux) :
     son humeur se traduit par un mouvement de caméra */
  function humeurCaissiere(h) {
    if (h === 'sarcastique' || h === 'desabuse') Scene3D.secousse(0.08);
  }

  function secoueClient() { Scene3D.animClient('secoue'); }
  function regardeDerriere() { Scene3D.animClient('regardeDerriere'); }

  function soupirCaissiere() {   // la tête s'affaisse puis remonte
    Scene3D.animCamera('soupir');
  }
  function yeuxAuCiel() {        // le regard part au plafond
    Scene3D.animCamera('yeux');
  }

  /* étapes du client, signalées par le moteur */
  function phase(type, kind) {
    if (!clientCourant) return;
    if (type === 'paiement') {
      const mode = clientCourant.profil.paiement;
      Scene3D.animClient(mode === 'carte' || mode === 'sanscontact' ? 'portefeuille' : 'portefeuille');
    } else if (kind === 'depart') {
      Scene3D.animClient('sac');
    } else if (kind === 'beat' && Math.random() < 0.35) {
      Scene3D.animClient(Math.random() < 0.5 ? 'montre' : 'bras');
    }
  }

  /* ============================================================
     Bulles
     ============================================================ */
  function bulleClient(txt) {
    if (!txt) { el['bulle-client'].classList.add('hidden'); derniereReplique = null; return; }
    derniereReplique = txt;
    el['bulle-client-nom'].textContent = clientCourant
      ? clientCourant.profil.emoji + ' ' + clientCourant.nom : '';
    el['bulle-client-txt'].textContent = txt;
    el['bulle-client'].classList.remove('hidden');
    el['bulle-client'].style.animation = 'none';
    void el['bulle-client'].offsetWidth;
    el['bulle-client'].style.animation = '';
    majAncrages();
  }
  function rappelBulle() { if (derniereReplique) bulleClient(derniereReplique); }

  function bulleCaissiere(txt) {
    if (!txt) { el['bulle-caissiere'].classList.add('hidden'); return; }
    el['bulle-caissiere'].textContent = txt;
    el['bulle-caissiere'].classList.remove('hidden');
  }

  /* place la bulle du client au-dessus de sa tête, à chaque image */
  function majAncrages() {
    const b = el['bulle-client'];
    if (!b || b.classList.contains('hidden')) return;
    const p = Scene3D.positionEcran('client');
    if (!p) return;
    const demi = b.offsetWidth / 2 + 8;
    b.style.left = Math.max(demi, Math.min(window.innerWidth - demi, p.x)) + 'px';
    // sur téléphone, on laisse la place aux jauges et aux messages du haut
    const hautMin = matchMedia('(max-width:640px)').matches ? b.offsetHeight + 150 : b.offsetHeight + 46;
    b.style.top = Math.max(hautMin, p.y) + 'px';
    b.style.opacity = p.visible ? 1 : 0.25;
  }

  /* ============================================================
     Matériel de caisse
     ============================================================ */
  function scanArticle() {
    Scene3D.scannerArticle((art) => {
      totalCourant += art.prix;
      nbScannes++;
      Scene3D.majTotal(totalCourant);
    });
    Scene3D.secousse(0.1);
  }
  function tapisRoule(on) { Scene3D.tapisRoule(on); }
  function scannerCasse(on) { Scene3D.scannerCasse(on); }
  function tpe(etat) { Scene3D.ecranTpe(etat); if (etat === 'ok' && clientCourant) Scene3D.animClient('carte'); }
  function tiroirOuvre() { Scene3D.ouvrirTiroir(); }
  function ticket(total, n, visible) {
    if (visible && total > 0) {
      Scene3D.majTotal(total);
      Scene3D.etiquetteTotal(total, n);
    } else if (!visible) {
      Scene3D.majTotal(0);
    }
  }
  function responsable(afficher, txt) {
    Scene3D.responsable(afficher);
    if (afficher && txt) toast('👔 ' + txt, 'mal');
  }
  function evenement(ev) {
    toast('⚠️ ' + ev.ico + ' ' + ev.titre, 'mal');
    Scene3D.secousse(0.2);
    Son.bipRate();
  }

  /* ============================================================
     Retours visuels
     ============================================================ */
  function volant(txt, couleur) {
    const d = document.createElement('div');
    d.className = 'volant';
    d.textContent = txt;
    d.style.color = couleur || '#fff';
    d.style.left = (46 + Math.random() * 22) + '%';
    d.style.top = (44 + Math.random() * 14) + '%';
    el.volants.appendChild(d);
    setTimeout(() => d.remove(), 1250);
  }
  function toast(txt, type) {
    const d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.textContent = txt;
    el.toasts.appendChild(d);
    setTimeout(() => d.remove(), 2800);
  }
  function annonce(txt) {
    el.annonce.textContent = '📢 ' + txt;
    el.annonce.classList.remove('hidden');
    clearTimeout(el.annonce.__t);
    el.annonce.__t = setTimeout(() => el.annonce.classList.add('hidden'), 6000);
  }

  /* ============================================================
     Réponses
     ============================================================ */
  function titreChoix(txt) { el['titre-choix'].textContent = txt || ''; }

  function afficherChoix(liste, jour, cb) {
    el.choix.innerHTML = '';
    if (!liste || !liste.length) return;
    liste.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choix-btn' + (c.d === jour && jour > 1 ? ' neuf' : '');
      b.dataset.ton = c.ton;
      b.innerHTML = '<span class="num">' + (i + 1) + '</span>' +
        '<span class="emo">' + c.e + '</span><span>' + c.t + '</span>';
      b.addEventListener('click', () => { if (cb) cb(i); });
      el.choix.appendChild(b);
    });
  }
  function choisirParTouche(n) {
    const b = el.choix.querySelectorAll('.choix-btn')[n - 1];
    if (b) { b.click(); return true; }
    return false;
  }

  function majActions(actions, etats) {
    boutons = etats || boutons;
    el.actions.querySelectorAll('.act').forEach(b => {
      const k = b.dataset.act;
      b.querySelector('b').textContent = actions[k];
      b.disabled = actions[k] <= 0;
    });
    Scene3D.interactifs({ scanner: !!boutons.scanner, tpe: !!boutons.encaisser });
    majSurvol(survol);
  }
  function etatBoutons() { return boutons; }

  /* libellé du viseur selon l'objet visé */
  function majSurvol(nom) {
    survol = nom;
    const v = el.viseur, t = el['viseur-txt'];
    let txt = '';
    if (nom === 'scanner') txt = boutons.scanner ? 'Scanner un article' : 'Scanner';
    else if (nom === 'article') txt = boutons.scanner ? 'Scanner cet article' : 'Article';
    else if (nom === 'tpe') txt = boutons.encaisser ? 'Encaisser' : 'Terminal de paiement';
    else if (nom === 'tiroir') txt = 'Tiroir-caisse';
    else if (nom === 'client') txt = clientCourant ? clientCourant.nom : 'Client';
    t.textContent = txt;
    const actif = !!txt && ((nom === 'scanner' || nom === 'article') ? boutons.scanner
      : (nom === 'tpe' ? boutons.encaisser : true));
    v.classList.toggle('actif', actif);
  }

  /* ============================================================
     Overlays (titre, aide, réglages, bilans, fins)
     ============================================================ */
  function ouvrirOverlay(html) {
    el['overlay-box'].innerHTML = html;
    el.overlay.classList.remove('hidden');
  }
  function fermerOverlay() { el.overlay.classList.add('hidden'); }
  function overlayOuvert() { return !el.overlay.classList.contains('hidden'); }

  function overlayTitre(save, onJouer, onAide) {
    let reprise = '';
    if (save.jourMax && save.jourMax > 1) {
      reprise = '<button class="gros-bouton" id="btn-reprendre">▶️ Reprendre au jour ' + save.jourMax + '</button>';
    }
    // petite galerie de clients, dessinée par le générateur de visages
    const vitrine = [CLIENTS[0], CLIENTS[1], CLIENTS[8], CLIENTS[13]]
      .map((c, i) => '<div>' + Visages.dessine(c.face, ['desabuse', 'enerve', 'blase', 'sarcastique'][i]) + '</div>')
      .join('');
    ouvrirOverlay(
      '<h1 class="titre-jeu">La Caissière<br>la Plus Insupportable<small>SIMULATION DE CAISSE · VUE SUBJECTIVE</small></h1>' +
      '<div class="vitrine">' + vitrine + '</div>' +
      '<p class="sous">Vous êtes Josiane. Vous voyez le magasin par ses yeux, depuis sa caisse. ' +
      'Votre mission : devenir la caissière la plus insupportable du magasin… <b>sans vous faire licencier</b>.</p>' +
      '<button class="gros-bouton vert" id="btn-jouer">😈 Prendre son poste — jour 1</button>' +
      reprise +
      '<button class="gros-bouton" id="btn-aide">❓ Comment jouer</button>' +
      (save.meilleurScore ? '<p class="sous" style="margin-top:8px">🏅 Meilleur score : <b>' + save.meilleurScore + '</b></p>' : '')
    );
    document.getElementById('btn-jouer').onclick = () => onJouer(1);
    const r = document.getElementById('btn-reprendre');
    if (r) r.onclick = () => onJouer(save.jourMax);
    document.getElementById('btn-aide').onclick = onAide;
  }

  function overlayAide(retour) {
    ouvrirOverlay(
      '<h2>❓ Comment jouer</h2>' +
      '<div class="aide">' +
      '<p><b>Vue subjective.</b> Bougez la souris pour regarder autour de vous, glissez pour pivoter plus vite. ' +
      'Au doigt : glissez pour regarder, touchez pour interagir.</p>' +
      '<p><b>Interagir :</b> cliquez le <b>scanner</b> ou un <b>article</b> pour le scanner, le <b>terminal</b> pour encaisser, ' +
      'le <b>client</b> pour lui faire répéter. Le viseur s\'allume quand un objet est utilisable.</p>' +
      '<p><b>Répondre :</b> les réponses apparaissent en bas. Touches <kbd>1</kbd> à <kbd>5</kbd> ou clic. ' +
      'Du plus gentil 😊 au plus diabolique 😈.</p>' +
      '<p><b>Petites cruautés :</b> <kbd>S</kbd> soupirer, <kbd>Y</kbd> lever les yeux au ciel, ' +
      '<kbd>P</kbd> pause imprévue, <kbd>C</kbd> contrôle de prix. Usages limités par client.</p>' +
      '<p><b>Jauges (en bas à gauche) :</b> 😈 désagréabilité = votre score. 👔 risque de licenciement : à 100 %, ' +
      'le responsable arrive et c\'est fini. 🧘 patience : à zéro, Josiane craque toute seule. ' +
      '⚡ vitesse : si vous traînez, la file s\'allonge.</p>' +
      '<p><b>But :</b> tenir 5 journées avec la désagréabilité la plus haute possible.</p>' +
      '</div>' +
      '<button class="gros-bouton" id="btn-retour">⬅️ Retour</button>'
    );
    document.getElementById('btn-retour').onclick = retour;
  }

  function overlayReglages(retour) {
    const r = Scene3D.litReglages();
    ouvrirOverlay(
      '<h2>⚙️ Réglages</h2>' +
      '<div class="reglage"><span>🖱️ Sensibilité de la souris</span>' +
      '<input type="range" id="rg-sens" min="0.3" max="2.5" step="0.1" value="' + r.sensibilite + '"><b id="rg-sens-val">' + r.sensibilite.toFixed(1) + '</b></div>' +
      '<div class="reglage"><span>💨 Flou de mouvement</span>' +
      '<button class="bascule' + (r.flou ? ' on' : '') + '" id="rg-flou">' + (r.flou ? 'ACTIVÉ' : 'COUPÉ') + '</button></div>' +
      '<div class="reglage"><span>📳 Tremblement de caméra</span>' +
      '<button class="bascule' + (r.secousse ? ' on' : '') + '" id="rg-sec">' + (r.secousse ? 'ACTIVÉ' : 'COUPÉ') + '</button></div>' +
      '<div class="reglage"><span>🔊 Son</span>' +
      '<button class="bascule' + (Son.estMuet() ? '' : ' on') + '" id="rg-son">' + (Son.estMuet() ? 'COUPÉ' : 'ACTIVÉ') + '</button></div>' +
      '<button class="gros-bouton" id="btn-retour">⬅️ Retour</button>'
    );
    const sens = document.getElementById('rg-sens');
    sens.oninput = () => {
      const v = parseFloat(sens.value);
      document.getElementById('rg-sens-val').textContent = v.toFixed(1);
      Scene3D.reglages({ sensibilite: v });
      sauverReglages();
    };
    const bascule = (id, cle) => {
      const b = document.getElementById(id);
      b.onclick = () => {
        const nouveau = !Scene3D.litReglages()[cle];
        Scene3D.reglages({ [cle]: nouveau });
        b.classList.toggle('on', nouveau);
        b.textContent = nouveau ? 'ACTIVÉ' : 'COUPÉ';
        sauverReglages();
      };
    };
    bascule('rg-flou', 'flou');
    bascule('rg-sec', 'secousse');
    const bs = document.getElementById('rg-son');
    bs.onclick = () => {
      const muet = Son.basculerMuet();
      bs.classList.toggle('on', !muet);
      bs.textContent = muet ? 'COUPÉ' : 'ACTIVÉ';
      document.getElementById('btn-son').textContent = muet ? '🔇' : '🔊';
    };
    document.getElementById('btn-retour').onclick = retour;
  }

  function sauverReglages() {
    try { localStorage.setItem('caissiere_reglages', JSON.stringify(Scene3D.litReglages())); } catch (e) {}
  }
  function chargerReglages() {
    try {
      const r = JSON.parse(localStorage.getItem('caissiere_reglages'));
      if (r) Scene3D.reglages(r);
    } catch (e) {}
  }

  function overlayJour(cfg, onGo) {
    ouvrirOverlay(
      '<h1>📅 Jour ' + cfg.n + ' — ' + (JOURS_SEMAINE[cfg.n - 1] || '') + '</h1>' +
      '<h2>' + cfg.magasin + ' — caisse n°' + cfg.caisse + '</h2>' +
      '<p class="sous">' + cfg.intro + '</p>' +
      '<div class="deblocages"><h3>🔓 Débloqué aujourd\'hui</h3><ul>' +
      cfg.deblocages.map(d => '<li>' + d + '</li>').join('') + '</ul></div>' +
      '<p class="sous">👥 ' + cfg.clients + ' clients — ouverture ' + heureTxt(cfg.ouverture) +
      ', fermeture ' + heureTxt(cfg.fermeture) + '</p>' +
      '<button class="gros-bouton vert" id="btn-go">Ouvrir la caisse</button>'
    );
    document.getElementById('btn-go').onclick = onGo;
  }

  const ligne = (ico, lab, val, i) =>
    '<li style="animation-delay:' + (i * 60) + 'ms"><span>' + ico + ' ' + lab + '</span><b>' + val + '</b></li>';

  function overlayBilan(E, titre, onSuite) {
    const s = E.stats;
    const dernier = E.jour >= JOURS.length;
    ouvrirOverlay(
      '<h1>🧾 Bilan du jour ' + E.jour + '</h1>' +
      '<ul class="bilan">' +
      ligne('👥', 'Clients servis', s.servis, 0) +
      ligne('😡', 'Clients énervés', s.enerves, 1) +
      ligne('😭', 'Clients traumatisés', s.traumatises, 2) +
      ligne('🗣️', 'Plaintes', s.plaintes, 3) +
      ligne('👔', 'Appels au responsable', s.responsable, 4) +
      ligne('🚪', 'Clients partis sans payer', s.partis, 5) +
      ligne('⭐', 'Avis 1 étoile', s.avis, 6) +
      ligne('😮‍💨', 'Soupirs', s.soupirs, 7) +
      ligne('🛒', 'Articles scannés', s.articles, 8) +
      ligne('💰', "Chiffre d'affaires", Math.round(E.argent) + ' €', 9) +
      ligne('😈', 'Points de désagréabilité', E.mechPoints, 10) +
      ligne('⭐', 'Réputation', Math.round(E.rep) + '/100', 11) +
      ligne('💼', 'Risque de licenciement', Math.round(E.risk) + ' %', 12) +
      '</ul>' +
      '<div class="titre-obtenu">' + titre.ico + ' « ' + titre.nom + ' »</div>' +
      '<p class="sous">' + titre.txt + '</p>' +
      '<button class="gros-bouton vert" id="btn-suite">' +
      (dernier ? '🏁 Voir la fin de votre carrière' : '➡️ Jour ' + (E.jour + 1)) + '</button>'
    );
    document.getElementById('btn-suite').onclick = () => { fermerOverlay(); onSuite(); };
  }

  function overlayFin(fin, b, E, licenciee) {
    ouvrirOverlay(
      '<div class="scene-fin">' + fin.ico + '</div>' +
      '<h1 style="color:' + fin.couleur + '">' + fin.titre + '</h1>' +
      '<p class="sous">' + fin.scene + '</p>' +
      '<ul class="bilan">' +
      ligne('📅', 'Journées tenues', E.jour + '/' + JOURS.length, 0) +
      ligne('👥', 'Clients servis (total)', b.servis, 1) +
      ligne('😡', 'Clients énervés', b.enerves, 2) +
      ligne('😭', 'Clients traumatisés', b.traumatises, 3) +
      ligne('🗣️', 'Plaintes', b.plaintes, 4) +
      ligne('👔', 'Appels au responsable', b.responsable, 5) +
      ligne('😈', 'Points de désagréabilité', E.mechPoints, 6) +
      ligne('⭐', 'Réputation finale', Math.round(E.rep) + '/100', 7) +
      ligne('💼', 'Risque de licenciement', Math.round(E.risk) + ' %', 8) +
      ligne('💰', "Chiffre d'affaires", Math.round(E.argent) + ' €', 9) +
      '</ul>' +
      '<button class="gros-bouton vert" id="btn-rejouer">🔁 Recommencer une carrière</button>' +
      (licenciee ? '<button class="gros-bouton jaune" id="btn-rejour">↩️ Refaire le jour ' + E.jour + '</button>' : '')
    );
    document.getElementById('btn-rejouer').onclick = () => { fermerOverlay(); Jeu.nouvellePartie(1); };
    const r = document.getElementById('btn-rejour');
    if (r) r.onclick = () => { fermerOverlay(); Jeu.nouvellePartie(E.jour); };
  }

  function overlayMenu(onReprendre, onRejouerJour, onNouvelle, onAide, onReglages) {
    const E = Jeu.etat();
    ouvrirOverlay(
      '<h2>☰ Menu</h2>' +
      '<button class="gros-bouton vert" id="m-reprendre">▶️ Reprendre</button>' +
      (E ? '<button class="gros-bouton" id="m-jour">↩️ Recommencer le jour ' + E.jour + '</button>' : '') +
      '<button class="gros-bouton" id="m-reglages">⚙️ Réglages</button>' +
      '<button class="gros-bouton" id="m-aide">❓ Comment jouer</button>' +
      '<button class="gros-bouton rouge" id="m-nouvelle">🔁 Nouvelle carrière</button>'
    );
    document.getElementById('m-reprendre').onclick = onReprendre;
    const j = document.getElementById('m-jour');
    if (j) j.onclick = onRejouerJour;
    document.getElementById('m-reglages').onclick = onReglages;
    document.getElementById('m-aide').onclick = onAide;
    document.getElementById('m-nouvelle').onclick = onNouvelle;
  }

  return {
    init, chargerReglages,
    majHUD, preparerJour, majFile: (file) => Scene3D.majFile(file.length, file),
    clientArrive, clientPart, humeurClient, humeurCaissiere,
    secoueClient, regardeDerriere, soupirCaissiere, yeuxAuCiel,
    bulleClient, bulleCaissiere, rappelBulle, phase,
    scanArticle, tapisRoule, scannerCasse, tpe, tiroirOuvre, ticket,
    responsable, evenement, volant, toast, annonce,
    titreChoix, afficherChoix, choisirParTouche, majActions, etatBoutons,
    ouvrirOverlay, fermerOverlay, overlayOuvert,
    overlayTitre, overlayAide, overlayReglages, overlayJour, overlayBilan, overlayFin, overlayMenu
  };
})();
