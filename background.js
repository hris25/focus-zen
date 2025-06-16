let timerId = null;
let mode = "focus"; // "focus" ou "pause"
let isRunning = false;
let endTime = 0; // timestamp en ms indiquant fin de la phase

const focusDuration = 0.2 * 60 * 1000; // 30 secondes (en ms)
const pauseDuration = 0.2 * 60 * 1000; // 5 minutes (en ms)

// Fonction appelée à la fin de chaque phase
function onPhaseEnd() {
  isRunning = false;
  timerId = null;

  // Prévenir popup qu’une phase est terminée pour jouer le son
  chrome.runtime.sendMessage({ action: "phaseEnded" });

  // Changer de mode automatiquement
  if (mode === "focus") {
    mode = "pause";
    startTimer(); // démarrer la pause automatiquement
  } else {
    mode = "focus";
    // On ne démarre pas automatiquement le focus, utilisateur décide
    saveState();
    notifyPopupState();
  }
}

// Enregistre l’état dans le storage session (ou local)
function saveState() {
  chrome.storage.session.set({
    pomodoroState: {
      mode,
      isRunning,
      endTime,
    },
  });
}

// Informe popup pour qu’il sync son affichage
function notifyPopupState() {
  chrome.runtime.sendMessage({ action: "stateUpdated" });
}

// Démarrer timer selon le mode actuel
function startTimer() {
  if (isRunning) return; // déjà en cours

  isRunning = true;

  let duration = mode === "focus" ? focusDuration : pauseDuration;
  endTime = Date.now() + duration;

  saveState();
  notifyPopupState();

  // Nettoyer ancien timer si existant
  if (timerId) clearTimeout(timerId);

  timerId = setTimeout(onPhaseEnd, duration);
}

// Reset le timer
function resetTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  mode = "focus";
  isRunning = false;
  endTime = 0;
  saveState();
  notifyPopupState();
}

// Calcule le temps restant en ms
function getRemainingTime() {
  if (!isRunning) return 0;
  return Math.max(0, endTime - Date.now());
}

// Au démarrage du background, on récupère l’état
chrome.storage.session.get("pomodoroState", (data) => {
  if (data.pomodoroState) {
    mode = data.pomodoroState.mode || "focus";
    isRunning = data.pomodoroState.isRunning || false;
    endTime = data.pomodoroState.endTime || 0;

    // Si timer était en cours, on recrée le timeout avec le temps restant
    if (isRunning) {
      let remaining = getRemainingTime();
      if (remaining > 0) {
        timerId = setTimeout(onPhaseEnd, remaining);
      } else {
        // Temps dépassé, on lance la fin de phase directement
        onPhaseEnd();
      }
    }
  }
});

// Gestion des messages venant du popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start") {
    startTimer();
    sendResponse({ status: "started" });
  } else if (request.action === "reset") {
    resetTimer();
    sendResponse({ status: "reset" });
  } else if (request.action === "getState") {
    sendResponse({
      mode,
      isRunning,
      remainingTime: getRemainingTime(),
    });
  }
  // Important: return true pour indiquer qu'on enverra la réponse async (non nécessaire ici)
  return false;
});
