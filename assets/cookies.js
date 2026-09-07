/* Aviso de cookies/almacenamiento (RGPD + ePrivacy). Este sitio no pone
   cookies propias ni de seguimiento: el aviso es informativo y se muestra
   una sola vez. La preferencia se guarda en localStorage (almacenamiento
   tecnico, exento de consentimiento). */
(function () {
  var KEY = "t2p-aviso-cookies";
  try {
    if (localStorage.getItem(KEY)) return;
  } catch (e) { return; } // sin almacenamiento no podemos recordar el cierre: no insistimos

  var bar = document.createElement("div");
  bar.className = "cookie-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Aviso sobre cookies");
  bar.innerHTML =
    "<p>Este sitio <strong>no usa cookies propias ni de seguimiento</strong>. " +
    "Empleamos almacenamiento local técnico y cargamos recursos de terceros " +
    "(Google Fonts, miniaturas de YouTube) que pueden ver tu dirección IP. " +
    '<a href="terminos.html#cookies">Más información</a>.</p>' +
    "<button type=\"button\">Entendido</button>";
  bar.querySelector("button").addEventListener("click", function () {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch (e) { /* ok */ }
    bar.remove();
  });
  document.body.appendChild(bar);
})();
