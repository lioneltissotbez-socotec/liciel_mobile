// modules/settings/settings.ui.js
// Paramètres de la mission

console.log("✅ settings.ui.js chargé");

/**
 * Affiche l'écran paramètres mission
 */
function renderSettingsScreen() {
  const screen = document.getElementById("screen-settings");
  
  if (!store.mission) {
    screen.innerHTML = "<p>Aucune mission chargée</p>";
    return;
  }

  // Récupérer le mode actuel
  const modeCREP = store.mission.settings?.mode === "CREP";
  const modeAvantTravaux = store.mission.settings?.mode === "AVANT_TRAVAUX";

  screen.innerHTML = `
    <h2>⚙️ Paramètres Mission</h2>
    <p><strong>Dossier :</strong> ${store.mission.numeroDossier || "—"}</p>

    <div class="settings-section">
      <h3>Module Plomb</h3>
      <p class="small muted">Sélectionnez le mode de diagnostic plomb (un seul choix possible)</p>

      <div class="settings-options">
        <label class="settings-checkbox ${modeCREP ? 'active' : ''}">
          <input 
            type="checkbox" 
            id="setting-plomb-crep"
            ${modeCREP ? 'checked' : ''}
            onchange="togglePlombMode('CREP')">
          <div class="settings-label">
            <strong>Plomb CREP</strong>
            <span class="small">Constat de Risque d'Exposition au Plomb</span>
            <span class="small muted">2-3 mesures par localisation, règle déclenchante</span>
          </div>
        </label>

        <label class="settings-checkbox ${modeAvantTravaux ? 'active' : ''}">
          <input 
            type="checkbox" 
            id="setting-plomb-avant-travaux"
            ${modeAvantTravaux ? 'checked' : ''}
            onchange="togglePlombMode('AVANT_TRAVAUX')">
          <div class="settings-label">
            <strong>Plomb Avant Travaux</strong>
            <span class="small">Repérage avant travaux/démolition</span>
            <span class="small muted">1-2 mesures témoins, localisations par extension (PE)</span>
          </div>
        </label>
      </div>
    </div>

    <button class="secondary" onclick="go('pieces')">⬅ Retour aux pièces</button>
  `;
}

/**
 * Toggle mode plomb (exclusif)
 */
function togglePlombMode(mode) {
  if (!store.mission || !store.mission.settings) return;

  const crepCheckbox = document.getElementById('setting-plomb-crep');
  const avantTravauxCheckbox = document.getElementById('setting-plomb-avant-travaux');

  if (mode === 'CREP') {
    if (crepCheckbox.checked) {
      store.mission.settings.mode = "CREP";
      avantTravauxCheckbox.checked = false;
    } else {
      crepCheckbox.checked = true; // Empêcher de tout décocher
    }
  } else if (mode === 'AVANT_TRAVAUX') {
    if (avantTravauxCheckbox.checked) {
      store.mission.settings.mode = "AVANT_TRAVAUX";
      crepCheckbox.checked = false;
    } else {
      avantTravauxCheckbox.checked = true; // Empêcher de tout décocher
    }
  }

  saveMission();
  renderSettingsScreen();
  
  console.log(`✅ Mode plomb : ${store.mission.settings.mode}`);
}

// Exposer les fonctions
window.renderSettingsScreen = renderSettingsScreen;
window.togglePlombMode = togglePlombMode;
