'use strict';

(function () {
  var route = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  if (route !== '/award-ceremonies') return;

  var root = document.getElementById('stratexAwardsList');
  if (!root) return;

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }()).replace(/\/+$/, '');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function dateLabel(value) {
    if (!value) return 'To be confirmed';
    var parsed = new Date(String(value).length === 10 ? value + 'T12:00:00Z' : value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleDateString('en-GB', {
      day:'numeric',
      month:'short',
      year:'numeric',
      timeZone:'UTC'
    });
  }

  function card(row) {
    var categories = Array.isArray(row.categories) ? row.categories : [];
    return (
      '<article class="s-card">' +
        '<span class="s-ic">Award</span>' +
        '<h3>' + esc(row.name || 'Stratex Football Honours') + '</h3>' +
        '<p>' + esc(row.description || 'A Stratex recognition event celebrating grassroots football achievement, development and impact.') + '</p>' +
        '<div class="s-meta" style="margin-top:16px">' +
          '<span>' + esc(dateLabel(row.event_date)) + '</span>' +
          '<span>' + esc(row.location || 'Location to be confirmed') + '</span>' +
          '<span>' + esc(row.status || 'Published') + '</span>' +
        '</div>' +
        (categories.length
          ? '<div class="s-links-row" style="margin-top:14px">' +
              categories.map(function (category) { return '<span class="s-chip">' + esc(category) + '</span>'; }).join('') +
            '</div>'
          : '') +
      '</article>'
    );
  }

  async function load() {
    try {
      var response = await fetch(API + '/api/stratex-publishing/award-ceremonies?_=' + Date.now(), {
        cache:'no-store',
        credentials:'include',
        headers:{'Cache-Control':'no-cache'}
      });
      var payload = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(payload.error || 'Award information could not be loaded.');

      var rows = payload.data || [];
      root.innerHTML = rows.length
        ? rows.map(card).join('')
        : '<div class="s-empty"><b>No public award ceremony yet.</b><p>The next Stratex Football Honours announcement will appear here after publication.</p></div>';
    } catch (error) {
      root.innerHTML =
        '<div class="s-empty"><b>Award information could not be loaded.</b>' +
        '<p>Please try again. The rest of the Stratex website remains available.</p>' +
        '<button class="s-btn line sm" type="button" data-awards-retry>Try again</button></div>';

      var retry = root.querySelector('[data-awards-retry]');
      if (retry) retry.addEventListener('click', load);
    }
  }

  load();
}());
