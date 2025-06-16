document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("closeBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      window.location.href = "chrome://newtab";
    });
  }
});
