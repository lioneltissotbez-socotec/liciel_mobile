function exportPiecesXML(mission) {
  let x = `<?xml version="1.0" encoding="windows-1252"?>`;
  x += `<LiTable_General_Pieces_Toutes>`;

  (mission.pieces || []).forEach((p, i) => {
    const visite = p.visite === true;

    x += `
      <LiItem_table_General_Pieces_Toutes>

        <LiColonne_id_classement_champs>${pad(i,5)}</LiColonne_id_classement_champs>

        <LiColonne_ClefComposant>${p.id}</LiColonne_ClefComposant>

        <LiColonne_Batiment>${escapeXML(p.batiment)}</LiColonne_Batiment>

        <LiColonne_Local>${escapeXML(p.nom)}</LiColonne_Local>

        <!-- Champs LICIEL : toujours présents -->
        <LiColonne_Justification>${
          visite ? "" : escapeXML(p.justification)
        }</LiColonne_Justification>

        <LiColonne_MoyenAMettreEnOeuvre>${
          visite ? "" : escapeXML(p.moyens)
        }</LiColonne_MoyenAMettreEnOeuvre>

      </LiItem_table_General_Pieces_Toutes>
    `;
  });

  x += `</LiTable_General_Pieces_Toutes>`;
  return x;
}
