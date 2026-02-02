async function exportMissionZIP(mission) {
  const zip = new JSZip();
  const root = zip.folder(mission.numeroDossier);

  // dossier_terrain.xml (vide volontairement)
  root.file("dossier_terrain.xml", '""');

  const xml = root.folder("XML");

  // ===== PIECES =====
  xml.file(
    "Table_General_Pieces_Toutes.xml",
    encodeWin1252(exportPiecesXML(mission))
  );

  // ===== PHOTOS =====
  const { xml: photosXML, files } = exportPhotosXMLAndFiles(mission);
  xml.file(
    "Table_General_Photo.xml",
    encodeWin1252(photosXML)
  );

    // ---------------- DESCRIPTION ----------------
  if (typeof window.exportDescriptionXML !== "function") {
    alert("Erreur : exportDescriptionXML non chargée");
    return;
  }

  const descriptionXML = window.exportDescriptionXML(mission);

  xml.file(
    "Table_General_Desciption_Pieces.xml",
    encodeWin1252(descriptionXML)
  );

  // ===== CREP =====
  if (typeof window.generateCREPXML === "function") {
    const crepXML = window.generateCREPXML();
    if (crepXML) {
      xml.file("Table_Z_CREP.xml", encodeWin1252(crepXML));
    }
  }

  // ===== DOSSIER PHOTOS =====
  const photosDir = root.folder("photos");
  for (const f of files) {
    photosDir.file(f.name, f.blob);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`${mission.numeroDossier}.zip`, blob);
}
