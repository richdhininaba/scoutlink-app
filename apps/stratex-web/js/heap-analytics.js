'use strict';

/* Stratex Analytics Heap identity bridge.
   The Stratex site should not load ScoutLink Coach, Scout, Player or demo runtimes. */
(function () {
  var UNSAFE_IDS = {
    'undefined': true,
    'null': true,
    anonymous: true,
    guest: true,
    demo: true,
    'public-demo': true
  };

  function safe(value) {
    var text = value == null ? '' : String(value).trim();
    return text && !UNSAFE_IDS[text.toLowerCase()] ? text : '';
  }

  function pick(source, keys) {
    if (!source) return '';
    for (var index = 0; index < keys.length; index += 1) {
      var value = source[keys[index]];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return '';
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
    } catch (_) {
      return null;
    }
  }

  function routePath() {
    return (window.location && window.location.pathname) || '/';
  }

  function authContext() {
    var Auth = window.Auth || {};
    var user = Auth.currentUser || Auth.user || readJson('sl_user') || readJson('currentUser') || {};
    var role = safe(
      Auth.userType ||
      Auth.type ||
      localStorage.getItem('sl_type') ||
      sessionStorage.getItem('sl_type') ||
      pick(user, ['role', 'type', 'userType'])
    );
    var email = safe(pick(user, ['email', 'email_address']));
    var firstName = safe(pick(user, ['firstName', 'first_name', 'given_name']));
    var lastName = safe(pick(user, ['lastName', 'last_name', 'family_name']));
    var name = safe(pick(user, ['name', 'fullName', 'full_name']));
    if (!name && (firstName || lastName)) name = (firstName + ' ' + lastName).trim();
    var id = safe(pick(user, ['id', 'userId', 'user_id', 'auth_user_id', 'profileId']));
    return { id: id, email: email, role: role, firstName: firstName, lastName: lastName, name: name, path: routePath() };
  }

  function selectedExperience(context) {
    var path = routePath();
    if (/^\/(admin|company\/admin|stratex)\b/.test(path)) return 'Stratex Admin';
    if (/^\/showcase-event\b/.test(path)) return 'Stratex Showcase';
    if (context && context.role) return context.role;
    return 'Stratex Public';
  }

  function compact(object) {
    var result = {};
    Object.keys(object || {}).forEach(function (key) {
      if (object[key] !== undefined && object[key] !== null && object[key] !== '') result[key] = object[key];
    });
    return result;
  }

  function stableUserId(context) {
    return safe(context.email) || safe(context.id);
  }

  function applyHeapContext() {
    var context = authContext();
    var props = compact({
      email: context.email,
      name: context.name,
      firstName: context.firstName,
      lastName: context.lastName,
      role: context.role,
      product: 'Stratex',
      selectedExperience: selectedExperience(context),
      path: context.path
    });

    try {
      if (window.heap && typeof window.heap.identify === 'function') {
        var userId = stableUserId(context);
        if (userId) window.heap.identify(userId);
      }
      if (window.heap && typeof window.heap.addUserProperties === 'function') {
        window.heap.addUserProperties(props);
      }
    } catch (error) {
      if (window.console && console.warn) {
        console.warn('[Stratex Heap] Context update failed:', error && error.message ? error.message : error);
      }
    }

    return props;
  }

  window.applyStratexHeapContext = applyHeapContext;
  window.applyScoutLinkHeapContext = window.applyScoutLinkHeapContext || applyHeapContext;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyHeapContext, { once: true });
  } else {
    applyHeapContext();
  }
  window.addEventListener('pageshow', applyHeapContext);
}());
