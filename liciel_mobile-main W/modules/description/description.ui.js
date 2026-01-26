console.log("✅ description.ui.js chargé");
function renderPlombSummary(ur) {
  const p = ur.plomb;
  if (!p || p.mesure === null || p.mesure === "") return "";

  // Cas non mesuré
  if (p.mesure === "NM") {
    return `<div class="plomb-summary muted">Plomb : Non mesuré</div>`;
  }

  // Cas mesure = 0
  if (Number(p.mesure) === 0) {
    return `<div class="plomb-summary ok">Plomb : 0 mg/cm²</div>`;
  }

  const mesure = p.mesure;
  const incert = p.incertitude ? ` ± ${Number(p.incertitude).toFixed(2)}` : "";
  const degr = p.degradation ? ` — ${p.degradation}` : "";

  return `
    <div class="plomb-summary warn">
      Plomb : ${mesure}${incert} mg/cm²${degr}
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

  screen.innerHTML = `
    <h2>${piece.nom || "Pièce sans nom"}</h2>
    <p><strong>Bâtiment :</strong> ${piece.batiment || "-"}</p>

    <button class="primary" onclick="addUR()">➕ Ajouter un élément</button>

    <div class="ur-list">
      ${
        piece.descriptions.length === 0
          ? "<p class='muted'>Aucun élément décrit</p>"
          : piece.descriptions.map(ur => `
              <div class="card ur-card">
                <div>
                  <strong>${ur.type}</strong>
                  – ${ur.lettres.join(", ")}
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

  ur.plomb = ur.plomb || {
  mode: null,
  mesure: null,
  incertitude: null,
  degradation: null
};

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


    <label>Localisation (lettres)</label>
    <div class="letters">
      ${lettres.map(l => `
        <button
          class="${ur.lettres.includes(l) ? "active" : ""}"
          onclick="urToggleLetter('${l}')">
          ${l}
        </button>
      `).join("")}
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

<h3>Mesure plomb</h3>

<div class="plomb-actions compact">
  <button onclick="plombSetMode('NM')">NM</button>
  <button onclick="plombSetMode('ZERO')">=0</button>
  <button onclick="plombSetMode('LT_03')">&lt;0,3</button>
  <button onclick="plombSetMode('LT_1')">&lt;1</button>
</div>

<label>Mesure plomb (mg/cm²)</label>
<input
  type="text"
  value="${ur.plomb?.mesure ?? ""}"
  oninput="plombSetMesure(this.value)"
  placeholder="ex : 0,42 ou NM"
/>

<div class="plomb-row">
  <div class="plomb-incertitude">
    <label>Incertitude</label>
    <div class="input-row">
      <input
        type="number"
        step="0.01"
        value="${ur.plomb?.incertitude ?? ""}"
        oninput="plombSetIncertitude(this.value)"
      >
      <button
        class="icon"
        title="Calculer 10 %"
        onclick="plombAutoIncertitude()">
        🔄
      </button>
    </div>
  </div>

  <div class="plomb-degradation">
    <label>État de dégradation</label>
    <select onchange="plombSetDegradation(this.value)">
      <option value="">—</option>
      <option ${ur.plomb?.degradation==="Non visible"?"selected":""}>Non visible</option>
      <option ${ur.plomb?.degradation==="Non dégradé"?"selected":""}>Non dégradé</option>
      <option ${ur.plomb?.degradation==="Etat d'usage"?"selected":""}>Etat d'usage</option>
      <option ${ur.plomb?.degradation==="Dégradé"?"selected":""}>Dégradé</option>
    </select>
  </div>
</div>

    <h3>Photos de l’élément</h3>

    <input
      type="file"
      accept="image/*"
      capture="environment"
      onchange="addPhotoToUR(this.files[0])"
    >

    <div class="photos">
      ${
        getPhotosForUR(ur).map(ph => `
          <div class="photo-row">
            <img
              src="${URL.createObjectURL(ph.blob)}"
              class="photo-thumb photo-thumb-large"
              onclick="openURPhotoPreview('${ph.id}')"
            >
            <div class="photo-actions">
              <button onclick="replaceURPhoto('${ph.id}')">🖊</button>
              <button onclick="deleteURPhoto('${ph.id}')">🗑</button>
            </div>
          </div>
        `).join("")
      }
    </div>

    <button class="primary" onclick="renderDescriptionScreen()">✅ Valider</button>
    <button class="secondary" onclick="renderDescriptionScreen()">⬅ Annuler</button>
  `;
}

function plombSetMode(mode) {
  const ur = getEditingUR();
  if (!ur) return;

  ur.plomb = ur.plomb || {};
  ur.plomb.mode = mode;

  // NON MESURÉ
  if (mode === "NM") {
    ur.plomb.mesure = "NM";
    ur.plomb.incertitude = null;
    ur.plomb.degradation = null;
  }

  // MESURE = 0
  if (mode === "ZERO") {
    ur.plomb.mesure = 0;
    ur.plomb.incertitude = 0;
    ur.plomb.degradation = null;
  }

  // < 0,3 mg/cm² → random 0,11 → 0,29
  if (mode === "LT_03") {
    const m = randomBetween(0.11, 0.29);
    ur.plomb.mesure = m;
    ur.plomb.incertitude = computeIncertitude(m);
    ur.plomb.degradation = null;
  }

  // < 1 mg/cm² → random 0,31 → 0,99
  if (mode === "LT_1") {
    const m = randomBetween(0.31, 0.99);
    ur.plomb.mesure = m;
    ur.plomb.incertitude = computeIncertitude(m);
    ur.plomb.degradation = null;
  }

  saveMission();
  renderUREditForm(ur);
}

function plombSetMesure(v) {
  const ur = getEditingUR();
  if (!ur) return;

  ur.plomb.mesure = v;
  saveMission();
}

function plombSetIncertitude(v) {
  const ur = getEditingUR();
  if (!ur) return;

  ur.plomb = ur.plomb || {};

  if (v === "" || v === null || typeof v === "undefined") {
    ur.plomb.incertitude = null;
  } else {
    ur.plomb.incertitude = Number(v);
  }

  saveMission();
}

function plombAutoIncertitude() {
  const ur = getEditingUR();
  if (!ur) return;

  ur.plomb = ur.plomb || {};

  // Si NM => pas d'incertitude
  if (String(ur.plomb.mesure || "").toUpperCase() === "NM") {
    ur.plomb.incertitude = null;
    saveMission();
    renderUREditForm(ur);
    return;
  }

  // Convertit "0,42" -> 0.42
  const raw = String(ur.plomb.mesure ?? "").trim().replace(",", ".");
  const m = parseFloat(raw);

  // Si non numérique => ne rien faire (ou tu peux mettre null)
  if (!isFinite(m)) {
    alert("Mesure invalide : saisis une valeur numérique (ex: 0,42) ou NM.");
    return;
  }

  // Règle: incertitude = 10% de la mesure
  const inc = m * 0.10;

  // Arrondi (à ajuster si tu veux 2 décimales strictes)
  ur.plomb.incertitude = Number(inc.toFixed(2));

  saveMission();
  renderUREditForm(ur);
}

// 🔥 Rend la fonction accessible depuis onclick=""
window.plombAutoIncertitude = plombAutoIncertitude;

function plombSetDegradation(v) {
  const ur = getEditingUR();
  if (!ur) return;

  ur.plomb.degradation = v || null;
  saveMission();
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

function addPhotoToUR(file) {
  if (!file) return;

  const ur = getEditingUR();
  if (!ur) return;

  const photoId = crypto.randomUUID();

  const photo = {
    id: photoId,
    name: file.name,
    blob: file,
    clefComposant: ur.id,
    domaine: "description",
    localisation: `${ur.type} ${ur.lettres.join(",")}`
  };

  store.mission.photos.push(photo);

  ur.photos = ur.photos || [];
  ur.photos.push(photoId);

  saveMission();
  renderUREditForm(ur);
}

function replaceURPhoto(photoId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const photo = store.mission.photos.find(p => p.id === photoId);
    if (!photo) return;

    photo.name = file.name;
    photo.blob = file;

    saveMission();
    renderUREditForm(getEditingUR());
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

function randomFloat(min, max, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function plombComputeIncertitude() {
  const ur = getEditingUR();
  if (!ur || !ur.plomb) return;

  const mesure = parseFloat(ur.plomb.mesure);

  // Cas non calculables
  if (isNaN(mesure) || mesure <= 0) {
    alert("Mesure plomb invalide pour calculer l’incertitude");
    return;
  }

  // Calcul 10 %
  const incertitude = +(mesure * 0.10).toFixed(2);

  ur.plomb.incertitude = incertitude;

  saveMission();
  renderUREditForm(ur);
}

function randomBetween(min, max) {
  return +(Math.random() * (max - min) + min).toFixed(2);
}

function randomBetween(min, max, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function computeIncertitude(mesure) {
  if (typeof mesure !== "number") return null;
  return Number((mesure * 0.10).toFixed(2));
}

