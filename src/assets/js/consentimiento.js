/* Banner de cookies.

   Fichero IDÉNTICO en las tres webs. Si cambias algo, cámbialo en los tres.
   Solo guarda la elección y avisa a measurement.js, que es quien decide qué
   se carga: aquí no hay ni una etiqueta.

   Dos reglas que la AEPD sí mira: nada de Google se descarga hasta que hay
   un «sí» explícito —eso lo garantiza measurement.js— y rechazar cuesta
   exactamente lo mismo que aceptar, un clic, en el mismo sitio y con la
   misma jerarquía visual.

   Se guarda en cookies y no en localStorage porque measurement.js tiene que
   leer la elección de forma síncrona en el <head>, antes de cargar nada.

   El marcado espera estos identificadores, iguales en las tres webs:
     cookie-banner            el aviso
     cookie-accept            aceptar todo
     cookie-reject            rechazar todo
     cookie-settings          abrir el panel de categorías
     cookie-settings-panel    el panel
     cookie-settings-close    cerrarlo sin guardar
     cookie-analytics         casilla de analítica
     cookie-marketing         casilla de publicidad
     cookie-save              guardar las casillas
   Y para volver a abrirlo: cualquier enlace a #cookies o con
   data-cookies-abrir, que es lo que llevan el pie y la política. */
(function () {
  'use strict';

  var DIAS = 365;

  function guardar(nombre, valor) {
    var caduca = new Date(Date.now() + DIAS * 864e5).toUTCString();
    document.cookie = nombre + '=' + valor + '; expires=' + caduca +
      '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }

  function cookie(nombre) {
    var par = document.cookie.split(';').map(function (s) { return s.trim(); })
      .find(function (s) { return s.indexOf(nombre + '=') === 0; });
    return par ? par.slice(nombre.length + 1) : '';
  }

  var banner = document.getElementById('cookie-banner');
  var panel = document.getElementById('cookie-settings-panel');

  /* Cada web maqueta el panel a su manera —Dental lo centra con flex— así
     que el marcado dice con qué display se abre y aquí no se asume ninguno. */
  function ver(el, visible) {
    if (!el) return;
    el.style.display = visible ? (el.dataset.display || 'block') : 'none';
  }

  /* ¿Ya respondió? Se aceptan los dos formatos antiguos para no volver a
     preguntar a quien ya eligió: el JSON que guardaba Dental y el 'si'/'no'
     que guardaba HSG en localStorage. */
  function respondido() {
    if (cookie('cookie_analytics')) return true;
    if (cookie('cookie_consent')) return true;
    try { return !!localStorage.getItem('hsg-cookies'); } catch (error) { return false; }
  }

  function aplicar(analytics, marketing, marca) {
    guardar('cookie_consent', marca);
    guardar('cookie_necessary', 'true');
    guardar('cookie_analytics', analytics ? 'true' : 'false');
    guardar('cookie_marketing', marketing ? 'true' : 'false');
    ver(banner, false);
    ver(panel, false);
    if (window.actualizarConsentimiento) window.actualizarConsentimiento();
  }

  function clic(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function casilla(id) {
    var el = document.getElementById(id);
    return el ? el.checked : false;
  }

  clic('cookie-accept', function () { aplicar(true, true, 'accepted'); });
  clic('cookie-reject', function () { aplicar(false, false, 'rejected'); });
  clic('cookie-save', function () {
    aplicar(casilla('cookie-analytics'), casilla('cookie-marketing'), 'custom');
  });

  function abrirPanel() {
    ver(banner, false);
    ver(panel, true);
    // Las casillas arrancan con lo que haya elegido antes
    var a = document.getElementById('cookie-analytics');
    var m = document.getElementById('cookie-marketing');
    if (a) a.checked = cookie('cookie_analytics') === 'true';
    if (m) m.checked = cookie('cookie_marketing') === 'true';
  }

  clic('cookie-settings', abrirPanel);

  // Clic en el fondo oscuro, fuera del panel: lo mismo que cerrar
  if (panel) {
    panel.addEventListener('click', function (evento) {
      if (evento.target === panel) cerrarPanel();
    });
  }

  function cerrarPanel() {
    ver(panel, false);
    // Si todavía no había respondido, el aviso tiene que volver: si no,
    // se queda navegando sin haber elegido y sin forma de elegir.
    if (!respondido()) ver(banner, true);
  }

  clic('cookie-settings-close', cerrarPanel);

  // Retirar o cambiar el consentimiento desde el pie y desde la política
  document.addEventListener('click', function (evento) {
    var a = evento.target.closest &&
      evento.target.closest('[href="#cookies"], [data-cookies-abrir]');
    if (!a) return;
    evento.preventDefault();
    abrirPanel();
  });

  if (!respondido()) ver(banner, true);
})();
