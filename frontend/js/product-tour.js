'use strict';
(function(){
  var tours = {
    Coach: [
      ['Dashboard', 'This is the squad control room. ScoutLink turns every player you add into a living profile that improves as you add match facts and attributes.'],
      ['Roster', 'Your player roster is where profiles grow over time. Completion and data confidence help scouts trust what they are seeing.'],
      ['Match facts', 'Every match fact updates the player picture. Think of it as a living report card that becomes more credible every game.'],
      ['Video reels', 'Clips from your phone can be added to profiles so scouts can see evidence, not just ratings.'],
      ['Assistant coach', 'Most coaches invite an assistant so the squad builds faster and data entry is shared.']
    ],
    Scout: [
      ['Personalised feed', 'This feed is filtered around your region, age groups and positional priorities. New players are added automatically.'],
      ['Filters', 'Use position, age band, rating and data confidence to get to serious shortlist candidates quickly.'],
      ['Player profile', 'Read current readiness, position fit, compatibility, attributes, match facts and video in that order.'],
      ['Pipeline and notes', 'Add players to your pipeline, keep private notes, and open chat with coaches once a player is in your pipeline.'],
      ['Alerts', 'ScoutLink monitors new registrations and flags strong matches so you do not have to keep checking back.']
    ],
    Stratex: [
      ['Platform dashboard', 'This admin view separates registrations, users, teams, showcases and product demo access.'],
      ['Registration review', 'Approve coaches and scouts with safeguarding checks, then ScoutLink sends their onboarding email.'],
      ['User management', 'View coaches, scouts and admins, including super user access and team assignments.'],
      ['Product demo', 'Launch guided demo experiences without exposing test accounts in the real platform data.']
    ],
    Player: [
      ['Player home', 'This is the player-facing view of profile status, evidence and notifications.'],
      ['Profile details', 'Players can keep their own information current while coach-rated football data stays controlled.'],
      ['Video reels', 'Players can review the clips attached to their profile.']
    ]
  };
  var index = 0;
  function role(){ return (window.Auth && Auth.type) || localStorage.getItem('sl_type'); }
  function key(name){ return 'sl_tour_' + name + '_' + role(); }
  function shouldRun(){
    var r = role();
    if (!tours[r]) return false;
    var qs = new URLSearchParams(window.location.search);
    if (sessionStorage.getItem('sl_force_tour_' + r) === '1') return true;
    return qs.get('tour') === '1' || (!localStorage.getItem('sl_tour_seen_' + r) && !sessionStorage.getItem(key('skipped')));
  }
  function render(){
    var r = role(), steps = tours[r];
    if (!steps) return;
    var saved = parseInt(sessionStorage.getItem(key('index')) || '0', 10);
    if (!Number.isNaN(saved) && saved >= 0 && saved < steps.length) index = saved;
    var existing = document.getElementById('slProductTour');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'slProductTour';
      existing.style.cssText = 'position:fixed;inset:0;background:rgba(2,6,12,.72);z-index:2000;display:flex;align-items:flex-end;justify-content:center;padding:18px';
      document.body.appendChild(existing);
    }
    var s = steps[index];
    existing.innerHTML = '<div style="width:min(560px,100%);background:#111827;border:1px solid #243447;border-radius:16px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.45)"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px"><span style="color:#00e676;font-weight:900;font-size:12px;text-transform:uppercase">Step '+(index+1)+' of '+steps.length+'</span><button class="btn btn-sm btn-ghost" onclick="window.finishProductTour(true)">Skip</button></div><h3 style="margin:0 0 8px;color:#fff">'+s[0]+'</h3><p style="color:#B0BEC5;line-height:1.55;margin:0 0 16px">'+s[1]+'</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn btn-outline" onclick="window.prevProductTour()" '+(index===0?'disabled':'')+'>Back</button><button class="btn btn-primary" onclick="window.nextProductTour()">'+(index===steps.length-1?'Finish':'Next')+'</button></div></div>';
  }
  window.prevProductTour = function(){ index = Math.max(0, index - 1); sessionStorage.setItem(key('index'), String(index)); render(); };
  window.nextProductTour = function(){ var r = role(), steps = tours[r] || []; if (index >= steps.length - 1) return window.finishProductTour(false); index++; sessionStorage.setItem(key('index'), String(index)); render(); };
  window.finishProductTour = async function(skipped){
    var r = role();
    sessionStorage.removeItem('sl_force_tour_' + r);
    sessionStorage.removeItem(key('index'));
    if (skipped) sessionStorage.setItem(key('skipped'), '1');
    localStorage.setItem('sl_tour_seen_' + r, '1');
    var el = document.getElementById('slProductTour');
    if (el) el.remove();
    try { if (typeof api === 'function') await api('POST','/api/onboarding/tour',{checkpoints:(tours[r]||[]).map(function(x){return x[0];})}); } catch(e) {}
  };
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ if (shouldRun()) render(); }, 350); });
})();
