/* ============================================================
   Audio — tout est synthétisé en WebAudio (aucun fichier externe)
   ============================================================ */
const Son = (function () {
  let ctx = null, master = null, ambiance = null, muet = false, pret = false;
  let ambiantes = null, bourdon = null;

  /* annonces diffusées dans le magasin */
  const ANNONCES = [
    "Annonce : promotion sur les yaourts nature, rayon frais, allée 4.",
    "Monsieur Bernard est attendu à l'accueil. Monsieur Bernard, à l'accueil.",
    "Annonce : il reste trois caisses ouvertes. Enfin, deux. Enfin, une.",
    "Chers clients, le magasin fermera ses portes dans une heure trente.",
    "Nettoyage allée 7. Un incident avec des œufs. Encore.",
    "Annonce : nos équipes sont à votre écoute. Sauf en caisse 3.",
    "Perdu : un trousseau de clés à l'accueil. Et beaucoup de patience en caisse.",
    "Promotion flash : deux paquets de biscuits achetés, le troisième reste en rayon."
  ];

  try { muet = localStorage.getItem('caissiere_muet') === '1'; } catch (e) { muet = false; }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muet ? 0 : 0.5;
    master.connect(ctx.destination);
    pret = true;
  }

  function reveille() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function env(g, t, a, d, peak) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function ton(freq, dur, type, vol, delai, glide) {
    if (!pret || muet) return;
    const t = ctx.currentTime + (delai || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(40, glide), t + dur);
    env(g, t, 0.008, dur, vol || 0.25);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.08);
  }

  function bruit(dur, vol, filtreHz, type, delai) {
    if (!pret || muet) return;
    const t = ctx.currentTime + (delai || 0);
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = filtreHz || 1200;
    const g = ctx.createGain(); env(g, t, 0.01, dur, vol || 0.2);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* ---------- effets du jeu ---------- */
  const API = {
    reveille,
    bip() { ton(2050, 0.09, 'square', 0.16); ton(2600, 0.05, 'square', 0.07, 0.02); },
    bipRate() { ton(320, 0.28, 'sawtooth', 0.18, 0, 120); },
    tapis() { bruit(0.5, 0.06, 420); },
    tiroir() {
      ton(1200, 0.06, 'square', 0.14);
      bruit(0.22, 0.16, 2600, 'highpass', 0.05);
      ton(180, 0.22, 'triangle', 0.13, 0.06);
    },
    paiementOk() { ton(880, 0.1, 'sine', 0.2); ton(1320, 0.16, 'sine', 0.18, 0.1); },
    paiementKo() { ton(260, 0.18, 'square', 0.18); ton(180, 0.3, 'square', 0.18, 0.16); },
    soupir() { bruit(0.65, 0.16, 780, 'lowpass'); ton(300, 0.5, 'sine', 0.05, 0, 170); },
    clic() { ton(620, 0.04, 'triangle', 0.1); },
    gentil() { ton(660, 0.08, 'sine', 0.13); ton(990, 0.12, 'sine', 0.12, 0.07); },
    mechant() { ton(220, 0.12, 'sawtooth', 0.12); ton(160, 0.2, 'sawtooth', 0.12, 0.09); },
    diabolique() { ton(140, 0.3, 'sawtooth', 0.14, 0, 90); ton(280, 0.25, 'square', 0.07, 0.05); },
    murmure() { bruit(1.5, 0.05, 620); bruit(1.2, 0.035, 900, 'lowpass', 0.3); },
    colere() { ton(420, 0.2, 'sawtooth', 0.16, 0, 240); bruit(0.3, 0.1, 900); },
    responsable() { ton(300, 0.25, 'square', 0.16); ton(240, 0.25, 'square', 0.16, 0.22); ton(190, 0.45, 'square', 0.16, 0.44); },
    victoire() { [523, 659, 784, 1046].forEach((f, i) => ton(f, 0.22, 'triangle', 0.18, i * 0.13)); },
    defaite() { [392, 330, 262, 196].forEach((f, i) => ton(f, 0.3, 'sawtooth', 0.16, i * 0.17)); },
    rire() { [520, 430, 520, 430, 380].forEach((f, i) => ton(f, 0.09, 'triangle', 0.13, i * 0.1)); },
    pieces() { for (let i = 0; i < 6; i++) ton(1500 + Math.random() * 1400, 0.06, 'triangle', 0.08, i * 0.11); },

    /* ---------- ambiance du magasin (vue subjective) ---------- */
    caddie() {
      if (!pret || muet) return;
      bruit(0.9, 0.05, 1600, 'highpass');
      ton(90, 0.5, 'triangle', 0.04, 0, 70);
    },
    bipLointain() {
      const f = 1700 + Math.random() * 700;
      ton(f, 0.07, 'square', 0.028);
      ton(f * 1.25, 0.04, 'square', 0.015, 0.02);
    },
    brouhaha() {
      bruit(2.2, 0.028, 520);
      bruit(1.4, 0.018, 780, 'lowpass', 0.6);
    },
    carillon() {          // le « ding-dong » avant une annonce
      ton(784, 0.5, 'sine', 0.13);
      ton(587, 0.7, 'sine', 0.13, 0.35);
    },
    voixAnnonce(duree) {  // voix étouffée dans les haut-parleurs
      if (!pret || muet) return;
      const t0 = ctx.currentTime;
      for (let i = 0; i < duree * 7; i++) {
        const f = 180 + Math.random() * 160;
        ton(f, 0.1, 'sawtooth', 0.022, i * 0.14);
      }
    },

    /* boucle d'ambiance : bourdonnement, caddies, bips des autres caisses,
       brouhaha et annonces du magasin */
    ambianceMagasin(on) {
      init();
      if (!pret) return;
      if (!on) {
        if (ambiantes) { ambiantes.forEach(clearInterval); ambiantes = null; }
        if (bourdon) { try { bourdon.stop(); } catch (e) {} bourdon = null; }
        return;
      }
      if (ambiantes) return;
      // bourdonnement continu des néons et des frigos
      const src = ctx.createBufferSource();
      const n = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
      buf.loop = true;
      src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const g = ctx.createGain(); g.gain.value = 0.035;
      src.connect(f); f.connect(g); g.connect(master);
      src.start();
      bourdon = src;

      ambiantes = [
        setInterval(() => { if (Math.random() < 0.75) API.bipLointain(); }, 2600),
        setInterval(() => { if (Math.random() < 0.5) API.brouhaha(); }, 7000),
        setInterval(() => { if (Math.random() < 0.4) API.caddie(); }, 9000),
        setInterval(() => {
          if (Math.random() > 0.45) return;
          API.carillon();
          API.voixAnnonce(2.5);
          if (typeof UI !== 'undefined' && UI.annonce) {
            UI.annonce(ANNONCES[Math.floor(Math.random() * ANNONCES.length)]);
          }
        }, 26000)
      ];
    },

    /* musique d'ambiance de supermarché : petite boucle lounge */
    ambianceOn() {
      init();
      if (!pret || ambiance) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.038;
      gain.connect(master);
      const notes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88, 523.25];
      const basses = [130.81, 146.83, 164.81, 196.00];
      let pas = 0;
      const timer = setInterval(() => {
        if (muet || !ctx) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = notes[pas % notes.length];
        env(g, t, 0.05, 0.55, 0.3);
        o.connect(g); g.connect(gain); o.start(t); o.stop(t + 0.7);
        if (pas % 2 === 0) {
          const b = ctx.createOscillator(), bg = ctx.createGain();
          b.type = 'sine'; b.frequency.value = basses[(pas / 2) % basses.length];
          env(bg, t, 0.04, 0.8, 0.35);
          b.connect(bg); bg.connect(gain); b.start(t); b.stop(t + 1);
        }
        pas++;
      }, 520);
      ambiance = { timer, gain };
    },
    ambianceOff() {
      if (ambiance) { clearInterval(ambiance.timer); ambiance = null; }
      if (ambiantes) { ambiantes.forEach(clearInterval); ambiantes = null; }
      if (bourdon) { try { bourdon.stop(); } catch (e) {} bourdon = null; }
    },
    basculerMuet() {
      muet = !muet;
      init();
      if (master) master.gain.value = muet ? 0 : 0.5;
      try { localStorage.setItem('caissiere_muet', muet ? '1' : '0'); } catch (e) {}
      return muet;
    },
    estMuet() { return muet; }
  };
  return API;
})();
