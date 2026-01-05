
function createPiece(defaultBatiment = "") {
  return {
    id: crypto.randomUUID(),
    batiment: defaultBatiment,
    nom: "",
    visite: true,
    justification: "",
    moyens: "",
    photos: []
  };
}
