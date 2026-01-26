// ======================================================
// export.description.js
// Table_General_Desciption_Pieces (export Liciel)
// - 1 item par localisation (A, B, G, P01, F03…)
// - Compatible avec ur.localisation.items
// - Remplit CREP (mesure + dégradation)
// ======================================================

console.log("✅ export.description.js chargé");

(function () {

  // ===============================
  // HELPERS LOCAUX
  // ===============================

  function pad5(n) {
    return String(n).padStart(5, "0");
  }

  function escapeXML(str) {
    return (str ?? "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function prettyType(t) {
    const s = (t ?? "").toString().trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function formatMesure(m) {
    if (m === null || m === undefined) return "";
    if (typeof m === "string") return m.trim();
    if (typeof m === "number") return String(m).replace(".", ",");
    return String(m);
  }

  function formatIncertitude(v) {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number") return String(v).replace(".", ",");
    return String(v);
  }

  // ===============================
  // LOCALISATION (⚠️ MANQUANTE AVANT)
  // ===============================

  function getURLocalisationText(ur) {
    if (!ur || !ur.localisation || !Array.isArray(ur.localisation.items)) {
      return "";
    }
    return ur.localisation.items.join(", ");
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
    if (!urId) return "";
    return item ? `${urId}_${item}` : urId;
  }

  // Où stocker l'incertitude
  const INCERTITUDE_DEST = "DATA_1"; // recommandé

  // ===============================
  // EXPORT PRINCIPAL
  // ===============================

  function exportDescriptionXML(mission) {
    let xml = `<?xml version="1.0" encoding="windows-1252"?>\n`;
    xml += `<LiTable_General_Desciption_Pieces>\n`;

    let idx = 0;

    (mission?.pieces || []).forEach(piece => {

      const localisationPiece =
        `${piece?.batiment || ""} - ${piece?.nom || ""}`.trim();

      (piece?.descriptions || []).forEach(ur => {

        const items = Array.isArray(ur?.localisation?.items)
          ? ur.localisation.items.filter(Boolean)
          : [];

        const itemsToExport = items.length ? items : [null];

        const mesure = formatMesure(ur?.plomb?.mesure);
        const incert = formatIncertitude(ur?.plomb?.incertitude);
        const degr = (ur?.plomb?.degradation ?? "").toString().trim();

        itemsToExport.forEach(item => {

          const idCelf = celfComposantForItem(ur?.id, item);

          let crepDetails = "";
          let data1 = "";
          let data2 = "";
          let data3 = "";
          let data4 = "";

          if (INCERTITUDE_DEST === "DETAILS") crepDetails = incert;
          if (INCERTITUDE_DEST === "DATA_1") data1 = incert;
          if (INCERTITUDE_DEST === "DATA_2") data2 = incert;
          if (INCERTITUDE_DEST === "DATA_3") data3 = incert;
          if (INCERTITUDE_DEST === "DATA_4") data4 = incert;

          xml += `  <LiItem_table_General_Desciption_Pieces>\n`;
          xml += `    <LiColonne_id_classement_champs>${pad5(idx++)}</LiColonne_id_classement_champs>\n`;
          xml += `    <LiColonne_CelfComposant>${escapeXML(idCelf)}</LiColonne_CelfComposant>\n`;
          xml += `    <LiColonne_Localistion>${escapeXML(localisationPiece)}</LiColonne_Localistion>\n`;
          xml += `    <LiColonne_Informations>${escapeXML(buildInfos(ur))}</LiColonne_Informations>\n`;
          xml += `    <LiColonne_Type>${escapeXML(buildTypeWithItem(ur?.type, item))}</LiColonne_Type>\n`;

          // ===== CREP =====
          xml += `    <LiColonne_CREP_degaradtion>${escapeXML(degr)}</LiColonne_CREP_degaradtion>\n`;
          xml += `    <LiColonne_CREP_degaradtion_Details>${escapeXML(crepDetails)}</LiColonne_CREP_degaradtion_Details>\n`;
          xml += `    <LiColonne_CREP_mesure>${escapeXML(mesure)}</LiColonne_CREP_mesure>\n`;

          // ===== DONNÉES LIBRES =====
          xml += `    <LiColonne_Data_1>${escapeXML(data1)}</LiColonne_Data_1>\n`;
          xml += `    <LiColonne_Data_2>${escapeXML(data2)}</LiColonne_Data_2>\n`;
          xml += `    <LiColonne_Data_3>${escapeXML(data3)}</LiColonne_Data_3>\n`;
          xml += `    <LiColonne_Data_4>${escapeXML(data4)}</LiColonne_Data_4>\n`;

          xml += `  </LiItem_table_General_Desciption_Pieces>\n`;
        });
      });
    });

    xml += `</LiTable_General_Desciption_Pieces>\n`;
    return xml;
  }

  // exposé global
  window.exportDescriptionXML = exportDescriptionXML;

})();
