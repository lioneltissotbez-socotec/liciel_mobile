// core/dictionnaires.js
// Charge les dictionnaires (bâtiments, pièces, justifications, moyens) selon le client

/**
 * Charge les dictionnaires selon le client de la mission
 */
async function loadDictionnaires() {
  try {
    // Déterminer quel fichier de pièces charger
    const listePieces = store.mission?.contexte?.listePieces || 'standard';
    let piecesFile;
    
    switch(listePieces) {
      case 'unicil':
        piecesFile = 'data/pieces_unicil.json';
        break;
      case 'odhac87':
        piecesFile = 'data/pieces_odhac87.json';
        break;
      default:
        piecesFile = 'data/pieces_standard.json';
    }
    
    // Charger les fichiers en parallèle (bâtiments commun + pièces client + justifications + moyens)
    const [batimentsRes, piecesRes, justificationsRes, moyensRes] = await Promise.all([
      fetch("data/batiments.json", { cache: "no-store" }),
      fetch(piecesFile, { cache: "no-store" }),
      fetch("data/justifications.json", { cache: "no-store" }),
      fetch("data/moyens.json", { cache: "no-store" })
    ]);
    
    if (!batimentsRes.ok || !piecesRes.ok || !justificationsRes.ok || !moyensRes.ok) {
      throw new Error('Erreur chargement fichiers');
    }
    
    const [batimentsData, piecesData, justificationsData, moyensData] = await Promise.all([
      batimentsRes.json(),
      piecesRes.json(),
      justificationsRes.json(),
      moyensRes.json()
    ]);
    
    // Construire le dictionnaire complet
    const dict = {
      batiments: batimentsData,
      pieces: piecesData,
      justifications: justificationsData,
      moyens: moyensData
    };
    
    // Stocker dans le store global (FUSIONNER au lieu d'écraser)
    if (!window.store) window.store = {};
    if (!window.store.dict) window.store.dict = {};
    
    // Fusionner avec les dictionnaires existants (ex: types_elements, substrats, revetements)
    Object.assign(window.store.dict, dict);
    
    console.log(`✅ Dictionnaires chargés (${listePieces})`, {
      batiments: window.store.dict.batiments.items?.length ?? 0,
      pieces: window.store.dict.pieces.items?.length ?? 0,
      justifications: window.store.dict.justifications.items?.length ?? 0,
      moyens: window.store.dict.moyens.items?.length ?? 0
    });
    
    return dict;
    
  } catch (e) {
    console.error("❌ Erreur chargement dictionnaires", e);
    
    // Fallback : dictionnaire vide
    if (!window.store) window.store = {};
    window.store.dict = window.store.dict || {
      batiments: { label: "Liste Batiment", version: "1.0", items: [] },
      pieces: { label: "Liste des pieces", version: "1.0", items: [] },
      justifications: { label: "Justification de non visite", version: "1.0", items: [] },
      moyens: { label: "Moyens à mettre en œuvre", version: "1.0", items: [] }
    };
    return window.store.dict;
  }
}
