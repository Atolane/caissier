/* ============================================================
   MOTEUR DE JEU
   ============================================================ */
const Jeu = (function () {

  let E = null;              // état de la partie
  let verrou = false;        // empêche les double-clics pendant une animation
  let minuteries = [];

  /* ---------- utilitaires ---------- */
  const pioche = (a) => a[Math.floor(Math.random() * a.length)];
  const borne = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
  const euros = (n) => n.toFixed(2).replace('.', ',') + ' €';

  function tempo(ms, fn) {
    const id = setTimeout(() => {
      minuteries = minuteries.filter(x => x !== id);
      fn();
    }, ms);
    minuteries.push(id);
    return id;
  }
  function stopTempos() { minuteries.forEach(clearTimeout); minuteries = []; }

  /* ---------- sauvegarde ---------- */
  function charger() {
    try { return JSON.parse(localStorage.getItem('caissiere_save')) || {}; }
    catch (e) { return {}; }
  }
  function sauver(data) {
    try { localStorage.setItem('caissiere_save', JSON.stringify(data)); } catch (e) {}
  }
  function enregistrerProgres() {
    const s = charger();
    s.jourMax = Math.max(s.jourMax || 1, E.jour);
    s.meilleurScore = Math.max(s.meilleurScore || 0, E.mechPoints);
    sauver(s);
  }

  /* ---------- création de l'état ---------- */
  function nouvellePartie(jourDepart) {
    stopTempos();
    E = {
      jour: jourDepart || 1, cfg: null,
      heure: 0, argent: 0,
      mech: 0, mechPoints: 0, risk: 0, rep: 50, pat: 100, vit: 100,
      file: [], client: null, scenes: [], idx: 0, choixAffiches: [],
      restants: 0, dernierId: null, evenementsVus: [],
      scanStyle: null, scanRestants: 0,
      actions: { soupir: 2, yeux: 2, pause: 1, prix: 1 },
      paye: false,
      stats: { servis: 0, enerves: 0, traumatises: 0, plaintes: 0, responsable: 0, avis: 0, partis: 0, soupirs: 0, articles: 0, gentillesses: 0, mechancetes: 0 },
      totalStats: { servis: 0, enerves: 0, traumatises: 0, plaintes: 0, responsable: 0, avis: 0, partis: 0, soupirs: 0, articles: 0 },
      fini: false
    };
    commencerJour(E.jour);
  }

  function commencerJour(n) {
    stopTempos();
    E.jour = n;
    E.cfg = JOURS[n - 1];
    E.heure = E.cfg.ouverture;
    E.restants = E.cfg.clients;
    E.evenementsVus = [];
    E.fini = false;
    E.pat = borne(E.pat + 40, 30, 100);
    E.vit = 100;
    E.risk = Math.round(E.risk * 0.55); // une nuit passe, le dossier refroidit
    E.stats = { servis: 0, enerves: 0, traumatises: 0, plaintes: 0, responsable: 0, avis: 0, partis: 0, soupirs: 0, articles: 0, gentillesses: 0, mechancetes: 0 };
    E.file = [];
    const depart = Math.min(3, E.restants);
    for (let i = 0; i < depart; i++) E.file.push(Visages.alea());
    UI.preparerJour(E);
    UI.majHUD(E);
    UI.majFile(E.file, E.cfg.fileMax);
    Son.ambianceOn();
    UI.overlayJour(E.cfg, () => { UI.fermerOverlay(); clientSuivant(); });
  }

  /* ---------- génération d'un client ---------- */
  function genererClient() {
    let dispo = CLIENTS.filter(c => c.d <= E.jour);
    let choix = pioche(dispo);
    let essais = 0;
    while (choix.id === E.dernierId && essais++ < 6) choix = pioche(dispo);
    E.dernierId = choix.id;

    const nbArt = Math.max(2, Math.round(choix.art * (0.7 + E.jour * 0.08)));
    const articles = [];
    let total = 0;
    for (let i = 0; i < nbArt; i++) {
      const p = Math.round((0.85 + Math.random() * 8.5) * 100) / 100;
      total += p;
      articles.push({ emo: pioche(ARTICLES_EMOJI), prix: p });
    }
    return {
      profil: choix, nom: choix.nom, face: choix.face,
      irr: choix.irrBase || 0, articles: articles,
      total: Math.round(total * 100) / 100,
      parti: false, humeur: 'neutre'
    };
  }

  /* ---------- construction du déroulé d'un client ---------- */
  function construireScenes(cl) {
    const s = [];
    s.push({ type: 'dialogue', kind: 'accueil', l: cl.profil.arrivee, pool: GEN.accueil });
    s.push({ type: 'scan' });

    const beats = cl.profil.beats.slice();
    // au-delà du jour 3, on garde tous les beats ; avant, on en retire un pour aller plus vite
    if (E.jour <= 2 && beats.length > 2) beats.splice(Math.floor(Math.random() * beats.length), 1);
    beats.forEach(b => s.push({ type: 'dialogue', kind: 'beat', l: b.l, choix: b.c }));

    if (Math.random() < E.cfg.chanceEvent) {
      const pos = 1 + Math.floor(Math.random() * (s.length - 1));
      s.splice(pos, 0, { type: 'evenement' });
    }
    s.push({ type: 'dialogue', kind: 'prix', l: null, pool: GEN.prix });
    s.push({ type: 'paiement' });
    s.push({ type: 'dialogue', kind: 'depart', l: null, pool: GEN.depart });
    return s;
  }

  /* ---------- sélection des répliques d'un pool ---------- */
  function selectionner(pool) {
    const parTon = {};
    pool.filter(c => c.d <= E.jour).forEach(c => {
      (parTon[c.ton] = parTon[c.ton] || []).push(c);
    });
    const out = [];
    [0, 1, 2, 3, 4].forEach(t => { if (parTon[t]) out.push(pioche(parTon[t])); });
    return out;
  }

  /* ---------- démarrage d'un client ---------- */
  function clientSuivant() {
    if (E.fini) return;
    if (E.restants <= 0 || E.heure >= E.cfg.fermeture) { finJournee(); return; }

    E.client = genererClient();
    E.scenes = construireScenes(E.client);
    E.idx = 0;
    E.paye = false;
    E.scanStyle = null;
    E.actions = { soupir: 2, yeux: 2, pause: 1, prix: 1 };
    if (E.file.length) E.file.shift();
    E.restants--;

    UI.majFile(E.file, E.cfg.fileMax);
    UI.clientArrive(E.client);
    UI.ticket(0, 0, false);
    UI.majActions(E.actions, { scanner: false, encaisser: false });
    tempo(450, jouerScene);
  }

  /* ---------- lecture de la scène courante ---------- */
  function jouerScene() {
    if (E.fini) return;
    const sc = E.scenes[E.idx];
    if (!sc) { finClient(); return; }
    verrou = false;

    if (sc.type === 'dialogue') {
      const choix = sc.choix ? sc.choix.filter(c => c.d <= E.jour) : selectionner(sc.pool);
      E.choixAffiches = choix;
      if (sc.kind === 'prix') {
        UI.bulleClient(null);
        UI.ticket(E.client.total, E.client.articles.length, true);
        UI.afficherChoix(choix.map(c => Object.assign({}, c, { t: c.t.replace(/\{P\}/g, euros(E.client.total)) })), E.jour, choisir);
      } else {
        if (sc.l) { UI.bulleClient(sc.l); UI.humeurClient(humeurClient()); }
        UI.afficherChoix(choix, E.jour, choisir);
      }
      UI.majActions(E.actions, { scanner: false, encaisser: false });

    } else if (sc.type === 'scan') {
      UI.bulleClient(null);
      E.choixAffiches = STYLES_SCAN.filter(c => c.d <= E.jour);
      UI.titreChoix("Comment scannez-vous les articles ?");
      UI.afficherChoix(E.choixAffiches, E.jour, choisirStyleScan);
      UI.majActions(E.actions, { scanner: false, encaisser: false });

    } else if (sc.type === 'evenement') {
      let dispo = EVENEMENTS.filter(e => E.evenementsVus.indexOf(e.id) === -1);
      if (!dispo.length) { dispo = EVENEMENTS; E.evenementsVus = []; }
      const ev = pioche(dispo);
      E.evenementsVus.push(ev.id);
      sc.ev = ev;
      E.choixAffiches = ev.c.filter(c => c.d <= E.jour);
      if (ev.id === 'scanner-ko') UI.scannerCasse(true);
      if (ev.id === 'tpe-panne') { UI.tpe('ko'); Son.paiementKo(); }
      if (ev.resp) { UI.responsable(true, "Alors, Josiane ?"); Son.responsable(); }
      UI.evenement(ev);
      UI.bulleClient(ev.l);
      UI.humeurClient(humeurClient());
      UI.titreChoix('⚠️ ' + ev.ico + ' ' + ev.titre);
      UI.afficherChoix(E.choixAffiches, E.jour, choisir);
      UI.majActions(E.actions, { scanner: false, encaisser: false });

    } else if (sc.type === 'paiement') {
      const mode = E.client.profil.paiement || 'carte';
      const p = PAIEMENTS[mode] || PAIEMENTS.carte;
      E.choixAffiches = p.c.filter(c => c.d <= E.jour);
      UI.bulleClient(p.l);
      UI.humeurClient(humeurClient());
      UI.titreChoix("💰 Encaissement — " + euros(E.client.total));
      UI.afficherChoix(E.choixAffiches, E.jour, choisirPaiement);
      UI.majActions(E.actions, { scanner: false, encaisser: false });
    }
    UI.majHUD(E);
  }

  /* ---------- style de scan ---------- */
  function choisirStyleScan(i) {
    if (verrou) return; verrou = true;
    const ch = E.choixAffiches[i];
    E.scanStyle = ch;
    appliquer(ch);
    UI.bulleCaissiere(null);
    UI.humeurCaissiere(humeurCaissiere(ch.ton));
    sonTon(ch.ton);
    E.scanRestants = E.client.articles.length;
    UI.titreChoix("Appuyez sur 🔴 Scanner (" + E.scanRestants + " articles)");
    UI.afficherChoix([], E.jour, null);
    UI.majActions(E.actions, { scanner: true, encaisser: false });
    UI.tapisRoule(true);
    verrou = false;
  }

  function scanner() {
    const sc = E.scenes[E.idx];
    if (!sc || sc.type !== 'scan' || !E.scanStyle || E.scanRestants <= 0) return;
    const lent = E.scanStyle.ton === 2;
    E.scanRestants--;
    E.stats.articles++;
    UI.scanArticle();
    Son.bip();
    avancerTemps(lent ? 1.4 : 0.5);
    if (E.scanStyle.ton >= 3 && Math.random() < 0.4) {
      E.client.irr = borne(E.client.irr + 5, 0, 120);
      UI.secoueClient();
    }
    if (E.scanRestants > 0) {
      UI.titreChoix("Appuyez sur 🔴 Scanner (" + E.scanRestants + " articles)");
      UI.majHUD(E);
    } else {
      UI.tapisRoule(false);
      UI.majActions(E.actions, { scanner: false, encaisser: false });
      UI.titreChoix('');
      tempo(320, () => { avancer(); });
    }
  }

  /* ---------- paiement ---------- */
  function choisirPaiement(i) {
    if (verrou) return; verrou = true;
    const ch = E.choixAffiches[i];
    UI.bulleCaissiere(ch.t);
    sonTon(ch.ton);
    UI.humeurCaissiere(humeurCaissiere(ch.ton));
    appliquer(ch);
    const mode = E.client.profil.paiement;
    if (mode === 'pieces' || mode === 'monnaie') Son.pieces();
    tempo(700, () => {
      reactionClient(ch, () => {
        UI.titreChoix("Appuyez sur 💰 Encaisser");
        UI.afficherChoix([], E.jour, null);
        UI.majActions(E.actions, { scanner: false, encaisser: true });
        verrou = false;
      });
    });
  }

  function encaisser() {
    const sc = E.scenes[E.idx];
    if (!sc || sc.type !== 'paiement' || E.paye) return;
    E.paye = true;
    const mode = E.client.profil.paiement;
    const echec = Math.random() < 0.13;
    UI.tiroirOuvre();
    Son.tiroir();
    if ((mode === 'carte' || mode === 'sanscontact') && echec) {
      UI.tpe('ko'); Son.paiementKo();
      UI.toast("Paiement refusé ! Le client doit réessayer.", 'mal');
      UI.volant('❌', '#e8453c');
      E.client.irr = borne(E.client.irr + 10, 0, 120);
      avancerTemps(2);
      tempo(900, () => {
        UI.tpe('ok'); Son.paiementOk();
        finPaiement();
      });
    } else {
      UI.tpe('ok'); Son.paiementOk();
      finPaiement();
    }
  }

  function finPaiement() {
    E.argent += E.client.total;
    UI.volant('+' + euros(E.client.total), '#2fb457');
    avancerTemps(1);
    UI.majHUD(E);
    UI.majActions(E.actions, { scanner: false, encaisser: false });
    tempo(650, avancer);
  }

  /* ---------- choix de dialogue ---------- */
  function choisir(i) {
    if (verrou) return; verrou = true;
    const ch = E.choixAffiches[i];
    const sc = E.scenes[E.idx];
    const texte = sc.kind === 'prix' ? ch.t.replace(/\{P\}/g, euros(E.client.total)) : ch.t;
    UI.bulleCaissiere(texte);
    UI.humeurCaissiere(humeurCaissiere(ch.ton));
    sonTon(ch.ton);
    appliquer(ch);
    if (sc.type === 'evenement' && sc.ev) {
      if (sc.ev.id === 'scanner-ko') tempo(900, () => UI.scannerCasse(false));
      if (sc.ev.id === 'tpe-panne') tempo(900, () => UI.tpe('ok'));
      if (sc.ev.resp) {
        if (ch.ton >= 3) { E.stats.responsable++; }
        tempo(1400, () => UI.responsable(false));
      }
    }
    tempo(820, () => reactionClient(ch, () => { verrou = false; avancer(); }));
  }

  /* ---------- application des effets ---------- */
  function appliquer(ch) {
    const cl = E.client;
    if (cl) cl.irr = borne(cl.irr + (ch.irr || 0), 0, 120);
    E.mechPoints += Math.max(0, ch.mech || 0) * 3;
    // la jauge glisse vers le niveau visé par le ton employé : elle monte vite,
    // redescend lentement, et les petites cruautés gratuites ne la font jamais baisser
    const cible = CIBLES_MECHANCETE[ch.ton] !== undefined ? CIBLES_MECHANCETE[ch.ton] : E.mech;
    if (cible > E.mech) E.mech += (cible - E.mech) * 0.16;
    else if (!ch.acte) E.mech += (cible - E.mech) * 0.05;
    E.mech = borne(E.mech, 0, 100);
    E.rep = borne(E.rep + (ch.rep || 0), 0, 100);
    E.risk = borne(E.risk + (ch.risk || 0), 0, 100);
    E.pat = borne(E.pat + (ch.pat || 0) - 1, 0, 100);
    E.vit = borne(E.vit + (ch.vit || 0), 0, 100);
    if (ch.cash) E.argent = Math.max(0, E.argent + ch.cash);
    if (ch.ton >= 3) E.stats.mechancetes++;
    if (ch.ton === 0) E.stats.gentillesses++;

    avancerTemps(ch.ton === 0 ? 1.5 : 1);
    if (ch.mech) UI.volant('😈 +' + Math.round(ch.mech * 3), '#8b5cf6');
    if (ch.risk >= 5) UI.volant('👔 +' + ch.risk, '#e8453c');
    UI.majHUD(E);

    if (E.pat <= 0) craquage();
    if (E.risk >= 100) { licenciement(); }
  }

  /* ---------- le craquage : la caissière explose ---------- */
  function craquage() {
    E.pat = 60;
    E.mech = borne(E.mech + (100 - E.mech) * 0.10, 0, 100);
    E.mechPoints += 35;
    E.risk = borne(E.risk + 5, 0, 100);
    if (E.client) E.client.irr = borne(E.client.irr + 35, 0, 120);
    UI.toast("🤯 CRAQUAGE : « JE N'EN PEUX PLUS DE VOUS TOUS ! »", 'mal');
    UI.volant('🤯', '#ff8a3d');
    UI.humeurCaissiere('furieux');
    Son.colere();
    UI.majHUD(E);
  }

  /* ---------- réaction du client ---------- */
  function humeurClient() {
    const i = E.client ? E.client.irr : 0;
    if (i >= 90) return 'furieux';
    if (i >= 65) return 'enerve';
    if (i >= 40) return 'desabuse';
    if (i >= 18) return 'blase';
    return 'content';
  }
  function humeurCaissiere(ton) {
    return ['content', 'neutre', 'blase', 'desabuse', 'sarcastique'][ton] || 'neutre';
  }
  function sonTon(ton) {
    if (ton === 0) Son.gentil();
    else if (ton <= 2) Son.clic();
    else if (ton === 3) Son.mechant();
    else Son.diabolique();
  }

  function reactionClient(ch, suite) {
    const cl = E.client;
    if (!cl) { suite && suite(); return; }

    if (cl.irr >= 100) { reactionExtreme(suite); return; }

    let pool;
    if (ch.ton >= 3 && Math.random() < 0.22) { pool = REACTIONS.rire; Son.rire(); cl.irr = borne(cl.irr - 12, 0, 120); }
    else if (ch.ton >= 2 && cl.irr > 45 && Math.random() < 0.3) pool = REACTIONS.sarcasme;
    else if (cl.irr >= 75) { pool = REACTIONS.furieux; Son.colere(); }
    else if (cl.irr >= 50) { pool = REACTIONS.enerve; Son.soupir(); }
    else if (cl.irr >= 25) { pool = REACTIONS.agace; if (Math.random() < 0.5) Son.soupir(); }
    else pool = REACTIONS.calme;

    UI.humeurClient(humeurClient());
    UI.bulleClient(pioche(pool));
    if (cl.irr >= 65) UI.secoueClient();
    if (cl.irr >= 50 && Math.random() < 0.4) UI.regardeDerriere();
    UI.majHUD(E);
    tempo(1250, () => { suite && suite(); });
  }

  function reactionExtreme(suite) {
    const cl = E.client;
    let dispo = EXTREMES.slice();
    if (E.mech < 40) dispo = dispo.filter(e => e.id !== 'pleure');
    const ex = pioche(dispo);

    UI.humeurClient(ex.id === 'pleure' ? 'triste' : 'furieux');
    UI.bulleClient(ex.ico + ' ' + ex.txt);
    UI.secoueClient();
    Son.colere();

    E.risk = borne(E.risk + ex.eff.risk, 0, 100);
    E.mech = borne(E.mech + (ex.eff.mech || 0) * 0.6, 0, 100);
    E.mechPoints += (ex.eff.mech || 0) * 6;
    E.rep = borne(E.rep + (ex.eff.rep || 0), 0, 100);
    if (E.stats[ex.stat] !== undefined) E.stats[ex.stat]++;
    E.stats.enerves++;
    UI.volant(ex.ico, '#e8453c');
    UI.toast(ex.ico + ' ' + titreExtreme(ex.id), 'mal');

    if (ex.resp) { UI.responsable(true, "Il y a un problème ?"); Son.responsable(); tempo(2200, () => UI.responsable(false)); }

    cl.irr = 60; // le client redescend un peu après avoir explosé
    UI.majHUD(E);

    if (E.risk >= 100) { tempo(1400, licenciement); return; }

    if (ex.eff.perteCaddie) {
      cl.parti = true;
      tempo(1600, () => { finClient(true); });
    } else {
      tempo(1700, () => { suite && suite(); });
    }
  }

  function titreExtreme(id) {
    return {
      plainte: "Réclamation écrite !", responsable: "Le client réclame le responsable !",
      quitte: "Le client quitte la caisse !", avis: "Avis 1 étoile en ligne !",
      pleure: "Client traumatisé...", crie: "Le client hurle !"
    }[id] || '';
  }

  /* ---------- avancement ---------- */
  function avancer() {
    if (E.fini) return;
    E.idx++;
    if (E.idx >= E.scenes.length) { finClient(); return; }
    UI.titreChoix('');
    jouerScene();
  }

  function avancerTemps(minutes) {
    E.heure += minutes;
    // plus on traîne, plus la vitesse baisse
    if (minutes >= 3) E.vit = borne(E.vit - 2, 0, 100);
    UI.majHUD(E);
  }

  /* ---------- fin d'un client ---------- */
  function finClient(abandon) {
    const cl = E.client;
    if (!cl) return;
    if (abandon) {
      UI.toast("Le client est parti sans ses courses. Chiffre d'affaires perdu.", 'mal');
    } else {
      E.stats.servis++;
      E.totalStats.servis++;
      if (cl.irr >= 65) E.stats.enerves++;
      // un client encaissé, c'est du chiffre : le responsable respire un peu
      E.risk = borne(E.risk - 7, 0, 100);
      if (cl.irr < 25) { E.risk = borne(E.risk - 3, 0, 100); E.rep = borne(E.rep + 1, 0, 100); }
    }
    UI.clientPart();
    UI.bulleClient(null);
    UI.bulleCaissiere(null);
    UI.ticket(0, 0, false);
    UI.titreChoix('');
    UI.afficherChoix([], E.jour, null);
    UI.majActions(E.actions, { scanner: false, encaisser: false });

    // la file se remplit selon la vitesse et la difficulté
    const arrivees = (E.vit < 45 ? 2 : (E.vit < 75 ? 1 : 0)) + (Math.random() < E.jour * 0.12 ? 1 : 0);
    for (let i = 0; i < arrivees; i++) if (E.file.length < E.restants) E.file.push(Visages.alea());
    UI.majFile(E.file, E.cfg.fileMax);

    if (E.file.length > E.cfg.fileMax) {
      E.risk = borne(E.risk + 4, 0, 100);
      UI.toast("👥 La file déborde ! Le responsable l'a remarqué.", 'mal');
      Son.murmure();
    } else if (E.file.length >= 2 && Math.random() < 0.4) {
      UI.toast(pioche(MURMURES), 'info');
      Son.murmure();
    }

    E.client = null;
    UI.majHUD(E);
    if (E.risk >= 100) { licenciement(); return; }
    tempo(900, clientSuivant);
  }

  /* ---------- actions permanentes de la caissière ---------- */
  function action(nom) {
    if (E.fini || verrou || !E.client) return;
    if (!E.actions[nom] || E.actions[nom] <= 0) return;
    E.actions[nom]--;

    if (nom === 'soupir') {
      E.stats.soupirs++;
      UI.humeurCaissiere('blase');
      UI.soupirCaissiere();
      Son.soupir();
      UI.volant('😮‍💨', '#7d8798');
      appliquer({ irr: 6, mech: 4, rep: -1, risk: 1, pat: 4, vit: 0, ton: 2, acte: true });
    } else if (nom === 'yeux') {
      UI.humeurCaissiere('desabuse');
      UI.yeuxAuCiel();
      Son.soupir();
      UI.volant('🙄', '#8b5cf6');
      appliquer({ irr: 9, mech: 6, rep: -2, risk: 1, pat: 5, vit: 0, ton: 3, acte: true });
    } else if (nom === 'pause') {
      UI.toast("🐌 « Deux secondes, j'ai un truc à finir. » (elle n'a rien à finir)", 'info');
      UI.humeurCaissiere('sarcastique');
      UI.volant('🐌', '#ff8a3d');
      avancerTemps(4);
      appliquer({ irr: 16, mech: 10, rep: -4, risk: 3, pat: 8, vit: -6, ton: 3, acte: true });
    } else if (nom === 'prix') {
      UI.toast("📢 « Contrôle de prix caisse 3 ! Contrôle de prix ! » (dans le micro, très fort)", 'info');
      UI.volant('📢', '#2f80ed');
      Son.bipRate();
      avancerTemps(3);
      appliquer({ irr: 14, mech: 9, rep: -3, risk: 2, pat: 6, vit: -4, ton: 3, acte: true });
    }
    if (E.client) { UI.humeurClient(humeurClient()); }
    UI.majActions(E.actions, UI.etatBoutons());
    UI.majHUD(E);
    if (E.client && E.client.irr >= 100 && !verrou) {
      verrou = true;
      tempo(600, () => reactionExtreme(() => { verrou = false; }));
    }
  }

  /* ---------- licenciement ---------- */
  function licenciement() {
    if (E.fini) return;
    E.fini = true;
    stopTempos();
    Son.ambianceOff();
    Son.defaite();
    UI.responsable(true, "Josiane. Mon bureau.");
    enregistrerProgres();
    setTimeout(() => UI.overlayFin(FINS.licenciee, bilanComplet(), E, true), 1200);
  }

  /* ---------- fin de journée ---------- */
  function finJournee() {
    if (E.fini) return;
    E.fini = true;
    stopTempos();
    Object.keys(E.stats).forEach(k => {
      if (E.totalStats[k] !== undefined && k !== 'servis') E.totalStats[k] += E.stats[k];
    });
    enregistrerProgres();
    Son.ambianceOff();
    const titre = titreDuJour();
    Son.victoire();
    UI.overlayBilan(E, titre, () => {
      if (E.jour >= JOURS.length) { finPartie(); }
      else { E.fini = false; commencerJour(E.jour + 1); }
    });
  }

  function titreDuJour() {
    let t = TITRES[0];
    TITRES.forEach(x => { if (E.mech >= x.min) t = x; });
    return t;
  }

  function bilanComplet() {
    return {
      servis: E.totalStats.servis, enerves: E.totalStats.enerves + E.stats.enerves,
      traumatises: E.totalStats.traumatises + E.stats.traumatises,
      plaintes: E.totalStats.plaintes + E.stats.plaintes,
      responsable: E.totalStats.responsable + E.stats.responsable,
      avis: E.totalStats.avis + E.stats.avis,
      partis: E.totalStats.partis + E.stats.partis,
      soupirs: E.totalStats.soupirs + E.stats.soupirs
    };
  }

  function finPartie() {
    E.fini = true;
    const b = bilanComplet();
    let fin;
    if (E.mech >= 88 && E.risk < 90) fin = FINS.legende;
    else if (b.plaintes + b.responsable * 2 >= 9) fin = FINS.convocation;
    else if (E.mech >= 60) fin = FINS.terreur;
    else if (E.rep >= 70 && E.mech < 30) fin = FINS.modele;
    else fin = FINS.normale;
    Son.ambianceOff();
    if (fin === FINS.legende || fin === FINS.modele) Son.victoire(); else Son.defaite();
    enregistrerProgres();
    UI.overlayFin(fin, b, E, false);
  }

  /* ---------- API publique ---------- */
  return {
    nouvellePartie,
    commencerJour: (n) => { E ? (E.fini = false, commencerJour(n)) : nouvellePartie(n); },
    scanner, encaisser, action,
    etat: () => E,
    euros,
    titreDuJour,
    bilanComplet,
    charger,
    stopTempos
  };
})();
