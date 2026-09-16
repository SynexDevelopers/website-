/* Shared site behavior: navigation, reveal animation, and secure form submission. */

document.addEventListener('DOMContentLoaded', function () {
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    var onScroll = function () {
      navbar.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.setAttribute('aria-controls', 'navLinks');
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && links.classList.contains('is-open')) {
        links.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (element) { observer.observe(element); });
  } else {
    revealEls.forEach(function (element) { element.classList.add('is-visible'); });
  }

  function getFormError(form) {
    var error = form.querySelector('.form-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'form-error';
      error.setAttribute('role', 'alert');
      form.querySelector('.form-fields').appendChild(error);
    }
    return error;
  }

  function validateForm(form) {
    var valid = true;
    var firstInvalid = null;
    form.querySelectorAll('[required]').forEach(function (input) {
      var field = input.closest('.field');
      var value = input.value.trim();
      var fieldValid = value.length > 0;
      if (fieldValid && input.type === 'email') fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (fieldValid && input.type === 'tel') fieldValid = /^[0-9+\-\s()]{7,}$/.test(value);
      if (field) field.classList.toggle('has-error', !fieldValid);
      input.setAttribute('aria-invalid', fieldValid ? 'false' : 'true');
      var errorText = field && field.querySelector('.field-error');
      if (errorText) {
        errorText.id = input.id + '-error';
        input.setAttribute('aria-describedby', errorText.id);
      }
      if (!fieldValid) {
        valid = false;
        if (!firstInvalid) firstInvalid = input;
      }
    });
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
  }

  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var error = getFormError(form);
      error.textContent = '';
      if (!validateForm(form) || form.dataset.submitting === 'true') return;

      form.dataset.submitting = 'true';
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Sending...';

      try {
        var response = await fetch('/api/' + form.dataset.formType, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        var result = await response.json();
        if (!response.ok) throw new Error(result.error || 'We could not send your request.');

        form.reset();
        form.classList.add('is-submitted');
        var success = form.querySelector('.form-success');
        if (success) {
          var successText = success.querySelector('p');
          if (successText) successText.textContent = result.message;
          success.classList.add('is-visible');
          success.setAttribute('tabindex', '-1');
          success.focus();
        }
      } catch (requestError) {
        error.textContent = requestError.message || 'We could not send your request right now. Please try again later.';
      } finally {
        form.dataset.submitting = 'false';
        button.disabled = false;
        button.textContent = button.dataset.originalText;
      }
    });

    form.querySelectorAll('[required]').forEach(function (input) {
      var clearError = function () {
        var field = input.closest('.field');
        if (field) field.classList.remove('has-error');
        input.setAttribute('aria-invalid', 'false');
      };
      input.addEventListener('input', clearError);
      input.addEventListener('change', clearError);
    });
  });
});
