/**
 * split-parallax.js
 * ─────────────────
 * Scroll-direction parallax for split section images.
 * RULE: scroll DOWN → images zoom out, scroll UP → images zoom in.
 * Scale range is 1.0–1.12 so the image ALWAYS fills its container.
 * Container stays fixed — only the image inside changes.
 */

(function () {
  'use strict';

  var SCALE_MAX = 1.12;   // zoomed in (scroll up / bottom of viewport)
  var SCALE_MIN = 1.00;   // zoomed out (scroll down / top of viewport)
  var RANGE = SCALE_MAX - SCALE_MIN;

  var targets = document.querySelectorAll('.split .split__image img');
  if (!targets.length) return;

  var ticking = false;

  function update() {
    var vh = window.innerHeight;

    for (var i = 0; i < targets.length; i++) {
      var rect = targets[i].getBoundingClientRect();
      var centre = rect.top + rect.height * 0.5;

      // ratio: 0 at viewport bottom, 1 at viewport top
      var ratio = 1 - (centre / vh);
      ratio = Math.min(Math.max(ratio, 0), 1);

      // Bottom → max scale, Top → min scale
      var scale = SCALE_MAX - RANGE * ratio;

      targets[i].style.transform = 'scale(' + scale.toFixed(4) + ')';
    }

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
})();
