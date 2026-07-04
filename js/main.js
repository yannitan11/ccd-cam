// CCD Cam — bootstrap: wires the camera, shutter, capture pipeline and board.

import { CameraFeed, CAMERA_STATE } from './camera.js';
import { Capturer } from './capture.js';
import { PolaroidBoard } from './polaroid.js';
import { exportCollage } from './collage.js';
import { PlayMode } from './play.js';
import { sceneDataUrl, cycleScene, randomizeScene } from './effects.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  stage: $('#stage'),
  camera: $('#camera'),
  lcd: $('#lcd'),
  video: $('#feed'),
  flash: $('#flash'),
  shutter: $('#shutter'),
  lcdState: $('#lcd-state'),
  hint: $('#hint'),
  prints: $('#prints'),
  soundToggle: $('#sound-toggle'),
  sendTab: $('#send-tab'),
  playTab: $('#play-tab'),
  playbackBtn: $('#playback-btn'),
  lcdEffect: $('#lcd-effect'),
  bloomTab: $('#bloom-tab'),
  isolateTab: $('#isolate-tab'),
  rememberTab: $('#remember-tab'),
};

const board = new PolaroidBoard(els.prints, els.camera);
const play = new PlayMode(board);

const capturer = new Capturer(
  { video: els.video, lcd: els.lcd, flash: els.flash, shutterBtn: els.shutter },
  () => playShutterSound()
);

// --- Camera lifecycle -------------------------------------------------------

const camera = new CameraFeed(els.video, (state, detail) => {
  els.camera.dataset.state = state;
  if (state === CAMERA_STATE.pending) {
    setLcdMessage('warming up…', false);
  } else if (state === CAMERA_STATE.error) {
    const msg =
      detail?.reason === 'unsupported'
        ? 'no camera 😔'
        : detail?.reason === 'NotAllowedError'
          ? 'camera blocked 😔 tap to retry'
          : 'no camera 😔 tap to retry';
    setLcdMessage(msg, true);
  } else if (state === CAMERA_STATE.live) {
    clearLcdMessage();
    els.hint.classList.add('is-visible');
  }
});

function setLcdMessage(text, retryable) {
  els.lcdState.textContent = text;
  els.lcdState.classList.add('is-visible');
  els.lcdState.dataset.retry = retryable ? '1' : '';
  els.hint.classList.remove('is-visible');
}
function clearLcdMessage() {
  els.lcdState.classList.remove('is-visible');
  els.lcdState.dataset.retry = '';
}

// --- Capture triggers -------------------------------------------------------

async function shoot() {
  if (play.isOpen || !camera.isLive || capturer.busy) return;
  const dataUrl = await capturer.capture();
  if (dataUrl) {
    board.add(dataUrl);
    els.hint.classList.remove('is-visible');
    // First memory unlocks the Play + Send tabs (and the camera's playback button).
    if (els.sendTab.disabled) {
      els.sendTab.disabled = false;
      els.sendTab.classList.add('tab--ready');
      els.playTab.disabled = false;
      els.playTab.classList.add('tab--ready');
      els.playbackBtn.disabled = false;
      els.playbackBtn.classList.add('btn-round--live');
    }
  }
}

// --- Play: review captured prints -------------------------------------------

const openPlay = () => play.show();
els.playTab.addEventListener('click', () => { if (!els.playTab.disabled) openPlay(); });
els.playbackBtn.addEventListener('click', () => { if (!els.playbackBtn.disabled) openPlay(); });

// --- Send: download the collage as a PNG ------------------------------------

els.sendTab.addEventListener('click', async () => {
  if (els.sendTab.disabled || els.sendTab.dataset.busy) return;
  els.sendTab.dataset.busy = '1';
  els.sendTab.classList.add('tab--sending');
  try {
    await exportCollage(board);
  } finally {
    els.sendTab.classList.remove('tab--sending');
    delete els.sendTab.dataset.busy;
  }
});

// Tap anywhere on the camera to shoot — the shutter, the LCD, and the whole
// body are all one big shutter. Two areas opt out: the playback button (once
// enabled it opens Play), and any tap while the camera is in an error state
// (that retries instead of shooting).
els.camera.addEventListener('click', (e) => {
  if (!els.playbackBtn.disabled && e.target.closest('#playback-btn')) return;
  if (els.lcdState.dataset.retry) {
    clearLcdMessage();
    camera.retry();
    return;
  }
  shoot();
});

// Spacebar as a convenient desktop shutter.
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    shoot();
  }
});

// --- Optional shutter sound (muted by default, never autoplays) -------------

let soundOn = false;
let audioCtx = null;

els.soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  els.soundToggle.setAttribute('aria-pressed', String(soundOn));
  els.soundToggle.textContent = soundOn ? '🔊' : '🔇';
  if (soundOn && !audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
});

function playShutterSound() {
  if (!soundOn || !audioCtx) return;
  // Tiny synthesized "click-clack" — no asset needed.
  const now = audioCtx.currentTime;
  const click = (t, freq, dur, gain) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  };
  click(now, 1200, 0.03, 0.15);
  click(now + 0.05, 700, 0.05, 0.12);
}

// --- Capture modes: Remember / Bloom / Isolate ------------------------------

const MODE_KEY = 'ccdcam:mode';
const modeTabs = {
  remember: els.rememberTab,
  bloom: els.bloomTab,
  isolate: els.isolateTab,
};
let captureMode = localStorage.getItem(MODE_KEY) || 'remember';
if (!modeTabs[captureMode]) captureMode = 'remember';

function refreshEffectOverlay() {
  const eff = els.lcdEffect;
  eff.className = 'lcd__effect';
  eff.style.backgroundImage = '';
  if (captureMode === 'bloom') {
    eff.classList.add('is-bloom');
  } else if (captureMode === 'isolate') {
    eff.classList.add('is-isolate');
    eff.style.backgroundImage = `url("${sceneDataUrl()}")`;
  }
}

function applyMode(mode, { cycle = false } = {}) {
  if (mode === 'isolate') {
    if (captureMode !== 'isolate') randomizeScene();
    else if (cycle) cycleScene();
  }
  captureMode = mode;
  capturer.mode = mode;
  for (const [key, tab] of Object.entries(modeTabs)) {
    const on = key === mode;
    tab.classList.toggle('tab--active', on);
    if (on) tab.setAttribute('aria-current', 'true');
    else tab.removeAttribute('aria-current');
  }
  refreshEffectOverlay();
  try { localStorage.setItem(MODE_KEY, mode); } catch (_) {}
}

els.rememberTab.addEventListener('click', () => applyMode('remember'));
els.bloomTab.addEventListener('click', () => applyMode('bloom'));
els.isolateTab.addEventListener('click', () => applyMode('isolate', { cycle: true }));

applyMode(captureMode); // reflect the saved/default mode + set capturer.mode

// --- Background paper switcher ----------------------------------------------

const PAPER_KEY = 'ccdcam:paper';
const paperSwitch = $('#paper-switch');

function applyPaper(paper) {
  document.documentElement.dataset.paper = paper;
  for (const b of paperSwitch.querySelectorAll('.swatch')) {
    b.setAttribute('aria-pressed', String(b.dataset.paper === paper));
  }
}

// The head script already set the initial value; reflect it in the swatches.
applyPaper(document.documentElement.dataset.paper || 'blue');

paperSwitch.addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch');
  if (!btn) return;
  applyPaper(btn.dataset.paper);
  try { localStorage.setItem(PAPER_KEY, btn.dataset.paper); } catch (_) {}
});

// --- Go ---------------------------------------------------------------------

camera.start();
