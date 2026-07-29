"use strict";
/* ScoutLink navigation v1.3 — role-aware navigation plus Scout V8 profile loader. */

var TABLER = {
  "layout-dashboard": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  "database-search": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.657 3.582 3 8 3 .513 0 1.014-.025 1.5-.073"/><path d="M4 12v6c0 1.657 3.582 3 8 3"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M20.3 20.3l1.7 1.7"/></svg>',
  "heart": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428m0 0a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.566"/></svg>',
  "trophy": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M7 4h10l-1 7a5 5 0 0 1 -10 0z"/><path d="M5 9h-1a2 2 0 0 0 0 4h1"/><path d="M19 9h1a2 2 0 0 0 0 4h-1"/></svg>',
  "calendar-event": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="4" y1="11" x2="20" y2="11"/><rect x="8" y="15" width="2" height="2"/></svg>',
  "chart-line": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="19" x2="20" y2="19"/><polyline points="4 15 8 9 12 11 16 6 20 10"/></svg>',
  "file-export": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M11.5 21h-4.5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v5"/><path d="M15 18h7"/><path d="M19 15l3 3l-3 3"/></svg>',
  "arrows-diff": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 16h-6l2 -2"/><path d="M5 16l2 2"/><path d="M13 8h6l-2 -2"/><path d="M19 8l-2 2"/></svg>',
  "settings": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><circle cx="12" cy="12" r="3"/></svg>',
  "flag": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9z"/><line x1="5" y1="21" x2="5" y2="14"/></svg>',
  "bell": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  "adjustments-horizontal": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/></svg>',
  "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  "user-plus": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M16 19h6"/><path d="M19 16v6"/><path d="M2 21v-2a4 4 0 0 1 4 -4h4"/></svg>',
  "file-import": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 13v-8a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-11.5"/><path d="M2 19l3 3l3 -3"/><path d="M5 16v6"/></svg>',
  "clipboard": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"/><path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/></svg>',
  "video": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l4.553 -2.069a1 1 0 0 1 1.447 .894v6.35a1 1 0 0 1 -1.447 .894l-4.553 -2.069v-4z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>',
  "message": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9h8"/><path d="M8 13h5"/><path d="M5 19l2.5 -2h9.5a3 3 0 0 0 3 -3v-6a3 3 0 0 0 -3 -3h-10a3 3 0 0 0 -3 3v6a3 3 0 0 0 3 3"/></svg>'
};

function tablerIcon(name, size) {
  size = size || 18;
  var svg = TABLER[name] || TABLER.settings;
  return svg.replace("<svg ", '<svg width="' + size + '" height="' + size + '" style="flex-shrink:0" ');
}

var SCOUT_NAV_ITEMS = [
  { icon:"layout-dashboard", label:"Dashboard", href:"/scout/dashboard" },
  { icon:"database-search", label:"Player search", href:"/scout/player-search" },
  { icon:"heart", label:"My pipeline", href:"/scout/pipeline" },
  { icon:"trophy", label:"Rankings", href:"/scout/rankings" },
  { icon:"calendar-event", label:"Fixtures", href:"/scout/fixtures" },
  { icon:"chart-line", label:"Predictions", href:"/scout/predictions" },
  { icon:"file-export", label:"Exports", href:"/scout/exports" },
  { icon:"arrows-diff", label:"Compare players", href:"/scout/compare-players" },
  { icon:"settings", label:"Scout setup", href:"/scout/setup" },
  { icon:"flag", label:"Events", href:"/scout/events" },
  { icon:"message", label:"Chat", href:"/scout/chat" },
  { icon:"bell", label:"Notifications", href:"/scout/notifications" },
  { icon:"flag", label:"Report a concern", href:"/scout/report-a-concern" },
  { icon:"chart-line", label:"Usage requests", href:"/scout/usage-requests" },
  { icon:"adjustments-horizontal", label:"Settings", href:"/scout/settings" }
];

var COACH_NAV_ITEMS = [
  { icon:"layout-dashboard", label:"Dashboard", href:"/coach/dashboard" },
  { icon:"user", label:"My players", href:"/coach/my-players" },
  { icon:"user-plus", label:"Add player", href:"/coach/add-player" },
  { icon:"file-import", label:"Bulk import", href:"/coach/bulk-add-players" },
  { icon:"clipboard", label:"Match facts", href:"/coach/match-facts" },
  { icon:"calendar-event", label:"Fixtures", href:"/coach/fixtures" },
  { icon:"video", label:"Video reels", href:"/coach/video-reels" },
  { icon:"message", label:"Chat", href:"/coach/chat" },
  { icon:"bell", label:"Notifications", href:"/coach/notifications" },
  { icon:"flag", label:"Report a concern", href:"/coach/report-a-concern" },
  { icon:"adjustments-horizontal", label:"Settings", href:"/coach/settings" }
];

var COACH_NAV_GROUPS = [
  { label:"Overview", items:["Dashboard"] },
  { label:"Players", items:["My players","Add player","Bulk import"] },
  { label:"Matchday", items:["Match facts","Fixtures","Video reels"] },
  { label:"Communication", items:["Chat","Notifications","Report a concern"] },
  { label:"Account", items:["Settings"] }
];

var PLAYER_NAV_ITEMS = [
  { icon:"layout-dashboard", label:"Dashboard", href:"/player/dashboard" },
  { icon:"user", label:"My profile", href:"/player/edit-profile" },
  { icon:"video", label:"Video reels", href:"/player/video-reels" },
  { icon:"bell", label:"Notifications", href:"/player/notifications" },
  { icon:"flag", label:"Report a concern", href:"/report-a-concern" },
  { icon:"adjustments-horizontal", label:"Settings", href:"/player/settings" }
];

function cleanCurrentPath() {
  return String(window.location.pathname || "/").replace(/\/+$/, "") || "/";
}

function buildScoutNav(containerId, role) {
  role = role || localStorage.getItem("sl_type") || "Scout";
  var container = document.getElementById(containerId || "sidebarNav");
  if (!container) return;

  var navItems = role === "Coach"
    ? COACH_NAV_ITEMS
    : role === "Player"
      ? PLAYER_NAV_ITEMS
      : SCOUT_NAV_ITEMS;

  if (typeof window.isPublicDemoMode === "function" && window.isPublicDemoMode()) {
    navItems = navItems.filter(function (item) {
      return String(item.label || "").toLowerCase() !== "settings";
    });
  }

  var current = cleanCurrentPath();

  function linkMarkup(item, className) {
    var active = current === item.href;
    return '<a class="' + className + (active ? " active" : "") + '" href="' + item.href + '">' +
      '<span class="' + (className === "nav-item" ? "nav-ico" : "side-icon") + '">' +
      tablerIcon(item.icon, 18) + "</span><span>" + item.label + "</span></a>";
  }

  if (role === "Coach") {
    var byLabel = {};
    navItems.forEach(function (item) { byLabel[item.label] = item; });
    container.innerHTML = COACH_NAV_GROUPS.map(function (group) {
      var links = group.items.map(function (label) {
        var item = byLabel[label];
        return item ? linkMarkup(item, "nav-item") : "";
      }).join("");
      return links ? '<div class="coach-nav-group"><div class="coach-nav-label">' +
        group.label + "</div>" + links + "</div>" : "";
    }).join("");
    return;
  }

  container.innerHTML = navItems.map(function (item) {
    return linkMarkup(item, "nav-item");
  }).join("");
}

(function loadScoutV8ForSharedProfile() {
  if (cleanCurrentPath() !== "/player/profile") return;

  var attempts = 0;

  function currentRole() {
    try {
      if (window.Auth && window.Auth.type) return String(window.Auth.type);
    } catch (_) {}
    try {
      return String(localStorage.getItem("sl_type") || "");
    } catch (_) {
      return "";
    }
  }

  function appendStyle() {
    if (document.querySelector('link[href*="scout-experience-v8.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/frontend/css/scout-experience-v8.css?v=20260729-8";
    document.head.appendChild(link);
  }

  function appendScript(src, marker, done) {
    if (document.querySelector('script[src*="' + marker + '"]')) {
      if (done) done();
      return;
    }
    var script = document.createElement("script");
    script.src = src;
    script.async = false;
    if (done) script.onload = done;
    document.body.appendChild(script);
  }

  function tryLoad() {
    attempts += 1;
    var scoutReady =
      currentRole() === "Scout" ||
      document.body.getAttribute("data-scout-route") === "profile";

    if (!scoutReady) {
      if (attempts < 80) window.setTimeout(tryLoad, 50);
      return;
    }

    appendStyle();

    function loadV8() {
      appendScript(
        "/frontend/js/scout-experience-v8.js?v=20260729-8",
        "scout-experience-v8.js"
      );
    }

    if (document.querySelector('script[src*="scout-intelligence-v4.js"]')) {
      loadV8();
      return;
    }

    if (typeof window.liveRouteId === "function") {
      appendScript(
        "/frontend/js/scout-intelligence-v4.js",
        "scout-intelligence-v4.js",
        loadV8
      );
      return;
    }

    if (attempts < 80) window.setTimeout(tryLoad, 50);
  }

  window.setTimeout(tryLoad, 0);
}());

window.TABLER = TABLER;
window.tablerIcon = tablerIcon;
window.SCOUT_NAV_ITEMS = SCOUT_NAV_ITEMS;
window.COACH_NAV_ITEMS = COACH_NAV_ITEMS;
window.COACH_NAV_GROUPS = COACH_NAV_GROUPS;
window.PLAYER_NAV_ITEMS = PLAYER_NAV_ITEMS;
window.buildScoutNav = buildScoutNav;
