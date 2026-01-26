// core/plomb.rules.js
// Normalisation métier des données plomb selon le mode

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function normalizePlomb(plomb, missionSettings) {
  if (!plomb || plomb.type !== "mesure") return plomb;

  const mode = missionSettings?.mode;
  const cfg = missionSettings?.plomb;

  // ===== MODE CREP =====
  if (mode === "CREP") {
    // Pas d'incertitude en CREP
    delete plomb.incertitude;

    // Mesure < 1 auto si non saisie
    if (plomb.valeur == null || plomb.valeur < 1) {
      if (cfg?.crep?.autoBelowOne) {
        plomb.valeur = randomBetween(
          cfg.crep.randomMin,
          cfg.crep.randomMax
        );
        plomb.origine = "auto";
      }
    }
  }

  // ===== MODE AVANT TRAVAUX =====
  if (mode === "AVANT_TRAVAUX") {
    // Mesure obligatoire (l’UI gérera le contrôle)
    if (plomb.valeur != null) {
      if (
        !plomb.incertitude &&
        cfg?.avantTravaux?.autoUncertainty
      ) {
        plomb.incertitude = Math.round(
          plomb.valeur * cfg.avantTravaux.uncertaintyRatio * 100
        ) / 100;
        plomb.origine = plomb.origine || "auto";
      }
    }
  }

  return plomb;
}
