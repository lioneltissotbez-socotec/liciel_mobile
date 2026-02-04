// ======================================================
// export.description.js
// Table_General_Desciption_Pieces (export Liciel)
// - 1 item par localisation (A, B, G, P01, F03…)
// - Source: piece.descriptions[] -> ur.localisation.items + ur.plombByLoc
// - CREP : mesure + dégradation
// - Incertitude auto 10% -> Data_1 (sans UI)
// ======================================================

console.log("✅ export.description.js chargé");

(function () {

  // ===============================
  // HELPERS
  // ===============================

  function getURLocalisationText(ur) {
  const items = ur?.localisation?.items;
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.join(", ");
}

function celfComposantForItem(urId, item) {
  if (!urId) return "";
  return item ? `${urId}_${item}` : urId;
}

  function pad5(n) {
    return String(n).padStart(5, "0");
  }

  // ⚠️ IMPORTANT : on n'échappe PAS l'apostrophe (') => pas de &apos;
  function escapeXML(str) {
    return (str ?? "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function prettyType(t) {
    const s = (t ?? "").toString().trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatMesure(m) {
    if (m === null || m === undefined) return "";
    if (typeof m === "string") return m.trim();       // "NM" ou "0,42"
    if (typeof m === "number") return String(m).replace(".", ",");
    return String(m).trim();
  }

  function parseMesureToNumber(m) {
    if (m === null || m === undefined) return null;
    if (typeof m === "number") return isFinite(m) ? m : null;

    const s = String(m).trim();
    if (!s) return null;
    if (s.toUpperCase() === "NM") return null;

    // "0,42" -> 0.42
    const v = parseFloat(s.replace(",", "."));
    return isFinite(v) ? v : null;
  }

  function computeIncertitude10(mesureValue) {
    const n = parseMesureToNumber(mesureValue);
    if (n === null) return ""; // NM / invalide => vide
    if (n === 0) return "0";
    return String((n * 0.10).toFixed(2)).replace(".", ",");
  }

  function buildInfos(ur) {
    const s = ur?.substrat || "";
    const r = ur?.revetement || "";
    return `Substrat : ${s} - Revêtement : ${r}`;
  }

  function buildTypeWithItem(type, item) {
    const t = prettyType(type) || "";
    return item ? `${t} - ${item}` : t;
  }

  function celfComposantForItem(urId, item) {
    const base = (urId ?? "").toString().trim();
    if (!base) return "";
    return item ? `${base}_${item}` : base;
  }

  // Localisation texte exportée dans LiColonne_Localistion
  // Ici on exporte la localisation de pièce + item, pour coller à l'esprit Liciel
  function buildLocalisationPieceItem(piece, item) {
    const locPiece = `${piece?.batiment || ""} - ${piece?.nom || ""}`.trim();
    if (!locPiece && !item) return "";
    if (!item) return locPiece;
    return locPiece ? `${locPiece} - ${item}` : String(item);
  }

  // ===============================
  // EXPORT
  // ===============================

  function exportDescriptionXML(mission) {
    let xml = `<?xml version="1.0" encoding="windows-1252"?>\n`;
    xml += `<LiTable_General_Desciption_Pieces>\n`;

    let idx = 0;

    (mission?.pieces || []).forEach(piece => {
      (piece?.descriptions || []).forEach(ur => {

        const items = Array.isArray(ur?.localisation?.items)
          ? ur.localisation.items.filter(Boolean)
          : [];

        const itemsToExport = items.length ? items : [null];

        itemsToExport.forEach(item => {
          const idCelf = celfComposantForItem(ur?.id, item);

          const entry = (ur?.plombByLoc && item && ur.plombByLoc[item])
            ? ur.plombByLoc[item]
            : null;


          // V4 : mesures est un tableau, prendre la première mesure
          const premiereMesure = Array.isArray(entry?.mesures) && entry.mesures.length > 0
            ? entry.mesures[0]
            : null;
          const mesureLoc = formatMesure(premiereMesure);
          const degrLoc = (entry?.degradation ?? "").toString().trim();
const localisationPiece = `${piece?.batiment || ""} - ${piece?.nom || ""}`.trim();
          const incertLoc = computeIncertitude10(premiereMesure); // 10%

          xml += `  <LiItem_table_General_Desciption_Pieces>\n`;
          xml += `    <LiColonne_id_classement_champs>${pad5(idx++)}</LiColonne_id_classement_champs>\n`;
          xml += `    <LiColonne_CelfComposant>${escapeXML(idCelf)}</LiColonne_CelfComposant>\n`;
         xml += `    <LiColonne_Localistion>${escapeXML(localisationPiece)}</LiColonne_Localistion>\n`;
          xml += `    <LiColonne_Informations>${escapeXML(buildInfos(ur))}</LiColonne_Informations>\n`;
          xml += `    <LiColonne_Type>${escapeXML(buildTypeWithItem(ur?.type, item))}</LiColonne_Type>\n`;

          xml += `    <LiColonne_CREP_degaradtion>${escapeXML(degrLoc)}</LiColonne_CREP_degaradtion>\n`;
          xml += `    <LiColonne_CREP_degaradtion_Details></LiColonne_CREP_degaradtion_Details>\n`;
          xml += `    <LiColonne_CREP_mesure>${escapeXML(mesureLoc)}</LiColonne_CREP_mesure>\n`;

          // Incertitude en Data_1 (si tu veux autre chose, dis-moi)
          xml += `    <LiColonne_Data_1>${escapeXML(incertLoc)}</LiColonne_Data_1>\n`;
          xml += `    <LiColonne_Data_2></LiColonne_Data_2>\n`;
          xml += `    <LiColonne_Data_3></LiColonne_Data_3>\n`;
          xml += `    <LiColonne_Data_4></LiColonne_Data_4>\n`;
          xml += `  </LiItem_table_General_Desciption_Pieces>\n`;
        });

      });
    });

    xml += `</LiTable_General_Desciption_Pieces>\n`;
    return xml;
  }

  window.exportDescriptionXML = exportDescriptionXML;

})();
