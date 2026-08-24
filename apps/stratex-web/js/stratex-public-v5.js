'use strict';

(function () {
  var API = (function () {
    try {
      return localStorage.getItem('sl_api_url') || 'https://scoutlink-api.vercel.app';
    } catch (_) {
      return 'https://scoutlink-api.vercel.app';
    }
  }()).replace(/\/+$/, '');

  var root = document.getElementById('stratexPublicRoot');
  var posts = [];
  var jobs = [];
  var activeLearningFilter = 'All';
  var COOKIE_PREF_KEY = 'stratex_cookie_preferences_v1';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function path() {
    return (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  }

  function routeInfo() {
    var current = path();
    var career = current.match(/^\/careers\/([^/]+)$/);
    var article = current.match(/^\/learning-centre\/([^/]+)$/);
    if (career) return { path:current, key:'/careers/{job-slug}', slug:decodeURIComponent(career[1]) };
    if (article) return { path:current, key:'/learning-centre/{article-slug}', slug:decodeURIComponent(article[1]) };
    return { path:current, key:current, slug:'' };
  }

  var route = routeInfo();

  function setMeta(page) {
    if (!page) return;
    if (page.title) document.title = page.title;
    var description = document.querySelector('meta[name="description"]');
    if (description && page.description) description.setAttribute('content', page.description);
    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', 'https://www.stratexanalytics.co.uk' + (route.path === '/' ? '/' : route.path));
  }

  async function ensureContent() {
    if (!root) return true;
    if (root.getAttribute('data-server-rendered') === 'true' && root.children.length) return true;

    try {
      var response = await fetch('/assets/stratex-public-v5-pages.json?v=20260824-restructure-v5', { cache:'no-store' });
      var store = await response.json();
      var page = store && store.pages ? store.pages[route.key] : null;

      if (!page) {
        page = store && store.pages ? store.pages['/404'] : null;
      }

      if (!page) throw new Error('Public page bundle is incomplete.');

      root.innerHTML = page.html;
      setMeta(page);
      return true;
    } catch (_) {
      root.innerHTML =
        '<div class="pub-page"><div class="sec"><div class="col"><div class="honest">' +
        '<b>The page could not be loaded.</b><p>Please refresh or <a href="/contact">contact Stratex</a>.</p>' +
        '</div></div></div></div>';
      return false;
    }
  }

  function syncViewportMode() {
    document.querySelectorAll('.pub-page').forEach(function (page) {
      page.classList.toggle('m', window.matchMedia('(max-width: 800px)').matches);
    });
  }

  function bindViewportMode() {
    syncViewportMode();
    var query = window.matchMedia('(max-width: 800px)');
    if (query.addEventListener) query.addEventListener('change', syncViewportMode);
    else if (query.addListener) query.addListener(syncViewportMode);
  }

  function closeMenu(button, panel) {
    if (!button || !panel) return;
    button.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('stratex-menu-open');
  }

  function bindMenu() {
    var button = document.querySelector('[data-stratex-menu-button]');
    var panel = document.querySelector('[data-stratex-menu-panel]');
    if (!button || !panel || button.dataset.bound === '1') return;

    button.dataset.bound = '1';
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.classList.toggle('stratex-menu-open', open);
    });

    panel.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu(button, panel);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu(button, panel);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 800) closeMenu(button, panel);
    });
  }

  function formObject(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = value;
    });
    form.querySelectorAll('input[type="checkbox"][name]').forEach(function (input) {
      data[input.name] = input.checked;
    });
    return data;
  }

  function showFormMessage(form, text, type) {
    var node = form.querySelector('.form-message');
    if (!node) return;
    node.textContent = text || '';
    node.className = 'form-message' + (text ? ' show ' + (type === 'err' ? 'err' : 'ok') : '');
  }

  function setSubmitting(form, active, label) {
    var button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (active) {
      if (!button.dataset.label) button.dataset.label = button.textContent;
      button.disabled = true;
      button.textContent = label || 'Sending…';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.label || button.textContent;
    }
  }

  function bindPublicForms() {
    document.querySelectorAll('[data-stx-form]').forEach(function (form) {
      if (form.dataset.bound === '1') return;
      form.dataset.bound = '1';

      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;

        var type = form.getAttribute('data-stx-form');
        var endpoint = type === 'concern'
          ? '/api/stratex-website/concern'
          : '/api/stratex-website/contact';
        var data = formObject(form);

        data.sourcePage = window.location.pathname;
        data.consentContact = !!form.querySelector('[name="consentContact"]:checked');
        data.consentMarketing = !!form.querySelector('[name="consentMarketing"]:checked');
        data.consentText = type === 'concern'
          ? 'I give Stratex permission to contact me if follow-up is needed.'
          : 'I agree that Stratex Analytics may use these details to respond to this enquiry.';
        data.consentVersion = '2026-08-stratex-public-restructure-v5';

        setSubmitting(form, true, type === 'concern' ? 'Submitting…' : 'Sending…');
        showFormMessage(form, '', '');

        try {
          var response = await fetch(API + endpoint, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify(data),
            credentials:'include'
          });
          var json = await response.json().catch(function () { return {}; });
          if (!response.ok) throw new Error(json.error || 'The form could not be submitted.');

          form.reset();
          showFormMessage(
            form,
            json.message || (type === 'concern'
              ? 'Thanks — we have received your report and will review it.'
              : 'Thanks. Your message has been received.'),
            'ok'
          );
        } catch (error) {
          showFormMessage(form, error.message || 'The form could not be submitted right now.', 'err');
        } finally {
          setSubmitting(form, false);
        }
      });
    });
  }

  function jobField(job, camel, snake) {
    if (!job) return '';
    return job[camel] != null ? job[camel] : (job[snake] != null ? job[snake] : '');
  }

  function renderJobs() {
    var container = document.getElementById('careerJobs');
    if (!container) return;

    if (!jobs.length) {
      container.innerHTML =
        '<div class="rowlist-item"><div><b>No open roles right now.</b>' +
        '<p>Good people still get remembered — email people@stratexanalytics.co.uk.</p></div></div>';
      return;
    }

    container.innerHTML = jobs.map(function (job) {
      var title = jobField(job, 'jobTitle', 'job_title') || 'Open role';
      var employment = jobField(job, 'employmentType', 'employment_type') || '';
      var working = jobField(job, 'workingType', 'working_type') || '';
      var detail = [job.department, working, employment].filter(Boolean).join(' · ');
      var slug = job.slug || job.id || '';

      return '<div class="rowlist-item"><div><b>' + esc(title) + '</b><p>' +
        esc(detail || job.location || 'Stratex') + '</p></div>' +
        '<a class="btn ink sm" href="/careers/' + encodeURIComponent(slug) + '">View role</a></div>';
    }).join('');
  }

  async function loadJobs() {
    if (!document.getElementById('careerJobs')) return;

    try {
      var response = await fetch(API + '/api/careers', { cache:'no-store', credentials:'include' });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error();
      jobs = json.data || json.jobs || [];
    } catch (_) {
      jobs = [];
    }

    renderJobs();
  }

  function paragraphBlock(title, value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    var parts = raw.split(/\n{2,}/).filter(Boolean);
    return '<section class="job-section"><h2>' + esc(title) + '</h2>' +
      parts.map(function (part) {
        var lines = part.split(/\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (lines.length > 1 && lines.every(function (line) { return /^[-•*]/.test(line); })) {
          return '<ul>' + lines.map(function (line) {
            return '<li>' + esc(line.replace(/^[-•*]\s*/, '')) + '</li>';
          }).join('') + '</ul>';
        }
        return '<p>' + esc(part).replace(/\n/g, '<br>') + '</p>';
      }).join('') + '</section>';
  }

  async function loadJobDetail() {
    if (route.key !== '/careers/{job-slug}') return;

    var hero = document.getElementById('careerHero');
    var copy = document.getElementById('careerCopy');
    var form = document.querySelector('[data-career-apply]');
    if (form) form.setAttribute('data-slug', route.slug);

    try {
      var response = await fetch(API + '/api/careers/' + encodeURIComponent(route.slug), {
        cache:'no-store',
        credentials:'include'
      });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Role not found.');

      var job = json.data || json.job || {};
      var title = jobField(job, 'jobTitle', 'job_title') || 'Open role';
      var overview = jobField(job, 'roleOverview', 'role_overview') || '';
      var employment = jobField(job, 'employmentType', 'employment_type') || '';
      var working = jobField(job, 'workingType', 'working_type') || '';

      setMeta({
        title:title + ' | Stratex Analytics',
        description:overview || 'View and apply for this Stratex Analytics role.'
      });

      if (hero) {
        hero.innerHTML =
          '<div class="col"><div class="ehero-grid no-photo"><div>' +
          '<a class="back-link" href="/careers">← Back to careers</a>' +
          '<span class="kicker">Careers · ' + esc(job.department || 'Stratex') + '</span>' +
          '<h1><span class="rule"></span>' + esc(title) + '</h1>' +
          '<p class="sub">' + esc(overview) + '</p>' +
          '<div class="job-meta-strip"><span>' + esc(job.location || 'Flexible') + '</span>' +
          '<span>' + esc(working || 'Role dependent') + '</span>' +
          '<span>' + esc(employment || 'Role dependent') + '</span></div>' +
          '</div></div></div>';
      }

      if (copy) {
        copy.innerHTML =
          paragraphBlock('About Stratex Analytics', jobField(job, 'aboutCompany', 'about_company')) +
          paragraphBlock('Role overview', overview) +
          paragraphBlock('What you will be doing', job.responsibilities || jobField(job, 'whatYouWillBeDoing', 'what_you_will_be_doing')) +
          paragraphBlock('What we are looking for', jobField(job, 'mustHaves', 'must_haves') || job.requirements) +
          paragraphBlock('Nice to have', jobField(job, 'niceToHaves', 'nice_to_haves')) +
          paragraphBlock('Benefits', job.benefits) +
          paragraphBlock('Interview process', jobField(job, 'interviewProcess', 'interview_process'));
      }
    } catch (error) {
      if (copy) {
        copy.innerHTML = '<section><h2>Role not found</h2><p>' +
          esc(error.message || 'This role is no longer available.') +
          '</p><p><a class="btn ink sm" href="/careers">View open roles</a></p></section>';
      }
      if (form) form.hidden = true;
    }
  }

  function bindCareerApplication() {
    var form = document.querySelector('[data-career-apply]');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var fileInput = form.querySelector('[name="cv"]');
      var file = fileInput && fileInput.files ? fileInput.files[0] : null;
      if (!file) return showFormMessage(form, 'Please attach your CV.', 'err');
      if (file.size > 5 * 1024 * 1024) {
        return showFormMessage(form, 'The CV must be 5MB or smaller.', 'err');
      }

      setSubmitting(form, true, 'Submitting…');
      showFormMessage(form, '', '');

      try {
        var response = await fetch(
          API + '/api/careers/' + encodeURIComponent(form.getAttribute('data-slug') || route.slug) + '/apply',
          { method:'POST', body:new FormData(form), credentials:'include' }
        );
        var json = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(json.error || 'The application could not be submitted.');

        form.reset();
        showFormMessage(
          form,
          json.message || 'Application received. Please check your email, including junk, for confirmation.',
          'ok'
        );
      } catch (error) {
        showFormMessage(form, error.message || 'The application could not be submitted. Please try again.', 'err');
      } finally {
        setSubmitting(form, false);
      }
    });
  }

  function safePublicImageUrl(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.charAt(0) === '/') return raw;
    if (/^https:\/\//i.test(raw)) return raw;
    return '';
  }

  function publishedLabel(value) {
    if (!value) return 'Read guide';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Read guide';
    return parsed.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  }

  function postMeta(post) {
    return publishedLabel(post.published_at || post.created_at);
  }

  function featuredPost(post) {
    var image = safePublicImageUrl(post.featured_image_url);
    var style = image
      ? ' style="background-image:url(&quot;' + esc(image) + '&quot;)"'
      : '';
    return '<a href="/learning-centre/' + encodeURIComponent(post.slug || '') +
      '" style="text-decoration:none;color:inherit"><div><div class="feat-photo' +
      (image ? ' has-image' : '') + '"' + style + '></div>' +
      '<span class="feat-tag">' + esc(post.category || 'Learning') + '</span>' +
      '<div class="feat-item"><h3>' + esc(post.title || 'Stratex guide') + '</h3>' +
      '<span class="meta">' + esc(postMeta(post)) + '</span></div></div></a>';
  }

  function listPost(post) {
    return '<a class="art-row" href="/learning-centre/' + encodeURIComponent(post.slug || '') + '">' +
      '<span class="l"><span class="feat-tag">' + esc(post.category || 'Learning') + '</span>' +
      '<h4>' + esc(post.title || 'Stratex guide') + '</h4></span>' +
      '<span class="meta">' + esc(postMeta(post)) + '</span></a>';
  }

  function normaliseFilter(value) {
    return String(value || '').trim().toLowerCase();
  }

  function filteredPosts(filter) {
    if (!filter || normaliseFilter(filter) === 'all') return posts.slice();
    var target = normaliseFilter(filter);
    return posts.filter(function (post) {
      return normaliseFilter(post.category) === target;
    });
  }

  function renderLearningPosts() {
    var container = document.getElementById('learningPosts');
    if (!container) return;

    var selected = filteredPosts(activeLearningFilter);
    if (!selected.length) {
      container.innerHTML =
        '<div class="honest learning-empty"><b>No published guides in this category yet.</b>' +
        '<p>Try another topic or check back later.</p></div>';
      return;
    }

    var first = selected[0];
    var rest = selected.slice(1, 6);
    container.innerHTML =
      featuredPost(first) +
      '<div>' + (rest.length
        ? rest.map(listPost).join('')
        : '<div class="honest"><b>That is the only published guide here for now.</b></div>') +
      '</div>';
  }

  function renderHomepagePosts() {
    var container = document.getElementById('homepageLearningPosts');
    if (!container) return;

    var latest = posts.slice(0, 3);
    if (!latest.length) {
      var section = container.closest('.sec');
      if (section) section.remove();
      return;
    }

    container.innerHTML =
      featuredPost(latest[0]) +
      '<div>' + latest.slice(1).map(listPost).join('') + '</div>';
  }

  function bindLearningFilters() {
    document.querySelectorAll('[data-learning-filter]').forEach(function (button) {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', function () {
        activeLearningFilter = button.getAttribute('data-learning-filter') || 'All';
        document.querySelectorAll('[data-learning-filter]').forEach(function (item) {
          item.classList.toggle('on', item === button);
        });
        renderLearningPosts();
      });
    });
  }

  async function loadPosts() {
    if (!document.getElementById('learningPosts') && !document.getElementById('homepageLearningPosts')) return;

    try {
      var response = await fetch(API + '/api/stratex-website/blog?published=true', {
        cache:'no-store',
        credentials:'include'
      });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error();
      posts = (json.data || []).filter(function (post) {
        return String(post.status || 'published').toLowerCase() === 'published' &&
          String(post.slug || '').trim() && String(post.title || '').trim();
      }).sort(function (a, b) {
        return new Date(b.published_at || b.created_at || 0).getTime() -
          new Date(a.published_at || a.created_at || 0).getTime();
      });
    } catch (_) {
      posts = [];
    }

    renderLearningPosts();
    renderHomepagePosts();
  }

  function bodyParagraphs(value) {
    return String(value || '').split(/\n{2,}/).filter(Boolean).map(function (paragraph) {
      return '<p class="body">' + esc(paragraph).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  async function loadArticleDetail() {
    if (route.key !== '/learning-centre/{article-slug}') return;

    var hero = document.getElementById('articleHero');
    var copy = document.getElementById('articleCopy');

    try {
      var response = await fetch(API + '/api/stratex-website/blog/' + encodeURIComponent(route.slug), {
        cache:'no-store',
        credentials:'include'
      });
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(json.error || 'Article not found.');

      var post = json.data || {};
      setMeta({
        title:(function () { var base = post.seo_title || post.title || 'Learning Centre'; return /Stratex Analytics/i.test(base) ? base : base + ' | Stratex Analytics'; }()),
        description:post.meta_description || post.excerpt || 'Read practical football intelligence guidance.'
      });

      if (hero) {
        hero.innerHTML =
          '<div class="col"><div class="ehero-grid no-photo"><div>' +
          '<a class="back-link" href="/learning-centre">← Back to Learning Centre</a>' +
          '<span class="kicker">' + esc(post.category || 'Learning') + '</span>' +
          '<h1><span class="rule"></span>' + esc(post.title || 'Learning Centre') + '</h1>' +
          '<p class="sub">' + esc(post.excerpt || '') + '</p>' +
          '<div class="article-meta"><span>' +
          esc(Number(post.view_count || 0).toLocaleString('en-GB')) + ' views</span>' +
          '<span id="articleLikeCount">' +
          esc(Number(post.like_count || 0).toLocaleString('en-GB')) + ' likes</span></div>' +
          '</div></div></div>';
      }

      if (copy) {
        copy.innerHTML =
          '<p class="standfirst">' + esc(post.excerpt || '') + '</p>' +
          bodyParagraphs(post.body || '') +
          '<div class="article-actions"><button type="button" data-article-like>Like this guide</button>' +
          '<button type="button" data-article-share>Share</button></div>';

        var like = copy.querySelector('[data-article-like]');
        var share = copy.querySelector('[data-article-share]');

        if (like) {
          like.addEventListener('click', async function () {
            like.disabled = true;
            try {
              var r = await fetch(API + '/api/stratex-website/blog/' +
                encodeURIComponent(route.slug) + '/like', { method:'POST', credentials:'include' });
              var j = await r.json().catch(function () { return {}; });
              if (!r.ok) throw new Error();

              var count = document.getElementById('articleLikeCount');
              if (count) count.textContent = Number(j.likeCount || 0).toLocaleString('en-GB') + ' likes';
              like.textContent = 'Liked';
            } catch (_) {
              like.disabled = false;
            }
          });
        }

        if (share) {
          share.addEventListener('click', async function () {
            try {
              if (navigator.share) {
                await navigator.share({ title:post.title || 'Stratex guide', url:window.location.href });
              } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                share.textContent = 'Link copied';
              }
            } catch (_) {}
          });
        }
      }
    } catch (error) {
      if (copy) {
        copy.innerHTML = '<section><h2>Article not found</h2><p>' +
          esc(error.message || 'This guide is no longer available.') + '</p></section>';
      }
    }
  }

  function dateLabel(value) {
    if (!value) return '';
    var d = new Date(String(value).length === 10 ? value + 'T12:00:00Z' : value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB', {
      weekday:'short', day:'numeric', month:'short', year:'numeric', timeZone:'UTC'
    }).toUpperCase();
  }

  function timeLabel(value) {
    var match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return '';
    var hour = Number(match[1]);
    return (hour % 12 || 12) + ':' + match[2] + ' ' + (hour >= 12 ? 'PM' : 'AM');
  }

  async function hydrateShowcase() {
    if (!document.querySelector('[data-showcase-fixture]') && route.path !== '/showcase-event') return;

    try {
      var response = await fetch(
        API + '/api/stratex-publishing/showcase-events?_=' + Date.now(),
        { cache:'no-store', credentials:'include' }
      );
      var json = await response.json().catch(function () { return {}; });
      if (!response.ok) return;

      var events = json.data || [];
      var event = events.find(function (row) { return row.featured; }) || events[0];
      if (!event) return;

      var eventDate = event.eventDate || event.event_date;
      var arrival = event.playerArrivalTime || event.player_arrival_time || event.startTime || event.start_time;
      var venueName = event.venueName || event.venue_name || 'Venue TBC';
      var minAge = event.playerMinAge || event.player_min_age || 12;
      var maxAge = event.playerMaxAge || event.player_max_age || 16;

      document.querySelectorAll('[data-showcase-fixture]').forEach(function (fixture) {
        fixture.textContent =
          'SCOUTLINK SHOWCASE EVENT · ' + dateLabel(eventDate) +
          (arrival ? ' · ARRIVAL ' + timeLabel(arrival) : '') +
          ' · ' + String(venueName).toUpperCase() +
          ' · AGES ' + minAge + '–' + maxAge;
      });

      var open = event.professionalRegistrationOpen;
      if (open === undefined) open = event.professional_registration_open;
      var remaining = event.remainingProfessionalPlaces;
      if (remaining === undefined) remaining = event.remaining_professional_places;

      if (open === false || Number(remaining || 0) <= 0) {
        document.querySelectorAll('a[href="/showcase-event/coach-scout-registration"]').forEach(function (link) {
          link.href = '/showcase-event/coach-scout-registration/sold-out';
        });
      }
    } catch (_) {}
  }

  function readCookiePreferences() {
    try {
      return JSON.parse(window.localStorage.getItem(COOKIE_PREF_KEY) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function writeCookiePreferences(preferences) {
    var payload = Object.assign({
      essential:true,
      savedAt:new Date().toISOString(),
      consentVersion:'2026-08-stratex-public-restructure-v5'
    }, preferences || {});

    window.localStorage.setItem(COOKIE_PREF_KEY, JSON.stringify(payload));
    try {
      document.dispatchEvent(new CustomEvent('stratexCookiePreferences', { detail:payload }));
    } catch (_) {}
    return payload;
  }

  function setCookieToggle(button, active) {
    button.classList.toggle('on', !!active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  }

  function cookiePreferencesFromDom() {
    var preferences = { essential:true };
    document.querySelectorAll('[data-cookie-toggle]').forEach(function (button) {
      preferences[button.getAttribute('data-cookie-toggle')] =
        button.getAttribute('aria-pressed') === 'true';
    });
    return preferences;
  }

  function showCookieMessage(text) {
    var message = document.querySelector('[data-cookie-message]');
    if (!message) return;
    message.textContent = text;
    message.className = 'form-message show ok';
  }

  function bindCookieToggles() {
    var stored = readCookiePreferences();

    document.querySelectorAll('[data-cookie-toggle]').forEach(function (button) {
      var key = button.getAttribute('data-cookie-toggle');
      if (Object.prototype.hasOwnProperty.call(stored, key)) {
        setCookieToggle(button, !!stored[key]);
      }
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', function () {
        setCookieToggle(button, button.getAttribute('aria-pressed') !== 'true');
      });
    });

    document.querySelectorAll('[data-cookie-save]').forEach(function (button) {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', function () {
        writeCookiePreferences(cookiePreferencesFromDom());
        showCookieMessage('Your cookie preferences have been saved.');
      });
    });

    document.querySelectorAll('[data-cookie-reject]').forEach(function (button) {
      if (button.dataset.bound === '1') return;
      button.dataset.bound = '1';
      button.addEventListener('click', function () {
        var preferences = { essential:true, functional:false, analytics:false, marketing:false };
        document.querySelectorAll('[data-cookie-toggle]').forEach(function (toggle) {
          setCookieToggle(toggle, !!preferences[toggle.getAttribute('data-cookie-toggle')]);
        });
        writeCookiePreferences(preferences);
        showCookieMessage('Optional cookies have been rejected.');
      });
    });
  }

  function trackPage() {
    try {
      fetch(API + '/api/stratex-website/activity', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          pagePath:window.location.pathname,
          pageTitle:document.title,
          canonicalUrl:window.location.href.split('#')[0],
          referrer:document.referrer || ''
        }),
        credentials:'include',
        keepalive:true
      }).catch(function () {});
    } catch (_) {}
  }

  async function init() {
    var ready = await ensureContent();
    if (!ready) return;

    bindViewportMode();
    bindMenu();
    bindPublicForms();
    bindCareerApplication();
    bindLearningFilters();
    bindCookieToggles();

    await Promise.all([
      loadJobs(),
      loadPosts(),
      hydrateShowcase()
    ]);

    await loadJobDetail();
    await loadArticleDetail();
    syncViewportMode();
    trackPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
}());
