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

// Vídeo de fondo del hero. Es decoración, así que no puede pagarlo la primera
// carga: el poster y el texto se pintan solos y el vídeo entra después, cuando
// la página ya está lista. Se salta en móvil (coste de datos sin beneficio: a
// ese tamaño casi no se ve), si el sistema pide menos animación y si el
// navegador avisa de conexión lenta o ahorro de datos.
(function () {
  var video = document.querySelector('[data-hero-video]');
  if (!video) return;

  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ancho = window.matchMedia('(min-width: 900px)');
  var con = navigator.connection || {};
  var lenta = con.saveData === true ||
              /2g/.test(con.effectiveType || '');

  if (motion.matches || !ancho.matches || lenta) return;

  var cargar = function () {
    var mp4 = video.getAttribute('data-hero-video');
    var webm = video.getAttribute('data-hero-video-webm');
    if (!mp4 && !webm) return;
    if (video.dataset.cargado) return;
    video.dataset.cargado = '1';
    // El webm primero: pesa menos y el navegador que no lo entienda se queda
    // con el mp4 de la siguiente linea.
    [[webm, 'video/webm'], [mp4, 'video/mp4']].forEach(function (par) {
      if (!par[0]) return;
      var source = document.createElement('source');
      source.src = par[0];
      source.type = par[1];
      video.appendChild(source);
    });
    video.load();
    video.addEventListener('playing', function () {
      video.classList.add('is-ready');
    }, { once: true });
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay denegado: queda el poster */ });
  };

  var cuandoHayaHueco = function () {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(cargar, { timeout: 2500 });
    } else {
      setTimeout(cargar, 1200);
    }
  };

  if (document.readyState === 'complete') cuandoHayaHueco();
  else window.addEventListener('load', cuandoHayaHueco, { once: true });
})();

// Cabecera: transparente sobre el hero y blanca a partir de que se baja un
// poco. El umbral son 24px para que el cambio no parpadee con el rebote del
// scroll en macOS e iOS.
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;
  var UMBRAL = 24;
  var ultimo = null;
  var pintar = function () {
    var solida = window.scrollY > UMBRAL;
    if (solida !== ultimo) {
      header.classList.toggle('is-stuck', solida);
      ultimo = solida;
    }
  };
  pintar();
  window.addEventListener('scroll', function () {
    requestAnimationFrame(pintar);
  }, { passive: true });
})();

// Las tarjetas del hero entran una vez al cargar, con la animacion del CSS. Si
// alguien baja y vuelve arriba ya no pasaba nada, asi que la entrada se repite
// cada vez que la portada vuelve a verse. Reiniciar una animacion de CSS exige
// quitarla, forzar el reflujo y devolverla: sin el reflujo el navegador agrupa
// los dos cambios y no reinicia nada.
(function () {
  var cards = document.querySelectorAll(".hero__card");
  if (!cards.length || !("IntersectionObserver" in window)) return;

  var zona = document.querySelector(".hero__visual-wrap") || document.querySelector(".hero");
  if (!zona) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      cards.forEach(function (c) {
        c.style.animation = "none";
        void c.offsetWidth;
        c.style.animation = "";
      });
    });
  }, { threshold: 0.4 });

  io.observe(zona);
})();
