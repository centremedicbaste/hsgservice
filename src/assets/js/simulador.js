/* Simulador de cuota para la clínica.
   Amortización francesa: cuota constante. El tipo mensual se deriva de la TAE
   como (1+TAE)^(1/12)-1, no dividiendo entre doce, que es una aproximación que
   se queda corta. Con TAE 0 la cuota es el importe entre los meses. */
(function () {
  "use strict";

  var sim = document.getElementById("sim");
  if (!sim) return;

  var el = {
    importe: document.getElementById("sim-importe"),
    plazo: document.getElementById("sim-plazo"),
    tae: document.getElementById("sim-tae"),
    importeVal: document.getElementById("sim-importe-val"),
    plazoVal: document.getElementById("sim-plazo-val"),
    cuota: document.getElementById("sim-cuota"),
    total: document.getElementById("sim-total"),
    coste: document.getElementById("sim-coste"),
    clinica: document.getElementById("sim-clinica")
  };

  var eur0 = new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0
  });
  var eur2 = new Intl.NumberFormat("es-ES", {
    style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2
  });

  function cuotaMensual(capital, meses, tae) {
    if (tae <= 0) return capital / meses;
    var i = Math.pow(1 + tae / 100, 1 / 12) - 1;
    return (capital * i) / (1 - Math.pow(1 + i, -meses));
  }

  function pintar() {
    var capital = Number(el.importe.value);
    var meses = Number(el.plazo.value);
    var tae = Math.max(0, Math.min(25, Number(el.tae.value) || 0));

    var cuota = cuotaMensual(capital, meses, tae);
    var total = cuota * meses;

    el.importeVal.textContent = eur0.format(capital);
    el.plazoVal.textContent = meses + (meses === 1 ? " mes" : " meses");
    el.cuota.textContent = eur2.format(cuota);
    el.total.textContent = eur2.format(total);
    el.coste.textContent = eur2.format(total - capital);
    // La clínica cobra el importe del tratamiento, no lo que acabe pagando el paciente
    el.clinica.textContent = eur2.format(capital);
  }

  ["input", "change"].forEach(function (ev) {
    el.importe.addEventListener(ev, pintar);
    el.plazo.addEventListener(ev, pintar);
    el.tae.addEventListener(ev, pintar);
  });

  pintar();
})();
