
// === pieces.ui.js : gestion photos ===
function pPhoto(file){
  if(!file) return;
  currentPiece.photos.push({
    id: crypto.randomUUID(),
    name: file.name,
    blob: file,
    source: "piece",
    localisation: `${currentPiece.batiment} – ${currentPiece.nom}`
  });
  saveMission();
  editPiece(currentPiece.id);
}

function replacePhoto(photoId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const ph = currentPiece.photos.find(p => p.id === photoId);
    if (!ph) return;
    ph.name = file.name;
    ph.blob = file;
    saveMission();
    editPiece(currentPiece.id);
  };
  input.click();
}

function deletePhoto(photoId) {
  if (!confirm("Supprimer cette photo ?")) return;
  currentPiece.photos = currentPiece.photos.filter(p => p.id !== photoId);
  saveMission();
  editPiece(currentPiece.id);
}
