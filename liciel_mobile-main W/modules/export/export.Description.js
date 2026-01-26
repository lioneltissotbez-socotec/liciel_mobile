// ======================================================
// export.description.js
// Table_General_Desciption_Pieces (export Liciel)
// - 1 item par mur (lettre) si plusieurs lettres A/B/C...
// - Remplit les balises CREP : mesure + degradation
// - Conserve Data_1..Data_4 même si vides
// ======================================================

console.log("✅ export.description.js chargé");

(function () {
  // --- helpers locaux (sans conflit global) ---
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

  // "mur" -> "Mur", "plinthe" -> "Plinthe"
  function prettyType(t) {
    const s = (t ?? "").toString().trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Format mesure vers un string "Liciel-friendly"
  // - conserve "NM" si non mesuré
  // - conserve "0" si 0
  // - conserve ce que l’opérateur a écrit sinon
  function formatMesure(m) {
    if (m === null || m === undefined) return "";
    if (typeof m === "string") return m.trim(); // ex: "NM", "0,42", "<0,3" si tu l'autorises
    if (typeof m === "number") return String(m).replace(".", ","); // visuel FR (optionnel)
    return String(m);
  }

  function formatIncertitude(v) {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v === "string") return v.trim();
    if (typeof v === "number") return String(v).replace(".", ",");
    return String(v);
  }

  // IMPORTANT : où stocker l'incertitude ?
  // -> Je te la mets dans Data_1 par défaut (structure conservée, import stable)
  // Si tu préfères la mettre ailleurs, change ici.
  const INCERTITUDE_DEST = "DATA_1"; // "DATA_1" | "DETAILS" | "DATA_2" etc.

  function buildInfos(ur) {
    const s = ur?.substrat || "-";
    const r = ur?.revetement || "-";
    return `Substrat : ${s} - Revêtement : ${r}`;
  }

  function buildTypeWithLetter(urType, letter) {
    const t = prettyType(urType) || "-";
    const l = letter ? String(letter).trim() : "";
    return l ? `${t} - ${l}` : `${t} -`;
  }

  // Génère un identifiant unique par mur
  // - si plusieurs lettres : ur.id_A, ur.id_B...
  // - si aucune lettre : ur.id
  function celfComposantForLetter(urId, letter) {
    const base = (urId ?? "").toString().trim();
    if (!base) return "";
    if (!letter) return base;
    return `${base}_${letter}`;
  }

  // ======================================================
  // EXPORT PRINCIPAL
  // ======================================================
  function exportDescriptionXML(mission) {
    // ⚠️ Racine : j'utilise "LiTable_General_Desciption_Pieces"
    // car c’est ce que tu as collé depuis Liciel (exemple multi-murs).
    // Si chez toi c'est "<Table_General_Desciption_Pieces>", remplace juste ici.
    let xml = `<?xml version="1.0" encoding="windows-1252"?>\n`;
    xml += `<LiTable_General_Desciption_Pieces>\n`;

    let idx = 0;

    (mission?.pieces || []).forEach((piece) => {
      const localisation = `${piece?.batiment || ""} - ${piece?.nom || ""}`.trim();

      (piece?.descriptions || []).forEach((ur) => {
        const lettres = Array.isArray(ur?.lettres) ? ur.lettres.filter(Boolean) : [];
        const lettersToExport = lettres.length ? lettres : [null]; // si pas de lettre => 1 item quand même

        // Données plomb / crep
        const mesure = formatMesure(ur?.plomb?.mesure);
        const incert = formatIncertitude(ur?.plomb?.incertitude);
        const degr = (ur?.plomb?.degradation ?? "").toString().trim();

        lettersToExport.forEach((letter) => {
          const idCelf = celfComposantForLetter(ur?.id, letter);

          // CREP_degaradtion_Details : on le laisse vide par défaut
          // (ou on peut y mettre incertitude si tu préfères)
          let crepDetails = "";
          let data1 = "";
          let data2 = "";
          let data3 = "";
          let data4 = "";

          if (INCERTITUDE_DEST === "DETAILS") crepDetails = incert ? `Incertitude : ${incert}` : "";
          if (INCERTITUDE_DEST === "DATA_1") data1 = incert;
          if (INCERTITUDE_DEST === "DATA_2") data2 = incert;
          if (INCERTITUDE_DEST === "DATA_3") data3 = incert;
          if (INCERTITUDE_DEST === "DATA_4") data4 = incert;

          xml += `  <LiItem_table_General_Desciption_Pieces>\n`;
          xml += `    <LiColonne_id_classement_champs>${pad5(idx++)}</LiColonne_id_classement_champs>\n`;
          xml += `    <LiColonne_CelfComposant>${escapeXML(idCelf)}</LiColonne_CelfComposant>\n`;
          xml += `    <LiColonne_Localistion>${escapeXML(localisation)}</LiColonne_Localistion>\n`;
          xml += `    <LiColonne_Informations>${escapeXML(buildInfos(ur))}</LiColonne_Informations>\n`;
          xml += `    <LiColonne_Type>${escapeXML(buildTypeWithLetter(ur?.type, letter))}</LiColonne_Type>\n`;

          // ✅ CREP : dégradation + détails + mesure
          xml += `    <LiColonne_CREP_degaradtion>${escapeXML(degr)}</LiColonne_CREP_degaradtion>\n`;
          xml += `    <LiColonne_CREP_degaradtion_Details>${escapeXML(crepDetails)}</LiColonne_CREP_degaradtion_Details>\n`;
          xml += `    <LiColonne_CREP_mesure>${escapeXML(mesure)}</LiColonne_CREP_mesure>\n`;

          // ✅ Structure conservée
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

  // expose global pour export.zip.js
  window.exportDescriptionXML = exportDescriptionXML;
})();
