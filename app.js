function go(screen) {
  store.ui.screen = screen;
  render();
}

function render() {
  // Active / désactive les écrans
  document.querySelectorAll(".screen")
    .forEach(s => s.classList.remove("active"));

  const active = document.getElementById("screen-" + store.ui.screen);
  if (active) active.classList.add("active");

  // Rendu spécifique par écran
  if (store.ui.screen === "pieces" && typeof renderPiecesScreen === "function") {
    renderPiecesScreen();
  }

  if (store.ui.screen === "photos" && typeof renderPhotosScreen === "function") {
    renderPhotosScreen();
  }

  if (store.ui.screen === "description" && typeof renderDescriptionScreen === "function") {
  renderDescriptionScreen();
}

  // Titre
  const titles = {
    start: "Démarrage mission",
    pieces: "Pièces",
    photos: "Photos",
    description: "Description de la pièce",
  };

  document.getElementById("header-title").innerText =
    titles[store.ui.screen] || "";
}

async function startMission() {
  const numero = document.getElementById("input-dossier").value.trim();
  if (!numero) {
    alert("Numéro de dossier obligatoire");
    return;
  }

  let mission = await loadMission(numero);

  if (!mission) {
  mission = {
    numeroDossier: numero,
    dateCreation: new Date().toISOString(),
    derniereSauvegarde: null,

    pieces: [],
    zpsos: [],
    prelevements: [],
    photos: [],

    // 🔴 PARAMÉTRAGE MÉTIER PL0MB
    settings: {
      mode: "CREP", // valeur par défaut

      plomb: {
        crep: {
          autoBelowOne: true,
          randomMin: 0.05,
          randomMax: 0.95
        },
        avantTravaux: {
          autoUncertainty: true,
          uncertaintyRatio: 0.10
        }
      }
    }
  };
}


  store.mission = mission;
  ensureMissionSettings(store.mission);
  await saveMission();
  go("pieces");
}

async function renderMissionList() {
  const list = await listMissions();
  const c = document.getElementById("missions-list");
  c.innerHTML = "";

  list.forEach(m => {
    c.innerHTML += `
      <div class="mission-row">

        <!-- 📦 EXPORT -->
        <button
          class="secondary"
          title="Exporter la mission"
          onclick="exportMissionByNumero('${m.numeroDossier}')">
          📦
        </button>

        <!-- ▶️ OUVRIR LA MISSION -->
        <button
          class="secondary main"
          onclick="resumeMission('${m.numeroDossier}')">
          ${m.numeroDossier}
        </button>

        <!-- ✏️ / 📷 / 🗑 -->
        <div class="mission-actions">

        
  <!-- 📷 Photo principale -->
  <button
    title="Photo de présentation du bien"
    onclick="addMissionPhoto('${m.numeroDossier}')">
    📷
  </button>

  <!-- ✏️ Renommer -->
  <button
    title="Renommer la mission"
    onclick="renameMission('${m.numeroDossier}')">
    ✏️
  </button>

  <!-- 🗑 Supprimer -->
  <button
    title="Supprimer la mission"
    onclick="deleteMission('${m.numeroDossier}')">
    🗑
  </button>

</div>


      </div>
    `;
  });
}


async function renameMission(oldNumero) {
  const newNumero = prompt(
    "Nouveau numéro de dossier :",
    oldNumero
  );
  if (!newNumero || newNumero === oldNumero) return;

  const mission = await loadMission(oldNumero);
  if (!mission) return;

  mission.numeroDossier = newNumero;

  const tx = db.transaction("missions", "readwrite");
  const storeOS = tx.objectStore("missions");
  storeOS.delete(oldNumero);
  storeOS.put(mission);

  await renderMissionList();
}

async function deleteMission(numero) {
  if (!confirm(`Supprimer définitivement la mission ${numero} ?`)) return;

  const tx = db.transaction("missions", "readwrite");
  tx.objectStore("missions").delete(numero);

  await renderMissionList();
}

function ensureMissionSettings(mission) {
  if (!mission.settings) {
    mission.settings = {
      mode: "CREP",

      plomb: {
        crep: {
          autoBelowOne: true,
          randomMin: 0.05,
          randomMax: 0.95
        },
        avantTravaux: {
          autoUncertainty: true,
          uncertaintyRatio: 0.10
        }
      }
    };
  }
}

async function resumeMission(numero) {
  store.mission = await loadMission(numero);
  ensureMissionSettings(store.mission); // 🔴 ICI
  go("pieces");
}


async function init() {
  await openDB();
  await loadDictionnaires();
  await loadDictionnairesDescription();
  await renderMissionList();
  render();
}

init();
// 🔥 Autosave global (mobile-like)
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveMission();
  }
});

window.addEventListener("beforeunload", () => {
  saveMission();
});

async function exportMissionByNumero(numero) {
  const mission = await loadMission(numero);
  if (!mission) {
    alert("Mission introuvable");
    return;
  }
  exportMissionZIP(mission);
}
