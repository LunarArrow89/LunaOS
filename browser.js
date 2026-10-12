function openBrowser() {
  const existing = state.windows.get("browser");
  if (existing) { existing.element.style.display = "flex"; focusWindow(existing.element); updateDock(); return; }
  const win = document.createElement("section");
  win.className = "app-window luna-browser-window"; win.dataset.window = "browser"; win.style.zIndex = ++state.zIndex;
  win.innerHTML = [
    '<div class="window-title"><span class="mini-glyph">◎</span><strong>Luna Browser</strong><button data-minimize title="Minimize">−</button><button class="close" data-close title="Close">×</button></div>',
    '<div class="browser-toolbar"><button type="button" data-browser-back title="Back">←</button><button type="button" data-browser-forward title="Forward">→</button><button type="button" data-browser-refresh title="Refresh">↻</button>',
    '<form class="browser-address-form" data-browser-form><span>⌕</span><input data-browser-address aria-label="Website address" placeholder="Search or enter a website address"><button type="submit">Go</button></form><button type="button" data-browser-new-tab title="Open in a normal browser tab">↗</button></div>',
    '<div class="browser-page-wrap"><div class="browser-home" data-browser-home><div class="browser-home-mark">◎</div><p class="browser-kicker">YOUR LITTLE WINDOW TO THE WEB</p><h2>Where to?</h2>',
    '<form data-browser-home-form class="browser-home-form"><input data-browser-home-address aria-label="Search or enter a website address" placeholder="Search or enter a website address"><button type="submit">Go ↗</button></form>',
    '<div class="browser-shortcuts"><button type="button" data-browser-shortcut="https://chatgpt.com/"><span>✳</span>ChatGPT</button><button type="button" data-browser-shortcut="https://www.google.com/"><span>G</span>Google</button><button type="button" data-browser-shortcut="https://www.youtube.com/"><span>▶</span>YouTube</button><button type="button" data-browser-shortcut="https://github.com/"><span>◆</span>GitHub</button></div><p class="browser-hint">Some websites block being displayed inside other websites. Use ↗ to open them normally.</p></div>',
    '<iframe class="browser-frame" data-browser-frame title="Luna Browser webpage" hidden></iframe><div class="browser-blocked" data-browser-blocked hidden><div class="browser-blocked-mark">↗</div><h2>ChatGPT opens in its own tab.</h2><p>ChatGPT blocks its sign-in and chat pages from being embedded in LunaOS. Open it in a regular browser tab to use it normally.</p><button type="button" data-browser-open-external>Open this website in a new tab ↗</button></div></div>'
  ].join("");
  $("#windows").appendChild(win); state.windows.set("browser", {element:win,title:"Luna Browser",glyph:"◎"});
  makeDraggable(win); makeResizable(win); win.addEventListener("pointerdown", () => focusWindow(win));
  const address = $("[data-browser-address]",win), homeAddress = $("[data-browser-home-address]",win), frame = $("[data-browser-frame]",win), home = $("[data-browser-home]",win), blocked = $("[data-browser-blocked]",win), back = $("[data-browser-back]",win), forward = $("[data-browser-forward]",win);
  const history = []; let historyIndex = -1, currentUrl = "";
  function navigate(value, record = true) {
    const raw = value.trim(); if (!raw) return;
    let url; if (raw.toLowerCase().startsWith("https://") || raw.toLowerCase().startsWith("http://")) url = raw; else if (raw.includes(".") && !/\s/.test(raw)) url = "https://" + raw; else url = "https://www.google.com/search?q=" + encodeURIComponent(raw);
    currentUrl=url; address.value=url; homeAddress.value=url; home.hidden=true;
    const host = new URL(url).hostname.toLowerCase(), isChatGPT = host === "chatgpt.com" || host.endsWith(".chatgpt.com");
    blocked.hidden=!isChatGPT; frame.hidden=isChatGPT; frame.src=url;
    if(record){history.splice(historyIndex+1);history.push(url);historyIndex=history.length-1;}
    back.disabled=historyIndex<=0;forward.disabled=historyIndex>=history.length-1;
  }
  $("[data-browser-form]",win).addEventListener("submit",e=>{e.preventDefault();navigate(address.value);});
  $("[data-browser-home-form]",win).addEventListener("submit",e=>{e.preventDefault();navigate(homeAddress.value);});
  $$("[data-browser-shortcut]",win).forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.browserShortcut)));
  back.disabled=true;forward.disabled=true;
  back.addEventListener("click",()=>{if(historyIndex>0){historyIndex--;navigate(history[historyIndex],false);back.disabled=historyIndex<=0;forward.disabled=historyIndex>=history.length-1;}});
  forward.addEventListener("click",()=>{if(historyIndex<history.length-1){historyIndex++;navigate(history[historyIndex],false);back.disabled=historyIndex<=0;forward.disabled=historyIndex>=history.length-1;}});
  $("[data-browser-refresh]",win).addEventListener("click",()=>{if(currentUrl)frame.src=currentUrl;else{home.hidden=false;frame.hidden=true;blocked.hidden=true;}});
  const external=()=>{if(currentUrl)window.open(currentUrl,"_blank","noopener,noreferrer");};
  $("[data-browser-new-tab]",win).addEventListener("click",external);$("[data-browser-open-external]",win).addEventListener("click",external);
  updateDock();
}