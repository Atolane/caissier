/* ============================================================
   Audio — tout est synthétisé en WebAudio (aucun fichier externe)
   ============================================================ */
const Son = (function () {
  let ctx = null, master = null, ambiance = null, muet = false, pret = false;

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

    /* musique d'ambiance de supermarché : petite boucle lounge */
    ambianceOn() {
      init();
      if (!pret || ambiance) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.055;
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
