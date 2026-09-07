/* Self-contained attraction animation, used only by the separate 3D edition. */
'use strict';
const RIDE_DURATION = {wheel:9, coaster:7};
function finishAttraction() {
  const active = game?.detour;
  if (phase !== 'detour' || active?.stage !== 'ride') return false;
  active.stage = 'result';
  renderDetour();
  $('detour-continue').focus();
  return true;
}
function tickAttraction(dt) {
  const active = game?.detour;
  if (phase !== 'detour' || active?.stage !== 'ride') return;
  active.rideElapsed += Math.max(0, Math.min(dt, 0.05));
  const progress = Math.min(1, active.rideElapsed / RIDE_DURATION[active.outcome.ride]);
  drawAttraction(active.outcome.ride, progress);
  if (progress >= 1) finishAttraction();
}
function coasterPoint(t) {
  const points = [[82,470],[135,340],[215,175],[300,350],[365,405],[440,245],[523,195],[562,355],[520,475],[300,505]];
  const n = points.length, u = ((t % 1 + 1) % 1) * n, i = Math.floor(u), f = u-i;
  const p = [points[(i+n-1)%n],points[i],points[(i+1)%n],points[(i+2)%n]];
  return [0,1].map(k => 0.5*((2*p[1][k])+(-p[0][k]+p[2][k])*f+
    (2*p[0][k]-5*p[1][k]+4*p[2][k]-p[3][k])*f*f+
    (-p[0][k]+3*p[1][k]-3*p[2][k]+p[3][k])*f*f*f));
}
function drawAttraction(id, progress) {
  const screen = $('ride-preview'), q = screen.getContext('2d');
  screen.setAttribute('aria-label', id === 'wheel' ? 'High Roller: illuminated cabins circle above the Las Vegas skyline.' : 'Big Apple Coaster: a yellow train races over red track through the New York skyline.');
  q.save(); q.setTransform(1,0,0,1,0,0); q.clearRect(0,0,640,640);
  const sky=q.createLinearGradient(0,0,0,640);
  sky.addColorStop(0,'#061127'); sky.addColorStop(0.6,'#382552'); sky.addColorStop(1,'#a26262');
  q.fillStyle=sky; q.fillRect(0,0,640,640);
  const line=(points,color,width=2)=>{q.beginPath();q.moveTo(...points[0]);for(const p of points.slice(1))q.lineTo(...p);q.strokeStyle=color;q.lineWidth=width;q.stroke();};
  const rect=(x,y,w,h,color,r=0)=>{q.fillStyle=color;q.beginPath();q.roundRect(x,y,w,h,r);q.fill();};
  const text=(s,x,y,size,color)=>{q.font=`700 ${size}px sans-serif`;q.textAlign='center';q.fillStyle=color;q.fillText(s,x,y);};
  const circle=(x,y,r,color)=>{q.beginPath();q.arc(x,y,r,0,Math.PI*2);q.fillStyle=color;q.fill();};
  for(let i=0;i<75;i++)circle(rnd(i+50)*640,rnd(i+80)*350,0.6+rnd(i)*1.2,'#e4eafa88');
  circle(540,76,23,'#eee4ce');
  // Layered hotel blocks with lit windows establish a skyline below the rides.
  for(let i=0;i<17;i++) {
    const x=i*42-20, h=60+rnd(i+19)*170, y=515-h;
    rect(x,y,36,h,'#122238'); rect(x+29,y+8,10,h-8,'#091b2c');
    if(id==='coaster' && i%3===1){rect(x+8,y-20,20,20,'#263953');line([[x+18,y-20],[x+18,y-47]],'#a6a7b0',2);}
    for(let row=0;row<h/18-1;row++)for(let col=0;col<3;col++) {
      if(rnd(i*91+row*8+col)>0.35)rect(x+5+col*9,y+10+row*18,4,7,row%3?'#dbb77b88':'#7dd3e088');
    }
  }
  rect(0,515,640,125,'#102339');
  for(let i=0;i<22;i++)rect(i*31,540+(i%3)*9,16,2,i%2?'#e3ae6677':'#79d8e177');
  if(id==='wheel') {
    const cx=320,cy=277,r=207;
    line([[225,516],[cx,cy],[416,516]],'#091829',17);
    line([[225,516],[cx,cy],[416,516]],'#83aabd',8);
    line([[241,500],[398,500]],'#5b8eac',9);
    q.beginPath();q.arc(cx,cy,r,0,Math.PI*2);q.strokeStyle='#283f5d';q.lineWidth=12;q.stroke();
    q.beginPath();q.arc(cx,cy,r,0,Math.PI*2);q.strokeStyle='#72e5ed';q.lineWidth=3;q.stroke();
    const spin = progress*Math.PI*2;
    for(let i=0;i<20;i++) {
      const a=i*Math.PI/10+spin+Math.PI/2, x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      line([[cx,cy],[x,y]],'#91b7c677',1.5);
      circle(x,y,4,'#a2f1ef');
      rect(x-12,y-5,24,20,i===0?'#ffcb73':'#4a778c',8);
      rect(x-9,y-2,18,10,i===0?'#ffeccc':'#b7eeec',4);
      line([[x-12,y+10],[x+12,y+10]],'#173549',2);
      if(i===0) {text('YOU',x,y-14,12,'#ffe6af');circle(x,y+3,3,'#e87e63');}
    }
    circle(cx,cy,18,'#214057');circle(cx,cy,11,'#d9eeee');circle(cx,cy,5,'#f5c77f');
    rect(242,502,156,37,'#1c3e52',5);text('THE LINQ',320,527,18,'#b5f0ec');
  } else {
    // Paired rails, ties, steel supports, and cars whose pitch follows the track.
    for(let i=0;i<24;i++) {
      const [x,y]=coasterPoint(i/24);
      line([[x,y],[x-22,524],[x+22,524],[x,y]],'#8292a277',3);
    }
    const track=[];
    for(let i=0;i<=240;i++)track.push(coasterPoint(i/240));
    line(track.map(([x,y])=>[x,y+11]),'#7c253c',6);
    line(track,'#ff7469',5);
    for(let i=0;i<100;i++) {
      const [x,y]=coasterPoint(i/100);line([[x,y],[x,y+11]],'#ffbb8e',2);
    }
    for(let car=3;car>=0;car--) {
      const t=progress-car*0.016, p=coasterPoint(t), next=coasterPoint(t+0.001);
      q.save();q.translate(...p);q.rotate(Math.atan2(next[1]-p[1],next[0]-p[0]));
      rect(-13,-19,26,15,car===0?'#ffc65d':'#d79e45',3);
      circle(-8,-1,4,'#0b1929');circle(8,-1,4,'#0b1929');
      circle(-5,-23,4,'#f6bd93');circle(6,-23,4,'#f6bd93');
      line([[-8,-13],[-8,-20],[9,-20],[9,-13]],'#314258',3);
      q.restore();
    }
    rect(193,515,254,33,'#293447',4);text('NEW YORK–NEW YORK',320,538,16,'#ffd78d');
  }
  text(id==='wheel'?'ABOVE THE STRIP':'ONE WILD LAP',320,594,22,'#fff1ce');
  if(game?.detour?.stage==='ride') {
    rect(110,612,420,4,'#90a7b633',2);rect(110,612,420*progress,4,id==='wheel'?'#8be7ef':'#ffc369',2);
  }
  q.restore();
}
