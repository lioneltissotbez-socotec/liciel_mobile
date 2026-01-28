const DB_NAME = "liciel-terrain-db";
const DB_VERSION = 1;
const STORE_NAME = "missions";

let db = null;
let dbReady = false;

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
      dbReady = true;
      console.log('✅ IndexedDB prête');
      resolve(db);
    };

    req.onerror = () => reject("Erreur IndexedDB");
  });
}

async function ensureDB() {
  if (!db || !dbReady) {
    await openDB();
  }
}

async function saveMission() {
  if (!store.mission) return;
  await ensureDB();
  store.mission.derniereSauvegarde = new Date().toISOString();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(store.mission);
}

async function loadMission(numeroDossier) {
  await ensureDB();
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(numeroDossier);
    req.onsuccess = () => resolve(req.result || null);
  });
}

async function listMissions() {
  await ensureDB();
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}
