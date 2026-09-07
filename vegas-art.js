/* Illustrated art layer. Classic script so the game still opens directly from disk. */
'use strict';

const ART = {
  panorama: loadArt('assets/strip-panorama.png'),
  player: loadArt('assets/tourist-walk.png'),
  cast: loadArt('assets/strip-characters.png'),
  walkFrames: [[109,8,326,482],[661,12,196,480],[1112,9,335,482],
    [93,522,358,482],[652,522,246,482],[1117,520,359,484]],
  castFrames: [[50,11,332,422],[533,0,305,433],[970,6,251,426],[1380,21,341,405],
    [90,450,289,422],[505,448,293,423],[935,451,334,421],[1417,457,300,406]],
  castIds: ['flyer','showgirl','mascot','tourist','robot','cop','scooter','thief'],
};

function loadArt(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function artReady(img) { return img.complete && img.naturalWidth > 0; }
function artScale() { return Math.max(0.62, Math.min(1.18, H / 760)); }

function artRect(x, y, w, h, radius, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}

function artText(text, x, y, size, color, weight = 700) {
  ctx.font = `${weight} ${size}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function artShadow(x, y, width, color = '#050b18') {
  ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, width, width * 0.19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawIllustratedSkyline(camX) {
  if (!artReady(ART.panorama)) return false;
  const h = H * streetTopF;
  const width = Math.max(W * 1.25, h * ART.panorama.naturalWidth / ART.panorama.naturalHeight);
  const off = ((camX * 0.12) % width + width) % width;
  // Mirrored repeat meets identical edge pixels, avoiding a hard panorama seam.
  const tile = Math.floor(camX * 0.12 / width);
  for (let i = -1; i <= 1; i++) {
    ctx.save(); ctx.translate(i * width - off, 0);
    if (Math.abs(tile + i) % 2 === 1) { ctx.translate(width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(ART.panorama, 0, 0, width, h + 1);
    ctx.restore();
  }
  const haze = ctx.createLinearGradient(0, h * 0.72, 0, h);
  haze.addColorStop(0, '#18263a00'); haze.addColorStop(1, '#101f3a88');
  ctx.fillStyle = haze; ctx.fillRect(0, h * 0.72, W, h * 0.28);
  return true;
}

function drawCasinoFronts(camX, t) {
  frameSigns = [];
  const scale = artScale(), span = 510 * scale;
  const off = camX * MID_P;
  const first = Math.floor(off / span) - 1;
  const zi = game ? Math.max(0, game.zoneIdx) : 0;
  const zone = ZONES[zi];
  for (let i = first; i < first + Math.ceil(W / span) + 3; i++) {
    const x = i * span - off;
    const variant = ((i % 3) + 3) % 3;
    const w = span - 20 * scale;
    const height = (variant === 0 ? 135 : variant === 1 ? 106 : 120) * scale;
    const base = H * streetTopF;
    const y = base - height;
    const accent = variant === 0 ? zone.color : variant === 1 ? '#f37c69' : '#6cd8ce';
    const sign = variant === 0 ? zone.name : variant === 1 ? 'THE NIGHT OWL' : 'LUCKY STAR';
    ctx.save();
    // A darker side face, layered stone cornices and recessed luminous entrances.
    artRect(x + 7, y + 8, w, height - 8, 2, '#081323');
    const stone = ctx.createLinearGradient(0, y, 0, base);
    stone.addColorStop(0, '#3d4255'); stone.addColorStop(0.4, '#263647'); stone.addColorStop(1, '#111d2b');
    artRect(x, y, w - 7, height, 3, stone, '#52606c');
    artRect(x - 4, y + 4, w + 2, 7 * scale, 1, '#8a7b69');
    artRect(x - 2, y + 12 * scale, w, 3 * scale, 0, '#d3b780');
    const entranceY = y + 53 * scale;
    for (let c = 0; c < 7; c++) {
      const bx = x + (20 + c * 66) * scale;
      const glass = ctx.createLinearGradient(0, entranceY, 0, base);
      glass.addColorStop(0, '#f6bd7277'); glass.addColorStop(0.5, '#a0704b55'); glass.addColorStop(1, '#091d32');
      artRect(bx, entranceY, 47 * scale, base - entranceY, [14 * scale, 14 * scale, 0, 0], glass, '#af9666');
      ctx.fillStyle = '#dcc79d44'; ctx.fillRect(bx + 22 * scale, entranceY + 3, 2, base - entranceY - 3);
      ctx.fillStyle = '#60717e55'; ctx.fillRect(bx - 9 * scale, entranceY - 7, 6 * scale, base - entranceY + 7);
    }
    // Art-deco marquee, with restrained warm bulbs instead of bloom everywhere.
    const signW = Math.min(w - 45 * scale, (sign.length * 13 + 75) * scale);
    const signX = x + (w - signW) / 2;
    artRect(signX - 5 * scale, y + 19 * scale, signW + 10 * scale, 40 * scale, 5, '#090f21', '#c3a776');
    artRect(signX, y + 24 * scale, signW, 30 * scale, 3, '#152235', accent);
    ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 5;
    artText(sign, x + w / 2, y + 46 * scale, 22 * scale, accent);
    ctx.restore();
    for (let b = 0; b < 15; b++) {
      const bx = signX + b * signW / 14;
      ctx.fillStyle = !REDUCED_MOTION && (b + Math.floor(t * 3)) % 5 === 0 ? '#fff9d7' : '#d7a961';
      ctx.beginPath(); ctx.arc(bx, y + 21 * scale, 1.5 * scale, 0, Math.PI * 2); ctx.fill();
    }
    artRect(x - 5, base - 8 * scale, w + 3, 8 * scale, 0, '#18293a', '#45566a');
    frameSigns.push({ x: x + w / 2, c: accent, a: 0.8 });
    ctx.restore();
  }
}

function drawIllustratedSidewalk(camX) {
  const top = H * sidewalkTopF;
  const surface = ctx.createLinearGradient(0, top, 0, H);
  surface.addColorStop(0, '#496071'); surface.addColorStop(0.25, '#394d62');
  surface.addColorStop(1, '#24364d');
  ctx.fillStyle = surface; ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = '#b5b0a0'; ctx.fillRect(0, top - 5, W, 4);
  ctx.fillStyle = '#142638'; ctx.fillRect(0, top - 1, W, 3);
  const span = 148 * artScale(), off = ((camX % span) + span) % span;
  for (let row = 0; row < 4; row++) {
    const y = top + (H - top) * row / 4;
    const nextY = top + (H - top) * (row + 1) / 4;
    ctx.strokeStyle = '#a7b7bc17'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    for (let x = -off - span; x < W + span; x += span) {
      const bx = x + (row % 2) * span / 2;
      ctx.strokeStyle = '#091b3033';
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx - 18, nextY); ctx.stroke();
    }
  }
  // Ground lights mark the three playable rows without obscuring the artwork.
  for (const row of ROWS) {
    for (let x = -off; x < W; x += span) {
      ctx.fillStyle = '#c3d3d344'; ctx.fillRect(x, row.yf * H + 7, 10, 2);
    }
  }
  for (const sign of frameSigns) {
    const light = ctx.createRadialGradient(sign.x, top, 0, sign.x, top, 190);
    light.addColorStop(0, sign.c + '24'); light.addColorStop(1, sign.c + '00');
    ctx.fillStyle = light; ctx.fillRect(sign.x - 190, top, 380, H - top);
  }
}

function drawPromenadeProps(camX, t) {
  const scale = artScale(), span = 680 * scale;
  const off = camX * 0.8;
  const first = Math.floor(off / span) - 1;
  for (let i = first; i < first + Math.ceil(W / span) + 2; i++) {
    const x = i * span - off + 100 * scale;
    const y = H * sidewalkTopF - 10;
    // Props live on the far curb and are drawn BEFORE every gameplay entity.
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.strokeStyle = '#152434'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, -90, 4, -164); ctx.stroke();
    ctx.strokeStyle = '#9c8563'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(3, -160); ctx.stroke();
    for (let f = -3; f <= 3; f++) {
      ctx.strokeStyle = f % 2 ? '#224849' : '#315653'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(4, -164);
      const swing = REDUCED_MOTION ? 0 : Math.sin(t + f + i) * 2;
      ctx.quadraticCurveTo(f * 20, -204, f * 25 + swing, -153 + Math.abs(f) * 5); ctx.stroke();
    }
    artRect(-26, -21, 52, 21, [3,3,8,8], '#253947', '#5b716e');
    artRect(-30, -24, 60, 6, 2, '#6b7c79');
    ctx.restore();
  }
}

function drawIllustratedPlayer(sx, sy, scale, t) {
  if (!artReady(ART.player)) return false;
  const g = game, size = scale * artScale();
  const riding = g.riding > 0;
  // Pauses, relief and riding hold a passing pose; walking uses all six frames.
  const frame = (g.peeing > 0 || riding || REDUCED_MOTION) ? 1
    : Math.floor(g.walkPhase / (Math.PI * 2) * 6) % 6;
  const crop = ART.walkFrames[frame];
  const height = 145, width = crop[2] / crop[3] * height;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(size, size);
  artShadow(0, 2, 27);
  // A clear foot marker identifies the player even in a busy crowd.
  ctx.strokeStyle = '#7fe7dd'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 2, 29, 7, 0, 0, Math.PI * 2); ctx.stroke();
  if (g.invuln > 0 && Math.sin(t * 24) > 0) ctx.globalAlpha = 0.5;
  if (!REDUCED_MOTION) ctx.rotate(Math.sin(t * 1.6) * g.drunk / 2200 + (g.stagger > 0 ? -0.16 : 0));
  if (riding) { ctx.save(); ctx.scale(1.6, 1.6); drawPlayerRide(g.ride, t); ctx.restore(); }
  ctx.drawImage(ART.player, ...crop, -width / 2, -height - (riding ? 16 : 0), width, height);
  if (g.peeing > 0) {
    artRect(-28, -70, 56, 27, 6, '#162b43');
    artText('RELIEF', 0, -52, 12, '#b5e8ef');
  }
  ctx.restore();
  return true;
}

function drawIllustratedHazard(e, sx, sy, scale, t) {
  if (!artReady(ART.cast)) return false;
  const index = ART.castIds.indexOf(e.type.id);
  if (index < 0) return false;
  const crop = ART.castFrames[index], size = scale * artScale();
  const height = e.type.id === 'showgirl' ? 161 : e.type.id === 'mascot' ? 151 : 140;
  const width = crop[2] / crop[3] * height;
  const moving = e.type.walk > 0;
  const bob = moving && !REDUCED_MOTION ? Math.sin(e.t * (e.type.id === 'scooter' ? 16 : 8)) * 2 : 0;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(size, size);
  artShadow(0, 2, e.type.id === 'scooter' ? 38 : 25);
  // Warm foot marks distinguish hazards from the player's cyan marker.
  ctx.strokeStyle = '#ed8c7155'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.drawImage(ART.cast, ...crop, -width / 2, -height + bob, width, height);
  ctx.restore();
  return true;
}

function drawIllustratedCollectible(e, sx, sy, scale, t) {
  const size = scale * artScale();
  const color = e.kind === 'drink' ? '#efbf64' : e.kind === 'food' ? '#f68f78' : e.kind === 'ride' ? '#c0a6ee' : '#79dedb';
  const label = e.kind === 'drink' ? 'DRINK' : e.kind === 'food' ? 'FOOD' : e.kind === 'ride' ? 'RIDE' : 'WATER';
  const bob = REDUCED_MOTION ? 0 : Math.sin(e.t * 3 + e.worldX) * 3;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(size, size);
  artShadow(0, 1, 23);
  ctx.translate(0, -51 + bob);
  artRect(-27, -33, 54, 64, 12, '#0c213de8', color + 'aa');
  artRect(-23, -29, 46, 3, 1, color);
  ctx.save(); ctx.translate(0, 3); ctx.scale(1.3, 1.3);
  if (e.kind === 'drink') drawGlass(e.type);
  else if (e.kind === 'food') drawFood(e.type);
  else if (e.kind === 'ride') drawRidePickup(e.type);
  else drawWaterBottle();
  ctx.restore();
  artText(label, 0, 24, 10, color);
  ctx.restore();
}

function drawIllustratedSlot(e, sx, sy, scale, t) {
  ctx.save(); ctx.translate(sx, sy); ctx.scale(scale * artScale(), scale * artScale());
  artShadow(3, 2, 43);
  artRect(-30, -33, 60, 32, 5, '#172330', '#c1a16c');
  artRect(25, -133, 17, 107, 5, '#755c41', '#c7a671');
  const body = ctx.createLinearGradient(-38, 0, 38, 0);
  body.addColorStop(0, '#69513b'); body.addColorStop(0.18, '#e7cc93');
  body.addColorStop(0.25, '#665144'); body.addColorStop(0.85, '#483742'); body.addColorStop(1, '#bd915b');
  artRect(-38, -139, 76, 117, 10, body, '#f9d99e');
  artRect(-34, -162, 68, 31, 7, '#13213a', '#f4c475');
  artText('LUCKY 7', 0, -141, 21, '#ffe2a5');
  artRect(-29, -123, 58, 43, 5, '#0a172b', '#e5c283');
  for (let i = 0; i < 3; i++) {
    artRect(-25 + i * 18, -119, 16, 34, 2, '#fff0cf');
    artText(['7','★','7'][(i + Math.floor((REDUCED_MOTION ? 0 : t) * 0.8 + e.seed)) % 3], -17 + i * 18, -95, 23, '#b3434b');
  }
  artRect(-25, -73, 50, 16, 3, '#163a47', '#d3b16d');
  artText('$25 / PLAY', 0, -61, 11, '#ffde9d');
  artRect(-21, -47, 42, 9, 3, '#08111f');
  ctx.fillStyle = '#fd7869'; ctx.beginPath(); ctx.arc(0, -29, 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d7d9cd'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(40, -92); ctx.lineTo(50, -130); ctx.stroke();
  ctx.fillStyle = '#ef7367'; ctx.beginPath(); ctx.arc(50, -134, 7, 0, Math.PI * 2); ctx.fill();
  for (let b = 0; b < 7; b++) {
    ctx.fillStyle = !REDUCED_MOTION && (Math.floor(t * 4) + b) % 4 === 0 ? '#fff9df' : '#dcae63';
    ctx.beginPath(); ctx.arc(-27 + b * 9, -157, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
