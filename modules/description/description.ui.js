console.log("✅ description.ui.js chargé");

// Variables globales pour la fonction secrète (5 clics)
let clickCount = 0;
let clickTimer = null;

function renderPlombSummary(ur) {
  if (!ur.plombByLoc || Object.keys(ur.plombByLoc).length === 0) return "";

  const badges = Object.entries(ur.plombByLoc)
    .map(([loc, v]) => {
  // Afficher si mesures présentes OU si PE actif
  if (!v || (!v.mesures && !v.isPE) || (v.mesures && v.mesures.length === 0 && !v.isPE)) return null;
      
// Calculer la moyenne des mesures numériques
const numericMesures = v.mesures
  ? v.mesures
      .map(m => parseFloat(String(m).replace(',', '.')))
      .filter(m => !isNaN(m) && m >= 0)
  : [];

const hasMesures = numericMesures.length > 0;
const moyenne = hasMesures 
  ? numericMesures.reduce((a, b) => a + b, 0) / numericMesures.length 
  : null;

// Déterminer la couleur selon la moyenne
let borderColor, bgColor;
if (v.isPE) {
  // Bleu : PE (Par Extension)
  borderColor = '#3b82f6';
  bgColor = '#dbeafe';
} else if (!hasMesures) {
        // Bleu : NM ou pas de mesure
        borderColor = '#3b82f6';
        bgColor = '#dbeafe';
      } else if (moyenne < 0.3) {
        // Vert : < 0.3
        borderColor = '#10b981';
        bgColor = '#d1fae5';
      } else if (moyenne < 1) {
        // Orange : >= 0.3 et < 1
        borderColor = '#f59e0b';
        bgColor = '#fed7aa';
      } else {
        // Rouge : >= 1
        borderColor = '#ef4444';
        bgColor = '#fecaca';
      }
      
// Affichage différent selon PE ou mesures normales
const mesuresStr = v.isPE 
  ? "PE" 
  : (v.mesures ? v.mesures.join(" | ") : "");
const declBadge = v.isDeclenchante ? " ⚠️" : "";
const degradationStr = v.degradation ? ` – ${v.degradation}` : "";

return `<span style="
  display: inline-block;
  padding: 2px 6px;
  margin: 2px 3px 2px 0;
  border: 2px solid ${borderColor};
  background: ${bgColor};
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  line-height: 1.3;
">
        <strong>${loc}</strong> : ${mesuresStr}${declBadge}${degradationStr}
      </span>`;
    })
    .filter(Boolean);

  if (!badges.length) return "";

  return `
    <div style="
    margin-top: 8px;
    padding: 6px;
    background: #f9fafb;
    border-radius: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    line-height: 1.2;
  ">
      ${badges.join('')}
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
    <div class="ur-card-header">
      <div class="ur-info-left">
        <strong>${ur.type}</strong>
        <span class="ur-substrat-revetement">${ur.substrat || "—"} / ${ur.revetement || "—"}</span>
      </div>
      
      <div class="card-icons">
        <span onclick="editUR('${ur.id}')">✏️</span>
        ${(() => {
          let count = (ur.photos || []).length;
          if (ur.plombByLoc) {
            Object.values(ur.plombByLoc).forEach(entry => {
              if (entry.photoId && store.mission.photos.find(p => p.id === entry.photoId)) {
                count++;
              }
            });
          }
          const hasPhotos = count > 0;
          const iconClass = hasPhotos ? 'photo-icon has-photo' : 'photo-icon no-photo';
          return `<span class="${iconClass}" onclick="editUR('${ur.id}')" title="${count} photo(s)">📷</span>`;
        })()}
        <span onclick="deleteUR('${ur.id}')">🗑</span>
      </div>
    </div>
    
    ${renderPlombSummary(ur)}
  </div>
`).join("")
      }
    </div>

    <div style="display: flex; gap: 8px; margin-top: 16px;">
      <button class="action-btn" onclick="openExtendPiece()">📤 Étendre à</button>
      <button class="action-btn" onclick="openImportPiece()">📥 Importer de</button>
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
  
  // Sécurité : forcer initialisation localisation
  if (!ur.localisation || !Array.isArray(ur.localisation.items)) {
    ur.localisation = { items: [] };
  }
  
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


    <label>Repère</label>
<div class="letters">
  ${["A","B","C","D","Sol","Plaf"].map(l => `
    <button
      class="${(ur.localisation && ur.localisation.items && ur.localisation.items.includes(l)) ? "active" : ""}"
      onclick="toggleLocalisationItem('${l}')">
      ${l}
    </button>
  `).join("")}

  <button class="add-btn-txt" onclick="openRepereManuel()">Txt</button>
  <button class="add-btn" onclick="openLocalisationPlus()">+</button>
</div>

<div class="small muted">
  Sélection : ${(ur.localisation && ur.localisation.items) ? ur.localisation.items.join(", ") : "—"}
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

<h3 id="plomb-title" onclick="handlePlombTitleClick()" style="cursor: pointer; user-select: none;">Mesures plomb (par repère)</h3>

<div id="quick-buttons-container" class="plomb-actions compact" style="display: ${isModeCREP() || store.ui.expertMode ? 'flex' : 'none'}">
  <button onclick="plombApplyModeToAll('NM')">NM</button>
  <button onclick="plombApplyModeToAll('DASH')">-</button>
  <button onclick="plombApplyModeToAll('ZERO')">=0</button>
  <button onclick="plombApplyModeToAll('LT_03')">&lt;0,3</button>
  <button onclick="plombApplyModeToAll('LT_1')">&lt;1</button>
</div>

<div class="small muted" style="margin-top:6px">
  ${isModeCREP() 
    ? "Mode CREP : 2 mesures minimum par repère" 
    : "Mode Avant Travaux : Cocher PE pour Par Extension"}
</div>

<div class="plomb-loc-list">
  ${
    (Array.isArray(ur.localisation?.items) ? ur.localisation.items : []).length === 0
      ? `<div class="plomb-empty muted">Aucune repère sélectionnée</div>`
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
          const modeCREP = isModeCREP();
          const isPE = entry.isPE || false;
          const observation = entry.observation || "";
          
          return `
            <div class="plomb-loc-row ${entry.isDeclenchante ? 'is-declenchante' : ''}">
              
               <!-- LIGNE 1 : Repère + PE + Badge + Mesures -->
              <div style="
                display: flex;
                align-items: stretch;
                gap: 8px;
                margin-bottom: 8px;
              ">
                <!-- Repère -->
                <div style="
                  display: flex;
                  align-items: center;
                  min-width: 30px;
                  font-weight: bold;
                  font-size: 14px;
                ">${loc}</div>
                
                ${entry.isDeclenchante ? `
                  <span style="
                    display: flex;
                    align-items: center;
                    font-size: 18px;
                  ">⚠️</span>
                ` : ''}
                
                ${!isPE ? `
                  <!-- Zone mesures + bouton + -->
                  <div style="
                    display: flex;
                    align-items: stretch;
                    gap: 6px;
                    flex: 1;
                  ">
                    ${entry.mesures && entry.mesures.length > 0 ? entry.mesures.map((m, idx) => `
                      <input
                        type="text"
                        value="${m}"
                        onclick="openMesureKeypad('${loc.replace(/'/g, "\\'")}', ${idx})"
                        readonly
                        style="
                          width: 70px;
                          height: 40px;
                          padding: 0;
                          margin: 0;
                          border: 2px solid #d1d5db;
                          border-radius: 6px;
                          font-size: 14px;
                          text-align: center;
                          background: white;
                          cursor: pointer;
                          box-sizing: border-box;
                          vertical-align: middle;
                          line-height: 36px;
                        ">
                    `).join('') : ''}
                    
                    ${!entry.isDeclenchante && Array.isArray(entry.mesures) ? `
                      <button 
                        onclick="addMesureManuelle('${loc.replace(/'/g, "\\'")}')"
                        style="
                          width: 40px;
                          height: 40px;
                          padding: 0;
                          margin: 0;
                          border: none;
                          background: #3b82f6;
                          color: white;
                          border-radius: 6px;
                          font-size: 20px;
                          font-weight: bold;
                          cursor: pointer;
                          box-sizing: border-box;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          vertical-align: middle;
                        ">+</button>
                    ` : ''}
                  </div>
                ` : `
                  <span style="
                    display: flex;
                    align-items: center;
                    flex: 1;
                    color: #9ca3af;
                    font-size: 13px;
                  ">Par Extension</span>
                `}
                
                <!-- Checkbox PE à droite -->
                ${!modeCREP ? `
                  <label style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 54px;
                    height: 40px;
                    padding: 0 12px;
                    margin: 0;
                    border: 2px solid ${isPE ? '#10b981' : '#d1d5db'};
                    background: ${isPE ? '#d1fae5' : '#f3f4f6'};
                    border-radius: 6px;
                    cursor: pointer;
                    user-select: none;
                    box-sizing: border-box;
                    vertical-align: middle;
                  ">
                    <input 
                      type="checkbox" 
                      ${isPE ? 'checked' : ''}
                      onchange="togglePE('${loc.replace(/'/g, "\\'")}', this.checked)"
                      style="display: none;">
                    <span style="
                      font-weight: ${isPE ? 'bold' : 'normal'};
                      font-size: 13px;
                      color: #111;
                      line-height: 1;
                    ">PE</span>
                  </label>
                ` : ''}
              </div>

              <!-- LIGNE 2 : Dégradation + Observation + Photo -->
              <div class="plomb-ligne-2">
                ${!isPE ? `
                  <select
                    class="plomb-select-inline"
                    onchange="plombSetDegradationForLoc('${loc.replace(/'/g, "\\'")}', this.value)"
                    title="Dégradation"
                  >
                    <option value="" ${degrVal==="" ? "selected" : ""}>—</option>
                    <option ${degrVal==="Non visible" ? "selected" : ""}>Non visible</option>
                    <option ${degrVal==="Non dégradé" ? "selected" : ""}>Non dégradé</option>
                    <option ${degrVal==="Etat d'usage" ? "selected" : ""}>Etat d'usage</option>
                    <option ${degrVal==="Dégradé" ? "selected" : ""}>Dégradé</option>
                  </select>
                ` : ''}
                
                ${(() => {
                  const isSaisieLibre = observation && !['', 'Par Extension', 'Element récent', 'Non visé par la réglementation', 'Hors d\'atteinte >3m'].includes(observation);
                  return !isPE ? `
                    <select
                      id="obs-select-${loc.replace(/\s/g, '_')}"
                      class="plomb-select-inline"
                      onchange="plombObservationChange('${loc.replace(/'/g, "\\'")}', this.value)"
                      style="${isSaisieLibre ? 'display:none' : ''}"
                      title="Observation"
                    >
                      <option value="" ${observation==="" ? "selected" : ""}>—</option>
                      <option ${observation==="Par Extension" ? "selected" : ""}>Par Extension</option>
                      <option ${observation==="Element récent" ? "selected" : ""}>Élément récent</option>
                      <option ${observation==="Non visé par la réglementation" ? "selected" : ""}>Non visé par la réglementation</option>
                      <option ${observation==="Hors d'atteinte >3m" ? "selected" : ""}>Hors d'atteinte >3m</option>
                      <option value="__LIBRE__">✏️ Saisie libre</option>
                    </select>
                    <input 
                      id="obs-libre-${loc.replace(/\s/g, '_')}"
                      type="text" 
                      class="plomb-select-inline"
                      value="${isSaisieLibre ? observation : ''}"
                      onblur="plombSetObservationForLoc('${loc.replace(/'/g, "\\'")}', this.value)"
                      placeholder="Saisie libre..."
                      style="${isSaisieLibre ? '' : 'display:none'}">
                  ` : `<span class="muted small">Par Extension</span>`;
                })()}
                
                ${!isPE ? `
                  <button 
                    class="photo-btn-icon ${hasPhoto ? 'has-photo' : ''}" 
                    onclick="takeLocalisationPhoto('${loc.replace(/'/g, "\\'")}')">
                    📷
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join("")
  }
</div>

  </div>

</div>


    <div style="display: flex; gap: 8px; margin-top: 16px;">
      <button class="action-btn" onclick="openExtendElement()">📤 Étendre à</button>
      <button class="action-btn" onclick="openImportElement()">📥 Importer de</button>
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
      repère: `${ur.type} ${(ur.localisation?.items || []).join(", ")}`
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

function getAdvancedrepèreOptions() {
  const letters = Array.from({ length: 20 }, (_, i) =>
    String.fromCharCode(69 + i) // G → Z
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

  const { letters, p, f } = getAdvancedrepèreOptions();

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
    <div class="overlay-content repère-plus">
      <h3>repère avancée</h3>

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

function formatURrepère(ur) {
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
  const modeCREP = isModeCREP();
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
    
    // Skip PE repères (Mode Avant Travaux)
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
  
  // 1. Chercher les repères déclenchantes (≥ 1)
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
// PHOTOS PAR repère
// ======================================================

/**
 * Prendre une photo pour une repère spécifique
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
 * Ajouter une photo à une repère
 */
async function addPhotoToLocalisation(file, loc) {
  if (!file) return;
  
  const ur = getEditingUR();
  if (!ur) return;
  
  try {
    // Compression de la photo
    const { compressed, saved } = await PhotoCompressor.processPhoto(file);
    
    const photoId = crypto.randomUUID();
    
    // Récupérer la pièce pour la repère
    const pieceId = store.ui?.currentDescriptionPieceId;
    const piece = store.mission?.pieces.find(p => p.id === pieceId);
    
    const photo = {
      id: photoId,
      name: file.name,
      blob: compressed,
      clefComposant: generateClefComposant(),
      domaine: "description",
      repère: piece ? `${piece.batiment} - ${piece.nom}` : "Non localisée",
      
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
    
    // Stocker l'ID de la photo dans la repère
    ur.plombByLoc[loc] = ur.plombByLoc[loc] || {};
    ur.plombByLoc[loc].photoId = photoId;
    
    saveMission();
    renderUREditForm(ur);
    
    console.log(`✅ Photo ajoutée pour repère ${loc}`);
    
  } catch (error) {
    console.error('❌ Erreur ajout photo repère:', error);
    alert('Erreur lors de l\'ajout de la photo');
  }
}

/**
 * Supprimer la photo d'une repère
 */
function deleteLocalisationPhoto(loc) {
  if (!confirm(`Supprimer la photo de la repère ${loc} ?`)) return;
  
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
window.openLocalisationPlus = openLocalisationPlus;
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

/**
 * Active/désactive Par Extension sur une repère (Mode Avant Travaux)
 */
function togglePE(repère, isPE) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[repère]) return;
  
  const entry = ur.plombByLoc[repère];
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
 * Définit l'observation pour une repère
 */
function plombSetObservationForLoc(repère, value) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[repère]) return;
  
  ur.plombByLoc[repère].observation = value;
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
function setPlombMesure(repère, valeur) {
  const ur = getEditingUR();
  if (!ur) return;
  
  if (!ur.plombByLoc) ur.plombByLoc = {};
  if (!ur.plombByLoc[repère]) {
    ur.plombByLoc[repère] = { mesure: null, degradation: null, photoId: null };
  }
  
  ur.plombByLoc[repère].mesure = valeur;
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
function keypadConfirm(repère) {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  
  const value = input.value;
  setPlombMesure(repère, value);
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
function openMesureKeypad(repère, index) {
  const ur = getEditingUR();
  if (!ur) return;
  
  const entry = ur.plombByLoc?.[repère];
  if (!entry) return;
  
  const currentValue = entry.mesures?.[index] || '';
  
  closeDescOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-content numeric-keypad">
      <h3>Saisie mesure ${index + 1}</h3>
      <div class="keypad-location">${repère}</div>
      
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
        <button class="primary" onclick="keypadConfirmMesure('${repère.replace(/'/g, "\\'")}', ${index})">✓ Valider</button>
        <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

/**
 * Validation pavé numérique avec recalcul 3ème mesure
 */
function keypadConfirmMesure(repère, index) {
  const input = document.getElementById('keypad-input');
  if (!input) return;
  
  const value = input.value;
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[repère]) return;
  
  const entry = ur.plombByLoc[repère];
  
  // Mettre à jour la mesure à l'index donné
  if (!Array.isArray(entry.mesures)) entry.mesures = [];
  entry.mesures[index] = value;
  
  // Vérifier déclenchante (Mode CREP)
  const piece = getCurrentDescriptionPiece();
  if (isModeCREP()) {
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
function addMesureManuelle(repère) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[repère]) return;
  
  const entry = ur.plombByLoc[repère];
  if (!Array.isArray(entry.mesures)) entry.mesures = [];
  
  const newIndex = entry.mesures.length;
  entry.mesures.push("");
  
  saveMission();
  renderUREditForm(ur);
  
  // Ouvrir pavé immédiatement
  setTimeout(() => openMesureKeypad(repère, newIndex), 100);
}

window.addMesureManuelle = addMesureManuelle;

/**
 * Gestion changement observation (select ou input libre)
 */
function plombObservationChange(repère, value) {
  const ur = getEditingUR();
  if (!ur || !ur.plombByLoc || !ur.plombByLoc[repère]) return;
  
  if (value === '__LIBRE__') {
    // Afficher input libre
    const locId = repère.replace(/\s/g, '_');
    const selectElem = document.getElementById(`obs-select-${locId}`);
    const libreElem = document.getElementById(`obs-libre-${locId}`);
    if (selectElem) selectElem.style.display = 'none';
    if (libreElem) {
      libreElem.style.display = 'block';
      const input = libreElem.querySelector('input');
      if (input) input.focus();
    }
  } else {
    // Valeur prédéfinie
    ur.plombByLoc[repère].observation = value;
    saveMission();
  }
}

/**
 * Retour au select depuis saisie libre
 */
function plombRetourSelect(repère) {
  const locId = repère.replace(/\s/g, '_');
  const selectElem = document.getElementById(`obs-select-${locId}`);
  const libreElem = document.getElementById(`obs-libre-${locId}`);
  
  if (selectElem) selectElem.style.display = 'block';
  if (libreElem) libreElem.style.display = 'none';
  
  // Remettre à vide
  const ur = getEditingUR();
  if (ur && ur.plombByLoc && ur.plombByLoc[repère]) {
    ur.plombByLoc[repère].observation = '';
    saveMission();
  }
  
  renderUREditForm(ur);
}

window.plombObservationChange = plombObservationChange;
window.plombRetourSelect = plombRetourSelect;

/**
 * Ouvrir saisie manuelle de repère
 */
function openRepereManuel() {
  const ur = getEditingUR();
  if (!ur) return;
  
  const repereManuel = prompt("Saisie manuelle du repère :", "");
  if (!repereManuel || repereManuel.trim() === "") return;
  
  const repere = repereManuel.trim().toUpperCase();
  
  // Ajouter le repère s'il n'existe pas déjà
  if (!ur.localisation.items.includes(repere)) {
    ur.localisation.items.push(repere);
    plombEnsureByLoc(ur);
    saveMission();
    renderUREditForm(ur);
  }
}

window.openRepereManuel = openRepereManuel;

/**
 * Retourne si le mode CREP est actif (sinon Avant Travaux)
 */
function isModeCREP() {
  return store.mission?.settings?.mode === "CREP";
}

/**
 * Fonction secrète : 5 clics rapides sur le titre pour activer le mode expert
 */

function handlePlombTitleClick() {
  clickCount++;
  
  // Premier clic : démarrer le timer
  if (clickCount === 1) {
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 3000); // Reset après 3 secondes
  }
  
  // 5 clics atteints : activer mode expert
  if (clickCount === 5) {
    clearTimeout(clickTimer);
    clickCount = 0;
    
    // Toggle mode expert
    if (!store.ui.expertMode) {
      store.ui.expertMode = true;
      
      // Animation titre
      const title = document.getElementById('plomb-title');
      title.style.transition = 'all 0.3s';
      title.style.background = 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
      title.style.color = 'white';
      title.style.padding = '8px 12px';
      title.style.borderRadius = '8px';
      
      setTimeout(() => {
        title.style.background = '';
        title.style.color = '';
        title.style.padding = '';
      }, 2000);
      
      // Toast notification
      showToast("🔓 Mode expert activé ! Boutons rapides affichés");
      
    } else {
      store.ui.expertMode = false;
      showToast("🔒 Mode expert désactivé");
    }
    
    // Réafficher l'écran pour appliquer les changements
    renderDescriptionScreen();
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #111;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideDown 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialiser expertMode dans store
if (!store.ui.expertMode) {
  store.ui.expertMode = false;
}

window.handlePlombTitleClick = handlePlombTitleClick;

// ======================================================
// ÉTENDRE À / IMPORTER DE
// ======================================================

/**
 * Ouvre la liste pour étendre l'élément actuel vers d'autres pièces/éléments
 */
function openExtendElement() {
  const ur = getEditingUR();
  if (!ur) return;
  
  const elementType = ur.type;
  const currentPieceId = store.ui?.currentDescriptionPieceId;
  
  // Construire la liste arborescente : toutes les pièces
  const targets = [];
  
  store.mission.pieces.forEach(piece => {
    // Exclure la pièce actuelle
    if (piece.id === currentPieceId) return;
    
    piece.descriptions = piece.descriptions || [];
    
    // Chercher si un élément du même type existe dans cette pièce
    const existingElement = piece.descriptions.find(d => d.type === elementType);
    
    if (existingElement) {
      // Élément existe → Afficher en enfant
      targets.push({
        type: 'existing',
        pieceId: piece.id,
        pieceName: `${piece.batiment || "?"} - ${piece.nom || "?"}`,
        elementId: existingElement.id,
        elementName: existingElement.type,
        reperes: formatURrepère(existingElement)
      });
    } else {
      // Élément n'existe pas → Afficher "Créer nouveau"
      targets.push({
        type: 'create',
        pieceId: piece.id,
        pieceName: `${piece.batiment || "?"} - ${piece.nom || "?"}`,
        elementName: elementType
      });
    }
  });
  
  if (targets.length === 0) {
    alert('Aucune autre pièce disponible.');
    return;
  }
  
  // Afficher l'overlay de sélection arborescente
  closeDescOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-content extend-import-selector">
      <h3>📤 Étendre "${elementType}" à :</h3>
      <p class="small muted">Cochez les pièces/éléments cibles</p>
      
      <div class="extend-tree" id="extend-tree">
        ${targets.map((target, idx) => {
          if (target.type === 'existing') {
            return `
              <div class="tree-piece">
                <div class="tree-piece-name">${target.pieceName}</div>
                <label class="tree-element">
                  <input type="checkbox" value="${idx}" class="extend-checkbox">
                  <div class="tree-element-info">
                    <strong>${target.elementName}</strong>
                    <span class="small">${target.reperes} [existe]</span>
                  </div>
                </label>
              </div>
            `;
          } else {
            return `
              <div class="tree-piece">
                <div class="tree-piece-name">${target.pieceName}</div>
                <label class="tree-element">
                  <input type="checkbox" value="${idx}" class="extend-checkbox">
                  <div class="tree-element-info">
                    <strong>Créer "${target.elementName}"</strong>
                    <span class="small muted">Nouvel élément</span>
                  </div>
                </label>
              </div>
            `;
          }
        }).join('')}
      </div>
      
      <div class="extend-summary">
        <strong>Total :</strong> <span id="extend-count">0</span> élément(s) sélectionné(s)
      </div>
      
      <button class="primary" onclick="confirmExtendElementV2(${JSON.stringify(targets).replace(/"/g, '&quot;')})">
        ✅ Copier vers les éléments sélectionnés
      </button>
      <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Ajouter écouteurs pour mettre à jour le compteur
  document.querySelectorAll('.extend-checkbox').forEach(cb => {
    cb.addEventListener('change', updateExtendCount);
  });
}

/**
 * Confirme et exécute l'extension (version arborescente)
 */
function confirmExtendElementV2(targets) {
  const ur = getEditingUR();
  if (!ur) return;
  
  // Récupérer les indices cochés
  const selectedIndices = Array.from(document.querySelectorAll('.extend-checkbox:checked'))
    .map(cb => parseInt(cb.value));
  
  if (selectedIndices.length === 0) {
    alert('Aucun élément sélectionné');
    return;
  }
  
  let copiedCount = 0;
  let createdCount = 0;
  
  selectedIndices.forEach(idx => {
    const target = targets[idx];
    const piece = store.mission.pieces.find(p => p.id === target.pieceId);
    if (!piece) return;
    
    if (target.type === 'existing') {
      // Élément existe → Copier
      const targetElement = piece.descriptions.find(d => d.id === target.elementId);
      if (targetElement) {
        copyElementData(ur, targetElement);
        copiedCount++;
      }
    } else {
      // Élément n'existe pas → Créer
      piece.descriptions = piece.descriptions || [];
      const newElement = {
        id: crypto.randomUUID(),
        photos: []
      };
      copyElementData(ur, newElement);
      piece.descriptions.push(newElement);
      createdCount++;
    }
  });
  
  saveMission();
  closeDescOverlay();
  
  const message = [];
  if (copiedCount > 0) message.push(`✅ ${copiedCount} élément(s) mis à jour`);
  if (createdCount > 0) message.push(`✨ ${createdCount} élément(s) créé(s)`);
  
  alert(message.join('\n'));
}

// Exposer la nouvelle fonction
window.confirmExtendElementV2 = confirmExtendElementV2;
/**
 * Met à jour le compteur d'éléments sélectionnés
 */
function updateExtendCount() {
  const count = document.querySelectorAll('.extend-checkbox:checked').length;
  const countElem = document.getElementById('extend-count');
  if (countElem) countElem.textContent = count;
}

/**
 * Confirme et exécute l'extension vers les éléments sélectionnés
 */
function confirmExtendElement(targets) {
  const ur = getEditingUR();
  if (!ur) return;
  
  // Récupérer les indices cochés
  const selectedIndices = Array.from(document.querySelectorAll('.extend-checkbox:checked'))
    .map(cb => parseInt(cb.value));
  
  if (selectedIndices.length === 0) {
    alert('Aucun élément sélectionné');
    return;
  }
  
  // Copier vers chaque élément sélectionné
  let copiedCount = 0;
  
  selectedIndices.forEach(idx => {
    const target = targets[idx];
    const piece = store.mission.pieces.find(p => p.id === target.pieceId);
    if (!piece) return;
    
    const targetElement = piece.descriptions.find(d => d.id === target.elementId);
    if (!targetElement) return;
    
    // Copier toutes les données SAUF photos et id
    copyElementData(ur, targetElement);
    copiedCount++;
  });
  
  saveMission();
  closeDescOverlay();
  
  alert(`✅ Données copiées vers ${copiedCount} élément(s)`);
}

/**
 * Ouvre la liste pour importer depuis un autre élément
 */
function openImportElement() {
  const ur = getEditingUR();
  if (!ur) return;
  
  const elementType = ur.type;
  
  // Construire la liste des éléments du même type dans d'autres pièces
  const sources = [];
  
  store.mission.pieces.forEach(piece => {
    if (!piece.descriptions) return;
    
    piece.descriptions.forEach(desc => {
      // Filtrer uniquement les éléments du même type
      if (desc.type === elementType) {
        // Exclure l'élément actuel
        if (desc.id !== ur.id) {
          sources.push({
            pieceId: piece.id,
            pieceName: `${piece.batiment || "?"} - ${piece.nom || "?"}`,
            elementId: desc.id,
            elementName: desc.type,
            reperes: formatURrepère(desc)
          });
        }
      }
    });
  });
  
  if (sources.length === 0) {
    alert(`Aucun autre élément "${elementType}" trouvé dans les autres pièces.`);
    return;
  }
  
  // Afficher l'overlay de sélection
  closeDescOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-content extend-import-selector">
      <h3>📥 Importer depuis un "${elementType}" :</h3>
      <p class="small muted">Sélectionnez l'élément source à copier</p>
      
      <div class="import-list" id="import-list">
        ${sources.map((source, idx) => `
          <label class="import-item">
            <input type="radio" name="import-source" value="${idx}" class="import-radio">
            <div class="import-info">
              <strong>${source.pieceName}</strong>
              <span class="small">${source.elementName} (${source.reperes})</span>
            </div>
          </label>
        `).join('')}
      </div>
      
      <button class="primary" onclick="confirmImportElement(${JSON.stringify(sources).replace(/"/g, '&quot;')})">
        ✅ Importer depuis l'élément sélectionné
      </button>
      <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

/**
 * Confirme et exécute l'import depuis l'élément sélectionné
 */
function confirmImportElement(sources) {
  const ur = getEditingUR();
  if (!ur) return;
  
  // Récupérer l'indice sélectionné
  const selectedRadio = document.querySelector('input[name="import-source"]:checked');
  
  if (!selectedRadio) {
    alert('Aucun élément sélectionné');
    return;
  }
  
  const idx = parseInt(selectedRadio.value);
  const source = sources[idx];
  
  const piece = store.mission.pieces.find(p => p.id === source.pieceId);
  if (!piece) return;
  
  const sourceElement = piece.descriptions.find(d => d.id === source.elementId);
  if (!sourceElement) return;
  
  // Copier depuis la source vers l'élément actuel
  copyElementData(sourceElement, ur);
  
  saveMission();
  closeDescOverlay();
  renderUREditForm(ur);
  
  alert(`✅ Données importées depuis "${source.pieceName} - ${source.elementName}"`);
}

/**
 * Copie les données d'un élément source vers un élément cible
 * (tout sauf photos et id)
 */
function copyElementData(source, target) {
  // Copier les propriétés de base
  target.type = source.type;
  target.substrat = source.substrat;
  target.revetement = source.revetement;
  
  // Copier la localisation (repères)
  target.localisation = {
    items: [...(source.localisation?.items || [])]
  };
  
  // Copier plombByLoc (mesures, dégradations, observations, PE, déclenchante)
  target.plombByLoc = {};
  
  if (source.plombByLoc) {
    Object.keys(source.plombByLoc).forEach(loc => {
      const sourceEntry = source.plombByLoc[loc];
      
      target.plombByLoc[loc] = {
        mesures: [...(sourceEntry.mesures || [])],
        degradation: sourceEntry.degradation,
        observation: sourceEntry.observation || "",
        isPE: sourceEntry.isPE || false,
        isDeclenchante: sourceEntry.isDeclenchante || false,
        photoId: null // Ne PAS copier les photos
      };
    });
  }
  
  // Ne PAS copier : photos, id
}

/**
 * Étendre toute la pièce vers d'autres pièces
 */
function openExtendPiece() {
  const pieceId = store.ui?.currentDescriptionPieceId;
  const piece = store.mission?.pieces.find(p => p.id === pieceId);
  
  if (!piece) return;
  
  // Liste des autres pièces
  const otherPieces = store.mission.pieces.filter(p => p.id !== pieceId);
  
  if (otherPieces.length === 0) {
    alert('Aucune autre pièce disponible.');
    return;
  }
  
  closeDescOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-content extend-import-selector">
      <h3>📤 Étendre "${piece.nom}" à :</h3>
      <p class="small muted">Tous les éléments de cette pièce seront copiés</p>
      
      <div class="extend-list" id="extend-piece-list">
        ${otherPieces.map((p, idx) => `
          <label class="extend-item">
            <input type="checkbox" value="${idx}" class="extend-piece-checkbox">
            <div class="extend-info">
              <strong>${p.batiment || "?"} - ${p.nom || "?"}</strong>
              <span class="small">${p.descriptions?.length || 0} élément(s)</span>
            </div>
          </label>
        `).join('')}
      </div>
      
      <div class="extend-summary">
        <strong>Total :</strong> <span id="extend-piece-count">0</span> pièce(s) sélectionnée(s)
      </div>
      
      <button class="primary" onclick="confirmExtendPiece(${JSON.stringify(otherPieces.map(p => p.id)).replace(/"/g, '&quot;')})">
        ✅ Copier vers les pièces sélectionnées
      </button>
      <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Ajouter écouteurs
  document.querySelectorAll('.extend-piece-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const count = document.querySelectorAll('.extend-piece-checkbox:checked').length;
      document.getElementById('extend-piece-count').textContent = count;
    });
  });
}

/**
 * Confirme l'extension de la pièce
 */
function confirmExtendPiece(pieceIds) {
  const pieceId = store.ui?.currentDescriptionPieceId;
  const sourcePiece = store.mission?.pieces.find(p => p.id === pieceId);
  
  if (!sourcePiece) return;
  
  // Récupérer les indices cochés
  const selectedIndices = Array.from(document.querySelectorAll('.extend-piece-checkbox:checked'))
    .map(cb => parseInt(cb.value));
  
  if (selectedIndices.length === 0) {
    alert('Aucune pièce sélectionnée');
    return;
  }
  
  let totalCopied = 0;
  
  selectedIndices.forEach(idx => {
    const targetPieceId = pieceIds[idx];
    const targetPiece = store.mission.pieces.find(p => p.id === targetPieceId);
    if (!targetPiece) return;
    
    // Pour chaque élément de la pièce source
    (sourcePiece.descriptions || []).forEach(sourceElement => {
      // Chercher élément du même type dans la cible
      let targetElement = (targetPiece.descriptions || []).find(d => d.type === sourceElement.type);
      
      if (targetElement) {
        // Existe → Copier
        copyElementData(sourceElement, targetElement);
        totalCopied++;
      } else {
        // N'existe pas → Créer
        targetPiece.descriptions = targetPiece.descriptions || [];
        const newElement = {
          id: crypto.randomUUID(),
          photos: []
        };
        copyElementData(sourceElement, newElement);
        targetPiece.descriptions.push(newElement);
        totalCopied++;
      }
    });
  });
  
  saveMission();
  closeDescOverlay();
  
  alert(`✅ ${totalCopied} élément(s) copié(s) vers ${selectedIndices.length} pièce(s)`);
}

/**
 * Importer depuis une autre pièce
 */
function openImportPiece() {
  const pieceId = store.ui?.currentDescriptionPieceId;
  const piece = store.mission?.pieces.find(p => p.id === pieceId);
  
  if (!piece) return;
  
  // Liste des autres pièces
  const otherPieces = store.mission.pieces.filter(p => p.id !== pieceId);
  
  if (otherPieces.length === 0) {
    alert('Aucune autre pièce disponible.');
    return;
  }
  
  closeDescOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="overlay-content extend-import-selector">
      <h3>📥 Importer depuis une pièce :</h3>
      <p class="small muted">Tous les éléments de la pièce source seront copiés</p>
      
      <div class="import-list" id="import-piece-list">
        ${otherPieces.map((p, idx) => `
          <label class="import-item">
            <input type="radio" name="import-piece-source" value="${idx}" class="import-piece-radio">
            <div class="import-info">
              <strong>${p.batiment || "?"} - ${p.nom || "?"}</strong>
              <span class="small">${p.descriptions?.length || 0} élément(s)</span>
            </div>
          </label>
        `).join('')}
      </div>
      
      <button class="primary" onclick="confirmImportPiece(${JSON.stringify(otherPieces.map(p => p.id)).replace(/"/g, '&quot;')})">
        ✅ Importer depuis la pièce sélectionnée
      </button>
      <button class="secondary" onclick="closeDescOverlay()">Annuler</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

/**
 * Confirme l'import depuis une pièce
 */
function confirmImportPiece(pieceIds) {
  const pieceId = store.ui?.currentDescriptionPieceId;
  const targetPiece = store.mission?.pieces.find(p => p.id === pieceId);
  
  if (!targetPiece) return;
  
  // Récupérer la pièce source sélectionnée
  const selectedRadio = document.querySelector('input[name="import-piece-source"]:checked');
  
  if (!selectedRadio) {
    alert('Aucune pièce sélectionnée');
    return;
  }
  
  const idx = parseInt(selectedRadio.value);
  const sourcePieceId = pieceIds[idx];
  const sourcePiece = store.mission.pieces.find(p => p.id === sourcePieceId);
  
  if (!sourcePiece) return;
  
  let totalCopied = 0;
  
  // Pour chaque élément de la pièce source
  (sourcePiece.descriptions || []).forEach(sourceElement => {
    // Chercher élément du même type dans la cible
    let targetElement = (targetPiece.descriptions || []).find(d => d.type === sourceElement.type);
    
    if (targetElement) {
      // Existe → Copier
      copyElementData(sourceElement, targetElement);
      totalCopied++;
    } else {
      // N'existe pas → Créer
      targetPiece.descriptions = targetPiece.descriptions || [];
      const newElement = {
        id: crypto.randomUUID(),
        photos: []
      };
      copyElementData(sourceElement, newElement);
      targetPiece.descriptions.push(newElement);
      totalCopied++;
    }
  });
  
  saveMission();
  closeDescOverlay();
  renderDescriptionScreen();
  
  alert(`✅ ${totalCopied} élément(s) importé(s) depuis "${sourcePiece.batiment} - ${sourcePiece.nom}"`);
}

// Exposer les fonctions
window.openExtendElement = openExtendElement;
window.confirmExtendElement = confirmExtendElement;
window.openImportElement = openImportElement;
window.confirmImportElement = confirmImportElement;
window.openExtendPiece = openExtendPiece;
window.confirmExtendPiece = confirmExtendPiece;
window.openImportPiece = openImportPiece;
window.confirmImportPiece = confirmImportPiece;

