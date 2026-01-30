/**
 * MODULE ARCHIVAGE
 * Gestion des sauvegardes automatiques et manuelles
 * - Auto-save toutes les 10 minutes
 * - Conservation des 5 derniers snapshots
 * - Export/Import manuel en JSON
 */

const ArchiveManager = {
  /**
   * Configuration
   */
  config: {
    autoSaveInterval: 10 * 60 * 1000, // 10 minutes en millisecondes
    maxSnapshots: 5
  },

  /**
   * Timer pour l'auto-save
   */
  autoSaveTimer: null,

  /**
   * Initialisation du système d'archivage
   */
  async init() {
    console.log('📦 Initialisation du système d\'archivage');
    
    try {
      // Créer le store d'archives si nécessaire
      const db = await this.ensureArchiveStore();
      
      if (!db) {
        console.warn('⚠️ Store archives non disponible, archivage désactivé');
        return;
      }
      
      // Démarrer l'auto-save
      this.startAutoSave();
      
      console.log(`✅ Auto-save activé (toutes les ${this.config.autoSaveInterval / 60000} min)`);
    } catch (error) {
      console.error('❌ Erreur initialisation archivage:', error);
    }
  },

  /**
   * Vérifie et crée le store d'archives dans IndexedDB
   */
  async ensureArchiveStore() {
    return new Promise((resolve, reject) => {
      // Utiliser la même version que db.js
      const request = indexedDB.open('liciel-terrain-db', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Créer le store missions s'il n'existe pas
        if (!db.objectStoreNames.contains('missions')) {
          db.createObjectStore('missions', { keyPath: 'numeroDossier' });
        }
        
        // Créer le store archives s'il n'existe pas
        if (!db.objectStoreNames.contains('archives')) {
          const archiveStore = db.createObjectStore('archives', { keyPath: 'id', autoIncrement: true });
          archiveStore.createIndex('timestamp', 'timestamp', { unique: false });
          archiveStore.createIndex('missionNumero', 'missionNumero', { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        
        // Vérifier si le store archives existe
        if (!db.objectStoreNames.contains('archives')) {
          // Le store n'existe pas, on ne peut pas le créer sans upgrade
          // On résout quand même pour ne pas bloquer l'app
          console.warn('⚠️ Store archives non créé, archivage désactivé');
          db.close();
          resolve(null);
        } else {
          db.close();
          resolve(db);
        }
      };
      
      request.onerror = (event) => {
        console.error('❌ Erreur ouverture IndexedDB:', event.target.error);
        reject(event.target.error);
      };
      
      request.onblocked = () => {
        console.warn('⚠️ IndexedDB bloqué par une autre connexion');
        reject(new Error('IndexedDB blocked'));
      };
    });
  },

  /**
   * Démarre l'auto-save périodique
   */
  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.createAutoSnapshot();
    }, this.config.autoSaveInterval);
  },

  /**
   * Arrête l'auto-save
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  },

  /**
   * Crée un snapshot automatique de toutes les missions
   */
  async createAutoSnapshot() {
    try {
      const missions = await listMissions();
      
      if (!missions || missions.length === 0) {
        console.log('ℹ️ Pas de missions à sauvegarder');
        return;
      }
      
      const snapshot = {
        timestamp: new Date().toISOString(),
        type: 'auto',
        missions: missions,
        count: missions.length
      };
      
      // Sauvegarder dans IndexedDB
      const db = await this.ensureArchiveStore();
      
      if (!db) {
        console.warn('⚠️ Archivage non disponible, snapshot ignoré');
        return;
      }
      
      const tx = db.transaction('archives', 'readwrite');
      const store = tx.objectStore('archives');
      
      store.add(snapshot);
      
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      
      console.log(`✅ Auto-save effectué (${missions.length} mission(s))`);
      
      // Nettoyer les anciens snapshots
      await this.cleanOldSnapshots();
      
    } catch (error) {
      console.error('❌ Erreur auto-save:', error);
    }
  },

  /**
   * Nettoie les anciens snapshots (garde les N derniers)
   */
  async cleanOldSnapshots() {
    try {
      const db = await this.ensureArchiveStore();
      const tx = db.transaction('archives', 'readwrite');
      const store = tx.objectStore('archives');
      const index = store.index('timestamp');
      
      // Récupérer tous les snapshots triés par date
      const snapshots = await new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // Ordre décroissant
        const results = [];
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push({ id: cursor.value.id, timestamp: cursor.value.timestamp });
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
      // Supprimer les snapshots au-delà de maxSnapshots
      if (snapshots.length > this.config.maxSnapshots) {
        const toDelete = snapshots.slice(this.config.maxSnapshots);
        
        for (const snap of toDelete) {
          store.delete(snap.id);
        }
        
        console.log(`🧹 ${toDelete.length} ancien(s) snapshot(s) supprimé(s)`);
      }
      
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      
    } catch (error) {
      console.error('❌ Erreur nettoyage snapshots:', error);
    }
  },

  /**
   * Liste les snapshots disponibles
   */
  async listSnapshots() {
    try {
      const db = await this.ensureArchiveStore();
      
      // Si pas de store archives, retourner liste vide
      if (!db) {
        console.warn('⚠️ Archivage non disponible, aucun snapshot');
        return [];
      }
      
      const tx = db.transaction('archives', 'readonly');
      const store = tx.objectStore('archives');
      const index = store.index('timestamp');
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev'); // Plus récent en premier
        const results = [];
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push({
              id: cursor.value.id,
              timestamp: cursor.value.timestamp,
              type: cursor.value.type,
              count: cursor.value.count
            });
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.error('❌ Erreur liste snapshots:', error);
      return [];
    }
  },

  /**
   * Restaure un snapshot
   */
  async restoreSnapshot(snapshotId) {
    try {
      const db = await this.ensureArchiveStore();
      
      // Récupérer le snapshot
      const txGet = db.transaction('archives', 'readonly');
      const snapshot = await new Promise((resolve, reject) => {
        const request = txGet.objectStore('archives').get(snapshotId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (!snapshot || !snapshot.missions) {
        throw new Error('Snapshot invalide');
      }
      
      // Remplacer toutes les missions
      const txRestore = db.transaction('missions', 'readwrite');
      const missionStore = txRestore.objectStore('missions');
      
      // Vider le store
      missionStore.clear();
      
      // Ajouter les missions du snapshot
      for (const mission of snapshot.missions) {
        missionStore.put(mission);
      }
      
      await new Promise((resolve, reject) => {
        txRestore.oncomplete = resolve;
        txRestore.onerror = () => reject(txRestore.error);
      });
      
      console.log(`✅ Snapshot restauré (${snapshot.missions.length} mission(s))`);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur restauration snapshot:', error);
      return false;
    }
  },

  /**
   * Export manuel de toutes les missions en JSON
   */
  async exportToFile() {
    try {
      const missions = await listMissions();
      
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        missions: missions
      };
      
      // Convertir en JSON
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      
      // Télécharger
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      
      a.href = url;
      a.download = `LICIEL_Export_${timestamp}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      console.log(`✅ Export JSON créé (${missions.length} mission(s))`);
      return true;
      
    } catch (error) {
      console.error('❌ Erreur export:', error);
      return false;
    }
  },

  /**
   * Import manuel depuis un fichier JSON
   */
  async importFromFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.missions || !Array.isArray(data.missions)) {
        throw new Error('Format de fichier invalide');
      }
      
      const db = await this.ensureArchiveStore();
      const tx = db.transaction('missions', 'readwrite');
      const store = tx.objectStore('missions');
      
      let imported = 0;
      let skipped = 0;
      
      for (const mission of data.missions) {
        // Vérifier si la mission existe déjà
        const existing = await new Promise((resolve) => {
          const request = store.get(mission.numeroDossier);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });
        
        if (existing) {
          // Demander confirmation avant d'écraser
          const overwrite = confirm(`Mission ${mission.numeroDossier} existe déjà. Écraser ?`);
          if (!overwrite) {
            skipped++;
            continue;
          }
        }
        
        store.put(mission);
        imported++;
      }
      
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      
      console.log(`✅ Import terminé: ${imported} importée(s), ${skipped} ignorée(s)`);
      return { imported, skipped };
      
    } catch (error) {
      console.error('❌ Erreur import:', error);
      throw error;
    }
  },

  /**
   * Supprime tous les snapshots automatiques
   */
  async clearAllSnapshots() {
    try {
      const db = await this.ensureArchiveStore();
      const tx = db.transaction('archives', 'readwrite');
      tx.objectStore('archives').clear();
      
      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      
      console.log('✅ Tous les snapshots ont été supprimés');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur suppression snapshots:', error);
      return false;
    }
  }
};

// Export pour accès global
window.ArchiveManager = ArchiveManager;
