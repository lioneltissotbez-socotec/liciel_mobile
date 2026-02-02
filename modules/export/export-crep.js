// modules/export/export-crep.js
// Export XML CREP pour LICIEL

console.log("✅ export-crep.js chargé");

/**
 * Génère le classement selon la dégradation
 * Non visible = 1, Non dégradé = 1, État d'usage = 2, Dégradé = 3
 */
function getClassementDegradation(degradation) {
  const map = {
    "Non visible": "1",
    "Non dégradé": "1",
    "Etat d'usage": "2",
    "Dégradé": "3"
  };
  return map[degradation] || "0";
}

/**
 * Génère la hauteur selon l'index de mesure (CREP)
 */
function getHauteurCREP(index) {
  const hauteurs = ["< 1m", "> 1,5m", "1m"];
  return hauteurs[index] || "";
}

/**
 * Génère la partie mesurée selon l'index (CREP)
 */
function getPartieMesureeCREP(index) {
  const parties = ["Partie basse", "Partie haute", "Milieu"];
  return parties[index] || "";
}

/**
 * Calcule la précision (10% de la mesure)
 */
function getPrecisionMesure(mesure) {
  const val = parseFloat(String(mesure).replace(',', '.'));
  if (isNaN(val)) return "";
  return (val * 0.1).toFixed(2).replace('.', ',');
}

/**
 * Échappe les caractères XML
 */
function escapeXML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Génère une ligne XML CREP
 */
function generateCREPItem(data) {
  const mesureStr = String(data.mesure).replace('.', ',');
  const mesureNum = parseFloat(String(data.mesure).replace(',', '.'));
  const mesureDlb = isNaN(mesureNum) ? "-1" : String(mesureNum).replace('.', ',');
  
  return `     <LiItem_table_Z_CREP>
          <LiColonne_id_classement_champs>${data.idClassement}</LiColonne_id_classement_champs>
          <LiColonne_CelfComposant>${data.clefComposant}</LiColonne_CelfComposant>
          <LiColonne_Num_mesure>${data.numMesure}</LiColonne_Num_mesure>
          <LiColonne_Piece>${escapeXML(data.piece)}</LiColonne_Piece>
          <LiColonne_Repere_plan>${escapeXML(data.repere)}</LiColonne_Repere_plan>
          <LiColonne_Num_UD>${data.numUD}</LiColonne_Num_UD>
          <LiColonne_Nom_UD>${escapeXML(data.nomUD)}</LiColonne_Nom_UD>
          <LiColonne_Substrat>${escapeXML(data.substrat)}</LiColonne_Substrat>
          <LiColonne_Revetement_apparent>${escapeXML(data.revetement)}</LiColonne_Revetement_apparent>
          <LiColonne_Hauteur>${data.hauteur}</LiColonne_Hauteur>
          <LiColonne_Mesure>${mesureStr}</LiColonne_Mesure>
          <LiColonne_Mesure_dlb>${mesureDlb}</LiColonne_Mesure_dlb>
          <LiColonne_Type_degradation>${escapeXML(data.degradation)}</LiColonne_Type_degradation>
          <LiColonne_Classement>${getClassementDegradation(data.degradation)}</LiColonne_Classement>
          <LiColonne_Degradation_du_bati></LiColonne_Degradation_du_bati>
          <LiColonne_Raison_non_mesure>${escapeXML(data.observation)}</LiColonne_Raison_non_mesure>
          <LiColonne_Precision_de_la_mesure>${getPrecisionMesure(data.mesure)}</LiColonne_Precision_de_la_mesure>
          <LiColonne_Nature_degradation></LiColonne_Nature_degradation>
          <LiColonne_Partie_mesuree>${data.partieMesuree}</LiColonne_Partie_mesuree>
          <LiColonne_PourcentDegradation></LiColonne_PourcentDegradation>
     </LiItem_table_Z_CREP>`;
}

/**
 * Génère le XML CREP complet de la mission
 */
function generateCREPXML() {
  if (!store.mission) {
    alert("Aucune mission chargée");
    return null;
  }

  let idClassement = 1;
  let numMesureGlobal = 2; // Commence à 02 (01 = mesure témoin LICIEL)
  
  // Map pour suivre les numéros UD (unique par UD, identique pour tous les repères)
  const udNumbers = new Map();
  let numUDCounter = 1;
  
  let xmlItems = [];

  // Parcourir toutes les pièces
  store.mission.pieces.forEach(piece => {
    if (!piece.descriptions || piece.descriptions.length === 0) return;

    const pieceLabel = `${piece.batiment || "—"} - ${piece.nom || "—"}`;

    // Parcourir toutes les UD de la pièce
    piece.descriptions.forEach(ur => {
      // Générer ou récupérer le numéro UD (unique par UD, identique pour tous ses repères)
      if (!udNumbers.has(ur.id)) {
        udNumbers.set(ur.id, String(numUDCounter).padStart(2, '0'));
        numUDCounter++;
      }
      const numUD = udNumbers.get(ur.id);

      // Parcourir toutes les localisations (repères)
      if (!ur.plombByLoc) return;

      Object.entries(ur.plombByLoc).forEach(([repere, entry]) => {
        if (!entry.mesures || entry.mesures.length === 0) return;

        // Générer une ligne XML par mesure
        entry.mesures.forEach((mesure, idx) => {
          const item = generateCREPItem({
            idClassement: String(idClassement).padStart(5, '0'),
            clefComposant: generateClefComposant(),
            numMesure: String(numMesureGlobal).padStart(2, '0'),
            piece: pieceLabel,
            repere: repere,
            numUD: numUD,
            nomUD: ur.type || "—",
            substrat: ur.substrat || "—",
            revetement: ur.revetement || "—",
            hauteur: getHauteurCREP(idx),
            mesure: mesure,
            degradation: entry.degradation || "",
            observation: entry.observation || "",
            partieMesuree: getPartieMesureeCREP(idx)
          });

          xmlItems.push(item);
          idClassement++;
          numMesureGlobal++;
        });
      });
    });
  });

  if (xmlItems.length === 0) {
    alert("Aucune mesure plomb à exporter");
    return null;
  }

  // Construire le XML complet
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<LiTable_Z_CREP>
${xmlItems.join('\n')}
</LiTable_Z_CREP>`;

  return xml;
}

/**
 * Télécharge le fichier XML CREP
 */
function downloadCREPXML() {
  const xml = generateCREPXML();
  if (!xml) return;

  const dossier = store.mission.dossier || "export";
  const date = new Date().toISOString().split('T')[0];
  const filename = `${dossier}_CREP_${date}.xml`;

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  console.log(`✅ Export CREP XML : ${filename}`);
  alert(`Export CREP terminé : ${filename}`);
}

// Exposition globale
window.generateCREPXML = generateCREPXML;
window.downloadCREPXML = downloadCREPXML;
