/* Renderiza la portada desde data/videos.js, data/noticias.js y data/sitio.js.
   Sin filtros ni estado: héroe, noticias de redacción, 9 vídeos recientes y
   los Shorts con más visitas. */
(function () {
  var D = window.T2P_DATA;
  if (!D) return;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var watch = function (id) { return "https://www.youtube.com/watch?v=" + id; };
  var thumb = function (id, q) { return "https://i.ytimg.com/vi/" + id + "/" + (q || "hqdefault") + ".jpg"; };

  // "1,8 K visualizaciones" -> 1800 (solo para ordenar los Shorts)
  var viewCount = function (s) {
    if (!s) return 0;
    var m = String(s).replace(/ /g, " ").match(/([\d.,]+)\s*(K|M)?/i);
    if (!m) return 0;
    var n = parseFloat(m[1].replace(",", "."));
    if (/k/i.test(m[2] || "")) n *= 1000;
    if (/m/i.test(m[2] || "")) n *= 1000000;
    return n;
  };

  /* ── textos e imágenes editables desde el panel (data/sitio.js) ── */
  var S = (window.T2P_SITIO || {}).textos || {};
  var SI = (window.T2P_SITIO || {}).imagenes || {};
  var setText = function (id, value) {
    if (value && $(id)) $(id).textContent = value;
  };
  setText("site-lema", S.lema);
  setText("site-sub-redaccion", S.sub_redaccion);
  setText("videos-title", S.titulo_videos);
  setText("site-lateral-texto", S.lateral_texto);
  setText("site-footer", S.footer);
  if (SI.lateral && $("site-lateral-figura")) {
    $("site-lateral-figura").hidden = false;
    $("site-lateral-imagen").src = SI.lateral;
  }

  /* ── héroe: el último vídeo ── */
  var v0 = D.videos[0];
  if (v0) {
    $("hero").innerHTML =
      '<a class="card hero-card" href="' + watch(v0.id) + '" target="_blank" rel="noopener">' +
      '<div class="thumb"><img src="' + thumb(v0.id, "maxresdefault") + '" alt="" loading="eager" ' +
      "onerror=\"this.onerror=null;this.src='" + thumb(v0.id) + "'\">" +
      (v0.duration ? '<span class="dur">' + esc(v0.duration) + "</span>" : "") + "</div>" +
      '<div class="body"><span class="chip ' + esc(v0.category) + '">' + esc(v0.category) + "</span>" +
      "<h1>" + esc(v0.title) + "</h1>" +
      '<div class="meta">' + esc(v0.when || "") + "</div></div></a>";
  }

  /* ── noticias de redacción ── */
  var arts = (window.T2P_NOTICIAS || {}).articles || [];
  $("news-grid").innerHTML = arts.length ? arts.map(function (a) {
    var thumbHtml = a.image
      ? '<div class="thumb"><img src="' + esc(a.image) + '" alt="" loading="lazy"></div>'
      : '<div class="thumb ph">Talk2Play</div>';
    return '<a class="card news" href="noticia.html?id=' + encodeURIComponent(a.id) + '">' +
      thumbHtml +
      '<div class="body"><span class="chip Noticias">Noticias</span>' +
      ' <span class="byline">Redacción</span>' +
      "<h3>" + esc(a.title) + "</h3>" +
      (a.summary ? '<p class="sum">' + esc(a.summary) + "</p>" : "") +
      '<div class="meta">' + esc(a.date) + " · " + esc(a.author) + "</div></div></a>";
  }).join("") : '<p class="empty">La redacción todavía no ha publicado noticias.</p>';

  /* ── 9 vídeos recientes (el resto vive en YouTube) ── */
  $("grid").innerHTML = D.videos.slice(1, 10).map(function (v) {
    return '<a class="card" href="' + watch(v.id) + '" target="_blank" rel="noopener">' +
      '<div class="thumb"><img src="' + thumb(v.id) + '" alt="" loading="lazy">' +
      (v.duration ? '<span class="dur">' + esc(v.duration) + "</span>" : "") + "</div>" +
      '<div class="body"><span class="chip ' + esc(v.category) + '">' + esc(v.category) + "</span>" +
      "<h3>" + esc(v.title) + "</h3>" +
      '<div class="meta">' + esc(v.when || "") + "</div></div></a>";
  }).join("");

  /* ── Shorts con más visitas (aquí los números sí suman) ── */
  var topShorts = D.shorts.slice().sort(function (a, b) {
    return viewCount(b.views) - viewCount(a.views);
  }).slice(0, 4);
  $("shorts-strip").innerHTML = topShorts.map(function (s) {
    return '<a class="short-card" href="https://www.youtube.com/shorts/' + s.id + '" target="_blank" rel="noopener">' +
      '<img src="' + thumb(s.id) + '" alt="" loading="lazy">' +
      '<div class="ov">' + esc(s.title.replace(/#\S+/g, "").trim() || s.title) +
      "<small>" + esc(s.views || "") + "</small></div></a>";
  }).join("");

  $("updated").textContent = "Contenido actualizado: " + D.updated;
})();
