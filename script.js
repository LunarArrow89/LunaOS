const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DELTA_URL = "./delta.html";
const RAIN_URL = "https://www.rainymood.com/";
const PODCAST_DB_NAME = "lunaos-podcast-library";
const PODCAST_STORE = "episodes";
const ARMCHAIR_FEED_URL = "https://rss.art19.com/armchair-expert";
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


function openPodcast() {
  enterLunaFullscreen();
  const existing = state.windows.get("podcast");
  if (existing) {
    existing.element.style.display = "flex";
    focusWindow(existing.element);
    updateDock();
    return;
  }
  const win = document.createElement("section");
  win.className = "app-window podcast-window";
  win.dataset.window = "podcast";
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = `
    <div class="window-title">
      <span class="mini-glyph" aria-hidden="true">♫</span><strong>Uploaded Audio</strong>
      <button data-maximize title="Restore window" aria-label="Restore window">❐</button>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content podcast-content">
      <label class="podcast-upload" for="podcastFiles">＋ Upload audio file</label>
      <input id="podcastFiles" class="podcast-file-input" type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac,.opus" multiple>
      <p class="podcast-status" id="podcastStatus" role="status">Your uploaded audio files appear below.</p>
      <div id="podcastEpisodeList" class="podcast-episode-list"><p class="muted">Loading uploaded audio…</p></div>
    </div>`;
  $("#windows").appendChild(win);
  state.windows.set("podcast", { element: win, title: "Podcast Episodes", glyph: "〽" });
  makeDraggable(win);
  makeResizable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  setupPodcastLibrary(win);
  updateDock();
}

function openPodcastDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("This browser does not support local episode storage."));
    const request = indexedDB.open(PODCAST_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PODCAST_STORE)) db.createObjectStore(PODCAST_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open episode storage."));
  });
}

async function setupPodcastLibrary(win) {
  const status = $("#podcastStatus", win);
  const list = $("#podcastEpisodeList", win);
  const picker = $("#podcastFiles", win);
  let db;
  let activeAudioUrl = null;
  const setStatus = message => { status.textContent = message; };
  const loadEpisodes = () => new Promise((resolve, reject) => {
    const request = db.transaction(PODCAST_STORE, "readonly").objectStore(PODCAST_STORE).getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => a.addedAt - b.addedAt));
    request.onerror = () => reject(request.error);
  });
  const saveEpisode = episode => new Promise((resolve, reject) => {
    const request = db.transaction(PODCAST_STORE, "readwrite").objectStore(PODCAST_STORE).put(episode);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  const deleteEpisode = id => new Promise((resolve, reject) => {
    const request = db.transaction(PODCAST_STORE, "readwrite").objectStore(PODCAST_STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return "Audio episode";
    return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
  };
  const render = async () => {
    const episodes = await loadEpisodes();
    list.innerHTML = "";
    if (!episodes.length) {
      const empty = document.createElement("div");
      empty.className = "podcast-empty";
      empty.innerHTML = '<span aria-hidden="true">♫</span><strong>No episodes yet</strong><p>Choose one or more audio files above to build your library.</p>';
      list.appendChild(empty);
      return;
    }
    episodes.forEach(episode => {
      const row = document.createElement("article");
      row.className = "podcast-episode";
      const details = document.createElement("div");
      details.className = "podcast-episode-details";
      const title = document.createElement("strong");
      title.textContent = episode.title;
      const meta = document.createElement("small");
      meta.textContent = (episode.type || "Audio file") + " · " + formatBytes(episode.size);
      details.append(title, meta);
      const controls = document.createElement("div");
      controls.className = "podcast-episode-actions";
      const play = document.createElement("button");
      play.type = "button";
      play.className = "podcast-play";
      play.textContent = "▶ Play";
      play.addEventListener("click", () => {
        if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
        activeAudioUrl = URL.createObjectURL(episode.file);
        const audio = $("#podcastNowPlaying", win);
        audio.src = activeAudioUrl;
        // Keep the rain ambience running alongside podcast audio.
        startRainAudio();
        audio.play().then(() => {
          startRainAudio();
          setStatus("Playing: " + episode.title);
        }).catch(() => setStatus("Couldn't play this file. Try an MP3 or WAV file."));
        audio.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "podcast-remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        try {
          await deleteEpisode(episode.id);
          setStatus("Removed: " + episode.title);
          await render();
        } catch (error) { setStatus("Couldn't remove this episode."); }
      });
      controls.append(play, remove);
      row.append(details, controls);
      list.appendChild(row);
    });
  };
  try {
    db = await openPodcastDatabase();
    const player = document.createElement("audio");
    player.id = "podcastNowPlaying";
    player.controls = true;
    player.preload = "metadata";
    player.className = "podcast-player";
    player.setAttribute("aria-label", "Podcast episode player");
    list.before(player);
    picker.addEventListener("change", async () => {
      const files = [...picker.files].filter(file => file.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac|opus)$/i.test(file.name));
      if (!files.length) { setStatus("Choose audio files such as MP3, M4A, WAV, or OGG."); return; }
      try {
        for (const file of files) {
          await saveEpisode({
            id: (crypto.randomUUID ? crypto.randomUUID() : file.name + "-" + file.lastModified + "-" + file.size),
            title: file.name.replace(/\.[^.]+$/, ""),
            type: file.type || "Audio file",
            size: file.size,
            addedAt: Date.now(),
            file
          });
        }
        setStatus("Added " + files.length + (files.length === 1 ? " episode." : " episodes."));
        picker.value = "";
        await render();
      } catch (error) {
        setStatus("Couldn't save the files. They may be too large or browser storage may be full.");
      }
    });
    await render();
  } catch (error) {
    setStatus(error.message || "Episode storage is unavailable in this browser.");
    list.innerHTML = '<p class="muted">Could not load your local episode library. Try a browser that supports IndexedDB.</p>';
  }
  win.addEventListener("remove", () => { if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl); });
}


function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
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
    button.textContent = (record.glyph || "◇") + " " + record.title;
    button.title = "Show or minimize " + record.title;
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
  if (event.target.closest("#podcastIcon")) {
    openPodcast();
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
    if (win.dataset.window !== "delta") {
      if (win.dataset.window === "podcast" && pageFullscreen) {
        win.classList.add("is-maximized");
        win.style.left = ""; win.style.top = ""; win.style.width = ""; win.style.height = "";
      } else if (win.dataset.window === "podcast" && !pageFullscreen && win.classList.contains("is-maximized")) {
        win.classList.remove("is-maximized");
        win.style.left = "8%"; win.style.top = "8%"; win.style.width = "min(760px, 84%)"; win.style.height = "min(620px, 82%)";
      }
      if (win.dataset.window === "podcast") updateMaximizeButton(win);
      return;
    }
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
  audio.loop = true;
  audio.muted = false;
  audio.volume = 0.45;
  // Rain is a separate audio stream from podcasts and other app sounds.
  // Never pause it just because another audio player starts.
  if (audio.paused) {
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") attempt.catch(() => {
      // Browsers may block autoplay until the visitor interacts.
    });
  }
}
// If the browser or a page lifecycle event pauses the ambience, try again
// after the next user interaction. Starting a podcast also explicitly calls
// startRainAudio(), so both streams can play at the same time.
const rainAudio = $("#lunaRainAudio");
if (rainAudio) {
  rainAudio.addEventListener("pause", () => {
    if (!document.hidden) startRainAudio();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) startRainAudio();
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
