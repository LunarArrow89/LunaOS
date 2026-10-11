const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const APP_INFO = {
  notes: { title: "Notes", glyph: "📔", kind: "notes" },
  games: { title: "My Games", glyph: "🎮", kind: "category" },
  projects: { title: "Projects", glyph: "🪴", kind: "category" },
  library: { title: "App Library", glyph: "🧺", kind: "library" },
  settings: { title: "Settings", glyph: "⚙️", kind: "settings" }
};

const state = {
  notes: localStorage.getItem("hearth-notes") || "",
  links: JSON.parse(localStorage.getItem("hearth-app-links") || "[]"),
  windows: new Map(),
  zIndex: 10
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
function appIcon(app) {
  const info = APP_INFO[app] || { glyph: "🌱" };
  return info.glyph;
}
function appContent(app) {
  if (app === "notes") return `
    <h2>A little notebook</h2>
    <p>Your ideas are saved in this browser on this Chromebook.</p>
    <label class="field-label" for="notesText">YOUR NOTES</label>
    <textarea id="notesText" class="text-area" placeholder="Something wonderful starts here...">${escapeHTML(state.notes)}</textarea>
    <button class="action-button" id="saveNote">Save notes</button>
    <span id="savedMessage" class="muted" style="margin-left:9px"></span>`;
  if (app === "games" || app === "projects" || app === "library") {
    const matching = state.links.map((link, index) => ({...link, index}))
      .filter(link => app === "library" || link.category === app);
    return `
      <h2>${app === "games" ? "My Games 🎮" : app === "projects" ? "My Projects 🪴" : "App Library 🧺"}</h2>
      <p>${app === "games" ? "Your games, all gathered in one cozy place." : app === "projects" ? "Your creative and coding projects." : "Add websites for your own apps. Apps that allow embedding can open right inside a window here."}</p>
      <div class="panel"><strong>Want to add an app?</strong><p>Open App Library or use the form below to add a website link.</p>
      ${app !== "library" ? '<button class="action-button" data-open-app="library">Open App Library</button>' : ""}
      </div>
      <div class="app-list">${renderAppRows(matching)}</div>
      ${app === "library" ? `
        <h3>Add a website app</h3>
        <label class="field-label" for="newAppName">APP NAME</label>
        <input id="newAppName" class="text-field" placeholder="My game or project">
        <label class="field-label" for="newAppUrl">WEBSITE URL</label>
        <input id="newAppUrl" class="text-field" placeholder="https://yourname.github.io/project/">
        <label class="field-label" for="newAppCategory">CATEGORY</label>
        <select id="newAppCategory" class="text-field">
          <option value="games">Game</option><option value="projects">Project</option><option value="other">Other app</option>
        </select>
        <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;color:#857966"><input type="checkbox" id="embedApp" checked> Try to open inside a Hearth OS window</label>
        <button class="action-button" id="addApp">Add app</button>
        <p class="muted">Some websites block being embedded. If that happens, use Open in new tab.</p>` : ""}`;
  }
  if (app === "settings") return `
    <h2>Settings & little comforts</h2>
    <p>Hearth OS is a website, so these settings affect this browser on this device.</p>
    <div class="panel"><strong>Startup</strong><p>To open Hearth OS whenever Chrome starts, visit <b>chrome://settings/onStartup</b> and choose “Open a specific page or set of pages.” Add your GitHub Pages URL.</p></div>
    <div class="panel"><strong>Saved information</strong><p>Your Notes and app links use browser storage. They stay in this browser unless its site data is cleared.</p><button class="action-button" id="clearLocalData">Clear saved notes and app links</button></div>
    <p class="muted">Hearth OS · A cozy browser desktop</p>`;
  return `<h2>Welcome home ☕</h2><p>This is your own little browser desktop. Click the icons, open your apps, and make yourself at home.</p>
    <div class="panel"><strong>Welcome to Hearth OS</strong><p>Move windows by dragging their title bars. Minimize them to the taskbar, or close them when you're done.</p></div>
    <div class="app-launch-grid">
      <button class="app-tile" data-open-app="notes"><span class="icon notes-icon">📔</span>Notes</button>
      <button class="app-tile" data-open-app="games"><span class="icon games-icon">🎮</span>My Games</button>
      <button class="app-tile" data-open-app="projects"><span class="icon projects-icon">🪴</span>Projects</button>
      <button class="app-tile" data-open-app="library"><span class="icon library-icon">🧺</span>App Library</button>
    </div>`;
}
function renderAppRows(items) {
  if (!items.length) return '<div class="panel muted">Nothing here yet. Add an app in App Library.</div>';
  return items.map(link => `
    <div class="app-row">
      <div class="row-name"><strong>${escapeHTML(link.name)}</strong><small>${escapeHTML(link.url)}</small></div>
      <button data-launch-link="${link.index}">Open</button>
      <button class="remove-link" data-remove-link="${link.index}" title="Remove app">×</button>
    </div>`).join("");
}
function openApp(app) {
  if (app === "welcome") app = "welcome";
  if (!APP_INFO[app] && app !== "welcome") return;
  $("#launcher").classList.add("hidden");
  const old = state.windows.get(app);
  if (old) {
    old.element.style.display = "flex";
    focusWindow(old.element);
    updateDock();
    return;
  }
  const title = app === "welcome" ? "Welcome home" : APP_INFO[app].title;
  const win = document.createElement("section");
  win.className = "app-window";
  win.dataset.window = app;
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = `
    <div class="window-title">
      <span class="mini-glyph">${app === "welcome" ? "☕" : appIcon(app)}</span>
      <strong>${title}</strong>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content">${appContent(app)}</div>`;
  $("#windows").appendChild(win);
  state.windows.set(app, { element: win });
  makeDraggable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  updateDock();
}
function focusWindow(win) {
  $$(".app-window").forEach(item => item.classList.remove("active"));
  win.classList.add("active");
  win.style.zIndex = ++state.zIndex;
}
function closeApp(app) {
  const record = state.windows.get(app);
  if (!record) return;
  record.element.remove();
  state.windows.delete(app);
  updateDock();
}
function updateDock() {
  const holder = $("#openApps");
  holder.innerHTML = "";
  for (const [app, record] of state.windows) {
    const button = document.createElement("button");
    button.textContent = (app === "welcome" ? "☕ Welcome" : appIcon(app) + " " + APP_INFO[app].title);
    button.title = "Show or minimize " + button.textContent;
    button.className = record.element.style.display !== "none" ? "selected" : "";
    button.addEventListener("click", () => {
      if (record.element.style.display === "none") {
        record.element.style.display = "flex";
        focusWindow(record.element);
      } else if (record.element.classList.contains("active")) {
        record.element.style.display = "none";
      } else focusWindow(record.element);
      updateDock();
    });
    holder.appendChild(button);
  }
}
function makeDraggable(win) {
  const bar = $(".window-title", win);
  let moving = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  bar.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    moving = true;
    focusWindow(win);
    const rect = win.getBoundingClientRect();
    const parent = $("#windows").getBoundingClientRect();
    startX = event.clientX; startY = event.clientY;
    startLeft = rect.left - parent.left; startTop = rect.top - parent.top;
    bar.setPointerCapture(event.pointerId);
  });
  bar.addEventListener("pointermove", event => {
    if (!moving) return;
    const parent = $("#windows").getBoundingClientRect();
    const left = Math.max(0, Math.min(parent.width - win.offsetWidth, startLeft + event.clientX - startX));
    const top = Math.max(0, Math.min(parent.height - 60, startTop + event.clientY - startY));
    win.style.left = left + "px"; win.style.top = top + "px";
  });
  const stop = () => moving = false;
  bar.addEventListener("pointerup", stop);
  bar.addEventListener("pointercancel", stop);
}
function saveLinks() { localStorage.setItem("hearth-app-links", JSON.stringify(state.links)); }
function launchLink(index) {
  const link = state.links[index];
  if (!link) return;
  if (link.embed) {
    const key = "webapp-" + index;
    const existing = state.windows.get(key);
    if (existing) { existing.element.style.display = "flex"; focusWindow(existing.element); updateDock(); return; }
    const win = document.createElement("section");
    win.className = "app-window"; win.dataset.window = key; win.style.zIndex = ++state.zIndex;
    win.innerHTML = `<div class="window-title"><span class="mini-glyph">🌐</span><strong>${escapeHTML(link.name)}</strong><button data-minimize title="Minimize">−</button><button class="close" data-close title="Close">×</button></div><div class="window-content" style="padding:0"><iframe class="embedded-app" title="${escapeHTML(link.name)}" src="${escapeHTML(link.url)}" referrerpolicy="no-referrer"></iframe></div>`;
    $("#windows").appendChild(win);
    state.windows.set(key, { element: win });
    makeDraggable(win); win.addEventListener("pointerdown", () => focusWindow(win)); updateDock();
  } else window.open(link.url, "_blank", "noopener,noreferrer");
}
document.addEventListener("click", event => {
  const appButton = event.target.closest("[data-app], [data-open-app]");
  if (appButton) { openApp(appButton.dataset.app || appButton.dataset.openApp); return; }

  const close = event.target.closest("[data-close]");
  if (close) { closeApp(close.closest(".app-window").dataset.window); return; }
  const minimize = event.target.closest("[data-minimize]");
  if (minimize) {
    const win = minimize.closest(".app-window");
    win.style.display = "none"; updateDock(); return;
  }
  if (event.target.id === "saveNote") {
    const win = event.target.closest(".app-window");
    state.notes = $("#notesText", win).value;
    localStorage.setItem("hearth-notes", state.notes);
    $("#savedMessage", win).textContent = "Saved ♡"; return;
  }
  if (event.target.id === "addApp") {
    const name = $("#newAppName").value.trim();
    let url = $("#newAppUrl").value.trim();
    const category = $("#newAppCategory").value;
    const embed = $("#embedApp").checked;
    if (!name || !url) { alert("Please enter an app name and URL."); return; }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { const parsed = new URL(url); if (!["https:", "http:"].includes(parsed.protocol)) throw new Error(); }
    catch { alert("Please enter a valid website URL."); return; }
    state.links.push({ name, url, category, embed }); saveLinks();
    const win = event.target.closest(".app-window");
    win.querySelector(".window-content").innerHTML = appContent("library");
    return;
  }
  const launch = event.target.closest("[data-launch-link]");
  if (launch) { launchLink(Number(launch.dataset.launchLink)); return; }
  const remove = event.target.closest("[data-remove-link]");
  if (remove) {
    state.links.splice(Number(remove.dataset.removeLink), 1); saveLinks();
    const app = remove.closest(".app-window")?.dataset.window;
    if (app && APP_INFO[app]) {
      const content = $(".window-content", remove.closest(".app-window"));
      content.innerHTML = appContent(app);
    }
    return;
  }
  if (event.target.id === "clearLocalData") {
    if (confirm("Clear saved Hearth OS notes and app links on this device?")) {
      localStorage.removeItem("hearth-notes");
      localStorage.removeItem("hearth-app-links");
      state.notes = ""; state.links = [];
      alert("Saved notes and app links have been cleared.");
    }
    return;
  }
});
$("#home").addEventListener("click", () => $("#launcher").classList.toggle("hidden"));
$("#exploreButton").addEventListener("click", () => openApp("welcome"));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") $("#launcher").classList.add("hidden");
  if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
    event.preventDefault(); $("#launcher").classList.toggle("hidden");
  }
});
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("#clock").textContent = time;
  $("#taskbarClock").textContent = time;
  $("#taskbarClock").title = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
updateClock();
setInterval(updateClock, 30000);
