/* ============================================================
   DÉMARRAGE — branchement des commandes (souris, tactile, clavier)
   ============================================================ */
(function () {

  function ecranTitre() {
    UI.overlayTitre(Jeu.charger(), (jour) => {
      Son.reveille();
      Son.ambianceOn();
      Son.ambianceMagasin(true);
      UI.fermerOverlay();
      Jeu.nouvellePartie(jour);
    }, () => UI.overlayAide(ecranTitre));
  }

  function majBoutonSon() {
    document.getElementById('btn-son').textContent = Son.estMuet() ? '🔇' : '🔊';
  }

  function ouvrirMenu() {
    UI.overlayMenu(
      () => UI.fermerOverlay(),
      () => { const E = Jeu.etat(); UI.fermerOverlay(); Jeu.nouvellePartie(E ? E.jour : 1); },
      () => { UI.fermerOverlay(); Jeu.stopTempos(); Son.ambianceMagasin(false); ecranTitre(); },
      () => UI.overlayAide(ouvrirMenu),
      () => UI.overlayReglages(ouvrirMenu)
    );
  }

  /* ---------- interactions dans la scène ---------- */
  function surClicScene(nom) {
    Son.reveille();
    const b = UI.etatBoutons();
    if (nom === 'scanner' || nom === 'article') {
      if (b.scanner) Jeu.scanner();
      else UI.toast('Rien à scanner pour le moment.', 'info');
    } else if (nom === 'tpe') {
      if (b.encaisser) Jeu.encaisser();
      else UI.toast("Le terminal attend que le client soit prêt.", 'info');
    } else if (nom === 'tiroir') {
      Son.tiroir();
      UI.tiroirOuvre();
    } else if (nom === 'client') {
      UI.rappelBulle();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.THREE) {
      document.body.innerHTML =
        '<p style="color:#fff;font:16px sans-serif;padding:24px">' +
        'Impossible de charger le moteur 3D (js/vendor/three.min.js).</p>';
      return;
    }

    UI.init();
    UI.chargerReglages();
    Scene3D.surClic(surClicScene);

    /* petites cruautés */
    document.getElementById('actions').addEventListener('click', (e) => {
      const b = e.target.closest('.act');
      if (!b || b.disabled) return;
      Son.reveille();
      Jeu.action(b.dataset.act);
    });

    /* boutons système */
    document.getElementById('btn-son').addEventListener('click', () => {
      Son.reveille();
      const muet = Son.basculerMuet();
      majBoutonSon();
      UI.toast(muet ? '🔇 Son coupé' : '🔊 Son activé', 'info');
    });
    majBoutonSon();
    document.getElementById('btn-menu').addEventListener('click', ouvrirMenu);
    document.getElementById('btn-reglages').addEventListener('click', () => UI.overlayReglages(() => UI.fermerOverlay()));

    /* clavier */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (UI.overlayOuvert()) UI.fermerOverlay(); else ouvrirMenu();
        return;
      }
      if (UI.overlayOuvert()) return;

      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) { if (UI.choisirParTouche(n)) return; }

      const b = UI.etatBoutons();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (b.scanner) Jeu.scanner();
        else if (b.encaisser) Jeu.encaisser();
        return;
      }
      const t = e.key.toLowerCase();
      if (t === 's') Jeu.action('soupir');
      else if (t === 'y') Jeu.action('yeux');
      else if (t === 'p') Jeu.action('pause');
      else if (t === 'c') Jeu.action('prix');
    });

    /* premier geste : déverrouille l'audio (obligatoire sur mobile) */
    const eveil = () => { Son.reveille(); document.body.removeEventListener('pointerdown', eveil); };
    document.body.addEventListener('pointerdown', eveil);

    /* pas de zoom par double-tap */
    let dernierTap = 0;
    document.addEventListener('touchend', (e) => {
      const t = Date.now();
      if (t - dernierTap < 300 && !e.target.closest('button')) e.preventDefault();
      dernierTap = t;
    }, { passive: false });

    ecranTitre();
  });
})();
