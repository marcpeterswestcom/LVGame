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
  ctx.save(); ctx.globalAlpha *= 0.22; ctx.fillStyle = color;
  // Long cast shadow and a denser contact shadow anchor objects to the pavement.
  ctx.beginPath(); ctx.ellipse(x + width * 0.7, y + width * 0.25, width * 1.5, width * 0.26, 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha *= 1.6;
  ctx.beginPath(); ctx.ellipse(x, y, width, width * 0.19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function artPoly(points, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// Perspective is shared by paving, actors, prompts and visibility checks.
// Equal world X stays aligned with the player in every lane.
function stripDepth(y) {
  return ROWS[0].s + (y / H - ROWS[0].yf) *
    (ROWS[2].s - ROWS[0].s) / (ROWS[2].yf - ROWS[0].yf);
}

function projectStripX(worldX, camX, y) {
  const anchor = W * PLAYER_SCREEN_X;
  return anchor + (worldX - camX - anchor) * stripDepth(y);
}

function artBuildingVolume(x, y, w, h, depth, face, accent) {
  const vanishingX = W * 0.3;
  const left = x + (vanishingX - x) * 0.14;
  const right = x + w + (vanishingX - x - w) * 0.14;
  // Roof corners recede toward the camera's vanishing point.
  const roof = ctx.createLinearGradient(0, y-depth, 0, y);
  roof.addColorStop(0, '#526478'); roof.addColorStop(0.82, '#34485f'); roof.addColorStop(1, '#87909a');
  artPoly([[x,y],[left,y-depth],[right,y-depth],[x+w,y]], roof, '#8595a5');
  if (x + w / 2 < vanishingX) {
    artPoly([[x+w,y],[right,y-depth],[right,y+h-depth],[x+w,y+h]], '#101c30', '#394e65');
  } else {
    artPoly([[left,y-depth],[x,y],[x,y+h],[left,y+h-depth]], '#111e31', '#394e65');
  }
  artRect(x, y, w, h, 1, face, accent);
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
  const scale = artScale(), span = 600 * scale;
  const off = camX * MID_P;
  const first = Math.floor(off / span) - 1;
  const zi = game ? Math.max(0, game.zoneIdx) : 0;
  const zone = ZONES[zi];
  for (let i = first; i < first + Math.ceil(W / span) + 3; i++) {
    const x = i * span - off;
    const variant = ((i % 3) + 3) % 3;
    const w = span - 95 * scale;
    const height = (variant === 0 ? 145 : variant === 1 ? 116 : 130) * scale;
    const base = H * streetTopF;
    const y = base - height;
    const accent = variant === 0 ? zone.color : variant === 1 ? '#f37c69' : '#6cd8ce';
    const sign = variant === 0 ? zone.name : variant === 1 ? 'THE NIGHT OWL' : 'LUCKY STAR';
    ctx.save();
    // Hotel towers sit behind the low casino, with separate roof and side planes.
    const towerW = w * (variant === 1 ? 0.48 : 0.66);
    const towerH = (110 + rnd(i + 11) * 100) * scale;
    const towerX = x + (w - towerW) * 0.5;
    const towerY = y - towerH + 24 * scale;
    const towerFace = ctx.createLinearGradient(towerX, 0, towerX + towerW, 0);
    towerFace.addColorStop(0, '#293c56'); towerFace.addColorStop(0.55, '#49617a'); towerFace.addColorStop(1, '#24374e');
    artBuildingVolume(towerX, towerY, towerW, towerH, 24 * scale, towerFace, '#78899b');
    // Recessed window strips and narrow fins give the hotel facade relief.
    for (let bay = 0; bay < 9; bay++) {
      const bx = towerX + (9 + bay * (towerW / scale - 20) / 9) * scale;
      ctx.fillStyle = '#0b203140'; ctx.fillRect(bx, towerY + 10*scale, towerW/12, towerH-10*scale);
      ctx.fillStyle = '#aac2cf33'; ctx.fillRect(bx-2*scale, towerY+8*scale, 1.5*scale, towerH-8*scale);
    }
    for (let floor = 0; floor < Math.floor(towerH / (18 * scale)) - 1; floor++) {
      for (let room = 0; room < 9; room++) {
        const lit = rnd(i * 117 + floor * 13 + room) > 0.38;
        ctx.fillStyle = lit ? (room % 3 === 0 ? '#ffe6ab9c' : '#8ccfe060') : '#101e3399';
        ctx.fillRect(towerX + (10 + room * (towerW / scale - 20) / 9) * scale,
          towerY + (12 + floor * 18) * scale, towerW / 14, 8 * scale);
      }
    }
    ctx.fillStyle = accent; ctx.fillRect(towerX, towerY + 3 * scale, towerW, 2 * scale);
    artRect(towerX + towerW*0.3, towerY - 11*scale, towerW*0.4, 11*scale, 1, '#24394c', '#7b8c9c');
    ctx.fillStyle = accent; ctx.fillRect(towerX+towerW*0.33,towerY-8*scale,towerW*0.34,2*scale);
    const stone = ctx.createLinearGradient(0, y, 0, base);
    stone.addColorStop(0, '#3d4255'); stone.addColorStop(0.4, '#263647'); stone.addColorStop(1, '#111d2b');
    artBuildingVolume(x, y, w, height, 32 * scale, stone, '#52606c');
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
    artPoly([[signX-10*scale,y+19*scale],[signX,y+9*scale],
      [signX+signW+16*scale,y+9*scale],[signX+signW+5*scale,y+19*scale]], '#9a8566', '#e0be87');
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
  const span = 145 * artScale();
  const anchor = W * PLAYER_SCREEN_X;
  const minDepth = stripDepth(top);
  const first = Math.floor((camX + anchor - anchor / minDepth) / span) - 1;
  const last = Math.ceil((camX + anchor + (W - anchor) / minDepth) / span) + 1;
  // Tile joints converge toward the horizon; near tiles move faster than far tiles.
  const bands = [0, 0.11, 0.26, 0.45, 0.69, 1];
  for (let row = 0; row < bands.length - 1; row++) {
    const y = top + (H - top) * bands[row];
    const nextY = top + (H - top) * bands[row + 1];
    for (let i = first; i <= last; i++) {
      const wx = (i + (row % 2) * 0.5) * span;
      artPoly([[projectStripX(wx,camX,y),y], [projectStripX(wx+span,camX,y),y],
        [projectStripX(wx+span,camX,nextY),nextY], [projectStripX(wx,camX,nextY),nextY]],
        (i + row) % 2 ? '#b8c7d309' : '#020c1c12', '#aec5d51c');
    }
  }
  // Recessed lane lights use the same projection as feet and pickups.
  for (const row of ROWS) {
    for (let i = first; i <= last; i++) {
      const x = projectStripX(i * span, camX, row.yf * H);
      ctx.fillStyle = '#071727'; ctx.fillRect(x-2, row.yf * H+6, 14*row.s, 4*row.s);
      ctx.fillStyle = '#a3dfd078'; ctx.fillRect(x, row.yf * H+7, 9*row.s, 2*row.s);
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
  const y = H * sidewalkTopF - 10;
  const depth = stripDepth(y), anchor = W * PLAYER_SCREEN_X;
  const first = Math.floor((camX+anchor-anchor/depth) / span)-1;
  for (let i = first; i < first + Math.ceil(W / (span*depth)) + 3; i++) {
    const x = projectStripX(i * span + 100 * scale, camX, y);
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
    artShadow(6, 2, 33);
    artPoly([[-26,-21],[-13,-32],[36,-32],[26,-21]], '#829089', '#a8ada0');
    artPoly([[26,-21],[36,-32],[36,-10],[26,0]], '#152b35');
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
  artPoly([[-25,-4],[0,-13],[25,-4],[0,5]], '#355163', color+'99');
  artPoly([[-25,-4],[0,5],[0,10],[-25,1]], '#132a40');
  artPoly([[0,5],[25,-4],[25,1],[0,10]], '#091b30');
  const glow = ctx.createLinearGradient(0,-64,0,0);
  glow.addColorStop(0, color+'00'); glow.addColorStop(1, color+'24');
  artPoly([[-17,-62],[17,-62],[23,-5],[-23,-5]],glow);
  ctx.translate(0, -51 + bob);
  artPoly([[27,-33],[34,-39],[34,24],[27,31]], '#061327', color+'55');
  artPoly([[-27,-33],[-20,-39],[34,-39],[27,-33]], '#527082',color+'88');
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
  artPoly([[-34,-162],[-19,-176],[48,-176],[34,-162]], '#b7a784', '#f9d99e');
  artPoly([[34,-162],[48,-176],[48,-38],[34,-22]], '#332c39', '#a6855f');
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
