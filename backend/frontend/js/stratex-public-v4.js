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
  var CONTENT_URL = '/assets/stratex-public-v4-pages.json?v=20260729';
  var root = document.getElementById('stratexPublicRoot');
  var route = resolveRoute();
  var pageStore = null;
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
    var canonicalPath = route.path === '/' ? '/' : route.path;
    var canonical = SITE + canonicalPath;
    document.title = title;
    var selectors = {
      'meta[name="description"]': description,
      'meta[property="og:title"]': title,
      'meta[property="og:description"]': description,
      'meta[property="og:url"]': canonical,
      'meta[name="twitter:title"]': title,
      'meta[name="twitter:description"]': description
    };
    Object.keys(selectors).forEach(function (selector) {
      var element = document.querySelector(selector);
      if (element) element.setAttribute('content', selectors[selector]);
    });
    var canonicalElement = document.querySelector('link[rel="canonical"]');
    if (canonicalElement) canonicalElement.setAttribute('href', canonical);
  }

  function renderNotFound() {
    document.title = 'Page Not Found | Stratex Analytics';
    if (!root) return;
    root.innerHTML = '<div class="public-page">' +
      '<main><section class="simple-hero dark"><div class="shell"><span>404</span><h1>THIS PAGE DOES NOT EXIST.</h1><p>The public route has been removed or the address is incorrect.</p><div class="button-row"><a class="button white" href="/">Return home</a><a class="button ghost" href="/contact">Contact Stratex</a></div></div></section></main>' +
    '</div>';
  }

  async function ensureContent() {
    try {
      var response = await fetch(CONTENT_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Could not load public page content.');
      pageStore = await response.json();
      var page = pageStore.pages && pageStore.pages[route.key];
      if (!page) {
        renderNotFound();
        return false;
      }
      setMeta(page);
      if (root && !root.children.length) root.innerHTML = page.html;
      return true;
    } catch (error) {
      if (root && root.children.length) return true;
      renderNotFound();
      return false;
    }
  }

  function bindMenu() {
    var button = document.querySelector('[data-stratex-menu-button]');
    var panel = document.querySelector('[data-stratex-menu-panel]');
    if (!button || !panel) return;
    button.addEventListener('click', function () {
      var open = !document.body.classList.contains('stratex-menu-open');
      document.body.classList.toggle('stratex-menu-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    });
    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        document.body.classList.remove('stratex-menu-open');
        button.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        document.body.classList.remove('stratex-menu-open');
        button.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function targetParts(raw) {
    var source = String(raw || '').trim();
    var match = source.match(/^([^0-9-]*)(-?[0-9][0-9,]*(?:\.[0-9]+)?)(.*)$/);
    if (!match) return { prefix: '', value: 0, suffix: source, decimals: 0, commas: false };
    var numberText = match[2];
    return {
      prefix: match[1] || '',
      value: Number(numberText.replace(/,/g, '')) || 0,
      suffix: match[3] || '',
      decimals: numberText.indexOf('.') >= 0 ? numberText.split('.')[1].length : 0,
      commas: numberText.indexOf(',') >= 0
    };
  }

  function formatCounter(parts, value) {
    var rounded = parts.decimals ? Number(value).toFixed(parts.decimals) : String(Math.round(value));
    if (parts.commas) {
      var numeric = Number(rounded);
      rounded = numeric.toLocaleString('en-GB', {
        minimumFractionDigits: parts.decimals,
        maximumFractionDigits: parts.decimals
      });
    }
    return parts.prefix + rounded + parts.suffix;
  }

  function animateCounterGroup(group) {
    if (!group || group.getAttribute('data-counter-started') === '1') return;
    group.setAttribute('data-counter-started', '1');
    var counters = Array.prototype.slice.call(group.querySelectorAll('.counter[data-counter]'));
    if (!counters.length) return;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var parsed = counters.map(function (element) {
      return { element: element, parts: targetParts(element.getAttribute('data-counter')) };
    });
    if (reduced) {
      parsed.forEach(function (item) { item.element.textContent = formatCounter(item.parts, item.parts.value); });
      return;
    }
    var started = null;
    var duration = 1650;
    function frame(timestamp) {
      if (started == null) started = timestamp;
      var progress = Math.min(1, (timestamp - started) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      parsed.forEach(function (item) {
        item.element.textContent = formatCounter(item.parts, item.parts.value * eased);
      });
      if (progress < 1) window.requestAnimationFrame(frame);
      else parsed.forEach(function (item) { item.element.textContent = formatCounter(item.parts, item.parts.value); });
    }
    window.requestAnimationFrame(frame);
  }

  function initCounters() {
    var groups = Array.prototype.slice.call(document.querySelectorAll('.stat-grid, .frequency-line'));
    groups = groups.filter(function (group) { return group.querySelector('.counter[data-counter]'); });
    groups.forEach(function (group) {
      group.querySelectorAll('.counter[data-counter]').forEach(function (counter) { counter.textContent = '0'; });
    });
    if (!('IntersectionObserver' in window)) {
      groups.forEach(animateCounterGroup);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounterGroup(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    groups.forEach(function (group) { observer.observe(group); });
  }

  function equaliseActionRows() {
    document.querySelectorAll('.button-row, .leader-actions').forEach(function (row) {
      var actions = Array.prototype.slice.call(row.querySelectorAll(':scope > .button, :scope > button'));
      actions.forEach(function (action) { action.style.minHeight = ''; });
      if (actions.length < 2) return;
      var tallest = actions.reduce(function (height, action) {
        return Math.max(height, action.getBoundingClientRect().height);
      }, 0);
      actions.forEach(function (action) { action.style.minHeight = Math.ceil(tallest) + 'px'; });
    });
  }

  function formDataObject(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (!(value instanceof File)) data[key] = String(value || '').trim();
    });
    data.consentContact = !!form.querySelector('[name="consentContact"]:checked');
    data.consentMarketing = !!form.querySelector('[name="consentMarketing"]:checked');
    data.sourcePage = window.location.pathname;
    data.consentVersion = '2026-07-stratex-public-v4';
    return data;
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
    if (!button.getAttribute('data-default-label')) button.setAttribute('data-default-label', button.textContent);
    button.disabled = submitting;
    button.textContent = submitting ? 'Submitting…' : button.getAttribute('data-default-label');
  }

  function bindPublicForms() {
    document.querySelectorAll('[data-stx-form]').forEach(function (form) {
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var type = form.getAttribute('data-stx-form');
        var endpoint = {
          contact: '/api/stratex-website/contact',
          concern: '/api/stratex-website/concern'
        }[type];
        if (!endpoint) return;
        if (!form.reportValidity()) return;
        var data = formDataObject(form);
        if (type === 'concern') {
          data.name = data.contactName || '';
          data.email = data.contactEmail || '';
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

  function jobField(job, camel, snake) {
    return job[camel] != null ? job[camel] : job[snake];
  }

  function renderJobs() {
    var rootJobs = document.getElementById('careerJobs');
    if (!rootJobs) return;
    var query = String((document.getElementById('careerSearchInput') || {}).value || '').toLowerCase();
    var activeButton = document.querySelector('[data-career-filter].active');
    var filter = activeButton ? activeButton.getAttribute('data-career-filter') : 'All';
    var filtered = jobs.filter(function (job) {
      var title = jobField(job, 'jobTitle', 'job_title') || '';
      var department = job.department || '';
      var text = [title, department, jobField(job, 'roleOverview', 'role_overview'), job.location].join(' ').toLowerCase();
      var matchesQuery = !query || text.indexOf(query) >= 0;
      var matchesFilter = filter === 'All' || department.toLowerCase().indexOf(filter.toLowerCase()) >= 0;
      return matchesQuery && matchesFilter;
    });
    var count = document.getElementById('careerJobCount');
    if (count) count.textContent = filtered.length + ' open role' + (filtered.length === 1 ? '' : 's');
    if (!filtered.length) {
      rootJobs.innerHTML = '<div class="empty-state">No open roles match this search right now.</div>';
      return;
    }
    rootJobs.innerHTML = filtered.map(function (job) {
      var title = jobField(job, 'jobTitle', 'job_title') || 'Open role';
      var slug = job.slug || job.id || '';
      var overview = jobField(job, 'roleOverview', 'role_overview') || '';
      var employment = jobField(job, 'employmentType', 'employment_type') || '';
      var working = jobField(job, 'workingType', 'working_type') || '';
      return '<article><div><div class="job-tags"><span>' + esc(job.department || 'Stratex') + '</span><span>' + esc(employment || 'Open role') + '</span></div>' +
        '<h3>' + esc(title) + '</h3><p>' + esc(overview) + '</p><div class="job-meta"><span>' + esc(job.location || 'Flexible') + '</span><span>' + esc(working) + '</span><span>' + esc(employment) + '</span></div></div>' +
        '<aside><small>Applications reviewed while live</small><div class="button-row"><a class="button primary" href="/careers/' + encodeURIComponent(slug) + '">View role</a></div></aside></article>';
    }).join('');
    equaliseActionRows();
  }

  async function loadJobs() {
    if (!document.getElementById('careerJobs')) return;
    try {
      var response = await fetch(API + '/api/careers');
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Could not load roles.');
      jobs = json.data || json.jobs || [];
    } catch (_) {
      jobs = [];
    }
    renderJobs();
    var search = document.getElementById('careerSearchInput');
    if (search) search.addEventListener('input', renderJobs);
    document.querySelectorAll('[data-career-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('[data-career-filter]').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
        renderJobs();
      });
    });
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
        hero.innerHTML = '<div class="shell"><a class="back-link" href="/careers">← Back to careers</a><div class="job-hero-grid"><div><span>' + esc(job.department || 'Open role') + '</span><h1>' + esc(title) + '</h1><p>' + esc(overview) + '</p></div><dl>' +
          '<div><dt>Location</dt><dd>' + esc(job.location || 'Flexible') + '</dd></div>' +
          '<div><dt>Working pattern</dt><dd>' + esc(working || 'Role dependent') + '</dd></div>' +
          '<div><dt>Employment</dt><dd>' + esc(employment || 'Role dependent') + '</dd></div>' +
          '<div><dt>Interview stages</dt><dd>' + esc(jobField(job, 'interviewStages', 'interview_stages') || 'Role dependent') + '</dd></div>' +
        '</dl></div></div>';
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
      if (copy) copy.innerHTML = '<section><h2>Role not found</h2><p>' + esc(error.message || 'This role is no longer available.') + '</p><p><a class="button primary" href="/careers">View open roles</a></p></section>';
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
      if (!file) {
        showFormMessage(form, 'Please attach your CV.', 'err');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showFormMessage(form, 'The CV must be 5MB or smaller.', 'err');
        return;
      }
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
    var query = String((document.getElementById('learningSearchInput') || {}).value || '').toLowerCase();
    var active = document.querySelector('[data-learning-filter].active');
    var filter = active ? active.getAttribute('data-learning-filter') : 'All guides';
    var filtered = posts.filter(function (post) {
      var category = post.category || 'Learning';
      var text = [post.title, post.excerpt, category].join(' ').toLowerCase();
      return (!query || text.indexOf(query) >= 0) &&
        (filter === 'All guides' || category.toLowerCase().indexOf(filter.toLowerCase()) >= 0);
    });
    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state">No published guides match this search.</div>';
      return;
    }
    container.innerHTML = filtered.map(function (post, index) {
      var featured = index === 0 ? ' featured-article' : '';
      return '<article class="' + featured.trim() + '"><span>' + esc(post.category || 'Learning') + '</span><h3>' + esc(post.title || 'Stratex guide') + '</h3><p>' + esc(post.excerpt || '') + '</p><div><span>' + esc(Number(post.view_count || 0).toLocaleString('en-GB')) + ' views</span><a href="/learning-centre/' + encodeURIComponent(post.slug || '') + '">Read guide →</a></div></article>';
    }).join('');
  }

  async function loadPosts() {
    if (!document.getElementById('learningPosts')) return;
    try {
      var response = await fetch(API + '/api/stratex-website/blog?published=true');
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Could not load guides.');
      posts = json.data || [];
    } catch (_) {
      posts = [];
    }
    renderPosts();
    var search = document.getElementById('learningSearchInput');
    if (search) search.addEventListener('input', renderPosts);
    document.querySelectorAll('[data-learning-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('[data-learning-filter]').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
        renderPosts();
      });
    });
  }

  function bodyParagraphs(value) {
    return String(value || '').split(/\n{2,}/).map(function (paragraph) {
      return '<p>' + esc(paragraph).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  async function loadArticleDetail() {
    if (route.key !== '/learning-centre/{article-slug}') return;
    var hero = document.getElementById('articleHero');
    var copy = document.getElementById('articleCopy');
    var actions = document.getElementById('articleActions');
    try {
      var response = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(route.slug));
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Article not found.');
      var post = json.data || {};
      setMeta({ title: (post.title || 'Learning Centre') + ' | Stratex Analytics', description: post.excerpt || 'Read practical football intelligence guidance.' });
      if (hero) {
        hero.innerHTML = '<div class="shell"><a class="back-link" href="/learning-centre">← Back to Learning Centre</a><span>' + esc(post.category || 'Learning') + '</span><h1>' + esc(post.title || 'Learning Centre') + '</h1><p>' + esc(post.excerpt || '') + '</p><div class="article-meta"><span>' + esc(Number(post.view_count || 0).toLocaleString('en-GB')) + ' views</span><span id="articleLikeCount">' + esc(Number(post.like_count || 0).toLocaleString('en-GB')) + ' likes</span></div></div>';
      }
      if (copy) {
        copy.innerHTML = '<p class="lead">' + esc(post.excerpt || '') + '</p>' + bodyParagraphs(post.body || '') + '<div class="article-actions" id="articleActions"></div>';
        actions = document.getElementById('articleActions');
      }
      if (actions) {
        actions.innerHTML = '<button type="button" data-article-like>Like this guide</button><button type="button" data-article-share>Share</button>';
        var like = actions.querySelector('[data-article-like]');
        var share = actions.querySelector('[data-article-share]');
        like.addEventListener('click', async function () {
          like.disabled = true;
          try {
            var likeResponse = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(route.slug) + '/like', { method: 'POST' });
            var likeJson = await likeResponse.json().catch(function () { return {}; });
            if (!likeResponse.ok) throw new Error();
            var count = document.getElementById('articleLikeCount');
            if (count) count.textContent = Number(likeJson.likeCount || 0).toLocaleString('en-GB') + ' likes';
            like.textContent = 'Liked';
          } catch (_) {
            like.disabled = false;
          }
        });
        share.addEventListener('click', async function () {
          try {
            if (navigator.share) await navigator.share({ title: post.title || 'Stratex guide', url: window.location.href });
            else if (navigator.clipboard) {
              await navigator.clipboard.writeText(window.location.href);
              share.textContent = 'Link copied';
            }
          } catch (_) {}
        });
      }
    } catch (error) {
      if (copy) copy.innerHTML = '<section><h2>Article not found</h2><p>' + esc(error.message || 'This guide is no longer available.') + '</p><p><a class="button primary" href="/learning-centre">View learning centre</a></p></section>';
    }
  }

  function trackPage() {
    try {
      var payload = {
        pagePath: window.location.pathname,
        pageTitle: document.title,
        canonicalUrl: window.location.href.split('#')[0],
        referrer: document.referrer || ''
      };
      fetch(API + '/api/stratex-website/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'include'
      }).catch(function () {});
    } catch (_) {}
  }

  async function init() {
    var ready = await ensureContent();
    if (!ready) return;
    bindMenu();
    initCounters();
    bindPublicForms();
    await loadJobs();
    await loadJobDetail();
    bindCareerApplication();
    await loadPosts();
    await loadArticleDetail();
    equaliseActionRows();
    window.addEventListener('resize', function () {
      window.clearTimeout(window.__stratexEqualiseTimer);
      window.__stratexEqualiseTimer = window.setTimeout(equaliseActionRows, 120);
    });
    trackPage();
  }

  document.addEventListener('DOMContentLoaded', init);
}());
