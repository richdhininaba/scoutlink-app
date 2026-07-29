(function () {
  var host = String(window.location.hostname || '').replace(/^www\./i, '').toLowerCase();
  if (host !== 'stratexanalytics.co.uk') return;

  var version = '20260729-3';

  function setIcon(rel, href, extra) {
    var selector = 'link[rel="' + rel + '"]';
    var link = document.head.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href + '?v=' + version);
    Object.keys(extra || {}).forEach(function (key) {
      link.setAttribute(key, extra[key]);
    });
  }

  setIcon('icon', '/stratex-favicon.png', { type: 'image/png' });
  setIcon('apple-touch-icon', '/stratex-apple-touch-icon.png', { sizes: '180x180' });
}());
