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
