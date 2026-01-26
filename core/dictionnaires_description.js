// core/dictionnaires_description.js
// Charge les dictionnaires dédiés à la DESCRIPTION (UR)
// et les merge dans store.dict

async function loadDictionnairesDescription() {
  // chemins à adapter si besoin
  const PATHS = {
    types_elements: "data/types_elements.json",
    substrats: "data/substrats.json",
    revetements: "data/revetements.json"
  };

  // sécurité
  window.store = window.store || {};
  window.store.dict = window.store.dict || {};

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return res.json();
  }

  // structure minimale attendue
  function normalizeDict(key, raw) {
    if (!raw) {
      return { label: key, version: "1.0", items: [] };
    }

    // Si le fichier est déjà au bon format {label, version, items:[{id,label}]}
    if (raw.items && Array.isArray(raw.items)) return raw;

    // Si le fichier est une liste ["Mur","Sol",...]
    if (Array.isArray(raw)) {
      return {
        label: key,
        version: "1.0",
        items: raw
          .filter(Boolean)
          .map(s => String(s).trim())
          .filter(Boolean)
          .map(s => ({ id: slugify(s), label: s }))
      };
    }

    // fallback
    return { label: key, version: "1.0", items: [] };
  }

  function slugify(s) {
    return String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  try {
    const [t, s, r] = await Promise.all([
      fetchJson(PATHS.types_elements),
      fetchJson(PATHS.substrats),
      fetchJson(PATHS.revetements)
    ]);

    store.dict.types_elements = normalizeDict("Types d’éléments", t);
    store.dict.substrats = normalizeDict("Substrats", s);
    store.dict.revetements = normalizeDict("Revêtements", r);

    console.log("✅ Dictionnaires DESCRIPTION chargés", {
      types_elements: store.dict.types_elements.items.length,
      substrats: store.dict.substrats.items.length,
      revetements: store.dict.revetements.items.length
    });
  } catch (e) {
    console.error("❌ Erreur chargement dictionnaires DESCRIPTION", e);

    // on garantit que ça existe pour éviter "liste indisponible"
    store.dict.types_elements = store.dict.types_elements || { label: "Types d’éléments", version: "1.0", items: [] };
    store.dict.substrats = store.dict.substrats || { label: "Substrats", version: "1.0", items: [] };
    store.dict.revetements = store.dict.revetements || { label: "Revêtements", version: "1.0", items: [] };
  }

  return store.dict;
}
