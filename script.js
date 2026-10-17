
const $ = (selector, root = document) => root.querySelector(selector);

// Front-end password gate with a two-minute lockout after five wrong attempts.
// This is a convenience screen, not secure authentication.
function setupPasswordGate() {
  const gate = $("#passwordGate");
  const form = $("#passwordForm");
  const input = $("#osPassword");
  const error = $("#passwordError");
  const submit = form?.querySelector('button[type="submit"]');
  if (!gate || !form || !input || !error || !submit) return;

  // Require the password once per local calendar day, then remember today's unlock.
  const DAILY_UNLOCK_KEY = "lunaos-password-unlocked-date";
  const getLocalDateKey = () => {
    const now = new Date();
    return now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");
  };
  try {
    if (localStorage.getItem(DAILY_UNLOCK_KEY) === getLocalDateKey()) {
      gate.remove();
      document.body.classList.add("os-unlocked");
      startRainAudio();
      return;
    }
  } catch (storageError) {}

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 2 * 60 * 1000;
  const LOCKOUT_KEY = "lunaos-password-locked-until";
  const ATTEMPTS_KEY = "lunaos-password-attempts";
  let attempts = 0;
  let lockedUntil = 0;
  let lockoutInterval = null;

  try {
    attempts = Math.min(MAX_ATTEMPTS, Math.max(0, Number(localStorage.getItem(ATTEMPTS_KEY)) || 0));
    lockedUntil = Number(localStorage.getItem(LOCKOUT_KEY)) || 0;
    if (lockedUntil <= Date.now()) {
      lockedUntil = 0;
      localStorage.removeItem(LOCKOUT_KEY);
      if (attempts >= MAX_ATTEMPTS) attempts = 0;
      localStorage.setItem(ATTEMPTS_KEY, String(attempts));
    } else {
      attempts = MAX_ATTEMPTS;
    }
  } catch (storageError) {
    lockedUntil = 0;
    attempts = 0;
  }

  function setLocked(locked) {
    input.disabled = locked;
    submit.disabled = locked;
    submit.textContent = locked ? "Please wait…" : "Unlock LunaOS →";
    if (locked) input.blur();
  }

  function updateLockoutMessage() {
    const remaining = Math.max(0, lockedUntil - Date.now());
    if (remaining <= 0) {
      lockedUntil = 0;
      attempts = 0;
      try {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      } catch (storageError) {}
      if (lockoutInterval !== null) {
        clearInterval(lockoutInterval);
        lockoutInterval = null;
      }
      setLocked(false);
      error.textContent = "";
      input.focus();
      return;
    }
    const seconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const extraSeconds = seconds % 60;
    error.textContent = "Too many incorrect passwords. Try again in " +
      (minutes ? minutes + "m " : "") + extraSeconds + "s.";
    error.style.color = "#b34e4e";
  }

  function startLockoutCountdown() {
    setLocked(true);
    updateLockoutMessage();
    if (lockedUntil > Date.now() && lockoutInterval === null) {
      lockoutInterval = setInterval(updateLockoutMessage, 250);
    }
  }

  if (lockedUntil > Date.now()) startLockoutCountdown();

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (Date.now() < lockedUntil) {
      updateLockoutMessage();
      return;
    }
    if (input.value === "2697") {
      if (lockoutInterval !== null) clearInterval(lockoutInterval);
      try {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
        localStorage.setItem(DAILY_UNLOCK_KEY, getLocalDateKey());
      } catch (storageError) {}
      gate.remove();
      document.body.classList.add("os-unlocked");
      // Start ambience directly from the successful password-submit gesture.
      startRainAudio();
      return;
    }

    attempts += 1;
    input.value = "";
    try { localStorage.setItem(ATTEMPTS_KEY, String(attempts)); } catch (storageError) {}
    if (attempts >= MAX_ATTEMPTS) {
      lockedUntil = Date.now() + LOCKOUT_MS;
      try { localStorage.setItem(LOCKOUT_KEY, String(lockedUntil)); } catch (storageError) {}
      startLockoutCountdown();
      return;
    }
    error.textContent = "That password isn't correct. " + (MAX_ATTEMPTS - attempts) + " attempt" + (MAX_ATTEMPTS - attempts === 1 ? "" : "s") + " left.";
    error.style.color = "#b34e4e";
    input.focus();
  });
}
setupPasswordGate();
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
      <span class="mini-glyph">◆</span><strong>Delta-</strong>
      <button data-maximize title="Restore window" aria-label="Restore window">❐</button>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content delta-content">
      <iframe class="delta-frame" src="${DELTA_URL}" title="Delta- coding app" allow="fullscreen" loading="eager"></iframe>
    </div>`;

  $("#windows").appendChild(win);
  state.windows.set("delta", { element: win, title: "Delta-", glyph: "◆" });
  makeDraggable(win);
  makeResizable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  updateDock();
}



function open2048() {
  const existing = state.windows.get("2048");
  if (existing) {
    existing.element.style.display = "flex";
    focusWindow(existing.element);
    updateDock();
    return;
  }

  const win = document.createElement("section");
  win.className = "app-window game2048-window";
  win.tabIndex = -1;
  win.dataset.window = "2048";
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = `
    <div class="window-title">
      <span class="mini-glyph" aria-hidden="true">▦</span><strong>2048</strong>
      <button data-maximize title="Maximize window" aria-label="Maximize window">□</button>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content game2048-content">
      <div class="game2048-top">
        <div><p class="game2048-eyebrow">A LITTLE NUMBER PUZZLE</p><h2>2048</h2></div>
        <div class="game2048-scores"><div><small>SCORE</small><strong data-score>0</strong></div><div><small>BEST</small><strong data-best>0</strong></div></div>
      </div>
      <div class="game2048-actions"><span>Join the tiles to reach 2048.</span><button type="button" data-new-game>New game</button></div>
      <div class="game2048-board" tabindex="0" role="grid" aria-label="2048 game board"></div>
      <p class="game2048-help">Use your arrow keys or swipe the board to move the tiles.</p>
      <p class="game2048-message" aria-live="polite"></p>
    </div>`;
  $("#windows").appendChild(win);
  state.windows.set("2048", { element: win, title: "2048", glyph: "▦" });
  makeDraggable(win);
  makeResizable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  setup2048(win);
  updateDock();
}

function setup2048(win) {
  const boardElement = $(".game2048-board", win);
  const scoreElement = $("[data-score]", win);
  const bestElement = $("[data-best]", win);
  const messageElement = $(".game2048-message", win);
  let board = Array(16).fill(0);
  let previousBoard = null;
  let score = 0;
  let best = 0;
  try { best = Number(localStorage.getItem("lunaos-2048-best") || 0); } catch (error) {}
  bestElement.textContent = best;
  const values = [0, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

  function render() {
    const oldBoard = previousBoard;
    const usedOld = new Set();
    boardElement.innerHTML = "";
    board.forEach((value, index) => {
      const tile = document.createElement("div");
      tile.className = "game2048-tile" + (value ? " tile-" + value : " tile-empty");
      tile.setAttribute("role", "gridcell");
      tile.setAttribute("aria-label", value ? String(value) : "Empty");
      tile.textContent = value || "";
      boardElement.appendChild(tile);

      if (oldBoard && value) {
        // Start each moved tile at its previous cell, then glide into place.
        const sourceValues = value >= 4 ? [value, value / 2] : [value];
        let sourceIndex = -1;
        let sourceDistance = Infinity;
        oldBoard.forEach((oldValue, oldIndex) => {
          if (usedOld.has(oldIndex) || !sourceValues.includes(oldValue)) return;
          const distance = Math.abs(Math.floor(oldIndex / 4) - Math.floor(index / 4)) +
            Math.abs((oldIndex % 4) - (index % 4));
          if (distance < sourceDistance) {
            sourceDistance = distance;
            sourceIndex = oldIndex;
          }
        });
        if (sourceIndex >= 0 && sourceIndex !== index) {
          usedOld.add(sourceIndex);
          const dx = ((sourceIndex % 4) - (index % 4)) * (tile.getBoundingClientRect().width + 8);
          const dy = (Math.floor(sourceIndex / 4) - Math.floor(index / 4)) * (tile.getBoundingClientRect().height + 8);
          tile.style.transition = "none";
          tile.style.transform = "translate(" + dx + "px, " + dy + "px)";
          tile.style.zIndex = "2";
          requestAnimationFrame(() => requestAnimationFrame(() => {
            tile.style.transition = "transform 130ms ease-out";
            tile.style.transform = "translate(0, 0)";
          }));
        } else if (sourceIndex < 0) {
          tile.animate([{ transform: "scale(.72)", opacity: .6 }, { transform: "scale(1)", opacity: 1 }], { duration: 130, easing: "ease-out" });
        }
      }
    });
    previousBoard = board.slice();
    scoreElement.textContent = score;
    bestElement.textContent = best;
  }

  function addTile() {
    const empty = board.map((value, index) => value === 0 ? index : -1).filter(index => index >= 0);
    if (!empty.length) return;
    board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  }

  function reset() {
    board = Array(16).fill(0);
    score = 0;
    messageElement.textContent = "";
    addTile();
    addTile();
    render();
  }

  function move(direction) {
    if (messageElement.textContent.startsWith("Game over")) return;
    const before = board.join(",");
    let gained = 0;
    for (let line = 0; line < 4; line++) {
      const indexes = [];
      for (let offset = 0; offset < 4; offset++) {
        const row = direction === "left" || direction === "right" ? line : offset;
        const col = direction === "left" || direction === "right" ? offset : line;
        indexes.push(row * 4 + col);
      }
      if (direction === "right" || direction === "down") indexes.reverse();
      const packed = indexes.map(index => board[index]).filter(value => value);
      const merged = [];
      for (let i = 0; i < packed.length; i++) {
        if (packed[i] === packed[i + 1]) {
          const doubled = packed[i] * 2;
          merged.push(doubled);
          gained += doubled;
          i++;
        } else merged.push(packed[i]);
      }
      while (merged.length < 4) merged.push(0);
      indexes.forEach((index, i) => board[index] = merged[i]);
    }
    if (board.join(",") === before) return;
    score += gained;
    if (score > best) {
      best = score;
      try { localStorage.setItem("lunaos-2048-best", String(best)); } catch (error) {}
    }
    addTile();
    messageElement.textContent = board.includes(2048) ? "You made 2048! Keep going or start a new game." : "";
    if (!board.includes(0) && !canMove()) messageElement.textContent = "Game over — press New game to try again.";
    render();
  }

  function canMove() {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      if (board[i] === 0) return true;
      if (c < 3 && board[i] === board[i + 1]) return true;
      if (r < 3 && board[i] === board[i + 4]) return true;
    }
    return false;
  }

  // Listen on the document so arrow keys work even if the board itself is not focused.
  document.addEventListener("keydown", event => {
    const directions = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    const active = state.windows.get("2048")?.element;
    const focused = document.activeElement;
    if (!directions[event.key] || active !== win || win.style.display === "none") return;
    if (focused && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)) return;
    event.preventDefault();
    move(directions[event.key]);
  });
  $("[data-new-game]", win).addEventListener("click", reset);
  let touchStart = null;
  boardElement.addEventListener("click", () => boardElement.focus());
  boardElement.addEventListener("touchstart", event => {
    const touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  boardElement.addEventListener("touchend", event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }, { passive: true });
  reset();
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
  state.windows.set("podcast", { element: win, title: "Podcast Episodes", glyph: "♫" });
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
    const syncRainVolume = () => startRainAudio();
    player.addEventListener("play", syncRainVolume);
    player.addEventListener("pause", syncRainVolume);
    player.addEventListener("ended", syncRainVolume);
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

function saveOpenWindows() {
  try {
    const saved = [...state.windows.entries()].map(([app, record]) => ({
      app,
      visible: record.element.style.display !== "none",
      maximized: record.element.classList.contains("is-maximized"),
      left: record.element.style.left,
      top: record.element.style.top,
      width: record.element.style.width,
      height: record.element.style.height
    }));
    localStorage.setItem("lunaos-open-windows", JSON.stringify(saved));
  } catch (error) {
    // Window memory is optional if browser storage is unavailable.
  }
}

function updateDock() {
  const holder = $("#openApps");
  holder.innerHTML = "";
  saveOpenWindows();
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

function openMusic() {
  const existing = state.windows.get("music");
  if (existing) {
    existing.element.style.display = "flex";
    focusWindow(existing.element);
    updateDock();
    return;
  }
  const win = document.createElement("section");
  win.className = "app-window music-window";
  win.dataset.window = "music";
  win.style.zIndex = ++state.zIndex;
  win.innerHTML = `
    <div class="window-title">
      <span class="mini-glyph" aria-hidden="true">♫</span><strong>Cistamusica</strong>
      <button data-maximize title="Maximize window" aria-label="Maximize window">□</button>
      <button data-minimize title="Minimize" aria-label="Minimize">−</button>
      <button class="close" data-close title="Close" aria-label="Close">×</button>
    </div>
    <div class="window-content music-content">
      <iframe class="music-frame" src="./music.html" title="Cistamusica music maker" allow="autoplay" loading="eager"></iframe>
    </div>`;
  $("#windows").appendChild(win);
  state.windows.set("music", { element: win, title: "Cistamusica", glyph: "♫" });
  makeDraggable(win);
  makeResizable(win);
  win.addEventListener("pointerdown", () => focusWindow(win));
  updateDock();
}

// Desktop and home app launchers get direct click handlers so they remain reliable.
$("#openDelta")?.addEventListener("click", openDelta);
$("#deltaIcon")?.addEventListener("click", openDelta);
$("#home")?.addEventListener("click", openDelta);
$("#podcastIcon")?.addEventListener("click", openPodcast);
$("#musicIcon")?.addEventListener("click", openMusic);

document.addEventListener("click", event => {
  const close = event.target.closest("[data-close]");
  if (close) {
    closeApp(close.closest(".app-window").dataset.window);
    return;
  }
  const maximize = event.target.closest("[data-maximize]");
  if (maximize) {
    const win = maximize.closest(".app-window");

    // Podcast has its own maximize/restore toggle so it can fill LunaOS
    // without changing the fullscreen state of the whole desktop.
    if (win.dataset.window === "2048") {
      if (win.classList.contains("is-maximized")) {
        win.classList.remove("is-maximized");
        win.style.left = "";
        win.style.top = "";
        win.style.width = "";
        win.style.height = "";
      } else {
        win.classList.add("is-maximized");
        win.style.left = "0";
        win.style.top = "0";
        win.style.width = "100%";
        win.style.height = "100%";
      }
      updateMaximizeButton(win);
      return;
    }

    if (win.dataset.window === "music") {
      if (win.classList.contains("is-maximized")) {
        win.classList.remove("is-maximized");
        win.style.left = "8%";
        win.style.top = "6%";
        win.style.width = "min(1120px, 88%)";
        win.style.height = "min(760px, 88%)";
      } else {
        win.classList.add("is-maximized");
        win.style.left = "0";
        win.style.top = "0";
        win.style.width = "100%";
        win.style.height = "100%";
      }
      updateMaximizeButton(win);
      return;
    }

    if (win.dataset.window === "podcast") {
      if (win.classList.contains("is-maximized")) {
        win.classList.remove("is-maximized");
        win.style.left = "8%";
        win.style.top = "8%";
        win.style.width = "min(760px, 84%)";
        win.style.height = "min(620px, 82%)";
      } else {
        win.classList.add("is-maximized");
        win.style.left = "0";
        win.style.top = "0";
        win.style.width = "100%";
        win.style.height = "100%";
      }
      updateMaximizeButton(win);
      return;
    }

    const isFullscreen = document.fullscreenElement === document.documentElement;
    if (isFullscreen) {
      document.exitFullscreen().catch(() => {});
      win.classList.remove("is-maximized");
      win.style.left = "5%";
      win.style.top = "5%";
      win.style.width = "min(900px, 90%)";
      win.style.height = "min(650px, 85%)";
    } else {
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
  if (win.dataset.window === "2048") {
    button.title = maximized ? "Restore window" : "Fullscreen";
  } else {
    button.title = document.fullscreenElement === document.documentElement ? "Restore resizable window" : "Enter fullscreen";
  }
  button.setAttribute("aria-label", button.title);
}

document.addEventListener("fullscreenchange", () => {
  const pageFullscreen = document.fullscreenElement === document.documentElement;
  document.body.classList.toggle("luna-fullscreen", pageFullscreen);
  $$(".app-window").forEach(win => {
    if (win.dataset.window !== "delta") {
      // These app windows maximize within LunaOS without toggling browser fullscreen.
      if (win.dataset.window === "podcast" || win.dataset.window === "2048" || win.dataset.window === "music") updateMaximizeButton(win);
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
  // Lift the rain slightly while an uploaded podcast is playing so both are audible.
  const podcastPlayer = $("#podcastNowPlaying");
  audio.volume = podcastPlayer && !podcastPlayer.paused && !podcastPlayer.ended ? 0.85 : 0.75;
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

// Restore app windows that were open when LunaOS was last refreshed.
function restoreOpenWindows() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("lunaos-open-windows") || "[]");
  } catch (error) {
    saved = [];
  }
  saved.forEach(item => {
    if (!item || !["delta", "podcast", "2048", "music"].includes(item.app)) return;
    if (item.app === "delta") openDelta();
    if (item.app === "podcast") openPodcast();
    if (item.app === "2048") open2048();
    if (item.app === "music") openMusic();
    const record = state.windows.get(item.app);
    if (!record) return;
    const win = record.element;
    if (item.maximized) {
      win.classList.add("is-maximized");
      if (item.app === "podcast") {
        win.style.left = "0";
        win.style.top = "0";
        win.style.width = "100%";
        win.style.height = "100%";
      }
    } else if (item.app === "podcast" || item.app === "music") {
      win.classList.remove("is-maximized");
      if (item.left) win.style.left = item.left;
      if (item.top) win.style.top = item.top;
      if (item.width) win.style.width = item.width;
      if (item.height) win.style.height = item.height;
    }
    if (!item.visible) win.style.display = "none";
  });
  updateDock();
}
const puzzleShortcut = document.createElement("button");
puzzleShortcut.className = "desktop-icon";
puzzleShortcut.id = "2048Icon";
puzzleShortcut.setAttribute("aria-label", "Open 2048");
puzzleShortcut.innerHTML = '<span class="icon game2048-icon" aria-hidden="true">2048</span><span>2048</span>';
puzzleShortcut.addEventListener("click", open2048);
$(".icons").appendChild(puzzleShortcut);

restoreOpenWindows();
