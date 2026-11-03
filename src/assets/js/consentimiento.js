/* Consentimiento de cookies.
   Dos reglas que la AEPD sí mira: la etiqueta de Google no se descarga hasta
   que hay un "sí" explícito (bloqueo previo), y rechazar cuesta exactamente lo
   mismo que aceptar — un clic, mismo sitio, misma jerarquía.
   La decisión se guarda en localStorage, no en una cookie: no hace falta pedir
   permiso para guardar el propio permiso. */
(function () {
  "use strict";

  var CLAVE = "hsg-cookies";
  var banner = document.getElementById("cookies");

  /* localStorage falla en ventanas privadas y con el almacenamiento bloqueado.
     Si no podemos leer ni escribir, tratamos la visita como un "no": sin
     medición y sin banner, porque no podríamos recordar la respuesta. */
  function leer() {
    try { return localStorage.getItem(CLAVE); } catch (e) { return "bloqueado"; }
  }
  function guardar(v) {
    try { localStorage.setItem(CLAVE, v); } catch (e) {}
  }

  function cargarGoogle() {
    if (!window.HSG_GA4 || window.HSG_GA4_CARGADO) return;
    window.HSG_GA4_CARGADO = true;

    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(window.HSG_GA4);
    document.head.appendChild(s);

    gtag("js", new Date());
    gtag("config", window.HSG_GA4);
  }

  function aceptar() {
    guardar("si");
    gtag("consent", "update", {
      ad_storage: "denied",          // no hacemos publicidad: siguen denegadas
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted"
    });
    cargarGoogle();
    ocultar();
  }

  function rechazar() {
    guardar("no");
    ocultar();
  }

  function ocultar() {
    if (banner) banner.hidden = true;
  }

  function mostrar() {
    if (!banner) return;
    banner.hidden = false;
    var b = banner.querySelector("[data-cookies]");
    if (b) b.focus();
  }

  if (banner) {
    banner.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cookies]");
      if (!b) return;
      if (b.dataset.cookies === "si") aceptar(); else rechazar();
    });
  }

  /* Para retirar el consentimiento: enlace del pie y de la política. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('[href="#cookies"], [data-cookies-abrir]');
    if (!a) return;
    e.preventDefault();
    mostrar();
  });

  var decision = leer();
  if (decision === "si") cargarGoogle();
  else if (!decision) mostrar();
  // "no" y "bloqueado": ni medición ni banner.
})();
