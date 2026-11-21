/* MEG · interacciones mínimas: menú móvil, año del pie y envío del formulario */
(function () {
  "use strict";

  // Menú en el móvil
  var boton = document.querySelector(".boton-menu");
  var menu = document.getElementById("menu");
  if (boton && menu) {
    boton.addEventListener("click", function () {
      var abierto = menu.classList.toggle("abierto");
      boton.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("abierto");
        boton.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Año actual en el pie
  document.querySelectorAll("[data-anio]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Formulario de presupuesto (Web3Forms)
  document.querySelectorAll("form[data-presupuesto]").forEach(function (form) {
    var aviso = form.querySelector(".aviso-form");
    var enviar = form.querySelector("button[type=submit]");

    function mostrar(tipo, texto) {
      aviso.className = "aviso-form " + tipo;
      aviso.textContent = texto;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var clave = form.querySelector("[name=access_key]").value;
      if (!clave || clave.indexOf("PON-AQUI") === 0) {
        mostrar("error", "El formulario aún no está activado. Llámanos al 653 204 609 o escríbenos por WhatsApp.");
        return;
      }

      enviar.disabled = true;
      var textoBoton = enviar.textContent;
      enviar.textContent = "Enviando…";

      fetch(form.action, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(form)
      })
        .then(function (r) { return r.json(); })
        .then(function (datos) {
          if (datos.success) {
            form.reset();
            mostrar("ok", "¡Gracias! Hemos recibido tu mensaje y te contestaremos lo antes posible.");
          } else {
            throw new Error(datos.message || "Error");
          }
        })
        .catch(function () {
          mostrar("error", "No se ha podido enviar. Llámanos al 653 204 609 o escríbenos por WhatsApp.");
        })
        .then(function () {
          enviar.disabled = false;
          enviar.textContent = textoBoton;
        });
    });
  });
})();

/* Estado del taller en tiempo real (hora de Madrid) */
(function () {
  "use strict";
  var marcas = document.querySelectorAll("[data-estado]");
  if (!marcas.length || !window.Intl) return;

  // Horario: lunes a viernes, 9:30-14:00 y 17:30-20:00
  var TRAMOS = [[570, 840], [1050, 1200]];
  var DIAS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

  function ahoraMadrid() {
    var partes = {};
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date()).forEach(function (p) { partes[p.type] = p.value; });
    return { dia: DIAS[partes.weekday], min: (parseInt(partes.hour, 10) % 24) * 60 + parseInt(partes.minute, 10) };
  }

  function hhmm(m) { return Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2); }

  function calcular() {
    var a = ahoraMadrid();
    var laborable = a.dia >= 1 && a.dia <= 5;
    if (laborable) {
      for (var i = 0; i < TRAMOS.length; i++) {
        if (a.min >= TRAMOS[i][0] && a.min < TRAMOS[i][1]) {
          return { abierto: true, texto: "<strong>Abierto ahora</strong> · hasta las " + hhmm(TRAMOS[i][1]) };
        }
      }
      for (i = 0; i < TRAMOS.length; i++) {
        if (a.min < TRAMOS[i][0]) return { abierto: false, texto: "<strong>Cerrado</strong> · abrimos a las " + hhmm(TRAMOS[i][0]) };
      }
    }
    var manana = a.dia >= 1 && a.dia <= 4 ? "mañana" : "el lunes";
    return { abierto: false, texto: "<strong>Cerrado</strong> · abrimos " + manana + " a las 9:30" };
  }

  function pintar() {
    var e = calcular();
    marcas.forEach(function (el) {
      el.classList.toggle("abierto", e.abierto);
      el.classList.toggle("cerrado", !e.abierto);
      var t = el.querySelector(".estado__texto");
      if (t) t.innerHTML = e.texto;
    });
  }
  pintar();
  setInterval(pintar, 60000);
})();
