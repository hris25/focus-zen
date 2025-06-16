chrome.storage.local.get(["blockedSites"], (res) => {
  const blockedSites = res.blockedSites || [];
  const currentHost = window.location.hostname;
  const now = Date.now();

  const isBlocked = blockedSites.some((site) => {
    return now < site.expiresAt && currentHost.includes(site.domain);
  });

  if (isBlocked) {
    const redirectUrl = chrome.runtime.getURL("blocked.html");
    window.location.replace(redirectUrl);
  }
});
