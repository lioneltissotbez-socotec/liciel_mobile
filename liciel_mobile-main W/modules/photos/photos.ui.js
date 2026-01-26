// ======================================================
// photos.ui.js
// Affichage global des photos de la mission
// Source unique : store.mission.photos
// ======================================================

function renderPhotosScreen() {
  const screen = document.getElementById("screen-photos");

  if (!store.mission) {
    screen.innerHTML = "<p>Aucune mission active</p>";
    return;
  }

  const photos = store.mission.photos || [];

  if (!photos.length) {
    screen.innerHTML = "<p>Aucune photo enregistrée</p>";
    return;
  }

  screen.innerHTML = photos.map(ph => `
    <div class="photo-card">

      <img src="${URL.createObjectURL(ph.blob)}" loading="lazy">

      <div class="photo-caption">
        <strong>${labelDomaine(ph.domaine)}</strong><br>
        ${ph.localisation || ""}
      </div>

      <div class="photo-actions">
        <button
          title="Ouvrir l’élément"
          onclick="openComponentForPhoto('${ph.clefComposant}')">
          🖊
        </button>

        <button
          title="Supprimer la photo"
          onclick="deleteGlobalPhoto('${ph.id}')">
          🗑
        </button>
      </div>

    </div>
  `).join("");
}

// ======================================================
// Navigation vers l’élément lié à la photo
// ======================================================
function openComponentForPhoto(clefComposant) {

  // 🔹 UR (description de pièce)
  const piece = store.mission.pieces.find(p =>
    p.descriptions?.some(ur => ur.id === clefComposant)
  );

  if (piece) {
    store.ui.currentDescriptionPieceId = piece.id;
    store.ui.editingUR = clefComposant;
    go("description");
    return;
  }

  // 🔹 Pièce (si un jour on rattache directement)
  const pieceDirect = store.mission.pieces.find(p => p.id === clefComposant);
  if (pieceDirect) {
    window.currentPiece = pieceDirect;
    go("pieces");
    return;
  }

  alert("Élément lié à la photo non reconnu");
}

// ======================================================
// Suppression globale d’une photo
// ======================================================
function deleteGlobalPhoto(photoId) {
  if (!confirm("Supprimer cette photo ?")) return;

  // Supprimer de la table globale
  store.mission.photos =
    store.mission.photos.filter(p => p.id !== photoId);

  // Supprimer les références dans les UR
  store.mission.pieces.forEach(piece => {
    piece.descriptions?.forEach(ur => {
      if (Array.isArray(ur.photos)) {
        ur.photos = ur.photos.filter(id => id !== photoId);
      }
    });
  });

  saveMission();
  renderPhotosScreen();
}

// ======================================================
// Helpers UI
// ======================================================
function labelDomaine(domaine) {
  const map = {
    piece: "Pièce",
    ur: "Description",
    zpso: "ZPSO",
    prelevement: "Prélèvement"
  };
  return map[domaine] || "Photo";
}

// ================================
// PHOTO PRINCIPALE DE MISSION
// ================================
function addMissionPhoto(numeroDossier) {
  const mission = store.mission?.numeroDossier === numeroDossier
    ? store.mission
    : null;

  if (!mission) {
    alert("Mission non chargée");
    return;
  }

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    mission.photos = mission.photos || [];

    // Supprimer ancienne photo de présentation
    mission.photos = mission.photos.filter(
      p => p.typePhoto !== "presentation"
    );

    mission.photos.push({
      id: crypto.randomUUID(),
      name: file.name,
      blob: file,
      domaine: "mission",
      typePhoto: "presentation",
      clefComposant: mission.numeroDossier,
      localisation: "Présentation"
    });

    saveMission();
    alert("Photo de présentation enregistrée");
  };

  input.click();
}

