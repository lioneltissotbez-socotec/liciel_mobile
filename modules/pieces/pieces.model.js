
function createPiece() {
  return {
    id: crypto.randomUUID(),
    batiment: "",
    nom: "",
    visite: true,
    justification: "",
    moyens: "",
    photos: []
  };
}
