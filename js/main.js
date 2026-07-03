// CCD Cam — bootstrap: wires the camera, shutter, capture pipeline and board.

import { CameraFeed, CAMERA_STATE } from './camera.js';
import { Capturer } from './capture.js';
import { PolaroidBoard } from './polaroid.js';
import { exportCollage } from './collage.js';

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
};

const board = new PolaroidBoard(els.prints, els.camera);

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
  if (!camera.isLive || capturer.busy) return;
  const dataUrl = await capturer.capture();
  if (dataUrl) {
    board.add(dataUrl);
    els.hint.classList.remove('is-visible');
    // First memory unlocks the Send (download collage) tab.
    if (els.sendTab.disabled) {
      els.sendTab.disabled = false;
      els.sendTab.classList.add('tab--ready');
    }
  }
}

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

// Shutter button (primary) + whole LCD (secondary) both fire the same action.
els.shutter.addEventListener('click', shoot);
els.lcd.addEventListener('click', () => {
  // If the camera errored, an LCD tap retries instead of shooting.
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

// --- Go ---------------------------------------------------------------------

camera.start();
