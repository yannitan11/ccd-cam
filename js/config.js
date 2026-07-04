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

// Gentle "beauty" pass baked on capture: soft-focus skin smoothing + a soft
// brightening lift. Flatters the subject without wrecking the CCD look, and is
// colour-neutral so it works for Mono too. Set glow/brighten to 0 to disable.
export const BEAUTIFY = {
  glow: 0.28,       // opacity of a lighten-blended blurred copy (smooths skin, adds glow)
  blurFrac: 0.011,  // blur radius as a fraction of the frame's long edge
  brighten: 0.12,   // opacity of a white soft-light lift (kept low so it doesn't wash out)
};

// Fujifilm-style grade (Classic Chrome / Superia-ish).
// All values are baked into the captured pixels — see js/grade.js.
export const GRADE = {
  // 1. Warm white-balance: per-channel multipliers. Kept only lightly warm so
  //    whites don't go yellow.
  wb: { r: 1.035, g: 1.008, b: 0.985 },

  // 2. Faded / matte blacks: lift the black point so shadows never hit 0,
  //    with a faint warm-brown tint in the shadows.
  blackLift: 18,               // 0..255 added floor
  shadowTint: { r: 8, g: 6, b: 5 }, // faint warm-brown in shadows (less yellow)

  // 3. Retro CCD S-curve. Punchier than a soft film curve.
  contrast: 0.3,               // 0 = none, ~0.3 = punchy
  pivot: 118,                  // tone pivot (0..255)

  // 4. Global desaturation, but keep warm tones rich.
  desaturate: 0.10,            // fraction pulled toward luminance

  // 5. Split tone: teal-green in shadows, softly golden in highlights.
  splitShadow: { r: -6, g: 4, b: 6 },
  splitHighlight: { r: 5, g: 3, b: -3 },

  // 6. Film/sensor grain (additive, per-pixel). CCD noise, kept moderate.
  grainAmount: 11,             // +/- range of the noise

  // 7. Vignette: soft radial darkening baked in.
  vignette: 0.40,              // 0..1 strength at the corners
  vignetteFeather: 0.5,        // where the falloff starts (0..1 of radius)

  // 8. On-camera flash: brighten toward the centre (inverse vignette) so shots
  //    read like they were lit by a soft little built-in flash.
  flash: 0.09,                 // 0 disables; center brightness lift

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
    dot: '#c98a5a',
    live: 'contrast(1.12) saturate(0.98) brightness(1.06) sepia(0.05) hue-rotate(-3deg)',
    grade: GRADE,
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
      flash: 0.09,
      bloom: 0.12,
      grainAmount: 15,
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
