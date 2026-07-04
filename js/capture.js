// CCD Cam — capture orchestration: shutter feel + grab frame + grade + export.

import { CAPTURE } from './config.js';
import { gradeImageData } from './grade.js';
import { applyBloom, applyDoubleExposure } from './effects.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Capturer {
  /**
   * @param {object} refs { video, lcd, flash, shutterBtn }
   * @param {() => void} onClick optional shutter sound hook
   */
  constructor(refs, onClick) {
    this.video = refs.video;
    this.lcd = refs.lcd;
    this.flash = refs.flash;
    this.shutterBtn = refs.shutterBtn;
    this.onClick = onClick || (() => {});
    this.busy = false;
    this.mode = 'remember'; // 'remember' | 'bloom' | 'isolate'
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Run the full capture sequence. Resolves with a graded JPEG data URL, or
   * null if the shot couldn't be taken (no frame / already busy).
   */
  async capture() {
    if (this.busy) return null;
    const v = this.video;
    if (!v || !v.videoWidth || !v.videoHeight) return null;

    this.busy = true;
    try {
      this.onClick();

      // 1. Shutter button depress.
      this.shutterBtn?.classList.add('is-pressed');

      // 2. White flash, then a brief black frame (shutter closed).
      this.flash.classList.add('flash--white');
      await wait(CAPTURE.flashMs);
      this.flash.classList.remove('flash--white');
      this.flash.classList.add('flash--black');

      // 3. Freeze + grade the frame while the LCD is dark.
      const dataUrl = this._grabAndGrade(v);
      await wait(CAPTURE.blackoutMs);

      this.flash.classList.remove('flash--black');
      this.shutterBtn?.classList.remove('is-pressed');
      await wait(CAPTURE.freezeMs);

      return dataUrl;
    } finally {
      // Always reset — a thrown grade/export must never wedge the shutter shut.
      this.flash.classList.remove('flash--white', 'flash--black');
      this.shutterBtn?.classList.remove('is-pressed');
      this.busy = false;
    }
  }

  _grabAndGrade(v) {
    // Scale down very large sources so the pixel loop stays snappy.
    let w = v.videoWidth;
    let h = v.videoHeight;
    const longEdge = Math.max(w, h);
    if (longEdge > CAPTURE.maxLongEdge) {
      const s = CAPTURE.maxLongEdge / longEdge;
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    this.canvas.width = w;
    this.canvas.height = h;

    const ctx = this.ctx;
    // Keep the mirrored selfie orientation so the print matches the viewfinder.
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, w, h);
    ctx.restore();

    const img = ctx.getImageData(0, 0, w, h);
    gradeImageData(img);
    ctx.putImageData(img, 0, 0);

    // Toolbar-mode effect, baked on top of the grade.
    if (this.mode === 'bloom') applyBloom(ctx, this.canvas);
    else if (this.mode === 'isolate') applyDoubleExposure(ctx, this.canvas, w, h);

    return this.canvas.toDataURL('image/jpeg', CAPTURE.jpegQuality);
  }
}
