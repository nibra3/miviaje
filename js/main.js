(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal al hacer scroll: solo se esconde lo que está debajo del primer pantallazo
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (!reduce && "IntersectionObserver" in window) {
    var vh = window.innerHeight || 800;
    var below = items.filter(function (el) { return el.getBoundingClientRect().top > vh * 0.92; });
    below.forEach(function (el) { el.classList.add("pending"); });
    var batch = 0, timer = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.style.setProperty("--stagger", batch++);
        el.classList.add("shown");
        requestAnimationFrame(function () { el.classList.remove("pending"); });
        io.unobserve(el);
      });
      clearTimeout(timer);
      timer = setTimeout(function () { batch = 0; }, 120);
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    below.forEach(function (el) { io.observe(el); });
  }

  // Transición suave entre páginas internas
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a || reduce) return;
    var href = a.getAttribute("href");
    if (!href || a.target === "_blank" || /^(https?:|#|mailto:|tel:)/.test(href)) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    document.body.classList.add("leaving");
    setTimeout(function () { window.location.href = href; }, 220);
  });
  window.addEventListener("pageshow", function () { document.body.classList.remove("leaving"); });

  // Centrar la sección activa en la nav (útil en celular)
  var active = document.querySelector(".nav-link.is-active");
  if (active && active.scrollIntoView) {
    var bar = document.querySelector(".nav-links");
    if (bar) bar.scrollLeft = active.offsetLeft - bar.clientWidth / 2 + active.clientWidth / 2;
  }
})();
