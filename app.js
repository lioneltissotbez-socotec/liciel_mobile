function go(screen) {
  store.ui.screen = screen;
  render();
}

function render() {
  // Active / désactive les écrans
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));

  const active = document.getElementById("screen-" + store.ui.screen);
  if (active) active.classList.add("active");

  // 🆕 Mise à jour footer selon contexte
  if (store.ui.screen === "start") {
    updateFooter('home'); // Page accueil : footer vide
  } else {
    updateFooter('mission'); // Mission ouverte : footer avec icônes
  }

  // Rendu spécifique par écran
  if (store.ui.screen === "pieces" && typeof renderPiecesScreen === "function") {
    renderPiecesScreen();
  }

  if (store.ui.screen === "photos" && typeof renderPhotosScreen === "function") {
    renderPhotosScreen();
  }

  if (store.ui.screen === "description" && typeof renderDescriptionScreen === "function") {
  renderDescriptionScreen();
}

  if (store.ui.screen === "settings" && typeof renderSettingsScreen === "function") {
    renderSettingsScreen();
  }

  // Titre
  const titles = {
    start: "Démarrage mission",
    pieces: "Pièces",
    photos: "Photos",
    description: "Description de la pièce",
    settings: "Paramètres Mission",
    resume: "Résumé de la mission",
  };

  document.getElementById("header-title").innerText =
    titles[store.ui.screen] || "";
}

async function startMission() {
  const numero = document.getElementById("input-dossier").value.trim();
  if (!numero) {
    alert("Numéro de dossier obligatoire");
    return;
  }

  let mission = await loadMission(numero);

  if (!mission) {
  mission = {
    numeroDossier: numero,
    dateCreation: new Date().toISOString(),
    derniereSauvegarde: null,

    pieces: [],
    zpsos: [],
    prelevements: [],
    photos: [],
    
    // 🆕 CONTEXTE (template utilisé)
    contexte: null,

    // 🔴 PARAMÉTRAGE MÉTIER PLOMB
    settings: {
      mode: "CREP", // valeur par défaut

      plomb: {
        crep: {
          autoBelowOne: true,
          randomMin: 0.05,
          randomMax: 0.95
        },
        avantTravaux: {
          autoUncertainty: true,
          uncertaintyRatio: 0.10
        }
      }
    },

    // 🆕 MODULES ACTIFS
    modules: {
      plombTravaux: false,
      amiante: false,
      gaz: false,
      electricite: false,
      mesurages: false,
      termites: false,
      dpe: false
    }
  };
  
  // 🆕 Appliquer le template si sélectionné
  const templateData = await getSelectedTemplate();
  if (templateData) {
    applyPiecesTemplate(mission, templateData);
  }
}


  store.mission = mission;
  ensureMissionSettings(store.mission);
  await saveMission();
  go("pieces");
}

async function renderMissionList() {
  const list = await listMissions();
  const c = document.getElementById("missions-list");
  c.innerHTML = "";

  list.forEach(m => {
    // Vérifier si une photo de présentation existe
    const hasPhoto = (m.photos || []).some(ph => ph.domaine === "mission");
    const photoClass = hasPhoto ? "has-photo" : "";
    
    // Récupérer les modules actifs
    const modules = m.modules || {};
    const moduleIcons = [];
    if (modules.plombTravaux) moduleIcons.push(`<img src="assets/icons/plomb.png" class="module-icon" title="Plomb" />`);
    if (modules.amiante) moduleIcons.push(`<img src="assets/icons/amiante.png" class="module-icon" title="Amiante" />`);
    if (modules.gaz) moduleIcons.push(`<img src="assets/icons/gaz.png" class="module-icon" title="Gaz" />`);
    if (modules.electricite) moduleIcons.push(`<img src="assets/icons/electicite.png" class="module-icon" title="Électricité" />`);
    if (modules.mesurages) moduleIcons.push(`<img src="assets/icons/mesurage.png" class="module-icon" title="Mesurages" />`);
    if (modules.termites) moduleIcons.push(`<img src="assets/icons/termites.png" class="module-icon" title="Termites" />`);
    if (modules.dpe) moduleIcons.push(`<img src="assets/icons/DPE.png" class="module-icon" title="DPE" />`);
    
    const moduleDisplay = moduleIcons.length > 0 
      ? `<div class="mission-modules">${moduleIcons.join("")}</div>` 
      : "";
    
    c.innerHTML += `
      <div class="mission-row">

        <!-- EXPORT -->
        <button
          class="secondary export"
          title="Exporter la mission"
          onclick="exportMissionByNumero('${m.numeroDossier}')">
          <img src="assets/icons/export.svg" class="action-icon" alt="Export" />
        </button>

        <!-- OUVRIR LA MISSION -->
        <button
          class="secondary main"
          onclick="resumeMission('${m.numeroDossier}')">
          <div class="mission-info">
            <div class="mission-numero">${m.numeroDossier}</div>
            ${moduleDisplay}
          </div>
        </button>

        <!-- ACTIONS -->
        <div class="mission-actions">

        
  <!-- Photo principale -->
  <button
    class="photo-btn ${photoClass}"
    title="${hasPhoto ? 'Photo de présentation (✓)' : 'Ajouter une photo de présentation'}"
    onclick="addMissionPhoto('${m.numeroDossier}')">
    <img src="assets/icons/photo.png" class="action-icon" alt="Photo" />
  </button>

  <!-- Éditer -->
  <button
    title="Éditer la mission"
    onclick="editMission('${m.numeroDossier}')">
    <img src="assets/icons/edit.svg" class="action-icon" alt="Éditer" />
  </button>

  <!-- Supprimer -->
  <button
    title="Supprimer la mission"
    onclick="deleteMission('${m.numeroDossier}')">
    <img src="assets/icons/delete.svg" class="action-icon" alt="Supprimer" />
  </button>

</div>


      </div>
    `;
  });
}


async function editMission(numero) {
  const mission = await loadMission(numero);
  if (!mission) return;
  
  // Initialiser les modules si nécessaire
  if (!mission.modules) {
    mission.modules = {
      plombTravaux: false,
      amiante: false,
      gaz: false,
      electricite: false,
      mesurages: false,
      termites: false,
      dpe: false
    };
  }
  
  // Récupérer la photo de présentation
  const presentationPhoto = (mission.photos || []).find(ph => ph.domaine === "mission");
  
  // Créer l'overlay
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  
  const content = document.createElement("div");
  content.className = "overlay-content mission-edit-modal";
  
  content.innerHTML = `
    <h3>Édition de la mission</h3>
    
    <label>Numéro de dossier</label>
    <input type="text" id="edit-numero" value="${mission.numeroDossier}" />
    
    ${presentationPhoto ? `
      <div class="mission-photo-section">
        <label>Photo de présentation</label>
        <div class="mission-photo-container">
          <img src="${URL.createObjectURL(presentationPhoto.blob)}" class="mission-photo-preview" />
          <div class="mission-photo-actions">
            <button class="icon-btn" onclick="replaceMissionPhotoInEdit('${numero}')" title="Remplacer la photo">
              🖊️
            </button>
            <button class="icon-btn danger" onclick="deleteMissionPhotoInEdit('${numero}')" title="Supprimer la photo">
              🗑️
            </button>
          </div>
        </div>
      </div>
    ` : `
      <div class="mission-photo-section">
        <label>Photo de présentation</label>
        <button class="secondary" onclick="addMissionPhotoInEdit('${numero}')" style="width: 100%;">
          📷 Ajouter une photo de présentation
        </button>
      </div>
    `}
    
    <h4 style="margin-top: 20px; margin-bottom: 10px;">Modules actifs</h4>
    <div class="module-checkboxes">
      <label class="checkbox-label">
        <input type="checkbox" id="module-plombTravaux" ${mission.modules.plombTravaux ? "checked" : ""} />
        <span>🔨 Plomb avant travaux</span>
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="module-amiante" ${mission.modules.amiante ? "checked" : ""} />
        <span>🧪 Amiante</span>
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="module-gaz" ${mission.modules.gaz ? "checked" : ""} />
        <span>🔥 Gaz</span>
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="module-electricite" ${mission.modules.electricite ? "checked" : ""} />
        <span>⚡ Électricité</span>
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="module-mesurages" ${mission.modules.mesurages ? "checked" : ""} />
        <span>📏 Mesurages</span>
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="module-termites" ${mission.modules.termites ? "checked" : ""} />
        <span>🐛 Termites</span>
      </label>
      
      <label class="checkbox-label">
        <input type="checkbox" id="module-dpe" ${mission.modules.dpe ? "checked" : ""} />
        <span>🏠 DPE</span>
      </label>
    </div>
    
    <button class="primary" onclick="saveMissionEdit('${numero}')">✅ Enregistrer</button>
    <button class="secondary" onclick="closeOverlay()">Annuler</button>
  `;
  
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

async function addMissionPhotoInEdit(numero) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    
    try {
      // Compression de la photo
      const { compressed, saved } = await PhotoCompressor.processPhoto(file);
      
      const mission = await loadMission(numero);
      if (!mission) return;
      
      mission.photos = mission.photos || [];
      
      // Utiliser la version compressée dans l'app
      mission.photos.push({
        id: crypto.randomUUID(),
        name: file.name,
        blob: compressed, // 🔥 Version compressée
        domaine: "mission",
        clefComposant: null,
        localisation: `Mission ${numero}`
      });
      
      mission.derniereSauvegarde = new Date().toISOString();
      const tx = db.transaction("missions", "readwrite");
      tx.objectStore("missions").put(mission);
      
      await new Promise(resolve => {
        tx.oncomplete = resolve;
      });
      
      // Message de confirmation
      if (saved) {
        console.log('✅ Photo ajoutée (photo compressée et sauvegardée)');
      }
      
      // Rafraîchir le modal
      closeOverlay();
      editMission(numero);
      
    } catch (error) {
      console.error('❌ Erreur ajout photo:', error);
      alert('Erreur lors de l\'ajout de la photo');
    }
  };
  
  input.click();
}

async function replaceMissionPhotoInEdit(numero) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    
    try {
      // Compression de la photo
      const { compressed, saved } = await PhotoCompressor.processPhoto(file);
      
      const mission = await loadMission(numero);
      if (!mission) return;
      
      // Trouver et remplacer la photo
      const photoIndex = mission.photos.findIndex(ph => ph.domaine === "mission");
      if (photoIndex !== -1) {
        mission.photos[photoIndex].name = file.name;
        mission.photos[photoIndex].blob = compressed; // 🔥 Version compressée
      }
      
      mission.derniereSauvegarde = new Date().toISOString();
      const tx = db.transaction("missions", "readwrite");
      tx.objectStore("missions").put(mission);
      
      await new Promise(resolve => {
        tx.oncomplete = resolve;
      });
      
      // Message de confirmation
      if (saved) {
        console.log('✅ Photo remplacée (photo compressée et sauvegardée)');
      }
      
      // Rafraîchir le modal
      closeOverlay();
      editMission(numero);
      
    } catch (error) {
      console.error('❌ Erreur remplacement photo:', error);
      alert('Erreur lors du remplacement de la photo');
    }
  };
  
  input.click();
}

async function deleteMissionPhotoInEdit(numero) {
  if (!confirm("Supprimer la photo de présentation ?")) return;
  
  const mission = await loadMission(numero);
  if (!mission) return;
  
  // Supprimer la photo
  mission.photos = mission.photos.filter(ph => ph.domaine !== "mission");
  
  mission.derniereSauvegarde = new Date().toISOString();
  const tx = db.transaction("missions", "readwrite");
  tx.objectStore("missions").put(mission);
  
  await new Promise(resolve => {
    tx.oncomplete = resolve;
  });
  
  // Rafraîchir le modal et la liste
  closeOverlay();
  editMission(numero);
  renderMissionList();
}

async function saveMissionEdit(oldNumero) {
  const mission = await loadMission(oldNumero);
  if (!mission) return;
  
  // Récupérer le nouveau numéro
  const newNumero = document.getElementById("edit-numero").value.trim();
  if (!newNumero) {
    alert("Le numéro de dossier est obligatoire");
    return;
  }
  
  // Récupérer les modules cochés
  mission.modules = {
    plombTravaux: document.getElementById("module-plombTravaux").checked,
    amiante: document.getElementById("module-amiante").checked,
    gaz: document.getElementById("module-gaz").checked,
    electricite: document.getElementById("module-electricite").checked,
    mesurages: document.getElementById("module-mesurages").checked,
    termites: document.getElementById("module-termites").checked,
    dpe: document.getElementById("module-dpe").checked
  };
  
  // Si le numéro a changé, gérer le renommage
  if (newNumero !== oldNumero) {
    // Supprimer l'ancienne mission
    const txDelete = db.transaction("missions", "readwrite");
    txDelete.objectStore("missions").delete(oldNumero);
    await new Promise(resolve => {
      txDelete.oncomplete = resolve;
    });
    
    // Mettre à jour le numéro
    mission.numeroDossier = newNumero;
  }
  
  // Sauvegarder la mission (nouvelle ou mise à jour)
  mission.derniereSauvegarde = new Date().toISOString();
  const txSave = db.transaction("missions", "readwrite");
  txSave.objectStore("missions").put(mission);
  
  await new Promise(resolve => {
    txSave.oncomplete = resolve;
  });
  
  closeOverlay();
  renderMissionList();
}

function closeOverlay() {
  document.querySelector(".overlay")?.remove();
}

/**
 * Ouvre l'interface de gestion des archives
 */
async function openArchiveManager() {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  
  const content = document.createElement("div");
  content.className = "overlay-content archive-manager-modal";
  
  // Récupérer les statistiques
  const missions = await listMissions();
  const snapshots = await ArchiveManager.listSnapshots();
  
  // Calculer l'espace utilisé (approximatif)
  const estimatedSize = JSON.stringify(missions).length / 1024 / 1024;
  
  content.innerHTML = `
    <h3>⚙️ Gestion des données</h3>
    
    <div class="data-stats">
      <p><strong>📦 Missions actives :</strong> ${missions.length}</p>
      <p><strong>💾 Espace estimé :</strong> ${estimatedSize.toFixed(2)} MB</p>
      <p><strong>🔄 Auto-save :</strong> Toutes les 10 min (5 derniers conservés)</p>
    </div>
    
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
    
    <h4>Archives automatiques</h4>
    <div class="snapshots-list" id="snapshots-list">
      ${snapshots.length > 0 ? snapshots.map(snap => {
        const date = new Date(snap.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        return `
          <div class="snapshot-row">
            <div class="snapshot-info">
              <strong>${dateStr}</strong><br>
              <span>${snap.count} mission(s)</span>
            </div>
            <button class="secondary" onclick="restoreArchive(${snap.id})" style="width: auto; padding: 8px 16px; margin: 0;">
              Restaurer
            </button>
          </div>
        `;
      }).join('') : '<p style="opacity: 0.6;">Aucune archive disponible</p>'}
    </div>
    
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
    
    <h4>Actions manuelles</h4>
    <button class="primary" onclick="exportAllMissions()" style="margin-bottom: 8px;">
      📥 Exporter toutes les missions
    </button>
    <button class="secondary" onclick="importMissionsFile()" style="margin-bottom: 8px;">
      📤 Importer une archive
    </button>
    <button class="secondary" onclick="clearAllArchives()" style="margin-bottom: 8px; color: #dc2626;">
      🗑️ Nettoyer les archives auto
    </button>
    
    <button class="secondary" onclick="closeOverlay()" style="margin-top: 12px;">
      Fermer
    </button>
  `;
  
  overlay.appendChild(content);
  document.body.appendChild(overlay);
}

/**
 * Restaure une archive
 */
async function restoreArchive(snapshotId) {
  if (!confirm('Restaurer cette archive ? Les missions actuelles seront remplacées.')) {
    return;
  }
  
  const success = await ArchiveManager.restoreSnapshot(snapshotId);
  
  if (success) {
    alert('✅ Archive restaurée avec succès');
    closeOverlay();
    renderMissionList();
  } else {
    alert('❌ Erreur lors de la restauration');
  }
}

/**
 * Exporte toutes les missions
 */
async function exportAllMissions() {
  const success = await ArchiveManager.exportToFile();
  
  if (success) {
    alert('✅ Export téléchargé');
  } else {
    alert('❌ Erreur lors de l\'export');
  }
}

/**
 * Importe un fichier d'archives
 */
async function importMissionsFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    
    try {
      const result = await ArchiveManager.importFromFile(file);
      alert(`✅ Import terminé\n${result.imported} mission(s) importée(s)\n${result.skipped} mission(s) ignorée(s)`);
      closeOverlay();
      renderMissionList();
    } catch (error) {
      alert('❌ Erreur lors de l\'import: ' + error.message);
    }
  };
  
  input.click();
}

/**
 * Nettoie toutes les archives automatiques
 */
async function clearAllArchives() {
  if (!confirm('Supprimer toutes les archives automatiques ?')) {
    return;
  }
  
  const success = await ArchiveManager.clearAllSnapshots();
  
  if (success) {
    alert('✅ Archives supprimées');
    closeOverlay();
  } else {
    alert('❌ Erreur lors de la suppression');
  }
}


async function deleteMission(numero) {
  if (!confirm(`Supprimer définitivement la mission ${numero} ?`)) return;

  const tx = db.transaction("missions", "readwrite");
  tx.objectStore("missions").delete(numero);

  await renderMissionList();
}

function ensureMissionSettings(mission) {
  if (!mission.settings) {
    mission.settings = {
      mode: "CREP", // Défaut uniquement si settings n'existe pas
      plomb: {
        crep: {
          autoBelowOne: true,
          randomMin: 0.05,
          randomMax: 0.95
        },
        avantTravaux: {
          autoUncertainty: true,
          uncertaintyRatio: 0.10
        }
      }
    };
  } else {
    // S'assurer que les sous-objets existent sans écraser le mode
    if (!mission.settings.plomb) {
      mission.settings.plomb = {
        crep: {
          autoBelowOne: true,
          randomMin: 0.05,
          randomMax: 0.95
        },
        avantTravaux: {
          autoUncertainty: true,
          uncertaintyRatio: 0.10
        }
      };
    }
    // Garder le mode existant, ne pas le forcer
  }
}

async function resumeMission(numero) {
  store.mission = await loadMission(numero);
  ensureMissionSettings(store.mission);
  
  // 🆕 Recharger les dictionnaires selon le client de la mission
  if (store.mission.contexte?.listePieces) {
    console.log(`🔄 Rechargement dictionnaires (${store.mission.contexte.listePieces})...`);
    await loadDictionnaires();
    console.log('✅ Dictionnaires rechargés');
  }
  
  go("pieces");
}


async function init() {
  const progressFill = document.getElementById('progress-fill');
  const loadingStatus = document.getElementById('loading-status');
  const loadingBar = document.getElementById('loading-bar');
  const startContent = document.getElementById('start-content');
  
  try {
    // Étape 1: IndexedDB
    loadingStatus.textContent = 'Connexion à la base de données...';
    progressFill.style.width = '20%';
    await openDB();
    
    // Étape 2: Dictionnaires
    loadingStatus.textContent = 'Chargement des dictionnaires...';
    progressFill.style.width = '40%';
    await loadDictionnaires();
    
    // Étape 3: Dictionnaires description
    loadingStatus.textContent = 'Chargement des descriptions...';
    progressFill.style.width = '60%';
    await loadDictionnairesDescription();
    
    // Étape 4: Liste des missions
    loadingStatus.textContent = 'Chargement des missions...';
    progressFill.style.width = '80%';
    await renderMissionList();
    
    // Étape 5: Archivage auto (non bloquant)
    loadingStatus.textContent = 'Activation archivage automatique...';
    progressFill.style.width = '90%';
    
    try {
      if (window.ArchiveManager) {
        // Timeout de 2 secondes max
        await Promise.race([
          ArchiveManager.init(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);
        console.log('✅ Archivage activé');
      }
    } catch (error) {
      console.warn('⚠️ Archivage non disponible:', error.message);
      // L'app continue sans archivage automatique
    }
    
    // Étape 6: Finalisation
    loadingStatus.textContent = 'Prêt !';
    progressFill.style.width = '100%';
    progressFill.classList.add('complete');
    
    // Attendre un peu pour montrer la barre verte
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Masquer le loader, afficher le contenu
    loadingBar.style.display = 'none';
    startContent.style.display = 'block';
    
    render();
    
  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    loadingStatus.textContent = 'Erreur de chargement. Veuillez rafraîchir la page.';
    loadingStatus.style.color = '#dc2626';
    progressFill.style.background = '#dc2626';
  }
}

// =====================================================
// MODAL CRÉATION MISSION
// =====================================================

let missionCoverPhotoBlob = null;

function openNewMissionModal() {
  document.getElementById("new-mission-modal").style.display = "flex";
  missionCoverPhotoBlob = null;
  document.getElementById("modal-photo-preview").style.display = "none";
}

function closeNewMissionModal() {
  document.getElementById("new-mission-modal").style.display = "none";
  missionCoverPhotoBlob = null;
}

async function takeMissionCoverPhoto() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Compresser la photo
      const result = await PhotoCompressor.compressPhoto(file);
      missionCoverPhotoBlob = result.compressed;
      
      // Afficher preview
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById("modal-photo-img").src = e.target.result;
        document.getElementById("modal-photo-preview").style.display = "block";
      };
      reader.readAsDataURL(missionCoverPhotoBlob);
      
      console.log("✅ Photo de couverture prise");
    } catch (err) {
      console.error("❌ Erreur photo:", err);
      alert("Erreur lors de la prise de photo");
    }
  };
  
  input.click();
}

function toggleModalPlombOptions() {
  const checkbox = document.getElementById("modal-module-plomb");
  const options = document.getElementById("modal-plomb-options");
  options.style.display = checkbox.checked ? "flex" : "none";
}


init();
// 🔥 Autosave global (mobile-like)
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveMission();
  }
});

window.addEventListener("beforeunload", () => {
  saveMission();
});

async function exportMissionByNumero(numero) {
  const mission = await loadMission(numero);
  if (!mission) {
    alert("Mission introuvable");
    return;
  }
  exportMissionZIP(mission);
}

/**
 * Crée une nouvelle mission depuis la modal
 */
async function createNewMission() {
  const numero = document.getElementById("modal-input-dossier").value.trim();
  if (!numero) {
    alert("Numéro de dossier obligatoire");
    return;
  }

  // Vérifier si la mission existe déjà
  let mission = await loadMission(numero);

  if (mission) {
    alert(`La mission ${numero} existe déjà. Utilisez "Missions existantes" pour l'ouvrir.`);
    return;
  }

  // Créer nouvelle mission
  const typeBien = document.getElementById('modal-type-bien').value;
  const listePieces = document.getElementById('modal-liste-pieces').value;
  
  // 🆕 Récupérer le mode plomb sélectionné
  const plombChecked = document.getElementById('modal-module-plomb').checked;
  const plombModeRadio = document.querySelector('input[name="modal-plomb-mode"]:checked');
  const plombMode = plombChecked && plombModeRadio ? plombModeRadio.value : 'CREP';
  
  // 🆕 Récupérer les modules cochés
  const modules = {
    plomb: plombChecked,
    amiante: document.getElementById('modal-module-amiante').checked,
    gaz: document.getElementById('modal-module-gaz').checked,
    electricite: document.getElementById('modal-module-electricite').checked,
    dpe: document.getElementById('modal-module-dpe').checked,
    termites: document.getElementById('modal-module-termites').checked,
    mesurages: document.getElementById('modal-module-mesurages').checked
  };
  
  mission = {
    numeroDossier: numero,
    dateCreation: new Date().toISOString(),
    derniereSauvegarde: null,

    pieces: [],
    zpsos: [],
    prelevements: [],
    photos: [],
    
    // 🆕 Contexte avec client
    contexte: {
      typeBien: typeBien,
      listePieces: listePieces,
      templatesUtilises: false
    },

    settings: {
      mode: plombMode, // CREP ou AVANT_TRAVAUX selon sélection
      plomb: {
        crep: {
          autoBelowOne: true,
          randomMin: 0.05,
          randomMax: 0.95
        },
        avantTravaux: {
          autoUncertainty: true,
          uncertaintyRatio: 0.10
        }
      }
    },

    modules: modules,
    
    // 🆕 Photo de couverture
    coverPhoto: null
  };
  
  // 🆕 Ajouter la photo de couverture si elle existe
  if (missionCoverPhotoBlob) {
    const photoId = crypto.randomUUID();
    const reader = new FileReader();
    reader.onload = async () => {
      mission.coverPhoto = {
        id: photoId,
        data: reader.result,
        date: new Date().toISOString()
      };
      await saveMission();
      console.log('✅ Photo de couverture sauvegardée');
    };
    reader.readAsDataURL(missionCoverPhotoBlob);
  }
  
  // Appliquer le template si sélectionné
  const templateData = await getSelectedTemplateFromModal();
  if (templateData) {
    applyPiecesTemplate(mission, templateData);
    mission.contexte.templatesUtilises = true;
    mission.contexte.label = templateData.template.label;
    console.log(`✅ Mission créée avec template: ${mission.pieces.length} pièces`);
  } else {
    console.log('✅ Mission créée sans template');
  }

  store.mission = mission;
  ensureMissionSettings(store.mission);
  await saveMission();
  
  // 🆕 Recharger les dictionnaires selon le client sélectionné
  console.log(`🔄 Rechargement dictionnaires (${mission.contexte.listePieces})...`);
  await loadDictionnaires();
  console.log('✅ Dictionnaires rechargés');
  
  // Fermer la modal et aller aux pièces
  closeNewMissionModal();
  go("pieces");
}

window.createNewMission = createNewMission;
