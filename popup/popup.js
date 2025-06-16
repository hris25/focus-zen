let timer;
let timeLeft;
let isRunning = false;
let mode = "focus"; // "focus" ou "pause"

const focusDuration = 0.5 * 60;
const pauseDuration = 5 * 60;

const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("start");
const siteList = document.getElementById("siteList");
const newSiteInput = document.getElementById("newSite");
const addSiteBtn = document.getElementById("addSite");

const dingSound = new Audio(chrome.runtime.getURL("sounds/ding.mp3"));

function updateDisplay() {
  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  mode = "focus";
  timeLeft = focusDuration;
  startButton.textContent = "Démarrer";
  updateDisplay();
}

function switchToPause() {
  mode = "pause";
  timeLeft = pauseDuration;
  updateDisplay();
  startButton.textContent = "Pause en cours...";
  timer = setInterval(runTimer, 1000);
}

function switchToFocus() {
  mode = "focus";
  timeLeft = focusDuration;
  updateDisplay();
  startButton.textContent = "Démarrer";
  isRunning = false;
}

function runTimer() {
  if (timeLeft <= 0) {
    clearInterval(timer);
    dingSound.play();
    if (mode === "focus") {
      // Passage automatique à la pause
      timerDisplay.textContent = "🧘 Pause !";
      setTimeout(switchToPause, 1000);
    } else {
      // Fin de pause
      timerDisplay.textContent = "✔️ Fin de pause !";
      setTimeout(switchToFocus, 1000);
    }
  } else {
    timeLeft--;
    updateDisplay();
  }
}

function startTimer() {
  if (isRunning) {
    resetTimer();
    return;
  }

  isRunning = true;
  startButton.textContent = "Réinitialiser";

  if (mode === "focus") {
    timeLeft = focusDuration;
  } else {
    timeLeft = pauseDuration;
  }

  timer = setInterval(runTimer, 1000);
}

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
  const duration = parseInt(document.getElementById("blockDuration").value);

  if (!newSite || isNaN(duration)) return;

  const expiresAt = Date.now() + duration * 60 * 1000;

  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    const updated = [...data.blockedSites, { domain: newSite, expiresAt }];
    chrome.storage.local.set({ blockedSites: updated }, () => {
      newSiteInput.value = "";
      document.getElementById("blockDuration").value = "";
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

addSiteBtn.addEventListener("click", addSite);
loadSites();
loadStats();

startButton.addEventListener("click", startTimer);
resetTimer();
