
function createPiece(batiment) {
  return {
    id: crypto.randomUUID(),
    batiment,
    nom: "",
    visite: true,
    justification: "",
    moyens: "",
    photos: [],

    // 🧱 DESCRIPTION TECHNIQUE
    descriptions: [] // unités de repérage (UR)
  };
}
