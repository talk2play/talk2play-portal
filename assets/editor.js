/* Modo edición visual de la portada (estilo Wix, a nuestra escala).
   Se activa abriendo index.html?edit=1 con sesión de administrador iniciada.
   Textos: clic y escribir. Imagen lateral: clic y pegar URL. Noticias: clic
   lleva a su editor del panel. Publica commiteando data/sitio.js. */
(function () {
  "use strict";
  if (!new URLSearchParams(location.search).has("edit")) return;

  var user = null;
  try { user = localStorage.getItem("t2p-admin-user"); } catch (e) { /* sin storage */ }
  if (!user) {
    alert("Para editar la portada entra primero en el panel de administración.");
    location.href = "admin.html";
    return;
  }

  var $ = function (id) { return document.getElementById(id); };
  var SITE = window.T2P_SITIO || {};
  SITE.textos = SITE.textos || {};
  SITE.imagenes = SITE.imagenes || {};
  SITE.videos = SITE.videos || {};
  SITE.videos.ocultos = SITE.videos.ocultos || [];
  SITE.videos.titulos = SITE.videos.titulos || {};
  var changes = 0;
  var bump = function () { changes++; updateBar(); };

  /* ── estilos del modo edición ── */
  var css = document.createElement("style");
  css.textContent =
    ".t2p-editable{outline:2px dashed rgba(230,36,41,.55);outline-offset:3px;cursor:text;border-radius:4px}" +
    ".t2p-editable:hover,.t2p-editable:focus{outline-color:var(--talk);outline-style:solid}" +
    ".t2p-img-editable{outline:2px dashed rgba(230,36,41,.55);outline-offset:3px;cursor:pointer}" +
    ".t2p-img-editable:hover{outline-color:var(--talk);outline-style:solid}" +
    ".t2p-bar{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:760px;margin:0 auto;" +
    "display:flex;flex-wrap:wrap;gap:12px;align-items:center;background:var(--surface);" +
    "border:1px solid var(--talk);border-radius:12px;padding:12px 18px;box-shadow:0 8px 30px rgba(0,0,0,.6)}" +
    ".t2p-bar span{font-size:.85rem;color:var(--muted)}" +
    ".t2p-bar b{color:var(--text)}" +
    ".t2p-bar button{font:inherit;font-weight:600;font-size:.85rem;padding:9px 18px;border-radius:8px;cursor:pointer}" +
    ".t2p-bar .pub{background:var(--talk);border:0;color:#fff}" +
    ".t2p-bar .pub:disabled{opacity:.45;cursor:not-allowed}" +
    ".t2p-bar .out{background:transparent;border:1px solid var(--line);color:var(--text)}" +
    ".t2p-toast{position:fixed;bottom:86px;left:50%;transform:translateX(-50%);z-index:60;" +
    "background:var(--surface2);color:var(--text);border:1px solid var(--line);border-radius:8px;" +
    "padding:9px 16px;font-size:.85rem;max-width:90vw}" +
    "#t2p-vdlg{position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.7);display:flex;" +
    "align-items:center;justify-content:center;padding:20px}" +
    ".t2p-vbox{background:var(--surface);border:1px solid var(--line);border-radius:14px;" +
    "padding:24px;max-width:460px;width:100%}" +
    ".t2p-vbox h3{margin:0 0 8px;font-size:1.05rem}" +
    ".t2p-vbox .orig{font-size:.78rem;color:var(--muted);margin:0 0 14px;overflow-wrap:anywhere}" +
    ".t2p-vbox label{display:block;font-size:.82rem;font-weight:600;color:var(--muted);margin:0 0 12px}" +
    ".t2p-vbox input[type=text],.t2p-vbox input:not([type]){display:block;width:100%;box-sizing:border-box;" +
    "margin-top:6px;background:var(--bg);border:1px solid var(--line);border-radius:8px;" +
    "color:var(--text);font:inherit;font-size:.95rem;padding:10px 12px}" +
    ".t2p-vbox .chk{display:flex;align-items:center;gap:8px;color:var(--text);font-weight:500}" +
    ".t2p-vbox .note{font-size:.76rem;color:var(--muted)}" +
    ".t2p-vbox .btns{display:flex;gap:10px;margin-top:14px}" +
    ".t2p-vbox button{font:inherit;font-weight:600;font-size:.85rem;padding:9px 18px;border-radius:8px;cursor:pointer}" +
    ".t2p-vbox .pub{background:var(--talk);border:0;color:#fff}" +
    ".t2p-vbox .out{background:transparent;border:1px solid var(--line);color:var(--text)}";
  document.head.appendChild(css);

  var toast = function (msg) {
    var t = document.createElement("div");
    t.className = "t2p-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  };

  /* ── textos editables: clic y escribir ── */
  var FIELDS = [
    { id: "site-lema", key: "lema" },
    { id: "site-sub-redaccion", key: "sub_redaccion" },
    { id: "videos-title", key: "titulo_videos" },
    { id: "site-lateral-texto", key: "lateral_texto", multiline: true },
    { id: "site-footer", key: "footer" }
  ];
  FIELDS.forEach(function (f) {
    var el = $(f.id);
    if (!el) return;
    el.classList.add("t2p-editable");
    el.setAttribute("contenteditable", "plaintext-only");
    el.setAttribute("spellcheck", "false");
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !f.multiline) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener("blur", function () {
      var value = (el.innerText || "").trim();
      if (!value) { // no dejamos textos obligatorios vacíos
        el.innerText = SITE.textos[f.key] || "";
        return;
      }
      if (value !== (SITE.textos[f.key] || "")) {
        SITE.textos[f.key] = value;
        bump();
      }
    });
  });

  /* ── imagen del panel lateral: clic y pegar URL ── */
  var figura = $("site-lateral-figura");
  if (figura) {
    figura.hidden = false;
    var img = $("site-lateral-imagen");
    if (!SITE.imagenes.lateral) {
      img.style.minHeight = "90px";
      img.alt = "Clic para poner una imagen";
    }
    figura.classList.add("t2p-img-editable");
    figura.title = "Clic para cambiar la imagen (URL). Vacío = sin imagen.";
    figura.addEventListener("click", function () {
      var url = window.prompt(
        "URL de la imagen del panel lateral (vacío = quitarla):",
        SITE.imagenes.lateral || ""
      );
      if (url === null) return; // cancelado
      url = url.trim();
      if (url === (SITE.imagenes.lateral || "")) return;
      SITE.imagenes.lateral = url;
      img.src = url || "";
      figura.hidden = false;
      bump();
    });
  }

  /* ── vídeos: diálogo de ajustes de portada ── */
  var videoDialog = function (videoId) {
    var video = ((window.T2P_DATA || {}).videos || []).find(function (v) { return v.id === videoId; });
    if (!video) return;
    var old = document.getElementById("t2p-vdlg");
    if (old) old.remove();
    var isHero = SITE.videos.destacado === videoId;
    var isHidden = SITE.videos.ocultos.indexOf(videoId) !== -1;
    var dlg = document.createElement("div");
    dlg.id = "t2p-vdlg";
    dlg.innerHTML =
      '<div class="t2p-vbox">' +
      "<h3>Ajustes del vídeo en la portada</h3>" +
      '<p class="orig"></p>' +
      "<label>Título en el portal (vacío = el de YouTube)" +
      '<input id="t2p-vtitle" maxlength="140"></label>' +
      '<label class="chk"><input type="checkbox" id="t2p-vhero"> Destacar como vídeo principal</label>' +
      '<label class="chk"><input type="checkbox" id="t2p-vhide"> Ocultar de la portada</label>' +
      '<p class="note">Esto solo cambia cómo se ve en el portal; el vídeo en YouTube no se toca.</p>' +
      '<div class="btns"><button class="pub" id="t2p-vok">Aplicar</button>' +
      '<button class="out" id="t2p-vcancel">Cancelar</button></div></div>';
    dlg.querySelector(".orig").textContent = "YouTube: " + video.title;
    document.body.appendChild(dlg);
    var $d = function (id) { return dlg.querySelector("#" + id); };
    $d("t2p-vtitle").value = SITE.videos.titulos[videoId] || "";
    $d("t2p-vtitle").placeholder = video.title;
    $d("t2p-vhero").checked = isHero;
    $d("t2p-vhide").checked = isHidden;
    $d("t2p-vcancel").addEventListener("click", function () { dlg.remove(); });
    $d("t2p-vok").addEventListener("click", function () {
      var newTitle = $d("t2p-vtitle").value.trim();
      if (newTitle) SITE.videos.titulos[videoId] = newTitle;
      else delete SITE.videos.titulos[videoId];
      if ($d("t2p-vhide").checked) {
        if (SITE.videos.ocultos.indexOf(videoId) === -1) SITE.videos.ocultos.push(videoId);
        if (SITE.videos.destacado === videoId) delete SITE.videos.destacado;
      } else {
        SITE.videos.ocultos = SITE.videos.ocultos.filter(function (x) { return x !== videoId; });
        if ($d("t2p-vhero").checked) SITE.videos.destacado = videoId;
        else if (SITE.videos.destacado === videoId) delete SITE.videos.destacado;
      }
      dlg.remove();
      if (window.T2P_RENDER_VIDEOS) window.T2P_RENDER_VIDEOS();
      bump();
    });
  };

  /* ── clics en cartas durante la edición ── */
  document.addEventListener("click", function (e) {
    if (e.target.closest("#t2p-vdlg, .t2p-bar")) return;
    var news = e.target.closest("a.card.news");
    if (news) {
      e.preventDefault();
      var m = new URL(news.href).pathname.match(/noticias\/(.+)\.html$/);
      if (m) location.href = "admin.html#editar=" + m[1];
      return;
    }
    var card = e.target.closest("a.card");
    if (card) {
      e.preventDefault();
      var vid = new URL(card.href).searchParams.get("v");
      if (vid) videoDialog(vid);
      return;
    }
    if (e.target.closest("a.short-card")) {
      e.preventDefault();
      toast("Los Shorts vienen del canal de YouTube: no se editan aquí.");
    }
  }, true);

  /* ── barra flotante ── */
  var bar = document.createElement("div");
  bar.className = "t2p-bar";
  bar.innerHTML =
    "<span>✏ <b>Modo edición</b> · <span id='t2p-count'>sin cambios</span> · " + user + "</span>" +
    "<span style='flex:1'></span>" +
    "<button class='pub' id='t2p-publish' disabled>Publicar</button>" +
    "<button class='out' id='t2p-exit'>Salir</button>";
  document.body.appendChild(bar);

  var updateBar = function () {
    $("t2p-count").textContent = changes === 1 ? "1 cambio" : changes + " cambios";
    $("t2p-publish").disabled = !changes;
  };

  $("t2p-exit").addEventListener("click", function () {
    if (changes && !confirm("Hay cambios sin publicar. ¿Salir y descartarlos?")) return;
    location.href = "index.html";
  });

  /* ── publicar: commit de data/sitio.js con el token del panel ── */
  var b64utf8 = function (s) {
    var bytes = new TextEncoder().encode(s);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  };
  var serializeSite = function () {
    return "window.T2P_SITIO = " + JSON.stringify({
      updated: new Date().toISOString().slice(0, 10),
      textos: SITE.textos,
      imagenes: SITE.imagenes,
      videos: SITE.videos
    }, null, 2) + ";\n";
  };

  $("t2p-publish").addEventListener("click", function () {
    var cfg = {};
    try { cfg = JSON.parse(localStorage.getItem("t2p-admin-config")) || {}; } catch (e) { /* ok */ }
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      toast("Falta la conexión con GitHub: configúrala en el panel (⚙ Conexión).");
      return;
    }
    var headers = {
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    var base = "https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + "/contents/data/sitio.js";
    var branch = cfg.branch || "main";
    $("t2p-publish").disabled = true;
    toast("Publicando…");
    fetch(base + "?ref=" + encodeURIComponent(branch), { headers: headers })
      .then(function (r) {
        if (r.status === 404) return { sha: undefined };
        if (!r.ok) throw new Error("GitHub respondió " + r.status + " al leer sitio.js");
        return r.json();
      })
      .then(function (cur) {
        return fetch(base, {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({
            message: "Edita la portada desde el modo visual (" + user + ")",
            content: b64utf8(serializeSite()),
            sha: cur.sha,
            branch: branch
          })
        });
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) {
          throw new Error("GitHub rechazó el commit (" + r.status + "): " + (e.message || ""));
        });
        return r.json();
      })
      .then(function (res) {
        changes = 0;
        updateBar();
        toast("Publicado (commit " + res.commit.sha.slice(0, 7) + "). Pages tarda ~1 min; recarga con Ctrl+F5 para verlo.");
      })
      .catch(function (e) {
        $("t2p-publish").disabled = false;
        toast(String(e.message || e));
      });
  });
})();
