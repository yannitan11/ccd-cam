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

  // 3. Retro CCD S-curve. Punchier than a soft film curve.
  contrast: 0.20,              // 0 = none, ~0.3 = punchy
  pivot: 118,                  // tone pivot (0..255)

  // 4. Global desaturation, but keep warm tones rich.
  desaturate: 0.10,            // fraction pulled toward luminance

  // 5. Split tone: teal-green in shadows, golden in highlights.
  splitShadow: { r: -6, g: 4, b: 6 },
  splitHighlight: { r: 10, g: 6, b: -8 },

  // 6. Film/sensor grain (additive, per-pixel). Heavier for the CCD noise look.
  grainAmount: 26,             // +/- range of the noise

  // 7. Vignette: soft radial darkening baked in.
  vignette: 0.40,              // 0..1 strength at the corners
  vignetteFeather: 0.5,        // where the falloff starts (0..1 of radius)

  // 8. On-camera flash: brighten toward the centre (inverse vignette) so shots
  //    read like they were lit by a hard little built-in flash.
  flash: 0.16,                 // 0 disables; center brightness lift

  // 9. Highlight bloom / halation — blown-out flash highlights glow.
  bloom: 0.26,                 // 0 disables
  bloomThreshold: 178,         // luminance above which highlights glow
};

// Film simulations. Each is a full grade preset (spread over the base GRADE)
// plus a matching cheap CSS `live` filter for the viewfinder and a `dot` colour
// for its picker chip. GRADE above is the default "Classic" look.
export const FILMS = [
  {
    id: 'classic',
    name: 'Classic',
    dot: '#c9853f',
    live: 'contrast(1.13) saturate(0.96) brightness(1.06) sepia(0.12) hue-rotate(-6deg)',
    grade: GRADE,
  },
  {
    id: 'chrome',
    name: 'Chrome',
    dot: '#8a94a0',
    live: 'contrast(1.1) saturate(0.72) brightness(1.03) hue-rotate(-3deg)',
    grade: {
      ...GRADE,
      wb: { r: 1.0, g: 1.0, b: 1.03 },
      shadowTint: { r: 6, g: 8, b: 12 },
      contrast: 0.16,
      desaturate: 0.34,
      splitShadow: { r: -8, g: 2, b: 9 },
      splitHighlight: { r: 4, g: 3, b: -4 },
      flash: 0.1,
      bloom: 0.14,
      grainAmount: 20,
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    dot: '#e6ad46',
    live: 'contrast(1.12) saturate(1.14) brightness(1.05) sepia(0.16) hue-rotate(-8deg)',
    grade: {
      ...GRADE,
      wb: { r: 1.1, g: 1.02, b: 0.87 },
      contrast: 0.22,
      desaturate: 0.02,
      splitHighlight: { r: 14, g: 8, b: -11 },
      flash: 0.18,
      bloom: 0.3,
      grainAmount: 24,
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    dot: '#8f8f8f',
    live: 'grayscale(1) contrast(1.16) brightness(1.05)',
    grade: {
      ...GRADE,
      wb: { r: 1.0, g: 1.0, b: 1.0 },
      shadowTint: { r: 0, g: 0, b: 0 },
      contrast: 0.26,
      desaturate: 1,
      splitShadow: { r: 0, g: 0, b: 0 },
      splitHighlight: { r: 0, g: 0, b: 0 },
      flash: 0.14,
      bloom: 0.12,
      grainAmount: 30,
    },
  },
  {
    id: 'faded',
    name: 'Faded',
    dot: '#d8c4b6',
    live: 'contrast(0.94) saturate(0.82) brightness(1.1) sepia(0.06)',
    grade: {
      ...GRADE,
      wb: { r: 1.03, g: 1.02, b: 1.0 },
      blackLift: 34,
      contrast: 0.08,
      desaturate: 0.24,
      splitShadow: { r: 2, g: 6, b: 10 },
      splitHighlight: { r: 8, g: 4, b: -2 },
      vignette: 0.28,
      flash: 0.1,
      bloom: 0.2,
      grainAmount: 18,
    },
  },
];

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
