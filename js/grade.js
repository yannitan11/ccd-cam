// CCD Cam — Fujifilm-style film grade, baked into captured pixels.
//
// CSS filters make the LIVE preview look graded, but they don't persist into
// exported images. So on capture we run the frame through this pipeline pixel
// by pixel and bake the look into the file. Tune everything via GRADE in
// js/config.js.

import { GRADE } from './config.js';

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// Precomputed per-channel lookup tables for the stages that only depend on the
// input value (WB, black-lift, S-curve). Split-tone / grain / vignette are
// spatial or per-pixel and applied in the main loop.
function buildLut(mult, tint) {
  const lut = new Uint8ClampedArray(256);
  const { blackLift, contrast, pivot } = GRADE;
  for (let i = 0; i < 256; i++) {
    // 1. Warm white-balance.
    let v = i * mult;
    // 2. Faded/matte blacks: lift floor + warm shadow tint, weighted to shadows.
    const shadowW = 1 - Math.min(i, 128) / 128; // 1 at black -> 0 at midtone
    v = blackLift + (v * (255 - blackLift)) / 255 + tint * shadowW;
    // 3. Gentle filmic S-curve around the pivot.
    const d = v - pivot;
    v = pivot + d + contrast * d * (1 - Math.abs(d) / 255);
    lut[i] = clamp(v);
  }
  return lut;
}

/**
 * Grade an ImageData in place and return it.
 * `width`/`height` come from the ImageData so we can compute the vignette.
 */
export function gradeImageData(imageData) {
  const { data, width, height } = imageData;
  const {
    desaturate,
    splitShadow,
    splitHighlight,
    grainAmount,
    vignette,
    vignetteFeather,
    flash,
    bloom,
    bloomThreshold,
  } = GRADE;

  const lutR = buildLut(GRADE.wb.r, GRADE.shadowTint.r);
  const lutG = buildLut(GRADE.wb.g, GRADE.shadowTint.g);
  const lutB = buildLut(GRADE.wb.b, GRADE.shadowTint.b);

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      let r = lutR[data[i]];
      let g = lutG[data[i + 1]];
      let b = lutB[data[i + 2]];

      // Perceptual luminance for the tone-dependent stages.
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // 4. Desaturate globally (pull toward luminance).
      r += (lum - r) * desaturate;
      g += (lum - g) * desaturate;
      b += (lum - b) * desaturate;

      // 5. Split tone: teal-green shadows, golden highlights.
      const hi = lum / 255;        // 0 shadow -> 1 highlight
      const lo = 1 - hi;
      r += splitShadow.r * lo + splitHighlight.r * hi;
      g += splitShadow.g * lo + splitHighlight.g * hi;
      b += splitShadow.b * lo + splitHighlight.b * hi;

      // 8. Subtle highlight bloom/halation (cheap: lift bright pixels warmly).
      if (bloom && lum > bloomThreshold) {
        const t = ((lum - bloomThreshold) / (255 - bloomThreshold)) * bloom;
        r += (255 - r) * t;
        g += (255 - g) * t * 0.9;
        b += (255 - b) * t * 0.7;
      }

      // 6. Film grain (additive, per-pixel).
      if (grainAmount) {
        const n = (Math.random() - 0.5) * 2 * grainAmount;
        r += n;
        g += n;
        b += n;
      }

      // 7 + 8. Vignette (darken edges) and flash (brighten centre) combined —
      // together they give the hard little-flash falloff of an old CCD.
      if (vignette || flash) {
        const dist = Math.hypot(x - cx, y - cy) / maxDist;
        let mul = 1;
        if (vignette && dist > vignetteFeather) {
          const t = (dist - vignetteFeather) / (1 - vignetteFeather); // 0..1
          mul *= 1 - vignette * t * t;
        }
        if (flash) {
          mul *= 1 + flash * (1 - dist) * (1 - dist); // brightest at centre
        }
        r *= mul;
        g *= mul;
        b *= mul;
      }

      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
      // alpha untouched
    }
  }

  return imageData;
}
