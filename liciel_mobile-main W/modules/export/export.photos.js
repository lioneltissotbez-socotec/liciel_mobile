// ======================================================
// export.photos.js
// Table_General_Photo
// SOURCE UNIQUE : mission.photos
// ======================================================

function exportPhotosXMLAndFiles(mission) {
  let xml = `<?xml version="1.0" encoding="windows-1252"?>\n`;
  xml += `<LiTable_General_Photo>\n`;

  const files = [];
  let idx = 0;

  (mission.photos || []).forEach(ph => {
    const photoId = ph.id;

    // Libellé photo (LICIEL met souvent "MANUEL", sauf cas présentation)
    const libellePhoto =
      ph.typePhoto === "presentation" ? "Présentation" : "-";

    // Prestation attendue (Général, Page_de_garde, Amiante, DPE, Electricité, Gaz, Loi carrez, Loi Boutin, Plomb, Termites)
    const prestation = mapPrestationFromPhoto(ph);

    xml +=
`  <LiItem_table_General_Photo>
    <LiColonne_id_classement_champs>${pad(idx++, 5)}</LiColonne_id_classement_champs>
    <LiColonne_ClefComposant>${escapeXML(ph.clefComposant || "")}</LiColonne_ClefComposant>
    <LiColonne_Photo>${escapeXML(libellePhoto)}</LiColonne_Photo>
    <LiColonne_Localistion>${escapeXML(ph.localisation || "")}</LiColonne_Localistion>
    <LiColonne_Prestation>${escapeXML(prestation)}</LiColonne_Prestation>
    <LiColonne_Ouvrage></LiColonne_Ouvrage>
    <LiColonne_Ouvrage_txt_complet></LiColonne_Ouvrage_txt_complet>
    <LiColonne_Partie></LiColonne_Partie>
    <LiColonne_Description></LiColonne_Description>
    <LiColonne_Indentif_plan></LiColonne_Indentif_plan>
    <LiColonne_Chemin_acces>photos\\${photoId}.jpg</LiColonne_Chemin_acces>
    <LiColonne_Acces_relatif>OUI</LiColonne_Acces_relatif>
    <LiColonne_Num_pour_affectation></LiColonne_Num_pour_affectation>
    <LiColonne_Txt_manuel>0</LiColonne_Txt_manuel>
    <LiColonne_Txt_manuel_str></LiColonne_Txt_manuel_str>
    <LiColonne_Txt_manuel_NP_ajouter_num_photo>0</LiColonne_Txt_manuel_NP_ajouter_num_photo>
  </LiItem_table_General_Photo>\n`;

    files.push({ id: photoId, blob: ph.blob });
  });

  xml += `</LiTable_General_Photo>\n`;

  return { xml, files };
}

// ======================================================
// Mapping prestation depuis la photo
// ======================================================

function mapPrestationFromPhoto(ph) {
  // Priorité : si tu poses explicitement ph.prestation quelque part plus tard
  if (ph.prestation) return normalizePrestation(ph.prestation);

  // Cas photo de présentation mission
  if (ph.typePhoto === "presentation") return "Page_de_garde";

  // Sinon, on mappe via domaine/module (à ajuster selon tes valeurs réelles)
  const d = (ph.domaine || "").toLowerCase();

  // tes modules actuels
  if (d === "mission") return "Page_de_garde";
  if (d === "piece") return "Général";
  if (d === "description" || d === "ur") return "Plomb"; // logique CREP chez toi

  // futurs domaines possibles
  if (d.includes("amiante")) return "Amiante";
  if (d.includes("dpe")) return "DPE";
  if (d.includes("electric")) return "Electricité";
  if (d.includes("gaz")) return "Gaz";
  if (d.includes("carrez")) return "Loi carrez";
  if (d.includes("boutin")) return "Loi Boutin";
  if (d.includes("plomb") || d.includes("crep")) return "Plomb";
  if (d.includes("termite")) return "Termites";

  return "Général";
}

function normalizePrestation(v) {
  const s = (v || "").trim();

  // on renvoie une valeur EXACTE attendue
  const allowed = [
    "Général",
    "Page_de_garde",
    "Amiante",
    "DPE",
    "Electricité",
    "Gaz",
    "Loi carrez",
    "Loi Boutin",
    "Plomb",
    "Termites"
  ];

  // match direct
  const direct = allowed.find(a => a.toLowerCase() === s.toLowerCase());
  if (direct) return direct;

  // fallback
  return "Général";
}
