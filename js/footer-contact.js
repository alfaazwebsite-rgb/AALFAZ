/**
 * footer-contact.js
 * Toggles the slide-down contact icon tray in the footer.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('footer-contact-toggle');
    var tray   = document.getElementById('footer-contact-tray');
    if (!toggle || !tray) return;

    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = tray.classList.contains('is-open');
      tray.classList.toggle('is-open', !isOpen);
      toggle.setAttribute('aria-expanded', String(!isOpen));
    });
  });
})();
