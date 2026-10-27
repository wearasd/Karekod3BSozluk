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

  function getEffectiveBaseUrl() {
    const saved = localStorage.getItem("teknosoz-live-url");
    if (saved && saved.trim()) return saved.trim();

    // ChatGPT / OpenAI Canvas veya iframe kontrolü
    const isChatGPT = location.hostname.includes("chatgpt.com") ||
                      location.hostname.includes("openai.com") ||
                      (window.self !== window.top);

    if (isChatGPT) {
      return "https://teknosoz-3b.vercel.app/";
    }

    return `${location.origin}${location.pathname}`;
  }

  function getItemQrUrl(slug) {
    const base = getEffectiveBaseUrl();
    try {
      const url = new URL(base, location.href);
      url.searchParams.set("terim", slug);
      url.searchParams.set("qr", "1");
      url.searchParams.delete("sayfa");
      return url.href;
    } catch (_) {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}terim=${encodeURIComponent(slug)}&qr=1`;
    }
  }

  function renderQrSvg(targetUrl, containerEl, downloadBtnEl, slug) {
    if (window.QRCode && typeof window.QRCode.toString === "function") {
      window.QRCode.toString(targetUrl, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "H",
        color: { dark: "#07131fff", light: "#fffefaff" }
      }, (err, svg) => {
        if (!err && svg) {
          containerEl.innerHTML = svg;
          if (downloadBtnEl) {
            const blob = new Blob([svg], { type: "image/svg+xml" });
            downloadBtnEl.href = URL.createObjectURL(blob);
            downloadBtnEl.download = `teknosoz-${slug}-qr.svg`;
          }
          return;
        }
        fallbackSvg(containerEl, downloadBtnEl, slug);
      });
    } else {
      fallbackSvg(containerEl, downloadBtnEl, slug);
    }
  }

  function fallbackSvg(containerEl, downloadBtnEl, slug) {
    containerEl.innerHTML = `<img src="./assets/qr/${slug}.svg" alt="${slug} QR kodu" style="width:100%;height:100%;object-fit:contain;" />`;
    if (downloadBtnEl) {
      downloadBtnEl.href = `./assets/qr/${slug}.svg`;
      downloadBtnEl.download = `teknosoz-${slug}-qr.svg`;
    }
  }

  function openDetail(slug, { push = true, unlocked = false } = {}) {
    const item = data.find(entry => entry.slug === slug);
    if (!item) return showView("dictionary", { push });
    state.currentItem = item;

    views.detail.innerHTML = `
      <div class="detail-layout">
        <div class="detail-model">
          <span class="model-caption">${unlocked ? "📱 QR DOĞRULANDI · 3B MODEL AÇIK" : "3B MODEL · TELEFONLA OKUT"}</span>
          ${unlocked ? `
            <model-viewer id="detailModel" src="${item.asset}" alt="Döndürülebilir ${escapeHtml(item.name)} modeli" camera-controls auto-rotate autoplay ${item.animation ? `animation-name="${item.animation}"` : ""} ar ar-modes="webxr scene-viewer quick-look" shadow-intensity="1.25" shadow-softness=".8" exposure="1.05" interaction-prompt="auto"></model-viewer>
          ` : `
            <div class="locked-model">
              <div class="locked-glyph">${escapeHtml(item.glyph)}</div>
              <div id="lockedQrBox" class="locked-qr-preview" title="Karekodu büyütmek için tıkla"></div>
              <h2>3B Modeli Telefonda Gör</h2>
              <p>Telefonunun kamerasını açıp bu karekodu okut; 3B model telefonunda anında açılsın!</p>
              <div style="display:flex; gap:10px; align-items:center; z-index:2; flex-wrap:wrap; justify-content:center;">
                <button class="primary-button unlock-model-button" style="background: var(--orange); color: white;">Karekodu Büyüt <span>⌗</span></button>
                <button id="previewHereBtn" class="outline-button" style="color:white; border-color:rgba(255,255,255,.35); font-size:12px; padding:10px 16px;">🖥️ Masaüstünde İncele</button>
              </div>
            </div>
          `}
          <div class="model-toolbar">
            ${unlocked ? `
              <span>↔ Döndür · kaydırarak yakınlaştır</span>
              <div>
                <button id="resetModel">Görünümü sıfırla</button>
                <button id="openModelQrBtn" class="outline-button" style="font-size: 11px;">📱 Karekod</button>
                <button class="ar-open">⌾ AR ile görüntüle</button>
              </div>
            ` : `
              <span>Karekod butonuna bas, ekranda çıkan kodu telefonuna okut.</span>
              <div>
                <button id="previewHereBtn" class="outline-button" style="font-size:11px;">Masaüstünde aç</button>
                <button id="openModelQrBtn" class="primary-button" style="padding:6px 12px; font-size:11px; background:var(--orange); color:white;">📱 Karekod çıkar</button>
              </div>
            `}
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
          <aside class="qr-card" style="cursor: pointer;" title="Karekodu büyütmek için tıkla">
            <div id="detailQrBox" style="width: 112px; height: 112px; display: grid; place-items: center; background: white; border: 1px solid var(--line); border-radius: 8px; padding: 4px;"></div>
            <div>
              <h2>Bu maddeyi telefonunda aç</h2>
              <p>Telefonunun kamerasını açıp bu karekodu okut; 3B modeli ve AR deneyimini telefonunda hemen başlat.</p>
              <div style="display:flex; gap:12px; align-items:center; margin-top:8px;">
                <button id="enlargeQrBtn" class="outline-button" type="button" style="font-size:11px; padding:6px 12px;">🔍 Karekodu Büyüt</button>
                <a id="detailQrDownload" href="./assets/qr/${item.slug}.svg" download="teknosoz-${item.slug}-qr.svg" style="font-size:11px; font-weight:800; color:var(--ink);">Karekodu indir ↗</a>
              </div>
            </div>
          </aside>
        </article>
      </div>`;
    Object.values(views).forEach(el => el.classList.remove("active"));
    views.detail.classList.add("active");
    updateActiveNav("dictionary");

    const qrUrl = getItemQrUrl(item.slug);
    const lockedQrBox = qs("#lockedQrBox");
    if (lockedQrBox) {
      renderQrSvg(qrUrl, lockedQrBox, null, item.slug);
      lockedQrBox.addEventListener("click", () => openQrModal(item.slug));
    }
    const detailQrBox = qs("#detailQrBox");
    const detailQrDownload = qs("#detailQrDownload");
    if (detailQrBox) {
      renderQrSvg(qrUrl, detailQrBox, detailQrDownload, item.slug);
      detailQrBox.addEventListener("click", () => openQrModal(item.slug));
    }
    qs("#enlargeQrBtn")?.addEventListener("click", () => openQrModal(item.slug));
    qs("#openModelQrBtn")?.addEventListener("click", () => openQrModal(item.slug));
    qs(".unlock-model-button")?.addEventListener("click", () => openQrModal(item.slug));
    qs("#previewHereBtn")?.addEventListener("click", () => openDetail(item.slug, { push, unlocked: true }));

    const detailModel = qs("#detailModel");
    if (detailModel) {
      markDiscovered(item.slug);
      qs("#resetModel")?.addEventListener("click", () => {
        detailModel.cameraOrbit = "0deg 75deg auto";
        detailModel.fieldOfView = "30deg";
        detailModel.resetTurntableRotation?.();
      });
      qs(".ar-open")?.addEventListener("click", async () => {
        if (!detailModel.canActivateAR) {
          openQrModal(item.slug);
          showToast("AR modu için telefonunun kamerasıyla bu karekodu okut.");
          return;
        }
        try { await detailModel.activateAR(); }
        catch (_) { showToast("AR modu başlatılamadı. Kamera iznini kontrol edebilirsin."); }
      });
    }

    if (unlocked) {
      showToast(`📱 ${item.name} 3B modeli açıldı!`);
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
        <div class="card-symbol" aria-hidden="true"><span>${escapeHtml(item.glyph)}</span><i>3B MODELİ İNCELE</i></div>
        <div class="card-bottom"><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.longName)}</p></div><span class="card-arrow">↗</span></div>
      </article>`;
    return `
      <article class="dictionary-card" data-slug="${item.slug}" tabindex="0" role="button" aria-label="${escapeHtml(item.name)} maddesini aç" style="background:${item.color}">
        <header><span class="number-badge">${String(index + 1).padStart(2,"0")}</span><span class="category-badge">${escapeHtml(item.category)}</span></header>
        <div class="card-symbol" aria-hidden="true"><span>${escapeHtml(item.glyph)}</span><i>3B MODELİ İNCELE</i></div>
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

  function openQrModal(slug) {
    const targetSlug = slug || (state.currentItem ? state.currentItem.slug : data[0].slug);
    const item = data.find(e => e.slug === targetSlug) || data[0];
    const dialog = qs("#qrDialog");
    if (!dialog) return;

    qs("#qrDialogTitle").textContent = `${item.name} (${item.longName})`;
    qs("#qrDialogDesc").textContent = `Telefonunun kamerasını açıp bu karekodu okut; ${item.name} 3B modeli telefonunda anında açılsın!`;

    const qrUrl = getItemQrUrl(item.slug);
    const container = qs("#qrCodeContainer");
    const directUrlInput = qs("#qrDirectUrl");
    const downloadBtn = qs("#downloadQrBtn");
    const baseUrlInput = qs("#qrBaseUrlInput");
    const hostHint = qs("#qrHostHint");

    if (baseUrlInput) baseUrlInput.value = getEffectiveBaseUrl();
    const isChatGPT = location.hostname.includes("chatgpt.com") || location.hostname.includes("openai.com") || (window.self !== window.top);
    if (hostHint) {
      if (isChatGPT) {
        hostHint.textContent = "ChatGPT önizlemesindesin. Telefonun açması için canlı sitenin (Vercel vb.) linkini girebilirsin.";
      } else {
        hostHint.textContent = "Canlı site adresin";
      }
    }

    if (directUrlInput) directUrlInput.value = qrUrl;
    renderQrSvg(qrUrl, container, downloadBtn, item.slug);

    dialog.showModal();
  }

  function closeQrModal() {
    qs("#qrDialog")?.close();
  }

  function initEvents() {
    qsa("[data-route]").forEach(button => button.addEventListener("click", e => {
      e.preventDefault(); showView(button.dataset.route);
      if (button.dataset.route !== "detail") document.title = "TeknoSöz 3B — Teknoloji Sözlüğü";
    }));
    qsa(".qr-modal-trigger, .scan-trigger").forEach(button => button.addEventListener("click", () => openQrModal()));
    qsa("[data-category]").forEach(button => button.addEventListener("click", () => {
      state.category = button.dataset.category; renderFilters(); renderDictionary(); showView("dictionary");
    }));
    qs("#searchInput").addEventListener("input", e => { state.query = e.target.value; renderDictionary(); });
    document.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); showView("dictionary"); setTimeout(() => qs("#searchInput").focus(), 50); }
      if (e.key === "Escape" && qs("#qrDialog")?.open) closeQrModal();
    });
    qs("#closeQrDialog")?.addEventListener("click", closeQrModal);
    qs("#qrDialog")?.addEventListener("cancel", e => { e.preventDefault(); closeQrModal(); });
    qs("#saveQrBaseUrlBtn")?.addEventListener("click", () => {
      const val = qs("#qrBaseUrlInput")?.value.trim();
      if (val) {
        localStorage.setItem("teknosoz-live-url", val);
        showToast("Canlı site adresi kaydedildi! Karekod güncellendi.");
        openQrModal(state.currentItem ? state.currentItem.slug : data[0].slug);
        if (state.currentItem) openDetail(state.currentItem.slug, { push: false });
      } else {
        localStorage.removeItem("teknosoz-live-url");
        showToast("Varsayılan adrese dönüldü.");
        openQrModal(state.currentItem ? state.currentItem.slug : data[0].slug);
      }
    });
    qs("#copyQrUrlBtn")?.addEventListener("click", async () => {
      const url = qs("#qrDirectUrl")?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Karekod bağlantısı panoya kopyalandı!");
      } catch (_) {
        showToast("Bağlantı kopyalanamadı.");
      }
    });
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
