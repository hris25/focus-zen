// Variables globales
let timer = null;
let timeLeft = 0;
let isRunning = false;
let mode = "focus"; // "focus" ou "pause"

const focusDuration = 0.5 * 60; // en secondes (ex: 30s)
const pauseDuration = 5 * 60; // en secondes (ex: 5min)

const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("start");
const siteList = document.getElementById("siteList");
const newSiteInput = document.getElementById("newSite");
const addSiteBtn = document.getElementById("addSite");
const blockDurationInput = document.getElementById("blockDuration");

const dingSound = new Audio(chrome.runtime.getURL("sounds/ding.mp3"));

// Met à jour l'affichage du timer mm:ss
function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

// Reset local (popup) du timer (sans toucher au background)
function resetTimer() {
  clearInterval(timer);
  timer = null;
  isRunning = false;
  mode = "focus";
  timeLeft = focusDuration;
  startButton.textContent = "Démarrer";
  updateDisplay();
}

// Sync l'affichage avec l'état du background
function syncWithBackground() {
  chrome.runtime.sendMessage({ action: "getState" }, (response) => {
    if (!response) {
      resetTimer();
      return;
    }
    mode = response.mode;
    isRunning = response.isRunning;
    timeLeft = Math.ceil(response.remainingTime / 1000);

    updateDisplay();
    startButton.textContent = isRunning ? "Réinitialiser" : "Démarrer";

    if (isRunning && !timer) {
      // Démarre le timer local pour affichage (1s)
      timer = setInterval(() => {
        if (timeLeft <= 0) {
          clearInterval(timer);
          timer = null;
        } else {
          timeLeft--;
          updateDisplay();
        }
      }, 1000);
    }
  });
}

// Fonction pour démarrer ou reset le timer via background
function startTimer() {
  if (isRunning) {
    // Reset timer
    chrome.runtime.sendMessage({ action: "reset" });
    resetTimer();
  } else {
    // Démarrer timer
    chrome.runtime.sendMessage({ action: "start" });
    isRunning = true;
    startButton.textContent = "Réinitialiser";
    // On ne connaît pas encore le temps restant, on attend le message getState
  }
}

// Ecoute les messages du background (notamment fin de phase)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "phaseEnded") {
    setTimeout(() => {
      dingSound.play();
    }, 500);
  } else if (request.action === "stateUpdated") {
    // Le background a mis à jour l'état, on sync l'affichage
    syncWithBackground();
  }
});

// Gestion liste sites bloqués et stats

function loadSites() {
  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    siteList.innerHTML = "";
    const now = Date.now();

    data.blockedSites.forEach((siteObj, index) => {
      const li = document.createElement("li");
      const remaining = siteObj.expiresAt - now;
      const minutes = Math.ceil(remaining / 60000);

      li.textContent = `${siteObj.domain} (${
        minutes > 0 ? minutes + " min" : "expiré"
      })`;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "❌";
      removeBtn.style.marginLeft = "10px";
      removeBtn.onclick = () => removeSite(index);

      li.appendChild(removeBtn);
      siteList.appendChild(li);
    });
  });
}

function loadStats() {
  chrome.storage.local.get({ stats: {} }, (data) => {
    const statsDiv = document.getElementById("stats");
    statsDiv.innerHTML = "<h3>Stats 📈</h3>";

    const list = document.createElement("ul");

    const entries = Object.entries(data.stats);
    if (entries.length === 0) {
      statsDiv.innerHTML += "<p>Pas encore de données</p>";
      return;
    }

    entries.forEach(([site, count]) => {
      const li = document.createElement("li");
      li.textContent = `${site} → ${count} fois bloqué`;
      list.appendChild(li);
    });

    statsDiv.appendChild(list);
  });
}

function addSite() {
  const newSite = newSiteInput.value.trim();
  const duration = parseInt(blockDurationInput.value);

  if (!newSite || isNaN(duration)) return;

  const expiresAt = Date.now() + duration * 60 * 1000;

  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    const updated = [...data.blockedSites, { domain: newSite, expiresAt }];
    chrome.storage.local.set({ blockedSites: updated }, () => {
      newSiteInput.value = "";
      blockDurationInput.value = "";
      loadSites();
    });
  });
}

// Supprimer un site
function removeSite(index) {
  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    data.blockedSites.splice(index, 1);
    chrome.storage.local.set({ blockedSites: data.blockedSites }, loadSites);
  });
}

// Listeners
addSiteBtn.addEventListener("click", addSite);
startButton.addEventListener("click", startTimer);

// Initialisation
resetTimer();
loadSites();
loadStats();
syncWithBackground();
