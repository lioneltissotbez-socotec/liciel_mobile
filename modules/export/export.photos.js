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
  let plombPhotoCounter = 1;

  (mission.photos || []).forEach((ph, photoIndex) => {
    // Générer ClefComposant si manquant
    const clefComposant = ph.clefComposant || generateClefComposant();
    
    // Code photo
    let photoCode;
    if (ph.domaine === "mission" || ph.typePhoto === "presentation") {
      photoCode = "Présentation";
    } else if (ph.domaine === "description" && ph.urLoc) {
      // Photo de localisation → PhPb001, PhPb002...
      photoCode = `PhPb${String(plombPhotoCounter++).padStart(3, '0')}`;
    } else {
      photoCode = generatePhotoCode(photoIndex + 1, "Ph");
    }
    
    // Localisation
    const localisation = getPhotoLocalisation(ph, mission);
    
    // Prestation
    let prestation;
    if (ph.domaine === "description" && ph.urLoc) {
      prestation = "Plomb";
    } else {
      prestation = mapPrestationFromPhoto(ph);
    }
    
    // Ouvrage (type d'élément) et Description
    let ouvrage = "";
    let ouvrageComplet = "";
    let description = "";
    
    if (ph.domaine === "description" && ph.urLoc) {
      ouvrage = ph.urType || "";
      ouvrageComplet = ph.urType || "";
      
      const degradation = ph.urDegradation || "NC";
      const substrat = ph.urSubstrat || "";
      const revetement = ph.urRevetement || "";
      const mesure = ph.urMesure || "";
      
      description = `${degradation} - Substrat : ${substrat} - Revêtement : ${revetement} - Mesure : ${mesure}`;
    }
    
    // Chemin photo
    const photoPath = `photos\\${ph.name}`;

    xml += `  <LiItem_table_General_Photo>
    <LiColonne_id_classement_champs>${pad(idx++, 5)}</LiColonne_id_classement_champs>
    <LiColonne_ClefComposant>${escapeXML(clefComposant)}</LiColonne_ClefComposant>
    <LiColonne_Photo>${escapeXML(photoCode)}</LiColonne_Photo>
    <LiColonne_Localistion>${escapeXML(localisation)}</LiColonne_Localistion>
    <LiColonne_Prestation>${escapeXML(prestation)}</LiColonne_Prestation>
    <LiColonne_Ouvrage>${escapeXML(ouvrage)}</LiColonne_Ouvrage>
    <LiColonne_Ouvrage_txt_complet>${escapeXML(ouvrageComplet)}</LiColonne_Ouvrage_txt_complet>
    <LiColonne_Partie></LiColonne_Partie>
    <LiColonne_Description>${escapeXML(description)}</LiColonne_Description>
    <LiColonne_Indentif_plan></LiColonne_Indentif_plan>
    <LiColonne_Chemin_acces>${escapeXML(photoPath)}</LiColonne_Chemin_acces>
    <LiColonne_Acces_relatif>OUI</LiColonne_Acces_relatif>
    <LiColonne_Num_pour_affectation></LiColonne_Num_pour_affectation>
    <LiColonne_Txt_manuel></LiColonne_Txt_manuel>
    <LiColonne_Txt_manuel_str></LiColonne_Txt_manuel_str>
    <LiColonne_Txt_manuel_NP_ajouter_num_photo></LiColonne_Txt_manuel_NP_ajouter_num_photo>
  </LiItem_table_General_Photo>\n`;

    // Ajouter le fichier photo avec son nom d'origine
    files.push({ 
      name: ph.name,
      blob: ph.blob 
    });
  });

  xml += `</LiTable_General_Photo>\n`;

  return { xml, files };
}

// ======================================================
// Génération du code photo pour l'export
// ======================================================

function generatePhotoCodeForExport(ph, index) {
  // Photo de mission (présentation)
  if (ph.domaine === "mission" || ph.typePhoto === "presentation") {
    return "Présentation";
  }
  
  // Photos de pièces ou descriptions
  // Format: Ph001, Ph002, Ph003...
  return generatePhotoCode(index, "Ph");
}

// ======================================================
// Détermination de la localisation
// ======================================================

function getPhotoLocalisation(ph, mission) {
  // Photo de mission (présentation)
  if (ph.domaine === "mission" || ph.typePhoto === "presentation") {
    return "Présentation";
  }
  
  // Photo de pièce ou description
  // Format attendu: "Bâtiment - Pièce" (ex: "Rez de chaussée - Bureau 01")
  
  // Si clefComposant existe, chercher la pièce correspondante
  if (ph.clefComposant) {
    const piece = (mission.pieces || []).find(p => p.id === ph.clefComposant);
    if (piece) {
      const batiment = piece.batiment || "Bâtiment";
      const nomPiece = piece.nom || "Pièce";
      return `${batiment} - ${nomPiece}`;
    }
  }
  
  // Fallback: utiliser la localisation stockée si elle existe
  if (ph.localisation) {
    // Si déjà au bon format "Bâtiment - Pièce"
    if (ph.localisation.includes(" - ")) {
      return ph.localisation;
    }
    
    // Sinon, essayer de parser
    // Ex: "Bat A – Bureau 01" → "Bat A - Bureau 01"
    return ph.localisation.replace(/–/g, '-');
  }
  
  return "Non localisée";
}

// ======================================================
// Mapping prestation depuis la photo
// ======================================================

function mapPrestationFromPhoto(ph) {
  // Priorité : si prestation explicite
  if (ph.prestation) return normalizePrestation(ph.prestation);

  // Cas photo de présentation mission
  if (ph.domaine === "mission" || ph.typePhoto === "presentation") {
    return "Page_de_garde";
  }

  // Domaine
  const d = (ph.domaine || "").toLowerCase();

  // Modules actuels
  if (d === "piece") return "Général";
  if (d === "description" || d === "ur") return "Plomb";

  // Futurs domaines possibles
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

  // Valeurs EXACTES attendues
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

  // Match direct
  const direct = allowed.find(a => a.toLowerCase() === s.toLowerCase());
  if (direct) return direct;

  // Fallback
  return "Général";
}
