
// === photos.ui.js ===
function renderPhotosScreen() {
  const screen = document.getElementById("screen-photos");
  if (!store.mission) {
    screen.innerHTML = "<p>Aucune mission active</p>";
    return;
  }
  const photos = [];
  store.mission.pieces.forEach(piece => {
    if (!Array.isArray(piece.photos)) return;
    piece.photos.forEach(ph => {
      photos.push({
        blob: ph.blob,
        origine: "Pièce",
        localisation: `${piece.batiment || "?"} – ${piece.nom || "?"}`,
        photoId: ph.id,
        pieceId: piece.id
      });
    });
  });
  if (!photos.length) {
    screen.innerHTML = "<p>Aucune photo enregistrée</p>";
    return;
  }
  screen.innerHTML = photos.map(ph => `
    <div class="photo-card">
      <img src="${URL.createObjectURL(ph.blob)}">
      <div class="photo-caption">
        <strong>${ph.origine}</strong><br>${ph.localisation}
      </div>
      <div class="photo-actions">
        <button onclick="openPieceForPhoto('${ph.pieceId}','${ph.photoId}')">🖊</button>
        <button onclick="deletePhotoFromPhotos('${ph.pieceId}','${ph.photoId}')">🗑</button>
      </div>
    </div>
  `).join("");
}

function openPieceForPhoto(pieceId, photoId){
  const piece = store.mission.pieces.find(p=>p.id===pieceId);
  if(!piece) return;
  window.currentPiece = piece;
  go("pieces");
  setTimeout(()=>replacePhoto(photoId),200);
}

function deletePhotoFromPhotos(pieceId, photoId){
  if(!confirm("Supprimer cette photo ?")) return;
  const piece = store.mission.pieces.find(p=>p.id===pieceId);
  if(!piece) return;
  piece.photos = piece.photos.filter(p=>p.id!==photoId);
  saveMission();
  renderPhotosScreen();
}
