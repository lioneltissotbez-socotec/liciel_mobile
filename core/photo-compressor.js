/**
 * MODULE PHOTO COMPRESSION
 * Gère la compression des photos et la sauvegarde dans la galerie
 */

const PhotoCompressor = {
  /**
   * Configuration de compression
   */
  config: {
    maxWidth: 1200,
    maxHeight: 900,
    quality: 0.85,
    format: 'image/jpeg'
  },

  /**
   * Compresse une photo
   * @param {File} file - Fichier image original
   * @returns {Promise<{original: File, compressed: Blob}>}
   */
  async compressPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calcul des dimensions en conservant le ratio
          let { width, height } = img;
          const ratio = width / height;
          
          if (width > this.config.maxWidth) {
            width = this.config.maxWidth;
            height = width / ratio;
          }
          
          if (height > this.config.maxHeight) {
            height = this.config.maxHeight;
            width = height * ratio;
          }
          
          // Redimensionnement
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Conversion en Blob compressé
          canvas.toBlob(
            (compressedBlob) => {
              if (!compressedBlob) {
                reject(new Error('Erreur de compression'));
                return;
              }
              
              const originalSize = file.size;
              const compressedSize = compressedBlob.size;
              const reduction = Math.round((1 - compressedSize / originalSize) * 100);
              
              console.log(`📸 Photo compressée: ${originalSize} → ${compressedSize} bytes (-${reduction}%)`);
              
              resolve({
                original: file,
                compressed: compressedBlob,
                reduction: reduction
              });
            },
            this.config.format,
            this.config.quality
          );
        };
        
        img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Sauvegarde la photo originale dans la galerie (File System Access API)
   * Compatible avec Samsung A5 et autres Android récents
   * @param {File} file - Fichier original à sauvegarder
   */
  async saveToGallery(file) {
    try {
      // Vérifier si l'API est supportée
      if (!('showSaveFilePicker' in window)) {
        console.warn('⚠️ File System Access API non supportée');
        // Fallback : téléchargement classique
        return this.fallbackDownload(file);
      }
      
      // Proposer l'enregistrement avec un nom suggéré
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const suggestedName = `LICIEL_${timestamp}.jpg`;
      
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedName,
        types: [{
          description: 'Images JPEG',
          accept: { 'image/jpeg': ['.jpg', '.jpeg'] }
        }]
      });
      
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      
      console.log('✅ Photo sauvegardée dans la galerie:', suggestedName);
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('ℹ️ Sauvegarde annulée par l\'utilisateur');
        return false;
      }
      
      console.error('❌ Erreur sauvegarde galerie:', error);
      // Fallback en cas d'erreur
      return this.fallbackDownload(file);
    }
  },

  /**
   * Fallback : téléchargement classique si File System Access API non disponible
   * @param {File} file - Fichier à télécharger
   */
  fallbackDownload(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    a.href = url;
    a.download = `LICIEL_${timestamp}.jpg`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ Photo téléchargée (fallback)');
    return true;
  },

  /**
   * Process complet : compression + sauvegarde galerie
   * @param {File} file - Fichier photo original
   * @returns {Promise<{original: File, compressed: Blob, saved: boolean}>}
   */
  async processPhoto(file) {
    // 1. Compression
    const { original, compressed, reduction } = await this.compressPhoto(file);
    
    // 2. Sauvegarde originale dans galerie
    const saved = await this.saveToGallery(original);
    
    return {
      original,
      compressed,
      reduction,
      saved
    };
  },

  /**
   * Convertit un Blob en File
   * @param {Blob} blob - Blob à convertir
   * @param {string} filename - Nom du fichier
   * @returns {File}
   */
  blobToFile(blob, filename) {
    return new File([blob], filename, { 
      type: blob.type,
      lastModified: Date.now()
    });
  }
};

// Export pour utilisation dans les modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoCompressor;
}
