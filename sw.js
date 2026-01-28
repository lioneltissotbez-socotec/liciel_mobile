/**
 * LICIEL Mobile - Service Worker
 * Gère le cache et le mode offline
 */

const CACHE_NAME = 'liciel-mobile-v5';
const CACHE_VERSION = '3.2.0';

// Fichiers à mettre en cache pour le mode offline
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  
  // Core
  './core/db.js',
  './core/store.js',
  './core/migrations.js',
  './core/dictionnaires.js',
  './core/dictionnaires_description.js',
  './core/plomb.rules.js',
  './core/photo-compressor.js',
  './core/archive-manager.js',
  './core/utils.js',
  
  // Modules
  './modules/pieces/pieces.ui.js',
  './modules/pieces/pieces.model.js',
  './modules/pieces/pieces.css',
  './modules/photos/photos.ui.js',
  './modules/photos/photos.css',
  './modules/description/description.ui.js',
  './modules/description/description.css',
  './modules/export/export.utils.js',
  './modules/export/export.pieces.js',
  './modules/export/export.photos.js',
  './modules/export/export.description.js',
  './modules/export/export.zip.js',
  
  // Data
  './data/dictionnaires.json',
  './data/revetements.json',
  './data/substrats.json',
  './data/types_elements.json'
];

/**
 * Installation du Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Mise en cache des fichiers');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Installation terminée');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Erreur lors de l\'installation:', error);
      })
  );
});

/**
 * Activation du Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Supprimer les anciens caches
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Suppression ancien cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation terminée');
        return self.clients.claim();
      })
  );
});

/**
 * Interception des requêtes réseau
 * Stratégie: Cache First, Network Fallback
 */
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET (POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes vers des domaines externes
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Fichier trouvé en cache
          return cachedResponse;
        }
        
        // Fichier non trouvé en cache, récupérer depuis le réseau
        return fetch(event.request)
          .then((networkResponse) => {
            // Ne pas mettre en cache les requêtes échouées
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Cloner la réponse (car elle ne peut être consommée qu'une fois)
            const responseToCache = networkResponse.clone();
            
            // Mettre à jour le cache avec la nouvelle version
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Erreur réseau et pas de cache
            // Retourner une page offline personnalisée (optionnel)
            console.log('[SW] Offline et pas de cache pour:', event.request.url);
          });
      })
  );
});

/**
 * Gestion des messages depuis l'application
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('[SW] Cache vidé');
          return caches.open(CACHE_NAME);
        })
        .then((cache) => {
          return cache.addAll(FILES_TO_CACHE);
        })
    );
  }
});

console.log('[SW] Service Worker chargé - Version:', CACHE_VERSION);
