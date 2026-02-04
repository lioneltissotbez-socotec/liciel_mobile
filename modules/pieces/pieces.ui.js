// ======================================================
// pieces.ui.js
// Gestion des pièces + photos (via mission.photos)
// ======================================================

function renderPiecesScreen() {
  const screen = document.getElementById("screen-pieces");

  if (!store.mission) {
    screen.innerHTML = "<p>Aucune mission active</p>";
    return;
  }

  store.ui = store.ui || {};
  store.ui.piecesOpen = store.ui.piecesOpen || {};

  // Regroupement par bâtiment
  const byBatiment = {};
  store.mission.pieces.forEach(p => {
    const b = (p.batiment || "Bâtiment non renseigné").trim();
    if (!byBatiment[b]) byBatiment[b] = [];
    byBatiment[b].push(p);
  });

  let html = `<button class="primary" onclick="addPiece()">➕ Ajouter une pièce</button>`;
  html += `<button class="secondary" onclick="go(\x27settings\x27)" style="margin-top: 10px;">⚙️ Paramètres Mission</button>`;
  
  // Info template si utilisé
  if (store.mission.contexte && store.mission.contexte.templatesUtilises) {
    html += `
      <div class="template-info">
        <p>📋 Modèle : <strong>${store.mission.contexte.label}</strong></p>
      </div>
    `;
  }

  Object.keys(byBatiment).forEach(batiment => {
    const pieces = byBatiment[batiment];
    const open = store.ui.piecesOpen[batiment] === true;

    html += `
      <div class="batiment-header">
        <span onclick="toggleBatiment('${encodeURIComponent(batiment)}')">
          ${open ? "▾" : "▸"} ${batiment}
        </span>
        <span class="count">(${pieces.length})</span>
        <span onclick="addPieceInSameBatiment('${encodeURIComponent(batiment)}')" title="Ajouter une pièce">➕</span>
        <span onclick="renameBatiment('${encodeURIComponent(batiment)}')">✏️</span>
        <span onclick="deleteBatiment('${encodeURIComponent(batiment)}')">🗑</span>
      </div>
    `;

    if (open) {
      pieces.forEach(p => {
        const nbPhotos = countPhotosForComponent(p.id);

        html += `
          <div class="card piece-card">
            <div class="piece-left">
              <span
                class="piece-desc-btn"
                title="Description de la pièce"
                onclick="openPieceDescription('${p.id}')"
              >
                🧱
                <span class="piece-desc-count">
                  ${p.descriptions ? p.descriptions.length : 0}
                </span>
              </span>
            </div>

            <div class="piece-center" onclick="editPiece('${p.id}')">
              <div class="piece-text">${p.nom || "Nouvelle pièce"}</div>
            </div>

            <div class="card-icons">
              ${!p.visite ? (() => {
                const hasJustif = p.justification && p.justification.trim() !== "";
                const hasMoyen = p.moyens && p.moyens.trim() !== "";
                const warnClass = (hasJustif && hasMoyen) ? "warn warn-ok" : "warn warn-missing";
                const title = (hasJustif && hasMoyen) 
                  ? "Non visite justifiée - Cliquer pour marquer visitée" 
                  : "Non visite NON justifiée - Cliquer pour marquer visitée";
                return `<span class='${warnClass}' onclick="markPieceAsVisited('${p.id}')" title="${title}">⚠️</span>`;
              })() : ""}
              ${nbPhotos ? `<span title="${nbPhotos} photo(s)">📷</span>` : ""}
              <span title="Supprimer" onclick="deletePiece('${p.id}')">🗑</span>
            </div>
          </div>
        `;
      });
    }
  });

  screen.innerHTML = html;
}

function toggleBatiment(encodedBatiment) {
  const batiment = decodeURIComponent(encodedBatiment);
  store.ui.piecesOpen[batiment] = !store.ui.piecesOpen[batiment];
  renderPiecesScreen();
}

// ======================================================
// ÉDITION PIÈCE
// ======================================================

function addPiece() {
  const lastBatiment =
    store.mission.pieces.length > 0
      ? store.mission.pieces[store.mission.pieces.length - 1].batiment
      : "";

  const p = createPiece(lastBatiment);
  p._isNew = true; // ✅ Marquer comme nouvelle
  
  store.mission.pieces.push(p);
  saveMission();
  
  editPiece(p.id);
}

function editPiece(id) {
  const p = store.mission.pieces.find(x => x.id === id);
  window.currentPiece = p;

  if (!p) return;

  const photos = getPhotosForComponent(p.id);
  const screen = document.getElementById("screen-pieces");

  screen.innerHTML = `
    <label>Bâtiment</label>
    <div class="input-row">
      <input value="${p.batiment}" oninput="pBat(this.value)">
      <button class="icon" onclick="openPieceList('batiment')">📋</button>
    </div>

    <label>Pièce</label>
    <div class="input-row">
      <input value="${p.nom}" oninput="pNom(this.value)">
      <button class="icon" onclick="openPieceList('piece')">📋</button>
    </div>

    <label>Visite</label>
    <div class="input-row">
      <select onchange="pVisite(this.value)">
        <option value="oui" ${p.visite ? "selected" : ""}>Visitée</option>
        <option value="non" ${!p.visite ? "selected" : ""}>Non visitée</option>
      </select>
    </div>

    ${!p.visite ? `
      <label>Justification</label>
      <div class="input-row">
        <textarea oninput="pJustif(this.value)">${p.justification || ""}</textarea>
        <button class="icon" onclick="openPieceList('justification')">📋</button>
      </div>

      <label>Moyens à mettre en œuvre</label>
      <div class="input-row">
        <textarea oninput="pMoyens(this.value)">${p.moyens || ""}</textarea>
        <button class="icon" onclick="openPieceList('moyens')">📋</button>
      </div>
    ` : ""}

    <label>Photo</label>
    <input type="file" accept="image/*" capture="environment" onchange="pPhoto(this.files[0])">

    <div class="photos">
      ${photos.map(ph => `
        <div class="photo-row">
          <img
            src="${URL.createObjectURL(ph.blob)}"
            class="photo-thumb photo-thumb-large"
            onclick="openPhotoPreview('${ph.id}')"
          >
          <div class="photo-actions">
            <button onclick="replaceGlobalPhoto('${ph.id}')">🖊</button>
            <button onclick="deleteGlobalPhoto('${ph.id}')">🗑</button>
          </div>
        </div>
      `).join("")}
    </div>

    <button class="primary" onclick="validatePiece('${p.id}')">✅ Valider</button>
    <button class="secondary" onclick="cancelPieceEdit('${p.id}')">⬅ Annuler</button>
  `;
}

// ======================================================
// MUTATEURS PIÈCE
// ======================================================

function pBat(v){ 
  currentPiece.batiment = v; 
  if (!currentPiece._isNew) {
    saveMission(); 
  }
}

function pNom(v){ 
  currentPiece.nom = v; 
  if (!currentPiece._isNew) {
    saveMission(); 
  }
}

function pVisite(v){
  currentPiece.visite = v === "oui";
  if (currentPiece.visite) {
    currentPiece.justification = "";
    currentPiece.moyens = "";
  }
  
  if (!currentPiece._isNew) {
    saveMission();
  }
  
  editPiece(currentPiece.id);
}

function pJustif(v){ 
  currentPiece.justification = v; 
  if (!currentPiece._isNew) {
    saveMission(); 
  }
}

function pMoyens(v){ 
  currentPiece.moyens = v; 
  if (!currentPiece._isNew) {
    saveMission(); 
  }
}

// ======================================================
// PHOTOS — MODE GLOBAL
// ======================================================

async function pPhoto(file) {
  if (!file) return;

  try {
    // Compression de la photo
    const { compressed, saved } = await PhotoCompressor.processPhoto(file);
    
    store.mission.photos = store.mission.photos || [];

    store.mission.photos.push({
      id: crypto.randomUUID(),
      name: file.name,
      blob: compressed,
      domaine: "piece",
      clefComposant: currentPiece.id,
      localisation: `${currentPiece.batiment || "?"} – ${currentPiece.nom || "?"}`
    });

    if (saved) {
      console.log('✅ Photo ajoutée (photo compressée et sauvegardée)');
    }

    saveMission();
    editPiece(currentPiece.id);
    
  } catch (error) {
    console.error('❌ Erreur ajout photo pièce:', error);
    alert('Erreur lors de l\'ajout de la photo');
  }
}

function getPhotosForComponent(componentId) {
  return (store.mission.photos || [])
    .filter(p => p.clefComposant === componentId);
}

function countPhotosForComponent(componentId) {
  return getPhotosForComponent(componentId).length;
}

function replaceGlobalPhoto(photoId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const ph = store.mission.photos.find(p => p.id === photoId);
    if (!ph) return;

    ph.name = file.name;
    ph.blob = file;

    saveMission();
    editPiece(currentPiece.id);
  };

  input.click();
}

function openPhotoPreview(photoId) {
  const ph = store.mission.photos.find(p => p.id === photoId);
  if (!ph) return;

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content">
      <img src="${URL.createObjectURL(ph.blob)}" style="width:100%">
      <button class="secondary" onclick="closeOverlay()">Fermer</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ======================================================
// DIVERS
// ======================================================

function deletePiece(id) {
  if (!confirm("Supprimer cette pièce ?")) return;

  store.mission.pieces = store.mission.pieces.filter(p => p.id !== id);
  store.mission.photos = store.mission.photos.filter(ph => ph.clefComposant !== id);

  saveMission();
  renderPiecesScreen();
}

function deleteBatiment(encodedBatiment) {
  const batiment = decodeURIComponent(encodedBatiment);

  if (!confirm(`Supprimer le bâtiment "${batiment}" et toutes ses pièces ?`)) return;

  const pieceIds = store.mission.pieces
    .filter(p => p.batiment === batiment)
    .map(p => p.id);

  store.mission.pieces = store.mission.pieces.filter(p => p.batiment !== batiment);
  store.mission.photos = store.mission.photos.filter(ph => !pieceIds.includes(ph.clefComposant));

  saveMission();
  renderPiecesScreen();
}

function renameBatiment(encodedBatiment) {
  const oldName = decodeURIComponent(encodedBatiment);
  const newName = prompt("Nouveau nom du bâtiment :", oldName);
  if (!newName || newName.trim() === oldName) return;

  store.mission.pieces.forEach(p => {
    if ((p.batiment || "").trim() === oldName) {
      p.batiment = newName.trim();
    }
  });

  const wasOpen = store.ui.piecesOpen?.[oldName];
  delete store.ui.piecesOpen?.[oldName];
  store.ui.piecesOpen[newName] = wasOpen;

  saveMission();
  renderPiecesScreen();
}

function getCurrentPiece() {
  return window.currentPiece || null;
}

function openPieceDescription(pieceId) {
  store.ui.currentDescriptionPieceId = pieceId;
  go("description");
}

// ======================================================
// BIBLIOTHÈQUES (LISTES DICTIONNAIRES)
// ======================================================

function openPieceList(type) {
  const map = {
    piece: "pieces",
    batiment: "batiments",
    justification: "justifications",
    moyens: "moyens"
  };

  const dictKey = map[type];
  
  if (!dictKey) {
    alert(`Type de liste inconnu : ${type}`);
    return;
  }
  
  const dict = store.dict?.[dictKey];
  
  if (!dict) {
    alert(`Dictionnaire introuvable : ${dictKey}`);
    return;
  }
  
  if (!Array.isArray(dict.items) || !dict.items.length) {
    alert(`Liste indisponible : ${dictKey}`);
    return;
  }

  // MODE SPÉCIAL : Sélection multiple pour les pièces
  if (type === "piece") {
    openMultiPieceSelector(dict);
    return;
  }

  // MODE NORMAL : Sélection simple pour les autres types
  closeOverlay();

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content">
      <h3>${dict.label}</h3>
      ${dict.items.map(o => `
        <button onclick="selectFromPieceList('${type}', '${escapeForHTML(o.label)}')">
          ${o.label}
        </button>
      `).join("")}
      <button class="secondary" onclick="closeOverlay()">Annuler</button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function escapeForHTML(str) {
  return (str || "")
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ======================================================
// SÉLECTION MULTIPLE DE PIÈCES
// ======================================================

function openMultiPieceSelector(dict) {
  window.pieceCounter = window.pieceCounter || {};
  window.pieceListAlphabeticalSort = window.pieceListAlphabeticalSort || false;
  
  closeOverlay();

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  
  const content = document.createElement("div");
  content.className = "overlay-content multi-piece-selector";
  
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.marginBottom = "12px";
  
  const title = document.createElement("h3");
  title.textContent = "Sélection des pièces";
  title.style.margin = "0";
  
  const sortBtn = document.createElement("button");
  sortBtn.className = "sort-btn";
  sortBtn.innerHTML = window.pieceListAlphabeticalSort ? "🔤 A→Z" : "📋 Liste";
  sortBtn.title = window.pieceListAlphabeticalSort ? "Ordre d'origine" : "Trier A→Z";
  sortBtn.style.width = "auto";
  sortBtn.style.padding = "8px 12px";
  sortBtn.style.fontSize = "14px";
  sortBtn.style.marginBottom = "0";
  sortBtn.addEventListener("click", () => {
    window.pieceListAlphabeticalSort = !window.pieceListAlphabeticalSort;
    openMultiPieceSelector(dict);
  });
  
  header.appendChild(title);
  header.appendChild(sortBtn);
  content.appendChild(header);
  
  const instructions = document.createElement("p");
  instructions.className = "small muted";
  instructions.innerHTML = `
    • Premier <strong>+</strong> = 1 pièce sans index<br>
    • Deuxième <strong>+</strong> = 1 pièce avec index (01)<br>
    • Troisième <strong>+</strong> et plus = plusieurs pièces indexées
  `;
  content.appendChild(instructions);
  
  const listContainer = document.createElement("div");
  listContainer.className = "multi-piece-list";
  listContainer.id = "multi-piece-list";
  
  let itemsToDisplay = [...dict.items];
  if (window.pieceListAlphabeticalSort) {
    itemsToDisplay.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }
  
  itemsToDisplay.forEach(item => {
    const count = window.pieceCounter[item.label];
    const hasValue = count !== undefined && count !== null;
    
    const row = document.createElement("div");
    row.className = "multi-piece-row";
    row.dataset.piece = item.label;
    if (hasValue && count >= 0) row.classList.add("selected");
    
    const nameDiv = document.createElement("div");
    nameDiv.className = "multi-piece-name";
    nameDiv.textContent = item.label;
    
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "multi-piece-controls";
    
    const listePieces = store.mission?.contexte?.listePieces || 'standard';
    const hideIndexation = (listePieces === 'unicil' || listePieces === 'odhac87');
    
    if (hideIndexation) {
      nameDiv.style.cursor = "pointer";
      nameDiv.style.userSelect = "none";
      
      nameDiv.addEventListener("mouseenter", () => {
        if (!row.classList.contains("selected")) {
          nameDiv.style.backgroundColor = "#f0f0f0";
        }
      });
      nameDiv.addEventListener("mouseleave", () => {
        nameDiv.style.backgroundColor = "";
      });
      
      nameDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        
        const currentCount = window.pieceCounter[item.label];
        const isSelected = (currentCount !== undefined && currentCount !== null);
        
        if (isSelected) {
          delete window.pieceCounter[item.label];
          row.classList.remove("selected");
        } else {
          window.pieceCounter[item.label] = 0;
          row.classList.add("selected");
        }
        updateMultiPieceSummary();
      });
    }
    
    const btnMinus = document.createElement("button");
    btnMinus.className = "counter-btn";
    btnMinus.textContent = "−";
    btnMinus.addEventListener("click", () => decrementPiece(item.label));
    if (hideIndexation) btnMinus.style.display = "none";
    
    const counterSpan = document.createElement("span");
    counterSpan.className = "counter-value";
    counterSpan.id = `counter-${item.id}`;
    counterSpan.textContent = hasValue ? count : "";
    counterSpan.style.minWidth = "30px";
    if (hideIndexation) counterSpan.style.display = "none";
    
    const btnPlus = document.createElement("button");
    btnPlus.className = "counter-btn";
    btnPlus.textContent = "+";
    btnPlus.addEventListener("click", () => incrementPiece(item.label));
    if (hideIndexation) btnPlus.style.display = "none";
    
    controlsDiv.appendChild(btnMinus);
    controlsDiv.appendChild(counterSpan);
    controlsDiv.appendChild(btnPlus);
    
    row.appendChild(nameDiv);
    row.appendChild(controlsDiv);
    listContainer.appendChild(row);
  });
  
  content.appendChild(listContainer);
  
  const summary = document.createElement("div");
  summary.className = "multi-piece-summary";
  summary.id = "multi-piece-summary";
  summary.innerHTML = `<strong>Total :</strong> <span id="total-pieces-count">0</span> pièce(s) à ajouter`;
  content.appendChild(summary);
  
  const btnAdd = document.createElement("button");
  btnAdd.className = "primary";
  btnAdd.textContent = "✅ Ajouter les pièces";
  btnAdd.addEventListener("click", addMultiplePieces);
  
  const btnCancel = document.createElement("button");
  btnCancel.className = "secondary";
  btnCancel.textContent = "Annuler";
  btnCancel.addEventListener("click", cancelMultiPieceSelection);
  
  content.appendChild(btnAdd);
  content.appendChild(btnCancel);
  
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  
  updateMultiPieceSummary();
}

function incrementPiece(pieceName) {
  window.pieceCounter = window.pieceCounter || {};
  
  const current = window.pieceCounter[pieceName];
  
  if (current === undefined || current === null) {
    window.pieceCounter[pieceName] = 0;
  } else {
    window.pieceCounter[pieceName] = current + 1;
  }
  
  updateMultiPieceDisplay(pieceName);
  updateMultiPieceSummary();
}

function decrementPiece(pieceName) {
  window.pieceCounter = window.pieceCounter || {};
  
  const current = window.pieceCounter[pieceName];
  
  if (current === undefined || current === null) {
    return;
  }
  
  if (current === 0) {
    delete window.pieceCounter[pieceName];
  } else {
    window.pieceCounter[pieceName] = current - 1;
  }
  
  updateMultiPieceDisplay(pieceName);
  updateMultiPieceSummary();
}

function updateMultiPieceDisplay(pieceName) {
  const row = document.querySelector(`[data-piece="${pieceName}"]`);
  if (!row) return;
  
  const counter = row.querySelector('.counter-value');
  if (counter) {
    const count = window.pieceCounter[pieceName];
    const hasValue = count !== undefined && count !== null;
    
    counter.textContent = hasValue ? count : "";
    
    if (hasValue) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  }
}

function updateMultiPieceSummary() {
  const totalElement = document.getElementById('total-pieces-count');
  if (!totalElement) return;
  
  let total = 0;
  Object.entries(window.pieceCounter || {}).forEach(([name, count]) => {
    if (count !== undefined && count !== null) {
      if (count === 0) {
        total += 1;
      } else {
        total += count;
      }
    }
  });
  
  totalElement.textContent = total;
}

function addMultiplePieces() {
  const p = getCurrentPiece();
  if (!p) return;
  
  const batiment = p.batiment;
  const pieceCounter = window.pieceCounter || {};
  
  // ✅ Supprimer la pièce temporaire si elle existe et est vide
  if (p._isNew) {
    const isEmpty = !p.nom || p.nom.trim() === "" || p.nom === "Nouvelle pièce";
    if (isEmpty) {
      store.mission.pieces = store.mission.pieces.filter(piece => piece.id !== p.id);
      console.log('🗑️ Pièce temporaire supprimée');
    }
  }
  
  let totalAdded = 0;
  
  Object.entries(pieceCounter).forEach(([pieceName, count]) => {
    if (count === undefined || count === null) return;
    
    if (count === 0) {
      const newPiece = createPiece(batiment);
      newPiece.nom = pieceName;
      store.mission.pieces.push(newPiece);
      totalAdded++;
    } else {
      for (let i = 1; i <= count; i++) {
        const indexedName = `${pieceName} ${String(i).padStart(2, '0')}`;
        const newPiece = createPiece(batiment);
        newPiece.nom = indexedName;
        store.mission.pieces.push(newPiece);
        totalAdded++;
      }
    }
  });
  
  window.pieceCounter = {};
  window.currentPiece = null; // ✅ Nettoyer la référence
  
  saveMission();
  closeOverlay();
  renderPiecesScreen();
  
  if (totalAdded > 0) {
    console.log(`✅ ${totalAdded} pièce(s) ajoutée(s)`);
  }
}

function cancelMultiPieceSelection() {
  window.pieceCounter = {};
  closeOverlay();
}

function selectFromPieceList(type, value) {
  const p = getCurrentPiece();
  if (!p) return;

  if (type === "piece") p.nom = value;
  if (type === "batiment") p.batiment = value;
  if (type === "justification") p.justification = value;
  if (type === "moyens") p.moyens = value;

  saveMission();
  closeOverlay();
  editPiece(p.id);
}

function closeOverlay() {
  document.querySelector(".overlay")?.remove();
}

// ======================================================
// GESTION NOUVELLE PIÈCE
// ======================================================

function addPieceInSameBatiment(encodedBatiment) {
  const batiment = decodeURIComponent(encodedBatiment);
  
  const p = createPiece(batiment);
  p._isNew = true;
  
  store.mission.pieces.push(p);
  saveMission();
  
  editPiece(p.id);
}

function validatePiece(pieceId) {
  const piece = window.currentPiece;
  
  if (!piece) {
    renderPiecesScreen();
    return;
  }
  
  if (piece._isNew) {
    const hasValidName = piece.nom && piece.nom.trim() !== "" && piece.nom !== "Nouvelle pièce";
    
    if (!hasValidName) {
      store.mission.pieces = store.mission.pieces.filter(p => p.id !== piece.id);
      store.mission.photos = store.mission.photos.filter(ph => ph.clefComposant !== piece.id);
      
      saveMission();
      alert("Veuillez saisir un nom de pièce");
      renderPiecesScreen();
      return;
    }
    
    delete piece._isNew;
    saveMission();
  } else {
    saveMission();
  }
  
  window.currentPiece = null;
  renderPiecesScreen();
}

function cancelPieceEdit(pieceId) {
  const piece = window.currentPiece;
  
  if (piece && piece._isNew) {
    store.mission.pieces = store.mission.pieces.filter(p => p.id !== piece.id);
    store.mission.photos = store.mission.photos.filter(ph => ph.clefComposant !== piece.id);
    
    saveMission();
    window.currentPiece = null;
  } else {
    saveMission();
  }
  
  renderPiecesScreen();
}

function markPieceAsVisited(pieceId) {
  const piece = store.mission?.pieces.find(p => p.id === pieceId);
  if (!piece) return;
  
  piece.visite = true;
  saveMission();
  renderPiecesScreen();
}

// Exposer les fonctions
window.validatePiece = validatePiece;
window.cancelPieceEdit = cancelPieceEdit;
window.addPieceInSameBatiment = addPieceInSameBatiment;
window.markPieceAsVisited = markPieceAsVisited;