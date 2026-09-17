/* ============================================================
   SCÈNE 3D — vue à la première personne derrière la caisse
   Utilise three.js (embarqué dans js/vendor/three.min.js).
   Le moteur de jeu (engine.js) ne parle jamais directement à ce
   module : il passe par UI, qui relaie ici.
   ============================================================ */
const Scene3D = (function () {

  const T = THREE;
  let renderer, scene, camera, horloge, canvas;
  let pret = false;

  /* ---- caméra ---- */
  const cam = {
    yaw: 0, pitch: -0.13, yawCible: 0, pitchCible: -0.13,
    vitesse: 0, secousse: 0, base: new T.Vector3(0, 1.34, 0.25),
    dPitch: 0, dYaw: 0, dY: 0   // décalages temporaires (soupir, yeux au ciel...)
  };
  const LIM = { yaw: 1.15, pitchMin: -0.62, pitchMax: 0.30 };
  let reglages = { sensibilite: 1, flou: true, secousse: true };

  /* ---- contenu ---- */
  const obj = {};              // objets nommés interactifs
  let interactifs = { scanner: false, tpe: false };
  let client = null, responsableP = null;
  let fileP = [];              // clients qui attendent
  let articles = [];           // articles posés sur le tapis
  let anims = [];              // animations en cours
  let mainD, mainG;
  let cbClic = null, cbSurvol = null, cbFrame = null;
  let survolActuel = null;
  let tapisActif = false, tubeFolie = 0;

  /* ============================================================
     Petits utilitaires
     ============================================================ */
  const mat = (couleur, opts) => new T.MeshLambertMaterial(Object.assign({ color: couleur }, opts || {}));

  function boite(l, h, p, couleur, opts) {
    const m = new T.Mesh(new T.BoxGeometry(l, h, p), mat(couleur, opts));
    return m;
  }
  function place(m, x, y, z) { m.position.set(x, y, z); return m; }

  function canvasTex(l, h, dessin) {
    const c = document.createElement('canvas');
    c.width = l; c.height = h;
    dessin(c.getContext('2d'), l, h);
    const tex = new T.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.__canvas = c;
    return tex;
  }

  function anim(duree, maj, fin) {
    const a = { t: 0, duree: duree, maj: maj, fin: fin };
    anims.push(a);
    return a;
  }
  const lissage = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  /* ============================================================
     Textures dessinées
     ============================================================ */
  function texSol() {
    return canvasTex(256, 256, (c) => {
      c.fillStyle = '#c3c8c6'; c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#b7bdbb';
      c.fillRect(0, 0, 128, 128); c.fillRect(128, 128, 128, 128);
      c.strokeStyle = 'rgba(120,125,120,.55)'; c.lineWidth = 3;
      c.strokeRect(0, 0, 128, 128); c.strokeRect(128, 128, 128, 128);
      c.strokeRect(128, 0, 128, 128); c.strokeRect(0, 128, 128, 128);
      for (let i = 0; i < 700; i++) {
        c.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.05) + ')';
        c.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    });
  }

  function texTapis() {
    return canvasTex(128, 64, (c) => {
      c.fillStyle = '#31363f'; c.fillRect(0, 0, 128, 64);
      c.fillStyle = '#3c424d';
      for (let x = 0; x < 128; x += 16) c.fillRect(x, 0, 8, 64);
      c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 0, 128, 6);
    });
  }

  function texArticle(emoji, couleur) {
    return canvasTex(96, 96, (c) => {
      c.fillStyle = couleur; c.fillRect(0, 0, 96, 96);
      c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(6, 58, 84, 30);
      c.font = '46px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(emoji, 48, 34);
      // code-barres
      c.fillStyle = '#222';
      for (let x = 12; x < 84; x += 4) c.fillRect(x, 64, Math.random() > .5 ? 2 : 1, 18);
    });
  }

  function texEcran(txt, fond, encre) {
    return canvasTex(128, 64, (c) => {
      c.fillStyle = fond; c.fillRect(0, 0, 128, 64);
      c.fillStyle = encre; c.font = 'bold 30px monospace';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(txt, 64, 34);
    });
  }

  function majEcran(tex, txt, fond, encre) {
    const c = tex.__canvas, ctx = c.getContext('2d');
    ctx.fillStyle = fond; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = encre;
    ctx.font = 'bold ' + (txt.length > 8 ? 20 : 28) + 'px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, c.width / 2, c.height / 2 + 2);
    tex.needsUpdate = true;
  }

  /* étiquette volante « ARTICLE SCANNÉ / 2,99 € » */
  function etiquette(texte, prix, position, couleur) {
    const tex = canvasTex(256, 128, (c) => {
      c.fillStyle = 'rgba(16,20,28,.86)';
      c.beginPath(); c.roundRect ? c.roundRect(4, 4, 248, 120, 16) : c.rect(4, 4, 248, 120); c.fill();
      c.strokeStyle = couleur || '#ffcb2b'; c.lineWidth = 5; c.stroke();
      c.fillStyle = '#fff'; c.font = 'bold 26px sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(texte, 128, 44);
      if (prix) {
        c.fillStyle = couleur || '#ffcb2b'; c.font = 'bold 40px sans-serif';
        c.fillText(prix, 128, 90);
      }
    });
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(0.42, 0.21, 1);
    sp.position.copy(position);
    sp.renderOrder = 10;
    scene.add(sp);
    const y0 = position.y;
    anim(1.5, (p) => {
      sp.position.y = y0 + p * 0.3;
      sp.material.opacity = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    }, () => { scene.remove(sp); tex.dispose(); sp.material.dispose(); });
    return sp;
  }

  /* ============================================================
     Personnages
     ============================================================ */
  const PEAUX = { '#f6d8bb': 1, '#efc49d': 1 };

  function creerPersonnage(cfg, opts) {
    cfg = cfg || {};
    opts = opts || {};
    const g = new T.Group();
    const peau = new T.Color(cfg.peau || '#f0c9a4');
    const vet = new T.Color(cfg.vetement || '#4a6fa5');
    const chev = new T.Color(cfg.couleur || '#3b2b20');
    const ech = opts.echelle || 1;

    // jambes
    const jambeMat = mat(0x38404f);
    [-0.09, 0.09].forEach(x => {
      const j = new T.Mesh(new T.CylinderGeometry(0.075, 0.065, 0.8, 8), jambeMat);
      place(j, x, 0.4, 0); g.add(j);
    });
    // chaussures
    [-0.09, 0.09].forEach(x => g.add(place(boite(0.13, 0.07, 0.24, 0x2a2a2a), x, 0.035, 0.05)));

    // torse
    const torse = new T.Mesh(new T.CylinderGeometry(0.235, 0.205, 0.56, 16), mat(vet));
    place(torse, 0, 1.06, 0);
    torse.scale.set(1, 1, 0.78);
    const epaules = new T.Mesh(new T.SphereGeometry(0.235, 16, 10), mat(vet));
    epaules.position.y = 0.26; epaules.scale.set(1, 0.6, 1);
    torse.add(epaules);
    const bassin = new T.Mesh(new T.SphereGeometry(0.205, 14, 10), mat(vet));
    bassin.position.y = -0.26; bassin.scale.set(1, 0.6, 1);
    torse.add(bassin);
    g.add(torse);

    // bras (pivot à l'épaule)
    function bras(sens) {
      const pivot = new T.Group();
      pivot.position.set(sens * 0.27, 1.26, 0);
      const membre = new T.Mesh(new T.CylinderGeometry(0.055, 0.048, 0.44, 8), mat(vet));
      membre.position.y = -0.22;
      pivot.add(membre);
      const main = new T.Mesh(new T.SphereGeometry(0.062, 10, 8), mat(peau));
      main.position.y = -0.45;
      pivot.add(main);
      pivot.userData.main = main;
      pivot.rotation.z = -sens * 0.12;
      g.add(pivot);
      return pivot;
    }
    const brasG = bras(-1), brasD = bras(1);

    // cou + tête
    g.add(place(new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 0.1, 8), mat(peau)), 0, 1.42, 0));
    const tete = new T.Group();
    tete.position.set(0, 1.58, 0);
    const crane = new T.Mesh(new T.SphereGeometry(0.135, 20, 16), mat(peau));
    crane.scale.set(1, 1.12, 0.96);
    tete.add(crane);

    // oreilles
    [-1, 1].forEach(s => {
      const o = new T.Mesh(new T.SphereGeometry(0.035, 8, 6), mat(peau));
      o.position.set(s * 0.13, 0, -0.005); o.scale.set(0.6, 1, 0.6);
      tete.add(o);
    });

    // cheveux
    const styl = cfg.cheveux || 'court';
    if (styl !== 'chauve') {
      if (styl === 'casquette') {
        // la visière s'arrête au-dessus des sourcils : le visage reste visible
        const cap = new T.Mesh(new T.SphereGeometry(0.145, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.34), mat(chev));
        cap.position.y = 0.02; tete.add(cap);
        tete.add(place(boite(0.21, 0.02, 0.15, chev), 0, 0.055, 0.13));
      } else {
        // calotte ouverte sur l'avant (sinon elle recouvrirait le visage)
        // + une frange qui s'arrête au-dessus des sourcils
        const ch = new T.Mesh(
          new T.SphereGeometry(0.144, 22, 14, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24, 0, Math.PI * 0.62), mat(chev));
        ch.position.y = 0.012; ch.scale.set(1, 1.1, 1);
        tete.add(ch);
        const frange = new T.Mesh(
          new T.SphereGeometry(0.1465, 16, 10, Math.PI / 2 - 0.72, 1.44, 0, Math.PI * 0.3), mat(chev));
        frange.position.y = 0.012; frange.scale.set(1, 1.1, 1);
        tete.add(frange);
        if (styl === 'chignon') {
          const b = new T.Mesh(new T.SphereGeometry(0.075, 12, 10), mat(chev));
          b.position.set(0, 0.13, -0.11); tete.add(b);
        }
        if (styl === 'long') {
          const l = boite(0.26, 0.34, 0.14, chev);
          l.position.set(0, -0.14, -0.06); tete.add(l);
        }
        if (styl === 'queue') {
          const q = new T.Mesh(new T.CylinderGeometry(0.045, 0.03, 0.22, 8), mat(chev));
          q.position.set(0, -0.06, -0.15); q.rotation.x = -0.4; tete.add(q);
        }
      }
    }
    if (cfg.barbe) {
      const b = new T.Mesh(new T.SphereGeometry(0.128, 14, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), mat(chev));
      b.position.set(0, -0.012, 0.012); b.scale.set(1, 1.15, 1.02);
      tete.add(b);
    }

    // visage : texture dessinée (mêmes expressions que la version 2D)
    const texVisage = new T.CanvasTexture(Visages.canvasFace(cfg, 'neutre', 256));
    const visage = new T.Mesh(
      // calotte sphérique légèrement plus grande que le crâne : le visage
      // se pose sur la tête au lieu d'être noyé dedans
      new T.SphereGeometry(0.1405, 24, 20, Math.PI / 2 - 0.66, 1.32, Math.PI / 2 - 0.62, 1.24),
      new T.MeshBasicMaterial({ map: texVisage, transparent: true, depthWrite: false })
    );
    visage.scale.set(1, 1.12, 0.96);
    visage.renderOrder = 4;
    tete.add(visage);
    g.add(tete);

    // ombre de contact
    const ombre = new T.Mesh(
      new T.CircleGeometry(0.3, 16),
      new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })
    );
    ombre.rotation.x = -Math.PI / 2; ombre.position.y = 0.012;
    g.add(ombre);

    g.scale.setScalar(ech);
    g.userData = {
      cfg: cfg, tete: tete, visage: visage, texVisage: texVisage, torse: torse,
      brasG: brasG, brasD: brasD, humeur: 'neutre',
      phase: Math.random() * 6.28, objetMain: null, occupe: false
    };
    return g;
  }

  function humeurPersonnage(p, humeur) {
    if (!p || !p.userData || p.userData.humeur === humeur) return;
    p.userData.humeur = humeur;
    const c = Visages.canvasFace(p.userData.cfg, humeur, 256);
    p.userData.texVisage.image = c;
    p.userData.texVisage.needsUpdate = true;
  }

  /* objet tenu dans la main d'un personnage (portefeuille, carte, sac) */
  function objetDansMain(p, type) {
    const u = p.userData;
    if (u.objetMain) { u.brasD.remove(u.objetMain); u.objetMain = null; }
    if (!type) return;
    let m;
    if (type === 'portefeuille') m = boite(0.11, 0.09, 0.03, 0x6b4226);
    else if (type === 'carte') m = boite(0.085, 0.055, 0.004, 0x2f6fd0);
    else if (type === 'sac') { m = boite(0.22, 0.28, 0.12, 0xdadfe4, { transparent: true, opacity: 0.85 }); }
    else if (type === 'ticket') m = boite(0.07, 0.11, 0.002, 0xfdfbf2);
    else if (type === 'telephone') m = boite(0.05, 0.1, 0.012, 0x22252c);
    if (!m) return;
    m.position.set(0, type === 'sac' ? -0.6 : -0.48, 0.04);
    u.brasD.add(m);
    u.objetMain = m;
  }

  /* ============================================================
     Mains de la caissière (enfants de la caméra)
     ============================================================ */
  function creerMain(sens) {
    const g = new T.Group();
    const peau = 0xf3cba7, manche = 0x2f6fd0;

    // avant-bras : il part du bas de l'écran, comme dans un vrai jeu en vue subjective
    const bras = new T.Mesh(new T.CylinderGeometry(0.05, 0.045, 0.24, 10), mat(manche));
    bras.rotation.x = Math.PI / 2;
    bras.position.set(0, -0.025, 0.155);
    g.add(bras);
    const poignet = new T.Mesh(new T.SphereGeometry(0.045, 10, 8), mat(peau));
    poignet.position.set(0, -0.01, 0.05);
    g.add(poignet);

    // paume + doigts
    const paume = boite(0.1, 0.038, 0.115, peau);
    g.add(paume);
    for (let i = 0; i < 4; i++) {
      const d = boite(0.021, 0.026, 0.075, peau);
      d.position.set(-0.033 + i * 0.022, -0.002, -0.088);
      d.rotation.x = 0.12 + i * 0.02;
      g.add(d);
    }
    const pouce = boite(0.026, 0.028, 0.055, peau);
    pouce.position.set(sens * 0.056, -0.004, -0.028);
    pouce.rotation.y = sens * 0.55;
    g.add(pouce);

    g.rotation.x = -0.5;
    g.rotation.z = sens * 0.18;
    g.rotation.y = -sens * 0.12;
    return g;
  }

  // au repos, les mains encadrent le bas de l'écran ; elles montent en plein
  // champ quand la caissière attrape un article, rend un ticket ou de la monnaie
  const REPOS_D = new T.Vector3(0.40, -0.30, -0.56);
  const REPOS_G = new T.Vector3(-0.42, -0.315, -0.56);

  /* convertit une position monde en position locale caméra */
  const _v = new T.Vector3();
  function versCamera(pMonde) {
    _v.copy(pMonde);
    camera.updateMatrixWorld();
    return camera.worldToLocal(_v.clone());
  }

  /* ============================================================
     Construction du magasin
     ============================================================ */
  function construireMagasin() {
    scene.background = new T.Color(0xdfe7ee);
    scene.fog = new T.Fog(0xdfe7ee, 9, 26);

    // sol
    const solTex = texSol();
    solTex.wrapS = solTex.wrapT = T.RepeatWrapping;
    solTex.repeat.set(20, 20);
    const sol = new T.Mesh(new T.PlaneGeometry(44, 44), new T.MeshLambertMaterial({ map: solTex }));
    sol.rotation.x = -Math.PI / 2;
    scene.add(sol);

    // plafond + murs
    const plafond = new T.Mesh(new T.PlaneGeometry(44, 44), mat(0xdfe5ea));
    plafond.rotation.x = Math.PI / 2; plafond.position.y = 3.2;
    scene.add(plafond);
    const murF = place(boite(44, 3.2, 0.2, 0xcfd8de), 0, 1.6, -15);
    scene.add(murF);
    scene.add(place(boite(0.2, 3.2, 30, 0xcfd8de), -14, 1.6, -2));
    scene.add(place(boite(0.2, 3.2, 30, 0xcfd8de), 14, 1.6, -2));

    // enseigne du fond
    const ens = new T.Mesh(new T.PlaneGeometry(6, 1.1), new T.MeshBasicMaterial({
      map: canvasTex(512, 96, (c) => {
        c.fillStyle = '#e8453c'; c.fillRect(0, 0, 512, 96);
        c.fillStyle = '#fff'; c.font = 'bold 60px sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('SUPÉRETTE', 256, 52);
      })
    }));
    place(ens, 0, 2.5, -14.85);
    scene.add(ens);
    obj.enseigne = ens;

    // néons
    obj.tubes = [];
    for (let i = 0; i < 5; i++) {
      for (const x of [-6, 0, 6]) {
        const z = -1 - i * 3;
        const tube = new T.Mesh(new T.PlaneGeometry(4.4, 0.34),
          new T.MeshBasicMaterial({ color: 0xfffdf2 }));
        tube.rotation.x = Math.PI / 2;
        tube.position.set(x, 3.17, z);
        scene.add(tube);
        scene.add(place(boite(4.8, 0.12, 0.5, 0xbfc7cc), x, 3.25, z));
        obj.tubes.push(tube);
      }
    }

    // lumières
    scene.add(new T.AmbientLight(0xf1ece0, 0.46));
    const dir = new T.DirectionalLight(0xfff4dd, 0.34);
    dir.position.set(2, 8, 3);
    scene.add(dir);
    const p1 = new T.PointLight(0xfff6e0, 0.35, 12); p1.position.set(0, 2.9, -2); scene.add(p1);
    const p2 = new T.PointLight(0xe8f0ff, 0.28, 14); p2.position.set(-4, 2.9, -7); scene.add(p2);
    obj.lampeClignote = p2;
    obj.intensiteClignote = 0.28;

    construireCaisse();
    construireRayons();
    construireCaissesVoisines();
  }

  function construireCaisse() {
    const bois = 0xcbb894, gris = 0x7f8894;

    // plan de caisse principal (devant le joueur)
    const comptoir = place(boite(3.1, 0.92, 2.1, bois), 0, 0.46, -0.72);
    scene.add(comptoir);
    scene.add(place(boite(3.16, 0.06, 2.16, 0xd9cdb4), 0, 0.93, -0.72));

    // séparation côté client (bas du comptoir, côté opposé)
    scene.add(place(boite(3.1, 0.55, 0.08, 0xc8b99b), 0, 0.28, -1.72));

    // tapis roulant
    const tapisTex = texTapis();
    tapisTex.wrapS = tapisTex.wrapT = T.RepeatWrapping;
    tapisTex.repeat.set(5, 1);
    const tapis = new T.Mesh(new T.BoxGeometry(1.5, 0.03, 0.56),
      [mat(0x2a2f38), mat(0x2a2f38), new T.MeshLambertMaterial({ map: tapisTex }), mat(0x2a2f38), mat(0x2a2f38), mat(0x2a2f38)]);
    place(tapis, -0.86, 0.97, -1.02);
    scene.add(tapis);
    obj.tapis = tapis; obj.tapisTex = tapisTex;
    // rebords
    scene.add(place(boite(1.56, 0.06, 0.04, 0x9aa3ad), -0.86, 1.0, -1.32));
    scene.add(place(boite(1.56, 0.06, 0.04, 0x9aa3ad), -0.86, 1.0, -0.72));

    // scanner : plaque de verre encastrée + potence
    const plaque = new T.Mesh(new T.BoxGeometry(0.42, 0.04, 0.38), mat(0x1d2128));
    place(plaque, 0.12, 0.955, -0.98);
    plaque.userData.interactif = 'scanner';
    scene.add(plaque);
    obj.scanner = plaque;

    const vitre = new T.Mesh(new T.PlaneGeometry(0.34, 0.3),
      new T.MeshBasicMaterial({ color: 0x8b1f1f, transparent: true, opacity: 0.55 }));
    vitre.rotation.x = -Math.PI / 2;
    place(vitre, 0.12, 0.978, -0.98);
    scene.add(vitre);
    obj.laser = vitre;

    // balance / afficheur du scanner
    const socle = place(boite(0.2, 0.34, 0.14, 0x39404a), 0.12, 1.12, -1.22);
    scene.add(socle);
    obj.texScanner = texEcran('PRÊT', '#101812', '#7dff9b');
    const ecranS = new T.Mesh(new T.PlaneGeometry(0.17, 0.09), new T.MeshBasicMaterial({ map: obj.texScanner }));
    place(ecranS, 0.12, 1.2, -1.145);
    ecranS.rotation.x = -0.25;
    scene.add(ecranS);

    // caisse enregistreuse + tiroir
    const caisseCorps = place(boite(0.32, 0.21, 0.28, 0x50596a), -0.62, 1.03, -0.78);
    caisseCorps.userData.interactif = 'tiroir';
    scene.add(caisseCorps);
    obj.caisseCorps = caisseCorps;
    obj.texCaisse = texEcran('0,00', '#0d1014', '#ffd76a');
    const ecranC = new T.Mesh(new T.PlaneGeometry(0.17, 0.079), new T.MeshBasicMaterial({ map: obj.texCaisse }));
    place(ecranC, -0.62, 1.16, -0.82);
    ecranC.rotation.x = -0.35;
    scene.add(ecranC);
    const tiroir = place(boite(0.3, 0.11, 0.26, 0x3d4453), -0.62, 0.88, -0.78);
    scene.add(tiroir);
    obj.tiroir = tiroir;
    obj.tiroirZ = tiroir.position.z;

    // terminal de paiement, orienté vers le client
    const tpeG = new T.Group();
    tpeG.position.set(0.52, 1.04, -1.45);
    tpeG.rotation.x = -0.5;
    const corpsTpe = boite(0.15, 0.24, 0.045, 0x2b3038);
    corpsTpe.userData.interactif = 'tpe';
    tpeG.add(corpsTpe);
    obj.texTpe = texEcran('CB', '#12211a', '#8cff8c');
    const ecranT = new T.Mesh(new T.PlaneGeometry(0.115, 0.075), new T.MeshBasicMaterial({ map: obj.texTpe }));
    ecranT.position.set(0, 0.055, 0.025);
    tpeG.add(ecranT);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const t = boite(0.025, 0.018, 0.008, 0x596273);
      t.position.set(-0.035 + j * 0.035, -0.03 - i * 0.028, 0.025);
      tpeG.add(t);
    }
    scene.add(tpeG);
    obj.tpe = corpsTpe; obj.tpeGroupe = tpeG;

    // zone d'ensachage à droite
    scene.add(place(boite(0.7, 0.04, 0.5, 0xb9c1c9), 1.15, 0.96, -1.0));
    obj.zoneSac = new T.Vector3(1.15, 1.05, -1.0);

    // séparateur client
    const sep = place(boite(0.34, 0.03, 0.05, 0xe8453c), -1.35, 0.99, -1.02);
    scene.add(sep);

    // écran « caisse n° » suspendu
    obj.texNumero = texEcran('3', '#1b2a3a', '#ffffff');
    const pano = new T.Mesh(new T.PlaneGeometry(0.4, 0.4), new T.MeshBasicMaterial({ map: obj.texNumero }));
    place(pano, 0.1, 2.35, -1.9);
    scene.add(pano);
  }

  function construireRayons() {
    const geoProd = new T.BoxGeometry(0.22, 0.26, 0.18);
    const nb = 420;
    const produits = new T.InstancedMesh(geoProd, mat(0xffffff), nb);
    const dummy = new T.Object3D();
    const couleurs = [0xe8453c, 0xffcb2b, 0x2fb457, 0x2f80ed, 0xff8a3d, 0x8b5cf6, 0xf2f2f2, 0x37a06e];
    let n = 0;
    for (let r = 0; r < 4 && n < nb; r++) {
      const z = -6.5 - r * 2.6;
      for (const cote of [-1, 1]) {
        for (let etage = 0; etage < 4 && n < nb; etage++) {
          for (let i = 0; i < 14 && n < nb; i++) {
            dummy.position.set(cote * (2.2 + i * 0.26) * (0.9 + r * 0.02), 0.45 + etage * 0.55, z);
            dummy.rotation.y = (Math.random() - 0.5) * 0.2;
            dummy.updateMatrix();
            produits.setMatrixAt(n, dummy.matrix);
            produits.setColorAt(n, new T.Color(couleurs[(n + r) % couleurs.length]));
            n++;
          }
        }
      }
    }
    produits.instanceMatrix.needsUpdate = true;
    if (produits.instanceColor) produits.instanceColor.needsUpdate = true;
    scene.add(produits);

    // structures d'étagères
    for (let r = 0; r < 4; r++) {
      const z = -6.5 - r * 2.6;
      for (const cote of [-1, 1]) {
        for (let etage = 0; etage < 4; etage++) {
          scene.add(place(boite(4.2, 0.05, 0.6, 0xa7b0b8), cote * 4.2, 0.3 + etage * 0.55, z));
        }
        scene.add(place(boite(0.08, 2.3, 0.62, 0x8f989f), cote * 2.15, 1.15, z));
        scene.add(place(boite(0.08, 2.3, 0.62, 0x8f989f), cote * 6.25, 1.15, z));
      }
    }
  }

  function construireCaissesVoisines() {
    [-3.6, 3.6].forEach((x, i) => {
      scene.add(place(boite(2.6, 0.92, 1.4, 0xd9c9a8), x, 0.46, -1.0));
      scene.add(place(boite(2.66, 0.06, 1.46, 0xd9cdb4), x, 0.93, -1.0));
      scene.add(place(boite(1.2, 0.04, 0.5, 0x31363f), x - 0.5, 0.97, -1.0));
      // collègue
      const col = creerPersonnage(Visages.alea(), { echelle: 1 });
      col.position.set(x + 0.55, 0, -0.1);
      col.rotation.y = Math.PI;
      scene.add(col);
      obj['collegue' + i] = col;
      // un client à cette caisse
      const cl = creerPersonnage(Visages.alea(), {});
      cl.position.set(x - 0.2, 0, -2.1);
      scene.add(cl);
      obj['clientVoisin' + i] = cl;
    });
  }

  /* ============================================================
     Initialisation
     ============================================================ */
  function init(cvs) {
    canvas = cvs;
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(62, 1, 0.05, 60);
    camera.position.copy(cam.base);
    scene.add(camera);

    construireMagasin();

    mainD = creerMain(1); mainD.position.copy(REPOS_D);
    mainG = creerMain(-1); mainG.position.copy(REPOS_G);
    camera.add(mainD); camera.add(mainG);

    horloge = new T.Clock();
    redimensionner();
    window.addEventListener('resize', redimensionner);
    brancherPointeur();
    pret = true;
    boucle();
  }

  function redimensionner() {
    if (!renderer) return;
    const l = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(l, h, false);
    camera.aspect = l / h;
    camera.updateProjectionMatrix();
  }

  /* ============================================================
     Pointeur : regard et interactions
     ============================================================ */
  const souris = new T.Vector2(0, 0);      // position normalisée -1..1
  const rayon = new T.Raycaster();
  let glisse = false, dernier = null, bougeDepuisClic = 0, pointeurDansScene = false;

  function brancherPointeur() {
    canvas.addEventListener('pointerdown', (e) => {
      glisse = true; bougeDepuisClic = 0;
      dernier = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      souris.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      souris.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      pointeurDansScene = true;
      if (glisse && dernier) {
        const dx = e.clientX - dernier.x, dy = e.clientY - dernier.y;
        bougeDepuisClic += Math.abs(dx) + Math.abs(dy);
        cam.yawCible -= dx * 0.0042 * reglages.sensibilite;
        cam.pitchCible -= dy * 0.0032 * reglages.sensibilite;
        dernier = { x: e.clientX, y: e.clientY };
      }
    });
    const relache = (e) => {
      if (glisse && bougeDepuisClic < 9) clic();
      glisse = false; dernier = null;
      if (e && e.pointerType === 'touch') pointeurDansScene = false;
    };
    canvas.addEventListener('pointerup', relache);
    canvas.addEventListener('pointercancel', () => { glisse = false; dernier = null; });
    canvas.addEventListener('pointerleave', () => { pointeurDansScene = false; glisse = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function cibles() {
    const l = [];
    if (obj.scanner) l.push(obj.scanner);
    if (obj.tpe) l.push(obj.tpe);
    if (obj.caisseCorps) l.push(obj.caisseCorps);
    articles.forEach(a => l.push(a.mesh));
    if (client) l.push(client.userData.torse, client.userData.tete.children[0]);
    return l;
  }

  function viser() {
    if (!camera) return null;
    rayon.setFromCamera(souris, camera);
    const touches = rayon.intersectObjects(cibles(), false);
    if (!touches.length) return null;
    const m = touches[0].object;
    if (m.userData.interactif) return { nom: m.userData.interactif, point: touches[0].point };
    if (m.userData.article) return { nom: 'article', point: touches[0].point, article: m.userData.article };
    if (client && (m === client.userData.torse || m.parent === client.userData.tete)) return { nom: 'client', point: touches[0].point };
    return null;
  }

  function clic() {
    const c = viser();
    if (cbClic) cbClic(c ? c.nom : 'vide', c);
  }

  /* ============================================================
     Articles sur le tapis
     ============================================================ */
  const COULEURS_ART = [0xe8453c, 0xffcb2b, 0x2fb457, 0x2f80ed, 0xff8a3d, 0x8b5cf6, 0xf7f7f2, 0x37a06e];

  function poserArticles(liste) {
    viderArticles();
    liste.forEach((a, i) => {
      const tex = texArticle(a.emo, '#' + new T.Color(COULEURS_ART[i % COULEURS_ART.length]).getHexString());
      const m = new T.Mesh(
        new T.BoxGeometry(0.13, 0.15, 0.1),
        new T.MeshLambertMaterial({ map: tex })
      );
      const x = -1.45 + 0.17 * i;
      m.position.set(x, 1.06, -1.02 + (Math.random() - 0.5) * 0.12);
      m.rotation.y = (Math.random() - 0.5) * 0.5;
      m.userData.article = { prix: a.prix, emo: a.emo, index: i };
      m.visible = false;
      scene.add(m);
      const art = { mesh: m, prix: a.prix, emo: a.emo, tex: tex };
      articles.push(art);
      // le client pose les articles un par un
      anim(0.3, (p) => {
        m.visible = true;
        m.position.y = 1.45 - lissage(p) * 0.39;
        m.rotation.z = (1 - p) * 0.9;
      }, null);
      anims[anims.length - 1].t = -0.12 * i; // décalage
    });
    tapisRoule(true);
    setTimeout(() => tapisRoule(false), 900 + liste.length * 120);
  }

  function viderArticles() {
    articles.forEach(a => { scene.remove(a.mesh); a.mesh.geometry.dispose(); a.tex.dispose(); });
    articles = [];
  }

  /* la main attrape l'article, le passe devant le scanner, puis le pose */
  function scannerArticle(surBip, surFin) {
    const art = articles.shift();
    if (!art) { surFin && surFin(); return; }
    const m = art.mesh;
    const depart = m.position.clone();
    const posScan = new T.Vector3(0.12, 1.1, -0.98);
    const posSac = obj.zoneSac.clone().add(new T.Vector3((Math.random() - 0.5) * 0.3, 0.05, (Math.random() - 0.5) * 0.2));

    // le scanner s'allume immédiatement : le retour visuel suit le clic,
    // la main fait ensuite passer l'article au-dessus de la vitre
    flashScanner();
    etiquette('ARTICLE SCANNÉ', art.prix.toFixed(2).replace('.', ',') + ' €',
      new T.Vector3(0.12, 1.42, -1.0), '#ffcb2b');
    if (surBip) surBip(art);
    secousse(0.14);

    anim(0.8, (p) => {
      let cible;
      // la main se tourne vers le tapis pendant qu'elle se tend
      const tension = Math.sin(Math.min(1, p * 1.3) * Math.PI);
      mainD.rotation.x = -0.5 - tension * 0.5;
      mainD.rotation.z = 0.18 - tension * 0.3;
      if (p < 0.32) {                                  // la main va chercher l'article
        cible = depart.clone().lerp(depart, 1);
        const q = p / 0.32;
        mainD.position.copy(versCamera(depart.clone().add(new T.Vector3(0, 0.05, 0.06))).multiplyScalar(1).lerp(REPOS_D, 1 - lissage(q)));
        return;
      }
      if (p < 0.62) {                                  // passage devant le scanner
        const q = (p - 0.32) / 0.3;
        cible = depart.clone().lerp(posScan, lissage(q));
        cible.y += Math.sin(q * Math.PI) * 0.12;
        m.position.copy(cible);
        m.rotation.y += 0.12;
        mainD.position.copy(versCamera(cible.clone().add(new T.Vector3(0, 0.055, 0.07))));
        return;
      }
      const q = (p - 0.62) / 0.38;                     // dépose dans la zone d'ensachage
      cible = posScan.clone().lerp(posSac, lissage(q));
      cible.y += Math.sin(q * Math.PI) * 0.1;
      m.position.copy(cible);
      m.rotation.z += 0.06;
      mainD.position.copy(versCamera(cible.clone().add(new T.Vector3(0, 0.05, 0.07))).lerp(REPOS_D, q > 0.7 ? (q - 0.7) / 0.3 : 0));
    }, () => {
      mainD.position.copy(REPOS_D);
      mainD.rotation.set(-0.5, -0.12, 0.18);
      art.mesh.userData.article = null;
      anim(0.4, null, () => { scene.remove(m); m.geometry.dispose(); art.tex.dispose(); });
      if (surFin) surFin(articles.length);
    });
  }

  function flashScanner() {
    obj.laser.material.color.setHex(0xff3b3b);
    obj.laser.material.opacity = 1;
    majEcran(obj.texScanner, 'BIP !', '#101812', '#7dff9b');
    anim(0.35, (p) => { obj.laser.material.opacity = 1 - p * 0.45; },
      () => {
        obj.laser.material.color.setHex(0x8b1f1f);
        obj.laser.material.opacity = 0.55;
        majEcran(obj.texScanner, 'PRÊT', '#101812', '#7dff9b');
      });
  }

  /* ============================================================
     Animations des personnages
     ============================================================ */
  function animClient(nom) {
    if (!client) return;
    const c = client;              // le client peut quitter la caisse pendant l'animation
    const u = c.userData;
    switch (nom) {
      case 'soupir':
        anim(1.1, (p) => {
          const s = Math.sin(p * Math.PI);
          u.torse.scale.y = 1 + s * 0.07;
          u.tete.position.y = 1.58 + s * 0.035;
          u.tete.rotation.x = s * 0.22;
        }, () => { u.torse.scale.y = 1; u.tete.position.y = 1.58; u.tete.rotation.x = 0; });
        break;
      case 'montre':
        anim(1.6, (p) => {
          const s = Math.sin(Math.min(1, p * 1.4) * Math.PI);
          u.brasG.rotation.x = -s * 1.25;
          u.brasG.rotation.z = 0.12 + s * 0.5;
          u.tete.rotation.x = s * 0.4;
        }, () => { u.brasG.rotation.set(0, 0, 0.12); u.tete.rotation.x = 0; });
        break;
      case 'bras':   // croise les bras
        anim(2.6, (p) => {
          const s = p < 0.15 ? p / 0.15 : (p > 0.85 ? (1 - p) / 0.15 : 1);
          u.brasG.rotation.x = -s * 1.15; u.brasG.rotation.z = 0.12 + s * 0.75;
          u.brasD.rotation.x = -s * 1.15; u.brasD.rotation.z = -0.12 - s * 0.75;
        }, () => { u.brasG.rotation.set(0, 0, 0.12); u.brasD.rotation.set(0, 0, -0.12); });
        break;
      case 'regardeDerriere':
        anim(1.5, (p) => {
          const s = Math.sin(p * Math.PI);
          u.tete.rotation.y = s * 1.1;
          c.rotation.y = s * 0.35;
        }, () => { u.tete.rotation.y = 0; c.rotation.y = 0; });
        break;
      case 'secoue':
        anim(0.5, (p) => {
          c.position.x = c.userData.x0 + Math.sin(p * 36) * 0.035 * (1 - p);
          u.tete.rotation.z = Math.sin(p * 30) * 0.12 * (1 - p);
        }, () => { c.position.x = c.userData.x0; u.tete.rotation.z = 0; });
        break;
      case 'portefeuille':
        objetDansMain(c, 'portefeuille');
        anim(1.2, (p) => {
          const s = Math.sin(Math.min(1, p * 1.5) * Math.PI);
          u.brasD.rotation.x = -s * 0.85;
          u.tete.rotation.x = s * 0.3;
        }, () => { u.brasD.rotation.x = 0; u.tete.rotation.x = 0; });
        break;
      case 'carte':
        objetDansMain(c, 'carte');
        anim(1.8, (p) => {
          const s = p < 0.5 ? lissage(p * 2) : 1 - lissage((p - 0.5) * 2);
          u.brasD.rotation.x = -s * 1.35;
          u.brasD.rotation.z = -0.12 - s * 0.35;
          u.tete.rotation.x = s * 0.25;
        }, () => { u.brasD.rotation.set(0, 0, -0.12); u.tete.rotation.x = 0; objetDansMain(c, null); });
        break;
      case 'sac':
        objetDansMain(c, 'sac');
        break;
      case 'telephone':
        objetDansMain(c, 'telephone');
        u.brasD.rotation.x = -1.5; u.brasD.rotation.z = -0.65;
        break;
    }
  }

  /* ============================================================
     Arrivée / départ du client
     ============================================================ */
  const POSTE_CLIENT = new T.Vector3(-0.55, 0, -2.3);

  function nouveauClient(cfg) {
    if (client) { scene.remove(client); client = null; }
    client = creerPersonnage(cfg, {});
    client.position.set(POSTE_CLIENT.x - 2.6, 0, POSTE_CLIENT.z - 0.6);
    client.userData.x0 = POSTE_CLIENT.x;
    scene.add(client);
    const c = client;
    const dep = c.position.clone();
    anim(1.0, (p) => {
      const q = lissage(p);
      c.position.lerpVectors(dep, POSTE_CLIENT, q);
      c.position.y = Math.abs(Math.sin(p * 14)) * 0.035;
      c.rotation.y = (1 - q) * 0.8;
      // les bras balancent pendant la marche
      c.userData.brasG.rotation.x = Math.sin(p * 14) * 0.5 * (1 - q * 0.4);
      c.userData.brasD.rotation.x = -Math.sin(p * 14) * 0.5 * (1 - q * 0.4);
    }, () => {
      c.position.copy(POSTE_CLIENT);
      c.rotation.y = 0;
      c.userData.brasG.rotation.set(0, 0, 0.12);
      c.userData.brasD.rotation.set(0, 0, -0.12);
    });
    return c;
  }

  function clientPart() {
    if (!client) return;
    const c = client;
    client = null;
    objetDansMain(c, 'sac');
    const dep = c.position.clone();
    const fin = new T.Vector3(3.4, 0, -1.4);
    anim(1.5, (p) => {
      const q = lissage(p);
      c.position.lerpVectors(dep, fin, q);
      c.position.y = Math.abs(Math.sin(p * 16)) * 0.035;
      c.rotation.y = q * 1.4;
      c.userData.brasG.rotation.x = Math.sin(p * 16) * 0.55;
    }, () => { scene.remove(c); });
  }

  /* ============================================================
     File d'attente
     ============================================================ */
  function majFile(n, cfgs) {
    n = Math.min(n, 4);
    while (fileP.length > n) { const p = fileP.pop(); scene.remove(p); }
    while (fileP.length < n) {
      const p = creerPersonnage((cfgs && cfgs[fileP.length]) || Visages.alea(), {});
      const i = fileP.length;
      p.position.set(POSTE_CLIENT.x + (i % 2 ? 0.42 : -0.34) + (Math.random() - 0.5) * 0.2,
        0, POSTE_CLIENT.z - 1.0 - i * 0.92);
      p.userData.x0 = p.position.x;
      p.userData.phase = Math.random() * 6.28;
      humeurPersonnage(p, Math.random() < 0.5 ? 'blase' : 'desabuse');
      scene.add(p);
      fileP.push(p);
    }
    fileP.forEach((p, i) => { p.position.z = POSTE_CLIENT.z - 1.0 - i * 0.92; });
  }

  /* ============================================================
     Divers objets pilotés par le jeu
     ============================================================ */
  function tapisRoule(on) { tapisActif = !!on; }

  function scannerCasse(on) {
    obj.laser.material.color.setHex(on ? 0x444444 : 0x8b1f1f);
    majEcran(obj.texScanner, on ? 'ERREUR' : 'PRÊT', on ? '#2a1010' : '#101812', on ? '#ff8f8f' : '#7dff9b');
  }

  function ecranTpe(etat) {
    if (etat === 'ok') majEcran(obj.texTpe, 'OK', '#0f3d1a', '#9dff9d');
    else if (etat === 'ko') { majEcran(obj.texTpe, 'ERREUR', '#3d1010', '#ff9e9e'); secousse(0.2); }
    else majEcran(obj.texTpe, 'CB', '#12211a', '#8cff8c');
  }

  function majTotal(total) {
    majEcran(obj.texCaisse, total.toFixed(2).replace('.', ','), '#0d1014', '#ffd76a');
  }
  function majNumeroCaisse(n) {
    majEcran(obj.texNumero, 'N°' + n, '#1b2a3a', '#ffffff');
  }
  function majEnseigne(nom) {
    const c = obj.enseigne.material.map.__canvas, ctx = c.getContext('2d');
    ctx.fillStyle = '#e8453c'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (nom.length > 14 ? 42 : 58) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nom.toUpperCase(), c.width / 2, c.height / 2 + 4);
    obj.enseigne.material.map.needsUpdate = true;
  }

  function ouvrirTiroir() {
    const z0 = obj.tiroirZ;
    anim(0.9, (p) => {
      const s = p < 0.4 ? lissage(p / 0.4) : 1 - lissage((p - 0.4) / 0.6);
      obj.tiroir.position.z = z0 + s * 0.3;
    }, () => { obj.tiroir.position.z = z0; });
    // la main gauche va chercher la monnaie
    anim(1.0, (p) => {
      const s = Math.sin(p * Math.PI);
      mainG.position.copy(REPOS_G.clone().lerp(versCamera(new T.Vector3(0.72, 1.0, -0.55)), s));
    }, () => mainG.position.copy(REPOS_G));
  }

  function mainTicket() {
    const cible = new T.Vector3(-0.1, 1.15, -1.5);
    const ticket = boite(0.07, 0.1, 0.002, 0xfdfbf2);
    scene.add(ticket);
    anim(1.4, (p) => {
      const s = p < 0.5 ? lissage(p * 2) : 1 - lissage((p - 0.5) * 2);
      const pos = new T.Vector3(0.5, 1.05, -0.8).lerp(cible, s);
      mainD.position.copy(versCamera(pos));
      ticket.position.copy(pos).add(new T.Vector3(0, 0.02, -0.08));
      ticket.rotation.x = -0.4;
    }, () => { mainD.position.copy(REPOS_D); scene.remove(ticket); });
  }

  function responsable(afficher) {
    if (afficher) {
      if (responsableP) return;
      responsableP = creerPersonnage(
        { peau: '#e0b184', cheveux: 'court', couleur: '#3a3a3a', lunettes: true, vetement: '#2b3a55', barbe: true }, {});
      responsableP.position.set(1.62, 0, -1.95);
      responsableP.rotation.y = -0.75;
      responsableP.userData.x0 = 1.62;
      humeurPersonnage(responsableP, 'desabuse');
      scene.add(responsableP);
      const dep = responsableP.position.clone().add(new T.Vector3(1.8, 0, 1.0));
      responsableP.position.copy(dep);
      const arr = new T.Vector3(1.62, 0, -1.95);
      regarderVers(arr.x, arr.z, 0.65);   // on tourne la tête vers lui
      anim(0.9, (p) => { responsableP.position.lerpVectors(dep, arr, lissage(p)); }, null);
      // bras croisés : il observe
      const u = responsableP.userData;
      anim(6, (p) => {
        const s = Math.min(1, p * 6);
        u.brasG.rotation.x = -s * 1.1; u.brasG.rotation.z = 0.12 + s * 0.7;
        u.brasD.rotation.x = -s * 1.1; u.brasD.rotation.z = -0.12 - s * 0.7;
      }, null);
    } else if (responsableP) {
      const p0 = responsableP.position.clone();
      const rp = responsableP;
      responsableP = null;
      anim(0.9, (p) => { rp.position.lerpVectors(p0, p0.clone().add(new T.Vector3(1.8, 0, 1.2)), lissage(p)); },
        () => scene.remove(rp));
    }
  }

  /* mouvements de tête de la caissière : on est dans ses yeux */
  function animCamera(nom) {
    if (nom === 'soupir') {
      anim(1.0, (p) => {
        const s = Math.sin(p * Math.PI);
        cam.dPitch = -s * 0.16;      // la tête s'affaisse
        cam.dY = -s * 0.035;
      }, () => { cam.dPitch = 0; cam.dY = 0; });
    } else if (nom === 'yeux') {
      anim(0.9, (p) => {
        const s = p < 0.35 ? lissage(p / 0.35) : 1 - lissage((p - 0.35) / 0.65);
        cam.dPitch = s * 0.42;       // le regard part au plafond
        cam.dYaw = s * 0.08;
      }, () => { cam.dPitch = 0; cam.dYaw = 0; });
    } else if (nom === 'acquiesce') {
      anim(0.6, (p) => { cam.dPitch = -Math.sin(p * Math.PI * 2) * 0.09; }, () => { cam.dPitch = 0; });
    }
  }

  /* total affiché au-dessus de la caisse en fin de scan */
  function etiquetteTotal(total, n) {
    etiquette('TOTAL — ' + n + (n > 1 ? ' articles' : ' article'),
      total.toFixed(2).replace('.', ',') + ' €',
      new T.Vector3(0.72, 1.55, -0.72), '#7dff9b');
  }

  /* oriente le regard vers un point du magasin (sans forcer complètement) */
  function regarderVers(x, z, force) {
    const dx = x - cam.base.x, dz = z - cam.base.z;
    const vise = Math.atan2(-dx, -dz);
    cam.yawCible += (Math.max(-LIM.yaw, Math.min(LIM.yaw, vise)) - cam.yaw) * (force === undefined ? 0.6 : force);
  }

  function secousse(force) {
    if (!reglages.secousse) return;
    cam.secousse = Math.min(0.5, cam.secousse + force);
  }

  /* projection d'un point 3D vers l'écran (pour les libellés HTML) */
  const _p = new T.Vector3();
  function positionEcran(quoi) {
    if (!pret) return null;
    let p;
    if (quoi === 'client') {
      if (!client) return null;
      p = client.getWorldPosition(_p.clone()).add(new T.Vector3(0, 1.98, 0));
    } else if (quoi === 'scanner') p = obj.scanner.getWorldPosition(new T.Vector3());
    else if (quoi === 'tpe') p = obj.tpe.getWorldPosition(new T.Vector3());
    else if (quoi === 'tiroir') p = obj.caisseCorps.getWorldPosition(new T.Vector3());
    else if (quoi === 'article') {
      if (!articles.length) return null;
      p = articles[0].mesh.getWorldPosition(new T.Vector3());
    } else return null;
    const v = p.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * r.width,
      y: (-v.y * 0.5 + 0.5) * r.height,
      visible: v.z < 1 && Math.abs(v.x) < 0.96 && Math.abs(v.y) < 0.96
    };
  }

  /* ============================================================
     Boucle de rendu
     ============================================================ */
  function boucle() {
    requestAnimationFrame(boucle);
    if (!pret) return;
    const dt = Math.min(0.05, horloge.getDelta());
    const t = horloge.getElapsedTime();

    // --- regard : le pointeur oriente doucement la caméra (hors glissement)
    if (pointeurDansScene && !glisse) {
      const zm = 0.28; // zone morte centrale
      const nx = Math.abs(souris.x) > zm ? (souris.x - Math.sign(souris.x) * zm) / (1 - zm) : 0;
      const ny = Math.abs(souris.y) > zm ? (souris.y - Math.sign(souris.y) * zm) / (1 - zm) : 0;
      cam.yawCible += (-nx * 0.5 * reglages.sensibilite - cam.yaw) * dt * 1.6;
      cam.pitchCible += ((ny * 0.28 - 0.13) * reglages.sensibilite - cam.pitch) * dt * 1.4;
    }
    cam.yawCible = Math.max(-LIM.yaw, Math.min(LIM.yaw, cam.yawCible));
    cam.pitchCible = Math.max(LIM.pitchMin, Math.min(LIM.pitchMax, cam.pitchCible));

    const yawAvant = cam.yaw;
    cam.yaw += (cam.yawCible - cam.yaw) * Math.min(1, dt * 7);
    cam.pitch += (cam.pitchCible - cam.pitch) * Math.min(1, dt * 7);
    cam.vitesse = Math.abs(cam.yaw - yawAvant) / Math.max(0.001, dt);

    // secousse + respiration de la caméra
    let sx = 0, sy = 0;
    if (cam.secousse > 0.001) {
      sx = (Math.random() - 0.5) * cam.secousse * 0.06;
      sy = (Math.random() - 0.5) * cam.secousse * 0.06;
      cam.secousse *= Math.pow(0.02, dt);
    }
    camera.rotation.set(cam.pitch + sy + cam.dPitch, cam.yaw + sx + cam.dYaw, 0, 'YXZ');
    camera.position.copy(cam.base);
    camera.position.y += Math.sin(t * 1.3) * 0.006 + cam.dY;
    camera.position.x += Math.sin(t * 0.8) * 0.004;

    // flou de mouvement (approximation par filtre CSS)
    if (reglages.flou) {
      const f = Math.min(1.6, cam.vitesse * 0.9);
      canvas.style.filter = f > 0.08 ? 'blur(' + f.toFixed(2) + 'px)' : '';
    } else if (canvas.style.filter) canvas.style.filter = '';

    // tapis roulant
    if (tapisActif) obj.tapisTex.offset.x -= dt * 0.55;

    // néon qui clignote
    tubeFolie += dt;
    if (obj.tubes && obj.tubes.length) {
      const tb = obj.tubes[2];
      const clign = (Math.sin(tubeFolie * 9) > 0.93 || Math.sin(tubeFolie * 2.3) > 0.995) ? 0.35 : 1;
      tb.material.color.setScalar(clign);
      if (obj.lampeClignote) obj.lampeClignote.intensity = obj.intensiteClignote * clign;
    }

    // idle des personnages
    const tousPerso = fileP.concat(client ? [client] : [], responsableP ? [responsableP] : []);
    tousPerso.forEach((p) => {
      if (!p) return;
      const u = p.userData;
      u.phase += dt;
      p.position.y = Math.sin(u.phase * 1.1) * 0.006;
      u.torse.rotation.y = Math.sin(u.phase * 0.7) * 0.05;
      if (!u.occupe) u.tete.rotation.y += (Math.sin(u.phase * 0.5) * 0.12 - u.tete.rotation.y) * dt * 2;
    });
    // le client regarde la caissière dans les yeux
    if (client) {
      const u = client.userData;
      u.tete.rotation.y += (0 - u.tete.rotation.y) * dt * 3;
    }

    // mains : léger flottement au repos
    if (!mainD.userData.occupee) {
      mainD.position.x += (REPOS_D.x - mainD.position.x) * dt * 6;
      mainD.position.y += (REPOS_D.y + Math.sin(t * 1.5) * 0.006 - mainD.position.y) * dt * 6;
      mainD.position.z += (REPOS_D.z - mainD.position.z) * dt * 6;
    }
    mainG.position.y = REPOS_G.y + Math.sin(t * 1.2 + 1) * 0.005;

    // animations en cours
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      a.t += dt;
      if (a.t < 0) continue;
      const p = Math.min(1, a.t / a.duree);
      if (a.maj) a.maj(p);
      if (p >= 1) { anims.splice(i, 1); if (a.fin) a.fin(); }
    }

    // survol
    const v = viser();
    const nom = v ? v.nom : null;
    if (nom !== survolActuel) {
      survolActuel = nom;
      if (cbSurvol) cbSurvol(nom, v);
    }

    if (cbFrame) cbFrame();
    renderer.render(scene, camera);
  }

  /* ============================================================
     API publique
     ============================================================ */
  return {
    init, redimensionner,
    nouveauClient, clientPart, animClient,
    humeurClient: (h) => humeurPersonnage(client, h),
    poserArticles, scannerArticle, viderArticles,
    articlesRestants: () => articles.length,
    majFile, tapisRoule, scannerCasse, ecranTpe, majTotal, majNumeroCaisse, majEnseigne,
    ouvrirTiroir, mainTicket, responsable, secousse, etiquette, etiquetteTotal, animCamera, regarderVers,
    positionEcran, viser,
    surClic: (cb) => { cbClic = cb; },
    surSurvol: (cb) => { cbSurvol = cb; },
    surFrame: (cb) => { cbFrame = cb; },
    reglages: (r) => { Object.assign(reglages, r || {}); return reglages; },
    litReglages: () => reglages,
    interactifs: (i) => { interactifs = Object.assign(interactifs, i || {}); },
    litInteractifs: () => interactifs,
    pret: () => pret,
    camera: () => camera,
    positionClient: () => POSTE_CLIENT
  };
})();
