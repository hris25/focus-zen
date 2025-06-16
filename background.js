chrome.webRequest.onBeforeRequest.addListener(
  async function (details) {
    const url = new URL(details.url);
    const hostname = url.hostname;
    const now = Date.now();

    return new Promise((resolve) => {
      chrome.storage.local.get({ blockedSites: [], stats: {} }, (data) => {
        // Nettoyer les expirés
        const activeBlocks = data.blockedSites.filter(
          (site) => now < site.expiresAt && hostname.includes(site.domain)
        );

        if (activeBlocks.length > 0) {
          // Stats
          const stats = data.stats || {};
          stats[hostname] = (stats[hostname] || 0) + 1;
          chrome.storage.local.set({ stats });

          resolve({ redirectUrl: chrome.runtime.getURL("blocked.html") });
        } else {
          resolve({});
        }
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
