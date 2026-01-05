const DB_NAME = "liciel-terrain-db";
const DB_VERSION = 1;
const STORE_NAME = "missions";

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "numeroDossier" });
      }
    };

    req.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = () => reject("Erreur IndexedDB");
  });
}

async function saveMission() {
  if (!store.mission) return;
  store.mission.derniereSauvegarde = new Date().toISOString();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(store.mission);
}

async function loadMission(numeroDossier) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(numeroDossier);
    req.onsuccess = () => resolve(req.result || null);
  });
}

async function listMissions() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}
