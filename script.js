const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DELTA_URL = "https://lunararrow89.github.io/Delta-/";
const RAIN_URL = "https://www.rainymood.com/";
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
  win.className = "app-window is-maximized";
  win.dataset.window = "delta";
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = `
    <div class="window-title">
      <span class="mini-glyph">◇</span><strong>Delta-</strong>
      <button data-maximize title="Restore window" aria-label="Restore window">❐</button>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content delta-content">
      <iframe class="delta-frame" src="${DELTA_URL}" title="Delta- coding app" allow="fullscreen" loading="eager"></iframe>
    </div>`;

  $("#windows").appendChild(win);
  state.windows.set("delta", { element: win, title: "Delta-" });
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
    button.textContent = "◇ " + record.title;
    button.title = "Show or minimize Delta-";
    const isVisible = record.element.style.display !== "none";
    button.className = isVisible ? "selected" : "minimized";
    button.setAttribute("aria-label", isVisible ? record.title + " window is open" : record.title + " window is minimized");
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
  if (event.target.closest("#rainSounds")) {
    window.open(RAIN_URL, "_blank", "noopener");
    return;
  }
  if (event.target.closest("#openDelta, #deltaIcon, #home")) {
    openDelta();
    return;
  }
  const close = event.target.closest("[data-close]");
  if (close) {
    closeApp(close.closest(".app-window").dataset.window);
    return;
  }
  const maximize = event.target.closest("[data-maximize]");
  if (maximize) {
    const win = maximize.closest(".app-window");
    win.classList.toggle("is-maximized");
    const maximized = win.classList.contains("is-maximized");
    maximize.textContent = maximized ? "❐" : "□";
    maximize.title = maximized ? "Restore window" : "Maximize window";
    maximize.setAttribute("aria-label", maximize.title);
    if (maximized) {
      win.style.left = "";
      win.style.top = "";
      win.style.width = "";
      win.style.height = "";
    }
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
