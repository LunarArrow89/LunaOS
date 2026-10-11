const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DELTA_URL = "./delta.html";
const RAIN_URL = "https://www.rainymood.com/";
const state = { windows: new Map(), zIndex: 10 };

function enterLunaFullscreen() {
  // Fullscreen the LunaOS page itself so Chrome's browser bars hide,
  // while LunaOS's own taskbar remains visible.
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function openDelta() {
  enterLunaFullscreen();
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
  makeResizable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  updateDock();
}

function makeResizable(win) {
  const parent = $("#windows");
  const edges = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  edges.forEach(edge => {
    const handle = document.createElement("div");
    handle.className = "window-resize-handle " + edge;
    handle.setAttribute("aria-label", "Resize window from " + edge);
    handle.addEventListener("pointerdown", event => {
      if (win.classList.contains("is-maximized")) return;
      event.preventDefault();
      event.stopPropagation();
      focusWindow(win);
      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = win.offsetWidth;
      const startHeight = win.offsetHeight;
      const startLeft = win.offsetLeft;
      const startTop = win.offsetTop;
      const bounds = parent.getBoundingClientRect();
      const minWidth = 280;
      const minHeight = 220;

      const move = moveEvent => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        let width = startWidth;
        let height = startHeight;
        let left = startLeft;
        let top = startTop;

        if (edge.includes("e")) width = Math.min(bounds.width - startLeft, startWidth + dx);
        if (edge.includes("s")) height = Math.min(bounds.height - startTop, startHeight + dy);
        if (edge.includes("w")) {
          width = Math.min(startWidth - dx, startLeft + startWidth);
          left = startLeft + startWidth - width;
        }
        if (edge.includes("n")) {
          height = Math.min(startHeight - dy, startTop + startHeight);
          top = startTop + startHeight - height;
        }

        width = Math.max(minWidth, width);
        height = Math.max(minHeight, height);
        left = Math.max(0, Math.min(bounds.width - width, left));
        top = Math.max(0, Math.min(bounds.height - height, top));
        win.style.width = width + "px";
        win.style.height = height + "px";
        win.style.left = left + "px";
        win.style.top = top + "px";
      };
      const stop = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    });
    win.appendChild(handle);
  });
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
    const isFullscreen = document.fullscreenElement === document.documentElement;

    if (isFullscreen) {
      // Restore Delta- to a movable, resizable window within LunaOS.
      document.exitFullscreen().catch(() => {});
      win.classList.remove("is-maximized");
      win.style.left = "5%";
      win.style.top = "5%";
      win.style.width = "min(900px, 90%)";
      win.style.height = "min(650px, 85%)";
    } else {
      // Re-enter fullscreen for LunaOS itself, keeping its taskbar on screen.
      win.classList.add("is-maximized");
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          win.classList.remove("is-maximized");
          win.style.left = "5%";
          win.style.top = "5%";
          win.style.width = "min(900px, 90%)";
          win.style.height = "min(650px, 85%)";
        });
      }
    }
    updateMaximizeButton(win);
    return;
  }
  const minimize = event.target.closest("[data-minimize]");
  if (minimize) {
    minimize.closest(".app-window").style.display = "none";
    updateDock();
  }
});

function updateMaximizeButton(win) {
  const button = $("[data-maximize]", win);
  if (!button) return;
  const maximized = win.classList.contains("is-maximized");
  button.textContent = maximized ? "❐" : "□";
  button.title = document.fullscreenElement === document.documentElement ? "Restore resizable window" : "Enter fullscreen";
  button.setAttribute("aria-label", button.title);
}

document.addEventListener("fullscreenchange", () => {
  const pageFullscreen = document.fullscreenElement === document.documentElement;
  document.body.classList.toggle("luna-fullscreen", pageFullscreen);
  $$(".app-window").forEach(win => {
    if (win.dataset.window !== "delta") return;
    if (pageFullscreen) {
      win.classList.add("is-maximized");
      win.style.left = "";
      win.style.top = "";
      win.style.width = "";
      win.style.height = "";
    } else {
      win.classList.remove("is-maximized");
      // Only set a default size if it was previously maximized.
      if (!win.style.width || win.style.width === "100%") {
        win.style.left = "5%";
        win.style.top = "5%";
        win.style.width = "min(900px, 90%)";
        win.style.height = "min(650px, 85%)";
      }
    }
    updateMaximizeButton(win);
  });
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


// Always-on rain audio and animated rain overlay.
function startRainAudio() {
  const audio = $("#lunaRainAudio");
  if (!audio) return;
  audio.volume = 0.45;
  const attempt = audio.play();
  if (attempt && typeof attempt.catch === "function") attempt.catch(() => {
    // Browsers block audible autoplay until the visitor interacts. Retry
    // silently in the background after the first normal interaction.
  });
}
function setupRainEffects() {
  const canvas = $("#rainEffects");
  const desktop = $(".desktop");
  if (!canvas || !desktop) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let width = 0, height = 0, drops = [];
  const resize = () => {
    const rect = desktop.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(150, Math.max(45, Math.floor(width / 8)));
    drops = Array.from({length: count}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 8 + Math.random() * 17,
      speed: 3 + Math.random() * 5,
      drift: -1.1 - Math.random() * 1.2,
      opacity: 0.12 + Math.random() * 0.24
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    for (const drop of drops) {
      ctx.strokeStyle = "rgba(100, 130, 151, " + drop.opacity + ")";
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.drift * 2, drop.y + drop.length);
      ctx.stroke();
      drop.x += drop.drift;
      drop.y += drop.speed;
      if (drop.y > height + drop.length || drop.x < -20) {
        drop.x = Math.random() * (width + 30);
        drop.y = -drop.length - Math.random() * height * 0.15;
      }
    }
    requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener("resize", resize);
  draw();
}
startRainAudio();
setupRainEffects();
document.addEventListener("pointerdown", startRainAudio, { once: true });
document.addEventListener("keydown", startRainAudio, { once: true });
