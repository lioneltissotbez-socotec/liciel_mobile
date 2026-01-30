// core/footer.js
// Gestion du footer dynamique selon le contexte (accueil / mission)

/**
 * Met à jour le footer selon le contexte
 * @param {string} context - 'home' | 'mission'
 */
function updateFooter(context = 'home') {
  const footer = document.getElementById('app-footer');
  if (!footer) return;
  
  footer.innerHTML = '';
  
  if (context === 'home') {
    // Page d'accueil : footer vide (ou archivage futur)
    footer.style.display = 'none';
    return;
  }
  
  if (context === 'mission') {
    // Mission ouverte : afficher les icônes
    footer.style.display = 'block';
    
    // Créer un container pour le scroll horizontal
    const container = document.createElement('div');
    
    // Icône 1 : Retour dossiers
    const btnDossiers = createFooterButton(
      'assets/icons/dossiers.svg',
      'Dossiers',
      () => go('start')
    );
    container.appendChild(btnDossiers);
    
    // Icône 2 : Résumé mission (toujours visible)
    const btnResume = createFooterButton(
      'assets/icons/Maison.png',
      'Résumé',
      () => go('resume')
    );
    container.appendChild(btnResume);
    
    // Icône 3 : Pièces
    const btnPieces = createFooterButton(
      'assets/icons/Pieces.png',
      'Pièces',
      () => go('pieces')
    );
    container.appendChild(btnPieces);
    
    // Icône 4 : Photos
    const btnPhotos = createFooterButton(
      'assets/icons/photo.png',
      'Photos',
      () => go('photos')
    );
    container.appendChild(btnPhotos);
    
    // Modules conditionnels (selon mission active)
    if (store.mission?.modules) {
      const modules = store.mission.modules;
      
      // Amiante
      if (modules.amiante) {
        const btnAmiante = createFooterButton(
          'assets/icons/amiante.png',
          'Amiante',
          () => go('amiante')
        );
        container.appendChild(btnAmiante);
      }
      
      // Plomb (CREP ou Avant Travaux)
      if (store.mission.settings?.mode === 'CREP' || modules.plombTravaux) {
        const btnPlomb = createFooterButton(
          'assets/icons/plomb.png',
          'Plomb',
          () => go('plomb')
        );
        container.appendChild(btnPlomb);
      }
      
      // Électricité
      if (modules.electricite) {
        const btnElec = createFooterButton(
          'assets/icons/electicite.png',
          'Électricité',
          () => go('electricite')
        );
        container.appendChild(btnElec);
      }
      
      // Gaz
      if (modules.gaz) {
        const btnGaz = createFooterButton(
          'assets/icons/gaz.png',
          'Gaz',
          () => go('gaz')
        );
        container.appendChild(btnGaz);
      }
      
      // DPE
      if (modules.dpe) {
        const btnDPE = createFooterButton(
          'assets/icons/DPE.png',
          'DPE',
          () => go('dpe')
        );
        container.appendChild(btnDPE);
      }
      
      // Termites
      if (modules.termites) {
        const btnTermites = createFooterButton(
          'assets/icons/termites.png',
          'Termites',
          () => go('termites')
        );
        container.appendChild(btnTermites);
      }
      
      // Mesurages
      if (modules.mesurages) {
        const btnMesurages = createFooterButton(
          'assets/icons/mesurage.png',
          'Mesurages',
          () => go('mesurages')
        );
        container.appendChild(btnMesurages);
      }
    }
    
    footer.appendChild(container);
  }
}

/**
 * Crée un bouton de footer avec icône
 * @param {string} iconPath - Chemin vers l'icône
 * @param {string} label - Label du bouton
 * @param {function} onClick - Callback au clic
 */
function createFooterButton(iconPath, label, onClick) {
  const btn = document.createElement('button');
  btn.className = 'footer-btn';
  btn.setAttribute('aria-label', label);
  btn.title = label;
  
  const img = document.createElement('img');
  img.src = iconPath;
  img.alt = label;
  img.className = 'footer-icon';
  
  btn.appendChild(img);
  btn.addEventListener('click', onClick);
  
  return btn;
}

// Exposer globalement
window.updateFooter = updateFooter;
