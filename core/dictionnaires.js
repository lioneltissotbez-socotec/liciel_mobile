// core/dictionnaires.js
// Charge data/dictionnaires.json et le met dans store.dict

async function loadDictionnaires() {
  try {
    const res = await fetch("data/dictionnaires.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();

    // On stocke dans le store pour accès global
    if (!window.store) window.store = {};
    window.store.dict = json;

    console.log("✅ Dictionnaires chargés", {
      batiments: json?.batiments?.items?.length ?? 0,
      pieces: json?.pieces?.items?.length ?? 0,
      justifications: json?.justifications?.items?.length ?? 0,
      moyens: json?.moyens?.items?.length ?? 0
    });

    return json;
  } catch (e) {
    console.error("❌ Erreur chargement dictionnaires.json", e);
    // On garde un dict vide pour éviter de casser l'app
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

