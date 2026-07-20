"use strict";

// [label, width, height] — last entry is the sentinel for manual width/height entry
const RESOLUTIONS = [
  ["720x480", 720, 480],
  ["1280x1024", 1280, 1024],
  ["1920x1080 (1080p)", 1920, 1080],
  ["2048x1536", 2048, 1536],
  ["2048x2048", 2048, 2048],
  ["2304x1728", 2304, 1728],
  ["2560x1920", 2560, 1920],
  ["2560x2048", 2560, 2048],
  ["2592x1520", 2592, 1520],
  ["2592x1944", 2592, 1944],
  ["3648x2052", 3648, 2052],
  ["3712x1856", 3712, 1856],
  ["3840x2160 (4K)", 3840, 2160],
  ["3840x2880", 3840, 2880],
  ["5120x2560", 5120, 2560],
  ["5184x1944", 5184, 1944],
  ["Custom", 0, 0],
];
const CUSTOM_RESOLUTION_INDEX = RESOLUTIONS.length - 1;

const FPS_OPTIONS = [1, 2, 3, 5, 7, 10, 12, 15, 20, 25, 30, 60, "Custom"];
const DEFAULT_FPS = 7;

// Same-family scale steps shown in the "Same Aspect Ratio" table
const FAMILY_SCALES = [
  ["25%", 0.25], ["50%", 0.5], ["75%", 0.75],
  ["100%", 1], ["150%", 1.5], ["200%", 2],
];

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

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function populateSelects() {
  resolutionSelect.innerHTML = RESOLUTIONS.map(
    ([label], i) => `<option value="${i}">${label}</option>`
  ).join("");

  fpsSelect.innerHTML = FPS_OPTIONS.map(
    (f) => `<option value="${f}" ${f === DEFAULT_FPS ? "selected" : ""}>${f}</option>`
  ).join("");
}

function currentResolution() {
  const isCustom = Number(resolutionSelect.value) === CUSTOM_RESOLUTION_INDEX;
  customDims.hidden = !isCustom;
  if (isCustom) {
    return [Number(widthInput.value) || 0, Number(heightInput.value) || 0];
  }
  const [, w, h] = RESOLUTIONS[Number(resolutionSelect.value)];
  return [w, h];
}

function currentFps() {
  const isCustom = fpsSelect.value === "Custom";
  customFpsWrap.hidden = !isCustom;
  return isCustom ? Number(customFpsInput.value) || 0 : Number(fpsSelect.value);
}

function calculate() {
  const [width, height] = currentResolution();
  const fps = currentFps();
  const codecFactor = Number(codecSelect.value);
  const motionFactor = Number(motionSelect.value);
  const qualityFactor = 0.75 + ((Number(qualityInput.value) - 50) / 50) * 0.65;

  const megapixels = (width * height) / 1e6;
  const bitrateMbps = megapixels * fps * BASE_BITRATE_FACTOR * codecFactor * motionFactor * qualityFactor;
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

  const aspect = width / height;
  el("family-body").innerHTML = FAMILY_SCALES.map(([label, scale]) => {
    const w = Math.round((width * scale) / 2) * 2;
    const h = Math.round((w / aspect) / 2) * 2;
    return `<tr><td>${label}</td><td>${w} x ${h}</td></tr>`;
  }).join("");
}

// Falls back to plain localStorage if the shared prefs script didn't load (e.g. offline).
const prefs = window.DESPrefs || {
  get: (key, fallback) => Promise.resolve(localStorage.getItem(key) ?? fallback),
  set: (key, value) => localStorage.setItem(key, value),
};

async function initTheme() {
  const toggle = el("theme-toggle");
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

function initCopyButtons() {
  document.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = el(btn.dataset.copy).dataset.value;
      await navigator.clipboard.writeText(value);
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 1000);
    });
  });
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
calculate();
