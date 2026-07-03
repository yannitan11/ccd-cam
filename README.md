# CCD Cam

A cozy, single-page web app that recreates an early-2000s Casio **EXILIM** compact
digital camera. Your webcam plays live on the camera's little LCD, already wearing a
warm Fujifilm-style film look. Tap the shutter and the captured frame is graded, grain
and vignette baked in, then slides out as a polaroid and settles onto the canvas at a
jaunty angle. Shoot again and again to build a scattered collage of grainy memories.

Built to the spec in the CCD Cam PRD (v1).

## Run locally

ES modules + `getUserMedia` need a real origin (not `file://`), and the camera needs
`http://localhost` or `https`:

```bash
cd "CCD Cam"
python3 -m http.server 8000
# → http://localhost:8000  (allow camera access)
```

Preview (Claude Code sandbox): `./preview.sh "CCD Cam" 8130` → config `ccd-cam`, port 8130.

## How it works

- **No backend, no build, no account.** Everything runs client-side; nothing is stored
  or uploaded. Prints live only in the page until you reload.
- **Live look** (`styles.css`): a cheap CSS `filter` chain on the `<video>`, plus animated
  grain and a radial vignette overlaid on the LCD.
- **Baked grade** (`js/grade.js`): on capture the frame is drawn to an offscreen canvas
  and processed pixel-by-pixel — warm white balance, lifted/matte blacks with a warm
  shadow tint, a gentle filmic S-curve, slight desaturation, Classic-Chrome split tone,
  film grain, vignette, and a touch of highlight bloom. This is what persists in the
  exported JPEG (CSS filters don't).
- **Selfie mirroring:** both preview and print are mirrored so the print matches what you
  saw in the viewfinder.

## Architecture

| File | Responsibility |
|------|----------------|
| `index.html` | Camera mockup markup (LCD, control cluster, EXILIM wordmark, deco), toolbar, sound toggle |
| `styles.css` | All styling + the live film look and overlays |
| `js/config.js` | **Tunable knobs** — the whole look-and-feel dials live here |
| `js/grade.js` | The baked Fujifilm grade pipeline (headline feature) |
| `js/camera.js` | `getUserMedia`, permission/error states, tab-visibility handling |
| `js/capture.js` | Shutter feedback (flash → blackout), grab frame, grade, export |
| `js/polaroid.js` | Print creation, scatter placement (camera is a no-go zone), eject animation, drag, peek |
| `js/main.js` | Wires it all together; shutter triggers; optional synthesized shutter sound |

Want to dial the look? Everything lives in `js/config.js` (`GRADE`, `LIVE_FILTER`,
`CAPTURE`, `POLAROID`) and the `.lcd__video` filter in `styles.css`.

## Controls

- **Shutter button** (top edge) or **tap the LCD** or **Spacebar** → capture.
- **Drag** any print to rearrange; **click** a print to peek (enlarge), click again to return.
- **Play** (top toolbar, or the camera's own ▶ button) → review your shots full-size in a
  lightbox: ◀ ▶ / arrow keys to flip, a Slideshow button (or Space) to auto-advance, Esc or
  the backdrop to close. Greyed out until your first photo. See `js/play.js`.
- **Send** (top toolbar) → download the whole collage as a PNG. Greyed out until you've
  taken your first photo, then it lights up. See `js/collage.js`.
- **Paper switcher** (bottom-left swatches) → **blue grid / red grid / wavy grid / plain**
  background; the choice is saved in `localStorage` and applied before first paint (no flash).
  The wavy grid is an SVG turbulence displacement filter warping a graph pattern.
- **🔇 / 🔊** bottom-right toggles a synthesized shutter click (muted by default, never autoplays).

## Not in v1 (future scope)

Toolbar modes **Bloom / Isolate** render as decorative tabs; **Remember** is the live
capture mode, **Play** reviews shots, and **Send** downloads the collage. Double-exposure
compositing and a filter picker are designed-for but not built.
