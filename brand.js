(function () {
  const APP_NAME = 'NINQ';
  const LOGO_PATH = 'ninq-logo.svg';

  function setMeta(name, value) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    if (meta) meta.setAttribute('content', value);
  }

  function setIconLink(rel, href) {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
  }

  function applyBrand() {
    document.title = APP_NAME;
    setMeta('apple-mobile-web-app-title', APP_NAME);
    setIconLink('icon', LOGO_PATH);
    setIconLink('apple-touch-icon', LOGO_PATH);
    document.querySelectorAll('.topbar-title').forEach((title) => {
      if (title.textContent.trim() === 'GENBA BOX') title.textContent = APP_NAME;
    });
  }

  document.addEventListener('DOMContentLoaded', applyBrand);
  window.addEventListener('pageshow', applyBrand);
})();
