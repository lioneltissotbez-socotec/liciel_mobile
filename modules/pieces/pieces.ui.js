
function renderPiecesScreen() {
  const screen = document.getElementById("screen-pieces");

  if (!store.mission) {
    screen.innerHTML = "<p>Aucune mission active</p>";
    return;
  }

  screen.innerHTML = `
    <button class="primary" onclick="addPiece()">+ Ajouter une pièce</button>
    ${store.mission.pieces.map(p => `
      <div class="card" onclick="editPiece('${p.id}')">
        <strong>${p.batiment || "?"} – ${p.nom || "Nouvelle pièce"}</strong>
        <div class="card-icons">
          ${p.photos.length ? "📷" : ""}
          ${!p.visite ? "<span class='warn'>⚠️</span>" : ""}
        </div>
      </div>
    `).join("")}
  `;
}

function addPiece() {
  const p = createPiece();
  store.mission.pieces.push(p);
  saveMission();
  editPiece(p.id);
}

function editPiece(id) {
  const p = store.mission.pieces.find(x => x.id === id);
  window.currentPiece = p;

  const screen = document.getElementById("screen-pieces");
  screen.innerHTML = `
    <label>Bâtiment</label>
    <input value="${p.batiment}" oninput="pBat(this.value)">

    <label>Pièce</label>
    <div class="input-row">
      <input value="${p.nom}" oninput="pNom(this.value)">
      <button class="icon" onclick="openList('piece')">📋</button>
    </div>

    <label>Visite</label>
    <select onchange="pVisite(this.value)">
      <option value="oui" ${p.visite ? "selected" : ""}>Visitée</option>
      <option value="non" ${!p.visite ? "selected" : ""}>Non visitée</option>
    </select>

    ${!p.visite ? `
      <label>Justification</label>
      <div class="input-row">
        <textarea oninput="pJustif(this.value)">${p.justification}</textarea>
        <button class="icon" onclick="openList('justification')">📋</button>
      </div>

      <label>Moyens à mettre en œuvre</label>
      <div class="input-row">
        <textarea oninput="pMoyens(this.value)">${p.moyens}</textarea>
        <button class="icon" onclick="openList('moyens')">📋</button>
      </div>
    ` : ""}

    <label>Photo</label>
    <input type="file" accept="image/*" capture="environment" onchange="pPhoto(this.files[0])">

    <div class="photos">${p.photos.map(ph => `<span>${ph.name}</span>`).join("")}</div>

    <button class="primary" onclick="addAnotherPiece()">➕ Ajouter une pièce</button>
    <button class="secondary" onclick="renderPiecesScreen()">✅ Finaliser</button>
  `;
}

function pBat(v){ currentPiece.batiment=v; saveMission(); }
function pNom(v){ currentPiece.nom=v; saveMission(); }
function pVisite(v){
  currentPiece.visite = v === "oui";
  if(currentPiece.visite){ currentPiece.justification=""; currentPiece.moyens=""; }
  saveMission(); editPiece(currentPiece.id);
}
function pJustif(v){ currentPiece.justification=v; saveMission(); }
function pMoyens(v){ currentPiece.moyens=v; saveMission(); }
function pPhoto(file){
  if(!file) return;
  currentPiece.photos.push({name:file.name, blob:file});
  saveMission(); editPiece(currentPiece.id);
}

function addAnotherPiece(){
  const p = createPiece();
  store.mission.pieces.push(p);
  saveMission();
  editPiece(p.id);
}

window.LIST_PIECES = ["Salon","Chambre","Cuisine","Salle de bain","WC"];
window.LIST_JUSTIFICATIONS = ["Accès impossible","Refus occupant","Zone encombrée"];
window.LIST_MOYENS = ["Démontage","Dépose localisée","Destruction"];

function openList(type){
  const lists = {
    piece: LIST_PIECES,
    justification: LIST_JUSTIFICATIONS,
    moyens: LIST_MOYENS
  };

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `
    <div class="overlay-content">
      ${lists[type].map(v => `<button onclick="selectFromList('${type}','${v}')">${v}</button>`).join("")}
      <button class="secondary" onclick="closeOverlay()">Annuler</button>
    </div>`;
  document.body.appendChild(overlay);
}

function selectFromList(type, value){
  if(type==="piece") currentPiece.nom=value;
  if(type==="justification") currentPiece.justification=value;
  if(type==="moyens") currentPiece.moyens=value;
  saveMission();
  closeOverlay();
  editPiece(currentPiece.id);
}

function closeOverlay(){
  document.querySelector(".overlay")?.remove();
}
