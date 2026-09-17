/* ============================================================
   VISAGES — personnages cartoon dessinés en SVG
   Visages.dessine(config, humeur) -> chaîne SVG
   Humeurs : content, neutre, blase, desabuse, enerve, furieux,
             sarcastique, choque, triste, rire
   ============================================================ */
const Visages = (function () {

  function sourcils(h) {
    const cfg = {
      content:    { g: -8,  d: 8,  y: 40 },
      neutre:     { g: 0,   d: 0,  y: 40 },
      blase:      { g: 4,   d: -4, y: 38 },
      desabuse:   { g: 10,  d: -10, y: 37 },
      enerve:     { g: 22,  d: -22, y: 39 },
      furieux:    { g: 30,  d: -30, y: 38 },
      sarcastique:{ g: -18, d: 6,  y: 38 },
      choque:     { g: -14, d: 14, y: 33 },
      triste:     { g: -20, d: 20, y: 39 },
      rire:       { g: -10, d: 10, y: 38 }
    }[h] || { g: 0, d: 0, y: 40 };
    return `
      <g stroke="#2b1c10" stroke-width="3.4" stroke-linecap="round">
        <line x1="31" y1="${cfg.y}" x2="43" y2="${cfg.y}" transform="rotate(${cfg.g} 37 ${cfg.y})"/>
        <line x1="57" y1="${cfg.y}" x2="69" y2="${cfg.y}" transform="rotate(${cfg.d} 63 ${cfg.y})"/>
      </g>`;
  }

  function yeux(h) {
    if (h === 'blase' || h === 'desabuse') {
      // yeux mi-clos, pupilles en haut : le fameux regard désabusé
      return `
        <g>
          <ellipse cx="38" cy="49" rx="7.5" ry="6" fill="#fff" stroke="#2b1c10" stroke-width="2"/>
          <ellipse cx="62" cy="49" rx="7.5" ry="6" fill="#fff" stroke="#2b1c10" stroke-width="2"/>
          <circle cx="38" cy="46" r="3.1" fill="#2b1c10"/>
          <circle cx="62" cy="46" r="3.1" fill="#2b1c10"/>
          <path d="M30 47 Q38 42 46 47" fill="${h === 'desabuse' ? '#f0c9a4' : 'none'}" stroke="#2b1c10" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M54 47 Q62 42 70 47" fill="${h === 'desabuse' ? '#f0c9a4' : 'none'}" stroke="#2b1c10" stroke-width="2.6" stroke-linecap="round"/>
        </g>`;
    }
    if (h === 'rire') {
      return `<g fill="none" stroke="#2b1c10" stroke-width="3.2" stroke-linecap="round">
        <path d="M31 51 Q38 44 45 51"/><path d="M55 51 Q62 44 69 51"/></g>`;
    }
    if (h === 'content') {
      return `<g>
        <ellipse cx="38" cy="49" rx="7" ry="7.5" fill="#fff" stroke="#2b1c10" stroke-width="2"/>
        <ellipse cx="62" cy="49" rx="7" ry="7.5" fill="#fff" stroke="#2b1c10" stroke-width="2"/>
        <circle cx="38.5" cy="49" r="3.4" fill="#2b1c10"/><circle cx="62.5" cy="49" r="3.4" fill="#2b1c10"/>
        <circle cx="40" cy="47" r="1.2" fill="#fff"/><circle cx="64" cy="47" r="1.2" fill="#fff"/></g>`;
    }
    const grand = (h === 'choque') ? 1.45 : (h === 'furieux' ? 1.18 : 1);
    const rx = 7 * grand, ry = 7.5 * grand, pr = (h === 'choque' ? 2.2 : 3.3);
    const dx = (h === 'sarcastique') ? 2 : 0;
    return `<g>
      <ellipse cx="38" cy="49" rx="${rx}" ry="${ry}" fill="#fff" stroke="#2b1c10" stroke-width="2"/>
      <ellipse cx="62" cy="49" rx="${rx}" ry="${ry}" fill="#fff" stroke="#2b1c10" stroke-width="2"/>
      <circle cx="${38 + dx}" cy="49" r="${pr}" fill="#2b1c10"/>
      <circle cx="${62 + dx}" cy="49" r="${pr}" fill="#2b1c10"/>
    </g>`;
  }

  function bouche(h) {
    const b = {
      content:    '<path d="M38 66 Q50 78 62 66" fill="#8c3b3b" stroke="#2b1c10" stroke-width="2.6" stroke-linejoin="round"/>',
      neutre:     '<line x1="41" y1="69" x2="59" y2="69" stroke="#2b1c10" stroke-width="3.2" stroke-linecap="round"/>',
      blase:      '<path d="M40 70 Q50 67 60 70" fill="none" stroke="#2b1c10" stroke-width="3.2" stroke-linecap="round"/>',
      desabuse:   '<path d="M39 72 Q50 64 61 71" fill="none" stroke="#2b1c10" stroke-width="3.2" stroke-linecap="round"/>',
      enerve:     '<path d="M38 73 Q50 62 62 73" fill="none" stroke="#2b1c10" stroke-width="3.4" stroke-linecap="round"/>',
      furieux:    '<path d="M37 74 Q50 58 63 74 Q50 68 37 74Z" fill="#8c3b3b" stroke="#2b1c10" stroke-width="2.6"/>',
      sarcastique:'<path d="M38 70 Q50 66 62 62" fill="none" stroke="#2b1c10" stroke-width="3.2" stroke-linecap="round"/>',
      choque:     '<ellipse cx="50" cy="71" rx="7" ry="9" fill="#8c3b3b" stroke="#2b1c10" stroke-width="2.6"/>',
      triste:     '<path d="M40 73 Q50 65 60 73" fill="none" stroke="#2b1c10" stroke-width="3.2" stroke-linecap="round"/>',
      rire:       '<path d="M36 64 Q50 82 64 64 Z" fill="#8c3b3b" stroke="#2b1c10" stroke-width="2.6" stroke-linejoin="round"/><path d="M40 66 Q50 70 60 66" fill="#fff"/>'
    };
    return b[h] || b.neutre;
  }

  function cheveux(style, couleur) {
    switch (style) {
      case 'chignon':
        return `<circle cx="50" cy="12" r="11" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>
                <path d="M18 42 Q20 12 50 12 Q80 12 82 42 Q76 26 50 26 Q24 26 18 42Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>`;
      case 'court':
        return `<path d="M18 44 Q18 10 50 10 Q82 10 82 44 Q72 28 50 28 Q28 28 18 44Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>`;
      case 'long':
        return `<path d="M14 92 Q10 20 50 12 Q90 20 86 92 Q78 60 78 40 Q70 28 50 28 Q30 28 22 40 Q22 60 14 92Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>`;
      case 'queue':
        return `<path d="M18 42 Q20 10 50 10 Q80 10 82 42 Q74 28 50 28 Q26 28 18 42Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>
                <path d="M82 30 Q98 40 92 66 Q88 46 78 40Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>`;
      case 'gris':
        return `<path d="M18 44 Q16 14 50 12 Q84 14 82 44 Q74 30 50 30 Q26 30 18 44Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>
                <path d="M14 46 Q12 34 18 30" fill="none" stroke="${couleur}" stroke-width="5" stroke-linecap="round"/>
                <path d="M86 46 Q88 34 82 30" fill="none" stroke="${couleur}" stroke-width="5" stroke-linecap="round"/>`;
      case 'casquette':
        return `<path d="M16 38 Q18 8 50 8 Q82 8 84 38 L16 38Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>
                <path d="M10 38 L86 38 Q92 38 92 44 L14 44 Q10 44 10 38Z" fill="${couleur}" stroke="#2b1c10" stroke-width="3"/>`;
      case 'chauve':
        return `<path d="M22 36 Q28 22 50 22 Q72 22 78 36" fill="none" stroke="${couleur}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
      default:
        return '';
    }
  }

  function accessoire(a, humeur) {
    switch (a) {
      case 'telephone':
        return `<g transform="rotate(12 86 54)"><rect x="80" y="40" width="13" height="26" rx="3" fill="#2b2b38" stroke="#2b1c10" stroke-width="2.4"/>
                <rect x="82" y="43" width="9" height="19" rx="1.5" fill="#7fd2ff"/></g>`;
      case 'enfant':
        return `<g transform="translate(6 78) scale(.42)">
                  <circle cx="50" cy="50" r="30" fill="#f6d0ae" stroke="#2b1c10" stroke-width="5"/>
                  <path d="M20 40 Q22 16 50 16 Q78 16 80 40 Q70 28 50 28 Q30 28 20 40Z" fill="#c2733a" stroke="#2b1c10" stroke-width="5"/>
                  <circle cx="39" cy="50" r="5" fill="#2b1c10"/><circle cx="61" cy="50" r="5" fill="#2b1c10"/>
                  <path d="M34 66 Q50 82 66 66 Z" fill="#8c3b3b" stroke="#2b1c10" stroke-width="4"/>
                </g>`;
      case 'canne':
        return `<path d="M88 66 L88 112 M88 66 Q80 62 80 70" fill="none" stroke="#7a4a20" stroke-width="4.5" stroke-linecap="round"/>`;
      default:
        return '';
    }
  }

  function extras(h) {
    if (h === 'enerve' || h === 'furieux') {
      return `<g stroke="#e8453c" stroke-width="3" stroke-linecap="round" fill="none" opacity=".95">
        <path d="M76 24 l7 -7 M84 26 l7 -6 M78 32 l8 -3"/></g>`;
    }
    if (h === 'choque' || h === 'triste') {
      return `<path d="M76 46 q5 9 0 12 q-5 -3 0 -12Z" fill="#8fd3f4" stroke="#2b1c10" stroke-width="1.6"/>`;
    }
    if (h === 'sarcastique') {
      return `<path d="M72 60 q6 3 9 -2" fill="none" stroke="#2b1c10" stroke-width="2" opacity=".5"/>`;
    }
    return '';
  }

  function dessine(cfg, humeur) {
    cfg = cfg || {};
    const peau = cfg.peau || '#f0c9a4';
    const vet = cfg.vetement || '#4a6fa5';
    const h = humeur || 'neutre';
    const lunettes = cfg.lunettes
      ? `<g fill="none" stroke="#2b1c10" stroke-width="2.6">
           <circle cx="38" cy="49" r="11"/><circle cx="62" cy="49" r="11"/>
           <line x1="49" y1="49" x2="51" y2="49"/><line x1="27" y1="47" x2="20" y2="44"/><line x1="73" y1="47" x2="80" y2="44"/>
         </g>` : '';
    const barbe = cfg.barbe
      ? `<path d="M26 58 Q26 92 50 92 Q74 92 74 58 Q70 80 50 80 Q30 80 26 58Z" fill="${cfg.couleur || '#3b2b20'}" opacity=".85" stroke="#2b1c10" stroke-width="2"/>` : '';

    return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 88 Q14 92 8 120 L92 120 Q86 92 50 88Z" fill="${vet}" stroke="#2b1c10" stroke-width="3.4"/>
      <rect x="42" y="76" width="16" height="16" fill="${peau}" stroke="#2b1c10" stroke-width="3"/>
      <ellipse cx="50" cy="52" rx="32" ry="34" fill="${peau}" stroke="#2b1c10" stroke-width="3.4"/>
      <ellipse cx="20" cy="54" rx="5" ry="7" fill="${peau}" stroke="#2b1c10" stroke-width="3"/>
      <ellipse cx="80" cy="54" rx="5" ry="7" fill="${peau}" stroke="#2b1c10" stroke-width="3"/>
      ${barbe}
      ${cheveux(cfg.cheveux, cfg.couleur || '#3b2b20')}
      ${sourcils(h)}
      ${yeux(h)}
      ${lunettes}
      <path d="M50 54 q-3 8 2 9" fill="none" stroke="#2b1c10" stroke-width="2.4" stroke-linecap="round"/>
      ${bouche(h)}
      ${(h === 'enerve' || h === 'furieux') ? '<ellipse cx="26" cy="64" rx="7" ry="4.5" fill="#ff8f8f" opacity=".55"/><ellipse cx="74" cy="64" rx="7" ry="4.5" fill="#ff8f8f" opacity=".55"/>' : ''}
      ${extras(h)}
      ${accessoire(cfg.accessoire, h)}
    </svg>`;
  }

  /* petite tête simplifiée pour la file d'attente */
  function tete(cfg, humeur) {
    cfg = cfg || {};
    const peau = cfg.peau || '#f0c9a4';
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="55" rx="34" ry="36" fill="${peau}" stroke="#2b1c10" stroke-width="5"/>
      ${cheveux(cfg.cheveux, cfg.couleur || '#3b2b20')}
      ${sourcils(humeur || 'blase')}
      ${yeux(humeur || 'blase')}
      ${bouche(humeur || 'blase')}
    </svg>`;
  }

  /* configurations aléatoires pour les figurants de la file */
  const PEAUX = ['#f6d8bb', '#efc49d', '#e2b183', '#d9a978', '#c9915f', '#a9714a', '#8a5a37'];
  const CHEV = ['chignon', 'court', 'long', 'queue', 'casquette', 'gris', 'chauve'];
  const COUL = ['#2b2b2b', '#4b3a2b', '#7a5230', '#c26b2c', '#9b9b9b', '#d8d8d8', '#5a3a28'];
  const VET = ['#3d6fd6', '#37a06e', '#c94f4f', '#8b5cf6', '#e8a33d', '#3aa39a', '#b46bb0'];
  function alea() {
    const r = (a) => a[Math.floor(Math.random() * a.length)];
    return { peau: r(PEAUX), cheveux: r(CHEV), couleur: r(COUL), vetement: r(VET), lunettes: Math.random() < 0.35, barbe: Math.random() < 0.25 };
  }

  return { dessine, tete, alea };
})();

/* ============================================================
   VISAGES 3D — mêmes expressions, dessinées sur un canvas pour
   servir de texture au visage des personnages en vue FPS.
   ============================================================ */
Visages.canvasFace = (function () {

  const SOURCILS = {
    content:     { g: -8,  d: 8,  y: -46 },
    neutre:      { g: 0,   d: 0,  y: -46 },
    blase:       { g: 5,   d: -5, y: -50 },
    desabuse:    { g: 12,  d: -12, y: -52 },
    enerve:      { g: 24,  d: -24, y: -48 },
    furieux:     { g: 32,  d: -32, y: -50 },
    sarcastique: { g: -20, d: 7,  y: -50 },
    choque:      { g: -16, d: 16, y: -58 },
    triste:      { g: -22, d: 22, y: -48 },
    rire:        { g: -11, d: 11, y: -50 }
  };

  function trait(ctx, x1, y1, x2, y2, larg, couleur) {
    ctx.strokeStyle = couleur || '#2b1c10';
    ctx.lineWidth = larg;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function sourcils(ctx, cx, cy, h) {
    const c = SOURCILS[h] || SOURCILS.neutre;
    [[-1, c.g], [1, c.d]].forEach(([sens, angle]) => {
      const ox = cx + sens * 38, oy = cy + c.y;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(angle * Math.PI / 180 * (sens < 0 ? 1 : 1));
      trait(ctx, -20, 0, 20, 0, 9);
      ctx.restore();
    });
  }

  function oeil(ctx, x, y, h) {
    if (h === 'rire') { // yeux plissés de rire
      ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 20, y + 6); ctx.quadraticCurveTo(x, y - 14, x + 20, y + 6); ctx.stroke();
      return;
    }
    const grand = h === 'choque' ? 1.4 : (h === 'furieux' ? 1.15 : 1);
    const rx = 21 * grand, ry = 23 * grand;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // pupille : en haut pour le regard blasé/désabusé, décalée pour le sarcasme
    const haut = (h === 'blase' || h === 'desabuse');
    const px = x + (h === 'sarcastique' ? 7 : 0);
    const py = y + (haut ? -9 : 0);
    ctx.fillStyle = '#2b1c10';
    ctx.beginPath(); ctx.arc(px, py, h === 'choque' ? 6 : 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(px + 3, py - 4, 3, 0, Math.PI * 2); ctx.fill();
    if (haut) { // paupière tombante
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x - rx - 2, y - 4); ctx.quadraticCurveTo(x, y - ry - 6, x + rx + 2, y - 4); ctx.stroke();
    }
  }

  function bouche(ctx, cx, y, h) {
    ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = '#8c3b3b';
    ctx.beginPath();
    switch (h) {
      case 'content':
        ctx.moveTo(cx - 32, y - 8); ctx.quadraticCurveTo(cx, y + 30, cx + 32, y - 8); ctx.stroke(); break;
      case 'rire':
        ctx.moveTo(cx - 38, y - 14); ctx.quadraticCurveTo(cx, y + 42, cx + 38, y - 14); ctx.closePath();
        ctx.fill(); ctx.stroke(); break;
      case 'blase':
        ctx.moveTo(cx - 28, y + 4); ctx.quadraticCurveTo(cx, y - 4, cx + 28, y + 4); ctx.stroke(); break;
      case 'desabuse':
        ctx.moveTo(cx - 30, y + 8); ctx.quadraticCurveTo(cx, y - 14, cx + 30, y + 4); ctx.stroke(); break;
      case 'enerve':
        ctx.moveTo(cx - 32, y + 12); ctx.quadraticCurveTo(cx, y - 20, cx + 32, y + 12); ctx.stroke(); break;
      case 'furieux':
        ctx.moveTo(cx - 36, y + 14); ctx.quadraticCurveTo(cx, y - 26, cx + 36, y + 14);
        ctx.quadraticCurveTo(cx, y + 2, cx - 36, y + 14); ctx.fill(); ctx.stroke(); break;
      case 'sarcastique':
        ctx.moveTo(cx - 30, y + 6); ctx.quadraticCurveTo(cx, y - 2, cx + 32, y - 16); ctx.stroke(); break;
      case 'choque':
        ctx.ellipse(cx, y + 6, 17, 23, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
      case 'triste':
        ctx.moveTo(cx - 30, y + 12); ctx.quadraticCurveTo(cx, y - 10, cx + 30, y + 12); ctx.stroke(); break;
      default:
        trait(ctx, cx - 28, y + 2, cx + 28, y + 2, 8);
    }
  }

  /* dessine le visage (fond transparent) : sert de texture sur la tête 3D */
  function dessiner(cfg, humeur, taille) {
    cfg = cfg || {};
    const h = humeur || 'neutre';
    const T = taille || 256;
    const c = document.createElement('canvas');
    c.width = c.height = T;
    const ctx = c.getContext('2d');
    ctx.scale(T / 256, T / 256);
    const cx = 128, cy = 118;

    sourcils(ctx, cx, cy, h);
    oeil(ctx, cx - 38, cy, h);
    oeil(ctx, cx + 38, cy, h);

    // nez
    ctx.strokeStyle = 'rgba(43,28,16,.75)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy + 16); ctx.quadraticCurveTo(cx - 8, cy + 38, cx + 5, cy + 40); ctx.stroke();

    bouche(ctx, cx, cy + 68, h);

    if (cfg.lunettes) {
      ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 6;
      [-38, 38].forEach(dx => { ctx.beginPath(); ctx.arc(cx + dx, cy, 31, 0, Math.PI * 2); ctx.stroke(); });
      trait(ctx, cx - 7, cy, cx + 7, cy, 5);
      trait(ctx, cx - 69, cy - 4, cx - 88, cy - 12, 5);
      trait(ctx, cx + 69, cy - 4, cx + 88, cy - 12, 5);
    }
    if (h === 'enerve' || h === 'furieux') {
      ctx.fillStyle = 'rgba(255,120,120,.5)';
      [-72, 72].forEach(dx => { ctx.beginPath(); ctx.ellipse(cx + dx, cy + 40, 22, 13, 0, 0, Math.PI * 2); ctx.fill(); });
      ctx.strokeStyle = '#e8453c'; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx + 62, cy - 74); ctx.lineTo(cx + 84, cy - 92);
      ctx.moveTo(cx + 80, cy - 68); ctx.lineTo(cx + 100, cy - 84);
      ctx.stroke();
    }
    if (h === 'choque' || h === 'triste') { // goutte de sueur
      ctx.fillStyle = '#8fd3f4'; ctx.strokeStyle = '#2b1c10'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx + 74, cy - 18);
      ctx.quadraticCurveTo(cx + 86, cy + 6, cx + 74, cy + 10);
      ctx.quadraticCurveTo(cx + 62, cy + 6, cx + 74, cy - 18);
      ctx.fill(); ctx.stroke();
    }
    return c;
  }

  return dessiner;
})();
