/* ── AUDIO & SCHEDULING CONFIG ── */
const ZONES = [
  { name: 'Tabla',     color: '#ef4444', beats: 1,   angleStart: -22.5, angleEnd: 22.5 },
  { name: 'Sitar',     color: '#f97316', beats: 1.6, angleStart: 22.5,  angleEnd: 67.5 },
  { name: 'Flute',     color: '#fcd34d', beats: 2,   angleStart: 67.5,  angleEnd: 112.5 },
  { name: 'Tanpura',   color: '#10b981', beats: 4,   angleStart: 112.5, angleEnd: 157.5 },
  { name: 'Bell',      color: '#3b82f6', beats: 3,   angleStart: 157.5, angleEnd: 202.5 },
  { name: 'Sarangi',   color: '#8b5cf6', beats: 2.4, angleStart: 202.5, angleEnd: 247.5 },
  { name: 'Mridangam', color: '#ec4899', beats: 1.2, angleStart: 247.5, angleEnd: 292.5 },
  { name: 'Harmonium', color: '#f8fafc', beats: 4,   angleStart: 292.5, angleEnd: 337.5 }
];

let audioCtx = null;
let masterGain = null;
let mediaDest = null;
let mediaRecorder = null;
let audioChunks = [];

let bpm = 120;
let pebbles = [];
const MAX_PEBBLES = 24;
let isPlaying = false;
let snapToGrid = false;

let lookahead = 25.0; // ms
let scheduleAheadTime = 0.1; // s
let nextNoteTime = 0.0;
let currentBeat = 0;
let timerID;

/* ── CANVAS SETUP ── */
const canvas = document.getElementById('mandala-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
let cx, cy;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cx = canvas.width / 2;
  cy = canvas.height / 2;
}
window.addEventListener('resize', resize);
resize();

/* ── INIT ── */
document.getElementById('start-msg').addEventListener('click', () => {
  document.getElementById('loading-screen').style.opacity = '0';
  setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 1000);
  initAudio();
  if (!isPlaying) {
    isPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
    scheduler();
    drawLoop();
  }
});

/* ── AUDIO ENGINE ── */
function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(audioCtx.destination);

  // For export
  mediaDest = audioCtx.createMediaStreamDestination();
  masterGain.connect(mediaDest);
}

function nextNote() {
  const secondsPerBeat = 60.0 / bpm;
  nextNoteTime += secondsPerBeat * 0.1; // Check resolution: 0.1 beats
  currentBeat += 0.1;
}

function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    schedulePebbles(currentBeat, nextNoteTime);
    nextNote()
  }
  timerID = setTimeout(scheduler, lookahead);
}

function schedulePebbles(beatNum, time) {
  const TOLERANCE = 0.05;
  pebbles.forEach(p => {
    const zone = ZONES[p.zoneIdx];
    // Check if this pebble should play at the current beat (modulo its beat length)
    if (Math.abs(beatNum % zone.beats) < TOLERANCE) {
      if (time - p.lastPlayedTime > (zone.beats * 60 / bpm) * 0.8) { // Debounce
        playInstrument(p.zoneIdx, time, p.distance / 300);
        p.lastPlayedTime = time;
        p.pulseStart = performance.now(); // Visual sync
        createRipples(p);
      }
    }
  });
}

function playInstrument(zoneIdx, time, intensity) {
  const gain = audioCtx.createGain();
  gain.connect(masterGain);
  const vol = Math.max(0.1, 1 - intensity); // Closer to center = louder

  switch(zoneIdx) {
    case 0: // Tabla (Noise burst, 180Hz BP)
      playNoise(time, 0.1, 180, vol);
      break;
    case 1: // Sitar (Sawtooth 293Hz + vibrato)
      playOsc(time, 'sawtooth', 293, 0.8, 0.05, 0.4, vol * 0.3, true);
      break;
    case 2: // Flute (Sine 440Hz, slow attack)
      playOsc(time, 'sine', 440, 1.0, 0.3, 0.5, vol * 0.5);
      playNoise(time, 1.0, 440, vol * 0.05, 'bandpass');
      break;
    case 3: // Tanpura (Sine 110Hz, very slow)
      playOsc(time, 'sine', 110, 2.0, 0.5, 1.5, vol * 0.6);
      break;
    case 4: // Bell (High sine 880Hz, exp decay)
      playOsc(time, 'sine', 880, 1.5, 0.01, 1.0, vol * 0.3);
      break;
    case 5: // Sarangi (Sawtooth 220Hz, slow att/rel)
      playOsc(time, 'sawtooth', 220, 1.2, 0.4, 0.6, vol * 0.2);
      break;
    case 6: // Mridangam (Low BP Noise 60Hz)
      playNoise(time, 0.3, 60, vol);
      break;
    case 7: // Harmonium (Multisine)
      playOsc(time, 'sine', 261.6, 2.0, 0.2, 0.8, vol * 0.2);
      playOsc(time, 'sine', 392.0, 2.0, 0.2, 0.8, vol * 0.15);
      playOsc(time, 'sine', 523.2, 2.0, 0.2, 0.8, vol * 0.1);
      break;
  }
}

function playOsc(time, type, freq, dur, atk, rel, vol, vibrato=false) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  if (vibrato) {
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 6;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(time); lfo.stop(time + dur);
  }

  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + atk);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  
  osc.connect(g).connect(masterGain);
  osc.start(time); osc.stop(time + dur);
}

function playNoise(time, dur, freq, vol, type='bandpass') {
  const bufSize = audioCtx.sampleRate * dur;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i=0; i<bufSize; i++) data[i] = Math.random() * 2 - 1;
  
  const noise = audioCtx.createBufferSource();
  noise.buffer = buf;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = 1.5;

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(vol, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);

  noise.connect(filter).connect(g).connect(masterGain);
  noise.start(time);
}

/* ── INTERACTION ── */
canvas.addEventListener('mousedown', handleClick);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e.touches[0]); }, {passive:false});

function handleClick(e) {
  if (!isPlaying) return;
  
  // Transform coordinates relative to canvas center
  const rect = canvas.getBoundingClientRect();
  const rawX = e.clientX - rect.left - cx;
  const rawY = e.clientY - rect.top - cy;

  let dist = Math.hypot(rawX, rawY);
  
  // Reverse the current visual rotation to find the logical angle
  const currentRotation = (performance.now() / 1000) * (Math.PI * 2 / 120);
  let angle = (Math.atan2(rawY, rawX) - currentRotation) * 180 / Math.PI;
  
  // Normalize angle 0-360
  angle = angle % 360;
  if (angle < 0) angle += 360;

  // Check removal (if clicked near existing pebble)
  const REMOVE_RADIUS = 20;
  for (let i = pebbles.length - 1; i >= 0; i--) {
    const p = pebbles[i];
    // Check all 8 symmetrical positions
    let removed = false;
    for (let r=0; r<8; r++) {
      const symAngle = (p.angle + r * 45) * Math.PI / 180;
      const px = p.distance * Math.cos(symAngle);
      const py = p.distance * Math.sin(symAngle);
      if (Math.hypot(rawX - px, rawY - py) < REMOVE_RADIUS) {
        pebbles.splice(i, 1);
        removed = true;
        break;
      }
    }
    if (removed) return;
  }

  // Snap to grid
  if (snapToGrid) {
    dist = Math.round(dist / 80) * 80;
    if (dist === 0) dist = 80;
    angle = Math.round(angle / 45) * 45;
  }

  // Determine Zone (normalize angle for ZONES logic)
  let normAngle = angle;
  if (normAngle > 337.5) normAngle -= 360;
  
  let zoneIdx = 0;
  for (let i=0; i<8; i++) {
    const z = ZONES[i];
    if (normAngle >= z.angleStart && normAngle < z.angleEnd) {
      zoneIdx = i; break;
    }
  }

  addPebble(dist, angle, zoneIdx);
}

function addPebble(distance, angle, zoneIdx) {
  if (pebbles.length >= MAX_PEBBLES) pebbles.shift(); // Remove oldest
  pebbles.push({
    distance, angle, zoneIdx,
    lastPlayedTime: 0,
    pulseStart: 0,
    ripples: []
  });
}

function createRipples(pebble) {
  pebble.ripples.push({ start: performance.now() });
  if (pebble.ripples.length > 3) pebble.ripples.shift();
}

/* ── VISUALS (CANVAS) ── */
function drawLoop() {
  requestAnimationFrame(drawLoop);

  // Trails
  ctx.fillStyle = 'rgba(15, 10, 46, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(cx, cy);
  
  // Very slow continuous rotation (0.5 RPM)
  const now = performance.now();
  ctx.rotate((now / 1000) * (Math.PI * 2 / 120));

  // Guide circles
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  const maxRadius = Math.max(cx, cy) + 100;
  for (let r=80; r<=maxRadius; r+=80) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
  }
  // Guide lines
  for (let a=0; a<360; a+=45) {
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(maxRadius * Math.cos(a*Math.PI/180), maxRadius * Math.sin(a*Math.PI/180));
    ctx.stroke();
  }

  // Pre-calculate positions for connection lines
  const points = [];

  pebbles.forEach(p => {
    const zColor = ZONES[p.zoneIdx].color;
    
    // Pulse animation
    let scale = 1;
    const timeSincePulse = now - p.pulseStart;
    if (timeSincePulse < 300) {
      scale = 1 + 0.5 * Math.sin((timeSincePulse/300) * Math.PI);
    }

    for (let i=0; i<8; i++) {
      const symAngle = (p.angle + i * 45) * Math.PI / 180;
      const x = p.distance * Math.cos(symAngle);
      const y = p.distance * Math.sin(symAngle);
      
      points.push({x, y, color: zColor});

      // Draw Ripples
      p.ripples.forEach(rip => {
        const rTime = now - rip.start;
        if (rTime < 1000) {
          const rSize = 10 + (rTime/1000) * 40;
          const rAlpha = 1 - (rTime/1000);
          ctx.beginPath();
          ctx.arc(x, y, rSize, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${hexToRgb(zColor)}, ${rAlpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw Pebble
      ctx.beginPath();
      ctx.arc(x, y, 6 * scale, 0, Math.PI*2);
      ctx.fillStyle = zColor;
      ctx.fill();
      ctx.shadowColor = zColor;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Draw connecting lines
  ctx.lineWidth = 0.5;
  for (let i=0; i<points.length; i++) {
    for (let j=i+1; j<points.length; j++) {
      const p1 = points[i];
      const p2 = points[j];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (dist > 15 && dist < 120) { // Don't draw if too close or too far
        const alpha = 1 - (dist / 120);
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, `rgba(${hexToRgb(p1.color)}, ${alpha*0.4})`);
        grad.addColorStop(1, `rgba(${hexToRgb(p2.color)}, ${alpha*0.4})`);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
}

/* ── UI EVENT LISTENERS ── */
document.getElementById('bpmSlider').addEventListener('input', (e) => {
  bpm = parseInt(e.target.value);
  document.getElementById('bpmVal').textContent = bpm;
});

document.getElementById('snapToggle').addEventListener('change', (e) => {
  snapToGrid = e.target.checked;
});

document.getElementById('clearBtn').addEventListener('click', () => {
  pebbles = [];
  ctx.clearRect(0,0, canvas.width, canvas.height); // Instant clear
});

document.getElementById('exportImgBtn').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'sound-mandala.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.getElementById('exportAudioBtn').addEventListener('click', async () => {
  if (!mediaDest) return;
  const btn = document.getElementById('exportAudioBtn');
  btn.textContent = 'Recording 10s...';
  btn.disabled = true;
  
  audioChunks = [];
  mediaRecorder = new MediaRecorder(mediaDest.stream);
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sound-mandala-audio.webm';
    a.click();
    btn.innerHTML = 'Export Audio 🎵';
    btn.disabled = false;
    showNotification('Audio saved!');
  };
  
  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 10000);
});

function showNotification(msg) {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.classList.add('show');
  setTimeout(() => notif.classList.remove('show'), 2000);
}

// Generate the bottom guide dynamically
const guideContainer = document.getElementById('instrumentGuide');
ZONES.forEach(z => {
  const div = document.createElement('div');
  div.className = 'guide-item';
  div.innerHTML = `<div class="guide-dot" style="background:${z.color}"></div><span>${z.name}</span>`;
  guideContainer.appendChild(div);
});
