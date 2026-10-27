(function () {
  "use strict";

  const data = window.TEKNO_DATA;
  const views = {
    home: document.getElementById("homeView"),
    dictionary: document.getElementById("dictionaryView"),
    detail: document.getElementById("detailView"),
    about: document.getElementById("aboutView")
  };
  const state = { category: "Tümü", query: "", cameraStream: null, scanTimer: 0, deferredInstall: null, currentItem: null, discovered: new Set(JSON.parse(localStorage.getItem("teknosoz-discovered") || "[]")) };
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  }

  function showToast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  function updateActiveNav(route) {
    qsa("[data-route]").forEach(el => el.classList.toggle("active", el.dataset.route === route));
  }

  function showView(name, { push = true } = {}) {
    Object.entries(views).forEach(([key, el]) => el.classList.toggle("active", key === name));
    updateActiveNav(name === "detail" ? "dictionary" : name);
    if (push) {
      const url = new URL(location.href);
      url.searchParams.delete("terim");
      url.searchParams.delete("qr");
      if (name === "dictionary") url.searchParams.set("sayfa", "sozluk");
      else if (name === "about") url.searchParams.set("sayfa", "proje");
      else url.searchParams.delete("sayfa");
      history.pushState({ view: name }, "", url);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "dictionary") setTimeout(() => qs("#searchInput")?.focus({ preventScroll: true }), 300);
  }

  function openDetail(slug, { push = true, unlocked = false } = {}) {
    const item = data.find(entry => entry.slug === slug);
    if (!item) return showView("dictionary", { push });
    state.currentItem = item;
    views.detail.innerHTML = `
      <div class="detail-layout">
        <div class="detail-model">
          <span class="model-caption">${unlocked ? "QR DOĞRULANDI · 3B MODEL AÇIK" : "3B MODEL · QR İLE AÇILIR"}</span>
          ${unlocked ? `<model-viewer id="detailModel" src="${item.asset}" alt="Döndürülebilir ${escapeHtml(item.name)} modeli" camera-controls auto-rotate autoplay ${item.animation ? `animation-name="${item.animation}"` : ""} ar ar-modes="webxr scene-viewer quick-look" shadow-intensity="1.25" shadow-softness=".8" exposure="1.05" interaction-prompt="auto"></model-viewer>` : `<div class="locked-model"><div class="locked-glyph">${escapeHtml(item.glyph)}</div><span class="lock-icon">⌁</span><h2>3B model kilitli</h2><p>Bu aracın QR kodunu okutarak etkileşimli modeli ve AR modunu aç.</p><button class="primary-button unlock-model-button">QR kod okut <span>⌗</span></button></div>`}
          <div class="model-toolbar">
            ${unlocked ? `<span>↔ Döndür · kaydırarak yakınlaştır</span><div><button id="resetModel">Görünümü sıfırla</button><button class="ar-open">⌾ AR ile görüntüle</button></div>` : `<span>Basılı sözlükteki veya ekrandaki QR kodu tara.</span>`}
          </div>
        </div>
        <article class="detail-copy">
          <button class="back-button" data-route="dictionary">← Sözlüğe dön</button>
          <span class="detail-index">${String(data.indexOf(item) + 1).padStart(2,"0")} / ${String(data.length).padStart(2,"0")} · ${escapeHtml(item.category.toUpperCase())}</span>
          <h1>${escapeHtml(item.name)}</h1>
          <p class="detail-subtitle">${escapeHtml(item.longName)}</p>
          <p class="detail-definition">${escapeHtml(item.definition)}</p>
          <section class="info-block"><h2>NE İÇİN KULLANILIR?</h2><p>${escapeHtml(item.use)}</p></section>
          <section class="info-block"><h2>TEMEL PARÇALAR</h2><div class="part-list">${item.parts.map(p => `<span>${escapeHtml(p)}</span>`).join("")}</div></section>
          <section class="info-block"><h2>KISA TARİHÇE</h2><p>${escapeHtml(item.history)}</p></section>
          <aside class="fact-box"><span>BUNU BİLİYOR MUYDUN?</span><p>${escapeHtml(item.fact)}</p></aside>
          <section class="info-block model-credit"><h2>3B MODEL</h2><p>Web için optimize edilmiş CC0 model. <a href="${item.assetSource}" target="_blank" rel="noopener">Model kaynağını görüntüle ↗</a></p></section>
          <section class="info-block"><h2>ARAÇLAR</h2><div class="part-list"><button id="speakButton" class="outline-button">▶ Sesli dinle</button><button id="shareButton" class="outline-button">↗ Paylaş</button><button id="printButton" class="outline-button">⌑ Yazdır</button></div></section>
          <aside class="qr-card">
            <img src="./assets/qr/${item.slug}.svg" alt="${escapeHtml(item.name)} sayfasının QR kodu" />
            <div><h2>Bu maddeyi telefonunda aç</h2><p>QR kodu kamerayla okut; 3B modeli ve AR deneyimini hemen başlat.</p><a href="./assets/qr/${item.slug}.svg" download="teknosoz-${item.slug}-qr.svg">QR kodu indir</a></div>
          </aside>
        </article>
      </div>`;
    Object.values(views).forEach(el => el.classList.remove("active"));
    views.detail.classList.add("active");
    updateActiveNav("dictionary");
    const detailModel = qs("#detailModel");
    if (detailModel) {
      markDiscovered(item.slug);
      qs("#resetModel").addEventListener("click", () => {
        detailModel.cameraOrbit = "0deg 75deg auto";
        detailModel.fieldOfView = "30deg";
        detailModel.resetTurntableRotation?.();
      });
      qs(".ar-open").addEventListener("click", async () => {
        if (!detailModel.canActivateAR) {
          showToast("AR modu destekleyen bir telefonda bu sayfayı açmalısın.");
          return;
        }
        try { await detailModel.activateAR(); }
        catch (_) { showToast("AR modu başlatılamadı. Kamera iznini kontrol edebilirsin."); }
      });
    } else {
      qs(".unlock-model-button")?.addEventListener("click", openCamera);
    }
    qs("#speakButton").addEventListener("click", () => speakItem(item));
    qs("#shareButton").addEventListener("click", () => shareItem(item));
    qs("#printButton").addEventListener("click", () => window.print());
    qs(".back-button").addEventListener("click", () => showView("dictionary"));
    if (push) {
      const url = new URL(location.href);
      url.searchParams.delete("sayfa");
      url.searchParams.set("terim", item.slug);
      if (unlocked) url.searchParams.set("qr", "1");
      else url.searchParams.delete("qr");
      history.pushState({ term: item.slug }, "", url);
    }
    document.title = `${item.name} — TeknoSöz 3B`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function speakItem(item) {
    if (!("speechSynthesis" in window)) return showToast("Sesli okuma bu tarayıcıda desteklenmiyor.");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${item.name}. ${item.longName}. ${item.definition} ${item.use}`);
    utterance.lang = "tr-TR";
    utterance.rate = .9;
    speechSynthesis.speak(utterance);
  }

  async function shareItem(item) {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${item.name} — TeknoSöz 3B`, text: item.definition, url });
      else { await navigator.clipboard.writeText(url); showToast("Bağlantı panoya kopyalandı."); }
    } catch (error) {
      if (error.name !== "AbortError") showToast("Paylaşım başlatılamadı.");
    }
  }

  function cardTemplate(item, index, type = "dictionary") {
    if (type === "feature") return `
      <article class="feature-card" data-slug="${item.slug}" tabindex="0" role="button" aria-label="${escapeHtml(item.name)} maddesini aç">
        <div class="card-top"><span class="number-badge">${String(index + 1).padStart(2,"0")}</span><span class="category-badge">${escapeHtml(item.category)}</span></div>
        <div class="card-symbol" aria-hidden="true"><span>${escapeHtml(item.glyph)}</span><i>QR İLE 3B'Yİ AÇ</i></div>
        <div class="card-bottom"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.longName)}</p></div><span class="card-arrow">↗</span></div>
      </article>`;
    return `
      <article class="dictionary-card" data-slug="${item.slug}" tabindex="0" role="button" aria-label="${escapeHtml(item.name)} maddesini aç" style="background:${item.color}">
        <header><span class="number-badge">${String(index + 1).padStart(2,"0")}</span><span class="category-badge">${escapeHtml(item.category)}</span></header>
        <div class="card-symbol" aria-hidden="true"><span>${escapeHtml(item.glyph)}</span><i>QR İLE 3B'Yİ AÇ</i></div>
        <footer><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.longName)}</p></footer>
      </article>`;
  }

  function wireCards(root) {
    qsa("[data-slug]", root).forEach(card => {
      const open = () => openDetail(card.dataset.slug);
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  function markDiscovered(slug) {
    state.discovered.add(slug);
    localStorage.setItem("teknosoz-discovered", JSON.stringify([...state.discovered]));
    updateProgress();
  }

  function updateProgress() {
    const count = state.discovered.size;
    const text = qs("#progressText");
    const bar = qs("#progressBar");
    if (text) text.textContent = `${count} / ${data.length}`;
    if (bar) bar.style.width = `${Math.min(100, count / data.length * 100)}%`;
  }

  function renderQuiz() {
    const root = qs("#quizCard");
    if (!root) return;
    const day = Math.floor(Date.now() / 86400000);
    const correct = data[day % data.length];
    const options = [correct, data[(day + 3) % data.length], data[(day + 5) % data.length], data[(day + 7) % data.length]]
      .filter((item, index, all) => all.findIndex(entry => entry.slug === item.slug) === index);
    root.innerHTML = `
      <span class="quiz-number">SORU / 01</span>
      <h3>“${escapeHtml(correct.definition)}”</h3>
      <p>Bu tanım hangi teknolojik araca aittir?</p>
      <div class="quiz-options">${options.map(item => `<button data-answer="${item.slug}">${escapeHtml(item.name)}</button>`).join("")}</div>
      <div class="quiz-feedback" hidden></div>`;
    qsa("[data-answer]", root).forEach(button => button.addEventListener("click", () => {
      const right = button.dataset.answer === correct.slug;
      qsa("[data-answer]", root).forEach(option => {
        option.disabled = true;
        option.classList.toggle("correct", option.dataset.answer === correct.slug);
      });
      if (!right) button.classList.add("wrong");
      const feedback = qs(".quiz-feedback", root);
      feedback.hidden = false;
      feedback.textContent = right ? "Doğru! Harika gidiyorsun." : `Doğru cevap: ${correct.name}`;
    }));
  }

  function renderFeatured() {
    const root = qs("#featuredGrid");
    const featured = [data[0], data[2], data[5]];
    root.innerHTML = featured.map((item, i) => cardTemplate(item, data.indexOf(item), "feature")).join("");
    wireCards(root);
  }

  function renderFilters() {
    const root = qs("#filterChips");
    root.innerHTML = window.TEKNO_CATEGORIES.map(cat => `<button class="${cat === state.category ? "active" : ""}" data-filter="${cat}">${cat}</button>`).join("");
    qsa("[data-filter]", root).forEach(btn => btn.addEventListener("click", () => {
      state.category = btn.dataset.filter;
      renderFilters(); renderDictionary();
    }));
  }

  function normalize(value) { return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  function renderDictionary() {
    const root = qs("#dictionaryGrid");
    const query = normalize(state.query);
    const results = data.filter(item => {
      const categoryMatches = state.category === "Tümü" || item.category === state.category;
      const text = normalize([item.name, item.longName, item.category, item.definition].join(" "));
      return categoryMatches && (!query || text.includes(query));
    });
    qs("#resultCount").textContent = `${String(results.length).padStart(2,"0")} KAVRAM BULUNDU`;
    root.innerHTML = results.map(item => cardTemplate(item, data.indexOf(item))).join("");
    qs("#emptyState").hidden = results.length > 0;
    wireCards(root);
  }

  async function openCamera() {
    const dialog = qs("#cameraDialog");
    const video = qs("#cameraVideo");
    const scannerFrame = qs("#scannerFrame");
    const message = qs("#cameraMessage");
    message.hidden = true;
    scannerFrame.hidden = false;
    qs("#arCanvas").hidden = true;
    qs("#cameraModeLabel").textContent = "QR TARAYICI";
    qs("#cameraTitle").textContent = "Kodu kadrajın içine al";
    qs("#cameraHint").textContent = "Kod algılandığında sayfa otomatik açılır";
    qs("#sizeDown").style.visibility = "hidden";
    qs("#sizeUp").style.visibility = "hidden";
    qs("#captureButton").style.visibility = "hidden";
    dialog.showModal();
    try {
      state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = state.cameraStream;
      await video.play();
      startQrDetection(video);
    } catch (error) {
      message.hidden = false;
      message.textContent = location.protocol === "file:" ? "Kamera özelliği güvenli bağlantıda çalışır. Siteyi localhost veya HTTPS üzerinden açmalısın." : "Kameraya erişilemedi. Tarayıcı ayarlarından kamera izni verip tekrar deneyebilirsin.";
    }
  }

  async function startQrDetection(video) {
    const message = qs("#cameraMessage");
    if (!("BarcodeDetector" in window)) {
      message.hidden = false;
      message.textContent = "Bu tarayıcı sayfa içi QR taramayı desteklemiyor. Telefonunun normal kamera uygulamasıyla kodu okutabilirsin.";
      return;
    }
    try {
      const supported = await BarcodeDetector.getSupportedFormats();
      if (!supported.includes("qr_code")) throw new Error("QR unsupported");
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const detect = async () => {
        if (!state.cameraStream) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length) {
            const url = new URL(codes[0].rawValue, location.href);
            const slug = url.searchParams.get("terim");
            if (data.some(item => item.slug === slug)) {
              closeCamera(); openDetail(slug, { unlocked: true }); showToast("QR doğrulandı, 3B model açıldı."); return;
            }
            message.hidden = false;
            message.textContent = "Bu QR kod TeknoSöz'e ait görünmüyor.";
          }
        } catch (_) {}
        state.scanTimer = requestAnimationFrame(detect);
      };
      detect();
    } catch (_) {
      message.hidden = false;
      message.textContent = "QR tarama bu cihazda kullanılamıyor. Telefonunun normal kamera uygulamasını kullanabilirsin.";
    }
  }

  function closeCamera() {
    cancelAnimationFrame(state.scanTimer);
    state.scanTimer = 0;
    state.cameraStream?.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
    qs("#cameraDialog").close();
  }

  function initEvents() {
    qsa("[data-route]").forEach(button => button.addEventListener("click", e => {
      e.preventDefault(); showView(button.dataset.route);
      if (button.dataset.route !== "detail") document.title = "TeknoSöz 3B — Teknoloji Sözlüğü";
    }));
    qsa(".scan-trigger").forEach(button => button.addEventListener("click", () => openCamera()));
    qsa("[data-category]").forEach(button => button.addEventListener("click", () => {
      state.category = button.dataset.category; renderFilters(); renderDictionary(); showView("dictionary");
    }));
    qs("#searchInput").addEventListener("input", e => { state.query = e.target.value; renderDictionary(); });
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); showView("dictionary"); setTimeout(() => qs("#searchInput").focus(), 50); }
      if (e.key === "Escape" && qs("#cameraDialog").open) closeCamera();
    });
    qs("#closeCamera").addEventListener("click", closeCamera);
    qs("#cameraDialog").addEventListener("cancel", e => { e.preventDefault(); closeCamera(); });
    window.addEventListener("popstate", routeFromUrl);
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); state.deferredInstall = e; });
    qs("#installButton").addEventListener("click", async () => {
      if (!state.deferredInstall) return showToast("Tarayıcı menüsünden ‘Ana ekrana ekle’ seçeneğini kullanabilirsin.");
      state.deferredInstall.prompt(); await state.deferredInstall.userChoice; state.deferredInstall = null;
    });
  }

  function routeFromUrl() {
    const params = new URLSearchParams(location.search);
    const term = params.get("terim");
    const page = params.get("sayfa");
    if (term) openDetail(term, { push: false, unlocked: params.get("qr") === "1" });
    else showView(page === "sozluk" ? "dictionary" : page === "proje" ? "about" : "home", { push: false });
  }

  function init() {
    renderFeatured();
    renderFilters();
    renderDictionary();
    renderQuiz();
    updateProgress();
    initEvents();
    routeFromUrl();
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  init();
})();
