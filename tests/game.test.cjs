const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const defaultEdition = process.env.VEGAS_EDITION === '3d' ? '3d' : 'original';

function harness({ width = 1280, height = 760, images = true, reduced = false, storage = {}, edition = defaultEdition } = {}) {
  const html = fs.readFileSync(path.join(root, edition === '3d' ? 'vegas-3d.html' : 'vegas-neon-redux.html'), 'utf8');
  const source = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const elements = new Map(), listeners = {}, timers = new Map();
  let timerId = 0, depth = 0, imageDraws = 0;
  const noop = () => {};
  const gradient = () => ({ addColorStop: noop });
  const ctx = new Proxy({
    save() { depth++; }, restore() { assert.ok(depth > 0, 'balanced canvas restores'); depth--; },
    createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: (s) => ({ width: s.length * 8 }),
    drawImage(img, ...args) {
      assert.ok(img.naturalWidth > 0 || img.width > 0, 'only decoded images or canvas are drawn');
      assert.ok(args.every(Number.isFinite), 'finite image dimensions');
      imageDraws++;
    },
  }, { get(target, key) { return key in target ? target[key] : noop; } });
  function element() {
    const classes = new Set();
    return { style: { setProperty(k,v) { this[k] = v; } }, children: [], attributes: {}, textContent: '', hidden:false, disabled:false,
      classList: { add: (s) => classes.add(s), remove: (s) => classes.delete(s),
        contains: (s) => classes.has(s), toggle(s, on) { if (on) classes.add(s); else classes.delete(s); } },
      appendChild(n) { this.children.push(n); }, getContext: () => ctx,
      addEventListener: noop, focus() { sandbox.document.activeElement = this; }, setAttribute(k, v) { this.attributes[k] = v; },
    };
  }
  class Asset {
    set src(src) {
      const bytes = fs.readFileSync(path.join(root, src));
      this.complete = images;
      this.naturalWidth = images ? bytes.readUInt32BE(16) : 0;
      this.naturalHeight = images ? bytes.readUInt32BE(20) : 0;
    }
  }
  const addTimer = (fn) => { const id = ++timerId; timers.set(id, fn); return id; };
  const sandbox = {
    console, Image: Asset, performance: { now: () => 0 }, requestAnimationFrame: noop,
    setTimeout: addTimer, clearTimeout: (id) => timers.delete(id),
    setInterval: addTimer, clearInterval: (id) => timers.delete(id),
    localStorage: { getItem: key => storage[key] ?? null, setItem: (key,value) => { storage[key] = String(value); } },
    window: { innerWidth: width, innerHeight: height, devicePixelRatio: 1,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      matchMedia: () => ({ matches: reduced }),
    },
    document: { getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, edition === '3d' ? 'vegas-art-3d.js' : 'vegas-art.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'vegas-music.js'), 'utf8'), sandbox);
  if (edition === '3d') vm.runInContext(fs.readFileSync(path.join(root, 'vegas-rides.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, edition === '3d' ? 'vegas-detours-3d.js' : 'vegas-detours.js'), 'utf8'), sandbox);
  vm.runInContext(source, sandbox);
  const run = (s) => vm.runInContext(s, sandbox);
  run('muted = true; game = newGame(); phase = "play";');
  return { run, elements, listeners, timers, storage, depth: () => depth, imageDraws: () => imageDraws };
}

test('a drink that reaches 100 drunk immediately ends the run', () => {
  const h = harness();
  h.run("game.drunk = 95; game.grabTarget = {kind:'drink', row:1, type:DRINKS[0]}; tryGrab();");
  assert.equal(h.run('phase'), 'end');
  assert.equal(h.run('game.over'), 'blackout');
});

test('metabolism cannot erase a pending blackout at update start', () => {
  const h = harness();
  h.run('game.drunk = 100; update(1/60);');
  assert.equal(h.run('game.over'), 'blackout');
});

test('a tourist collision that caps drunkenness ends the run in the same update', () => {
  const h = harness();
  h.run("game.drunk = 96; game.entities = [{kind:'hazard', type:HAZARDS[3], row:1, worldX:3, t:0}]; update(1/60);");
  assert.equal(h.run('game.over'), 'blackout');
});

test('draining the last hydration through a drink ends immediately', () => {
  const h = harness();
  h.run("game.hyd = 3; game.grabTarget = {kind:'drink', row:1, type:DRINKS[0]}; tryGrab();");
  assert.equal(h.run('game.over'), 'collapse');
});

test('slots advance elapsed time and last call while hydration drains', () => {
  const h = harness();
  h.run('enterSlots(); slotTick(10);');
  assert.equal(h.run('game.runTime'), 10);
  assert.equal(h.run('game.lastCall'), 966);
  assert.equal(h.run('game.hyd'), 94);
  assert.equal(h.run('phase'), 'slots');
});

test('last call warns and clamps at zero inside slots', () => {
  const h = harness();
  h.run('enterSlots(); game.lastCall = 205; slotTick(1);');
  assert.equal(h.run('game.lastCallWarned'), true);
  h.run('game.lastCall = 1; slotTick(1);');
  assert.equal(h.run('game.lastCall'), 0);
});

test('collapse closes slots and a new run resets the counters', () => {
  const h = harness();
  h.run('enterSlots(); game.hyd = 0.1; slotTick(1);');
  assert.equal(h.run('phase'), 'end');
  assert.ok(h.elements.get('slot-screen').classList.contains('hidden'));
  h.run('startGame();');
  assert.equal(h.run('phase'), 'play');
  assert.equal(h.run('game.runTime'), 0);
  assert.equal(h.run('game.hyd'), 100);
});

test('an abandoned slot spin cannot mutate a new run or its reels', () => {
  const h = harness();
  h.run('enterSlots(); slotPull();');
  const oldCallbacks = h.run('slotSpin.timers').map(id => h.timers.get(id));
  assert.equal(h.run('game.cash'), 25);
  h.run('game.hyd = 0.1; slotTick(1); startGame(); enterSlots(); slotPull();');
  oldCallbacks.forEach(fn => fn());
  assert.equal(h.run('game.cash'), 25);
  assert.equal(h.run('slotSpin.done'), 0);
});

test('water, food, vendor and slot transactions retain their effects', () => {
  const h = harness();
  h.run("game.hyd = 30; game.grabTarget = {kind:'water', row:1}; tryGrab();");
  assert.equal(h.run('game.hyd'), 62);
  h.run("game.drunk = 45; game.grabTarget = {kind:'food', row:1, type:FOODS[0]}; tryGrab();");
  assert.equal(h.run('game.drunk'), 27);
  h.run("game.grabTarget = {kind:'vendor', row:0, item:'water', price:20}; tryGrab();");
  assert.equal(h.run('game.cash'), 30);
  assert.equal(h.run('game.hyd'), 94);
  h.run("enterSlots(); slotResult(['7️⃣','7️⃣','7️⃣']);");
  assert.equal(h.run('game.cash'), 530);
});

test('pause freezes time and focus loss clears held movement', () => {
  const h = harness();
  h.run('togglePause(); frame(40);');
  assert.equal(h.run('game.runTime'), 0);
  h.run("togglePause(); keys.d = true;");
  h.listeners.blur[0]();
  assert.equal(h.run('paused'), true);
  assert.equal(h.run('keys.d'), false);
  assert.equal(h.elements.get('pause-btn').textContent, 'RESUME');
});

test('a completed lap banks its bonus and rebuilds the strip', () => {
  const h = harness();
  h.run('game.lastCall = 100; game.score = 30; game.drunk = 20; nextLap();');
  assert.equal(h.run('game.lap'), 2);
  assert.equal(h.run('game.score'), 1630);
  assert.equal(h.run('game.lastCall'), 1000);
  assert.ok(h.run('game.entities.some(e => e.kind === "slot")'));
});

for (const [width, height] of [[1440,900],[1280,720],[390,844],[844,390]]) {
  test(`render commands are valid at ${width}×${height}, across all zones and actor types`, () => {
    const h = harness({ width, height });
    h.run(`
      for (let z = 0; z < ZONES.length; z++) {
        game.zoneIdx = z; game.x = z * ZONE_LEN + 100;
        game.entities = HAZARDS.map((type, i) => ({kind:'hazard', type, row:i%3, worldX:game.x+60+i*45, t:i}));
        game.entities.push({kind:'water', row:1, worldX:game.x+200, t:0});
        game.entities.push({kind:'slot', row:0, worldX:game.x+100, t:0, seed:1});
        game.entities.push({kind:'vendor', row:0, worldX:game.x+300, t:0, item:'water', price:20});
        draw();
      }
      for (const ride of RIDES) { game.ride = ride; game.riding = 2; draw(); }
      game.riding = 0; game.peeing = 1; draw();
    `);
    assert.equal(h.depth(), 0);
    assert.ok(h.imageDraws() > 50);
  });
}

test('procedural fallback renders when images cannot load', () => {
  const h = harness({ images: false });
  h.run("game.entities = HAZARDS.map((type,i) => ({kind:'hazard',type,row:1,worldX:i*70,t:0})); draw();");
  assert.equal(h.depth(), 0);
  assert.equal(h.imageDraws(), 0);
});

test('reduced motion art path renders without unbalanced transforms', () => {
  const h = harness({ reduced: true });
  h.run('game.drunk = 80; game.sick = true; draw();');
  assert.equal(h.depth(), 0);
});

test('drunk double vision can redraw the canvas itself', () => {
  const h = harness();
  h.run('game.drunk = 80; game.sick = true; draw();');
  assert.equal(h.depth(), 0);
});

function instrumentMusic(h) {
  h.run(`
    let scheduledAudio = [];
    const audioParam = () => ({ value:0,
      setValueAtTime(v,t) { if (!Number.isFinite(v+t)) throw Error('invalid audio value'); },
      linearRampToValueAtTime(v,t) { if (!Number.isFinite(v+t)) throw Error('invalid audio ramp'); },
      exponentialRampToValueAtTime(v,t) { if (!(v > 0) || !Number.isFinite(t)) throw Error('invalid exponential ramp'); },
      setTargetAtTime() {},
    });
    const soundNode = () => ({ connect() {}, disconnect() {}, gain:audioParam(), frequency:audioParam(), Q:audioParam(),
      start(t) { scheduledAudio.push(t); }, stop() {},
    });
    ac = { currentTime:0, state:'running', sampleRate:44100, destination:{},
      createGain:soundNode, createOscillator:soundNode, createBiquadFilter:soundNode,
      createBufferSource:soundNode,
      createBuffer(c,n) { return { getChannelData() { return new Float32Array(n); } }; },
    };
    muted = false;
  `);
}

test('all music styles schedule valid audio, including every bar of their arrangement', () => {
  const h = harness(); instrumentMusic(h);
  h.run(`
    for (const style of MUSIC_STYLES.filter(s => s.id !== 'off')) {
      setMusicStyle(style.id);
      for (let step = 0; step < 256; step++) scheduleMusicStep(style, step, step * 60 / style.bpm / 4);
    }
  `);
  assert.ok(h.run('scheduledAudio.length') > 1000);
  assert.ok(h.run('scheduledAudio.every(Number.isFinite)'));
});

test('music Off stops the scheduler while leaving sound effects unmuted', () => {
  const h = harness(); instrumentMusic(h);
  h.run("startMusic(); setMusicStyle('off');");
  assert.equal(h.run('music.on'), false);
  assert.equal(h.run('music.timer'), null);
  assert.equal(h.run('muted'), false);
  assert.equal(h.elements.get('music-style').value, 'off');
});

test('style changes retain music volume and pause prevents new notes', () => {
  const h = harness(); instrumentMusic(h);
  h.run("setMusicVolume(0.25); setMusicStyle('lounge'); paused = true; scheduledAudio = []; ac.currentTime = 2; schedMusic();");
  assert.equal(h.run('music.volume'), 0.25);
  assert.equal(h.run('scheduledAudio.length'), 0);
  assert.equal(h.run('musicLevel()'), 0);
  h.run('paused = false; for (let i = 0; i < 10; i++) { ac.currentTime += 0.06; schedMusic(); }');
  assert.ok(h.run('scheduledAudio.length') > 0);
});

test('a delayed audio timer skips missed beats without a catch-up burst', () => {
  const h = harness(); instrumentMusic(h);
  h.run('startMusic(); scheduledAudio = []; ac.currentTime = 100; schedMusic();');
  assert.ok(h.run('scheduledAudio.length') > 0);
  assert.ok(h.run('scheduledAudio.length') < 30);
  assert.ok(h.run('scheduledAudio.every(t => t >= 100)'));
});

test('each lap places every edition-specific detour clear of other fixtures', () => {
  const h = harness();
  assert.equal(h.run('game.entities.filter(e => e.kind === "detour").length'), defaultEdition === '3d' ? 7 : 5);
  assert.ok(h.run(`game.entities.filter(e => e.kind === 'detour').every(door =>
    game.entities.every(other => other === door || Math.abs(door.worldX - other.worldX) >= 260))`));
  h.run('nextLap();');
  assert.equal(h.run('game.entities.filter(e => e.kind === "detour").length'), defaultEdition === '3d' ? 7 : 5);
});

test('a marked doorway enters its scene through the normal SPACE grab path', () => {
  const h = harness();
  h.run("game.grabTarget = game.entities.find(e => e.detourId === 'buffet'); tryGrab();");
  assert.equal(h.run('phase'), 'detour');
  assert.equal(h.run('game.detour.id'), 'buffet');
  assert.equal(h.run('game.counts.detours'), 1);
  assert.ok(h.elements.get('detour-title').textContent.includes('BUFFET'));
});

test('deciding on a scene pauses distance, hydration and last call', () => {
  const h = harness();
  h.run("enterDetour('club'); for(let i=1; i<=120; i++) frame(i*17);");
  assert.equal(h.run('game.x'), 0);
  assert.equal(h.run('game.hyd'), 100);
  assert.equal(h.run('game.runTime'), 0);
  assert.equal(h.run('game.lastCall'), 1000);
});

test('the $100 champagne is charged once, applies disclosed effects and saves a souvenir', () => {
  const h = harness();
  h.run("game.cash=125; game.drunk=70; game.hyd=80; enterDetour('club'); chooseDetour(0); chooseDetour(0);");
  assert.equal(h.run('game.cash'), 25);
  assert.equal(h.run('game.score'), 500);
  assert.equal(h.run('game.drunk'), 82);
  assert.equal(h.run('game.hyd'), 72);
  assert.equal(h.run('game.bladder'), 12);
  assert.equal(h.run('game.runTime'), 12);
  assert.equal(h.run('game.lastCall'), 959.2);
  assert.equal(h.run('game.counts.drink'), 1);
  assert.deepEqual(JSON.parse(h.storage[defaultEdition === '3d' ? 'vss-3d-souvenirs' : 'vss-souvenirs']), ['bottle']);
  assert.equal(h.run('game.detour.stage'), 'result');
});

test('an unaffordable champagne request leads to ejection without deducting money', () => {
  const h = harness();
  h.run("game.cash=23; enterDetour('club'); chooseDetour(0);");
  assert.equal(h.run('game.cash'), 23);
  assert.equal(h.run('game.souvenirs.size'), 0);
  assert.equal(h.run('game.detour.outcome.kicked'), true);
  assert.equal(h.run('game.runTime'), 5);
  h.run('resumeDetour();');
  assert.equal(h.run('phase'), 'play');
  assert.ok(h.run('game.stagger') > 0);
  assert.ok(h.run('game.invuln') >= 2.5);
});

test('walking away costs nothing and consumes the doorway', () => {
  const h = harness();
  h.run("const door=game.entities.find(e=>e.detourId==='club'); enterDetour('club',door); chooseDetour(1);");
  assert.equal(h.run('phase'), 'play');
  assert.equal(h.run('game.cash'), 50);
  assert.equal(h.run('game.runTime'), 0);
  assert.equal(h.run('enterDetour("club",door)'), false);
});

test('a fatal champagne purchase is warned and ends only after the outcome is read', () => {
  const h = harness();
  h.run("game.cash=100; game.drunk=91; enterDetour('club');");
  assert.match(h.elements.get('detour-warning-0').textContent, /BLACKOUT/);
  h.run('chooseDetour(0);');
  assert.equal(h.run('phase'), 'detour');
  assert.equal(h.run('game.drunk'), 100);
  assert.match(h.elements.get('detour-continue').textContent, /END THE NIGHT/);
  h.run('resumeDetour();');
  assert.equal(h.run('game.over'), 'blackout');
  assert.ok(h.elements.get('detour-screen').classList.contains('hidden'));
});

test('the chapel charges for a ceremony, with a free escape for an empty wallet', () => {
  const h = harness();
  h.run("game.cash=80; enterDetour('chapel'); chooseDetour(0);");
  assert.equal(h.run('game.cash'), 5);
  assert.equal(h.run('game.score'), 350);
  assert.equal(h.run('game.runTime'), 25);
  assert.ok(h.run('game.souvenirs.has("wedding")'));
  h.run("startGame(); game.cash=0; enterDetour('chapel');");
  assert.equal(h.elements.get('detour-choice-0').disabled, true);
  assert.equal(h.run('chooseDetour(0)'), false);
  h.run('chooseDetour(1);');
  assert.equal(h.run('phase'), 'play');
  assert.equal(h.run('game.cash'), 0);
});

test('buffet recovery clamps meters and charges the advertised 25 seconds', () => {
  const h = harness();
  h.run("game.drunk=20; game.hyd=95; enterDetour('buffet'); chooseDetour(0);");
  assert.equal(h.run('game.cash'), 15);
  assert.equal(h.run('game.drunk'), 0);
  assert.equal(h.run('game.hyd'), 100);
  assert.equal(h.run('game.runTime'), 25);
  assert.equal(h.run('game.counts.food'), 1);
});

test('pool VIP boosts drink points for walking time and expires', () => {
  const h = harness();
  h.run("game.cash=100; enterDetour('pool'); chooseDetour(0); resumeDetour();");
  assert.equal(h.run('game.cash'), 40);
  assert.equal(h.run('game.vipTime'), 35);
  h.run("game.grabTarget={kind:'drink',row:1,type:DRINKS[0]}; tryGrab();");
  assert.equal(h.run('game.score'), 75);
  h.run('enterSlots(); slotTick(5);');
  assert.equal(h.run('game.vipTime'), 35);
  h.run('exitSlots(); game.vipTime=0.01; update(0.02);');
  assert.equal(h.run('game.vipTime'), 0);
});

test('VIP also increases hazard spawns, not just rewards', () => {
  const normal = harness(), vip = harness();
  for (const h of [normal,vip]) h.run('Math.random=()=>0.31; game.entities=[];');
  vip.run('game.vipTime=35;');
  normal.run('spawnAhead();'); vip.run('spawnAhead();');
  assert.equal(normal.run('game.entities[0].kind'), 'drink');
  assert.equal(vip.run('game.entities[0].kind'), 'hazard');
});

test('security talk has both displayed success and failure outcomes without charging cash', () => {
  const h = harness();
  h.run("enterDetour('security');");
  assert.match(h.elements.get('detour-effect-0').textContent, /85%/);
  h.run('Math.random=()=>0; chooseDetour(0);');
  assert.equal(h.run('game.cash'), 50);
  assert.equal(h.run('game.score'), 125);
  assert.ok(h.run('game.souvenirs.has("security")'));
  h.run("startGame(); game.drunk=75; game.score=100; enterDetour('security');");
  assert.match(h.elements.get('detour-effect-0').textContent, /30%/);
  h.run('Math.random=()=>0.99; chooseDetour(0);');
  assert.equal(h.run('game.cash'), 50);
  assert.equal(h.run('game.score'), 50);
  assert.equal(h.run('game.detour.outcome.kicked'), true);
});

test('security fee is guaranteed and its free escort remains available when broke', () => {
  const h = harness();
  h.run("enterDetour('security'); chooseDetour(1);");
  assert.equal(h.run('game.cash'), 10);
  assert.equal(h.run('game.runTime'), 5);
  h.run("startGame(); game.cash=0; enterDetour('security'); chooseDetour(2); resumeDetour();");
  assert.equal(h.run('phase'), 'play');
  assert.equal(h.run('game.cash'), 0);
  assert.equal(h.run('game.over'), null);
});

test('drunken club trigger respects cooldown, vulnerability and once-per-lap gating', () => {
  const h = harness();
  h.run('game.drunk=75; game.time=30; game.runTime=30; game.invuln=1;');
  assert.equal(h.run('maybeEnterDetour()'), false);
  h.run('game.invuln=0; game.nextDetourAt=40;');
  assert.equal(h.run('maybeEnterDetour()'), false);
  h.run('game.nextDetourAt=0;');
  assert.equal(h.run('maybeEnterDetour()'), true);
  h.run('chooseDetour(1); game.time=200; game.invuln=0;');
  assert.equal(h.run('maybeEnterDetour()'), false);
  h.run('nextLap();');
  assert.equal(h.run('maybeEnterDetour()'), true);
});

test('detours do not overlap slots, and restart removes all pending choices', () => {
  const h = harness();
  h.run('enterSlots();');
  assert.equal(h.run('enterDetour("club")'), false);
  h.run("exitSlots(); enterDetour('club'); startGame();");
  assert.equal(h.run('game.detour'), null);
  assert.equal(h.run('chooseDetour(0)'), false);
  assert.equal(h.run('game.cash'), 50);
  assert.equal(h.run('game.counts.detours'), 0);
});

test('repeated keys cannot confirm an encounter and Escape only focuses the free exit', () => {
  const h = harness();
  h.run("enterDetour('security'); handleDetourKey({key:'Enter',repeat:true,preventDefault(){}});");
  assert.equal(h.run('game.detour.stage'), 'choice');
  h.run("handleDetourKey({key:'Escape',preventDefault(){}});");
  assert.equal(h.run('game.cash'), 50);
  assert.equal(h.run('game.detour.stage'), 'choice');
  assert.equal(h.run('document.activeElement === $("detour-choice-2")'), true);
  h.run("handleDetourKey({key:'Tab',preventDefault(){}});");
  assert.equal(h.run('document.activeElement === $("detour-choice-0")'), true);
});

test('souvenir collection survives restart and rejects invalid saved data', () => {
  const h = harness({storage:{'vss-souvenirs':'["bottle","invalid"]'}});
  assert.equal(h.run('souvenirCollection.size'), 1);
  h.run('startGame();');
  assert.equal(h.run('game.souvenirs.size'), 0);
  assert.equal(h.run('souvenirCollection.has("bottle")'), true);
  const broken = harness({storage:{'vss-souvenirs':'not json'}});
  assert.equal(broken.run('souvenirCollection.size'), 0);
});

test('detour atlas and all scene door renderers are available', () => {
  const png = fs.readFileSync(path.join(root,'assets/vegas-detours.png'));
  assert.equal(png.readUInt32BE(16)/png.readUInt32BE(20), 1.5);
  for (const [width,height] of [[1440,900],[390,844],[844,390]]) {
    const h = harness({width,height});
    h.run(`
      for (const id of Object.keys(DETOURS)) {
        drawDetourDoor({detourId:id}, 200, 500, 0.8, 0);
        enterDetour(id);
        if (game.detour.id !== id) throw Error('scene missing');
        resumeDetour();
      }
    `);
    assert.equal(h.depth(), 0);
  }
});

test('perspective keeps collisions aligned and increases size and parallax toward the camera', () => {
  for (const [width,height] of [[390,844],[844,390],[1440,900],[3840,1600]]) {
    const h = harness({width,height,edition:'3d'});
    h.run(`game.x = 4321; const camera = game.x - W * PLAYER_SCREEN_X;`);
    for (const row of [0,0.5,1,1.5,2]) {
      const [x,scale,movement] = h.run(`(() => {
        const y = (ROWS[0].yf + (ROWS[2].yf-ROWS[0].yf)*${row}/2)*H;
        return [projectStripX(game.x,camera,y),stripDepth(y),
          projectStripX(game.x+100,camera,y)-projectStripX(game.x+100,camera+10,y)];
      })()`);
      assert.ok(Math.abs(x-width*0.3)<1e-8, 'player and same-world-X object stay aligned');
      assert.ok(Math.abs(scale-(0.72+row*0.22))<1e-8, 'sprite size matches ground depth');
      assert.ok(Math.abs(movement-10*scale)<1e-8, 'camera parallax matches depth');
    }
  }
});

test('far-lane objects remain alive while visible on a wide display', () => {
  const h = harness({width:3840,height:1600,edition:'3d'});
  h.run(`game.x=3000; const camera=game.x-W*PLAYER_SCREEN_X;
    game.spawnCursor=12000;
    game.entities=[{kind:'water',row:0,worldX:camera-220,t:0},
      {kind:'water',row:0,worldX:camera-2200,t:0}];
    spawnAhead();`);
  assert.equal(h.run('game.entities.length'),1);
  assert.ok(h.run('projectStripX(game.entities[0].worldX,camera,ROWS[0].yf*H)')>0);
});

test('spawning reaches beyond the visible edge of the far lane', () => {
  const h = harness({width:3840,height:1600,edition:'3d'});
  h.run('game.x=4000; game.spawnCursor=4000; spawnAhead();');
  assert.ok(h.run('projectStripX(game.spawnCursor,game.x-W*PLAYER_SCREEN_X,ROWS[0].yf*H)')>3840);
});

test('ride tickets charge once and award their advertised souvenirs and costs', () => {
  for (const [id,cost,score,seconds] of [['wheel',35,250,20],['coaster',25,350,12]]) {
    const h=harness({edition:'3d'});
    h.run(`game.cash=100; game.drunk=30; game.hyd=80;
      game.grabTarget=game.entities.find(e=>e.detourId==='${id}'); tryGrab();
      chooseDetour(0); chooseDetour(0);`);
    assert.equal(h.run('game.cash'),100-cost);
    assert.equal(h.run('game.score'),score);
    assert.equal(h.run('game.runTime'),seconds);
    assert.equal(h.run('game.detour.stage'),'ride');
    assert.ok(h.run(`game.souvenirs.has('${id}')`));
    assert.deepEqual(JSON.parse(h.storage['vss-3d-souvenirs']),[id]);
    assert.equal(h.storage['vss-souvenirs'],undefined);
    h.run('finishAttraction(); finishAttraction();');
    assert.equal(h.run('game.detour.stage'),'result');
    assert.equal(h.run('game.cash'),100-cost);
    h.run('resumeDetour();');
    assert.equal(h.run('phase'),'play');
    assert.ok(h.run('game.invuln')>=2.5);
  }
});

test('unaffordable rides offer a free exit without charging or changing meters', () => {
  for(const id of ['wheel','coaster']) {
    const h=harness({edition:'3d'});
    h.run(`game.cash=0; enterDetour('${id}');`);
    assert.equal(h.elements.get('detour-choice-0').disabled,true);
    assert.equal(h.run('chooseDetour(0)'),false);
    h.run('chooseDetour(1);');
    assert.equal(h.run('phase'),'play');
    assert.equal(h.run('game.runTime'),0);
    assert.equal(h.run('game.cash'),0);
    assert.equal(h.run('game.hyd'),100);
  }
});

test('coaster warnings and outcomes agree at the drunkenness threshold', () => {
  for(const drunk of [59,60]) {
    const h=harness({edition:'3d'});
    h.run(`game.drunk=${drunk}; game.hyd=18; enterDetour('coaster');`);
    assert.equal(h.elements.get('detour-warning-0').textContent.includes('COLLAPSE'),drunk===60);
    h.run('chooseDetour(0); finishAttraction();');
    assert.equal(h.run('game.hyd'),drunk===60?0:12);
    assert.equal(h.run('phase'),'detour');
    h.run('resumeDetour();');
    assert.equal(h.run('phase'),drunk===60?'end':'play');
  }
  const h=harness({edition:'3d'});
  h.run("game.drunk=70; enterDetour('coaster'); chooseDetour(0); finishAttraction(); resumeDetour();");
  assert.equal(h.run('game.hyd'),82);
  assert.ok(h.run('game.stagger')>=1.1);
});

test('ride animations finish automatically while the street and meters remain frozen', () => {
  for(const id of ['wheel','coaster']) {
    const h=harness({edition:'3d'});
    h.run(`enterDetour('${id}'); chooseDetour(0);`);
    const before=h.run('JSON.stringify([game.x,game.hyd,game.drunk,game.runTime,game.lastCall])');
    h.run('for(let i=0;i<220;i++) tickAttraction(0.05);');
    assert.equal(h.run('game.detour.stage'),'result');
    assert.equal(h.run('JSON.stringify([game.x,game.hyd,game.drunk,game.runTime,game.lastCall])'),before);
    assert.equal(h.depth(),0);
  }
});

test('ride skipping, reduced motion and restart cannot leave a pending ride behind', () => {
  const h=harness({edition:'3d'});
  h.run("enterDetour('wheel'); chooseDetour(0); handleDetourKey({key:'Tab',preventDefault(){}});");
  assert.equal(h.run('document.activeElement === $("ride-skip")'),true);
  h.run("handleDetourKey({key:'Escape',preventDefault(){}});");
  assert.equal(h.run('game.detour.stage'),'result');
  h.run('startGame(); tickAttraction(1);');
  assert.equal(h.run('game.detour'),null);
  assert.equal(h.run('game.cash'),50);
  const reduced=harness({edition:'3d',reduced:true});
  reduced.run("enterDetour('wheel'); chooseDetour(0);");
  assert.equal(reduced.run('game.detour.stage'),'result');
  assert.equal(reduced.elements.get('ride-skip').hidden,true);
});
