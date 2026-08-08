(function () {
  'use strict';

  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }());
  var SITE = 'https://www.stratexanalytics.co.uk';
  var CONTENT_URL = '/assets/stratex-public-v5-pages.json?v=20260808-1';
  var root = document.getElementById('stratexPublicRoot');
  var route = resolveRoute();
  var jobs = [];
  var posts = [];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function resolveRoute() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (/^\/careers\/[^/]+/.test(path)) {
      return { key: '/careers/{job-slug}', path: path, slug: decodeURIComponent(path.split('/').slice(2).join('/')) };
    }
    if (/^\/learning-centre\/[^/]+/.test(path)) {
      return { key: '/learning-centre/{article-slug}', path: path, slug: decodeURIComponent(path.split('/').slice(2).join('/')) };
    }
    return { key: path, path: path, slug: '' };
  }

  function setMeta(page) {
    if (!page) return;
    var title = page.title || 'Stratex Analytics';
    var description = page.description || 'Football intelligence for overlooked grassroots talent.';
    var canonical = SITE + (route.path === '/' ? '/' : route.path);
    document.title = title;
    [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', title],
      ['meta[property="og:description"]', description],
      ['meta[property="og:url"]', canonical],
      ['meta[name="twitter:title"]', title],
      ['meta[name="twitter:description"]', description]
    ].forEach(function (entry) {
      var node = document.querySelector(entry[0]);
      if (node) node.setAttribute('content', entry[1]);
    });
    var canonicalNode = document.querySelector('link[rel="canonical"]');
    if (canonicalNode) canonicalNode.href = canonical;
  }

  function renderNotFound() {
    if (!root) return;
    document.title = 'Page Not Found | Stratex Analytics';
    root.innerHTML =
      '<div class="site">' +
        '<main><section class="s-hero"><div class="s-hero-in">' +
          '<span class="s-eb">404 · Wrong route</span>' +
          '<h1 class="s-h1">Nothing here. <span class="accent">Back to the football.</span></h1>' +
          '<p class="s-sub">The page may have moved or the address may be incorrect.</p>' +
          '<div class="s-cta-row"><a class="s-btn volt" href="/">Go home</a><a class="s-btn ghost" href="/contact">Contact us</a></div>' +
        '</div></section></main>' +
      '</div>';
  }

  async function ensureContent() {
    try {
      var response = await fetch(CONTENT_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Could not load public page content.');
      var store = await response.json();
      var page = store.pages && store.pages[route.key];
      if (!page) {
        renderNotFound();
        return false;
      }
      setMeta(page);
      if (root && !root.children.length) root.innerHTML = page.html;
      return true;
    } catch (_) {
      if (root && root.children.length) return true;
      renderNotFound();
      return false;
    }
  }

  function bindMenu() {
    var button = document.querySelector('[data-stratex-menu-button]');
    var panel = document.querySelector('[data-stratex-menu-panel]');
    if (!button || !panel) return;
    function close() {
      document.body.classList.remove('stratex-menu-open');
      button.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
    }
    button.addEventListener('click', function () {
      var open = !document.body.classList.contains('stratex-menu-open');
      document.body.classList.toggle('stratex-menu-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    });
    panel.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', close); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
  }

  function showFormMessage(form, text, kind) {
    var message = form.querySelector('.form-message');
    if (!message) return;
    message.className = 'form-message show ' + (kind || '');
    message.textContent = text;
  }

  function setSubmitting(form, submitting) {
    var button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
    button.disabled = submitting;
    button.textContent = submitting ? 'Submitting…' : button.dataset.defaultLabel;
  }

  function formDataObject(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (!(value instanceof File)) data[key] = String(value || '').trim();
    });
    var consent = form.querySelector('[name="consentContact"]');
    var marketing = form.querySelector('[name="consentMarketing"]');
    data.consentContact = !!(consent && (consent.checked || String(consent.value).toLowerCase() === 'true'));
    data.consentMarketing = !!(marketing && (marketing.checked || String(marketing.value).toLowerCase() === 'true'));
    data.sourcePage = window.location.pathname;
    data.consentVersion = '2026-08-stratex-public-v5';
    return data;
  }

  function bindPublicForms() {
    document.querySelectorAll('[data-stx-form]').forEach(function (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        var type = form.getAttribute('data-stx-form');
        var endpoint = { contact: '/api/stratex-website/contact', concern: '/api/stratex-website/concern' }[type];
        if (!endpoint) return;
        var data = formDataObject(form);
        if (type === 'concern') {
          data.name = data.contactName || '';
          data.email = data.contactEmail || '';
          data.message = data.details || '';
        }
        setSubmitting(form, true);
        try {
          var response = await fetch(API + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          var json = await response.json().catch(function () { return {}; });
          if (!response.ok) throw new Error(json.error || 'The submission could not be saved.');
          form.reset();
          showFormMessage(
            form,
            type === 'concern'
              ? 'Your concern has been received for restricted review. If somebody is in immediate danger, contact emergency services first.'
              : (json.message || 'Thanks. Your enquiry has been received.'),
            'ok'
          );
        } catch (error) {
          showFormMessage(form, error.message || 'The submission could not be saved. Please try again.', 'err');
        } finally {
          setSubmitting(form, false);
        }
      });
    });
  }

  function jobField(job, camel, snake) {
    return job[camel] != null ? job[camel] : job[snake];
  }

  function textValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join('\n');
    return String(value || '').trim();
  }

  function paragraphBlock(title, value, ordered) {
    var content = textValue(value);
    if (!content) return '';
    var lines = content.split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (lines.length > 1) {
      var tag = ordered ? 'ol' : 'ul';
      return '<section><h2>' + esc(title) + '</h2><' + tag + '>' +
        lines.map(function (line) { return '<li>' + esc(line.replace(/^[-•]\s*/, '')) + '</li>'; }).join('') +
      '</' + tag + '></section>';
    }
    return '<section><h2>' + esc(title) + '</h2><p>' + esc(content) + '</p></section>';
  }

  function renderJobs() {
    var container = document.getElementById('careerJobs');
    if (!container) return;
    var count = document.getElementById('careerJobCount');
    if (count) count.textContent = jobs.length + ' open role' + (jobs.length === 1 ? '' : 's');
    if (!jobs.length) {
      container.innerHTML = '<div class="empty-state">No open roles right now. Good people still get remembered — email people@stratexanalytics.co.uk.</div>';
      return;
    }
    container.innerHTML = jobs.map(function (job) {
      var title = jobField(job, 'jobTitle', 'job_title') || 'Open role';
      var overview = jobField(job, 'roleOverview', 'role_overview') || '';
      var employment = jobField(job, 'employmentType', 'employment_type') || '';
      var working = jobField(job, 'workingType', 'working_type') || '';
      var slug = job.slug || job.id || '';
      return '<article><div><div class="job-tags"><span>' + esc(job.department || 'Stratex') + '</span><span>' +
        esc(employment || 'Open role') + '</span></div><h3>' + esc(title) + '</h3><p>' + esc(overview) +
        '</p><div class="job-meta"><span>' + esc(job.location || 'Flexible') + '</span><span>' +
        esc(working) + '</span></div></div><aside><a class="s-btn solid sm" href="/careers/' +
        encodeURIComponent(slug) + '">View role</a></aside></article>';
    }).join('');
  }

  async function loadJobs() {
    if (!document.getElementById('careerJobs')) return;
    try {
      var response = await fetch(API + '/api/careers');
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error();
      jobs = json.data || json.jobs || [];
    } catch (_) {
      jobs = [];
    }
    renderJobs();
  }

  async function loadJobDetail() {
    if (route.key !== '/careers/{job-slug}') return;
    var hero = document.getElementById('careerHero');
    var copy = document.getElementById('careerCopy');
    var form = document.querySelector('[data-career-apply]');
    if (form) form.setAttribute('data-slug', route.slug);
    try {
      var response = await fetch(API + '/api/careers/' + encodeURIComponent(route.slug));
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Role not found.');
      var job = json.data || json.job || {};
      var title = jobField(job, 'jobTitle', 'job_title') || 'Open role';
      var overview = jobField(job, 'roleOverview', 'role_overview') || '';
      var employment = jobField(job, 'employmentType', 'employment_type') || '';
      var working = jobField(job, 'workingType', 'working_type') || '';
      setMeta({ title: title + ' | Stratex Analytics', description: overview || 'View and apply for this Stratex Analytics role.' });
      if (hero) {
        hero.innerHTML = '<div class="shell"><a class="back-link" href="/careers">← Back to careers</a><div class="job-hero-grid"><div><span class="s-eb">Careers · ' +
          esc(job.department || 'Open role') + '</span><h1>' + esc(title) + '</h1><p>' + esc(overview) +
          '</p></div><dl><div><dt>Location</dt><dd>' + esc(job.location || 'Flexible') +
          '</dd></div><div><dt>Working pattern</dt><dd>' + esc(working || 'Role dependent') +
          '</dd></div><div><dt>Employment</dt><dd>' + esc(employment || 'Role dependent') +
          '</dd></div><div><dt>Interview stages</dt><dd>' +
          esc(jobField(job, 'interviewStages', 'interview_stages') || 'Role dependent') + '</dd></div></dl></div></div>';
      }
      if (copy) {
        copy.innerHTML =
          paragraphBlock('About Stratex Analytics', jobField(job, 'aboutCompany', 'about_company')) +
          paragraphBlock('Role overview', overview) +
          paragraphBlock('What you will be doing', jobField(job, 'whatYouWillBeDoing', 'what_you_will_be_doing') || job.responsibilities) +
          paragraphBlock('What we are looking for', jobField(job, 'mustHaves', 'must_haves') || job.requirements) +
          paragraphBlock('Interview process', jobField(job, 'interviewProcess', 'interview_process'), true);
      }
    } catch (error) {
      if (copy) copy.innerHTML = '<section><h2>Role not found</h2><p>' + esc(error.message || 'This role is no longer available.') + '</p><p><a class="s-btn solid" href="/careers">View open roles</a></p></section>';
      if (form) form.hidden = true;
    }
  }

  function bindCareerApplication() {
    var form = document.querySelector('[data-career-apply]');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var fileInput = form.querySelector('[name="cv"]');
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!file) return showFormMessage(form, 'Please attach your CV.', 'err');
      if (file.size > 5 * 1024 * 1024) return showFormMessage(form, 'The CV must be 5MB or smaller.', 'err');
      setSubmitting(form, true);
      try {
        var response = await fetch(API + '/api/careers/' + encodeURIComponent(form.getAttribute('data-slug') || route.slug) + '/apply', {
          method: 'POST',
          body: new FormData(form)
        });
        var json = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(json.error || 'The application could not be submitted.');
        form.reset();
        showFormMessage(form, json.message || 'Application received. Please check your email, including junk, for confirmation.', 'ok');
      } catch (error) {
        showFormMessage(form, error.message || 'The application could not be submitted. Please try again.', 'err');
      } finally {
        setSubmitting(form, false);
      }
    });
  }

  function renderPosts() {
    var container = document.getElementById('learningPosts');
    if (!container) return;
    if (!posts.length) {
      container.innerHTML = '<div class="empty-state">No published guides right now.</div>';
      return;
    }
    container.innerHTML = posts.map(function (post, index) {
      var featured = index === 0 ? ' featured-article' : '';
      return '<article class="' + featured.trim() + '"><span>' + esc(post.category || 'Learning') +
        '</span><h3>' + esc(post.title || 'Stratex guide') + '</h3><p>' + esc(post.excerpt || '') +
        '</p><div><span>' + esc(Number(post.view_count || 0).toLocaleString('en-GB')) +
        ' views</span><a href="/learning-centre/' + encodeURIComponent(post.slug || '') + '">Read guide →</a></div></article>';
    }).join('');
  }

  async function loadPosts() {
    if (!document.getElementById('learningPosts')) return;
    try {
      var response = await fetch(API + '/api/stratex-website/blog?published=true');
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error();
      posts = json.data || [];
    } catch (_) {
      posts = [];
    }
    renderPosts();
  }

  function bodyParagraphs(value) {
    return String(value || '').split(/\n{2,}/).map(function (paragraph) {
      return '<p class="body">' + esc(paragraph).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  async function loadArticleDetail() {
    if (route.key !== '/learning-centre/{article-slug}') return;
    var hero = document.getElementById('articleHero');
    var copy = document.getElementById('articleCopy');
    try {
      var response = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(route.slug));
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Article not found.');
      var post = json.data || {};
      setMeta({ title: (post.title || 'Learning Centre') + ' | Stratex Analytics', description: post.excerpt || 'Read practical football intelligence guidance.' });
      if (hero) {
        hero.innerHTML = '<div class="shell"><a class="back-link" href="/learning-centre">← Back to Learning Centre</a><span class="s-eb">' +
          esc(post.category || 'Learning') + '</span><h1>' + esc(post.title || 'Learning Centre') + '</h1><p>' +
          esc(post.excerpt || '') + '</p><div class="article-meta"><span>' +
          esc(Number(post.view_count || 0).toLocaleString('en-GB')) + ' views</span><span id="articleLikeCount">' +
          esc(Number(post.like_count || 0).toLocaleString('en-GB')) + ' likes</span></div></div>';
      }
      if (copy) {
        copy.innerHTML = '<p class="standfirst">' + esc(post.excerpt || '') + '</p>' + bodyParagraphs(post.body || '') +
          '<div class="article-actions"><button type="button" data-article-like>Like this guide</button><button type="button" data-article-share>Share</button></div>';
        var like = copy.querySelector('[data-article-like]');
        var share = copy.querySelector('[data-article-share]');
        if (like) like.addEventListener('click', async function () {
          like.disabled = true;
          try {
            var r = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(route.slug) + '/like', { method: 'POST' });
            var j = await r.json().catch(function () { return {}; });
            if (!r.ok) throw new Error();
            var count = document.getElementById('articleLikeCount');
            if (count) count.textContent = Number(j.likeCount || 0).toLocaleString('en-GB') + ' likes';
            like.textContent = 'Liked';
          } catch (_) { like.disabled = false; }
        });
        if (share) share.addEventListener('click', async function () {
          try {
            if (navigator.share) await navigator.share({ title: post.title || 'Stratex guide', url: window.location.href });
            else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); share.textContent = 'Link copied'; }
          } catch (_) {}
        });
      }
    } catch (error) {
      if (copy) copy.innerHTML = '<section><h2>Article not found</h2><p>' + esc(error.message || 'This guide is no longer available.') + '</p></section>';
    }
  }

  function dateLabel(value) {
    if (!value) return '';
    var d = new Date(String(value).length === 10 ? value + 'T12:00:00Z' : value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric', timeZone:'UTC' }).toUpperCase();
  }

  function timeLabel(value) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    var hour = Number(match[1]);
    return (hour % 12 || 12) + ':' + match[2] + ' ' + (hour >= 12 ? 'PM' : 'AM');
  }

  async function hydrateShowcase() {
    if (route.path !== '/showcase-event') return;
    try {
      var response = await fetch(API + '/api/stratex-publishing/showcase-events?_=' + Date.now(), { cache:'no-store', credentials:'include' });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) return;
      var events = json.data || [];
      var event = events.find(function (row) { return row.featured; }) || events[0];
      if (!event) return;
      var fixture = document.getElementById('showcaseEventFixture');
      var age = document.getElementById('showcaseEventAge');
      var venue = document.getElementById('showcaseEventVenue');
      if (fixture) {
        fixture.innerHTML = 'SCOUTLINK SHOWCASE EVENT <i>·</i> ' + esc(dateLabel(event.eventDate)) +
          ' <i>·</i> ARRIVAL ' + esc(timeLabel(event.playerArrivalTime)) + ' <i>·</i> ' +
          esc(String(event.venueName || 'Venue TBC').toUpperCase()) + ' <i>·</i> AGES ' +
          esc(String(event.playerMinAge || 12)) + '–' + esc(String(event.playerMaxAge || 16));
      }
      if (age) age.textContent = 'Ages ' + (event.playerMinAge || 12) + ' to ' + (event.playerMaxAge || 16) + ' on the event date, grouped and scheduled by age band on the day.';
      if (venue) venue.textContent = (event.venueName || 'Venue to be confirmed') + (event.venueAddress ? ' — ' + event.venueAddress : '') + '.';
      if (!event.professionalRegistrationOpen || Number(event.remainingProfessionalPlaces || 0) <= 0) {
        document.querySelectorAll('a[href="/showcase-event/coach-scout-registration"]').forEach(function (link) {
          link.href = '/showcase-event/coach-scout-registration/sold-out';
        });
      }
    } catch (_) {}
  }

  function bindCookieToggles() {
    document.querySelectorAll('.cookie-toggle:not([data-locked])').forEach(function (button) {
      button.addEventListener('click', function () {
        button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });
  }

  function trackPage() {
    try {
      fetch(API + '/api/stratex-website/activity', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          pagePath: window.location.pathname,
          pageTitle: document.title,
          canonicalUrl: window.location.href.split('#')[0],
          referrer: document.referrer || ''
        }),
        credentials:'include',
        keepalive:true
      }).catch(function () {});
    } catch (_) {}
  }

  async function init() {
    var ready = await ensureContent();
    if (!ready) return;
    bindMenu();
    bindPublicForms();
    bindCareerApplication();
    bindCookieToggles();
    await Promise.all([loadJobs(), loadPosts(), hydrateShowcase()]);
    await loadJobDetail();
    await loadArticleDetail();
    trackPage();
  }

  document.addEventListener('DOMContentLoaded', init);
}());
