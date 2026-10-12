function openBrowser() {
  const existing = state.windows.get("browser");
  if (existing) { existing.element.style.display = "flex"; focusWindow(existing.element); updateDock(); return; }
  const win = document.createElement("section");
  win.className = "app-window luna-browser-window";
  win.dataset.window = "browser";
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = [
    '<div class="window-title"><span class="mini-glyph">☾</span><strong>Luna Browser</strong><button data-minimize title="Minimize">−</button><button class="close" data-close title="Close">×</button></div>',
    '<div class="browser-toolbar"><button type="button" data-browser-back title="Back">←</button><button type="button" data-browser-forward title="Forward">→</button><button type="button" data-browser-refresh title="Refresh">↻</button>',
    '<form class="browser-address-form" data-browser-form><span>⌕</span><input data-browser-address aria-label="Search or enter a website address" placeholder="Search the web or enter a URL"><button type="submit">Go</button></form><button type="button" data-browser-new-tab title="Open current page in a normal browser tab">↗</button></div>',
    '<div class="browser-page-wrap">',
    '<div class="browser-home" data-browser-home><div class="browser-home-mark">☾</div><p class="browser-kicker">LUNA SEARCH</p><h2>What are we looking for?</h2>',
    '<form data-browser-home-form class="browser-home-form"><input data-browser-home-address aria-label="Search the web" placeholder="Search the web..."><button type="submit">Search ↗</button></form>',
    '<p class="browser-hint">Enter a website address or search the web.</p><div data-luna-results class="luna-results" aria-live="polite"></div></div>',
    '<iframe class="browser-frame" data-browser-frame title="Luna Browser webpage" hidden></iframe>',
    '<div class="browser-blocked" data-browser-blocked hidden><div class="browser-blocked-mark">↗</div><h2>This site needs its own tab.</h2><p>This website blocks embedded viewing. You can still open it normally in a new tab.</p><button type="button" data-browser-open-external>Open this website in a new tab ↗</button></div></div>'
  ].join("");
  $("#windows").appendChild(win);
  state.windows.set("browser", {element:win,title:"Luna Browser",glyph:"☾"});
  makeDraggable(win); makeResizable(win); win.addEventListener("pointerdown", () => focusWindow(win));
  const address = $("[data-browser-address]",win);
  const homeAddress = $("[data-browser-home-address]",win);
  const frame = $("[data-browser-frame]",win);
  const home = $("[data-browser-home]",win);
  const blocked = $("[data-browser-blocked]",win);
  const results = $("[data-luna-results]",win);
  const back = $("[data-browser-back]",win), forward = $("[data-browser-forward]",win);
  const history = [];
  let historyIndex = -1, currentUrl = "", lastSearch = "";
  function addHistory(value, record) {
    if (!record) return;
    history.splice(historyIndex + 1);
    history.push(value);
    historyIndex = history.length - 1;
    back.disabled = historyIndex <= 0;
    forward.disabled = historyIndex >= history.length - 1;
  }
  function showResultsMessage(message) {
    results.replaceChildren();
    const p = document.createElement("p");
    p.className = "browser-hint";
    p.textContent = message;
    results.appendChild(p);
  }
  function addResult(title, description, url) {
    if (!url || !/^https?:\/\//i.test(url)) return;
    const card = document.createElement("article");
    card.className = "luna-result";
    const link = document.createElement("a");
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.textContent = title || url;
    const desc = document.createElement("p");
    desc.textContent = description || "";
    card.append(link, desc);
    results.appendChild(card);
  }
  function addSearchResult(title, description, url) {
    if (!url || !/^https?:\/\//i.test(url)) return;
    const card = document.createElement("article");
    card.className = "luna-result";
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = title || url;
    const desc = document.createElement("p");
    desc.textContent = description || "";
    card.append(link, desc);
    results.appendChild(card);
  }
  function addWebSearchLinks(query) {
    const links = document.createElement("div");
    links.className = "luna-web-links";
    const startpage = document.createElement("a");
    startpage.href = "https://www.startpage.com/do/dsearch?q=" + encodeURIComponent(query) + "&cat=web&language=english";
    startpage.target = "_blank";
    startpage.rel = "noopener noreferrer";
    startpage.textContent = "Full web results on Startpage ↗";
    const duck = document.createElement("a");
    duck.href = "https://duckduckgo.com/?q=" + encodeURIComponent(query);
    duck.target = "_blank";
    duck.rel = "noopener noreferrer";
    duck.textContent = "Full web results on DuckDuckGo ↗";
    links.append(startpage, duck);
    results.appendChild(links);
  }
  function searchLuna(query) {
    const q = String(query || "").trim();
    if (!q) return;
    lastSearch = q;
    const searchUrl = "https://duckduckgo.com/?q=" + encodeURIComponent(q);
    navigate(searchUrl);
  }
  function navigate(value, record = true) {
    const raw = String(value || "").trim();
    if (!raw) return;
    const looksLikeUrl = /^(https?:\/\/)/i.test(raw) || (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(raw) && !/\s/.test(raw));
    if (!looksLikeUrl) {
      addHistory(raw, record);
      searchLuna(raw);
      return;
    }
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch (_) { showResultsMessage("That address doesn't look valid."); home.hidden = false; return; }
    currentUrl = url; address.value = url; homeAddress.value = url;
    home.hidden = true;
    const isBlockedKnown = host === "chatgpt.com" || host.endsWith(".chatgpt.com") || host === "startpage.com" || host.endsWith(".startpage.com");
    blocked.hidden = !isBlockedKnown; frame.hidden = isBlockedKnown;
    if (!isBlockedKnown) frame.src = url;
    addHistory(raw, record);
  }
  $("[data-browser-form]",win).addEventListener("submit",e=>{e.preventDefault();navigate(address.value);});
  $("[data-browser-home-form]",win).addEventListener("submit",e=>{e.preventDefault();searchLuna(homeAddress.value);addHistory(homeAddress.value,true);});
  back.disabled = true; forward.disabled = true;
  back.addEventListener("click",()=>{if(historyIndex>0){historyIndex--;navigate(history[historyIndex],false);back.disabled=historyIndex<=0;forward.disabled=historyIndex>=history.length-1;}});
  forward.addEventListener("click",()=>{if(historyIndex<history.length-1){historyIndex++;navigate(history[historyIndex],false);back.disabled=historyIndex<=0;forward.disabled=historyIndex>=history.length-1;}});
  $("[data-browser-refresh]",win).addEventListener("click",()=>{if(currentUrl){frame.src=currentUrl;}else if(lastSearch){searchLuna(lastSearch);}else{home.hidden=false;frame.hidden=true;blocked.hidden=true;}});
  const external=()=>{if(currentUrl) window.open(currentUrl,"_blank","noopener,noreferrer"); else if(lastSearch) window.open("https://www.startpage.com/do/dsearch?q="+encodeURIComponent(lastSearch)+"&cat=web&language=english","_blank","noopener,noreferrer");};
  $("[data-browser-new-tab]",win).addEventListener("click",external);
  $("[data-browser-open-external]",win).addEventListener("click",external);
  updateDock();
}
