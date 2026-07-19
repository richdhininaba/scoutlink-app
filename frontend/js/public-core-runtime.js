(function () {
  "use strict";

  var MOBILE_MAX = 767;
  var API_FALLBACK = "https://scoutlink-api.vercel.app";
  var pageTitles = {
    home: "Homepage",
    demo: "Demo",
    coaches: "Coaches",
    scouts: "Scouts",
    parents: "Parents & Players",
    safeguarding: "Safeguarding",
    login: "Login",
    about: "About",
    contact: "Contact",
    careers: "Careers"
  };
  var navItems = [
    { id: "coaches", label: "Coaches", href: "/coaches" },
    { id: "scouts", label: "Scouts", href: "/scouts" },
    { id: "parents", label: "Parents & Players", href: "/parents-players" },
    { id: "safeguarding", label: "Safeguarding", href: "/safeguarding" },
    { id: "demo", label: "Demo", href: "/demo" }
  ];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function apiBase() {
    return String(window.API || localStorage.getItem("sl_api_url") || API_FALLBACK).replace(/\/+$/, "");
  }

  function isPhone() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function cleanRouteFor(href) {
    var routeMap = {
      "login.html": "/login",
      "experience-select.html": "/experience-select",
      "complete-registration.html": "/complete-registration",
      "scout-preferences.html": "/scout/preferences",
      "stratex-dashboard.html": "/stratex/dashboard",
      "scout-dashboard.html": "/scout/dashboard",
      "coach-dashboard.html": "/coach/dashboard",
      "coach-onboarding.html": "/coach/onboarding",
      "player-dashboard.html": "/player/dashboard",
      "scout-onboarding.html": "/scout/onboarding"
    };
    var url = new URL(href, window.location.href);
    var page = url.pathname.split("/").pop();
    return (routeMap[page] || href) + url.search + url.hash;
  }

  function safeReturnPath(path) {
    path = String(path || "").trim();
    return path === "/admin" || path === "/company/admin" ? path : "";
  }

  window.header = function header(active, mobile) {
    active = active || "";
    var navHtml = navItems.map(function (item) {
      return '<a class="' + (active === item.id ? "active" : "") + '" href="' + item.href + '">' + item.label + "</a>";
    }).join("");
    var menuHtml = navItems.map(function (item) {
      return '<a class="' + (active === item.id ? "active" : "") + '" href="' + item.href + '">' + item.label + "</a>";
    }).join("") +
      '<a href="/register/scout">Request Scout Access</a>' +
      '<a class="primary" href="/register/coach">Register as Coach</a>' +
      '<a href="/login">Sign in</a>';
    var primaryLabel = active === "scouts" ? "Request Scout Access" : "Register as Coach";
    var primaryHref = active === "scouts" ? "/register/scout" : "/register/coach";
    return '<header class="site-header">' +
      '<a class="logo" href="/">Scout<span>Link</span></a>' +
      '<nav class="nav" aria-label="ScoutLink public navigation">' + navHtml + "</nav>" +
      '<div class="header-actions"><a class="btn ghost" href="/login">Sign in</a><a class="btn primary" href="' + primaryHref + '">' + primaryLabel + "</a></div>" +
      '<button class="menu" type="button" data-public-menu-open aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '<div class="public-menu-panel" data-public-menu-backdrop aria-hidden="true">' +
      '<div class="public-menu-drawer" role="dialog" aria-modal="true" aria-label="ScoutLink menu">' +
      '<div class="public-menu-head"><a class="logo" href="/">Scout<span>Link</span></a><button class="public-menu-close" type="button" data-public-menu-close aria-label="Close menu">&times;</button></div>' +
      '<nav class="public-menu-links" aria-label="Mobile navigation">' + menuHtml + "</nav>" +
      '<div class="public-menu-foot">Coach-led, scout-reviewed grassroots football intelligence by Stratex Analytics.</div>' +
      "</div></div>" +
      "</header>";
  };

  window.footer = function footer() {
    return '<footer class="footer"><div class="footer-grid">' +
      '<div class="footer-intro"><a class="logo" href="/">Scout<span>Link</span></a><p>Coach-led, scout-reviewed grassroots football intelligence by Stratex Analytics.</p></div>' +
      '<div class="footer-col"><b>Product</b><a href="/coaches">Coaches</a><a href="/scouts">Scouts</a><a href="/demo">Demo</a><a href="/scoutlink/compatibility-score">Compatibility</a></div>' +
      '<div class="footer-col"><b>Trust</b><a href="/safeguarding">Safeguarding</a><a href="/parent-guardian-notice">Parent / Guardian Notice</a><a href="/report-a-concern">Report a Concern</a><a href="/scout-verification">Scout Verification</a></div>' +
      '<div class="footer-col"><b>Company</b><a href="/about">About</a><a href="/contact">Contact</a><a href="/careers">Careers</a><a href="/accessibility">Accessibility</a></div>' +
      '<div class="footer-col"><b>Legal</b><a href="/privacy-policy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/cookie-policy">Cookie Policy</a><a href="/privacy-request">Privacy Request</a></div>' +
      '</div><div class="footer-bottom"><span>&copy; 2026 ScoutLink. Powered by Stratex Analytics.</span><span><a href="mailto:info@scoutlink.app">info@scoutlink.app</a></span></div></footer>';
  };

  window.commonCTA = function commonCTA(title, copy) {
    title = title || "Build better player evidence.";
    copy = copy || "Create a free coach account or explore ScoutLink before you register.";
    return '<section class="section cta"><div><span class="pill green">Ready when your team is</span><h2>' + title + "</h2><p>" + copy + '</p></div><div class="cta-actions"><a class="btn primary" href="/register/coach">Register as Coach</a><a class="btn" href="/demo">Explore Demo</a><a class="btn ghost" href="/register/scout">Request Scout Access</a></div></section>';
  };

  window.mobileSticky = function mobileSticky(primary) {
    primary = primary || "Register as Coach";
    var primaryHref = primary.toLowerCase().indexOf("concern") >= 0 ? "/report-a-concern" :
      primary.toLowerCase().indexOf("notice") >= 0 ? "/parent-guardian-notice" :
      primary.toLowerCase().indexOf("role") >= 0 ? "#careerRoleList" :
      primary.toLowerCase().indexOf("message") >= 0 ? "#publicContactForm" :
      "/register/coach";
    return '<div class="mobile-sticky"><a class="btn primary" href="' + primaryHref + '">' + primary + '</a><a class="btn" href="/demo">Demo</a></div>';
  };

  window.loginPage = function loginPage(mobile) {
    return '<div class="page">' + header("login", mobile) + '<main class="login-layout">' +
      '<section class="login-brand"><div><span class="pill dark">ScoutLink sign in</span><h1>Return to the workspace built for your role.</h1><p>Coaches manage player evidence. Reviewed scouts search and compare. Internal users support the product and its trust workflows.</p><div class="login-points"><div class="login-point"><span class="dot"></span><span>Coach-led player evidence and football-development records.</span></div><div class="login-point"><span class="dot"></span><span>Reviewed scout access and controlled visibility.</span></div><div class="login-point"><span class="dot"></span><span>Compatibility decision support without replacing judgement.</span></div></div></div><div class="tag-list"><span class="pill dark">Coach registration</span><span class="pill dark">Scout access</span><span class="pill dark">Safeguarding</span></div></section>' +
      '<section class="login-card"><span class="pill green">Secure account access</span><h2 style="margin-top:12px">Sign in to ScoutLink</h2><p>Use your email and password, or the login code from your approval or invitation email.</p><div class="public-message error" id="loginMessage" role="alert"></div><div class="login-tabs" role="tablist" aria-label="Login method"><button class="login-tab active" id="loginTabPassword" type="button" data-login-tab="password">Email and password</button><button class="login-tab" id="loginTabCode" type="button" data-login-tab="code">Login with code</button></div>' +
      '<form id="passwordLoginForm" novalidate><div id="passwordLoginSection"><div class="field"><label for="email">Email address</label><input class="input public-form-control" type="email" id="email" autocomplete="email" placeholder="your@email.com" required></div><div class="field" style="margin-top:11px"><label for="password">Password</label><input class="input public-form-control" type="password" id="password" autocomplete="current-password" placeholder="Enter your password" required></div><button class="btn primary block" id="loginBtn" type="submit" style="margin-top:13px"><span id="btnText">Sign in</span><span class="public-spinner" id="spinner"></span></button><a class="btn ghost block" href="/forgot-password" style="margin-top:7px;color:var(--green2)">Forgot password?</a></div></form>' +
      '<form id="codeLoginForm" class="public-hidden" novalidate><div id="codeLoginSection"><div class="field"><label for="codeEmail">Email address</label><input class="input public-form-control" type="email" id="codeEmail" autocomplete="email" placeholder="your@email.com"></div><div class="field" style="margin-top:11px"><label for="loginCode">Login code</label><input class="input public-form-control" type="text" id="loginCode" maxlength="6" placeholder="S8CA3G" autocapitalize="characters"></div><button class="btn primary block" id="codeBtn" type="submit" style="margin-top:13px"><span id="codeBtnText">Sign in with code</span><span class="public-spinner" id="codeSpinner"></span></button></div></form>' +
      '<div id="roleChooser" class="public-hidden" style="margin-top:15px"><h3 style="margin:0 0 6px">Choose where you want to go</h3><p style="margin:0;color:var(--muted);font-size:9px">We found more than one available ScoutLink experience for this email.</p><div id="roleOptions" class="public-role-options"></div></div><div style="height:1px;background:var(--line);margin:15px 0"></div><p style="text-align:center;margin:0">New to ScoutLink? <a href="/register" style="color:var(--green2);font-weight:900">Choose a registration route</a></p></section>' +
      '</main><section class="main" style="padding-top:0"><div class="grid cols3"><a class="card flat public-route-card" href="/register/coach"><h4>Coach registration</h4><p>Create a free coach workspace and begin setting up your team.</p></a><a class="card flat public-route-card" href="/register/scout"><h4>Scout access</h4><p>Apply for reviewed access to player search, comparison and pipelines.</p></a><a class="card flat public-route-card" href="/contact"><h4>Access help</h4><p>Get support with an invitation, approval code or account issue.</p></a></div></section>' + footer() + "</div>";
  };

  window.contactPage = function contactPage(mobile) {
    return '<div class="page">' + header("contact", mobile) + '<section class="hero"><div><span class="pill green">Contact ScoutLink</span><h1>Talk to the right Stratex team.</h1><p class="lead">Use this page for ScoutLink support, coach onboarding, scout access, privacy, accessibility, careers, partnerships or general Stratex Analytics enquiries.</p><div class="hero-actions"><a class="btn primary" href="#publicContactForm">Send a Message</a><a class="btn" href="/report-a-concern">Report a Concern</a><a class="btn ghost" href="/privacy-request">Privacy Request</a></div></div><div class="hero-visual light"><span class="pill green">Useful routes</span><div class="notice-list" style="margin-top:14px"><div class="notice"><b>Urgent safety concern</b><br>Use Report a Concern or the appropriate emergency service.</div><div class="notice"><b>Scout access</b><br>Questions about review, documents or team plans.</div><div class="notice"><b>Coach onboarding</b><br>Help setting up a team or understanding the workflow.</div></div></div></section>' +
      '<main class="main"><section class="section grid cols3"><article class="card"><div class="icon green">01</div><h4 style="margin-top:10px">Product support</h4><p>Account access, product behaviour, coach onboarding and general ScoutLink help.</p></article><article class="card"><div class="icon">02</div><h4 style="margin-top:10px">Partnerships and media</h4><p>Commercial, football, event, sponsorship, press and collaboration enquiries.</p></article><article class="card"><div class="icon orange">03</div><h4 style="margin-top:10px">Trust and privacy</h4><p>Safeguarding, privacy requests, accessibility barriers and account concerns.</p></article></section>' +
      '<section class="section form-card"><div class="section-title"><div><span class="pill green">Contact form</span><h2>Send a message.</h2></div><p>Your enquiry should be routed to the correct Stratex reviewer based on the selected reason.</p></div><div class="public-message success" id="contactOk" role="status"></div><div class="public-message error" id="contactErr" role="alert"></div><form class="form-grid" id="publicContactForm" novalidate><div class="field"><label for="contactCategory">Reason</label><select class="input public-form-control" id="contactCategory" name="category" required><option value="">Choose an enquiry type</option><option>Platform support</option><option>Safeguarding route</option><option>Privacy or data request</option><option>Accessibility</option><option>Careers</option><option>General enquiry</option></select></div><div class="field"><label for="contactRole">Your role</label><select class="input public-form-control" id="contactRole" name="role"><option>Coach</option><option>Scout</option><option>Parent or guardian</option><option>Player</option><option>Stratex partner</option><option>Other</option></select></div><div class="field"><label for="contactName">Name</label><input class="input public-form-control" id="contactName" name="name" autocomplete="name" required placeholder="Your name"></div><div class="field"><label for="contactEmail">Email</label><input class="input public-form-control" id="contactEmail" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div><div class="field"><label for="contactPhone">Phone</label><input class="input public-form-control" id="contactPhone" name="phone" autocomplete="tel" placeholder="Optional phone number"></div><div class="field"><label for="contactOrganisation">Organisation / team</label><input class="input public-form-control" id="contactOrganisation" name="organisation" autocomplete="organization" placeholder="Organisation or team"></div><div class="field full"><label for="contactMessage">Message</label><textarea class="input textarea public-form-control" id="contactMessage" name="message" required placeholder="Tell us what you need help with."></textarea></div><div class="field full"><button class="btn primary block" id="contactSubmit" type="submit">Send message</button></div></form></section>' +
      '<section class="section grid cols2"><article class="card"><span class="pill blue">What happens next</span><h3 style="font-size:22px;margin-top:10px">Your enquiry is reviewed and routed.</h3><p>Support, customer operations, growth or the appropriate trust reviewer should receive the information needed to respond.</p></article><article class="card"><span class="pill orange">Urgent concerns</span><h3 style="font-size:22px;margin-top:10px">Do not wait on a general contact form.</h3><p>Immediate danger should be reported to emergency services. Platform safety concerns should use the dedicated concern route.</p></article></section></main>' + footer() + (mobile ? mobileSticky("Send Message") : "") + "</div>";
  };

  window.careersPage = function careersPage(mobile) {
    return '<div class="page">' + header("careers", mobile) + '<section class="hero dark"><div><span class="pill dark">Careers at Stratex</span><h1>Build the future of football intelligence.</h1><p class="lead">Join the team behind ScoutLink, where product, data, customer operations, growth and football knowledge come together to help talent get seen with better evidence.</p><div class="hero-actions"><a class="btn primary" href="#careerRoleList">View Open Roles</a><a class="btn" href="/contact?reason=careers">Register Interest</a><a class="btn ghost" href="/about" style="color:#fff;border-color:rgba(255,255,255,.18)">About Stratex</a></div><div class="hero-pills"><span class="pill dark">Early-stage ownership</span><span class="pill dark">Football technology</span><span class="pill dark">Flexible working</span></div></div><div class="hero-visual"><span class="pill dark">Work close to the product</span><h3 style="font-size:25px;margin:14px 0 7px">Build, learn and see the impact.</h3><p style="font-size:9px;color:#c5d3e2;line-height:1.55">Small teams create direct ownership across product decisions, users, football relationships and company growth.</p><div class="stats"><div class="stat"><b>Product</b><span>Build useful tools</span></div><div class="stat"><b>Football</b><span>Understand users</span></div><div class="stat"><b>Growth</b><span>Create opportunity</span></div></div></div></section>' +
      '<main class="main"><section class="section" id="openRoles"><div class="section-title"><div><span class="pill white">Open opportunities</span><h2>Join a growing football-technology company.</h2></div><p>Role availability can change, so the page supports live vacancies and future-interest registration.</p></div><div class="role-list dynamic" id="careerRoleList"><div class="empty-role">Loading live roles...</div></div></section>' +
      '<section class="section"><div class="section-title"><div><span class="pill white">Why join Stratex</span><h2>Work where the product, users and football problem meet.</h2></div></div><div class="grid cols3"><article class="card"><div class="icon green">01</div><h4 style="margin-top:10px">Real ownership</h4><p>Contribute close to company, product and customer decisions rather than several layers away.</p></article><article class="card"><div class="icon">02</div><h4 style="margin-top:10px">Football impact</h4><p>Help build more structured routes for overlooked grassroots players and teams.</p></article><article class="card"><div class="icon orange">03</div><h4 style="margin-top:10px">Cross-functional learning</h4><p>Develop across product, customer operations, growth, data and football workflows.</p></article></div></section>' +
      '<section class="section grid cols2"><article class="card dark"><span class="pill dark">How we work</span><h3 style="font-size:24px;margin-top:11px">Clear ownership, honest feedback and practical delivery.</h3><p>Stratex is early-stage. People should be comfortable working across boundaries, learning quickly and improving the product from real user evidence.</p></article><article class="card"><span class="pill green">Hiring process</span><h3 style="font-size:24px;margin-top:11px">A focused process built around the role.</h3><p>Applications are reviewed for role fit, followed by relevant interviews or practical exercises rather than unnecessary stages.</p><div class="tag-list"><span class="pill grey">Application</span><span class="pill grey">Interview</span><span class="pill grey">Practical stage</span></div></article></section>' +
      '<section class="section"><div class="section-title"><div><span class="pill white">Life at Stratex</span><h2>Build an ambitious company without pretending the work is finished.</h2></div></div><div class="timeline"><article class="timeline-item"><b>Stay close to users</b><p>Understand the coaches, scouts and families affected by product decisions.</p></article><article class="timeline-item"><b>Use evidence</b><p>Make decisions from research, product signals and football context.</p></article><article class="timeline-item"><b>Take responsibility</b><p>Own outcomes and communicate clearly when something needs to change.</p></article><article class="timeline-item"><b>Keep learning</b><p>Build skills through real work, feedback, courses and cross-functional exposure.</p></article></div></section>' +
      commonCTA("Do not see the right role yet?", "Register your interest for future Stratex and ScoutLink opportunities.") +
      '</main>' + footer() + (mobile ? mobileSticky("View Roles") : "") + "</div>";
  };

  function setMode() {
    var phone = isPhone();
    document.body.classList.toggle("public-mobile", phone);
    document.body.classList.toggle("public-desktop", !phone);
  }

  function closeMenu() {
    document.body.classList.remove("public-menu-open");
    var open = document.querySelector("[data-public-menu-open]");
    var panel = document.querySelector(".public-menu-panel");
    if (open) open.setAttribute("aria-expanded", "false");
    if (panel) panel.setAttribute("aria-hidden", "true");
  }

  function openMenu() {
    document.body.classList.add("public-menu-open");
    var open = document.querySelector("[data-public-menu-open]");
    var panel = document.querySelector(".public-menu-panel");
    if (open) open.setAttribute("aria-expanded", "true");
    if (panel) panel.setAttribute("aria-hidden", "false");
  }

  function initMenu() {
    document.querySelectorAll("[data-public-menu-open]").forEach(function (button) {
      button.addEventListener("click", openMenu);
    });
    document.querySelectorAll("[data-public-menu-close]").forEach(function (button) {
      button.addEventListener("click", closeMenu);
    });
    document.querySelectorAll("[data-public-menu-backdrop]").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) closeMenu();
      });
    });
    document.querySelectorAll(".public-menu-links a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  function showMessage(id, text, type) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = "public-message show " + (type || "error");
  }

  function clearMessage(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = "public-message";
    el.textContent = "";
  }

  var pendingLogin = null;

  function setLoading(buttonId, spinnerId, textId, loading) {
    var button = document.getElementById(buttonId);
    var spinner = document.getElementById(spinnerId);
    var text = document.getElementById(textId);
    if (button) button.disabled = !!loading;
    if (spinner) spinner.style.display = loading ? "inline-block" : "none";
    if (text) text.style.display = loading ? "none" : "inline";
  }

  function storeAndRedirect(data) {
    localStorage.setItem("sl_token", data.token);
    localStorage.setItem("sl_type", data.accountType);
    localStorage.setItem("sl_user", JSON.stringify(data.user));
    localStorage.setItem("sl_user_id", data.user && data.user.id ? data.user.id : "");
    localStorage.setItem("sl_user_email", data.user && data.user.email ? data.user.email : "");
    var params = new URLSearchParams(window.location.search);
    var returnPath = safeReturnPath(params.get("return"));
    if (data.accountType === "Stratex" && returnPath) {
      window.location.href = returnPath;
      return;
    }
    var map = {
      Stratex: "experience-select.html",
      Scout: data.needsOnboarding || data.needsPreferences ? "scout-onboarding.html" : "scout-dashboard.html",
      Coach: data.needsOnboarding ? "coach-onboarding.html" : "coach-dashboard.html",
      Player: "player-dashboard.html"
    };
    window.location.href = cleanRouteFor(map[data.accountType] || "login.html");
  }

  function showRoleChooser(data, mode, credentials) {
    pendingLogin = {
      mode: mode,
      credentials: credentials,
      roles: data.roles || []
    };
    var chooser = document.getElementById("roleChooser");
    var options = document.getElementById("roleOptions");
    if (!chooser || !options) return;
    chooser.classList.remove("public-hidden");
    options.innerHTML = pendingLogin.roles.map(function (role, index) {
      return '<button class="btn" type="button" data-role-index="' + index + '">' + esc(role.label || role.accountType || "Open workspace") + "</button>";
    }).join("");
  }

  async function chooseRole(index) {
    if (!pendingLogin || !pendingLogin.roles[index]) return;
    var role = pendingLogin.roles[index];
    var body = {
      email: pendingLogin.credentials.email,
      accountType: role.accountType
    };
    if (pendingLogin.mode === "code") body.loginCode = pendingLogin.credentials.loginCode;
    else body.password = pendingLogin.credentials.password;
    try {
      var response = await fetch(apiBase() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in");
      storeAndRedirect(data);
    } catch (error) {
      showMessage("loginMessage", error.message || "Could not sign in", "error");
    }
  }

  async function submitPasswordLogin(event) {
    event.preventDefault();
    clearMessage("loginMessage");
    var email = (document.getElementById("email") || {}).value || "";
    var password = (document.getElementById("password") || {}).value || "";
    email = email.trim();
    if (!email || !password) {
      showMessage("loginMessage", "Please enter your email and password.", "error");
      return;
    }
    setLoading("loginBtn", "spinner", "btnText", true);
    try {
      var response = await fetch(apiBase() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid credentials");
      if (data.requiresRoleSelection) {
        showRoleChooser(data, "password", { email: email, password: password });
        setLoading("loginBtn", "spinner", "btnText", false);
        return;
      }
      storeAndRedirect(data);
    } catch (error) {
      showMessage("loginMessage", error.message || "Could not sign in", "error");
      setLoading("loginBtn", "spinner", "btnText", false);
    }
  }

  async function submitCodeLogin(event) {
    event.preventDefault();
    clearMessage("loginMessage");
    var email = (document.getElementById("codeEmail") || {}).value || "";
    var codeInput = document.getElementById("loginCode");
    var code = (codeInput ? codeInput.value : "").trim().toUpperCase();
    email = email.trim();
    if (!email || !code) {
      showMessage("loginMessage", "Please enter your email and login code.", "error");
      return;
    }
    setLoading("codeBtn", "codeSpinner", "codeBtnText", true);
    try {
      var response = await fetch(apiBase() + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, loginCode: code })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invalid login code");
      if (data.requiresRoleSelection) {
        showRoleChooser(data, "code", { email: email, loginCode: code });
        setLoading("codeBtn", "codeSpinner", "codeBtnText", false);
        return;
      }
      if (data.needsRegistration) {
        localStorage.setItem("sl_token", data.token);
        localStorage.setItem("sl_type", data.accountType);
        localStorage.setItem("sl_user", JSON.stringify(data.user));
        window.location.href = cleanRouteFor("complete-registration.html?token=" + encodeURIComponent(data.token) + "&type=" + encodeURIComponent(data.accountType));
        return;
      }
      storeAndRedirect(data);
    } catch (error) {
      showMessage("loginMessage", error.message || "Could not sign in with code", "error");
      setLoading("codeBtn", "codeSpinner", "codeBtnText", false);
    }
  }

  function initLogin() {
    var params = new URLSearchParams(window.location.search);
    var passwordForm = document.getElementById("passwordLoginForm");
    var codeForm = document.getElementById("codeLoginForm");
    document.querySelectorAll("[data-login-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        var mode = button.getAttribute("data-login-tab");
        document.getElementById("loginTabPassword").classList.toggle("active", mode === "password");
        document.getElementById("loginTabCode").classList.toggle("active", mode === "code");
        passwordForm.classList.toggle("public-hidden", mode !== "password");
        codeForm.classList.toggle("public-hidden", mode !== "code");
        clearMessage("loginMessage");
      });
    });
    if (passwordForm) passwordForm.addEventListener("submit", submitPasswordLogin);
    if (codeForm) codeForm.addEventListener("submit", submitCodeLogin);
    var roleOptions = document.getElementById("roleOptions");
    if (roleOptions) {
      roleOptions.addEventListener("click", function (event) {
        var button = event.target.closest("[data-role-index]");
        if (button) chooseRole(Number(button.getAttribute("data-role-index")));
      });
    }
    var codeInput = document.getElementById("loginCode");
    if (codeInput) {
      codeInput.addEventListener("input", function () {
        codeInput.value = codeInput.value.toUpperCase();
      });
    }
    if (params.get("code")) {
      var codeTab = document.getElementById("loginTabCode");
      if (codeTab) codeTab.click();
      if (params.get("email") && document.getElementById("codeEmail")) document.getElementById("codeEmail").value = params.get("email");
      if (document.getElementById("loginCode")) document.getElementById("loginCode").value = params.get("code").toUpperCase();
    }
    try {
      var token = localStorage.getItem("sl_token");
      var type = localStorage.getItem("sl_type");
      var returnPath = safeReturnPath(params.get("return"));
      if (token && type) {
        if (type === "Stratex" && returnPath) window.location.replace(returnPath);
        else {
          var map = {
            Stratex: "experience-select.html",
            Scout: "scout-dashboard.html",
            Coach: "coach-dashboard.html",
            Player: "player-dashboard.html"
          };
          if (map[type]) window.location.replace(cleanRouteFor(map[type]));
        }
      }
    } catch (error) {
      // Local storage can be unavailable in private or embedded contexts.
    }
  }

  function initContact() {
    var form = document.getElementById("publicContactForm");
    if (!form) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearMessage("contactOk");
      clearMessage("contactErr");
      var data = { sourcePage: "/contact" };
      new FormData(form).forEach(function (value, key) {
        data[key] = String(value || "").trim();
      });
      if (!data.category || !data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "") || !data.message) {
        showMessage("contactErr", "Please choose a reason, enter your name, valid email and message.", "error");
        return;
      }
      var button = document.getElementById("contactSubmit");
      if (button) {
        button.disabled = true;
        button.textContent = "Sending...";
      }
      try {
        var response = await fetch(apiBase() + "/api/trust/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not send message");
        showMessage("contactOk", result.message || "Message sent.", "success");
        form.reset();
      } catch (error) {
        showMessage("contactErr", error.message || "Could not send message.", "error");
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Send message";
        }
      }
    });
  }

  function money(value) {
    return value ? "GBP " + Number(value).toLocaleString("en-GB", { maximumFractionDigits: 0 }) : "";
  }

  function salary(job) {
    if (job.salaryUnit === "commission" || job.compensationType === "commission_based") return "Commission";
    if (job.compensationType === "unpaid_internship") return "Unpaid internship";
    if (!job.salaryMin && !job.salaryMax) return "";
    var amount = job.salaryMin && job.salaryMax ? money(job.salaryMin) + "-" + money(job.salaryMax) : money(job.salaryMin || job.salaryMax);
    return amount + " " + (job.salaryUnit || "annually");
  }

  function positionsText(job) {
    var count = parseInt(job.positionsAvailable, 10);
    return count > 0 ? count + (count === 1 ? " position" : " positions") : "";
  }

  function renderCareers(rows) {
    var box = document.getElementById("careerRoleList");
    if (!box) return;
    if (!rows.length) {
      box.innerHTML = '<div class="empty-role"><b style="color:var(--text)">No open roles right now</b><br>Check back soon for new Stratex and ScoutLink opportunities, or register your interest for future roles.</div>';
      return;
    }
    box.innerHTML = rows.map(function (job) {
      var slug = encodeURIComponent(job.slug || job.id || "");
      var meta = [job.department, job.location, job.workingType, job.employmentType, salary(job), positionsText(job)].filter(Boolean);
      var separator = " \u00b7 ";
      return '<article class="role"><div><h4>' + esc(job.jobTitle || job.title || "Open role") + '</h4><span>' + esc(meta.slice(0, 3).join(separator) || job.roleOverview || "ScoutLink role") + '</span></div><span class="role-hide-mobile">' + esc(meta[3] || "") + '</span><span class="role-hide-mobile">' + esc(meta.slice(4).join(separator)) + '</span><a class="btn primary sm" href="/careers/' + slug + '">View role</a></article>';
    }).join("");
  }

  async function initCareers() {
    var box = document.getElementById("careerRoleList");
    if (!box) return;
    box.innerHTML = '<div class="empty-role">Loading live roles...</div>';
    try {
      var response = await fetch(apiBase() + "/api/careers");
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load roles");
      renderCareers(result.data || []);
    } catch (error) {
      box.innerHTML = '<div class="empty-role"><b style="color:var(--text)">We could not load live roles</b><br>' + esc(error.message || "Please refresh the page or check back soon.") + '</div>';
    }
  }

  function startPublicDemo(role) {
    var scout = role === "Scout";
    sessionStorage.setItem("sl_public_demo", "1");
    sessionStorage.setItem("sl_public_demo_role", role);
    localStorage.setItem("sl_demo_mode", "1");
    localStorage.setItem("sl_token", "public-demo-session");
    localStorage.setItem("sl_type", role);
    localStorage.setItem("sl_user", JSON.stringify({
      id: scout ? "demo-scout-noah" : "demo-coach-marcus",
      firstName: scout ? "Noah" : "Marcus",
      lastName: scout ? "Patel" : "Reed",
      email: scout ? "demo.scout@scoutlink.app" : "demo.coach@scoutlink.app"
    }));
    window.location.href = scout ? "/scout/dashboard" : "/coach/dashboard";
  }

  var faqAnswers = {
    "Who is ScoutLink for?": "ScoutLink is built for grassroots coaches, reviewed scouts, clubs, academies, schools, players and families who need clearer player evidence and safer visibility routes.",
    "Can anyone browse players?": "No. Player search is only available to reviewed scout accounts and access can be restricted or removed where needed.",
    "Does compatibility replace scout judgement?": "No. Compatibility is decision support. It explains fit, evidence and context, but final scouting judgement remains human.",
    "How much does a coach account cost?": "Coach workspaces are free to start so teams can build player evidence before a scout ever searches for them.",
    "How much time does profile maintenance take?": "The workflow is designed around short weekly updates: fixtures before a match, match facts afterwards and small profile improvements over time.",
    "How is scout interest handled?": "Scout interest is routed through the responsible coach, club or adult account instead of direct unmanaged contact with children.",
    "Can ScoutLink guarantee a player will be scouted?": "No. ScoutLink improves structure and visibility, but it does not guarantee selection, trials, representation or signings.",
    "Who creates and manages player profiles?": "Authorised coaches, clubs, schools or approved adults create and manage the player records used inside ScoutLink.",
    "How can a family raise a concern?": "Families can use the Report a Concern route or contact ScoutLink support so the issue is reviewed through the correct trust process.",
    "Can scouts contact children directly?": "No. ScoutLink is designed around adult-mediated contact through coaches, clubs, schools or responsible guardians.",
    "Who can create player profiles?": "Player profiles should be created only by authorised adults connected to the team, club, school or approved programme.",
    "What happens after a concern is submitted?": "The concern is logged and reviewed by the appropriate Stratex team, with follow-up depending on urgency, evidence and safeguarding risk."
  };

  var productPanels = {
    "Player profile": {
      label: "PLAYER PROFILE",
      title: "One structured record for the player.",
      copy: "Ratings, match facts, fixtures, approved video, physical context and evidence confidence sit together.",
      items: [["Ratings", "Coach-led attributes"], ["Match facts", "Game evidence"], ["Video", "Approved clips"], ["Confidence", "Evidence quality"]]
    },
    "Compatibility": {
      label: "COMPATIBILITY",
      title: "Explain fit without hiding the reasoning.",
      copy: "Scout setup, role expectations, attributes, match output and evidence confidence combine into a clear compatibility view.",
      items: [["Need fit", "Team gaps"], ["Role fit", "Position context"], ["Evidence", "Confidence level"], ["Output", "Readable breakdown"]]
    },
    "Scout search": {
      label: "SCOUT SEARCH",
      title: "Find relevant players faster.",
      copy: "Reviewed scouts can search by position, age, location, overall rating, compatibility and evidence quality.",
      items: [["Filters", "Focused search"], ["Cards", "Fast scanning"], ["Profiles", "Deep review"], ["Pipeline", "Next action"]]
    },
    "Match facts": {
      label: "MATCH FACTS",
      title: "Turn games into usable evidence.",
      copy: "Fixtures, appearances, goals, assists, cards, positions and match ratings flow into player profiles.",
      items: [["Fixtures", "Match setup"], ["Events", "Key moments"], ["Ratings", "Performance"], ["Profile", "Updated evidence"]]
    },
    "Pipeline": {
      label: "PIPELINE",
      title: "Keep recruitment follow-up organised.",
      copy: "Scouts can shortlist players, manage stages, review history and keep coach messages connected.",
      items: [["Stages", "Track status"], ["Chats", "Coach contact"], ["Exports", "Reports"], ["Predictions", "Analysis"]]
    }
  };

  function productPanelHtml(panel) {
    return '<span class="pill dark">' + esc(panel.label) + '</span><h3>' + esc(panel.title) + '</h3><p>' + esc(panel.copy) + '</p><div class="mini-grid">' +
      panel.items.map(function (item) {
        return '<div class="mini"><b>' + esc(item[0]) + '</b><span>' + esc(item[1]) + '</span></div>';
      }).join("") +
      '</div>';
  }

  function initProductTabs() {
    document.querySelectorAll(".feature-showcase").forEach(function (showcase) {
      var panel = showcase.querySelector(".product-panel");
      var tabs = Array.prototype.slice.call(showcase.querySelectorAll(".tab"));
      if (!panel || !tabs.length || showcase.dataset.tabsReady === "1") return;
      showcase.dataset.tabsReady = "1";
      tabs.forEach(function (tab) {
        tab.setAttribute("type", "button");
        tab.addEventListener("click", function () {
          tabs.forEach(function (item) { item.classList.remove("active"); });
          tab.classList.add("active");
          var config = productPanels[(tab.textContent || "").trim()];
          if (config) panel.innerHTML = productPanelHtml(config);
        });
      });
    });
  }

  function initFaqs() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      if (item.dataset.faqReady === "1") return;
      item.dataset.faqReady = "1";
      var questionEl = item.querySelector("span:first-child");
      var plus = item.querySelector(".plus");
      var question = questionEl ? questionEl.textContent.trim() : "";
      var answer = faqAnswers[question] || "This answer is reviewed as part of ScoutLink's product, trust and support documentation.";
      var answerEl = document.createElement("div");
      answerEl.className = "faq-answer";
      answerEl.textContent = answer;
      item.appendChild(answerEl);
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
      item.setAttribute("aria-expanded", "false");
      function toggle() {
        var open = !item.classList.contains("open");
        item.classList.toggle("open", open);
        item.setAttribute("aria-expanded", open ? "true" : "false");
        if (plus) plus.textContent = "+";
      }
      item.addEventListener("click", toggle);
      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
    });
  }

  function textRoute(label) {
    var normalized = label.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized.indexOf("explore as coach") >= 0 || normalized.indexOf("start coach demo") >= 0 || normalized.indexOf("explore coach demo") >= 0) return { demo: "Coach" };
    if (normalized.indexOf("explore as scout") >= 0 || normalized.indexOf("start scout demo") >= 0 || normalized.indexOf("explore scout demo") >= 0) return { demo: "Scout" };
    if (normalized.indexOf("register as coach") >= 0) return { href: "/register/coach" };
    if (normalized.indexOf("request scout access") >= 0) return { href: "/register/scout" };
    if (normalized === "demo" || normalized.indexOf("explore demo") >= 0 || normalized.indexOf("explore the demo") >= 0) return { href: "/demo" };
    if (normalized.indexOf("sign in") >= 0 || normalized.indexOf("scoutlink login") >= 0 || normalized.indexOf("open scoutlink") >= 0) return { href: "/login" };
    if (normalized.indexOf("report a concern") >= 0) return { href: "/report-a-concern" };
    if (normalized.indexOf("parent") >= 0 && normalized.indexOf("notice") >= 0) return { href: "/parent-guardian-notice" };
    if (normalized.indexOf("privacy policy") >= 0) return { href: "/privacy-policy" };
    if (normalized.indexOf("privacy request") >= 0) return { href: "/privacy-request" };
    if (normalized.indexOf("contact") >= 0) return { href: "/contact" };
    if (normalized.indexOf("view open roles") >= 0 || normalized === "view roles" || normalized === "view all roles" || normalized === "view role") return { hash: "#careerRoleList" };
    if (normalized === "register") return { href: "/contact?reason=careers" };
    if (normalized.indexOf("register interest") >= 0) return { href: "/contact?reason=careers" };
    if (normalized.indexOf("about stratex") >= 0) return { href: "/about" };
    if (normalized.indexOf("meet the team") >= 0) return { href: "/about#team" };
    if (normalized.indexOf("read safeguarding") >= 0) return { href: "/safeguarding" };
    if (normalized.indexOf("for coaches") >= 0) return { href: "/coaches" };
    if (normalized.indexOf("for scouts") >= 0) return { href: "/scouts" };
    if (normalized.indexOf("for families") >= 0 || normalized.indexOf("parents") >= 0) return { href: "/parents-players" };
    if (normalized.indexOf("read notice") >= 0) return { href: "/parent-guardian-notice" };
    if (normalized.indexOf("explore scoutlink") >= 0) return { href: "/" };
    return null;
  }

  function initButtonRouting() {
    if (document.body.dataset.publicButtonRoutingReady === "1") return;
    document.body.dataset.publicButtonRoutingReady = "1";
    document.querySelectorAll(".band-link").forEach(function (item) {
      if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");
      if (!item.hasAttribute("role")) item.setAttribute("role", "button");
    });
    document.addEventListener("click", function (event) {
      var button = event.target.closest("button.btn, .band-link");
      if (!button || button.closest("form")) return;
      var route = textRoute(button.textContent || "");
      if (!route) return;
      event.preventDefault();
      if (route.demo) {
        startPublicDemo(route.demo);
        return;
      }
      if (route.hash) {
        var target = document.querySelector(route.hash);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      window.location.href = route.href;
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var button = event.target.closest(".band-link");
      if (!button) return;
      event.preventDefault();
      button.click();
    });
  }

  function initPage() {
    initMenu();
    initButtonRouting();
    initProductTabs();
    initFaqs();
    var page = document.body.dataset.publicPage || "home";
    if (page === "login") initLogin();
    if (page === "contact") initContact();
    if (page === "careers") initCareers();
  }

  function render() {
    var root = document.getElementById("publicCoreRoot");
    var page = document.body.dataset.publicPage || "home";
    var renderers = {
      home: window.homePage,
      demo: window.demoPage,
      coaches: window.coachesPage,
      scouts: window.scoutsPage,
      parents: window.parentsPage,
      safeguarding: window.safeguardingPage,
      login: window.loginPage,
      about: window.aboutPage,
      contact: window.contactPage,
      careers: window.careersPage
    };
    if (!root || typeof renderers[page] !== "function") return;
    setMode();
    root.innerHTML = renderers[page](isPhone());
    initPage();
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });
  var lastPhone = isPhone();
  window.addEventListener("resize", function () {
    var nowPhone = isPhone();
    setMode();
    if (!nowPhone) closeMenu();
    if (nowPhone !== lastPhone) {
      lastPhone = nowPhone;
      render();
    }
  });
  document.addEventListener("DOMContentLoaded", render);
})();
