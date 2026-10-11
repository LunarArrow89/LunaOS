const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DELTA_URL = "https://github.com/LunarArrow89/Delta-/";
const state = { windows: new Map(), zIndex: 10 };

function openDelta() {
  const existing = state.windows.get("delta");
  if (existing) {
    existing.element.style.display = "flex";
    focusWindow(existing.element);
    updateDock();
    return;
  }
  const win = document.createElement("section");
  win.className = "app-window";
  win.dataset.window = "delta";
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = `
    <div class="window-title">
      <span class="mini-glyph">◇</span><strong>Delta-</strong>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content delta-content">
      <div class="delta-heading"><span class="delta-symbol">◇</span><div><h2>Delta-</h2><p>Your coding project</p></div></div>
      <p>Open your Delta- repository in its own window.</p>
      <button class="action-button" id="launchDeltaWindow">Open Delta- window ↗</button>
      <p class="muted">GitHub does not allow its repository page to be embedded inside another app, so Delta- opens in a separate window.</p>
    </div>`;
  $("#windows").appendChild(win);
  state.windows.set("delta", { element: win, title: "Delta-" });
  makeDraggable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  updateDock();
}

function launchDeltaWindow() {
  const opened = window.open(DELTA_URL, "_blank", "popup,width=1200,height=800,resizable=yes,scrollbars=yes");
  if (!opened) alert("The window was blocked. Allow pop-ups for LunaOS, then try again.");
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
    button.textContent = "◇ " + record.title;
    button.title = "Show or minimize Delta-";
    button.className = record.element.style.display !== "none" ? "selected" : "";
    button.addEventListener("click", () => {
      if (record.element.style.display === "none") {
        record.element.style.display = "flex";
        focusWindow(record.element);
      } else if (record.element.classList.contains("active")) {
        record.element.style.display = "none";
      } else {
        focusWindow(record.element);
      }
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
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left - parent.left;
    startTop = rect.top - parent.top;
    bar.setPointerCapture(event.pointerId);
  });
  bar.addEventListener("pointermove", event => {
    if (!moving) return;
    const parent = $("#windows").getBoundingClientRect();
    win.style.left = Math.max(0, Math.min(parent.width - win.offsetWidth, startLeft + event.clientX - startX)) + "px";
    win.style.top = Math.max(0, Math.min(parent.height - 60, startTop + event.clientY - startY)) + "px";
  });
  const stop = () => moving = false;
  bar.addEventListener("pointerup", stop);
  bar.addEventListener("pointercancel", stop);
}

document.addEventListener("click", event => {
  if (event.target.closest("#openDelta, #deltaIcon, #home")) {
    openDelta();
    return;
  }
  if (event.target.closest("#launchDeltaWindow")) {
    launchDeltaWindow();
    return;
  }
  const close = event.target.closest("[data-close]");
  if (close) {
    closeApp(close.closest(".app-window").dataset.window);
    return;
  }
  const minimize = event.target.closest("[data-minimize]");
  if (minimize) {
    minimize.closest(".app-window").style.display = "none";
    updateDock();
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
localStorage.removeItem("hearth-app-links");
