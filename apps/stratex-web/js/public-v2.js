(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setMenu(open) {
    document.body.classList.toggle('pub-menu-open', !!open);
    var btn = qs('[data-public-menu-open]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function visibleStep(form) {
    return qs('.pub-step.active', form) || qs('.pub-step', form);
  }

  function validateStep(step) {
    var fields = qsa('input, select, textarea', step).filter(function (el) {
      return !el.disabled && el.offsetParent !== null && el.hasAttribute('required');
    });
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      if (el.type === 'checkbox' && !el.checked) {
        el.focus();
        return false;
      }
      if (el.type !== 'checkbox' && !String(el.value || '').trim()) {
        el.focus();
        return false;
      }
      if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
        el.focus();
        return false;
      }
    }
    return true;
  }

  function setStep(form, index) {
    var steps = qsa('.pub-step', form);
    var progress = qsa('.pub-progress-step', form);
    if (!steps.length) return;
    index = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach(function (step, i) {
      step.classList.toggle('active', i === index);
      step.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
    progress.forEach(function (step, i) {
      step.classList.toggle('active', i === index);
      step.classList.toggle('done', i < index);
    });
    form.setAttribute('data-current-step', String(index));
    var heading = qs('h2, h1, h3', steps[index]);
    if (heading) heading.setAttribute('tabindex', '-1');
    if (heading && window.matchMedia('(max-width: 900px)').matches) heading.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-public-menu-open]')) {
      setMenu(true);
      return;
    }
    if (event.target.closest('[data-public-menu-close]')) {
      setMenu(false);
      return;
    }
    if (event.target.matches('.pub-mobile-panel') || event.target.closest('.pub-mobile-links a')) {
      setMenu(false);
    }
    var next = event.target.closest('[data-step-next]');
    if (next) {
      var form = next.closest('[data-stepper]');
      if (!form) return;
      var step = visibleStep(form);
      if (step && !validateStep(step)) return;
      setStep(form, Number(form.getAttribute('data-current-step') || '0') + 1);
      event.preventDefault();
    }
    var prev = event.target.closest('[data-step-prev]');
    if (prev) {
      var prevForm = prev.closest('[data-stepper]');
      if (!prevForm) return;
      setStep(prevForm, Number(prevForm.getAttribute('data-current-step') || '0') - 1);
      event.preventDefault();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) setMenu(false);
  });

  document.addEventListener('DOMContentLoaded', function () {
    qsa('[data-stepper]').forEach(function (form) { setStep(form, 0); });
  });
})();
