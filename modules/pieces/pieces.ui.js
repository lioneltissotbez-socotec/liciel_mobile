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
        ${!p.visite ? "<span class='warn'>Non visitée</span>" : ""}
      </div>
    `).join("")}
  `;
}

function addPiece() {
  const piece = createPiece();
  store.mission.pieces.push(piece);
  saveMission();
  editPiece(piece.id);
}

function editPiece(id) {
  const p = store.mission.pieces.find(x => x.id === id);
  const screen = document.getElementById("screen-pieces");

  screen.innerHTML = `
    <label>Bâtiment</label>
    <input value="${p.batiment}" oninput="pBatiment(this.value)">

    <label>Pièce</label>
    <input value="${p.nom}" oninput="pNom(this.value)">

    <label>Visite</label>
    <select onchange="pVisite(this.value)">
      <option value="oui" ${p.visite ? "selected" : ""}>Visitée</option>
      <option value="non" ${!p.visite ? "selected" : ""}>Non visitée</option>
    </select>

    ${!p.visite ? `
      <label>Justification</label>
      <textarea oninput="pJustif(this.value)">${p.justification}</textarea>

      <label>Moyens à mettre en œuvre</label>
      <textarea oninput="pMoyens(this.value)">${p.moyens}</textarea>
    ` : ""}

    <label>Photos</label>
    <input type="file" accept="image/*" capture="environment"
           onchange="pPhoto(this.files[0])">

    <div class="photos">
      ${p.photos.map(ph => `<span>${ph.name}</span>`).join("")}
    </div>

    <button class="secondary" onclick="renderPiecesScreen()">⬅ Retour</button>
  `;

  window.currentPiece = p;
}

/* champs */

function pBatiment(v) {
  currentPiece.batiment = v;
  saveMission();
}
function pNom(v) {
  currentPiece.nom = v;
  saveMission();
}
function pVisite(v) {
  currentPiece.visite = (v === "oui");
  if (currentPiece.visite) {
    currentPiece.justification = "";
    currentPiece.moyens = "";
  }
  saveMission();
  editPiece(currentPiece.id);
}
function pJustif(v) {
  currentPiece.justification = v;
  saveMission();
}
function pMoyens(v) {
  currentPiece.moyens = v;
  saveMission();
}
function pPhoto(file) {
  if (!file) return;
  currentPiece.photos.push({
    name: file.name,
    blob: file
  });
  saveMission();
  editPiece(currentPiece.id);
}
