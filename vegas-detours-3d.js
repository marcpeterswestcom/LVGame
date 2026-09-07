/* Short story encounters. All prices and consequences are shown before a choice. */
'use strict';

const DETOUR_SOUVENIRS = {
  bottle: 'Bottle Service', wedding: 'Just Married', buffet: 'Buffet Legend',
  pool: 'Pool VIP', security: 'Smooth Talker', wheel: 'Skyline Selfie', coaster: 'Coaster Survivor',
};
const DETOURS = {
  wheel: { title: 'HIGH ROLLER', tag: 'THE LINQ · ABOVE THE NEON', ride: 'wheel', color: '#8be7ef', sign: ['HIGH', 'ROLLER'],
    intro: 'A glowing observation wheel rises above the Strip. Step into a cabin for a skyline view and a quiet moment above the crowds. Ticket: $35 in game cash.',
    choices: [
      {label:'Ride the High Roller',cost:35,score:250,drunk:-8,seconds:20,souvenir:'wheel',ride:'wheel',
        title:'VEGAS LOOKS SMALL FROM UP HERE.',result:'You collect a skyline selfie, wave at the tiny traffic below, and return to the Strip with your head a little clearer.'},
      {label:'Keep your feet on the ground',leave:true}
    ] },
  coaster: { title: 'THE BIG APPLE COASTER', tag: 'NEW YORK–NEW YORK · HOLD ON TIGHT', ride: 'coaster', color: '#ffc369', sign: ['BIG APPLE', 'COASTER'],
    intro: 'The red track twists through New York–New York’s skyline. One ticket, one wild lap. Ticket: $25 in game cash. At 60+ drunk, expect a queasy landing: 12 more water lost and a short stumble.',
    choices: [
      {label:'Buckle up and ride',cost:25,score:350,hyd:-6,seconds:12,souvenir:'coaster',ride:'coaster',
        title:'YOUR SCREAM HAD ITS OWN ZIP CODE.',result:'You survive the hills and turns, find your sunglasses still on your head, and leave with a Coaster Survivor photo.'},
      {label:'Watch from the sidewalk',leave:true}
    ] },
  club: { title: 'THE VELVET ROOM', tag: 'A VERY EXPENSIVE WRONG TURN', cell: 0, color: '#f59cba', sign: ['VELVET', 'ROOM'],
    intro: 'You followed the pink lights into a strip club. The host smiles. The bouncer does not. “Champagne is $100 a bottle, sweetheart.”',
    choices: [
      { label: 'Order the champagne', cost: 100, score: 500, drunk: 12, hyd: -8, bladder: 12, seconds: 12, souvenir: 'bottle', drinks: 1,
        title: 'BOTTLE SERVICE, BABY.', result: 'A sparkler arrives. Everyone applauds. Your bank balance has quietly left the party.' },
      { label: 'Walk away', leave: true },
    ] },
  chapel: { title: 'ONE MORE CHANCE CHAPEL', tag: 'WHAT COULD POSSIBLY GO WRONG?', cell: 1, color: '#f3bcb2', sign: ['MIDNIGHT', 'CHAPEL'],
    intro: 'The officiant has a pompadour, a microphone, and an opening in three minutes. Someone hands you a bouquet. “The quick ceremony is $75.”',
    choices: [
      { label: 'Say “I do”', cost: 75, score: 350, seconds: 25, souvenir: 'wedding',
        title: 'JUST MARRIED. PROBABLY.', result: 'You leave with a plastic ring, a blurry photo, and several important questions for tomorrow.' },
      { label: 'Escape before the vows', leave: true },
    ] },
  buffet: { title: 'THE MIDNIGHT BUFFET', tag: 'YOUR BEST IDEA ALL NIGHT', cell: 2, color: '#f7c977', sign: ['MIDNIGHT', 'BUFFET'],
    intro: 'The chef sees the look on your face and reaches for a bigger plate. Tacos, pizza, shrimp, and a very sensible glass of water. One plate: $35.',
    choices: [
      { label: 'Build a heroic plate', cost: 35, score: 50, drunk: -28, hyd: 20, seconds: 25, souvenir: 'buffet', foods: 1,
        title: 'A SMALL MOUNTAIN OF REGRET.', result: 'You rediscover your ability to walk in a straight line. The shrimp were a bold choice, but tonight they are on your side.' },
      { label: 'Keep walking', leave: true },
    ] },
  pool: { title: 'AFTERGLOW POOL CLUB', tag: 'VIP HAS A PRICE', cell: 3, color: '#83e2df', sign: ['AFTERGLOW', 'POOL CLUB'],
    intro: 'The bass is loud. The pool is glowing. A $60 wristband gets you the VIP treatment out on the Strip — and attracts a more demanding crowd.',
    choices: [
      { label: 'Get the VIP wristband', cost: 60, seconds: 10, vip: 35, souvenir: 'pool',
        title: 'YOU KNOW SOMEONE NOW.', result: 'For the next 35 seconds of walking, drink points are worth 1.5×. More hazards will spawn, too. The wristband does not make you invincible.' },
      { label: 'Stay outside the velvet rope', leave: true },
    ] },
  security: { title: 'CASINO SECURITY', tag: 'THEY HAVE SEEN YOUR DANCE MOVES', cell: 4, color: '#a9c5ee', sign: ['CASINO', 'SECURITY'],
    intro: 'You step through the wrong door. A wall of monitors replays your entrance. The guard folds his arms. “We can talk, or you can settle the $40 disturbance fee.”',
    choices: [
      { label: 'Talk your way out', talk: true },
      { label: 'Pay the fee', cost: 40, seconds: 5, title: 'NOTHING TO SEE HERE.', result: 'The guard pockets the paperwork and points you toward the exit. You take the hint.' },
      { label: 'Accept the free escort', score: -50, seconds: 15, kicked: true, title: 'THE EXIT IS THIS WAY.', result: 'You are escorted past the same cameras, this time with considerably less swagger.' },
    ] },
};

function loadSouvenirs() {
  try {
    const saved = JSON.parse(localStorage.getItem('vss-3d-souvenirs') ?? localStorage.getItem('vss-souvenirs') ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter(id => Object.hasOwn(DETOUR_SOUVENIRS, id)) : []);
  } catch (_) { return new Set(); }
}
const souvenirCollection = loadSouvenirs();

function syncSouvenirs() {
  const names = [...souvenirCollection].map(id => DETOUR_SOUVENIRS[id]);
  $('souvenir-line').textContent = names.length ? `NIGHTLIFE SOUVENIRS ${names.length}/7 · ${names.join(' · ')}`
    : 'SEVEN VEGAS SOUVENIRS TO DISCOVER';
}

function buildDetourStops(g) {
  const stops = [['club', 1100], ['chapel', 5600], ['buffet', 9400], ['pool', 15500], ['security', 21500], ['coaster', 7600], ['wheel', 14300]];
  for (const [id, position] of stops) {
    let x = position;
    while (g.entities.some(e => Math.abs(e.worldX - x) < 260)) x += 380;
    g.entities.push({ kind: 'detour', detourId: id, worldX: x, row: 0, t: 0, dead: false });
  }
}

function securityOdds() { return game.drunk < 40 ? 0.85 : game.drunk < 70 ? 0.60 : 0.30; }

function maybeEnterDetour() {
  const g = game;
  if (phase !== 'play' || paused || g.drunk < 70 || g.hyd < 12 || g.runTime < 18
    || g.time < g.nextDetourAt || g.autoClubLap === g.lap || g.peeing > 0
    || g.riding > 0 || g.stagger > 0 || g.invuln > 0) return false;
  return enterDetour('club', null, true);
}

function enterDetour(id, source = null, automatic = false) {
  if (!Object.hasOwn(DETOURS, id) || phase !== 'play' || paused || game.detour
    || game.peeing > 0 || game.drunk >= 100 || game.hyd <= 0 || source?.dead) return false;
  if (game.riding > 0) {
    popText(W * PLAYER_SCREEN_X, H * ROWS[game.row].yf - 130, 'ON FOOT ONLY — COME BACK NEXT LAP', '#f5cf8b');
    return false;
  }
  releaseInputs();
  if (source) source.dead = true;
  if (id === 'club') {
    game.autoClubLap = game.lap;
    // A drunken visit also consumes this lap's doorway, preventing duplicate club rewards.
    game.entities.forEach(e => { if (e.kind === 'detour' && e.detourId === 'club') e.dead = true; });
  }
  game.grabTarget = null;
  game.detour = { id, stage: 'choice', automatic, outcome: null };
  game.counts.detours++;
  phase = 'detour';
  hud.classList.remove('on');
  $('zone-card').classList.remove('show');
  $('detour-screen').classList.remove('hidden');
  renderDetour();
  $('detour-title').focus();
  sfx.zone();
  return true;
}

function rideChoice(choice) {
  if (choice.ride !== 'coaster' || game.drunk < 60) return choice;
  return {...choice, hyd:-18, queasy:true,
    title:'THE TRACK STOPPED. YOUR STOMACH DID NOT.',
    result:'You get the souvenir photo, but the ride leaves you queasy. Extra water lost, wobbly legs, and a firm resolution to find a water cart.'};
}

function detourEffectText(choice) {
  choice = rideChoice(choice);
  if (choice.leave) return 'No charge. No meter or time penalty.';
  if (choice.talk) return `${Math.round(securityOdds() * 100)}% chance · success: +125 pts, 8s · failure: −50 pts, 15s + escort`;
  const values = [choice.cost ? `$${choice.cost}` : 'Free'];
  if (choice.score) values.push(`${choice.score > 0 ? '+' : '−'}${Math.abs(choice.score)} pts`);
  if (choice.drunk) values.push(`Drunk ${Math.round(game.drunk)} → ${Math.round(Math.max(0, Math.min(100, game.drunk + choice.drunk)))}`);
  if (choice.hyd) values.push(`Water ${Math.round(game.hyd)} → ${Math.round(Math.max(0, Math.min(100, game.hyd + choice.hyd)))}`);
  if (choice.bladder) values.push(`Bladder +${choice.bladder}`);
  if (choice.seconds) values.push(`${choice.seconds}s off last call`);
  if (choice.vip) values.push('35s: 1.5× drink points; hazard spawn chance +10 percentage points (72% cap)');
  if (choice.kicked || choice.queasy) values.push('brief stumble');
  return values.join(' · ');
}

function detourFatalWarning(choice) {
  choice = rideChoice(choice);
  if (game.drunk + (choice.drunk || 0) >= 100) return 'This will cause a BLACKOUT.';
  if (game.hyd + (choice.hyd || 0) <= 0) return 'This will cause DEHYDRATION COLLAPSE.';
  if (game.bladder + (choice.bladder || 0) >= 100) return 'Your bladder will overflow when you return.';
  return '';
}

function renderDetour() {
  const active = game.detour;
  if (!active) return;
  const scene = DETOURS[active.id], result = active.stage === 'result', riding = active.stage === 'ride', outcome = active.outcome;
  const panel = $('detour-panel');
  panel.style.setProperty('--detour-accent', scene.color);
  panel.classList.toggle('has-attraction', !!scene.ride);
  panel.classList.toggle('is-kicked', !!outcome?.kicked);
  $('detour-art').hidden = !!scene.ride;
  $('ride-preview').hidden = !scene.ride;
  $('ride-skip').hidden = !riding;
  if (scene.ride) drawAttraction(scene.ride, result ? 1 : 0);
  const cell = outcome?.kicked ? 5 : (scene.cell || 0);
  $('detour-art').style.backgroundPosition = `${(cell % 3) * 50}% ${Math.floor(cell / 3) * 100}%`;
  $('detour-art').setAttribute('aria-label', outcome?.kicked ? 'A bouncer points a surprised tourist back onto the sidewalk.' : scene.title + ' illustrated scene');
  $('detour-tag').textContent = result ? 'ANOTHER STORY FOR TOMORROW' : active.automatic ? 'YOU FOLLOWED THE WRONG NEON LIGHTS' : scene.tag;
  $('detour-title').textContent = result ? outcome.title : scene.title;
  $('detour-story').textContent = result ? outcome.result : scene.intro;
  $('detour-cash').textContent = '$' + game.cash;
  $('detour-drunk').textContent = Math.round(game.drunk) + '/100';
  $('detour-hyd').textContent = Math.round(game.hyd) + '/100';
  $('detour-clock').textContent = mmss(game.lastCall / 3.4);
  $('detour-note').textContent = result ? 'Your choice is settled. Continue when you are ready.'
    : 'Street, meters and clock are paused. Only the listed costs apply when you choose.';
  if (riding) $('detour-note').textContent = 'Enjoy the ride. All costs are already settled; meters and clock stay paused. Skip to the arrival whenever you like.';
  $('detour-controls').hidden = result || riding;
  $('detour-result').hidden = !result;
  $('detour-souvenir').textContent = outcome?.souvenir ? `SOUVENIR · ${DETOUR_SOUVENIRS[outcome.souvenir]}` : '';
  $('detour-summary').textContent = outcome?.summary || '';
  const ending = game.drunk >= 100 || game.hyd <= 0;
  $('detour-continue').textContent = ending ? 'END THE NIGHT →' : 'BACK TO THE STRIP →';
  for (let i = 0; i < 3; i++) {
    const button = $('detour-choice-' + i), choice = scene.choices[i];
    button.hidden = !choice || result || riding;
    if (!choice || result || riding) continue;
    const short = !!choice.cost && game.cash < choice.cost;
    const bottleRejection = active.id === 'club' && short;
    button.disabled = short && !bottleRejection;
    $('detour-label-' + i).textContent = bottleRejection ? 'Ask for a bottle you cannot afford' : choice.label;
    $('detour-effect-' + i).textContent = bottleRejection ? `You have $${game.cash}. No charge; kicked out with a brief stumble and 5s lost.`
      : detourEffectText(choice) + (short ? ` · Need $${choice.cost - game.cash} more` : '');
    $('detour-warning-' + i).textContent = !short ? detourFatalWarning(choice) : '';
  }
}

function chooseDetour(index) {
  const active = game?.detour;
  if (phase !== 'detour' || !active || active.stage !== 'choice') return false;
  const scene = DETOURS[active.id], choice = scene.choices[index];
  if (!choice) return false;
  if (choice.leave) { resumeDetour(); return true; }
  let outcome = { ...rideChoice(choice) };
  if (choice.cost && game.cash < choice.cost) {
    if (active.id !== 'club') return false;
    outcome = { seconds: 5, kicked: true, title: 'BOTTLE DREAMS. TAP-WATER BUDGET.',
      result: 'You pat every pocket. The bouncer has seen this routine. One polite but very firm escort later, you are back under the streetlights. No money was taken.' };
  } else if (choice.talk) {
    outcome = Math.random() < securityOdds()
      ? { score: 125, seconds: 8, souvenir: 'security', title: 'THE GIFT OF THE GAB.', result: 'You explain that it was a dance move, not a medical emergency. The guard laughs once. You leave before he changes his mind.' }
      : { score: -50, seconds: 15, kicked: true, title: 'THAT STORY NEEDED WORK.', result: '“My friend is the mayor” was not the opening line you thought it was. The guard escorts you outside. At least the escort is free.' };
  }
  // Resolve once, before touching any balance; repeated clicks cannot charge twice.
  active.stage = 'result';
  game.cash -= outcome.cost || 0;
  game.score = Math.max(0, game.score + (outcome.score || 0));
  game.drunk = Math.max(0, Math.min(100, game.drunk + (outcome.drunk || 0)));
  game.hyd = Math.max(0, Math.min(100, game.hyd + (outcome.hyd || 0)));
  game.bladder = Math.max(0, Math.min(100, game.bladder + (outcome.bladder || 0)));
  game.counts.drink += outcome.drinks || 0;
  game.counts.food += outcome.foods || 0;
  if (outcome.seconds) { tickRunClock(outcome.seconds); game.time += outcome.seconds; }
  if (outcome.vip) game.vipTime = outcome.vip;
  if (outcome.souvenir) {
    game.souvenirs.add(outcome.souvenir);
    souvenirCollection.add(outcome.souvenir);
    try { localStorage.setItem('vss-3d-souvenirs', JSON.stringify([...souvenirCollection])); } catch (_) {}
    syncSouvenirs();
  }
  outcome.summary = [outcome.cost ? `Spent $${outcome.cost}` : 'No cash spent',
    outcome.score ? `${outcome.score > 0 ? '+' : '−'}${Math.abs(outcome.score)} points` : '',
    outcome.seconds ? `${outcome.seconds}s elapsed` : ''].filter(Boolean).join(' · ');
  active.outcome = outcome;
  if (outcome.ride && !REDUCED_MOTION) { active.stage = 'ride'; active.rideElapsed = 0; }
  renderDetour();
  $(active.stage === 'ride' ? 'ride-skip' : 'detour-continue').focus();
  if (outcome.kicked) sfx.noCash(); else sfx.zone();
  return true;
}

function resumeDetour() {
  if (phase !== 'detour' || !game?.detour) return;
  if (game.detour.stage === 'ride') return;
  const kicked = game.detour.outcome?.kicked || game.detour.outcome?.queasy;
  game.detour = null;
  $('detour-screen').classList.add('hidden');
  game.nextDetourAt = game.time + 45;
  releaseInputs();
  // Resolve a disclosed fatal purchase after the player has read the outcome.
  if (checkSurvival()) return;
  phase = 'play';
  game.invuln = Math.max(game.invuln, 2.5);
  if (kicked) { game.stagger = Math.max(game.stagger, 1.1); game.shake = 0.6; }
  hud.classList.add('on');
  updateHUD();
  canvas.focus();
}

function closeDetour() {
  if (game) game.detour = null;
  $('detour-screen').classList.add('hidden');
}

function handleDetourKey(e) {
  if (e.repeat) { e.preventDefault(); return; }
  const active = game.detour;
  if (!active) return;
  if (e.key.toLowerCase() === 'm') { toggleMute(); return; }
  if (active.stage === 'ride') {
    if (e.key === 'Escape') { e.preventDefault(); finishAttraction(); }
    else if (e.key === 'Tab') { e.preventDefault(); $('ride-skip').focus(); }
    return;
  }
  const buttons = active.stage === 'result' ? [$('detour-continue')]
    : [0,1,2].map(i => $('detour-choice-' + i)).filter(b => !b.hidden && !b.disabled);
  if (e.key === 'Tab') {
    e.preventDefault();
    const current = buttons.indexOf(document.activeElement);
    const next = current < 0 ? (e.shiftKey ? buttons.length - 1 : 0) : (current + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (active.stage === 'result') resumeDetour();
    else buttons[buttons.length - 1].focus(); // Focus the free exit; never silently choose a penalty.
  } else if (e.key === ' ' && e.target?.tagName !== 'BUTTON') {
    e.preventDefault();
  }
}

function initDetours() {
  $('ride-skip').addEventListener('click', finishAttraction);
  for (let i = 0; i < 3; i++) $('detour-choice-' + i).addEventListener('click', () => chooseDetour(i));
  $('detour-continue').addEventListener('click', resumeDetour);
  syncSouvenirs();
}

function drawDetourDoor(e, sx, sy, scale, t) {
  const scene = DETOURS[e.detourId], size = scale * artScale();
  ctx.save(); ctx.translate(sx, sy); ctx.scale(size, size);
  artShadow(0, 2, 44);
  artRect(-43, -157, 86, 156, 8, '#102235', scene.color);
  artRect(-32, -105, 64, 103, [28,28,0,0], '#2b243c', '#8b647e');
  // Open curtain and a warm light spilling through the doorway.
  ctx.fillStyle = scene.color + '33';
  ctx.beginPath(); ctx.moveTo(-20,-86); ctx.lineTo(20,-86); ctx.lineTo(36,0); ctx.lineTo(-36,0); ctx.fill();
  artRect(-49, -160, 98, 51, 7, '#172b3f', scene.color);
  artText(scene.sign[0], 0, -139, 15, scene.color);
  artText(scene.sign[1], 0, -120, 16, '#fff0d1');
  artRect(-28, -77, 56, 21, 4, '#162639', scene.color);
  artText(scene.ride ? 'RIDE' : 'STORY', 0, -62, 12, '#ffedcc');
  ctx.fillStyle = '#f5d496'; ctx.beginPath(); ctx.arc(20, -44, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
