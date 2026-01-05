function renderPhotosScreen() {
  const screen = document.getElementById("screen-photos");

  if (!store.mission) {
    screen.innerHTML = "<p>Aucune mission active</p>";
    return;
  }

  const photos = [];

  /* ===== Photos issues des PIÈCES ===== */
  store.mission.pieces.forEach(piece => {
    piece.photos.forEach(ph => {
      photos.push({
        blob: ph.blob,
        name: ph.name,
        origine: "Pièce",
        localisation: `${piece.batiment || "?"} – ${piece.nom || "?"}`
      });
    });
  });

  if (photos.length === 0) {
    screen.innerHTML = "<p>Aucune photo enregistrée</p>";
    return;
  }

  screen.innerHTML = photos.map(ph => `
    <div class="photo-card">
      <img src="${URL.createObjectURL(ph.blob)}" />
      <div class="photo-caption">
        <strong>${ph.origine}</strong><br>
        ${ph.localisation}
      </div>
    </div>
  `).join("");
}
