/* ============================================================
   DÉMARRAGE ET BRANCHEMENTS
   ============================================================ */
(function () {
  function ecranTitre() {
    UI.overlayTitre(Jeu.charger(), (jour) => {
      Son.reveille();
      Son.ambianceOn();
      UI.fermerOverlay();
      Jeu.nouvellePartie(jour);
    }, () => UI.overlayAide(ecranTitre));
  }

  function majBoutonSon() {
    document.getElementById('btn-son').textContent = Son.estMuet() ? '🔇' : '🔊';
  }

  document.addEventListener('DOMContentLoaded', function () {
    UI.init();

    /* actions de la caissière */
    document.getElementById('actions').addEventListener('click', (e) => {
      const b = e.target.closest('.act');
      if (!b || b.disabled) return;
      Son.reveille();
      const a = b.dataset.act;
      if (a === 'scanner') Jeu.scanner();
      else if (a === 'encaisser') Jeu.encaisser();
      else Jeu.action(a);
    });

    /* son */
    document.getElementById('btn-son').addEventListener('click', () => {
      Son.reveille();
      const muet = Son.basculerMuet();
      majBoutonSon();
      UI.toast(muet ? '🔇 Son coupé' : '🔊 Son activé', 'info');
    });
    majBoutonSon();

    /* menu */
    document.getElementById('btn-menu').addEventListener('click', () => {
      UI.overlayMenu(
        () => UI.fermerOverlay(),
        () => { const E = Jeu.etat(); UI.fermerOverlay(); Jeu.nouvellePartie(E ? E.jour : 1); },
        () => { UI.fermerOverlay(); Jeu.stopTempos(); ecranTitre(); },
        () => UI.overlayAide(() => document.getElementById('btn-menu').click())
      );
    });

    /* raccourcis clavier (ordinateur) */
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('overlay').classList.contains('hidden')) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 5) {
        const b = document.querySelectorAll('#choix .choix-btn')[n - 1];
        if (b) { b.click(); return; }
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const sc = document.getElementById('act-scanner');
        const en = document.getElementById('act-encaisser');
        if (!sc.disabled) sc.click(); else if (!en.disabled) en.click();
      }
      if (e.key.toLowerCase() === 's') document.getElementById('act-soupir').click();
      if (e.key.toLowerCase() === 'y') document.getElementById('act-yeux').click();
    });

    /* premier geste = déverrouillage audio sur mobile */
    document.body.addEventListener('pointerdown', function once() {
      Son.reveille();
      document.body.removeEventListener('pointerdown', once);
    });

    /* empêche le zoom par double-tap sur mobile */
    let dernierTap = 0;
    document.addEventListener('touchend', (e) => {
      const t = Date.now();
      if (t - dernierTap < 300) e.preventDefault();
      dernierTap = t;
    }, { passive: false });

    ecranTitre();
  });
})();
