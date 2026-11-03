/* Solicitud de alta — formulario por pasos con subida de documentos.
   Cada archivo se sube en cuanto se selecciona: así no chocamos con el límite
   de tamaño de petición de n8n y el socio ve el progreso real, no una barra
   que se mueve al final. */
(function () {
  "use strict";

  var form = document.getElementById("alta");
  if (!form) return;

  var API = form.dataset.endpoint.replace(/\/$/, "");
  var MAX = 10 * 1024 * 1024;
  var TIPOS = ["application/pdf", "image/jpeg", "image/png"];

  var ETIQUETAS = {
    "alta-seguridad-social": ["Alta de autónomo en la Seguridad Social", ""],
    "alta-hacienda": ["Alta en Hacienda", "Modelo 036 o 037"],
    "dni-titular": ["DNI del titular", "Por las dos caras"],
    "dni-administrador": ["DNI del administrador", "Por las dos caras"],
    "tarjeta-colegial": ["Tarjeta del Colegio Oficial de Odontólogos", ""],
    "certificado-cuenta": ["Justificante del número de cuenta", "Certificado de titularidad del banco"],
    "recibo-autonomo": ["Último recibo de autónomo", ""],
    "irpf": ["IRPF del último ejercicio", ""],
    "escrituras-constitucion": ["Escrituras de constitución", ""],
    "escrituras-poderes": ["Escrituras de poderes", "Solo si las hubiera"],
    "cif-empresa": ["CIF de la empresa", ""],
    "impuesto-sociedades": ["Impuesto de Sociedades del último ejercicio", ""]
  };

  var paso = 1;
  var solicitudId = null;
  var subidos = {};
  var msg = document.getElementById("alta-msg");

  /* ---------------------------------------------------------------- pasos */

  function mostrar(n) {
    paso = n;
    form.querySelectorAll(".alta__step").forEach(function (f) {
      f.classList.toggle("is-active", Number(f.dataset.step) === n);
    });
    document.querySelectorAll(".steps__item").forEach(function (li) {
      var s = Number(li.dataset.step);
      li.classList.toggle("is-current", s === n);
      li.classList.toggle("is-done", s < n);
    });
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  }

  function valido(n) {
    var campos = form.querySelector('.alta__step[data-step="' + n + '"]')
      .querySelectorAll("input[required], select[required]");
    var ok = true;
    campos.forEach(function (c) {
      if (c.type === "radio") {
        if (!form.querySelector('input[name="' + c.name + '"]:checked')) ok = false;
        return;
      }
      if (!c.checkValidity()) {
        c.classList.add("is-error");
        if (ok) c.focus();
        ok = false;
      } else {
        c.classList.remove("is-error");
      }
    });
    return ok;
  }

  function aviso(texto, tipo) {
    msg.textContent = texto;
    msg.className = "alta__msg" + (tipo ? " alta__msg--" + tipo : "");
    msg.hidden = !texto;
  }

  /* ------------------------------------------------------------ documentos */

  function pintarDocs(tipo) {
    var cont = document.getElementById("docs-" + tipo);
    var otro = document.getElementById("docs-" + (tipo === "autonomo" ? "sociedad" : "autonomo"));
    otro.hidden = true;
    cont.hidden = false;

    cont.querySelectorAll(".doc").forEach(function (d) {
      if (d.dataset.listo) return;
      d.dataset.listo = "1";
      var clave = d.dataset.doc;
      var e = ETIQUETAS[clave] || [clave, ""];
      var req = d.dataset.req === "1";
      var id = "f-" + tipo + "-" + clave;
      d.innerHTML =
        '<div class="doc__info">' +
          '<label class="doc__name" for="' + id + '">' + e[0] +
            (req ? "" : ' <span class="doc__opt">(opcional)</span>') + "</label>" +
          (e[1] ? '<p class="doc__hint">' + e[1] + "</p>" : "") +
        "</div>" +
        '<div class="doc__action">' +
          '<input type="file" id="' + id + '" class="doc__input" ' +
            'accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">' +
          '<label class="btn btn--ghost btn--sm" for="' + id + '">Seleccionar</label>' +
          '<span class="doc__state" aria-live="polite"></span>' +
        "</div>";

      d.querySelector(".doc__input").addEventListener("change", function (ev) {
        var file = ev.target.files && ev.target.files[0];
        if (file) subir(d, clave, file);
      });
    });
  }

  function estado(d, texto, clase) {
    var s = d.querySelector(".doc__state");
    s.textContent = texto;
    s.className = "doc__state" + (clase ? " doc__state--" + clase : "");
  }

  function subir(d, clave, file) {
    if (TIPOS.indexOf(file.type) === -1) {
      estado(d, "Formato no admitido. Usa PDF, JPG o PNG.", "no");
      return;
    }
    if (file.size > MAX) {
      estado(d, "Supera los 10 MB. Comprímelo o escanéalo con menos calidad.", "no");
      return;
    }

    estado(d, "Enviando…", "wait");
    d.classList.add("is-busy");

    var fd = new FormData();
    fd.append("id", solicitudId);
    fd.append("documento", clave);
    fd.append("archivo", file, file.name);

    fetch(API + "/hsg-alta-documento", { method: "POST", body: fd })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () {
        subidos[clave] = file.name;
        estado(d, "Enviado: " + file.name, "ok");
        d.classList.remove("is-busy");
        d.classList.add("is-done");
        aviso("", "");
      })
      .catch(function () {
        d.classList.remove("is-busy");
        estado(d, "No se pudo enviar. Inténtalo otra vez.", "no");
      });
  }

  function faltan() {
    var tipo = form.querySelector('input[name="tipo"]:checked').value;
    var pendientes = [];
    document.getElementById("docs-" + tipo)
      .querySelectorAll('.doc[data-req="1"]').forEach(function (d) {
        if (!subidos[d.dataset.doc]) pendientes.push(d);
      });
    return pendientes;
  }

  /* -------------------------------------------------------------- eventos */

  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    var prev = e.target.closest("[data-prev]");
    if (prev) { aviso(""); mostrar(paso - 1); return; }
    if (!next) return;

    if (!valido(paso)) {
      aviso("Revisa los campos marcados antes de continuar.", "no");
      return;
    }
    aviso("");

    if (paso === 2) {
      next.disabled = true;
      crearSolicitud(function (ok) {
        next.disabled = false;
        if (!ok) return;
        pintarDocs(form.querySelector('input[name="tipo"]:checked').value);
        mostrar(3);
      });
      return;
    }
    mostrar(paso + 1);
  });

  function crearSolicitud(cb) {
    if (solicitudId) return cb(true);
    aviso("Creando tu solicitud…", "wait");

    var datos = {};
    ["tipo", "titular", "clinica", "nif", "localidad", "email", "telefono"].forEach(function (k) {
      var el = form.elements[k];
      datos[k] = el.length && el[0].type === "radio"
        ? form.querySelector('input[name="tipo"]:checked').value
        : el.value.trim();
    });

    fetch(API + "/hsg-alta-crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (res) {
        if (!res || !res.id) throw new Error("sin id");
        solicitudId = res.id;
        aviso("");
        cb(true);
      })
      .catch(function () {
        aviso("No hemos podido iniciar la solicitud. Revisa tu conexión e inténtalo de nuevo.", "no");
        cb(false);
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!valido(3)) {
      aviso("Tienes que aceptar la política de privacidad para enviar la solicitud.", "no");
      return;
    }

    var pendientes = faltan();
    if (pendientes.length) {
      aviso("Faltan " + pendientes.length + " documento" + (pendientes.length > 1 ? "s" : "") +
            " obligatorio" + (pendientes.length > 1 ? "s" : "") + ".", "no");
      pendientes[0].scrollIntoView({ block: "center", behavior: "smooth" });
      pendientes[0].classList.add("is-missing");
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    aviso("Enviando tu solicitud…", "wait");

    fetch(API + "/hsg-alta-finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: solicitudId })
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json().catch(function () { return {}; }); })
      .then(function () {
        document.getElementById("alta-ref").textContent = solicitudId;
        document.getElementById("steps").hidden = true;
        form.hidden = true;
        document.getElementById("alta-done").hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function () {
        btn.disabled = false;
        aviso("No hemos podido cerrar la solicitud. Tus documentos sí se han enviado; " +
              "escríbenos a info@hsgservice.es indicando tu referencia: " + solicitudId, "no");
      });
  });

  form.addEventListener("input", function (e) {
    if (e.target.classList) e.target.classList.remove("is-error");
  });
})();
