/* HSG — interacciones de interfaz. Sin dependencias. */
(function () {
  "use strict";

  /* Menú móvil ------------------------------------------------------------ */
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* Acordeón (FAQ y módulos) ---------------------------------------------- */
  document.querySelectorAll(".accordion__head").forEach(function (head) {
    head.addEventListener("click", function () {
      var item = head.closest(".accordion__item");
      if (!item) return;
      var isOpen = item.classList.contains("is-open");
      var group = item.closest(".accordion");
      if (group) {
        group.querySelectorAll(".accordion__item.is-open").forEach(function (o) {
          o.classList.remove("is-open");
          var h = o.querySelector(".accordion__head");
          if (h) h.setAttribute("aria-expanded", "false");
        });
      }
      if (!isOpen) {
        item.classList.add("is-open");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* Contadores ------------------------------------------------------------ */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        var target = parseInt(el.getAttribute("data-count"), 10) || 0;
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduce) { el.textContent = target + suffix; return; }
        var start = null, dur = 1400;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* Aparición suave ------------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io2.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (r) { io2.observe(r); });
  }
})();
