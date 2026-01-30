/**
 * MODULE TEMPLATES
 * Gestion de la saisie assistée par templates
 */

// Stockage des templates chargés
let templatesPieces = null;
let templatesDescriptions = null;

/**
 * Charge les templates de pièces
 */
async function loadTemplatesPieces() {
  if (templatesPieces) return templatesPieces;
  
  try {
    const response = await fetch('data/templates-pieces.json');
    templatesPieces = await response.json();
    console.log('✅ Templates pièces chargés');
    return templatesPieces;
  } catch (error) {
    console.error('❌ Erreur chargement templates pièces:', error);
    return null;
  }
}

/**
 * Charge les templates de descriptions
 */
async function loadTemplatesDescriptions() {
  if (templatesDescriptions) return templatesDescriptions;
  
  try {
    const response = await fetch('data/templates-descriptions.json');
    templatesDescriptions = await response.json();
    console.log('✅ Templates descriptions chargés');
    return templatesDescriptions;
  } catch (error) {
    console.error('❌ Erreur chargement templates descriptions:', error);
    return null;
  }
}

/**
 * Affiche/masque le sélecteur de template
 */
function toggleTemplateSelector() {
  const checkbox = document.getElementById('use-template');
  const options = document.getElementById('template-options');
  
  if (checkbox && options) {
    options.style.display = checkbox.checked ? 'block' : 'none';
  }
}

/**
 * Affiche/masque le sélecteur de template dans la modal
 */
function toggleModalTemplateSelector() {
  const checkbox = document.getElementById('modal-use-template');
  const options = document.getElementById('modal-template-options');
  
  if (checkbox && options) {
    options.style.display = checkbox.checked ? 'block' : 'none';
  }
}

/**
 * Ouvre la modal nouvelle mission
 */
function openNewMissionModal() {
  document.getElementById('new-mission-modal').style.display = 'flex';
  document.getElementById('modal-input-dossier').value = '';
  document.getElementById('modal-type-bien').value = '';
  document.getElementById('modal-liste-pieces').value = 'standard';
  document.getElementById('modal-template-section').style.display = 'none';
}

/**
 * Ferme la modal nouvelle mission
 */
function closeNewMissionModal() {
  document.getElementById('new-mission-modal').style.display = 'none';
}

/**
 * Met à jour la visibilité de la section templates
 */
async function updateModalTemplateVisibility() {
  const typeBien = document.getElementById('modal-type-bien').value;
  const listePieces = document.getElementById('modal-liste-pieces').value;
  const templateSection = document.getElementById('modal-template-section');
  
  // Masquer si Industrie OU si liste client (UNICIL/ODHAC)
  if (typeBien === 'industrie' || listePieces === 'unicil' || listePieces === 'odhac87') {
    templateSection.style.display = 'none';
    return;
  }
  
  // Afficher si Habitation ou Tertiaire + Standard
  if ((typeBien === 'habitation' || typeBien === 'tertiaire') && listePieces === 'standard') {
    templateSection.style.display = 'block';
    
    // Charger les templates selon le type
    await loadModalTemplates(typeBien);
  } else {
    templateSection.style.display = 'none';
  }
}

/**
 * Charge les templates selon le type de bien
 */
async function loadModalTemplates(typeBien) {
  const select = document.getElementById('modal-template-subtype');
  select.innerHTML = '<option value="">-- Sélectionner un modèle --</option>';
  
  if (!typeBien) return;
  
  const templates = await loadTemplatesPieces();
  if (!templates) return;
  
  let category = typeBien === 'habitation' ? 'habitations' : typeBien;
  if (!templates[category]) return;
  
  const categoryTemplates = templates[category];
  for (const [key, template] of Object.entries(categoryTemplates)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.label;
    select.appendChild(option);
  }
}

/**
 * Met à jour les sous-types selon la catégorie
 */
async function updateTemplateSubTypes() {
  const category = document.getElementById('template-category').value;
  const container = document.getElementById('template-subtype-container');
  const select = document.getElementById('template-subtype');
  
  if (!category) {
    container.style.display = 'none';
    return;
  }
  
  const templates = await loadTemplatesPieces();
  if (!templates || !templates[category]) {
    container.style.display = 'none';
    return;
  }
  
  // Vider et remplir le select
  select.innerHTML = '<option value="">-- Sélectionner un modèle --</option>';
  
  const categoryTemplates = templates[category];
  for (const [key, template] of Object.entries(categoryTemplates)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.label;
    select.appendChild(option);
  }
  
  container.style.display = 'block';
}

/**
 * Récupère le template sélectionné (depuis l'écran principal)
 */
async function getSelectedTemplate() {
  const useTemplate = document.getElementById('use-template');
  if (!useTemplate || !useTemplate.checked) return null;
  
  const category = document.getElementById('template-category').value;
  const subtype = document.getElementById('template-subtype').value;
  
  if (!category || !subtype) return null;
  
  const templates = await loadTemplatesPieces();
  if (!templates || !templates[category] || !templates[category][subtype]) {
    return null;
  }
  
  return {
    category,
    subtype,
    template: templates[category][subtype]
  };
}

/**
 * Récupère le template sélectionné depuis la modal
 */
async function getSelectedTemplateFromModal() {
  const templateSection = document.getElementById('modal-template-section');
  
  // Si la section n'est pas visible, pas de template
  if (templateSection.style.display === 'none') {
    return null;
  }
  
  const useTemplate = document.getElementById('modal-use-template');
  if (!useTemplate || !useTemplate.checked) return null;
  
  const typeBien = document.getElementById('modal-type-bien').value;
  const subtype = document.getElementById('modal-template-subtype').value;
  
  if (!typeBien || !subtype) return null;
  
  const templates = await loadTemplatesPieces();
  let category = typeBien === 'habitation' ? 'habitations' : typeBien;
  
  if (!templates || !templates[category] || !templates[category][subtype]) {
    console.warn('⚠️ Template non trouvé:', category, subtype);
    return null;
  }
  
  console.log('✅ Template sélectionné:', templates[category][subtype].label);
  
  return {
    category,
    subtype,
    template: templates[category][subtype]
  };
}

/**
 * Applique le template de pièces à la mission
 */
function applyPiecesTemplate(mission, templateData) {
  if (!templateData || !templateData.template) return;
  
  const template = templateData.template;
  
  // Créer les pièces depuis le template
  mission.pieces = template.pieces
    .filter(p => !p.optionnel) // Ignorer les pièces optionnelles par défaut
    .map(p => ({
      id: crypto.randomUUID(),
      nom: p.nom,
      batiment: p.batiment,
      descriptions: [],
      photos: []
    }));
  
  // Stocker les infos du template
  mission.contexte = {
    typeBien: templateData.category,
    sousType: templateData.subtype,
    templatesUtilises: true,
    label: template.label
  };
  
  console.log(`✅ Template appliqué: ${template.label} (${mission.pieces.length} pièces)`);
}

/**
 * Récupère le template de descriptions par défaut
 */
async function getDefaultDescriptionsTemplate() {
  const templates = await loadTemplatesDescriptions();
  return templates ? templates.defaut : null;
}

/**
 * Applique le template de descriptions à une pièce
 */
function applyDescriptionsTemplate(piece) {
  return new Promise(async (resolve) => {
    const template = await getDefaultDescriptionsTemplate();
    if (!template) {
      console.warn('⚠️ Pas de template descriptions disponible');
      resolve(false);
      return;
    }
    
    // Créer les URs depuis le template
    piece.descriptions = template.map(item => ({
      id: crypto.randomUUID(),
      type: item.type,
      revetement: "",
      substrat: "",
      localisation: {
        items: item.localisations || [], // 🔥 Utiliser items pour correspondre à la structure
        lettres: [],
        numeros: []
      },
      plombByLoc: {}
    }));
    
    console.log(`✅ Template descriptions appliqué: ${piece.descriptions.length} éléments`);
    resolve(true);
  });
}

// Export pour utilisation globale
window.toggleTemplateSelector = toggleTemplateSelector;
window.updateTemplateSubTypes = updateTemplateSubTypes;
window.getSelectedTemplate = getSelectedTemplate;
window.applyPiecesTemplate = applyPiecesTemplate;
window.getDefaultDescriptionsTemplate = getDefaultDescriptionsTemplate;
window.applyDescriptionsTemplate = applyDescriptionsTemplate;

// Export des nouvelles fonctions
window.toggleModalTemplateSelector = toggleModalTemplateSelector;
window.openNewMissionModal = openNewMissionModal;
window.closeNewMissionModal = closeNewMissionModal;
window.updateModalTemplateVisibility = updateModalTemplateVisibility;
window.loadModalTemplates = loadModalTemplates;
window.getSelectedTemplateFromModal = getSelectedTemplateFromModal;
