'use strict';

/*
 * Canonical Scout position and attribute adapter.
 *
 * Loaded after the existing Scout experience. It removes obsolete position
 * choices from search, rankings, comparison, setup and prediction controls and
 * renders the Scout profile's All attributes section from V4 attribute_ratings.
 */
(function () {
  var client = null;
  var options = null;
  var initAttempts = 0;
  var watchedRoots = new WeakSet();
  var scheduled = false;

  function positionCandidate(select) {
    var key = [
      select.id,
      select.name,
      select.getAttribute('data-field'),
      select.getAttribute('data-filter'),
      select.getAttribute('aria-label')
    ].filter(Boolean).join(' ').toLowerCase();

    if (!key) return false;
    if (/formation|position group|posgroup|group position|playerpositions|position played/.test(key)) return false;
    return /position|role position|target position|preferred position/.test(key);
  }

  function groupCandidate(select) {
    var key = [
      select.id,
      select.name,
      select.getAttribute('data-field'),
      select.getAttribute('data-filter'),
      select.getAttribute('aria-label')
    ].filter(Boolean).join(' ').toLowerCase();
    return /position.?group|posgroup/.test(key);
  }

  function selectedGroup(select, root) {
    var form = select.closest('form') || root;
    var group = form.querySelector && form.querySelector(
      'select[id*="positionGroup"],select[id*="position-group"],select[name*="positionGroup"],select[name*="position_group"],select[id*="posGroup"]'
    );
    return group ? group.value : '';
  }

  function replaceGroupSelect(select) {
    var selected = select.value === 'Forward' ? 'Attacker' : select.value;
    client.renderGroupOptions(select, selected);
    select.setAttribute('data-v4-position-group', '1');
  }

  function replacePositionSelect(select, root) {
    if (select.getAttribute('data-v4-position-select') === '1') return;
    var selected = client.normalisePosition(select.value);
    var group = selectedGroup(select, root);
    client.renderPositionOptions(select, group, selected, options);
    select.setAttribute('data-v4-position-select', '1');
  }

  function canonicaliseButtons(root) {
    root.querySelectorAll('[data-position],[data-pos],[data-value]').forEach(function (element) {
      var raw = element.getAttribute('data-position') ||
        element.getAttribute('data-pos') ||
        element.getAttribute('data-value');
      if (!raw) return;
      var canonical = client.normalisePosition(raw);
      if (!canonical) return;
      if (element.hasAttribute('data-position')) element.setAttribute('data-position', canonical);
      if (element.hasAttribute('data-pos')) element.setAttribute('data-pos', canonical);
      if (element.hasAttribute('data-value')) element.setAttribute('data-value', canonical);
      if (/^(CDM|CAM|B2B|RCM|LCM|RDM|LDM|RAM|LAM|LS|RS|SS|BPD|RCB|LCB|SW)$/i.test(element.textContent.trim())) {
        element.textContent = canonical;
      }
    });
  }

  function activePlayer() {
    var candidates = [
      window._profilePlayer,
      window.currentProfilePlayer,
      window.currentPlayer,
      window.selectedPlayer,
      window.scoutSelectedPlayer
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      if (candidates[index] && (candidates[index].id || candidates[index].first_name)) return candidates[index];
    }

    try {
      if (typeof window.getDemoState === 'function') {
        var state = window.getDemoState();
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id') || state.selectedPlayerId;
        var player = (state.players || []).find(function (row) { return String(row.id) === String(id); });
        if (player) return player;
      }
    } catch (_) {}
    return null;
  }

  function ratingRows(player) {
    var position = player.primary_position || player.specific_position;
    var attributes = client.attributesForPosition(position, options);
    var flat = client.flattenRatings(player.attribute_ratings || player.attributeRatings || {});
    return attributes.map(function (row) {
      var value = flat[row[0]];
      var valid = Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10;
      return '<div class="sl-v4-attribute-row">' +
        '<span>' + client.esc(row[1]) + '</span>' +
        '<i><em style="width:' + (valid ? Number(value) * 10 : 0) + '%"></em></i>' +
        '<b>' + (valid ? Number(value) + '/10' : 'Not observed') + '</b>' +
      '</div>';
    }).join('');
  }

  function groupedAttributeMarkup(player) {
    var position = player.primary_position || player.specific_position;
    var group = client.groupForPosition(position);
    if (!group) return '<div class="sl-v4-empty">The player position has not been recorded.</div>';

    var flat = client.flattenRatings(player.attribute_ratings || player.attributeRatings || {});
    var groups = group === 'Goalkeeper'
      ? [{ label:'Goalkeeper attributes', rows:options.attributes.goalkeeper }]
      : [
          { label:'General attributes', rows:options.attributes.general },
          { label:group + ' attributes', rows:options.attributes[group.toLowerCase()] || [] }
        ];

    return '<div class="sl-v4-attribute-display">' +
      groups.map(function (section) {
        return '<section style="margin-bottom:14px"><h4 style="margin:0 0 9px;font-size:12px">' +
          client.esc(section.label) + '</h4>' +
          section.rows.map(function (row) {
            var value = flat[row[0]];
            var valid = Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 10;
            return '<div class="sl-v4-attribute-row">' +
              '<span>' + client.esc(row[1]) + '</span>' +
              '<i><em style="width:' + (valid ? Number(value) * 10 : 0) + '%"></em></i>' +
              '<b>' + (valid ? Number(value) + '/10' : 'Not observed') + '</b>' +
            '</div>';
          }).join('') +
        '</section>';
      }).join('') +
    '</div>';
  }

  function findAttributePanel(root) {
    var direct = root.querySelector(
      '#profileAttributes .attribute-list,#profileAttributes [data-attribute-list],[data-profile-attributes]'
    );
    if (direct) return direct;

    var headings = root.querySelectorAll('h2,h3,h4,.panel-title,.section-title');
    for (var index = 0; index < headings.length; index += 1) {
      if (headings[index].textContent.trim().toLowerCase() !== 'all attributes') continue;
      var section = headings[index].closest('section,article,.panel,.card,.profile-section');
      if (!section) continue;
      return section.querySelector(
        '.attribute-list,.attributes-list,.panel-body,.card-body,.section-body'
      ) || section;
    }
    return null;
  }

  function renderProfileAttributes(root) {
    var player = activePlayer();
    if (!player) return;
    var target = findAttributePanel(root);
    if (!target || target.getAttribute('data-v4-rendered-player') === String(player.id || 'player')) return;

    target.innerHTML = groupedAttributeMarkup(player);
    target.setAttribute('data-v4-rendered-player', String(player.id || 'player'));
  }

  function updatePositionLabels(root) {
    root.querySelectorAll('[data-position-label],.player-position,.position-label,.profile-position').forEach(function (element) {
      var raw = element.getAttribute('data-position-label') || element.textContent.trim();
      var canonical = client.normalisePosition(raw);
      if (canonical) {
        element.textContent = client.positionLabel(canonical, options);
        element.setAttribute('data-position-label', canonical);
      }
    });
  }

  function scanRoot(root) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll('select').forEach(function (select) {
      if (groupCandidate(select)) replaceGroupSelect(select);
      else if (positionCandidate(select)) replacePositionSelect(select, root);
      else {
        Array.from(select.options).forEach(function (option) {
          if (option.value === 'Forward' || option.textContent.trim() === 'Forward') {
            option.value = 'Attacker';
            option.textContent = 'Attacker';
          }
          var canonical = client.normalisePosition(option.value);
          if (canonical && option.value !== canonical) option.value = canonical;
        });
      }
    });

    canonicaliseButtons(root);
    updatePositionLabels(root);
    renderProfileAttributes(root);

    root.querySelectorAll('*').forEach(function (element) {
      if (element.shadowRoot) watchRoot(element.shadowRoot);
    });
  }

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      scheduled = false;
      watchedRoots.forEach ? null : null;
      scanRoot(document);
      document.querySelectorAll('*').forEach(function (element) {
        if (element.shadowRoot) scanRoot(element.shadowRoot);
      });
    });
  }

  function watchRoot(root) {
    if (!root || watchedRoots.has(root)) return;
    watchedRoots.add(root);
    scanRoot(root);
    new MutationObserver(function () {
      window.setTimeout(function () { scanRoot(root); }, 0);
    }).observe(root, { childList:true, subtree:true });
  }

  async function init() {
    client = window.ScoutLinkScoringV4;
    if (!client) {
      initAttempts += 1;
      if (initAttempts < 100) window.setTimeout(init, 50);
      return;
    }
    options = await client.loadOptions();
    watchRoot(document);

    document.addEventListener('scoutlink:profile-ready', function () {
      window.setTimeout(scheduleScan, 0);
    });
    document.addEventListener('scoutlink:players-rendered', function () {
      window.setTimeout(scheduleScan, 0);
    });
    window.addEventListener('popstate', scheduleScan);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
}());
