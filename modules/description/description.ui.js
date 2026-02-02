console.log("✅ description.ui.js chargé");

function renderPlombSummary(ur) {
  if (!ur.plombByLoc || Object.keys(ur.plombByLoc).length === 0) return "";

  const entries = Object.entries(ur.plombByLoc)
    .map(([loc, v]) => {
      if (!v || !v.mesures || v.mesures.length === 0) return null;
      
      const mesuresStr = v.mesures.join(" | ");
      const declBadge = v.isDeclenchante ? " ⚠️" : "";
      const peBadge = v.isPE ? " (PE)" : "";
      
      return `${loc} : ${mesuresStr}${declBadge}${peBadge}${v.degradation ? " – " + v.degradation : ""}`;
    })
    .filter(Boolean);

  if (!entries.length) return "";

  return `
    <div class="plomb-summary warn">
      Plomb : ${entries.join(" | ")}
    </div>
  `;
}

function renderDescriptionScreen() {
  const screen = document.getElementById("screen-description");

  const pieceId = store.ui?.currentDescriptionPieceId;
  const piece = store.mission?.pieces.find(p => p.id === pieceId);

  if (!piece) {
    screen.innerHTML = "<p>Aucune pièce sélectionnée</p>";
    return;
  }

  piece.descriptions = piece.descriptions || [];
  
  // Initialiser modeCREP par défaut
  if (piece.modeCREP === undefined) {
    piece.modeCREP = true;
  }

  // 🆕 Migration V3 → V4 : mesure unique → mesures[]
  piece.descriptions.forEach(ur => {
    if (!ur.plombByLoc) return;
    
    Object.keys(ur.plombByLoc).forEach(loc => {
      const entry = ur.plombByLoc[loc];
      
      // Migration : mesure → mesures[]
      if (entry.mesure !== undefined && !Array.isArray(entry.mesures)) {
        entry.mesures = entry.mesure !== null && entry.mesure !== "" 
          ? [entry.mesure] 
          : [];
        delete entry.mesure;
      }
      
      // Initialiser si manquant
      if (!Array.isArray(entry.mesures)) {
        entry.mesures = [];
      }
      if (entry.isDeclenchante === undefined) {
        entry.isDeclenchante = false;
      }
      if (entry.observation === undefined) {
        entry.observation = "";
      }
      if (entry.isPE === undefined) {
        entry.isPE = false;
      }
    });
  });
  

  screen.innerHTML = `
    <h2>${piece.nom || "Pièce sans nom"}</h2>
    <p><strong>Bâtiment :</strong> ${piece.batiment || "-"}</p>
    
    <!-- Mode diagnostic plomb -->
    <div class="plomb-mode-selector">
      <label class="checkbox-label">
        <input type="checkbox" id="mode-crep" ${piece.modeCREP !== false ? 'checked' : ''} onchange="toggleModeCREP()">
        <span><strong>Mode CREP</strong> (règle 2-3 mesures par localisation)</span>
      </label>
      <div class="small muted" style="margin-top:4px">
        ${piece.modeCREP !== false 
          ? '✅ Actif : 2 mesures minimum, 3ème si une localisation ≥ 1 mg/cm²' 
          : '⚠️ Désactivé : Mode Plomb Avant Travaux (1 mesure par localisation)'}
      </div>
    </div>
    
    <!-- 🆕 Checkbox liste par défaut -->
    ${piece.descriptions.length === 0 ? `
    <div class="template-checkbox">
      <label class="checkbox-label">
        <input type="checkbox" id="use-default-descriptions" onchange="toggleDefaultDescriptions()">
        <span>📋 Pré-remplir avec la liste par défaut (Murs, Plinthes, Fenêtre, Porte, Plafond, Sol, Radiateur)</span>
      </label>
    </div>
    ` : ''}

    <button class="primary" onclick="addUR()">➕ Ajouter un élément</button>

    <div class="ur-list">
      ${
        piece.descriptions.length === 0
          ? "<p class='muted'>Aucun élément décrit</p>"
          : piece.descriptions.map(ur => `
              <div class="card ur-card">
                <div>
                  <strong>${ur.type}</strong>
– ${formatURLocalisation(ur)}
                </div>
                <div class="small">
  ${ur.substrat || "—"} / ${ur.revetement || "—"}
</div>

<div class="small">
  📷 ${ur.photos ? ur.photos.length : 0}
</div>

${renderPlombSummary(ur)}


                <div class="card-icons">
                  <span onclick="editUR('${ur.id}')">✏️</span>
                  <span onclick="deleteUR('${ur.id}')">🗑</span>
                </div>
              </div>
            `).join("")
      }
    </div>

    <button class="secondary" onclick="go('pieces')">⬅ Retour aux pièces</button>
  `;
}

function addUR() {
  const piece = getCurrentDescriptionPiece();
  if (!piece) return;

  piece.descriptions.push({
    id: crypto.randomUUID(),
    type: "mur",
    lettres: [],
    substrat: "",
    revetement: "",
    mesurable: true,
    photos: [], 
    plomb: null
  });

  saveMission();
  renderDescriptionScreen();
}

function deleteUR(urId) {
  const piece = getCurrentDescriptionPiece();
  if (!piece) return;

  if (!confirm("Supprimer cet élément ?")) return;

  piece.descriptions = piece.descriptions.filter(u => u.id !== urId);
  saveMission();
  renderDescriptionScreen();
}

function getCurrentDescriptionPiece() {
  const id = store.ui?.currentDescriptionPieceId;
  return store.mission?.pieces.find(p => p.id === id) || null;
}

function editUR(urId) {
  const piece = getCurrentDescriptionPiece();
  if (!piece) return;

  const ur = piece.descriptions.find(u => u.id === urId);
  if (!ur) return;

  store.ui.editingUR = urId;

  renderUREditForm(ur);
}

function renderUREditForm(ur) {
  // Migration automatique de la structure UR (utilise core/migrations.js)
  migrateURStructure(ur);
  saveMission();

  const screen = document.getElementById("screen-description");

  const lettres = ["A","B","C","D","E","F"];

  screen.innerHTML = `
    <h2>Élément – ${ur.type}</h2>

<label>Type d’élément</label>
<div class="input-row">
  <input
    value="${ur.type || ""}"
    oninput="urSetType(this.value)">
  <button class="icon" onclick="openDescList('types_elements')">📋</button>
</div>


    <label>Localisation</label>
<div class="letters">
  ${["A","B","C","D","E","F"].map(l => `
    <button
      class="${ur.localisation.items.includes(l) ? "active" : ""}"
      onclick="toggleLocalisationItem('${l}')">
      ${l}
    </button>
  `).join("")}

  <button class="add-btn" onclick="openLocalisationPlus()">+</button>
</div>

<div class="small muted">
  Sélection : ${ur.localisation.items.join(", ") || "—"}
</div>


    <label>Substrat</label>
<div class="input-row">
  <input
    value="${ur.substrat || ""}"
    oninput="urSetSubstrat(this.value)">
  <button class="icon" onclick="openDescList('substrats')">📋</button>
</div>

<label>Revêtement</label>
<div class="input-row">
  <input
    value="${ur.revetement || ""}"
    oninput="urSetRevetement(this.value)">
  <button class="icon" onclick="openDescList('revetements')">📋</button>
</div>

<h3>Mesures plomb (par localisation)</h3>

<div class="plomb-actions compact">
  <button onclick="plombApplyModeToAll('NM')">NM</button>
  <button onclick="plombApplyModeToAll('DASH')">-</button>
  <button onclick="plombApplyModeToAll('ZERO')">=0</button>
  <button onclick="plombApplyModeToAll('LT_03')">&lt;0,3</button>
  <button onclick="plombApplyModeToAll('LT_1')">&lt;1</button>
</div>

<div class="small muted" style="margin-top:6px">
  ${getCurrentDescriptionPiece().modeCREP 
    ? "Mode CREP : 2 mesures minimum par localisation" 
    : "Mode Avant Travaux : Cocher PE pour Par Extension"}
</div>

<div class="plomb-loc-list">
  ${
    (Array.isArray(ur.localisation?.items) ? ur.localisation.items : []).length === 0
      ? `<div class="plomb-empty muted">Aucune localisation sélectionnée</div>`
      : (ur.localisation.items).map(loc => {
          // Initialiser entry si manquant
          if (!ur.plombByLoc) ur.plombByLoc = {};
          if (!ur.plombByLoc[loc]) {
            ur.plombByLoc[loc] = { 
              mesures: [], 
              degradation: null, 
              photoId: null,
              isDeclenchante: false,
              observation: "",
              isPE: false
            };
          }
          
          const entry = ur.plombByLoc[loc];
          
          // Sécurité : forcer mesures en tableau
          if (!Array.isArray(entry.mesures)) {
            entry.mesures = [];
          }
          
          const degrVal = entry.degradation ?? "";
          const photoId = entry.photoId;
          const hasPhoto = photoId && store.mission.photos.find(p => p.id === photoId);
          const modeCREP = getCurrentDescriptionPiece().modeCREP;
          const isPE = entry.isPE || false;
          const observation = entry.observation || "";
          
          return `
            <div class="plomb-loc-row ${entry.isDeclenchante ? 'is-declenchante' : ''}">
              
              <!-- Header : Tag + PE + Badge -->
              <div class="plomb-loc-header">
                <div class="plomb-loc-tag">${loc}</div>
                
                ${!modeCREP ? `
                  <label class="checkbox-pe">
                    <input type="checkbox" 
                           ${isPE ? 'checked' : ''} 
                           onchange="togglePE('${loc.replace(/'/g, "\\'")}', this.checked)">
                    <span>PE</span>
                  </label>
                ` : ''}
                
                ${entry.isDeclenchante ? `
                  <span class="badge-declenchante">⚠️ Déclenchante</span>
                ` : ''}
              </div>
              
              <!-- Type UD -->
              <div class="plomb-loc-type">${ur.type || 'UD'}</div>

              <!-- Mesures compactes -->
              ${!isPE ? `
                <div class="plomb-mesures-grid">
                  ${entry.mesures && entry.mesures.length > 0 ? entry.mesures.map((m, idx) => `
                    <div class="mesure-cell">
                      <input
                        value="${m}"
                        onclick="openMesureKeypad('${loc.replace(/'/g, "\\'")}', ${idx})"
                        readonly
                        title="Mesure ${idx + 1}"
                      />
                    </div>
                  `).join('') : ''}
                  
                  ${!entry.isDeclenchante && Array.isArray(entry.mesures) ? `
                    <button class="btn-add-mesure" onclick="addMesureManuelle('${loc.replace(/'/g, "\\'")}')">+</button>
                  ` : ''}
                </div>
              ` : `
                <div class="muted small">— (Par Extension)</div>
              `}

              <!-- Dégradation + Observation en ligne -->
              <div class="plomb-loc-fields">
                ${!isPE ? `
                  <div>
                    <label>Dégradation</label>
                    <select
                      class="plomb-loc-select"
                      onchange="plombSetDegradationForLoc('${loc.replace(/'/g, "\\'")}', this.value)"
                    >
                      <option value="" ${degrVal==="" ? "selected" : ""}>—</option>
                      <option ${degrVal==="Non visible" ? "selected" : ""}>Non visible</option>
                      <option ${degrVal==="Non dégradé" ? "selected" : ""}>Non dégradé</option>
                      <option ${degrVal==="Etat d'usage" ? "selected" : ""}>Etat d'usage</option>
                      <option ${degrVal==="Dégradé" ? "selected" : ""}>Dégradé</option>
                    </select>
                  </div>
                ` : ''}
                
                <div>
                  <label>Observation</label>
                  <select
                    class="plomb-loc-select"
                    onchange="plombSetObservationForLoc('${loc.replace(/'/g, "\\'")}', this.value)"
                    ${isPE ? 'disabled' : ''}
                  >
                    <option value="" ${observation==="" ? "selected" : ""}>—</option>
                    <option ${observation==="Par Extension" ? "selected" : ""}>Par Extension</option>
                    <option ${observation==="Element récent" ? "selected" : ""}>Élément récent</option>
                    <option ${observation==="Hors d'atteinte >3m" ? "selected" : ""}>Hors d'atteinte >3m</option>
                    <option ${observation==="Saisie libre" ? "selected" : ""}>Saisie libre</option>
                  </select>
                </div>
              </div>
              
              ${isPE ? '<div class="muted small">Observation auto : Par Extension</div>' : ''}

              <!-- Photo -->
              ${!isPE ? `
                <button 
                  class="photo-btn-loc ${hasPhoto ? 'has-photo' : ''}" 
                  onclick="takeLocalisationPhoto('${loc.replace(/'/g, "\\'")}')">
                  📷 ${hasPhoto ? 'Photo ajoutée' : 'Ajouter photo'}
                </button>
              ` : ''}
            </div>
          `;
        }).join("")
  }
</div>

  </div>

</div>


    <button class="primary" onclick="renderDescriptionScreen()">✅ Valider</button>
    <button class="secondary" onclick="renderDescriptionScreen()">⬅ Annuler</button>
  `;
}


function getEditingUR() {
  const piece = getCurrentDescriptionPiece();
  const id = store.ui.editingUR;
  return piece?.descriptions.find(u => u.id === id) || null;
}

function urSetType(v) {
  const ur = getEditingUR();
  if (!ur) return;
  ur.type = v;
  saveMission();
}

function urToggleLetter(l) {
  const ur = getEditingUR();
  if (!ur) return;

  if (ur.lettres.includes(l)) {
    ur.lettres = ur.lettres.filter(x => x !== l);
  } else {
    ur.lettres.push(l);
  }

  saveMission();
  renderUREditForm(ur);
}

function urSetSubstrat(v) {
  const ur = getEditingUR();
  if (!ur) return;
  ur.substrat = v;
  saveMission();
}

function urSetRevetement(v) {
  const ur = getEditingUR();
  if (!ur) return;
  ur.revetement = v;
  saveMission();
}

function urSetMesurable(v) {
  const ur = getEditingUR();
  if (!ur) return;
  ur.mesurable = v;
  saveMission();
}

function getPhotosForUR(ur) {
  return store.mission.photos.filter(
    p => ur.photos?.includes(p.id)
  );
}

async function addPhotoToUR(file) {
  if (!file) return;

  const ur = getEditingUR();
  if (!ur) return;

  try {
    // Compression de la photo
    const { compressed, saved } = await PhotoCompressor.processPhoto(file);
    
    const photoId = crypto.randomUUID();

    const photo = {
      id: photoId,
      name: file.name,
      blob: compressed, // 🔥 Version compressée
      clefComposant: ur.id,
      domaine: "description",
      localisation: `${ur.type} ${(ur.localisation?.items || []).join(", ")}`
    };

    store.mission.photos.push(photo);

    ur.photos = ur.photos || [];
    ur.photos.push(photoId);

    // Message de confirmation
    if (saved) {
      console.log('✅ Photo UR ajoutée (photo compressée et sauvegardée)');
    }

    saveMission();
    renderUREditForm(ur);
    
  } catch (error) {
    console.error('❌ Erreur ajout photo UR:', error);
    alert('Erreur lors de l\'ajout de la photo');
  }
}


async function replaceURPhoto(photoId) {
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
      
      const photo = store.mission.photos.find(p => p.id === photoId);
      if (!photo) return;

      photo.name = file.name;
      photo.blob = compressed; // 🔥 Version compressée

      // Message de confirmation
      if (saved) {
        console.log('✅ Photo UR remplacée (photo compressée et sauvegardée)');
      }

      saveMission();
      renderUREditForm(getEditingUR());
      
    } catch (error) {
      console.error('❌ Erreur remplacement photo UR:', error);
      alert('Erreur lors du remplacement de la photo');
    }
  };

  input.click();
}

function deleteURPhoto(photoId) {
  if (!confirm("Supprimer cette photo ?")) return;

  const ur = getEditingUR();
  if (!ur) return;

  ur.photos = ur.photos.filter(id => id !== photoId);
  store.mission.photos =
    store.mission.photos.filter(p => p.id !== photoId);

  saveMission();
  renderUREditForm(ur);
}

function openURPhotoPreview(photoId) {
  const photo = store.mission.photos.find(p => p.id === photoId);
  if (!photo) return;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content">
      <img src="${URL.createObjectURL(photo.blob)}" style="width:100%">
      <button class="secondary" onclick="closeOverlay()">Fermer</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function selectFromDescList(type, value) {
  const ur = getEditingUR();
  if (!ur) return;

  if (type === "types_elements") ur.type = value;
  if (type === "substrats") ur.substrat = value;
  if (type === "revetements") ur.revetement = value;

  saveMission();
  closeOverlay();
  renderUREditForm(ur);
}


// ================================
// LISTES (DESCRIPTION) - sans conflit avec pieces.ui.js
// ================================

function openDescList(type) {
  // ✅ Utiliser directement le type sans mapping
  const dictKey = type;
  const dict = store.dict?.[dictKey];

  console.log("🔍 Type demandé:", type);
  console.log("🔍 Dictionnaire trouvé:", dict);

  if (!dict || !Array.isArray(dict.items) || dict.items.length === 0) {
    alert("Liste indisponible");
    return;
  }

  closeDescOverlay();

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content">
      <h3>${dict.label || "Sélection"}</h3>

      ${dict.items.map(o => `
        <button onclick="selectFromDescList('${type}', '${escapeQuotesDesc(o.label)}')">
          ${o.label}
        </button>
      `).join("")}

      <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function selectFromDescList(type, value) {
  const ur = getEditingUR();
  if (!ur) return;

  // ✅ Correspondance directe
  if (type === "types_elements") ur.type = value;
  if (type === "substrats") ur.substrat = value;
  if (type === "revetements") ur.revetement = value;

  saveMission();
  closeDescOverlay();
  renderUREditForm(ur);
}

function escapeQuotesDesc(s) {
  return (s || "").replace(/'/g, "\\'");
}

function closeDescOverlay() {
  document.querySelector(".overlay")?.remove();
}

// randomBetween est maintenant centralisée dans core/plomb.rules.js
// et disponible via window.randomBetween

function computeIncertitude(mesure) {
  if (typeof mesure !== "number") return null;
  return Number((mesure * 0.10).toFixed(2));
}

function toggleLocalisationItem(value) {
  const ur = getEditingUR();
  if (!ur || !ur.localisation) return;

  const currentItems = ur.localisation.items || [];

  const newItems = currentItems.includes(value)
    ? currentItems.filter(v => v !== value)
    : [...currentItems, value];

  ur.localisation.items = newItems;

  ur.plombByLoc = ur.plombByLoc || {};

  newItems.forEach(it => {
    if (!ur.plombByLoc[it]) {
      ur.plombByLoc[it] = { mesure: "", degradation: null };
    }
  });

  Object.keys(ur.plombByLoc).forEach(k => {
    if (!newItems.includes(k)) delete ur.plombByLoc[k];
  });

  saveMission();
  renderUREditForm(ur);
}

function getAdvancedLocalisationOptions() {
  const letters = Array.from({ length: 20 }, (_, i) =>
    String.fromCharCode(71 + i) // G → Z
  );

  const p = Array.from({ length: 20 }, (_, i) =>
    `P${String(i + 1).padStart(2, "0")}`
  );

  const f = Array.from({ length: 20 }, (_, i) =>
    `F${String(i + 1).padStart(2, "0")}`
  );

  return { letters, p, f };
}

function openLocalisationPlus() {
  const ur = getEditingUR();
  if (!ur) return;

  const { letters, p, f } = getAdvancedLocalisationOptions();

  const renderGroup = (title, items) => `
    <div class="loc-group">
      <strong>${title}</strong>
      ${items.map(v => `
        <label class="loc-item">
          <input type="checkbox"
            ${ur.localisation.items.includes(v) ? "checked" : ""}
            onchange="toggleLocalisationItem('${v}')">
          ${v}
        </label>
      `).join("")}
    </div>
  `;

  closeOverlay();

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content localisation-plus">
      <h3>Localisation avancée</h3>

      <div class="loc-grid">
        ${renderGroup("Lettres", letters)}
        ${renderGroup("P", p)}
        ${renderGroup("F", f)}
      </div>

      <button class="primary" onclick="closeOverlay()">Valider</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function formatURLocalisation(ur) {
  const items = ur?.localisation?.items;
  if (!Array.isArray(items) || items.length === 0) return "—";
  return items.join(", ");
}

function plombEnsureByLoc(ur) {
  ur.plombByLoc = ur.plombByLoc && typeof ur.plombByLoc === "object" ? ur.plombByLoc : {};
  const locs = Array.isArray(ur.localisation?.items) ? ur.localisation.items : [];
  locs.forEach(loc => {
    ur.plombByLoc[loc] = ur.plombByLoc[loc] || { 
      mesures: [], 
      degradation: null, 
      photoId: null,
      isDeclenchante: false,
      observation: "",
      isPE: false
    };
  });
  return locs;
}

function plombSetMesureForLoc(loc, value) {
  const ur = getEditingUR();
  if (!ur) return;

  plombEnsureByLoc(ur);
  ur.plombByLoc[loc] = ur.plombByLoc[loc] || { mesure: null, degradation: null };
  ur.plombByLoc[loc].mesure = value;

  saveMission();
}

function plombSetDegradationForLoc(loc, value) {
  const ur = getEditingUR();
  if (!ur) return;

  plombEnsureByLoc(ur);
  ur.plombByLoc[loc] = ur.plombByLoc[loc] || { mesure: null, degradation: null };
  ur.plombByLoc[loc].degradation = value || null;

  saveMission();
}

function plombApplyModeToAll(mode) {
  const ur = getEditingUR();
  if (!ur) return;

  const piece = getCurrentDescriptionPiece();
  const modeCREP = piece.modeCREP !== false;
  const locs = plombEnsureByLoc(ur);

  locs.forEach(loc => {
    const entry = ur.plombByLoc[loc] || { 
      mesures: [], 
      degradation: null, 
      photoId: null,
      isDeclenchante: false,
      observation: "",
      isPE: false
    };
    
    // Skip PE localisations (Mode Avant Travaux)
    if (entry.isPE) return;

    if (mode === "NM") {
      entry.mesures = ["NM"];
      entry.degradation = null;
      entry.isDeclenchante = false;
    }

    if (mode === "DASH") {
      entry.mesures = ["-"];
      entry.degradation = null;
      entry.isDeclenchante = false;
    }

    if (mode === "ZERO") {
      // CREP: 2 mesures | Avant Travaux: 1 mesure
      entry.mesures = modeCREP ? [0, 0] : [0];
      entry.degradation = null;
      entry.isDeclenchante = false;
    }

    if (mode === "LT_03") {
      // CREP: 2 mesures | Avant Travaux: 1 mesure
      if (modeCREP) {
        entry.mesures = [randomBetween(0.11, 0.29), randomBetween(0.11, 0.29)];
      } else {
        entry.mesures = [randomBetween(0.11, 0.29)];
      }
      entry.isDeclenchante = false;
    }

    if (mode === "LT_1") {
      // CREP: 2 mesures | Avant Travaux: 1 mesure
      if (modeCREP) {
        entry.mesures = [randomBetween(0.31, 0.99), randomBetween(0.31, 0.99)];
      } else {
        entry.mesures = [randomBetween(0.31, 0.99)];
      }
      entry.isDeclenchante = false;
    }

    ur.plombByLoc[loc] = entry;
  });

  // Vérifier déclenchante (Mode CREP uniquement)
  if (modeCREP) {
    checkAndAddTroisiemeMesure(ur);
  }

  saveMission();
  renderUREditForm(ur);
}

/**
 * Détecte si une mesure ≥ 1 et ajoute 3ème mesure (Mode CREP)
 */
function checkAndAddTroisiemeMesure(ur) {
  if (!ur.plombByLoc) return;
  
  const locs = Object.keys(ur.plombByLoc);
  
  // 1. Chercher les localisations déclenchantes (≥ 1)
  const declenchantes = [];
  locs.forEach(loc => {
    const entry = ur.plombByLoc[loc];
    if (!entry.mesures || !Array.isArray(entry.mesures)) return;
    
    // Chercher si UNE mesure ≥ 1
    const hasMesureGTE1 = entry.mesures.some(m => {
      const val = parseFloat(m);
      return !isNaN(val) && val >= 1;
    });
    
    if (hasMesureGTE1) {
      declenchantes.push(loc);
      entry.isDeclenchante = true;
      
      // Garder SEULEMENT la mesure ≥ 1
      const mesureGTE1 = entry.mesures.find(m => parseFloat(m) >= 1);
      entry.mesures = [mesureGTE1];
    } else {
      entry.isDeclenchante = false;
    }
  });
  
  // 2. Si déclenchante détectée, ajouter 3ème mesure aux AUTRES
  if (declenchantes.length > 0) {
    locs.forEach(loc => {
      if (declenchantes.includes(loc)) return; // Skip déclenchante
      
      const entry = ur.plombByLoc[loc];
      if (!entry.mesures || !Array.isArray(entry.mesures)) return;
      
      // Ignorer NM, -, etc.
      if (typeof entry.mesures[0] === 'string') return;
      
      // Ajouter 3ème mesure si seulement 2 présentes
      if (entry.mesures.length === 2) {
        // Déterminer la plage des 2 premières
        const avg = (entry.mesures[0] + entry.mesures[1]) / 2;
        const min = avg < 0.3 ? 0.11 : 0.31;
        const max = avg < 0.3 ? 0.29 : 0.99;
        
        entry.mesures.push(randomBetween(min, max));
      }
    });
  }
}

window.checkAndAddTroisiemeMesure = checkAndAddTroisiemeMesure;

// Pour onclick=""
window.plombApplyModeToAll = plombApplyModeToAll;
window.plombSetMesureForLoc = plombSetMesureForLoc;
window.plombSetDegradationForLoc = plombSetDegradationForLoc;

// ======================================================
// PHOTOS PAR LOCALISATION
// ======================================================

/**
 * Prendre une photo pour une localisation spécifique
 */
function takeLocalisationPhoto(loc) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    
    await addPhotoToLocalisation(file, loc);
  };
  
  input.click();
}

/**
 * Ajouter une photo à une localisation
 */
async function addPhotoToLocalisation(file, loc) {
  if (!file) return;
  
  const ur = getEditingUR();
  if (!ur) return;
  
  try {
    // Compression de la photo
    const { compressed, saved } = await PhotoCompressor.processPhoto(file);
    
    const photoId = crypto.randomUUID();
    
    // Récupérer la pièce pour la localisation
    const pieceId = store.ui?.currentDescriptionPieceId;
    const piece = store.mission?.pieces.find(p => p.id === pieceId);
    
    const photo = {
      id: photoId,
      name: file.name,
      blob: compressed,
      clefComposant: generateClefComposant(),
      domaine: "description",
      localisation: piece ? `${piece.batiment} - ${piece.nom}` : "Non localisée",
      
      // Métadonnées pour l'export
      urId: ur.id,
      urLoc: loc,
      urType: ur.type,
      urSubstrat: ur.substrat,
      urRevetement: ur.revetement,
      urMesure: (ur.plombByLoc[loc] || {}).mesure,
      urDegradation: (ur.plombByLoc[loc] || {}).degradation
    };
    
    store.mission.photos.push(photo);
    
    // Supprimer l'ancienne photo si elle existe
    const oldPhotoId = (ur.plombByLoc[loc] || {}).photoId;
    if (oldPhotoId) {
      store.mission.photos = store.mission.photos.filter(p => p.id !== oldPhotoId);
    }
    
    // Stocker l'ID de la photo dans la localisation
    ur.plombByLoc[loc] = ur.plombByLoc[loc] || {};
    ur.plombByLoc[loc].photoId = photoId;
    
    saveMission();
    renderUREditForm(ur);
    
    console.log(`✅ Photo ajoutée pour localisation ${loc}`);
    
  } catch (error) {
    console.error('❌ Erreur ajout photo localisation:', error);
    alert('Erreur lors de l\'ajout de la photo');
  }
}

/**
 * Supprimer la photo d'une localisation
 */
function deleteLocalisationPhoto(loc) {
  if (!confirm(`Supprimer la photo de la localisation ${loc} ?`)) return;
  
  const ur = getEditingUR();
  if (!ur) return;
  
  const photoId = (ur.plombByLoc[loc] || {}).photoId;
  if (!photoId) return;
  
  // Supprimer de la liste globale
  store.mission.photos = store.mission.photos.filter(p => p.id !== photoId);
  
  // Supprimer la référence
  ur.plombByLoc[loc].photoId = null;
  
  saveMission();
  renderUREditForm(ur);
}

window.takeLocalisationPhoto = takeLocalisationPhoto;
window.deleteLocalisationPhoto = deleteLocalisationPhoto;


/**
 * Active/désactive le pré-remplissage avec la liste par défaut
 */
async function toggleDefaultDescriptions() {
  const checkbox = document.getElementById('use-default-descriptions');
  if (!checkbox || !checkbox.checked) return;
  
  const piece = store.mission.pieces.find(p => p.id === store.ui.currentDescriptionPieceId);
  if (!piece) return;
  
  // Appliquer le template
  await applyDescriptionsTemplate(piece);
  await saveMission();
  renderDescriptionScreen();
}

window.toggleDefaultDescriptions = toggleDefaultDescriptions;

/**
 * Active/désactive le mode CREP
 */
function toggleModeCREP() {
  const piece = getCurrentDescriptionPiece();
  if (!piece) return;
  
  const checkbox = document.getElementById('mode-crep');
  piece.modeCREP = checkbox ? checkbox.checked : true;
  
  saveMission();
  renderDescriptionScreen();
}

window.toggleModeCREP = toggleModeCREP;

/**
 * Active/désactive Par Extension sur une localisation (Mode Avant Travaux)
 */
function togglePE(localisation, isPE) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[localisation]) return;
  
  const entry = ur.plombByLoc[localisation];
  entry.isPE = isPE;
  
  if (isPE) {
    // Si PE activé → Observation auto + vider mesures
    entry.observation = "Par Extension";
    entry.mesures = [];
    entry.degradation = null;
  } else {
    // Si PE désactivé → Vider observation si c'était "Par Extension"
    if (entry.observation === "Par Extension") {
      entry.observation = "";
    }
  }
  
  saveMission();
  renderUREditForm(ur);
}

/**
 * Définit l'observation pour une localisation
 */
function plombSetObservationForLoc(localisation, value) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[localisation]) return;
  
  ur.plombByLoc[localisation].observation = value;
  saveMission();
  renderUREditForm(ur);
}

window.togglePE = togglePE;
window.plombSetObservationForLoc = plombSetObservationForLoc;



// =====================================================
// PAVÉ NUMÉRIQUE ET BOUTONS RAPIDES MESURES
// =====================================================

/**
 * Définit une valeur prédéfinie pour une mesure plomb
 */
function setPlombMesure(localisation, valeur) {
  const ur = getEditingUR();
  if (!ur) return;
  
  if (!ur.plombByLoc) ur.plombByLoc = {};
  if (!ur.plombByLoc[localisation]) {
    ur.plombByLoc[localisation] = { mesure: null, degradation: null, photoId: null };
  }
  
  ur.plombByLoc[localisation].mesure = valeur;
  saveMission();
  renderUREditForm(ur);
}

/**
 * Ouvre le pavé numérique géant
 */

/**
 * Ajoute un caractère au pavé numérique
 */
function keypadAppend(char) {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  input.value += char;
}

/**
 * Définit une valeur prédéfinie dans le pavé
 */
function keypadSetValue(value) {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  
  // Cas spéciaux : générer un random au lieu d'afficher le symbole
  if (value === '<0,3') {
    input.value = randomBetween(0.11, 0.29);
  } else if (value === '<1') {
    input.value = randomBetween(0.31, 0.99);
  } else if (value === '=0') {
    input.value = '0';
  } else {
    input.value = value;
  }
}

/**
 * Efface le dernier caractère
 */
function keypadBackspace() {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  input.value = input.value.slice(0, -1);
}

/**
 * Valide la saisie du pavé numérique
 */
function keypadConfirm(localisation) {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  
  const value = input.value;
  setPlombMesure(localisation, value);
  closeDescOverlay();
}

// Exposer globalement
window.setPlombMesure = setPlombMesure;
window.openNumericKeypad = openNumericKeypad;
window.keypadAppend = keypadAppend;
window.keypadSetValue = keypadSetValue;
window.keypadBackspace = keypadBackspace;
window.keypadConfirm = keypadConfirm;


/**
 * Ouvre le pavé numérique pour une mesure spécifique
 */
function openMesureKeypad(localisation, index) {
  const ur = getEditingUR();
  if (!ur) return;
  
  const entry = ur.plombByLoc?.[localisation];
  if (!entry) return;
  
  const currentValue = entry.mesures?.[index] || '';
  
  closeDescOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-content numeric-keypad">
      <h3>Saisie mesure ${index + 1}</h3>
      <div class="keypad-location">${localisation}</div>
      
      <div class="keypad-display">
        <input type="text" id="keypad-input" value="${currentValue}" readonly />
      </div>
      
      <div class="keypad-special-buttons">
        <button onclick="keypadSetValue('NM')">NM</button>
        <button onclick="keypadSetValue('-')">-</button>
        <button onclick="keypadSetValue('=0')">=0</button>
        <button onclick="keypadSetValue('<0,3')">&lt;0,3</button>
        <button onclick="keypadSetValue('<1')">&lt;1</button>
      </div>
      
      <div class="keypad-grid">
        <button onclick="keypadAppend('7')">7</button>
        <button onclick="keypadAppend('8')">8</button>
        <button onclick="keypadAppend('9')">9</button>
        
        <button onclick="keypadAppend('4')">4</button>
        <button onclick="keypadAppend('5')">5</button>
        <button onclick="keypadAppend('6')">6</button>
        
        <button onclick="keypadAppend('1')">1</button>
        <button onclick="keypadAppend('2')">2</button>
        <button onclick="keypadAppend('3')">3</button>
        
        <button onclick="keypadAppend('0')">0</button>
        <button onclick="keypadAppend(',')">,</button>
        <button onclick="keypadBackspace()">⌫</button>
      </div>
      
      <div class="keypad-actions">
        <button class="primary" onclick="keypadConfirmMesure('${localisation.replace(/'/g, "\\'")}', ${index})">✓ Valider</button>
        <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

/**
 * Validation pavé numérique avec recalcul 3ème mesure
 */
function keypadConfirmMesure(localisation, index) {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  
  const value = input.value;
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[localisation]) return;
  
  const entry = ur.plombByLoc[localisation];
  
  // Mettre à jour la mesure à l'index donné
  if (!Array.isArray(entry.mesures)) entry.mesures = [];
  entry.mesures[index] = value;
  
  // Vérifier déclenchante (Mode CREP)
  const piece = getCurrentDescriptionPiece();
  if (piece.modeCREP !== false) {
    checkAndAddTroisiemeMesure(ur);
  }
  
  saveMission();
  closeDescOverlay();
  renderUREditForm(ur);
}

window.openMesureKeypad = openMesureKeypad;
window.keypadConfirmMesure = keypadConfirmMesure;

/**
 * Ajoute une mesure manuelle vide
 */
function addMesureManuelle(localisation) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[localisation]) return;
  
  const entry = ur.plombByLoc[localisation];
  if (!Array.isArray(entry.mesures)) entry.mesures = [];
  
  const newIndex = entry.mesures.length;
  entry.mesures.push("");
  
  saveMission();
  renderUREditForm(ur);
  
  // Ouvrir pavé immédiatement
  setTimeout(() => openMesureKeypad(localisation, newIndex), 100);
}

window.addMesureManuelle = addMesureManuelle;
