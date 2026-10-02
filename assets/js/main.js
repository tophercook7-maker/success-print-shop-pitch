/* Success Print Shop — redesign interactions */
(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Sticky header state ---------- */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile drawer ---------- */
  const drawer = $("#drawer");
  const openDrawer = () => { drawer.classList.add("open"); document.body.style.overflow = "hidden"; };
  const closeDrawer = () => { drawer.classList.remove("open"); document.body.style.overflow = ""; };
  $("#navToggle")?.addEventListener("click", openDrawer);
  $("#drawerClose")?.addEventListener("click", closeDrawer);
  $$(".drawer__links a").forEach((a) => a.addEventListener("click", closeDrawer));

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

  /* ---------- Animated counters ---------- */
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const dur = 1400; const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = (target >= 1000 ? Math.round(val).toLocaleString() : (Number.isInteger(target) ? Math.round(val) : val.toFixed(1))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Rotating hero word ---------- */
  const rot = $("#rotator");
  if (rot) {
    const words = ["Schools", "Churches", "Teams", "Businesses", "Events", "Brands"];
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      rot.style.transition = "opacity .3s, transform .3s";
      rot.style.opacity = "0"; rot.style.transform = "translateY(-8px)";
      setTimeout(() => {
        rot.textContent = words[i];
        rot.style.opacity = "1"; rot.style.transform = "translateY(0)";
      }, 300);
    }, 2200);
  }

  /* ---------- Instant quote estimator ---------- */
  const est = {
    product: { tee: { base: 8, label: "T-Shirt" }, hoodie: { base: 22, label: "Hoodie" }, polo: { base: 16, label: "Polo" }, hat: { base: 12, label: "Hat" } },
    method: { screen: { mult: 1, add: 0, label: "Screen Print" }, embroidery: { mult: 1.15, add: 3.5, label: "Embroidery" }, dtf: { mult: 1.1, add: 2, label: "Full-Color (DTF)" } },
    state: { product: "tee", method: "screen", qty: 48, colors: 2 },
  };
  const priceOut = $("#estPrice");
  const perOut = $("#estPer");
  const qtyOut = $("#estQtyVal");
  const summary = $("#estSummary");

  function calcEstimate() {
    const p = est.product[est.state.product];
    const m = est.method[est.state.method];
    const qty = est.state.qty;
    // Volume discount curve
    let unit = p.base * m.mult + m.add + (est.state.method === "screen" ? Math.max(0, est.state.colors - 1) * 0.9 : 0);
    const discount = qty >= 250 ? 0.62 : qty >= 100 ? 0.74 : qty >= 48 ? 0.85 : qty >= 24 ? 0.94 : 1;
    unit = unit * discount;
    const total = unit * qty;
    if (priceOut) priceOut.textContent = "$" + Math.round(total).toLocaleString();
    if (perOut) perOut.textContent = "≈ $" + unit.toFixed(2) + " per piece";
    if (summary) summary.textContent = `${qty} × ${p.label} · ${m.label}`;
    // stash for the form
    est.result = { total: Math.round(total), unit: +unit.toFixed(2), qty, product: p.label, method: m.label, colors: est.state.colors };
  }

  $$("[data-est-product]").forEach((el) => el.addEventListener("click", () => {
    est.state.product = el.dataset.estProduct;
    $$("[data-est-product]").forEach((x) => x.classList.toggle("active", x === el));
    calcEstimate();
  }));
  $$("[data-est-method]").forEach((el) => el.addEventListener("click", () => {
    est.state.method = el.dataset.estMethod;
    $$("[data-est-method]").forEach((x) => x.classList.toggle("active", x === el));
    const cw = $("#colorsWrap");
    if (cw) cw.style.display = est.state.method === "screen" ? "grid" : "none";
    calcEstimate();
  }));
  const qtyRange = $("#estQty");
  qtyRange?.addEventListener("input", () => { est.state.qty = +qtyRange.value; if (qtyOut) qtyOut.textContent = qtyRange.value; calcEstimate(); });
  const colorsRange = $("#estColors");
  colorsRange?.addEventListener("input", () => { est.state.colors = +colorsRange.value; const cv = $("#estColorsVal"); if (cv) cv.textContent = colorsRange.value; calcEstimate(); });
  calcEstimate();

  // "Use this estimate" -> prefill the quote form
  $("#estToForm")?.addEventListener("click", () => {
    const r = est.result || {};
    $("#f_product").value = r.product || "";
    $("#f_qty").value = r.qty || "";
    $("#f_estimate").value = r.total ? `$${r.total} (${r.qty} × ${r.product}, ${r.method})` : "";
    $("#f_service").value = est.state.method === "embroidery" ? "Embroidery" : "Screen Printing";
    document.querySelector("#quote").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("#f_name").focus(), 600);
  });

  /* ---------- Quote form submit -> backend ---------- */
  const form = $("#quoteForm");
  const msg = $("#formMsg");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#submitBtn");
    const original = btn.textContent;
    msg.className = "form__msg"; msg.textContent = "";
    const payload = Object.fromEntries(new FormData(form).entries());
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        msg.className = "form__msg ok";
        msg.textContent = data.message + (data.id && data.id !== "ignored" ? ` (Ref: ${data.id})` : "");
        form.reset();
      } else {
        msg.className = "form__msg err";
        msg.textContent = data.error || "Something went wrong. Please call us at 325-812-6542.";
      }
    } catch {
      msg.className = "form__msg err";
      msg.textContent = "Network hiccup — please try again, or call 325-812-6542.";
    } finally {
      btn.disabled = false; btn.textContent = original;
    }
  });

  /* ---------- Footer year ---------- */
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
