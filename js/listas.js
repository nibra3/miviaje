/* Listas de lugares: se guardan en el navegador (localStorage) y se comparten por link */
(function () {
  var KEY = "guia-bariloche-listas-v1";
  var PLACES = window.PLACES || {};
  var storageOk = true;

  /* ---------- Datos ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (data && Array.isArray(data.lists)) return data;
    } catch (err) { storageOk = false; }
    return { lists: [] };
  }
  var state = load();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { storageOk = false; }
    refresh();
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function getList(id) { return state.lists.filter(function (l) { return l.id === id; })[0]; }
  function hasPlace(list, pid) { return list.items.some(function (it) { return it.id === pid; }); }
  function listsWith(pid) { return state.lists.filter(function (l) { return hasPlace(l, pid); }); }
  function cleanName(name) { return (name || "").trim().slice(0, 40) || "Lista sin nombre"; }
  function createList(name, ids) {
    var list = { id: uid(), name: cleanName(name), items: (ids || []).map(function (id) { return { id: id, visited: false }; }) };
    state.lists.push(list);
    return list;
  }
  function togglePlace(list, pid) {
    if (hasPlace(list, pid)) {
      list.items = list.items.filter(function (it) { return it.id !== pid; });
      return false;
    }
    list.items.push({ id: pid, visited: false });
    return true;
  }

  /* ---------- Utilidades ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  /* Link para compartir: #l.<base64url> (solo letras, números, - _ y .) */
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(tok) {
    var b64 = tok.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function shareLink(list) {
    var token = "l." + b64urlEncode(JSON.stringify({ n: list.name, p: list.items.map(function (it) { return it.id; }) }));
    var base = window.SHARE_BASE || (location.origin + location.pathname.replace(/[^/]*$/, "") + "mis-listas.html");
    return base + "#" + token;
  }
  function readShared() {
    var h = (location.hash || "").slice(1);
    if (h.indexOf("l.") !== 0) return null;
    try {
      var d = JSON.parse(b64urlDecode(h.slice(2)));
      var ids = (d.p || []).filter(function (id) { return PLACES[id]; });
      return { name: cleanName(d.n), ids: ids };
    } catch (err) { return null; }
  }
  function clearHash() {
    try { history.replaceState(null, "", location.pathname + location.search); } catch (err) { /* algunos marcos no lo permiten */ }
  }

  /* Si el link compartido cae en otra página, lo llevamos a Mis listas */
  var isListsPage = !!document.getElementById("lists-root");
  if (!isListsPage && readShared()) {
    var listsLink = document.querySelector(".nav-lists");
    window.location.replace((listsLink ? listsLink.getAttribute("href") : "mis-listas.html") + location.hash);
    return;
  }

  /* ---------- Indicadores en todas las páginas ---------- */
  var prevCount = null;
  function refresh() {
    var n = state.lists.length;
    document.querySelectorAll("[data-lists-count]").forEach(function (b) {
      b.textContent = n;
      b.hidden = n === 0;
      if (prevCount !== null && n > prevCount) { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); }
    });
    prevCount = n;
    document.querySelectorAll("[data-lists-summary]").forEach(function (el) {
      el.textContent = n ? plural(n, "lista", "listas") : "Tus recorridos";
    });
    document.querySelectorAll("[data-save]").forEach(function (btn) {
      var count = listsWith(btn.getAttribute("data-save")).length;
      btn.classList.toggle("is-saved", count > 0);
      btn.querySelector(".save-txt").textContent = count === 0 ? "Guardar en lista" : count === 1 ? "En tu lista" : "En " + count + " listas";
    });
    if (sheetPlace) renderSheet();
    if (isListsPage) renderLists();
  }

  /* ---------- Panel "Guardar en lista" ---------- */
  var sheet = document.getElementById("sheet");
  var sheetPlace = null, lastFocus = null;

  function renderSheet() {
    var p = PLACES[sheetPlace];
    document.getElementById("sheet-title").textContent = p ? p.n : "";
    var box = document.getElementById("sheet-lists");
    if (!state.lists.length) {
      box.innerHTML = '<p class="sheet-empty">Todavía no tenés listas. Poné un nombre y se crea con este lugar adentro.</p>';
      return;
    }
    box.innerHTML = state.lists.map(function (l) {
      var on = hasPlace(l, sheetPlace);
      return '<button type="button" class="sheet-row' + (on ? " is-on" : "") + '" role="checkbox" aria-checked="' + on + '" data-list="' + l.id + '">' +
        '<span class="tick" aria-hidden="true"></span>' +
        '<span class="sheet-row-name">' + esc(l.name) + '</span>' +
        '<span class="sheet-row-count">' + plural(l.items.length, "lugar", "lugares") + "</span></button>";
    }).join("");
  }
  function openSheet(pid, trigger) {
    if (!sheet) return;
    sheetPlace = pid;
    lastFocus = trigger || null;
    var input = document.getElementById("sheet-new");
    input.value = state.lists.length ? "" : "Mi viaje a Bariloche";
    renderSheet();
    sheet.hidden = false;
    document.body.classList.add("no-scroll");
    requestAnimationFrame(function () { sheet.classList.add("open"); });
    setTimeout(function () {
      var first = sheet.querySelector(".sheet-row") || input;
      first.focus();
    }, 60);
  }
  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove("open");
    document.body.classList.remove("no-scroll");
    sheetPlace = null;
    setTimeout(function () { sheet.hidden = true; }, 260);
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener("click", function (ev) {
    var saveBtn = ev.target.closest("[data-save]");
    if (saveBtn) { openSheet(saveBtn.getAttribute("data-save"), saveBtn); return; }
    if (ev.target.closest("[data-close]")) { closeSheet(); return; }
    var row = ev.target.closest(".sheet-row");
    if (row && sheetPlace) {
      var list = getList(row.getAttribute("data-list"));
      if (!list) return;
      var added = togglePlace(list, sheetPlace);
      save();
      toast(added ? "Agregado a " + list.name : "Quitado de " + list.name);
    }
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeSheet(); });

  var sheetForm = document.getElementById("sheet-form");
  if (sheetForm) sheetForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = document.getElementById("sheet-new");
    if (!sheetPlace) return;
    var list = createList(input.value, [sheetPlace]);
    input.value = "";
    save();
    toast("Creaste " + list.name + " con este lugar");
  });

  /* ---------- Página Mis listas ---------- */
  var openPanel = null; // { id, type: "rename" | "share" | "delete" }
  var EMPTY_HTML = isListsPage ? document.getElementById("lists-root").innerHTML : "";

  function panelHtml(list) {
    if (!openPanel || openPanel.id !== list.id) return "";
    if (openPanel.type === "rename") {
      return '<form class="inline-form panel" data-rename="' + list.id + '" autocomplete="off">' +
        '<label class="sr-only" for="rename-' + list.id + '">Nuevo nombre</label>' +
        '<input class="text-input" id="rename-' + list.id + '" maxlength="40" value="' + esc(list.name) + '">' +
        '<button class="btn-solid" type="submit">Guardar nombre</button>' +
        '<button class="btn-ghost" type="button" data-act="cancel">Cancelar</button></form>';
    }
    if (openPanel.type === "share") {
      var link = shareLink(list);
      return '<div class="panel share-panel">' +
        '<p>Quien abra este link puede guardarse una copia de la lista. Lo que tilden como visitado no se comparte.</p>' +
        '<div class="inline-form"><label class="sr-only" for="share-' + list.id + '">Link de la lista</label>' +
        '<input class="text-input mono" id="share-' + list.id + '" readonly value="' + esc(link) + '">' +
        '<button class="btn-solid" type="button" data-act="copy">Copiar link</button></div></div>';
    }
    if (openPanel.type === "delete") {
      return '<div class="panel danger-panel"><p>¿Borrar <strong>' + esc(list.name) + '</strong>? No se puede deshacer.</p>' +
        '<div class="panel-btns"><button class="btn-danger" type="button" data-act="confirm-delete">Sí, borrar</button>' +
        '<button class="btn-ghost" type="button" data-act="cancel">Cancelar</button></div></div>';
    }
    return "";
  }

  function itemHtml(list, it, idx) {
    var p = PLACES[it.id];
    if (!p) return "";
    var last = idx === list.items.length - 1;
    return '<li class="uitem' + (it.visited ? " is-visited" : "") + '" data-item="' + it.id + '">' +
      '<span class="uitem-num">' + (idx + 1) + "</span>" +
      '<label class="check"><input type="checkbox" data-act="visit"' + (it.visited ? " checked" : "") + '>' +
      '<span class="check-box" aria-hidden="true"></span><span class="sr-only">Visitado: ' + esc(p.n) + "</span></label>" +
      '<div class="uitem-text"><span class="uitem-sec"><span aria-hidden="true">' + p.e + "</span> " + esc(p.sn) + "</span>" +
      '<span class="uitem-name">' + esc(p.n) + "</span>" +
      (p.a ? '<span class="uitem-addr">' + esc(p.a) + "</span>" : "") + "</div>" +
      '<div class="uitem-btns">' +
      '<a class="icon-btn" href="' + esc(p.m) + '" target="_blank" rel="noopener" aria-label="Ver ' + esc(p.n) + ' en Google Maps" title="Ver en Google Maps">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg></a>' +
      '<button class="icon-btn" type="button" data-act="up"' + (idx === 0 ? " disabled" : "") + ' aria-label="Subir" title="Subir">↑</button>' +
      '<button class="icon-btn" type="button" data-act="down"' + (last ? " disabled" : "") + ' aria-label="Bajar" title="Bajar">↓</button>' +
      '<button class="icon-btn" type="button" data-act="remove" aria-label="Quitar de la lista" title="Quitar">×</button>' +
      "</div></li>";
  }

  function renderLists() {
    var root = document.getElementById("lists-root");
    var warn = document.getElementById("storage-warn");
    if (warn) warn.hidden = storageOk;
    if (!state.lists.length) { root.innerHTML = EMPTY_HTML; return; }
    root.innerHTML = state.lists.slice().reverse().map(function (l) {
      var total = l.items.length;
      var done = l.items.filter(function (it) { return it.visited; }).length;
      var pct = total ? Math.round(done / total * 100) : 0;
      var items = total
        ? '<ol class="uitems">' + l.items.map(function (it, i) { return itemHtml(l, it, i); }).join("") + "</ol>"
        : '<p class="ulist-empty">Esta lista está vacía. Entrá a una sección y tocá <strong>Guardar en lista</strong>.</p>';
      return '<article class="ulist" data-list="' + l.id + '">' +
        '<header class="ulist-head"><div class="ulist-title-wrap">' +
        '<h2 class="ulist-title">' + esc(l.name) + "</h2>" +
        '<p class="ulist-meta">' + plural(total, "lugar", "lugares") + (total ? " · " + done + " visitado" + (done === 1 ? "" : "s") : "") + "</p></div>" +
        '<div class="ulist-actions">' +
        '<button class="chip-btn" type="button" data-act="share"' + (total ? "" : " disabled") + ">Compartir</button>" +
        '<button class="chip-btn" type="button" data-act="rename">Renombrar</button>' +
        '<button class="chip-btn" type="button" data-act="delete">Borrar</button></div></header>' +
        '<div class="progress" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
        panelHtml(l) + items + "</article>";
    }).join("");
    if (openPanel && openPanel.type === "rename") {
      var inp = document.getElementById("rename-" + openPanel.id);
      if (inp) { inp.focus(); inp.select(); }
    }
  }

  function renderImport() {
    var slot = document.getElementById("import-slot");
    var shared = readShared();
    if (!slot) return;
    if (!shared) { slot.innerHTML = ""; return; }
    slot.innerHTML = '<aside class="import">' +
      '<p class="import-eyebrow">Te compartieron una lista</p>' +
      '<h2 class="import-title">' + esc(shared.name) + "</h2>" +
      '<p class="import-places">' + shared.ids.map(function (id) { return '<span class="pill"><span aria-hidden="true">' + PLACES[id].e + "</span> " + esc(PLACES[id].n) + "</span>"; }).join("") + "</p>" +
      '<div class="panel-btns"><button class="btn-solid" type="button" data-import="save">Guardar en mis listas</button>' +
      '<button class="btn-ghost" type="button" data-import="dismiss">Descartar</button></div></aside>';
    slot.querySelector("[data-import=save]").addEventListener("click", function () {
      createList(shared.name, shared.ids);
      clearHash();
      slot.innerHTML = "";
      save();
      toast("Guardaste " + shared.name);
    });
    slot.querySelector("[data-import=dismiss]").addEventListener("click", function () {
      clearHash();
      slot.innerHTML = "";
    });
  }

  if (isListsPage) {
    var root = document.getElementById("lists-root");

    document.getElementById("create-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var input = document.getElementById("create-name");
      var list = createList(input.value, []);
      input.value = "";
      save();
      toast("Creaste " + list.name);
    });

    root.addEventListener("submit", function (ev) {
      var form = ev.target.closest("[data-rename]");
      if (!form) return;
      ev.preventDefault();
      var list = getList(form.getAttribute("data-rename"));
      list.name = cleanName(form.querySelector("input").value);
      openPanel = null;
      save();
      toast("Lista renombrada");
    });

    root.addEventListener("change", function (ev) {
      if (ev.target.getAttribute("data-act") !== "visit") return;
      var list = getList(ev.target.closest("[data-list]").getAttribute("data-list"));
      var pid = ev.target.closest("[data-item]").getAttribute("data-item");
      list.items.forEach(function (it) { if (it.id === pid) it.visited = ev.target.checked; });
      save();
      if (ev.target.checked) toast("Visitado ✓");
    });

    root.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-act]");
      if (!btn || btn.getAttribute("data-act") === "visit") return;
      var act = btn.getAttribute("data-act");
      var listEl = btn.closest("[data-list]");
      if (!listEl) return;
      var list = getList(listEl.getAttribute("data-list"));
      var itemEl = btn.closest("[data-item]");
      var idx = itemEl ? list.items.map(function (it) { return it.id; }).indexOf(itemEl.getAttribute("data-item")) : -1;

      if (act === "rename" || act === "share" || act === "delete") {
        openPanel = openPanel && openPanel.id === list.id && openPanel.type === act ? null : { id: list.id, type: act };
        renderLists();
      } else if (act === "cancel") {
        openPanel = null;
        renderLists();
      } else if (act === "confirm-delete") {
        state.lists = state.lists.filter(function (l) { return l.id !== list.id; });
        openPanel = null;
        save();
        toast("Lista borrada");
      } else if (act === "copy") {
        var field = listEl.querySelector(".share-panel input");
        var done = function () { toast("Link copiado"); };
        var fallback = function () { field.focus(); field.select(); toast("Seleccioná el link y copialo"); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(field.value).then(done, fallback);
        } else { fallback(); }
      } else if ((act === "up" || act === "down") && idx > -1) {
        var to = act === "up" ? idx - 1 : idx + 1;
        if (to < 0 || to >= list.items.length) return;
        var moved = list.items.splice(idx, 1)[0];
        list.items.splice(to, 0, moved);
        save();
        var li = root.querySelector('[data-list="' + list.id + '"] [data-item="' + moved.id + '"]');
        if (li) {
          li.classList.add("just-moved");
          var again = li.querySelector('[data-act="' + act + '"]:not([disabled])') || li.querySelector('[data-act="remove"]');
          if (again) again.focus();
        }
      } else if (act === "remove" && idx > -1) {
        var name = (PLACES[list.items[idx].id] || {}).n || "Lugar";
        list.items.splice(idx, 1);
        save();
        toast("Quitaste " + name);
      }
    });

    renderImport();
  }

  refresh();
})();
