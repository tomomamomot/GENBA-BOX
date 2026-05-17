(function () {
  const APP_NAME = 'NINQ';

  function setMeta(name, value) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) meta.setAttribute('content', value);
  }

  function applyBrand() {
    document.title = APP_NAME;
    setMeta('apple-mobile-web-app-title', APP_NAME);
    document.querySelectorAll('.topbar-title').forEach((title) => {
      if (title.textContent.trim() === 'GENBA BOX') title.textContent = APP_NAME;
    });
  }

  document.addEventListener('DOMContentLoaded', applyBrand);
  window.addEventListener('pageshow', applyBrand);
})();
