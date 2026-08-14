  (() => {
  const init = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('updated')) return;

    const updated = params.get('updated');
    const msg = params.get('msg');
    let selector = '';

    if (updated === '1') {
      selector = '.update-success';
    } else if (updated === '0' && msg === 'item_not_found') {
      selector = '.update-error';
    } else {
      selector = '.update-failed';
    }

    const el = document.querySelector(selector);
    if (el) {
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 5000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();