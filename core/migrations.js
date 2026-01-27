// core/migrations.js
// Gestion des migrations de structure de données entre versions

/**
 * Migre une UR de l'ancienne structure vers la nouvelle
 * - localisation : lettres/numeros → localisation.items[]
 * - plomb : ur.plomb unique → ur.plombByLoc[loc]
 * 
 * @param {Object} ur - Unité de Repérage à migrer
 * @returns {Object} UR migrée
 */
function migrateURStructure(ur) {
  if (!ur) return ur;

  // ================================
  // MIGRATION 1 : LOCALISATION
  // Ancienne structure : ur.lettres[] + ur.numeros[]
  // Nouvelle structure : ur.localisation.items[]
  // ================================
  if (!ur.localisation || !Array.isArray(ur.localisation.items)) {
    const items = [];

    // Récupération des anciennes données
    if (Array.isArray(ur.lettres)) items.push(...ur.lettres);
    if (Array.isArray(ur.numeros)) items.push(...ur.numeros);

    // Création de la nouvelle structure
    ur.localisation = { items };

    // Nettoyage des anciennes propriétés
    delete ur.lettres;
    delete ur.numeros;
  }

  // ================================
  // MIGRATION 2 : PLOMB
  // Ancienne structure : ur.plomb unique {mesure, degradation}
  // Nouvelle structure : ur.plombByLoc[loc] {mesure, degradation}
  // ================================
  ur.plombByLoc = ur.plombByLoc && typeof ur.plombByLoc === "object" ? ur.plombByLoc : {};

  const locs = Array.isArray(ur.localisation?.items) ? ur.localisation.items : [];

  // Si on a un ancien ur.plomb avec une mesure, on la duplique vers chaque localisation
  if (ur.plomb && (ur.plomb.mesure !== null && ur.plomb.mesure !== undefined && ur.plomb.mesure !== "")) {
    locs.forEach(loc => {
      if (!ur.plombByLoc[loc]) {
        ur.plombByLoc[loc] = {
          mesure: ur.plomb.mesure,
          degradation: ur.plomb.degradation || null
        };
      }
    });

    // Suppression de l'ancienne structure
    delete ur.plomb;
  }

  // S'assurer que chaque localisation a une entrée plomb (même vide)
  locs.forEach(loc => {
    ur.plombByLoc[loc] = ur.plombByLoc[loc] || { 
      mesure: "", 
      degradation: null 
    };
  });

  return ur;
}

/**
 * Migre toutes les pièces d'une mission
 * @param {Object} mission - Mission à migrer
 * @returns {Object} Mission migrée
 */
function migrateMissionStructure(mission) {
  if (!mission || !Array.isArray(mission.pieces)) return mission;

  mission.pieces.forEach(piece => {
    if (Array.isArray(piece.descriptions)) {
      piece.descriptions.forEach(ur => {
        migrateURStructure(ur);
      });
    }
  });

  return mission;
}

// Exposition globale
window.migrateURStructure = migrateURStructure;
window.migrateMissionStructure = migrateMissionStructure;
