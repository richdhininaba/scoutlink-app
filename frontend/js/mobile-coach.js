'use strict';

(function(){
  function isPhone(){
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }

  function esc(v){
    if (typeof escHtml === 'function') return escHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function score100(v){
    var n = parseFloat(v);
    if (Number.isNaN(n)) return '--';
    return String(Math.round(n > 10 ? n : n * 10));
  }

  function scorePct(v){
    var n = parseFloat(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, n > 10 ? n : n * 10));
  }

  function scoreColor(v){
    var pct = scorePct(v);
    return pct >= 80 ? '#1d9e75' : pct >= 65 ? '#FFC107' : pct >= 50 ? '#FF9800' : '#EF5350';
  }

  function formatMoney(v){
    var n = Number(v || 0);
    if (!n) return 'Calculating';
    if (typeof formatValue === 'function') return formatValue(n);
    return 'GBP ' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  function completion(p){
    if (p.profile_completion !== undefined && p.profile_completion !== null) return Math.max(0, Math.min(100, Math.round(Number(p.profile_completion) || 0)));
    var keys = ['first_name','last_name','age_group','specific_position','overall_rating','transfer_value','height_category','build_category','foot'];
    var done = keys.filter(function(k){ return p[k] !== null && p[k] !== undefined && String(p[k]).trim() !== ''; }).length;
    if (Number(p.appearances) > 0) done++;
    if (Number(p.goals) > 0 || Number(p.assists) > 0 || Number(p.clean_sheets) > 0) done++;
    return Math.min(100, Math.round(done / 11 * 100));
  }

  function playerUrl(p){
    return 'player-profile.html?id=' + encodeURIComponent(p.id);
  }

  function positionLine(p){
    var bits = [];
    if (p.age_group) bits.push(p.age_group);
    else if (p.age) bits.push(p.age + ' yrs');
    bits.push(p.specific_position || p.primary_position || p.position_group || 'Position TBC');
    return bits.join(' - ');
  }

  function statFact(label, value){
    return '<span class="coach-player-card-phone__fact"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></span>';
  }

  function renderPhoneCard(p, opts){
    opts = opts || {};
    var name = ([p.first_name, p.last_name].filter(Boolean).join(' ') || 'Player').trim();
    var comp = completion(p);
    var href = opts.url || playerUrl(p);
    var control = opts.coachControl || '';
    return '<article class="coach-player-card-phone">' +
      '<div class="coach-player-card-phone__head">' +
        '<div><h4>' + esc(name) + '</h4><div class="coach-player-card-phone__sub">' + esc(positionLine(p)) + '</div></div>' +
        '<strong class="coach-player-card-phone__score" style="color:' + scoreColor(p.overall_rating) + '">' + score100(p.overall_rating) + '</strong>' +
      '</div>' +
      '<div class="coach-player-card-phone__facts">' +
        statFact('Value', formatMoney(p.transfer_value)) +
        statFact('Apps', p.appearances || 0) +
        statFact('Goals', p.goals || 0) +
      '</div>' +
      '<div class="coach-player-card-phone__completion">' +
        '<div class="coach-player-card-phone__completion-row"><span>Profile completion</span><b>' + comp + '%</b></div>' +
        '<i class="coach-player-card-phone__bar" style="width:' + comp + '%"></i>' +
      '</div>' +
      (control ? '<div class="coach-phone-card-actions">' + control + '</div>' : '') +
      '<a class="btn btn-sm btn-outline" href="' + href + '">View / edit profile</a>' +
    '</article>';
  }

  function renderListCard(p, opts){
    opts = opts || {};
    var name = ([p.first_name, p.last_name].filter(Boolean).join(' ') || 'Player').trim();
    var comp = completion(p);
    var href = opts.url || playerUrl(p);
    var control = opts.coachControl || '';
    var avatar = typeof initials === 'function' ? initials(p.first_name, p.last_name) : name.slice(0, 2).toUpperCase();
    return '<article class="player-card2 coach-phone-card">' +
      '<div class="coach-phone-card-main">' +
        '<div class="user-avatar">' + esc(avatar) + '</div>' +
        '<div><div class="coach-phone-card-name">' + esc(name) + '</div><div class="coach-phone-card-meta">' + esc(positionLine(p)) + '</div></div>' +
        '<div class="coach-phone-card-score" style="color:' + scoreColor(p.overall_rating) + '">' + score100(p.overall_rating) + '</div>' +
      '</div>' +
      '<div class="coach-player-card-phone__facts">' +
        statFact('Value', formatMoney(p.transfer_value)) +
        statFact('Apps', p.appearances || 0) +
        statFact('Goals', p.goals || 0) +
      '</div>' +
      '<div class="coach-player-card-phone__completion">' +
        '<div class="coach-player-card-phone__completion-row"><span>Profile completion</span><b>' + comp + '%</b></div>' +
        '<i class="coach-player-card-phone__bar" style="width:' + comp + '%"></i>' +
      '</div>' +
      (control ? '<div class="coach-phone-card-actions">' + control + '</div>' : '') +
      '<a href="' + href + '" class="btn btn-sm btn-outline">View / edit profile</a>' +
    '</article>';
  }

  function applyEnhancements(){
    document.querySelectorAll('.kpi-grid').forEach(function(grid){
      if (document.body.classList.contains('mobile-route-coach-dashboard')) grid.classList.add('coach-dashboard-kpis');
    });
    var top = document.querySelector('.coach-dashboard-kpis .kpi-card:nth-child(3), .coach-players-kpis .kpi-card:nth-child(3)');
    if (top) top.setAttribute('data-mobile-hide', 'true');
    if (isPhone()) {
      var viewMode = document.getElementById('viewMode');
      if (viewMode) viewMode.value = 'grid';
    }
  }

  window.isScoutLinkPhone = isPhone;
  window.renderCoachMobilePlayerCard = renderPhoneCard;
  window.renderCoachMyPlayerCard = renderListCard;
  window.applyCoachMobileEnhancements = applyEnhancements;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyEnhancements);
  } else {
    applyEnhancements();
  }
})();
