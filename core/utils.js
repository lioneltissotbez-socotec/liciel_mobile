/**
 * UTILS - Fonctions utilitaires
 */

/**
 * Génère une ClefComposant au format LICIEL
 * Format: YYYY_MM_DD_HH_MM_SS_TIMESTAMP_RANDOM
 * Exemple: 2026_01_28_14_59_07_7351060002244079
 * 
 * @returns {string} ClefComposant unique
 */
function generateClefComposant() {
  const now = new Date();
  
  // Date: YYYY_MM_DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}_${month}_${day}`;
  
  // Heure: HH_MM_SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timePart = `${hours}_${minutes}_${seconds}`;
  
  // Timestamp en millisecondes
  const timestamp = now.getTime();
  
  // Nombre aléatoire pour garantir l'unicité
  const random = Math.floor(Math.random() * 10000000);
  
  return `${datePart}_${timePart}_${timestamp}${random}`;
}

/**
 * Génère un code photo automatique
 * @param {number} index - Index de la photo (1, 2, 3...)
 * @param {string} prefix - Préfixe optionnel (ex: "PhPb" pour plomb)
 * @returns {string} Code photo (ex: "Ph001" ou "PhPb001")
 */
function generatePhotoCode(index, prefix = "Ph") {
  return `${prefix}${String(index).padStart(3, '0')}`;
}

/**
 * Formate un chemin de fichier pour l'export
 * @param {string} filename - Nom du fichier
 * @returns {string} Chemin formaté (ex: "photos\nom_fichier.jpg")
 */
function formatPhotoPath(filename) {
  return `photos\\${filename}`;
}

/**
 * Génère un ID de classement au format 5 chiffres
 * @param {number} index - Index (0, 1, 2...)
 * @returns {string} ID formaté (ex: "00000", "00001"...)
 */
function generateClassementId(index) {
  return String(index).padStart(5, '0');
}
