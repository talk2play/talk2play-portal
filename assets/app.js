/* Renderiza el portal desde window.T2P_DATA (data/videos.js) */
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

  // "1,8 K visualizaciones" -> 1800 ; "25 visualizaciones" -> 25
  var viewCount = function (s) {
    if (!s) return 0;
    var m = String(s).replace(/ /g, " ").match(/([\d.,]+)\s*(K|M)?/i);
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
  setText("site-lateral-texto", S.lateral_texto);
  setText("site-footer", S.footer);
  if (SI.lateral && $("site-lateral-figura")) {
    $("site-lateral-figura").hidden = false;
    $("site-lateral-imagen").src = SI.lateral;
  }

  /* ── ticker: temas configurables desde el panel ── */
  var topics = (S.ticker && S.ticker.length) ? S.ticker :
    ["GTA 6", "Kingdom Hearts IV", "Gamescom 2026", "Black Myth: Zhong Kui"];
  var reelHtml = topics.map(function (t) {
    return "<span>" + esc(t) + "</span><span class=\"sep\">◆</span>";
  }).join("");
  $("ticker-reel").innerHTML = reelHtml + reelHtml; // duplicado para el bucle continuo

  /* ── cards ── */
  var heroCard = function (v) {
    return '<a class="card hero-card" href="' + watch(v.id) + '" target="_blank" rel="noopener">' +
      '<div class="thumb"><img src="' + thumb(v.id, "maxresdefault") + '" alt="" loading="eager" ' +
      "onerror=\"this.onerror=null;this.src='" + thumb(v.id) + "'\">" +
      (v.duration ? '<span class="dur">' + esc(v.duration) + "</span>" : "") + "</div>" +
      '<div class="body"><span class="chip ' + esc(v.category) + '">' + esc(v.category) + "</span>" +
      "<h1>" + esc(v.title) + "</h1>" +
      '<div class="meta">' + esc(v.when || "") + (v.views ? " · " + esc(v.views) : "") + "</div></div></a>";
  };

  var gridCard = function (v) {
    return '<a class="card" href="' + watch(v.id) + '" target="_blank" rel="noopener">' +
      '<div class="thumb"><img src="' + thumb(v.id) + '" alt="" loading="lazy">' +
      (v.duration ? '<span class="dur">' + esc(v.duration) + "</span>" : "") + "</div>" +
      '<div class="body"><span class="chip ' + esc(v.category) + '">' + esc(v.category) + "</span>" +
      "<h3>" + esc(v.title) + "</h3>" +
      '<div class="meta">' + esc(v.when || "") + (v.views ? " · " + esc(v.views) : "") + "</div></div></a>";
  };

  /* noticias de redacción (data/noticias.js): mismo sistema de carta que los
     vídeos — miniatura 16:9 (o placeholder con el wordmark), chip y meta */
  var newsCard = function (a) {
    var thumbHtml = a.image
      ? '<div class="thumb"><img src="' + esc(a.image) + '" alt="" loading="lazy"></div>'
      : '<div class="thumb ph">Talk2Play</div>';
    return '<a class="card news" href="noticia.html?id=' + encodeURIComponent(a.id) + '">' +
      thumbHtml +
      '<div class="body"><span class="chip ' + esc(a.category) + '">' + esc(a.category) + "</span>" +
      ' <span class="byline">Redacción</span>' +
      "<h3>" + esc(a.title) + "</h3>" +
      (a.summary ? '<p class="sum">' + esc(a.summary) + "</p>" : "") +
      '<div class="meta">' + esc(a.date) + " · " + esc(a.author) + "</div></div></a>";
  };

  /* Secciones: "Noticias" es SOLO la redacción; los vídeos viven en
     Actualidad / Reacciones / Gameplays / Directos; Portada mezcla ambos. */
  var render = function (cat) {
    var allArts = (window.T2P_NOTICIAS || {}).articles || [];

    if (cat === "Noticias") {
      $("hero").innerHTML = "";
      $("videos-block").hidden = true;
      $("news-block").hidden = false;
      $("news-grid").innerHTML = allArts.length
        ? allArts.map(newsCard).join("")
        : '<p class="empty">La redacción todavía no ha publicado noticias.</p>';
      return;
    }

    var vids = D.videos.filter(function (v) {
      return cat === "Portada" || v.category === cat;
    });
    $("news-block").hidden = !(cat === "Portada" && allArts.length);
    if (cat === "Portada") $("news-grid").innerHTML = allArts.map(newsCard).join("");
    $("videos-block").hidden = false;
    if (!vids.length) {
      $("hero").innerHTML = "";
      $("grid").innerHTML = '<p class="empty">No hay vídeos en esta sección todavía.</p>';
      return;
    }
    $("hero").innerHTML = heroCard(vids[0]);
    $("videos-title").textContent = cat === "Portada"
      ? (S.titulo_videos || "Últimos vídeos")
      : "Vídeos de " + cat.toLowerCase();
    $("grid").innerHTML = vids.slice(1).map(gridCard).join("") ||
      '<p class="empty">El vídeo destacado de arriba es el único de esta sección.</p>';
  };

  /* ── navegación por categorías ── */
  var nav = $("nav-cats");
  nav.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var cat = a.dataset.cat;
    if (cat === "_shorts" || cat === "_page") return; // ancla o navegación normal
    e.preventDefault();
    nav.querySelectorAll("a").forEach(function (x) { x.classList.remove("active"); });
    a.classList.add("active");
    render(cat);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.querySelector(".logo").addEventListener("click", function (e) {
    e.preventDefault();
    nav.querySelectorAll("a").forEach(function (x) { x.classList.remove("active"); });
    nav.querySelector('[data-cat="Portada"]').classList.add("active");
    render("Portada");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ── sidebar: lo más visto ── */
  var top5 = D.videos.slice().sort(function (a, b) {
    return viewCount(b.views) - viewCount(a.views);
  }).slice(0, 5);
  $("toplist").innerHTML = top5.map(function (v) {
    return '<li><a href="' + watch(v.id) + '" target="_blank" rel="noopener">' +
      '<span class="tt">' + esc(v.title) +
      '<span class="vv">' + esc(v.views || "") + "</span></span></a></li>";
  }).join("");

  /* ── sidebar: shorts con más visitas ── */
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
  render("Portada");
})();
