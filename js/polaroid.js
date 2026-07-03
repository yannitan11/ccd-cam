// CCD Cam — polaroid prints: create, scatter, stack, drag.

import { POLAROID } from './config.js';

const rand = (min, max) => min + Math.random() * (max - min);

export class PolaroidBoard {
  /**
   * @param {HTMLElement} layer    container the prints live in
   * @param {HTMLElement} camera   camera element (a no-go zone for placement)
   */
  constructor(layer, camera) {
    this.layer = layer;
    this.camera = camera;
    this.prints = [];
    this.topZ = 10;

    window.addEventListener('resize', () => this._clampAll(), { passive: true });
  }

  /** Rect of the camera in layer-local coordinates, padded a little. */
  _cameraRect() {
    const c = this.camera.getBoundingClientRect();
    const l = this.layer.getBoundingClientRect();
    const pad = 24;
    return {
      x: c.left - l.left - pad,
      y: c.top - l.top - pad,
      w: c.width + pad * 2,
      h: c.height + pad * 2,
    };
  }

  _overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /** Find an open spot; fall back to any on-canvas spot once it fills up. */
  _findSpot(pw, ph) {
    const W = this.layer.clientWidth;
    const H = this.layer.clientHeight;
    const cam = this._cameraRect();

    let fallback = null;
    for (let i = 0; i < POLAROID.placementTries; i++) {
      const x = rand(0, Math.max(0, W - pw));
      const y = rand(0, Math.max(0, H - ph));
      if (!fallback) fallback = { x, y };

      // Never cover the camera.
      if (this._overlaps(x, y, pw, ph, cam.x, cam.y, cam.w, cam.h)) continue;

      // Prefer spots that don't heavily overlap existing prints.
      const clash = this.prints.some((p) =>
        this._overlaps(x, y, pw, ph, p.x, p.y, pw * 0.75, ph * 0.75)
      );
      if (!clash) return { x, y };
      if (!fallback.safe) fallback = { x, y, safe: true };
    }
    // If everything clashed, at least keep it off the camera when we can.
    return fallback;
  }

  /**
   * Add a print. `dataUrl` is the graded JPEG. Ejects from the camera, tumbles
   * to an open spot, and settles at a jaunty angle. Newest lands on top.
   */
  add(dataUrl) {
    const width = this._printWidth();
    // Photo is 4:3; polaroid adds a chunky bottom lip.
    const photoH = (width - 20) * 0.75;
    const height = photoH + 20 + 44;

    const spot = this._findSpot(width, height);
    const rot = rand(POLAROID.minRotation, POLAROID.maxRotation);

    const el = document.createElement('figure');
    el.className = 'polaroid polaroid--ejecting';
    el.style.width = `${width}px`;
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.left = `${spot.x}px`;
    el.style.top = `${spot.y}px`;
    el.style.zIndex = String(++this.topZ);

    const img = document.createElement('img');
    img.className = 'polaroid__photo';
    img.alt = 'captured memory';
    img.draggable = false;
    img.src = dataUrl;

    const lip = document.createElement('figcaption');
    lip.className = 'polaroid__lip';

    el.append(img, lip);
    this.layer.appendChild(el);

    const record = { el, x: spot.x, y: spot.y, rot };
    this.prints.push(record);

    // Eject animation starts behind/under the camera, then flies to the spot.
    this._playEject(record, width, height);
    this._makeDraggable(record);
    this._enablePeek(record);

    // Recycle oldest prints to bound memory.
    while (this.prints.length > POLAROID.maxPrints) {
      const old = this.prints.shift();
      old.el.remove();
    }

    return record;
  }

  _printWidth() {
    // Shrink on small screens.
    const vw = window.innerWidth;
    if (vw < 520) return Math.round(POLAROID.widthDesktop * 0.62);
    if (vw < 820) return Math.round(POLAROID.widthDesktop * 0.8);
    return POLAROID.widthDesktop;
  }

  _playEject(record, width, height) {
    const { el } = record;
    const cam = this._cameraRect();
    // Start point: base-center of the camera, tucked slightly under it.
    const startX = cam.x + cam.w / 2 - width / 2;
    const startY = cam.y + cam.h - height * 0.35;
    const dx = startX - record.x;
    const dy = startY - record.y;

    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    // Kick off on next frame so the initial transform applies first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.remove('polaroid--ejecting'));
    });
    el.addEventListener(
      'animationend',
      () => el.classList.remove('polaroid--ejecting'),
      { once: true }
    );
  }

  _bringToFront(record) {
    record.el.style.zIndex = String(++this.topZ);
  }

  _makeDraggable(record) {
    const { el } = record;
    let startX = 0, startY = 0, originX = 0, originY = 0, dragging = false, moved = false;

    const onDown = (e) => {
      if (el.classList.contains('polaroid--peek')) return;
      dragging = true;
      moved = false;
      el.classList.add('polaroid--dragging');
      this._bringToFront(record);
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;
      originX = record.x;
      originY = record.y;
      if (e.cancelable) e.preventDefault();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      record.x = this._clampX(originX + dx, el.offsetWidth);
      record.y = this._clampY(originY + dy, el.offsetHeight);
      el.style.left = `${record.x}px`;
      el.style.top = `${record.y}px`;
    };
    const onUp = () => {
      dragging = false;
      el.classList.remove('polaroid--dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      // Suppress the click-to-peek that would otherwise fire after a drag.
      el._suppressPeek = moved;
    };

    el.addEventListener('pointerdown', onDown);
  }

  _enablePeek(record) {
    const { el } = record;
    el.addEventListener('click', () => {
      if (el._suppressPeek) {
        el._suppressPeek = false;
        return;
      }
      this._bringToFront(record);
      el.classList.toggle('polaroid--peek');
    });
  }

  _clampX(x, w) {
    return Math.max(0, Math.min(x, this.layer.clientWidth - w));
  }
  _clampY(y, h) {
    return Math.max(0, Math.min(y, this.layer.clientHeight - h));
  }
  _clampAll() {
    for (const p of this.prints) {
      p.x = this._clampX(p.x, p.el.offsetWidth);
      p.y = this._clampY(p.y, p.el.offsetHeight);
      p.el.style.left = `${p.x}px`;
      p.el.style.top = `${p.y}px`;
    }
  }
}
