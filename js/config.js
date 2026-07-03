// CCD Cam — tunable constants.
// Keep the look-and-feel knobs here so the vibe is easy to dial in.

export const CAPTURE = {
  // JPEG quality for the exported print.
  jpegQuality: 0.9,
  // Total capture-feedback duration budget (ms). Snappy but felt.
  flashMs: 90,
  blackoutMs: 120,
  freezeMs: 140,
  // Guard so a print never renders wider than this on the source canvas.
  maxLongEdge: 1280,
};

// Fujifilm-style grade (Classic Chrome / Superia-ish).
// All values are baked into the captured pixels — see js/grade.js.
export const GRADE = {
  // 1. Warm white-balance: per-channel multipliers.
  wb: { r: 1.06, g: 1.015, b: 0.94 },

  // 2. Faded / matte blacks: lift the black point so shadows never hit 0,
  //    with a faint warm-brown tint in the shadows.
  blackLift: 18,               // 0..255 added floor
  shadowTint: { r: 14, g: 8, b: 2 }, // warm brown pushed into shadows

  // 3. Gentle filmic S-curve. `contrast` is subtle on purpose.
  contrast: 0.14,              // 0 = none, ~0.3 = punchy
  pivot: 118,                  // tone pivot (0..255)

  // 4. Global desaturation, but keep warm tones rich.
  desaturate: 0.13,            // fraction pulled toward luminance

  // 5. Split tone: teal-green in shadows, golden in highlights.
  splitShadow: { r: -6, g: 4, b: 6 },
  splitHighlight: { r: 10, g: 6, b: -8 },

  // 6. Film grain (additive, per-pixel).
  grainAmount: 12,             // +/- range of the noise

  // 7. Vignette: soft radial darkening baked in.
  vignette: 0.32,              // 0..1 strength at the corners
  vignetteFeather: 0.55,       // where the falloff starts (0..1 of radius)

  // 8. Subtle highlight bloom/halation.
  bloom: 0.10,                 // 0 disables
  bloomThreshold: 205,         // luminance above which highlights glow
};

// Live-preview CSS filter chain (cheap; matches the baked look loosely).
export const LIVE_FILTER =
  'contrast(1.06) saturate(0.88) brightness(1.04) sepia(0.14) hue-rotate(-6deg)';

export const POLAROID = {
  minRotation: -12,
  maxRotation: 12,
  // Desktop print width; scaled down for mobile in CSS.
  widthDesktop: 210,
  // Keep memory bounded — recycle oldest prints past this count.
  maxPrints: 40,
  // Placement retries when hunting for an open (non-overlapping) spot.
  placementTries: 40,
};
