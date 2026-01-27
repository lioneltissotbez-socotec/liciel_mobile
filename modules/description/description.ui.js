console.log("✅ description.ui.js chargé");

function renderPlombSummary(ur) {
  if (!ur.plombByLoc || Object.keys(ur.plombByLoc).length === 0) return "";

  const entries = Object.entries(ur.plombByLoc)
    .map(([loc, v]) => {
      if (!v || v.mesure === null || v.mesure === "") return null;
      if (v.mesure === "NM") return `${loc} : NM`;
      return `${loc} : ${v.mesure}${v.degradation ? " – " + v.degradation : ""}`;
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

  // 🔁 Migration ancienne structure (lettres → localisation)
piece.descriptions.forEach(ur => {
  if (!ur.localisation) {
    ur.localisation = {
      lettres: Array.isArray(ur.lettres) ? [...ur.lettres] : [],
      numeros: []
    };
    delete ur.lettres;
  }
});

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
  <button onclick="plombApplyModeToAll('ZERO')">=0</button>
  <button onclick="plombApplyModeToAll('LT_03')">&lt;0,3</button>
  <button onclick="plombApplyModeToAll('LT_1')">&lt;1</button>
</div>

<div class="small muted" style="margin-top:6px">
  Saisis une valeur par localisation. Les boutons ci-dessus remplissent automatiquement chaque champ (modifiable ensuite).
</div>

<div class="plomb-loc-list">
  ${
    (Array.isArray(ur.localisation?.items) ? ur.localisation.items : []).length === 0
      ? `<div class="plomb-empty muted">Aucune localisation sélectionnée</div>`
      : (ur.localisation.items).map(loc => {
          const entry = ur.plombByLoc?.[loc] || { mesure: null, degradation: null };
          const mesureVal = entry.mesure ?? "";
          const degrVal = entry.degradation ?? "";
          return `
            <div class="plomb-loc-row">
              <div class="plomb-loc-tag">${loc}</div>

              <input
                class="plomb-loc-input"
                type="text"
                value="${mesureVal}"
                oninput="plombSetMesureForLoc('${loc}', this.value)"
                placeholder="ex : 0,42 ou NM"
              />

              <select
                class="plomb-loc-select"
                onchange="plombSetDegradationForLoc('${loc}', this.value)"
              >
                <option value="" ${degrVal==="" ? "selected" : ""}>—</option>
                <option ${degrVal==="Non visible" ? "selected" : ""}>Non visible</option>
                <option ${degrVal==="Non dégradé" ? "selected" : ""}>Non dégradé</option>
                <option ${degrVal==="Etat d'usage" ? "selected" : ""}>Etat d'usage</option>
                <option ${degrVal==="Dégradé" ? "selected" : ""}>Dégradé</option>
              </select>
            </div>
          `;
        }).join("")
  }
</div>

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
    localisation: `${ur.type} ${(ur.localisation?.items || []).join(", ")}`
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
    ur.plombByLoc[loc] = ur.plombByLoc[loc] || { mesure: null, degradation: null };
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

  const locs = plombEnsureByLoc(ur);

  locs.forEach(loc => {
    const entry = ur.plombByLoc[loc] || { mesure: null, degradation: null };

    if (mode === "NM") {
      entry.mesure = "NM";
      entry.degradation = null;
    }

    if (mode === "ZERO") {
      entry.mesure = 0;
      entry.degradation = null;
    }

    if (mode === "LT_03") {
      entry.mesure = randomBetween(0.11, 0.29);
      // Dégradation non obligatoire, mais si tu veux forcer vide :
      // entry.degradation = null;
    }

    if (mode === "LT_1") {
      entry.mesure = randomBetween(0.31, 0.99);
      // entry.degradation = null;
    }

    ur.plombByLoc[loc] = entry;
  });

  saveMission();
  renderUREditForm(ur);
}

// Pour onclick=""
window.plombApplyModeToAll = plombApplyModeToAll;
window.plombSetMesureForLoc = plombSetMesureForLoc;
window.plombSetDegradationForLoc = plombSetDegradationForLoc;

