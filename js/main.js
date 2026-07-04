// CCD Cam — bootstrap: wires the camera, shutter, capture pipeline and board.

import { CameraFeed, CAMERA_STATE } from './camera.js';
import { Capturer } from './capture.js';
import { PolaroidBoard } from './polaroid.js';
import { exportCollage } from './collage.js';
import { PlayMode } from './play.js';
import { FILMS } from './config.js';

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
  filmstrip: $('#filmstrip'),
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

// --- Film simulation picker -------------------------------------------------

const FILM_KEY = 'ccdcam:film';

function applyFilm(film) {
  capturer.film = film.grade;              // baked into captures
  els.video.style.filter = film.live;      // live viewfinder look
  for (const chip of els.filmstrip.children) {
    chip.classList.toggle('is-active', chip.dataset.film === film.id);
  }
  try { localStorage.setItem(FILM_KEY, film.id); } catch (_) {}
}

// Build the chips from FILMS.
const savedFilmId = (() => { try { return localStorage.getItem(FILM_KEY); } catch (_) { return null; } })();
let activeFilm = FILMS.find((f) => f.id === savedFilmId) || FILMS[0];

for (const film of FILMS) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'film-chip';
  chip.dataset.film = film.id;
  chip.setAttribute('aria-label', `${film.name} film`);
  chip.innerHTML = `<span class="film-chip__dot" style="background:${film.dot}"></span>${film.name}`;
  chip.addEventListener('click', () => applyFilm(film));
  els.filmstrip.appendChild(chip);
}

applyFilm(activeFilm);

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
