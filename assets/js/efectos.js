/* ==========================================================================
   MEG · Efectos visuales
   - Portada: red eléctrica animada que reacciona al ratón y al dedo
   - Tarjetas: brillo que sigue al cursor e inclinación suave
   - Apariciones al hacer scroll y sombra en la cabecera
   Respeta "reducir movimiento" del sistema y se pausa cuando no se ve.
   ========================================================================== */
(function () {
  "use strict";

  var reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------------------------------------------------------------------
     1. Red eléctrica de la portada
     --------------------------------------------------------------------- */
  function redElectrica(contenedor) {
    var canvas = document.createElement("canvas");
    canvas.className = "portada__red";
    canvas.setAttribute("aria-hidden", "true");
    contenedor.insertBefore(canvas, contenedor.firstChild);
    var ctx = canvas.getContext("2d");

    var COLOR_LINEA = "255, 255, 255";
    var COLOR_CHISPA = "255, 159, 182"; // rosa del granate, el mismo de la portada
    var ancho = 0, alto = 0, dpr = 1;
    var nodos = [], pulsos = [], rayos = [], ondas = [];
    var distMax = 140;
    var puntero = { x: -9999, y: -9999, activo: false, ultimoRayo: 0 };
    var visible = true, idAnim = null, ultimoTiempo = 0, proximoRayoLibre = 0;

    function medir() {
      var r = contenedor.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = r.width; alto = r.height;
      canvas.width = Math.round(ancho * dpr);
      canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      distMax = ancho < 700 ? 110 : 150;
      var objetivo = Math.round(Math.min(90, Math.max(28, (ancho * alto) / 11000)));
      while (nodos.length < objetivo) nodos.push(nuevoNodo());
      if (nodos.length > objetivo) nodos.length = objetivo;
      nodos.forEach(function (n) {
        if (n.x > ancho) n.x = Math.random() * ancho;
        if (n.y > alto) n.y = Math.random() * alto;
      });
    }

    function nuevoNodo() {
      var a = Math.random() * Math.PI * 2, v = 0.08 + Math.random() * 0.18;
      return {
        x: Math.random() * (ancho || 1), y: Math.random() * (alto || 1),
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        r: 1 + Math.random() * 1.6, brillo: 0
      };
    }

    // Rayo quebrado entre dos puntos (desplazamiento del punto medio)
    function trazarRayo(x1, y1, x2, y2) {
      var puntos = [[x1, y1], [x2, y2]];
      var desvio = Math.hypot(x2 - x1, y2 - y1) * 0.22;
      for (var paso = 0; paso < 4; paso++) {
        var nuevos = [puntos[0]];
        for (var i = 0; i < puntos.length - 1; i++) {
          var a = puntos[i], b = puntos[i + 1];
          var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          var nx = -(b[1] - a[1]), ny = b[0] - a[0];
          var len = Math.hypot(nx, ny) || 1;
          var d = (Math.random() - 0.5) * desvio;
          nuevos.push([mx + (nx / len) * d, my + (ny / len) * d], b);
        }
        puntos = nuevos;
        desvio *= 0.5;
      }
      return puntos;
    }

    function lanzarRayo(x1, y1, x2, y2, fuerza) {
      rayos.push({ puntos: trazarRayo(x1, y1, x2, y2), vida: 1, fuerza: fuerza || 1 });
    }

    function masCercanos(x, y, cuantos, radio) {
      return nodos
        .map(function (n) { return { n: n, d: Math.hypot(n.x - x, n.y - y) }; })
        .filter(function (o) { return o.d < radio; })
        .sort(function (a, b) { return a.d - b.d; })
        .slice(0, cuantos);
    }

    function descarga(x, y) {
      ondas.push({ x: x, y: y, r: 0, vida: 1 });
      masCercanos(x, y, 5, 320).forEach(function (o) {
        lanzarRayo(x, y, o.n.x, o.n.y, 1.4);
        o.n.brillo = 1;
        var ang = Math.atan2(o.n.y - y, o.n.x - x);
        o.n.vx += Math.cos(ang) * 1.6;
        o.n.vy += Math.sin(ang) * 1.6;
      });
    }

    function paso(t) {
      var dt = Math.min(48, t - (ultimoTiempo || t)) / 16.67;
      ultimoTiempo = t;
      ctx.clearRect(0, 0, ancho, alto);

      // Mover nodos
      for (var i = 0; i < nodos.length; i++) {
        var n = nodos[i];
        if (puntero.activo) {
          var dx = n.x - puntero.x, dy = n.y - puntero.y, d = Math.hypot(dx, dy);
          if (d < 120 && d > 0.1) {
            // El cursor aparta un poco los nodos, como un campo eléctrico
            var f = (1 - d / 120) * 0.35;
            n.vx += (dx / d) * f * dt;
            n.vy += (dy / d) * f * dt;
            n.brillo = Math.max(n.brillo, 1 - d / 120);
          }
        }
        // Rozamiento hacia la velocidad de crucero
        var vel = Math.hypot(n.vx, n.vy);
        if (vel > 0.3) { n.vx *= 0.96; n.vy *= 0.96; }
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0 || n.x > ancho) { n.vx *= -1; n.x = Math.max(0, Math.min(ancho, n.x)); }
        if (n.y < 0 || n.y > alto) { n.vy *= -1; n.y = Math.max(0, Math.min(alto, n.y)); }
        n.brillo *= 0.95;
      }

      // Conexiones
      ctx.lineWidth = 1;
      for (i = 0; i < nodos.length; i++) {
        for (var j = i + 1; j < nodos.length; j++) {
          var a = nodos[i], b = nodos[j];
          var dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < distMax) {
            var alfa = (1 - dist / distMax) * 0.22 + Math.max(a.brillo, b.brillo) * 0.35;
            ctx.strokeStyle = "rgba(" + COLOR_LINEA + "," + alfa.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            // De vez en cuando, un impulso de corriente recorre la conexión
            if (pulsos.length < 14 && Math.random() < 0.0009 * dt) {
              pulsos.push({ a: a, b: b, p: 0, v: 0.012 + Math.random() * 0.02 });
            }
          }
        }
      }

      // Líneas del cursor a los nodos cercanos
      if (puntero.activo) {
        masCercanos(puntero.x, puntero.y, 4, 180).forEach(function (o) {
          var al = (1 - o.d / 180) * 0.6;
          ctx.strokeStyle = "rgba(" + COLOR_CHISPA + "," + al.toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(puntero.x, puntero.y); ctx.lineTo(o.n.x, o.n.y); ctx.stroke();
        });
        var g = ctx.createRadialGradient(puntero.x, puntero.y, 0, puntero.x, puntero.y, 90);
        g.addColorStop(0, "rgba(" + COLOR_CHISPA + ",0.18)");
        g.addColorStop(1, "rgba(" + COLOR_CHISPA + ",0)");
        ctx.fillStyle = g;
        ctx.fillRect(puntero.x - 90, puntero.y - 90, 180, 180);
      }

      // Nodos
      for (i = 0; i < nodos.length; i++) {
        n = nodos[i];
        ctx.fillStyle = n.brillo > 0.05
          ? "rgba(" + COLOR_CHISPA + "," + (0.5 + n.brillo * 0.5).toFixed(3) + ")"
          : "rgba(" + COLOR_LINEA + ",0.55)";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + n.brillo * 2, 0, Math.PI * 2); ctx.fill();
      }

      // Impulsos de corriente
      for (i = pulsos.length - 1; i >= 0; i--) {
        var p = pulsos[i];
        p.p += p.v * dt;
        if (p.p >= 1) { p.b.brillo = 0.8; pulsos.splice(i, 1); continue; }
        var px = p.a.x + (p.b.x - p.a.x) * p.p, py = p.a.y + (p.b.y - p.a.y) * p.p;
        ctx.fillStyle = "rgba(" + COLOR_CHISPA + ",0.95)";
        ctx.shadowColor = "rgba(" + COLOR_CHISPA + ",0.9)";
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Rayos
      if (puntero.activo && t - puntero.ultimoRayo > 900 && Math.random() < 0.04) {
        var c = masCercanos(puntero.x, puntero.y, 1, 200)[0];
        if (c) { lanzarRayo(puntero.x, puntero.y, c.n.x, c.n.y, 0.8); c.n.brillo = 1; puntero.ultimoRayo = t; }
      }
      if (!puntero.activo && t > proximoRayoLibre) {
        // Sin cursor, salta una chispa entre dos nodos cada pocos segundos
        var o1 = nodos[Math.floor(Math.random() * nodos.length)];
        var vecino = masCercanos(o1.x, o1.y, 3, distMax * 1.4)[2];
        if (vecino) { lanzarRayo(o1.x, o1.y, vecino.n.x, vecino.n.y, 0.7); vecino.n.brillo = 1; o1.brillo = 1; }
        proximoRayoLibre = t + 2200 + Math.random() * 2600;
      }
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (i = rayos.length - 1; i >= 0; i--) {
        var ry = rayos[i];
        ry.vida -= 0.06 * dt;
        if (ry.vida <= 0) { rayos.splice(i, 1); continue; }
        ctx.beginPath();
        ry.puntos.forEach(function (pt, k) { k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); });
        ctx.strokeStyle = "rgba(" + COLOR_CHISPA + "," + (ry.vida * 0.5).toFixed(3) + ")";
        ctx.lineWidth = 4 * ry.fuerza; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255," + ry.vida.toFixed(3) + ")";
        ctx.lineWidth = 1.2 * ry.fuerza; ctx.stroke();
      }
      ctx.lineWidth = 1;

      // Ondas de la descarga al hacer clic
      for (i = ondas.length - 1; i >= 0; i--) {
        var w = ondas[i];
        w.r += 6 * dt; w.vida -= 0.03 * dt;
        if (w.vida <= 0) { ondas.splice(i, 1); continue; }
        ctx.strokeStyle = "rgba(" + COLOR_CHISPA + "," + (w.vida * 0.6).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }

      if (visible) idAnim = requestAnimationFrame(paso);
      else idAnim = null;
    }

    function arrancar() {
      if (!idAnim && visible && !document.hidden) {
        ultimoTiempo = 0;
        idAnim = requestAnimationFrame(paso);
      }
    }

    function posicion(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    medir();

    if (reducir) {
      // Sin animación: una imagen fija de la red
      paso(0); visible = false;
      window.addEventListener("resize", function () { medir(); visible = true; paso(0); visible = false; });
      return;
    }

    contenedor.addEventListener("pointermove", function (e) {
      var p = posicion(e);
      puntero.x = p.x; puntero.y = p.y; puntero.activo = true;
    }, { passive: true });
    contenedor.addEventListener("pointerleave", function () { puntero.activo = false; });
    contenedor.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button")) return;
      var p = posicion(e);
      descarga(p.x, p.y);
      if (e.pointerType !== "mouse") {
        // En el móvil el dedo no "flota": la chispa se queda un momento
        puntero.x = p.x; puntero.y = p.y; puntero.activo = true;
        setTimeout(function () { puntero.activo = false; }, 900);
      }
    });

    var tResize;
    window.addEventListener("resize", function () {
      clearTimeout(tResize);
      tResize = setTimeout(medir, 150);
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        visible = entradas[0].isIntersecting;
        arrancar();
      }).observe(contenedor);
    }
    document.addEventListener("visibilitychange", arrancar);
    arrancar();
  }

  /* ---------------------------------------------------------------------
     2. Tarjetas: brillo que sigue al cursor + inclinación suave
     --------------------------------------------------------------------- */
  function brilloTarjetas() {
    if (!punteroFino) return;
    document.querySelectorAll(".servicio-tarjeta, .tarjeta, .canal").forEach(function (el) {
      el.classList.add("con-brillo");
      var inclinar = !reducir && el.classList.contains("servicio-tarjeta");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty("--mx", x + "px");
        el.style.setProperty("--my", y + "px");
        if (inclinar) {
          var rx = ((y / r.height) - 0.5) * -6, ry = ((x / r.width) - 0.5) * 6;
          el.style.transform = "perspective(800px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
        }
      });
      el.addEventListener("pointerleave", function () {
        if (inclinar) el.style.transform = "";
      });
    });
  }

  /* ---------------------------------------------------------------------
     3. Apariciones al hacer scroll
     --------------------------------------------------------------------- */
  function apariciones() {
    if (reducir || !("IntersectionObserver" in window)) return;
    var selector = ".seccion__cabeza, .servicio-tarjeta, .tarjeta, .ventaja, .trabajo, .faq details, .cta, .bloque__titulo, .items, .zona-mapa, .pie__grande";
    var elementos = document.querySelectorAll(selector);
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          obs.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    elementos.forEach(function (el) {
      // Escalonado entre hermanos para que entren uno detrás de otro
      var hermanos = Array.prototype.filter.call(el.parentNode.children, function (h) { return h.matches(selector); });
      var i = hermanos.indexOf(el);
      el.style.setProperty("--retraso", Math.min(i, 8) * 70 + "ms");
      // Lo que ya está en pantalla al cargar no se esconde
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) return;
      el.classList.add("revelar");
      obs.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
     4. Sombra en la cabecera al bajar
     --------------------------------------------------------------------- */
  function cabecera() {
    var cab = document.querySelector(".cabecera");
    if (!cab) return;
    var activo = false;
    function revisar() {
      var debe = window.scrollY > 10;
      if (debe !== activo) { activo = debe; cab.classList.toggle("con-sombra", debe); }
    }
    window.addEventListener("scroll", revisar, { passive: true });
    revisar();
  }


  /* ---------------------------------------------------------------------
     5. Animaciones ligadas al scroll
        - Servicios: el cuadro se abre y se enciende circuito a circuito
        - Frase de "Por qué MEG" que se ilumina palabra a palabra
        - Línea de corriente del proceso
        - Paralaje suave en las fotos de trabajos
     --------------------------------------------------------------------- */
  function limitar(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function animacionesScroll() {
    if (reducir) return;
    var tareas = [];

    // 5a. Cuadro eléctrico
    var hist = document.querySelector(".historia");
    if (hist) {
      hist.classList.add("animada");
      var escena = hist.querySelector(".escena");
      var pasos = hist.querySelectorAll(".paso[data-i]");
      var mgs = hist.querySelectorAll(".mg");
      var cables = hist.querySelectorAll(".cable");
      var corrientes = hist.querySelectorAll(".cable__corriente");
      var nodosSvg = hist.querySelectorAll(".nodo");
      var iga = hist.querySelector(".iga"), dif = hist.querySelector(".dif");
      var contadores = hist.querySelectorAll("[data-circuitos]");
      var minis = hist.querySelectorAll(".mini");
      var contenedorPasos = hist.querySelector(".historia__pasos");
      var anterior = -1;
      var mqMovil = window.matchMedia("(max-width: 899px)");
      tareas.push(function (vh) {
        var r = contenedorPasos.getBoundingClientRect();
        // En móvil no hay puerta: los circuitos se encienden antes, al asomar cada imagen
        var movil = mqMovil.matches, ref = movil ? 0.8 : 0.62;
        // La puerta se abre al entrar la sección
        var puerta = limitar((vh * 0.62 - r.top) / (vh * 0.3));
        escena.style.setProperty("--puerta", puerta.toFixed(3));
        var general = movil ? r.top < vh * ref : puerta > 0.95;
        iga.classList.toggle("on", general);
        dif.classList.toggle("on", general);
        var encendidos = 0;
        pasos.forEach(function (art, i) {
          var a = art.getBoundingClientRect();
          var t = limitar((vh * ref - a.top) / (a.height * 0.55));
          if (!general) t = 0;
          cables[i].style.setProperty("--trazo", (1 - t).toFixed(3));
          var on = t > 0.12, lleno = t > 0.97;
          mgs[i].classList.toggle("on", on);
          if (minis[i]) minis[i].classList.toggle("on", on);
          corrientes[i].classList.toggle("on", lleno);
          nodosSvg[i].classList.toggle("on", lleno);
          if (on) encendidos++;
          art.classList.toggle("on", on);
          art.classList.toggle("activo", a.top < vh * 0.62 && a.bottom > vh * 0.3);
        });
        var extra = hist.querySelector(".paso--extra");
        if (extra) { var e = extra.getBoundingClientRect(); extra.classList.toggle("activo", e.top < vh * 0.7); }
        if (encendidos !== anterior) {
          anterior = encendidos;
          contadores.forEach(function (c) { c.textContent = encendidos; });
          escena.style.setProperty("--carga", (encendidos / 4).toFixed(2));
          hist.classList.toggle("en-servicio", encendidos > 0);
          var estado = hist.querySelector(".cuadro__estado");
          if (estado) estado.textContent = encendidos === 4 ? "TODO EN SERVICIO" : encendidos > 0 ? "EN SERVICIO" : general ? "LISTO" : "SIN TENSIÓN";
        }
      });
    }

    // 5b. Frase palabra a palabra
    document.querySelectorAll("[data-frase]").forEach(function (frase) {
      var palabras = frase.textContent.trim().split(/\s+/);
      frase.setAttribute("aria-label", frase.textContent.trim());
      frase.innerHTML = palabras.map(function (p) { return '<span class="pal" aria-hidden="true">' + p + "</span>"; }).join(" ");
      var spans = frase.querySelectorAll(".pal");
      var ultimo = -1;
      tareas.push(function (vh) {
        var r = frase.getBoundingClientRect();
        var p = limitar((vh * 0.88 - r.top) / (vh * 0.55));
        var n = Math.round(p * spans.length);
        if (n === ultimo) return;
        ultimo = n;
        spans.forEach(function (s, i) {
          s.classList.toggle("luz", i < n);
          s.classList.toggle("ultima", i === n - 1 && n < spans.length);
        });
      });
    });

    // 5c. Línea del proceso
    document.querySelectorAll(".proceso").forEach(function (lista) {
      var items = lista.querySelectorAll("li");
      tareas.push(function (vh) {
        var r = lista.getBoundingClientRect();
        var horizontal = window.innerWidth >= 900;
        var p = horizontal
          ? limitar((vh * 0.85 - r.top) / (vh * 0.45))
          : limitar((vh * 0.7 - r.top) / r.height);
        lista.style.setProperty("--avance", p.toFixed(3));
        items.forEach(function (li, i) {
          var umbral = items.length > 1 ? i / (items.length - 1) : 0;
          li.classList.toggle("encendido", p >= umbral - 0.02);
        });
      });
    });

    // 5d. Paralaje de las fotos
    document.querySelectorAll(".trabajo").forEach(function (fig) {
      var foto = fig.querySelector(".trabajo__foto");
      tareas.push(function (vh) {
        var r = fig.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        foto.style.setProperty("--paralaje", (p * -40).toFixed(1) + "px");
      });
    });

    // 5e. Instalaciones: índice lateral que se rellena al bajar
    document.querySelectorAll(".con-indice").forEach(function (caja) {
      var lista = caja.querySelector(".indice ol");
      var enlaces = caja.querySelectorAll("[data-indice]");
      var bloques = [];
      enlaces.forEach(function (a) { bloques.push(document.getElementById(a.getAttribute("data-indice"))); });
      tareas.push(function (vh) {
        var r = caja.getBoundingClientRect();
        var linea = vh * 0.4;
        if (lista) lista.style.setProperty("--avance", limitar((linea - r.top) / r.height).toFixed(3));
        bloques.forEach(function (b, i) {
          if (!b) return;
          var br = b.getBoundingClientRect();
          enlaces[i].classList.toggle("activo", br.top < linea && br.bottom > linea);
          enlaces[i].classList.toggle("pasado", br.top < linea);
        });
      });
    });

    // 5f. Listas que se marcan una a una
    if ("IntersectionObserver" in window) {
      var obsItems = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("visto"); obsItems.unobserve(e.target); }
        });
      }, { threshold: 0.25 });
      document.querySelectorAll(".items").forEach(function (ul) {
        ul.querySelectorAll("li").forEach(function (li, i) { li.style.setProperty("--i", i); });
        ul.classList.add("animable");
        obsItems.observe(ul);
      });
    }

    // 5g. Placas solares: el camino de la energía
    document.querySelectorAll(".flujo").forEach(function (sec) {
      sec.classList.add("animada");
      var escena = sec.querySelector(".flujo__escena");
      var pasos = sec.querySelectorAll(".fpaso");
      var lineas = sec.querySelectorAll(".flujo__linea");
      var corrientes = sec.querySelectorAll(".flujo__corriente");
      var mq = window.matchMedia("(max-width: 899px)");
      tareas.push(function (vh) {
        var t = [];
        if (mq.matches) {
          // En móvil la escena no se queda fija: avanza mientras cruza la pantalla
          var r = escena.getBoundingClientRect();
          var p = limitar((vh * 0.92 - r.top) / (vh * 0.7));
          for (var k = 0; k < 4; k++) t.push(limitar(p * 4 - k));
          pasos.forEach(function (art) { art.classList.remove("activo"); });
        } else {
          pasos.forEach(function (art, i) {
            var a = art.getBoundingClientRect();
            t.push(limitar((vh * 0.65 - a.top) / (a.height * 0.5)));
            art.classList.toggle("activo", a.top < vh * 0.65 && a.bottom > vh * 0.3);
          });
        }
        sec.style.setProperty("--sol", (0.35 + t[0] * 0.65).toFixed(3));
        sec.style.setProperty("--rayos", t[0] > 0.2 ? 1 : 0);
        sec.style.setProperty("--bateria", t[2].toFixed(3));
        lineas.forEach(function (l, i) {
          var tp = t[+l.getAttribute("data-paso")] || 0;
          l.style.setProperty("--trazo", (1 - tp).toFixed(3));
          corrientes[i].classList.toggle("on", tp > 0.97);
        });
        sec.classList.toggle("produce", t[0] > 0.5);
        sec.classList.toggle("casa", t[1] > 0.6);
        sec.classList.toggle("red", t[3] > 0.97);
      });
    });

    // 5i. Instalaciones: el edificio se enciende planta a planta
    document.querySelectorAll(".obra").forEach(function (sec) {
      sec.classList.add("animada");
      var escena = sec.querySelector(".flujo__escena");
      var pasos = sec.querySelectorAll(".fpaso");
      var lineas = sec.querySelectorAll(".obra__linea");
      var corrientes = sec.querySelectorAll(".obra__corriente");
      var plantas = sec.querySelectorAll(".obra__planta");
      var n = pasos.length;
      var mq = window.matchMedia("(max-width: 899px)");
      tareas.push(function (vh) {
        var t = [];
        if (mq.matches) {
          var r = escena.getBoundingClientRect();
          var p = limitar((vh * 0.92 - r.top) / (vh * 0.75));
          for (var k = 0; k < n; k++) t.push(limitar(p * n - k));
          pasos.forEach(function (art) { art.classList.remove("activo"); });
        } else {
          pasos.forEach(function (art) {
            var a = art.getBoundingClientRect();
            t.push(limitar((vh * 0.65 - a.top) / (a.height * 0.5)));
            art.classList.toggle("activo", a.top < vh * 0.65 && a.bottom > vh * 0.3);
          });
        }
        for (var i = 0; i < n; i++) sec.classList.toggle("f" + i, t[i] > 0.6);
        lineas.forEach(function (l, i) {
          var tp = t[+l.getAttribute("data-paso")] || 0;
          l.style.setProperty("--trazo", (1 - tp).toFixed(3));
          corrientes[i].classList.toggle("on", tp > 0.97);
        });
        plantas.forEach(function (g) { g.classList.toggle("on", t[+g.getAttribute("data-paso")] > 0.85); });
      });
    });

    // 5h. Puntos de carga: el cargador se llena al bajar
    document.querySelectorAll(".carga").forEach(function (sec) {
      sec.classList.add("animada");
      var pct = sec.querySelector("[data-carga-pct]");
      var txt = sec.querySelector("[data-carga-txt]");
      var cpasos = sec.querySelectorAll(".cpaso");
      var texto = sec.querySelector(".carga__texto");
      var ultimo = -1;
      tareas.push(function (vh) {
        var r = texto.getBoundingClientRect();
        var p = limitar((vh * 0.7 - r.top) / Math.max(1, r.height - vh * 0.35));
        var n = Math.round(p * 100);
        sec.style.setProperty("--carga", p.toFixed(3));
        cpasos.forEach(function (c, i) {
          var a = c.getBoundingClientRect();
          c.classList.toggle("activo", a.top < vh * 0.7);
        });
        if (n === ultimo) return;
        ultimo = n;
        pct.textContent = n;
        sec.classList.toggle("llena", n >= 100);
        txt.textContent = n >= 100 ? "Carga completa" : n > 0 ? "Cargando…" : "Conecta el coche";
      });
    });

    if (!tareas.length) return;
    var pendiente = false;
    function actualizar() {
      pendiente = false;
      var vh = window.innerHeight;
      for (var i = 0; i < tareas.length; i++) tareas[i](vh);
    }
    function pedir() { if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); } }
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    actualizar();
  }

  // 6. Instalaciones: cuadro interactivo (general, diferenciales, térmicos y reloj)
  function cuadroVivo() {
    document.querySelectorAll("[data-cuadro-vivo]").forEach(function (caja) {
      var aparatos = {};
      caja.querySelectorAll("[data-cv]").forEach(function (el) {
        aparatos[el.getAttribute("data-cv")] = {
          el: el, boton: el.querySelector(".cv__ranura"), padre: el.getAttribute("data-padre"),
          kw: parseFloat(el.getAttribute("data-kw") || "0"), nombre: el.querySelector(".cv__nombre").textContent, arriba: true
        };
      });
      var reloj = caja.querySelector("[data-cv-reloj]");
      var hora = caja.querySelector("[data-cv-hora]");
      var modoTxt = caja.querySelector("[data-cv-modo]");
      var estado = caja.querySelector("[data-cv-estado]");
      var kwTxt = caja.querySelector("[data-cv-kw]");
      var rearmar = caja.querySelector("[data-cv-rearmar]");
      var modos = ["AUTO", "ENCENDIDO", "APAGADO"], modo = 0;

      function tension(id) {
        var a = aparatos[id];
        if (!a || !a.arriba) return false;
        return a.padre ? tension(a.padre) : true;
      }
      function relojDaPaso() {
        if (modo === 1) return true;
        if (modo === 2) return false;
        var h = new Date().getHours();
        return h >= 20 || h < 7;
      }
      function pintar() {
        var kw = 0, cortados = [];
        Object.keys(aparatos).forEach(function (id) {
          var a = aparatos[id], on = tension(id);
          a.el.classList.toggle("on", on);
          a.boton.setAttribute("aria-pressed", a.arriba ? "true" : "false");
          var salida = caja.querySelector('[data-salida="' + id + '"]');
          if (salida) {
            var luz = on && (id !== "c6" || relojDaPaso());
            salida.classList.toggle("on", luz);
            if (luz) kw += a.kw;
            if (!on) cortados.push(salida.textContent);
          }
        });
        caja.querySelectorAll("[data-peine]").forEach(function (p) { p.classList.toggle("on", tension(p.getAttribute("data-peine"))); });
        var general = tension("iga");
        if (reloj) reloj.classList.toggle("on", general);
        kwTxt.textContent = kw.toFixed(1).replace(".", ",");
        caja.classList.toggle("sin-luz", !general);
        caja.classList.toggle("aviso", general && cortados.length > 0);
        estado.textContent = !general ? "Sin luz: el general está bajado"
          : cortados.length ? "Sin tensión: " + cortados.join(", ")
          : "Todo en servicio";
        var todoArriba = Object.keys(aparatos).every(function (id) { return aparatos[id].arriba; });
        rearmar.hidden = todoArriba;
      }
      function sacudir(el) {
        el.classList.remove("disparo"); void el.offsetWidth; el.classList.add("disparo");
      }
      Object.keys(aparatos).forEach(function (id) {
        var a = aparatos[id];
        a.boton.addEventListener("click", function () { a.arriba = !a.arriba; pintar(); });
      });
      caja.querySelectorAll("[data-cv-test]").forEach(function (b) {
        b.addEventListener("click", function () {
          var a = aparatos[b.getAttribute("data-cv-test")];
          if (!tension(b.getAttribute("data-cv-test"))) return;
          a.arriba = false; sacudir(a.el); pintar();
        });
      });
      caja.querySelector("[data-cv-modo-btn]").addEventListener("click", function () {
        modo = (modo + 1) % modos.length; modoTxt.textContent = modos[modo]; pintar();
      });
      rearmar.addEventListener("click", function () {
        Object.keys(aparatos).forEach(function (id) { aparatos[id].arriba = true; }); pintar();
      });
      function tic() {
        var d = new Date();
        hora.textContent = ("0" + d.getHours()).slice(-2) + (d.getSeconds() % 2 ? " " : ":") + ("0" + d.getMinutes()).slice(-2);
        if (d.getSeconds() === 0) pintar();
      }
      tic(); pintar();
      setInterval(tic, 1000);
    });
  }

  if (document.createElement("canvas").getContext) {
    document.querySelectorAll(".portada, .cabecera-pagina").forEach(redElectrica);
  }
  brilloTarjetas();
  apariciones();
  cabecera();
  animacionesScroll();
  cuadroVivo();
})();
