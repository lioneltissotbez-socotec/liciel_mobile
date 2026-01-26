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

  Object.keys(byBatiment).forEach(batiment => {
    const pieces = byBatiment[batiment];
    const open = store.ui.piecesOpen[batiment] === true;

    html += `
      <div class="batiment-header">
        <span onclick="toggleBatiment('${encodeURIComponent(batiment)}')">
          ${open ? "▾" : "▸"} ${batiment}
        </span>
        <span class="count">(${pieces.length})</span>
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
              ${!p.visite ? "<span class='warn'>⚠️</span>" : ""}
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
  store.mission.pieces.push(p);
  saveMission();
  editPiece(p.id);
}

function editPiece(id) {
  const p = store.mission.pieces.find(x => x.id === id);
  window.currentPiece = p;

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

    <button class="primary" onclick="addAnotherPiece()">➕ Ajouter une pièce</button>
    <button class="secondary" onclick="renderPiecesScreen()">✅ Finaliser</button>
  `;
}

// ======================================================
// MUTATEURS PIÈCE
// ======================================================

function pBat(v){ currentPiece.batiment=v; saveMission(); }
function pNom(v){ currentPiece.nom=v; saveMission(); }

function pVisite(v){
  currentPiece.visite = v === "oui";
  if (currentPiece.visite) {
    currentPiece.justification = "";
    currentPiece.moyens = "";
  }
  saveMission();
  editPiece(currentPiece.id);
}

function pJustif(v){ currentPiece.justification=v; saveMission(); }
function pMoyens(v){ currentPiece.moyens=v; saveMission(); }

// ======================================================
// PHOTOS — MODE GLOBAL
// ======================================================

function pPhoto(file) {
  if (!file) return;

  store.mission.photos = store.mission.photos || [];

  store.mission.photos.push({
    id: crypto.randomUUID(),
    name: file.name,
    blob: file,

    domaine: "piece",
    clefComposant: currentPiece.id,
    localisation: `${currentPiece.batiment || "?"} – ${currentPiece.nom || "?"}`
  });

  saveMission();
  editPiece(currentPiece.id);
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

function addAnotherPiece(){
  const p = createPiece(currentPiece.batiment);
  store.mission.pieces.push(p);
  saveMission();
  editPiece(p.id);
}

function deletePiece(id) {
  if (!confirm("Supprimer cette pièce ?")) return;

  store.mission.pieces =
    store.mission.pieces.filter(p => p.id !== id);

  // supprimer les photos liées
  store.mission.photos =
    store.mission.photos.filter(ph => ph.clefComposant !== id);

  saveMission();
  renderPiecesScreen();
}

function deleteBatiment(encodedBatiment) {
  const batiment = decodeURIComponent(encodedBatiment);

  if (!confirm(`Supprimer le bâtiment "${batiment}" et toutes ses pièces ?`)) return;

  const pieceIds = store.mission.pieces
    .filter(p => p.batiment === batiment)
    .map(p => p.id);

  store.mission.pieces =
    store.mission.pieces.filter(p => p.batiment !== batiment);

  store.mission.photos =
    store.mission.photos.filter(ph => !pieceIds.includes(ph.clefComposant));

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
  console.log("=== DEBUG openPieceList ===");
  console.log("1. Type reçu:", type);
  
  const map = {
    piece: "pieces",
    batiment: "batiments",
    justification: "justifications",
    moyens: "moyens"
  };

  const dictKey = map[type];
  console.log("2. DictKey mappé:", dictKey);
  
  if (!dictKey) {
    console.error("❌ Type inconnu:", type);
    alert(`Type de liste inconnu : ${type}`);
    return;
  }

  console.log("3. store.dict existe?", !!store.dict);
  console.log("4. Clés disponibles dans store.dict:", store.dict ? Object.keys(store.dict) : "AUCUNE");
  console.log("5. store.dict complet:", store.dict);
  
  const dict = store.dict?.[dictKey];
  console.log("6. Dictionnaire trouvé pour", dictKey, ":", dict);
  
  if (!dict) {
    console.error("❌ Dictionnaire introuvable pour la clé:", dictKey);
    alert(`Dictionnaire introuvable : ${dictKey}`);
    return;
  }
  
  console.log("7. dict.items est un Array?", Array.isArray(dict.items));
  console.log("8. Nombre d'items:", dict.items?.length);
  console.log("9. Items:", dict.items);
  
  if (!Array.isArray(dict.items) || !dict.items.length) {
    console.error("❌ Items invalides ou vides");
    alert(`Liste indisponible : ${dictKey}`);
    return;
  }

  console.log("✅ Affichage de l'overlay");
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

// Fonction plus robuste pour échapper le HTML
function escapeForHTML(str) {
  return (str || "")
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function escapeQuotes(s) {
  return (s || "").replace(/'/g, "\\'");
}

function closeOverlay() {
  document.querySelector(".overlay")?.remove();
}
