"use strict";

// [label, width, height] — "Custom" is the sentinel for manual width/height entry.
// Ordered ascending by pixel count (after Custom) so the dropdown reads top to bottom.
const RESOLUTIONS = [
  ["Custom", 0, 0],
  ["256x144 (144p)", 256, 144],
  ["426x240 (240p)", 426, 240],
  ["640x360 (360p)", 640, 360],
  ["640x480 (VGA)", 640, 480],
  ["720x480 (D1)", 720, 480],
  ["854x480 (480p)", 854, 480],
  ["800x600 (SVGA)", 800, 600],
  ["960x540 (qHD/540p)", 960, 540],
  ["1024x768 (XGA)", 1024, 768],
  ["1280x720 (720p)", 1280, 720],
  ["1280x960", 1280, 960],
  ["1280x1024 (SXGA)", 1280, 1024],
  ["1600x1200 (2MP)", 1600, 1200],
  ["1920x1080 (1080p)", 1920, 1080],
  ["1920x1200 (WUXGA)", 1920, 1200],
  ["2048x1536 (3MP)", 2048, 1536],
  ["2048x2048 (4MP)", 2048, 2048],
  ["2304x1728 (4MP)", 2304, 1728],
  ["2560x1440 (1440p)", 2560, 1440],
  ["2560x1920 (5MP)", 2560, 1920],
  ["2560x2048 (5MP)", 2560, 2048],
  ["2592x1520 (4MP wide)", 2592, 1520],
  ["2592x1944 (5MP)", 2592, 1944],
  ["3072x2048 (6MP)", 3072, 2048],
  ["3648x2052 (7MP)", 3648, 2052],
  ["3712x1856 (panoramic)", 3712, 1856],
  ["3840x2160 (4K UHD)", 3840, 2160],
  ["3840x2880 (11MP)", 3840, 2880],
  ["4000x3000 (12MP)", 4000, 3000],
  ["4096x2160 (4K DCI)", 4096, 2160],
  ["4096x3072 (12MP)", 4096, 3072],
  ["5120x2560 (panoramic)", 5120, 2560],
  ["5120x3840 (20MP)", 5120, 3840],
  ["5184x1944 (panoramic)", 5184, 1944],
  ["6000x4000 (24MP)", 6000, 4000],
  ["7680x4320 (8K UHD)", 7680, 4320],
];
const CUSTOM_RESOLUTION_INDEX = RESOLUTIONS.findIndex(([label]) => label === "Custom");

const FPS_OPTIONS = [1, 2, 3, 5, 7, 10, 12, 15, 20, 25, 30, 60, "Custom"];
const DEFAULT_FPS = 7;

// Empirical bits-per-pixel-per-fps rule of thumb used across the CCTV industry
// for ballpark H.264 bitrate estimates; codec/motion/quality are multipliers on top.
const BASE_BITRATE_FACTOR = 0.07;

const el = (id) => document.getElementById(id);

const resolutionSelect = el("resolution");
const widthInput = el("width");
const heightInput = el("height");
const customDims = el("custom-dims");
const fpsSelect = el("fps");
const customFpsWrap = el("custom-fps-wrap");
const customFpsInput = el("custom-fps");
const codecSelect = el("codec");
const motionSelect = el("motion");
const qualityInput = el("quality");
const qualityValue = el("quality-value");
const favoriteStarBtn = el("favorite-star");
const favoritesListEl = el("favorites-list");

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function reducedAspect(w, h) {
  const d = gcd(w, h) || 1;
  return [w / d, h / d];
}

function populateSelects() {
  resolutionSelect.innerHTML = RESOLUTIONS.map(
    ([label], i) => `<option value="${i}" ${i === CUSTOM_RESOLUTION_INDEX ? "selected" : ""}>${label}</option>`
  ).join("");

  fpsSelect.innerHTML = FPS_OPTIONS.map(
    (f) => `<option value="${f}" ${f === DEFAULT_FPS ? "selected" : ""}>${f}</option>`
  ).join("");
}

function currentResolution() {
  const isCustom = Number(resolutionSelect.value) === CUSTOM_RESOLUTION_INDEX;
  customDims.hidden = !isCustom;
  favoriteStarBtn.hidden = !isCustom;
  if (isCustom) {
    return [Number(widthInput.value) || 0, Number(heightInput.value) || 0];
  }
  const [, w, h] = RESOLUTIONS[Number(resolutionSelect.value)];
  return [w, h];
}

// Loads a resolution back into Camera Settings as Custom -- used by both the
// Same Aspect Ratio table and favorite rows to "load" a resolution.
function applyResolution(width, height) {
  resolutionSelect.value = String(CUSTOM_RESOLUTION_INDEX);
  widthInput.value = width;
  heightInput.value = height;
  calculate();
}

function currentFps() {
  const isCustom = fpsSelect.value === "Custom";
  customFpsWrap.hidden = !isCustom;
  return isCustom ? Number(customFpsInput.value) || 0 : Number(fpsSelect.value);
}

function bitrateMbpsFor(width, height, fps, codecFactor, motionFactor, qualityFactor) {
  const megapixels = (width * height) / 1e6;
  return megapixels * fps * BASE_BITRATE_FACTOR * codecFactor * motionFactor * qualityFactor;
}

function calculate() {
  const [width, height] = currentResolution();
  const fps = currentFps();
  const codecFactor = Number(codecSelect.value);
  const motionFactor = Number(motionSelect.value);
  const qualityFactor = 0.75 + ((Number(qualityInput.value) - 50) / 50) * 0.65;

  const megapixels = (width * height) / 1e6;
  const bitrateMbps = bitrateMbpsFor(width, height, fps, codecFactor, motionFactor, qualityFactor);
  const lowMbps = bitrateMbps * 0.8;
  const highMbps = bitrateMbps * 1.2;

  const dailyGB = (bitrateMbps * 86400) / 8 / 1024;
  const monthlyTB = (dailyGB * 30) / 1024;

  const divisor = gcd(width, height) || 1;

  const mbpsRounded = bitrateMbps.toFixed(2);
  const kbpsRounded = (bitrateMbps * 1000).toFixed(0);
  el("bitrate-value").textContent = `${mbpsRounded} Mbps`;
  el("bitrate-value").dataset.value = mbpsRounded;
  el("bitrate-value-kbps").textContent = `${kbpsRounded} Kbps`;
  el("bitrate-value-kbps").dataset.value = kbpsRounded;
  el("bitrate-range").textContent = `Range: ${lowMbps.toFixed(2)} - ${highMbps.toFixed(2)} Mbps`;
  el("storage-daily").textContent = `${dailyGB.toFixed(1)} GB`;
  el("storage-monthly").textContent = `${monthlyTB.toFixed(2)} TB`;
  el("info-mp").textContent = `${megapixels.toFixed(2)} MP`;
  el("info-ar").textContent = `${width / divisor}:${height / divisor}`;
  el("info-px").textContent = (width * height).toLocaleString();

  const [rw, rh] = reducedAspect(width, height);
  const familyMatches = RESOLUTIONS
    .filter((_, i) => i !== CUSTOM_RESOLUTION_INDEX)
    .filter(([, w, h]) => { const [fw, fh] = reducedAspect(w, h); return fw === rw && fh === rh; })
    .sort(([, w1, h1], [, w2, h2]) => w1 * h1 - w2 * h2);

  el("family-body").innerHTML = familyMatches.length
    ? familyMatches.map(([label, w, h]) => {
        const mbps = bitrateMbpsFor(w, h, fps, codecFactor, motionFactor, qualityFactor);
        const mbpsStr = mbps.toFixed(2);
        const kbpsStr = (mbps * 1000).toFixed(0);
        const scalePct = Math.round((w / width) * 100);
        return `<tr>
          <td>${scalePct}%</td>
          <td><button type="button" class="link-btn family-res" data-w="${w}" data-h="${h}">${label}</button></td>
          <td><span class="value-row">${mbpsStr} <button class="copy-btn" type="button" data-value="${mbpsStr}" aria-label="Copy Mbps value">⧉</button></span></td>
          <td><span class="value-row">${kbpsStr} <button class="copy-btn" type="button" data-value="${kbpsStr}" aria-label="Copy Kbps value">⧉</button></span></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" class="favorites-empty">No other common resolutions share this aspect ratio.</td></tr>`;

  updateStarButton({ width, height, fps, codec: codecSelect.value, motion: motionSelect.value, quality: Number(qualityInput.value) });
}

// Falls back to plain localStorage if the shared prefs script didn't load (e.g. offline).
// embedded is still computed locally (not hardcoded false) since that check needs no network.
const prefs = window.DESPrefs || {
  embedded: (() => { try { return window.self !== window.top; } catch { return true; } })(),
  onThemeChange: (callback) => {
    try {
      const parentDoc = window.parent.document;
      callback(parentDoc.documentElement.dataset.theme || "light");
      parentDoc.addEventListener("des-tools:theme", (e) => callback(e.detail));
    } catch {
      // cross-origin or no parent: can't follow, tool keeps its own default
    }
  },
  get: (key, fallback) => {
    const local = localStorage.getItem(key);
    if (local === null) return Promise.resolve(fallback);
    try { return Promise.resolve(JSON.parse(local)); } catch { return Promise.resolve(local); }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  },
};

// The dashboard's header already shows the tool name and theme control.
// (.topbar sets its own `display: flex`, which beats the `hidden` attribute's
// default `display: none` in the cascade, so set display directly instead.)
if (prefs.embedded) document.querySelector(".topbar").style.display = "none";

async function initTheme() {
  const toggle = el("theme-toggle");

  if (prefs.embedded) {
    prefs.onThemeChange((theme) => applyTheme(theme === "light" ? "light" : "dark"));
    return;
  }

  const stored = await prefs.get("theme", "dark");
  applyTheme(stored === "light" ? "light" : "dark");

  toggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    prefs.set("theme", next);
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const toggle = el("theme-toggle");
  toggle.textContent = theme === "dark" ? "☀" : "☾";
  toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
}

async function copyAndFlash(btn, value) {
  await navigator.clipboard.writeText(value);
  btn.classList.add("copied");
  setTimeout(() => btn.classList.remove("copied"), 1000);
}

function initCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => copyAndFlash(btn, el(btn.dataset.copy).dataset.value));
  });

  // Family table rows are re-rendered on every calculate(), so their copy
  // buttons use delegation on the (persistent) table body instead of
  // per-button listeners that would need re-attaching each render.
  el("family-body").addEventListener("click", (e) => {
    const copyBtn = e.target.closest(".copy-btn");
    if (copyBtn?.dataset.value) { copyAndFlash(copyBtn, copyBtn.dataset.value); return; }
    const resBtn = e.target.closest(".family-res");
    if (resBtn) applyResolution(Number(resBtn.dataset.w), Number(resBtn.dataset.h));
  });
}

// ---- Favorites ----

let favorites = [];

function sameSettings(a, b) {
  return a.width === b.width && a.height === b.height && a.fps === b.fps &&
    a.codec === b.codec && a.motion === b.motion && a.quality === b.quality;
}

function findFavoriteIndex(settings) {
  return favorites.findIndex((f) => sameSettings(f, settings));
}

function updateStarButton(settings) {
  if (favoriteStarBtn.hidden) return;
  const isFav = findFavoriteIndex(settings) >= 0;
  favoriteStarBtn.textContent = isFav ? "★" : "☆";
  favoriteStarBtn.classList.toggle("active", isFav);
  favoriteStarBtn.setAttribute("aria-pressed", String(isFav));
}

function renderFavorites() {
  if (!favorites.length) {
    favoritesListEl.innerHTML = `<p class="favorites-empty">No favorites yet -- star a Custom resolution to save one.</p>`;
    return;
  }
  favoritesListEl.innerHTML = favorites.map((fav) => {
    const codecLabel = codecSelect.querySelector(`option[value="${fav.codec}"]`)?.textContent || fav.codec;
    const motionLabel = motionSelect.querySelector(`option[value="${fav.motion}"]`)?.textContent || fav.motion;
    return `<li class="favorite-row" draggable="true" data-id="${fav.id}">
      <span class="drag-handle" aria-hidden="true">⠿</span>
      <button type="button" class="link-btn favorite-res" data-id="${fav.id}">${fav.width} x ${fav.height}</button>
      <span class="favorite-meta">${fav.fps} fps · ${codecLabel} · ${motionLabel} · ${fav.quality}%</span>
      <button type="button" class="favorite-remove" data-id="${fav.id}" aria-label="Remove favorite">★</button>
    </li>`;
  }).join("");
}

async function persistFavorites() {
  await prefs.set("favorites", favorites);
}

function initFavorites() {
  favoriteStarBtn.addEventListener("click", async () => {
    const [width, height] = currentResolution();
    const settings = { width, height, fps: currentFps(), codec: codecSelect.value, motion: motionSelect.value, quality: Number(qualityInput.value) };
    const idx = findFavoriteIndex(settings);
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.push({ id: crypto.randomUUID(), ...settings });
    }
    renderFavorites();
    updateStarButton(settings);
    await persistFavorites();
  });

  favoritesListEl.addEventListener("click", async (e) => {
    const resBtn = e.target.closest(".favorite-res");
    if (resBtn) {
      const fav = favorites.find((f) => f.id === resBtn.dataset.id);
      if (fav) applyResolution(fav.width, fav.height);
      return;
    }
    const removeBtn = e.target.closest(".favorite-remove");
    if (removeBtn) {
      favorites = favorites.filter((f) => f.id !== removeBtn.dataset.id);
      renderFavorites();
      updateStarButton({ width: Number(widthInput.value), height: Number(heightInput.value), fps: currentFps(), codec: codecSelect.value, motion: motionSelect.value, quality: Number(qualityInput.value) });
      await persistFavorites();
    }
  });

  // Simple "drop onto a row" reorder -- snaps into place on drop rather than
  // live-reordering while dragging, which keeps this dependency-free.
  let draggedId = null;
  favoritesListEl.addEventListener("dragstart", (e) => {
    const row = e.target.closest(".favorite-row");
    if (row) draggedId = row.dataset.id;
  });
  favoritesListEl.addEventListener("dragover", (e) => e.preventDefault());
  favoritesListEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    const targetRow = e.target.closest(".favorite-row");
    if (!draggedId || !targetRow || targetRow.dataset.id === draggedId) return;
    const fromIdx = favorites.findIndex((f) => f.id === draggedId);
    const toIdx = favorites.findIndex((f) => f.id === targetRow.dataset.id);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = favorites.splice(fromIdx, 1);
    favorites.splice(toIdx, 0, moved);
    draggedId = null;
    renderFavorites();
    await persistFavorites();
  });
}

async function loadFavorites() {
  favorites = (await prefs.get("favorites", [])) || [];
  renderFavorites();
}

populateSelects();
qualityInput.addEventListener("input", () => {
  qualityValue.textContent = `${qualityInput.value}%`;
  calculate();
});
document.querySelectorAll("input, select").forEach((elm) => {
  if (elm !== qualityInput) elm.addEventListener("input", calculate);
});
initTheme();
initCopyButtons();
initFavorites();
calculate();
loadFavorites().then(() => {
  const [width, height] = currentResolution();
  updateStarButton({ width, height, fps: currentFps(), codec: codecSelect.value, motion: motionSelect.value, quality: Number(qualityInput.value) });
});
