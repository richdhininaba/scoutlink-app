'use strict';
/* Shared league picker for Stratex admin flows */
(function(){
  var cache = null;

  function safe(v){ return String(v || '').replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }

  async function loadLeagues() {
    if (cache) return cache;
    if (typeof api !== 'function') return [];
    try {
      var d = await api('GET', '/api/stratex/leagues');
      cache = (d.data || []).map(function(x){ return x.name; }).filter(Boolean);
      return cache;
    } catch(e) {
      cache = [];
      return cache;
    }
  }

  function datalistId(inputId) {
    return inputId + 'LeagueOptions';
  }

  async function bindLeagueInput(inputId, addButtonId) {
    var input = document.getElementById(inputId);
    if (!input || input.dataset.leagueBound) return;
    input.dataset.leagueBound = '1';
    var listId = datalistId(inputId);
    var dl = document.getElementById(listId);
    if (!dl) {
      dl = document.createElement('datalist');
      dl.id = listId;
      input.parentNode.insertBefore(dl, input.nextSibling);
    }
    input.setAttribute('list', listId);
    var leagues = await loadLeagues();
    dl.innerHTML = leagues.map(function(name){ return '<option value="' + safe(name) + '"></option>'; }).join('');
    if (addButtonId) {
      var btn = document.getElementById(addButtonId);
      if (btn && !btn.dataset.leagueBound) {
        btn.dataset.leagueBound = '1';
        btn.addEventListener('click', async function(){
          var name = input.value.trim();
          if (!name) return;
          btn.disabled = true;
          try {
            var d = await api('POST', '/api/stratex/leagues', { name: name });
            cache = null;
            leagues = await loadLeagues();
            dl.innerHTML = leagues.map(function(n){ return '<option value="' + safe(n) + '"></option>'; }).join('');
            input.value = d.data && d.data.name ? d.data.name : name;
          } catch(e) {
            alert(e.message || 'Could not save league.');
          } finally {
            btn.disabled = false;
          }
        });
      }
    }
  }

  window.loadLeagueOptions = loadLeagues;
  window.bindLeagueInput = bindLeagueInput;
})();
