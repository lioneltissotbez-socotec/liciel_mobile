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

  // Titre
  const titles = {
    start: "Démarrage mission",
    pieces: "Pièces",
    photos: "Photos"
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
      photos: []
    };
  }

  store.mission = mission;
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
        <button class="secondary main"
          onclick="resumeMission('${m.numeroDossier}')">
          ${m.numeroDossier}
        </button>

        <div class="mission-actions">
          <button onclick="renameMission('${m.numeroDossier}')">✏️</button>
          <button onclick="deleteMission('${m.numeroDossier}')">🗑</button>
        </div>
      </div>
    `;
  });
}


async function resumeMission(numero) {
  store.mission = await loadMission(numero);
  go("pieces");
}

async function init() {
  await openDB();
  await renderMissionList();
  render();
}

init();
