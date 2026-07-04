// CCD Cam — capture effects for the Bloom and Isolate toolbar modes.
//
// Bloom  = dreamy Orton-style glow/halation baked over the graded frame.
// Isolate = double exposure — a procedural scenery layer screen-blended with
//           the portrait (the face-over-landscape look from the references).

// --- Scenes (procedural, so there are no image assets) ----------------------

const SCENES = ['sunset', 'bokeh', 'garden'];
let sceneIndex = 0;

export const currentScene = () => SCENES[sceneIndex];
export const cycleScene = () => { sceneIndex = (sceneIndex + 1) % SCENES.length; return currentScene(); };
export const randomizeScene = () => { sceneIndex = Math.floor(Math.random() * SCENES.length); return currentScene(); };

const SCENE_FNS = {
  sunset(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#48306a');
    g.addColorStop(0.45, '#c15a3e');
    g.addColorStop(0.72, '#f0a24e');
    g.addColorStop(1, '#f7c76b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Sun glow.
    const sx = w * 0.5, sy = h * 0.68, sr = Math.min(w, h) * 0.4;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sg.addColorStop(0, 'rgba(255,250,225,1)');
    sg.addColorStop(0.35, 'rgba(255,222,150,0.85)');
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    // Dark hill silhouette (stays dark → screen-blend keeps the person there).
    ctx.fillStyle = '#241730';
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.82);
    ctx.quadraticCurveTo(w * 0.3, h * 0.74, w * 0.52, h * 0.8);
    ctx.quadraticCurveTo(w * 0.78, h * 0.87, w, h * 0.78);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  },

  bokeh(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#2a1a12');
    g.addColorStop(1, '#5a3a1e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const colors = ['#ffd98a', '#ffb35a', '#fff0c8', '#ff9e5a'];
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.min(w, h) * (0.03 + Math.random() * 0.11);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, colors[i % colors.length]);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.15 + Math.random() * 0.4;
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  garden(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#84b262');
    g.addColorStop(1, '#3f6a34');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const petals = ['#f2a6bf', '#f2c94c', '#ff8fa3', '#fbe08a', '#ffffff'];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.min(w, h) * (0.02 + Math.random() * 0.05);
      const col = petals[i % petals.length];
      ctx.globalAlpha = 0.5 + Math.random() * 0.4;
      ctx.fillStyle = col;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

function renderScene(name, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  (SCENE_FNS[name] || SCENE_FNS.sunset)(c.getContext('2d'), w, h);
  return c;
}

/** A JPEG data URL of the current scene, for the live viewfinder overlay. */
export function sceneDataUrl(w = 360, h = 270) {
  return renderScene(currentScene(), w, h).toDataURL('image/jpeg', 0.82);
}

// --- Bloom ------------------------------------------------------------------

/** Dreamy glow: composite a blurred, brightened copy back over the frame. */
export function applyBloom(ctx, canvas) {
  const w = canvas.width, h = canvas.height;
  const blur = Math.max(2, Math.round(Math.max(w, h) * 0.014));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.42;
  ctx.filter = `blur(${blur}px) brightness(1.3)`;
  ctx.drawImage(canvas, 0, 0, w, h);
  ctx.restore();
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// --- Isolate (double exposure) ----------------------------------------------

/** Screen-blend the current scene over the portrait for a double exposure. */
export function applyDoubleExposure(ctx, canvas, w, h) {
  const scene = renderScene(currentScene(), w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.9;
  ctx.drawImage(scene, 0, 0, w, h);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
