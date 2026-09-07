/* Panel de redacción: edita las noticias en memoria y las publica
   commiteando data/noticias.js contra la API de GitHub (el repo ES la base
   de datos; GitHub Pages redespliega al recibir el commit). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* ── puerta de administradores ─────────────────────────────────────────
     Lista de correos con acceso al panel. OJO: esto es un control de
     conveniencia en el cliente (el código es público en Pages); la
     autorización real para escribir la pone el token de GitHub. */
  var ADMINS = [
    "marcosreciosanchez@gmail.com",
    "n.jimenezmercader@gmail.com",
    "vicfleki@hotmail.com"
  ];
  var USER_KEY = "t2p-admin-user";
  var currentUser = null;
  try { currentUser = localStorage.getItem(USER_KEY); } catch (e) { /* ok */ }
  if (currentUser && ADMINS.indexOf(currentUser) === -1) currentUser = null;

  var showPanel = function () {
    $("gate").hidden = true;
    $("panel").hidden = false;
    $("session-email").textContent = currentUser;
  };
  if (currentUser) {
    showPanel();
  } else {
    $("gate").hidden = false;
  }
  $("gate-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("gate-email").value.trim().toLowerCase();
    if (ADMINS.indexOf(email) === -1) {
      $("gate-error").hidden = false;
      return;
    }
    currentUser = email;
    try { localStorage.setItem(USER_KEY, email); } catch (e2) { /* ok */ }
    showPanel();
  });
  $("btn-logout").addEventListener("click", function () {
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* ok */ }
    location.reload();
  });

  var articles = ((window.T2P_NOTICIAS || {}).articles || []).map(function (a) {
    return Object.assign({}, a);
  });
  var dirty = false;      // noticias con cambios sin publicar
  var siteDirty = false;  // textos/imágenes del sitio con cambios sin publicar
  var editingId = null;

  var site = {
    textos: Object.assign({}, ((window.T2P_SITIO || {}).textos || {})),
    imagenes: Object.assign({}, ((window.T2P_SITIO || {}).imagenes || {}))
  };
  var anyDirty = function () { return dirty || siteDirty; };

  /* ── config de conexión ── */
  var CFG_KEY = "t2p-admin-config";
  var loadCfg = function () {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  };
  var saveCfg = function (cfg) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* modo privado */ }
  };

  /* ── serialización: el fichero que se commitea ── */
  var serialize = function () {
    var payload = {
      updated: new Date().toISOString().slice(0, 10),
      articles: articles
    };
    return "window.T2P_NOTICIAS = " + JSON.stringify(payload, null, 2) + ";\n";
  };
  var serializeSite = function () {
    var payload = {
      updated: new Date().toISOString().slice(0, 10),
      textos: site.textos,
      imagenes: site.imagenes
    };
    return "window.T2P_SITIO = " + JSON.stringify(payload, null, 2) + ";\n";
  };

  var slugify = function (s) {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 60) || "noticia";
  };

  /* ── listado ── */
  var renderList = function () {
    $("list").innerHTML = "";
    if (!articles.length) {
      $("list").innerHTML = '<p class="hint">Todavía no hay noticias.</p>';
    }
    articles.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "news-item" + (dirty ? " dirty" : "");
      b.innerHTML = '<span><span class="tt"></span><br><span class="dd"></span></span><span>✎</span>';
      b.querySelector(".tt").textContent = a.title;
      b.querySelector(".dd").textContent = a.date + " · " + a.category;
      b.addEventListener("click", function () { openEditor(a.id); });
      $("list").appendChild(b);
    });
    var pending = [];
    if (dirty) pending.push("noticias");
    if (siteDirty) pending.push("textos del sitio");
    $("draft-state").textContent = pending.length
      ? "Cambios sin publicar: " + pending.join(" y ") + ". Publica para que lleguen al portal."
      : "Sin cambios pendientes.";
    $("btn-publish").disabled = !anyDirty();
    $("btn-download").disabled = !anyDirty();
  };

  /* ── editor ── */
  var openEditor = function (id) {
    editingId = id;
    var f = $("form");
    f.reset();
    $("btn-delete").hidden = !id;
    $("editor-title").textContent = id ? "Editar noticia" : "Nueva noticia";
    if (id) {
      var a = articles.find(function (x) { return x.id === id; });
      if (!a) return;
      f.title.value = a.title;
      f.author.value = a.author;
      f.image.value = a.image || "";
      f.summary.value = a.summary || "";
      f.body.value = a.body || "";
    }
    $("editor").hidden = false;
    f.title.focus();
  };

  var closeEditor = function () {
    $("editor").hidden = true;
    editingId = null;
  };

  $("btn-new").addEventListener("click", function () { openEditor(null); });
  $("btn-cancel").addEventListener("click", closeEditor);

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      id: editingId || slugify(f.title.value),
      title: f.title.value.trim(),
      category: "Noticias", // todo lo de redaccion es Noticias

      date: new Date().toISOString().slice(0, 10),
      author: f.author.value.trim(),
      image: f.image.value.trim(),
      summary: f.summary.value.trim(),
      body: f.body.value.trim()
    };
    if (!editingId) {
      // id único aunque dos noticias compartan título
      var base = data.id, n = 2;
      while (articles.some(function (x) { return x.id === data.id; })) data.id = base + "-" + n++;
      articles.unshift(data);
    } else {
      var i = articles.findIndex(function (x) { return x.id === editingId; });
      data.date = articles[i].date; // la fecha de publicación no cambia al editar
      articles[i] = data;
    }
    dirty = true;
    closeEditor();
    renderList();
  });

  $("btn-delete").addEventListener("click", function () {
    if (!editingId) return;
    if (!confirm("¿Eliminar esta noticia? Se borrará del portal al publicar.")) return;
    articles = articles.filter(function (x) { return x.id !== editingId; });
    dirty = true;
    closeEditor();
    renderList();
  });

  /* ── formulario de textos e imágenes del sitio ── */
  var siteForm = $("site-form");
  var fillSiteForm = function () {
    var f = siteForm;
    f.lema.value = site.textos.lema || "";
    f.titulo_videos.value = site.textos.titulo_videos || "";
    f.sub_redaccion.value = site.textos.sub_redaccion || "";
    f.ticker.value = (site.textos.ticker || []).join("\n");
    f.lateral_texto.value = site.textos.lateral_texto || "";
    f.imagen_lateral.value = site.imagenes.lateral || "";
    f.footer.value = site.textos.footer || "";
    f.contacto_intro.value = site.textos.contacto_intro || "";
    f.email_contacto.value = site.textos.email_contacto || "";
  };
  fillSiteForm();
  siteForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = siteForm;
    site.textos.lema = f.lema.value.trim();
    site.textos.titulo_videos = f.titulo_videos.value.trim();
    site.textos.sub_redaccion = f.sub_redaccion.value.trim();
    site.textos.ticker = f.ticker.value.split("\n")
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t; });
    site.textos.lateral_texto = f.lateral_texto.value.trim();
    site.imagenes.lateral = f.imagen_lateral.value.trim();
    site.textos.footer = f.footer.value.trim();
    site.textos.contacto_intro = f.contacto_intro.value.trim();
    site.textos.email_contacto = f.email_contacto.value.trim().toLowerCase();
    siteDirty = true;
    renderList();
    log("Textos guardados en borrador.", "ok");
  });

  /* ── ficheros que hay que publicar (los que tengan cambios) ── */
  var pendingFiles = function () {
    var files = [];
    if (dirty) files.push({ path: "data/noticias.js", name: "noticias.js", content: serialize() });
    if (siteDirty) files.push({ path: "data/sitio.js", name: "sitio.js", content: serializeSite() });
    return files;
  };

  /* ── descarga manual (alternativa sin token) ── */
  $("btn-download").addEventListener("click", function () {
    pendingFiles().forEach(function (file) {
      var blob = new Blob([file.content], { type: "text/javascript;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    log("Descargado. Sustituye el/los fichero(s) en data/ del repo y haz commit.", "ok");
  });

  /* ── publicación via API de GitHub ── */
  var log = function (msg, cls) {
    $("publish-log").textContent = msg;
    $("publish-log").className = "hint " + (cls || "");
  };

  var b64utf8 = function (s) {
    var bytes = new TextEncoder().encode(s);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  };

  var gh = function (cfg, path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }, opts.headers || {});
    return fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + path, opts);
  };

  $("btn-publish").addEventListener("click", function () {
    var cfg = loadCfg();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      $("config").showModal();
      log("Configura la conexión con GitHub primero (botón ⚙ Conexión).", "err");
      return;
    }
    $("btn-publish").disabled = true;
    log("Publicando…");

    var publishOne = function (file) {
      return gh(cfg, "/contents/" + file.path + "?ref=" + encodeURIComponent(cfg.branch || "main"))
        .then(function (r) {
          if (r.status === 404) return { sha: undefined };
          if (!r.ok) throw new Error("GitHub respondió " + r.status + " al leer " + file.name + " (¿owner/repo/token correctos?)");
          return r.json();
        })
        .then(function (cur) {
          return gh(cfg, "/contents/" + file.path, {
            method: "PUT",
            body: JSON.stringify({
              message: "Publica " + file.name + " desde el panel de redacción",
              content: b64utf8(file.content),
              sha: cur.sha,
              branch: cfg.branch || "main"
            })
          });
        })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (e) {
            throw new Error("GitHub rechazó el commit de " + file.name + " (" + r.status + "): " + (e.message || ""));
          });
          return r.json();
        });
    };

    // en serie, para que el segundo commit no pise el sha del primero
    var files = pendingFiles();
    var results = [];
    files.reduce(function (chain, file) {
      return chain.then(function () {
        return publishOne(file).then(function (res) { results.push(res); });
      });
    }, Promise.resolve())
      .then(function () {
        dirty = false;
        siteDirty = false;
        renderList();
        log("Publicado — " + results.map(function (r) { return r.commit.sha.slice(0, 7); }).join(", ") +
          ". GitHub Pages tarda ~1 minuto en redesplegar.", "ok");
      })
      .catch(function (e) {
        $("btn-publish").disabled = false;
        log(String(e.message || e), "err");
      });
  });

  /* ── diálogo de configuración ── */
  $("btn-config").addEventListener("click", function () {
    var cfg = loadCfg();
    $("cfg-owner").value = cfg.owner || "";
    $("cfg-repo").value = cfg.repo || "";
    $("cfg-branch").value = cfg.branch || "main";
    $("cfg-token").value = cfg.token || "";
    $("config").showModal();
  });
  $("cfg-save").addEventListener("click", function () {
    saveCfg({
      owner: $("cfg-owner").value.trim(),
      repo: $("cfg-repo").value.trim(),
      branch: $("cfg-branch").value.trim() || "main",
      token: $("cfg-token").value.trim()
    });
  });

  renderList();
})();
