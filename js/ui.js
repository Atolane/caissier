/* ============================================================
   INTERFACE — rendu, animations, écrans
   ============================================================ */
const UI = (function () {
  const $ = (s) => document.querySelector(s);
  const el = {};
  let boutons = { scanner: false, encaisser: false };
  let articlesEnCours = [];
  let totalCourant = 0, nbScannes = 0;
  let humeurCaiss = 'blase';
  let faceCaissiere = { peau: '#f3cba7', cheveux: 'chignon', couleur: '#8a5a2b', lunettes: false, vetement: '#2f80ed' };
  let faceResp = { peau: '#e0b184', cheveux: 'court', couleur: '#3a3a3a', lunettes: true, vetement: '#2b3a55', barbe: true };

  function init() {
    ['hud', 'scene', 'panneau', 'overlay', 'overlay-box', 'choix', 'actions', 'articles', 'tapis',
      'client-avatar', 'client-nom', 'caissiere-avatar', 'zone-client', 'zone-caissiere', 'file-attente',
      'bulle-client', 'bulle-client-txt', 'bulle-caissiere', 'bulle-caissiere-txt', 'scanner', 'tpe',
      'tiroir', 'responsable', 'resp-avatar', 'resp-bulle', 'volants', 'toasts', 'ticket-info',
      'ticket-total', 'ticket-details', 'enseigne', 'num-caisse', 'hud-jour', 'hud-heure', 'hud-argent',
      'hud-file'].forEach(id => { el[id] = document.getElementById(id); });
    el['caissiere-avatar'].innerHTML = Visages.dessine(faceCaissiere, 'blase');
    el['resp-avatar'].innerHTML = Visages.dessine(faceResp, 'neutre');
  }

  /* ---------------- HUD ---------------- */
  function pct(v) { return Math.max(0, Math.min(100, Math.round(v))); }
  function jauge(id, val, danger) {
    const barre = document.getElementById('j-' + id);
    const txt = document.getElementById('v-' + id);
    if (!barre) return;
    const v = pct(val);
    if (barre.style.width !== v + '%') {
      barre.style.width = v + '%';
      const j = barre.closest('.jauge');
      j.classList.remove('pulse'); void j.offsetWidth; j.classList.add('pulse');
      j.classList.toggle('danger', !!danger);
    }
    txt.textContent = v;
  }
  function heureTxt(min) {
    const h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function majHUD(E) {
    el['hud-jour'].textContent = 'Jour ' + E.jour;
    el['hud-heure'].textContent = heureTxt(E.heure);
    el['hud-argent'].textContent = Math.round(E.argent) + ' €';
    el['hud-file'].textContent = E.file.length;
    jauge('mech', E.mech);
    jauge('risk', E.risk, E.risk >= 75);
    jauge('rep', E.rep);
    jauge('pat', E.pat, E.pat <= 20);
    jauge('vit', E.vit);
  }

  function preparerJour(E) {
    el.hud.classList.remove('hidden');
    el.scene.classList.remove('hidden');
    el.panneau.classList.remove('hidden');
    el.enseigne.textContent = E.cfg.magasin.toUpperCase();
    el['num-caisse'].textContent = E.cfg.caisse;
    responsable(false);
    scannerCasse(false);
    tpe('');
    el['client-avatar'].innerHTML = '';
    el['client-nom'].textContent = '—';
    el.articles.innerHTML = '';
    bulleClient(null); bulleCaissiere(null);
  }

  /* ---------------- file d'attente ---------------- */
  function majFile(file, max) {
    const n = file.length;
    const visibles = file.slice(0, 5);
    el['file-attente'].innerHTML = visibles.map(f =>
      '<div class="file-tete">' + Visages.tete(f, Math.random() < 0.5 ? 'blase' : 'desabuse') + '</div>').join('')
      + (n > 5 ? '<span class="file-plus">+' + (n - 5) + '</span>' : '');
    if (n > max) el['file-attente'].style.filter = 'drop-shadow(0 0 6px rgba(232,69,60,.8))';
    else el['file-attente'].style.filter = '';
  }

  /* ---------------- client ---------------- */
  function clientArrive(cl) {
    el['client-avatar'].innerHTML = Visages.dessine(cl.face, cl.irr > 30 ? 'enerve' : 'neutre');
    el['client-nom'].textContent = cl.profil.emoji + ' ' + cl.nom;
    el['zone-client'].classList.remove('sortie');
    el['zone-client'].classList.remove('entree'); void el['zone-client'].offsetWidth;
    el['zone-client'].classList.add('entree');
    articlesEnCours = cl.articles.slice();
    totalCourant = 0; nbScannes = 0;
    el.articles.innerHTML = articlesEnCours.map((a, i) =>
      '<span class="article" data-i="' + i + '" style="animation-delay:' + (i * 55) + 'ms">' + a.emo + '</span>').join('');
    Son.tapis();
    toast(cl.profil.emoji + ' ' + cl.nom + " — " + cl.profil.desc, 'info');
  }
  function clientPart() {
    el['zone-client'].classList.add('sortie');
    setTimeout(() => { el['client-avatar'].innerHTML = ''; el.articles.innerHTML = ''; }, 480);
  }
  function humeurClient(h) {
    const cl = Jeu.etat() && Jeu.etat().client;
    if (!cl) return;
    el['client-avatar'].innerHTML = Visages.dessine(cl.face, h);
  }
  function humeurCaissiere(h) {
    humeurCaiss = h;
    el['caissiere-avatar'].innerHTML = Visages.dessine(faceCaissiere, h);
  }
  function secoueClient() {
    const z = el['zone-client'];
    z.classList.remove('secoue'); void z.offsetWidth; z.classList.add('secoue');
    setTimeout(() => z.classList.remove('secoue'), 420);
  }
  function regardeDerriere() {
    const z = el['zone-client'];
    z.classList.remove('regarde-derriere'); void z.offsetWidth; z.classList.add('regarde-derriere');
    setTimeout(() => z.classList.remove('regarde-derriere'), 1000);
  }
  function soupirCaissiere() {
    const z = el['zone-caissiere'];
    z.classList.remove('soupir'); void z.offsetWidth; z.classList.add('soupir');
    setTimeout(() => z.classList.remove('soupir'), 800);
  }
  function yeuxAuCiel() {
    const z = el['zone-caissiere'];
    z.classList.remove('yeux'); void z.offsetWidth; z.classList.add('yeux');
    setTimeout(() => z.classList.remove('yeux'), 900);
  }

  /* ---------------- bulles ---------------- */
  function bulleClient(txt) {
    if (!txt) { el['bulle-client'].classList.add('hidden'); return; }
    el['bulle-client-txt'].textContent = txt;
    el['bulle-client'].classList.remove('hidden');
    el['bulle-client'].style.animation = 'none'; void el['bulle-client'].offsetWidth;
    el['bulle-client'].style.animation = '';
  }
  function bulleCaissiere(txt) {
    if (!txt) { el['bulle-caissiere'].classList.add('hidden'); return; }
    el['bulle-caissiere-txt'].textContent = txt;
    el['bulle-caissiere'].classList.remove('hidden');
    el['bulle-caissiere'].style.animation = 'none'; void el['bulle-caissiere'].offsetWidth;
    el['bulle-caissiere'].style.animation = '';
  }

  /* ---------------- matériel ---------------- */
  function scanArticle() {
    const noeud = el.articles.querySelector('.article:not(.scanne)');
    if (noeud) {
      noeud.classList.add('scanne');
      setTimeout(() => noeud.remove(), 400);
      const a = articlesEnCours[nbScannes];
      if (a) totalCourant += a.prix;
      nbScannes++;
      ticket(totalCourant, nbScannes, true);
    }
    el.scanner.classList.remove('bip'); void el.scanner.offsetWidth; el.scanner.classList.add('bip');
    setTimeout(() => el.scanner.classList.remove('bip'), 240);
  }
  function tapisRoule(on) { el.tapis.classList.toggle('roule', !!on); if (on) Son.tapis(); }
  function scannerCasse(on) { el.scanner.classList.toggle('casse', !!on); }
  function tpe(etat) {
    el.tpe.classList.remove('ok', 'ko');
    if (etat) el.tpe.classList.add(etat);
    el.tpe.querySelector('.tpe-ecran').textContent = etat === 'ok' ? 'OK' : (etat === 'ko' ? 'ERR' : 'CB');
  }
  function tiroirOuvre() {
    el.tiroir.classList.remove('ouvert'); void el.tiroir.offsetWidth; el.tiroir.classList.add('ouvert');
    setTimeout(() => el.tiroir.classList.remove('ouvert'), 520);
  }
  function ticket(total, n, visible) {
    el['ticket-info'].classList.toggle('hidden', !visible);
    el['ticket-total'].textContent = total.toFixed(2).replace('.', ',') + ' €';
    el['ticket-details'].textContent = n + (n > 1 ? ' articles' : ' article');
  }

  /* ---------------- responsable ---------------- */
  function responsable(afficher, txt) {
    if (afficher) {
      el['resp-avatar'].innerHTML = Visages.dessine(faceResp, 'desabuse');
      el['resp-bulle'].textContent = txt || "Tout va bien ?";
      el.responsable.classList.remove('hidden');
      el.responsable.style.animation = 'none'; void el.responsable.offsetWidth; el.responsable.style.animation = '';
    } else {
      el.responsable.classList.add('hidden');
    }
  }
  function evenement(ev) {
    toast('⚠️ ' + ev.ico + ' ' + ev.titre, 'mal');
    Son.bipRate();
  }

  /* ---------------- feedback ---------------- */
  function volant(txt, couleur) {
    const d = document.createElement('div');
    d.className = 'volant';
    d.textContent = txt;
    d.style.color = couleur || '#fff';
    d.style.left = (30 + Math.random() * 40) + '%';
    d.style.top = (40 + Math.random() * 20) + '%';
    el.volants.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }
  function toast(txt, type) {
    const d = document.createElement('div');
    d.className = 'toast ' + (type || '');
    d.textContent = txt;
    el.toasts.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  /* ---------------- panneau de choix ---------------- */
  function titreChoix(txt) {
    let t = document.getElementById('titre-choix');
    if (!txt) { if (t) t.remove(); return; }
    if (!t) {
      t = document.createElement('div');
      t.id = 'titre-choix';
      t.style.cssText = 'font-weight:bold;font-size:13px;margin-bottom:5px;text-align:center';
      el.choix.parentNode.insertBefore(t, el.choix);
    }
    t.textContent = txt;
  }

  function afficherChoix(liste, jour, cb) {
    el.choix.innerHTML = '';
    if (!liste || !liste.length) return;
    liste.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'choix-btn' + (c.d === jour && jour > 1 ? ' neuf' : '');
      b.dataset.ton = c.ton;
      b.innerHTML = '<span class="emo">' + c.e + '</span><span>' + c.t + '</span>';
      b.addEventListener('click', () => { if (cb) cb(i); });
      el.choix.appendChild(b);
    });
  }

  function majActions(actions, etats) {
    boutons = etats || boutons;
    const map = { soupir: 'act-soupir', yeux: 'act-yeux', pause: 'act-pause', prix: 'act-prix' };
    Object.keys(map).forEach(k => {
      const b = document.getElementById(map[k]);
      b.querySelector('.cpt').textContent = actions[k];
      b.disabled = actions[k] <= 0;
    });
    const sc = document.getElementById('act-scanner');
    const en = document.getElementById('act-encaisser');
    sc.disabled = !boutons.scanner;
    en.disabled = !boutons.encaisser;
    sc.classList.toggle('dispo', !!boutons.scanner);
    en.classList.toggle('dispo', !!boutons.encaisser);
  }
  function etatBoutons() { return boutons; }

  /* ---------------- overlays ---------------- */
  function ouvrirOverlay(html) {
    el['overlay-box'].innerHTML = html;
    el.overlay.classList.remove('hidden');
  }
  function fermerOverlay() { el.overlay.classList.add('hidden'); }

  function overlayTitre(save, onJouer, onAide) {
    const vitrine = [CLIENTS[0], CLIENTS[1], CLIENTS[3], CLIENTS[8]]
      .map(c => '<div>' + Visages.dessine(c.face, 'desabuse') + '</div>').join('');
    let reprise = '';
    if (save.jourMax && save.jourMax > 1) {
      reprise = '<button class="gros-bouton" id="btn-reprendre">▶️ Reprendre au jour ' + save.jourMax + '</button>';
    }
    ouvrirOverlay(
      '<h1 class="titre-jeu">La Caissière<br>la Plus Insupportable<small>SIMULATION DE CAISSE</small></h1>' +
      '<div class="vitrine">' + vitrine + '<div>' + Visages.dessine(faceCaissiere, 'sarcastique') + '</div></div>' +
      '<p class="sous">Vous êtes Josiane, caissière. Votre mission : devenir la caissière la plus insupportable du magasin… <b>sans vous faire licencier</b>.</p>' +
      '<button class="gros-bouton vert" id="btn-jouer">😈 Commencer le jour 1</button>' +
      reprise +
      '<button class="gros-bouton gris" id="btn-aide">❓ Comment jouer</button>' +
      (save.meilleurScore ? '<p class="sous" style="margin-top:8px">🏅 Meilleur score de désagréabilité : <b>' + save.meilleurScore + '</b></p>' : '')
    );
    document.getElementById('btn-jouer').onclick = () => onJouer(1);
    if (document.getElementById('btn-reprendre')) document.getElementById('btn-reprendre').onclick = () => onJouer(save.jourMax);
    document.getElementById('btn-aide').onclick = onAide;
  }

  function overlayAide(retour) {
    ouvrirOverlay(
      '<h2>❓ Comment jouer</h2>' +
      '<div class="aide">' +
      '<p><b>Le principe :</b> chaque client passe à votre caisse. À chaque réplique, vous choisissez votre réponse, du plus <b>gentil</b> 😊 au plus <b>diabolique</b> 😈.</p>' +
      '<p><b>😈 Désagréabilité</b> monte quand vous êtes odieuse. C\'est votre score.<br>' +
      '<b>👔 Risque de licenciement</b> monte aussi. À <b>100 %</b>, le responsable arrive et c\'est fini.<br>' +
      '<b>⭐ Réputation</b> baisse avec les plaintes.<br>' +
      '<b>🧘 Patience</b> descend quand vous êtes aimable ; à zéro, vous craquez toute seule.<br>' +
      '<b>⚡ Vitesse</b> : si vous traînez, la file s\'allonge et le risque monte.</p>' +
      '<p><b>Boutons :</b> 🔴 Scanner (un appui par article), 💰 Encaisser, et les actions gratuites : 😮‍💨 Soupirer, 🙄 Yeux au ciel, 🐌 Pause imprévue, 📢 Contrôle de prix.</p>' +
      '<p><b>But :</b> survivre 5 journées et finir avec la désagréabilité la plus haute possible. Trop loin = licenciée. Pas assez loin = employée modèle (la honte).</p>' +
      '</div>' +
      '<button class="gros-bouton" id="btn-retour">⬅️ Retour</button>'
    );
    document.getElementById('btn-retour').onclick = retour;
  }

  function overlayJour(cfg, onGo) {
    ouvrirOverlay(
      '<h1>📅 Jour ' + cfg.n + '</h1>' +
      '<h2>' + cfg.magasin + ' — caisse n°' + cfg.caisse + '</h2>' +
      '<p class="sous">' + cfg.intro + '</p>' +
      '<div class="deblocages"><h3>🔓 Débloqué aujourd\'hui</h3><ul>' +
      cfg.deblocages.map(d => '<li>' + d + '</li>').join('') + '</ul></div>' +
      '<p class="sous">👥 ' + cfg.clients + ' clients — ouverture ' + heureTxt(cfg.ouverture) + ', fermeture ' + heureTxt(cfg.fermeture) + '</p>' +
      '<button class="gros-bouton vert" id="btn-go">Ouvrir la caisse</button>'
    );
    document.getElementById('btn-go').onclick = onGo;
  }

  function ligne(ico, lab, val, i) {
    return '<li style="animation-delay:' + (i * 70) + 'ms"><span>' + ico + ' ' + lab + '</span><b>' + val + '</b></li>';
  }

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
      '<button class="gros-bouton vert" id="btn-suite">' + (dernier ? '🏁 Voir la fin de votre carrière' : '➡️ Jour ' + (E.jour + 1)) + '</button>'
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
      (licenciee ? '<button class="gros-bouton" id="btn-rejour">↩️ Refaire le jour ' + E.jour + '</button>' : '')
    );
    document.getElementById('btn-rejouer').onclick = () => { fermerOverlay(); Jeu.nouvellePartie(1); };
    const r = document.getElementById('btn-rejour');
    if (r) r.onclick = () => { fermerOverlay(); Jeu.nouvellePartie(E.jour); };
  }

  function overlayMenu(onReprendre, onRejouerJour, onNouvelle, onAide) {
    const E = Jeu.etat();
    ouvrirOverlay(
      '<h2>☰ Menu</h2>' +
      '<div class="menu-liste">' +
      '<button class="gros-bouton vert" id="m-reprendre">▶️ Reprendre</button>' +
      (E ? '<button class="gros-bouton" id="m-jour">↩️ Recommencer le jour ' + E.jour + '</button>' : '') +
      '<button class="gros-bouton" id="m-aide">❓ Comment jouer</button>' +
      '<button class="gros-bouton rouge" id="m-nouvelle">🔁 Nouvelle carrière</button>' +
      '</div>'
    );
    document.getElementById('m-reprendre').onclick = onReprendre;
    if (document.getElementById('m-jour')) document.getElementById('m-jour').onclick = onRejouerJour;
    document.getElementById('m-aide').onclick = onAide;
    document.getElementById('m-nouvelle').onclick = onNouvelle;
  }

  return {
    init, majHUD, preparerJour, majFile, clientArrive, clientPart, humeurClient, humeurCaissiere,
    secoueClient, regardeDerriere, soupirCaissiere, yeuxAuCiel, bulleClient, bulleCaissiere,
    scanArticle, tapisRoule, scannerCasse, tpe, tiroirOuvre, ticket, responsable, evenement,
    volant, toast, titreChoix, afficherChoix, majActions, etatBoutons,
    ouvrirOverlay, fermerOverlay, overlayTitre, overlayAide, overlayJour, overlayBilan, overlayFin, overlayMenu
  };
})();
