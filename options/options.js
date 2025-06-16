const siteList = document.getElementById("site-list");
const newSiteInput = document.getElementById("newSite");
const durationInput = document.getElementById("blockDuration");
const addBtn = document.getElementById("addSite");

function loadSites() {
  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    siteList.innerHTML = "";
    const now = Date.now();

    data.blockedSites.forEach((siteObj, index) => {
      const li = document.createElement("li");
      const remaining = siteObj.expiresAt - now;
      const minutes = Math.ceil(remaining / 60000);
      const label =
        minutes > 0
          ? `${siteObj.domain} – ${minutes} min restantes`
          : `${siteObj.domain} – expiré`;

      li.textContent = label;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "❌";
      removeBtn.onclick = () => removeSite(index);

      li.appendChild(removeBtn);
      siteList.appendChild(li);
    });
  });
}

function addSite() {
  const domain = newSiteInput.value.trim();
  const duration = parseInt(durationInput.value);

  if (!domain || isNaN(duration)) return;

  const expiresAt = Date.now() + duration * 60 * 1000;

  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    const updated = [...data.blockedSites, { domain, expiresAt }];
    chrome.storage.local.set({ blockedSites: updated }, () => {
      newSiteInput.value = "";
      durationInput.value = "";
      loadSites();
    });
  });
}

function removeSite(index) {
  chrome.storage.local.get({ blockedSites: [] }, (data) => {
    data.blockedSites.splice(index, 1);
    chrome.storage.local.set({ blockedSites: data.blockedSites }, loadSites);
  });
}

addBtn.addEventListener("click", addSite);
loadSites();
