// CCD Cam — "Send" mode: render the scattered polaroids to a canvas and
// download the whole collage as a PNG. Reconstructs each print (white frame,
// rotation, z-order, drop shadow) so the export matches what's on screen — no
// html2canvas dependency.

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// object-fit: cover, centered.
function drawCover(ctx, img, dx, dy, dw, dh) {
  const ir = img.width / img.height;
  const dr = dw / dh;
  let sx, sy, sw, sh;
  if (ir > dr) {
    sh = img.height;
    sw = sh * dr;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / dr;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Export the current collage. Reads live geometry from the board's prints,
 * crops to their rotated bounding box, and triggers a PNG download.
 * @returns {Promise<string|false>} the data URL on success, false if empty.
 */
export async function exportCollage(board, opts = {}) {
  const { padding = 44, scale = 2, background = '#efe9df' } = opts;
  const prints = board.prints;
  if (!prints.length) return false;

  // Snapshot geometry (device px), sorted oldest -> newest so newest lands on top.
  const items = prints
    .map((p) => {
      const w = p.el.offsetWidth;
      const h = p.el.offsetHeight;
      return {
        src: p.el.querySelector('img')?.src,
        w,
        h,
        cx: p.x + w / 2,
        cy: p.y + h / 2,
        rad: (p.rot * Math.PI) / 180,
        z: Number(p.el.style.zIndex) || 0,
      };
    })
    .sort((a, b) => a.z - b.z);

  // Rotated bounding box across every print.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const it of items) {
    const c = Math.cos(it.rad);
    const s = Math.sin(it.rad);
    const hw = it.w / 2;
    const hh = it.h / 2;
    for (const [dx, dy] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
      const px = it.cx + dx * c - dy * s;
      const py = it.cy + dx * s + dy * c;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
  }
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const W = maxX - minX;
  const H = maxY - minY;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(-minX, -minY);

  // Warm paper background.
  const grad = ctx.createLinearGradient(minX, minY, minX, maxY);
  grad.addColorStop(0, '#f4f1ea');
  grad.addColorStop(1, background);
  ctx.fillStyle = grad;
  ctx.fillRect(minX, minY, W, H);

  const imgs = await Promise.all(items.map((it) => loadImage(it.src)));

  items.forEach((it, i) => {
    const img = imgs[i];
    ctx.save();
    ctx.translate(it.cx, it.cy);
    ctx.rotate(it.rad);

    const x = -it.w / 2;
    const y = -it.h / 2;

    // White polaroid frame with a soft drop shadow.
    ctx.shadowColor = 'rgba(50, 40, 30, 0.35)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, x, y, it.w, it.h, 3);
    ctx.fillStyle = '#fbfaf6';
    ctx.fill();

    // Reset shadow before the photo.
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Photo sits inside an 8px inset; 4:3 like the DOM.
    const pad = 8;
    const pw = it.w - pad * 2;
    const ph = pw * 0.75;
    if (img) {
      ctx.save();
      roundRect(ctx, x + pad, y + pad, pw, ph, 1);
      ctx.clip();
      drawCover(ctx, img, x + pad, y + pad, pw, ph);
      ctx.restore();
    } else {
      ctx.fillStyle = '#201a12';
      ctx.fillRect(x + pad, y + pad, pw, ph);
    }
    ctx.restore();
  });

  const url = canvas.toDataURL('image/png');
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.download = `ccd-cam-collage-${ts}.png`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return url;
}
