/* Interactive Engine for Nandika's Birthday Experience */

document.addEventListener('DOMContentLoaded', () => {
  initIntroSequence();
  initSparkleTrail();
  initConfettiEngine();
  initAudioEngine();
  initVinylPlayer();
  initCollapsibleSidebar();
  initPolaroidInteractions();
  initCandleInteractions();
  initTriviaQuiz();
  initScratchCards();
  initArcadeGame();
  initLetterCustomizer();
  initAllPhotosGallery();
  initWordSearchGame();
  initLivingReels();

  // Backdrop close listeners for modals
  ['polaroidModal', 'videoModal', 'allPhotosModal', 'letterEditorModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        if (e.target === el) {
          if (id === 'polaroidModal') closePolaroidModal();
          else if (id === 'videoModal') closeVideoModal();
          else if (id === 'allPhotosModal') closeAllPhotosGallery();
          else if (id === 'letterEditorModal') closeLetterEditor();
        }
      });
    }
  });

  // Seamless constant background music playback until stopped manually
  setupAutoPlayOnInteraction();
});

/* =========================================================
   1. WEB AUDIO API SOUND & MUSIC BOX SYNTHESIZER
   ========================================================= */
let audioCtx = null;
let soundFxEnabled = true;
let isMusicPlaying = false;
let musicManuallyStopped = false;
let musicBoxTimer = null;
let currentNoteIndex = 0;
let bgmDuckingFactor = 1.0;
let bgmDuckingInterval = null;
let bgmWasPlayingBeforeVideo = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Gentle sound effects
function playPopSound() {
  if (!soundFxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) { }
}

function playChimeSound() {
  if (!soundFxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.6);
    });
  } catch (e) { }
}

function playScratchSound() {
  if (!soundFxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300 + Math.random() * 200, ctx.currentTime);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) { }
}

// Lo-Fi Music Box Happy Birthday Melody (Notes in Hz & durations)
const melody = [
  { f: 261.63, d: 0.4 }, // G4
  { f: 261.63, d: 0.4 }, // G4
  { f: 293.66, d: 0.8 }, // A4
  { f: 261.63, d: 0.8 }, // G4
  { f: 349.23, d: 0.8 }, // C5
  { f: 329.63, d: 1.4 }, // B4
  { f: 0, d: 0.2 }, // rest

  { f: 261.63, d: 0.4 }, // G4
  { f: 261.63, d: 0.4 }, // G4
  { f: 293.66, d: 0.8 }, // A4
  { f: 261.63, d: 0.8 }, // G4
  { f: 392.00, d: 0.8 }, // D5
  { f: 349.23, d: 1.4 }, // C5
  { f: 0, d: 0.2 },

  { f: 261.63, d: 0.4 }, // G4
  { f: 261.63, d: 0.4 }, // G4
  { f: 523.25, d: 0.8 }, // G5
  { f: 440.00, d: 0.8 }, // E5
  { f: 349.23, d: 0.8 }, // C5
  { f: 329.63, d: 0.8 }, // B4
  { f: 293.66, d: 1.2 }, // A4
  { f: 0, d: 0.2 },

  { f: 466.16, d: 0.4 }, // F5
  { f: 466.16, d: 0.4 }, // F5
  { f: 440.00, d: 0.8 }, // E5
  { f: 349.23, d: 0.8 }, // C5
  { f: 392.00, d: 0.8 }, // D5
  { f: 349.23, d: 1.6 }, // C5
  { f: 0, d: 0.6 }
];

function playNextMusicBoxNote() {
  if (!isMusicPlaying || musicManuallyStopped) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const item = melody[currentNoteIndex];
  if (item && item.f > 0) {
    try {
      const baseVol = (document.getElementById('volumeSlider')?.value || 80) / 100;
      const vol = baseVol * bgmDuckingFactor;

      if (vol > 0.003) {
        // Main Celesta chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(item.f * 1.5, ctx.currentTime);
        gain.gain.setValueAtTime(0.12 * vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0005, ctx.currentTime + item.d * 1.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + item.d * 1.3);

        // Sweet sparkling harmonic overtone
        const oscHarmonic = ctx.createOscillator();
        const gainHarmonic = ctx.createGain();
        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(item.f * 3.0, ctx.currentTime);
        gainHarmonic.gain.setValueAtTime(0.035 * vol, ctx.currentTime);
        gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + item.d * 0.9);
        oscHarmonic.connect(gainHarmonic);
        gainHarmonic.connect(ctx.destination);
        oscHarmonic.start();
        oscHarmonic.stop(ctx.currentTime + item.d * 0.9);

        // Soft bass chime on downbeats
        if (item.d >= 0.8) {
          const oscBass = ctx.createOscillator();
          const gainBass = ctx.createGain();
          oscBass.type = 'sine';
          oscBass.frequency.setValueAtTime(item.f * 0.75, ctx.currentTime);
          gainBass.gain.setValueAtTime(0.05 * vol, ctx.currentTime);
          gainBass.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + item.d * 1.5);
          oscBass.connect(gainBass);
          gainBass.connect(ctx.destination);
          oscBass.start();
          oscBass.stop(ctx.currentTime + item.d * 1.5);
        }
      }
    } catch (e) { }
  }

  // Infinite constant loop through the entire birthday melody
  currentNoteIndex = (currentNoteIndex + 1) % melody.length;
  const delay = (item ? item.d : 0.5) * 550;
  clearTimeout(musicBoxTimer);
  musicBoxTimer = setTimeout(playNextMusicBoxNote, delay);
}

function updateSoundFxUI() {
  const soundFxIcon = document.getElementById('soundFxIcon');
  const sidebarSoundFxIcon = document.getElementById('sidebarSoundFxIcon');
  const iconName = soundFxEnabled ? 'volume_up' : 'volume_off';
  if (soundFxIcon) soundFxIcon.textContent = iconName;
  if (sidebarSoundFxIcon) sidebarSoundFxIcon.textContent = iconName;
}

function initAudioEngine() {
  const soundFxBtn = document.getElementById('soundFxBtn');
  const sidebarSoundFxBtn = document.getElementById('sidebarSoundFxBtn');

  function toggleSound() {
    soundFxEnabled = !soundFxEnabled;
    updateSoundFxUI();
    if (soundFxEnabled) playPopSound();
  }

  if (soundFxBtn) soundFxBtn.addEventListener('click', toggleSound);
  if (sidebarSoundFxBtn) sidebarSoundFxBtn.addEventListener('click', toggleSound);
}

/* =========================================================
   2. COLLAPSIBLE SIDEBAR ENGINE & SCROLLSPY
   ========================================================= */
function openSidebar() {
  const sidebar = document.getElementById('collapsibleSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && backdrop) {
    sidebar.classList.add('sidebar-open');
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    playPopSound();
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('collapsibleSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar && backdrop) {
    sidebar.classList.remove('sidebar-open');
    backdrop.classList.add('opacity-0', 'pointer-events-none');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('collapsibleSidebar');
  if (sidebar && sidebar.classList.contains('sidebar-open')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function handleNavClick(e, targetHash) {
  if (e) e.preventDefault();
  closeSidebar();
  const target = document.querySelector(targetHash);
  if (target) {
    // Smooth scroll with offset for comfortable reading
    const headerOffset = 60;
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
  playPopSound();
}

function initCollapsibleSidebar() {
  // ESC key to close sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Active section scrollspy
  const sections = document.querySelectorAll('main > section');
  const navItems = document.querySelectorAll('.sidebar-nav-item');

  function updateActiveNavLink() {
    let currentId = '';
    const scrollY = window.pageYOffset;
    sections.forEach(sec => {
      const top = sec.offsetTop - 140;
      const height = sec.offsetHeight;
      if (scrollY >= top && scrollY < top + height) {
        currentId = sec.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href === `#${currentId}`) {
        item.classList.add('nav-link-active');
      } else {
        item.classList.remove('nav-link-active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNavLink, { passive: true });
  setTimeout(updateActiveNavLink, 200);
}

/* =========================================================
   3. INTERACTIVE VINYL MUSIC PLAYER
   ========================================================= */
let customAudioEl = null;

function updateMusicUI(isPlaying) {
  const playIcon = document.getElementById('playPauseIcon');
  const audioIcon = document.getElementById('audioIcon');
  const sidebarAudioIcon = document.getElementById('sidebarAudioIcon');
  const sidebarMusicStatus = document.getElementById('sidebarMusicStatus');
  const sidebarMusicSubtitle = document.getElementById('sidebarMusicSubtitle');
  const eqBars = document.querySelectorAll('#sidebarEqBars .eq-bar');

  if (playIcon) playIcon.textContent = isPlaying ? 'pause' : 'play_arrow';
  if (audioIcon) audioIcon.textContent = isPlaying ? 'pause' : 'music_note';
  if (sidebarAudioIcon) sidebarAudioIcon.textContent = isPlaying ? 'pause' : 'play_arrow';

  if (sidebarMusicStatus) {
    sidebarMusicStatus.textContent = isPlaying ? 'Now Playing 🎵' : 'Lo-Fi Music Box';
  }
  if (sidebarMusicSubtitle) {
    sidebarMusicSubtitle.textContent = isPlaying ? "Nandika's Birthday Theme ✨" : 'Click play for birthday tunes';
  }

  eqBars.forEach((bar, idx) => {
    if (isPlaying) {
      bar.classList.add(`eq-active-${idx + 1}`);
    } else {
      bar.classList.remove(`eq-active-${idx + 1}`);
    }
  });
}

function initVinylPlayer() {
  const playBtn = document.getElementById('playPauseBtn');
  const disc = document.getElementById('vinylDisc');
  const toneArm = document.getElementById('toneArm');
  const audioControlBtn = document.getElementById('audioControlBtn');
  const sidebarAudioBtn = document.getElementById('sidebarAudioBtn');
  const customAudioInput = document.getElementById('customAudioInput');
  const progressTrack = document.getElementById('progressTrack');
  const songProgressBar = document.getElementById('songProgressBar');
  const currTrackTime = document.getElementById('currTrackTime');

  let trackSec = 42;
  const totalSec = 130;

  function startMusicPlayback() {
    if (musicManuallyStopped) return;
    if (isMusicPlaying) return;

    isMusicPlaying = true;
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }

    if (disc) disc.classList.remove('paused-animation');
    if (toneArm) toneArm.style.transform = 'rotate(18deg)';

    if (customAudioEl) {
      customAudioEl.play().catch(() => { });
    } else {
      clearTimeout(musicBoxTimer);
      playNextMusicBoxNote();
    }
    updateMusicUI(true);
  }

  function stopMusicPlayback() {
    musicManuallyStopped = true;
    isMusicPlaying = false;
    clearTimeout(musicBoxTimer);

    if (disc) disc.classList.add('paused-animation');
    if (toneArm) toneArm.style.transform = 'rotate(0deg)';

    if (customAudioEl) {
      customAudioEl.pause();
    }
    updateMusicUI(false);
  }

  function toggleManualMusic() {
    if (isMusicPlaying) {
      stopMusicPlayback();
    } else {
      musicManuallyStopped = false;
      startMusicPlayback();
    }
  }

  // Expose startMusicPlayback globally so setupAutoPlayOnInteraction can trigger it
  window.startMusicPlayback = startMusicPlayback;
  window.stopMusicPlayback = stopMusicPlayback;
  window.toggleManualMusic = toggleManualMusic;

  if (playBtn) playBtn.addEventListener('click', toggleManualMusic);
  if (audioControlBtn) audioControlBtn.addEventListener('click', toggleManualMusic);
  if (sidebarAudioBtn) sidebarAudioBtn.addEventListener('click', toggleManualMusic);

  // Custom mp3 upload
  if (customAudioInput) {
    customAudioInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        clearTimeout(musicBoxTimer);
        if (customAudioEl) customAudioEl.pause();
        const url = URL.createObjectURL(file);
        customAudioEl = new Audio(url);
        customAudioEl.loop = true;
        isMusicPlaying = true;
        if (disc) disc.classList.remove('paused-animation');
        updateMusicUI(true);
        customAudioEl.play();
      }
    });
  }

  // Progress Bar simulation
  setInterval(() => {
    if (isMusicPlaying) {
      trackSec = (trackSec + 1) % totalSec;
      const mins = String(Math.floor(trackSec / 60)).padStart(2, '0');
      const secs = String(trackSec % 60).padStart(2, '0');
      if (currTrackTime) currTrackTime.textContent = `${mins}:${secs}`;
      if (songProgressBar) {
        songProgressBar.style.width = `${(trackSec / totalSec) * 100}%`;
      }
    }
  }, 1000);
}

function setupAutoPlayOnInteraction() {
  const tryStart = () => {
    // If birthday intro sequence is actively running, defer background music until intro finishes
    if (window.introSequenceActive) return;
    if (!isMusicPlaying && !musicManuallyStopped) {
      if (typeof window.startMusicPlayback === 'function') {
        window.startMusicPlayback();
      }
    }
  };

  ['click', 'touchstart', 'keydown', 'scroll', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, tryStart, { once: true, passive: true });
  });

  // Seamlessly resume playback when tab comes back into view
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isMusicPlaying && !musicManuallyStopped) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }
    }
  });

  // Attempt initial playback
  tryStart();
}

function nextSongPrompt() {
  playPopSound();
  launchConfettiBurst();
}

function previousSongPrompt() {
  playPopSound();
  currentNoteIndex = 0;
}

/* =========================================================
   3. SPARKLE CURSOR & TOUCH TRAIL
   ========================================================= */
function initSparkleTrail() {
  const canvas = document.getElementById('sparkleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let sparkles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Sparkle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 4 + 2;
      this.color = ['#FEC1D6', '#E8DEF8', '#FFD8BE', '#FFE082'][Math.floor(Math.random() * 4)];
      this.speedX = (Math.random() - 0.5) * 1.5;
      this.speedY = (Math.random() - 0.5) * 1.5;
      this.life = 1;
      this.decay = Math.random() * 0.03 + 0.02;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.life -= this.decay;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  let isSparkleRunning = false;

  function addSparkle(x, y) {
    if (sparkles.length < 40) {
      sparkles.push(new Sparkle(x, y));
      if (!isSparkleRunning) {
        isSparkleRunning = true;
        requestAnimationFrame(sparkleLoop);
      }
    }
  }

  window.addEventListener('mousemove', (e) => {
    addSparkle(e.clientX, e.clientY);
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      addSparkle(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  function sparkleLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let aliveCount = 0;
    for (let i = 0; i < sparkles.length; i++) {
      const sp = sparkles[i];
      sp.update();
      sp.draw();
      if (sp.life > 0) {
        sparkles[aliveCount++] = sp;
      }
    }
    sparkles.length = aliveCount;
    if (sparkles.length > 0) {
      requestAnimationFrame(sparkleLoop);
    } else {
      isSparkleRunning = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
}

/* =========================================================
   4. CELEBRATION CONFETTI ENGINE (HIGH-PERFORMANCE HARDWARE ACCELERATED)
   ========================================================= */
let confettiParticles = [];
let confettiCtx = null;
let confettiCanvas = null;
let isConfettiActive = false;
let lastConfettiChimeTime = 0;

function drawVectorHeart(ctx, size) {
  const s = size * 0.45;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.6, -s * 0.7, -s * 1.3, s * 0.2, 0, s * 1.2);
  ctx.bezierCurveTo(s * 1.3, s * 0.2, s * 0.6, -s * 0.7, 0, s * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawVectorStar(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (18 + i * 72) * 0.0174533;
    const a2 = (54 + i * 72) * 0.0174533;
    ctx.lineTo(Math.cos(a1) * r, -Math.sin(a1) * r);
    ctx.lineTo(Math.cos(a2) * (r * 0.45), -Math.sin(a2) * (r * 0.45));
  }
  ctx.closePath();
  ctx.fill();
}

function initConfettiEngine() {
  confettiCanvas = document.getElementById('confettiCanvas');
  if (!confettiCanvas) return;
  confettiCtx = confettiCanvas.getContext('2d');

  function resize() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
}

function renderConfetti() {
  if (!confettiCanvas || !confettiCtx) return;

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  const canvasHeight = confettiCanvas.height;
  let aliveCount = 0;

  for (let i = 0; i < confettiParticles.length; i++) {
    const p = confettiParticles[i];
    p.x += p.speedX;
    p.y += p.speedY;
    p.speedY += p.gravity;
    p.rotation += p.spin;
    p.tilt += p.tiltSpeed;
    p.opacity -= p.decay;

    if (p.opacity > 0 && p.y < canvasHeight + 40) {
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate((p.rotation * Math.PI) / 180);
      confettiCtx.globalAlpha = Math.max(0, p.opacity);
      confettiCtx.fillStyle = p.color;

      if (p.shape === 'heart') {
        drawVectorHeart(confettiCtx, p.size);
      } else if (p.shape === 'star') {
        drawVectorStar(confettiCtx, p.size * 0.6);
      } else if (p.shape === 'circle') {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, p.size * 0.38, 0, Math.PI * 2);
        confettiCtx.fill();
      } else {
        // 3D Fluttering ribbon
        const tiltScale = Math.cos(p.tilt);
        confettiCtx.fillRect(-p.size * 0.5, (-p.size * 0.35) * tiltScale, p.size, p.size * 0.7 * Math.abs(tiltScale));
      }

      confettiCtx.restore();
      confettiParticles[aliveCount++] = p;
    }
  }

  confettiParticles.length = aliveCount;

  if (confettiParticles.length > 0) {
    requestAnimationFrame(renderConfetti);
  } else {
    isConfettiActive = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

function launchConfettiBurst(originX, originY, count = 50) {
  const now = performance.now();
  if (now - lastConfettiChimeTime > 220) {
    playChimeSound();
    lastConfettiChimeTime = now;
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const cx = originX !== undefined ? originX : width / 2;
  const cy = originY !== undefined ? originY : height * 0.42;

  // Prevent particle accumulation spikes during rapid combos
  if (confettiParticles.length > 600) {
    confettiParticles.splice(0, confettiParticles.length - 400);
  }

  const colors = ['#F8BBD0', '#E8DEF8', '#FFD8BE', '#D0BCFF', '#FFE082', '#F48FB1', '#FF80AB', '#FF4081', '#CE93D8'];
  const shapes = ['ribbon', 'ribbon', 'heart', 'star', 'circle'];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 10 + 4;
    confettiParticles.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 30,
      size: Math.random() * 8 + 7,
      speedX: Math.cos(angle) * velocity * 0.8 + (Math.random() - 0.5) * 3,
      speedY: -Math.abs(Math.sin(angle) * velocity) - Math.random() * 5 - 2,
      gravity: 0.32,
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 9,
      tilt: Math.random() * 10,
      tiltSpeed: Math.random() * 0.14 + 0.06,
      opacity: 1,
      decay: Math.random() * 0.007 + 0.008,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    });
  }

  if (!isConfettiActive) {
    isConfettiActive = true;
    requestAnimationFrame(renderConfetti);
  }
}

/* =========================================================
   5. POLAROID SCRAPBOOK INTERACTIONS & DROP-TO-UPLOAD
   ========================================================= */
function initPolaroidInteractions() {
  const cards = document.querySelectorAll('.polaroid-card');
  const modal = document.getElementById('polaroidModal');
  const modalImg = document.getElementById('modalImg');
  const modalCaption = document.getElementById('modalCaption');
  const modalDate = document.getElementById('modalDate');

  cards.forEach((card) => {
    // Lightbox modal on click
    card.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      playPopSound();
      const img = card.querySelector('.polaroid-img');
      if (modal && modalImg && img) {
        modalImg.src = img.src;
        modalCaption.textContent = card.getAttribute('data-caption') || card.querySelector('.font-handwriting')?.textContent.trim() || '';
        modalDate.textContent = card.getAttribute('data-date') || 'Special Keepsake 🌸';
        modal.classList.remove('hidden');
      }
    });

    // Drag and Drop real images onto polaroids
    const dropOverlay = card.querySelector('.drop-overlay');

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dropOverlay) dropOverlay.classList.remove('hidden');
    });

    card.addEventListener('dragleave', (e) => {
      if (dropOverlay) dropOverlay.classList.add('hidden');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dropOverlay) dropOverlay.classList.add('hidden');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = card.querySelector('.polaroid-img');
            if (img) {
              img.src = event.target.result;
              launchConfettiBurst();
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });
  });
}

function closePolaroidModal() {
  playPopSound();
  const modal = document.getElementById('polaroidModal');
  if (modal) modal.classList.add('hidden');
}

/* =========================================================
   6. CANDLE BLOWING & REAL MICROPHONE DETECTION
   ========================================================= */
let extinguishedCandles = new Set();
let micStream = null;
let micAudioCtx = null;
let micAnalyzer = null;
let isMicListening = false;

function initCandleInteractions() {
  // Keypress support: Spacebar blows candles
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      const candlesSection = document.getElementById('candles');
      const rect = candlesSection?.getBoundingClientRect();
      if (rect && rect.top < window.innerHeight && rect.bottom > 0) {
        e.preventDefault();
        blowOutAllCandles();
      }
    }
  });
}

function extinguishSingleCandle(id) {
  playPopSound();
  const flame = document.getElementById(id);
  if (!flame || extinguishedCandles.has(id)) return;

  extinguishedCandles.add(id);
  flame.classList.remove('flame-active');
  flame.classList.add('flame-extinguished');

  // Spawn smoke puff
  createSmokePuff(flame);

  if (extinguishedCandles.size === 3) {
    onAllCandlesExtinguished();
  }
}

function createSmokePuff(flameEl) {
  const puff = document.createElement('div');
  puff.className = 'smoke-puff';
  flameEl.parentElement.appendChild(puff);
  setTimeout(() => puff.remove(), 900);
}

function blowOutAllCandles() {
  ['flame1', 'flame2', 'flame3'].forEach((id) => {
    extinguishSingleCandle(id);
  });
}

function onAllCandlesExtinguished() {
  const confirmation = document.getElementById('wishConfirmation');
  if (confirmation) confirmation.classList.remove('hidden');

  const blowBtn = document.getElementById('blowCandlesBtn');
  if (blowBtn) {
    blowBtn.innerHTML = '<span>✨ Wish Sent to the Universe! ✨</span>';
    blowBtn.classList.add('opacity-80', 'cursor-default');
  }

  launchConfettiBurst();
  setTimeout(launchConfettiBurst, 400);
  setTimeout(launchConfettiBurst, 800);
}

function reigniteCandles() {
  playPopSound();
  extinguishedCandles.clear();
  ['flame1', 'flame2', 'flame3'].forEach((id) => {
    const flame = document.getElementById(id);
    if (flame) {
      flame.classList.remove('flame-extinguished');
      flame.classList.add('flame-active');
    }
  });

  const confirmation = document.getElementById('wishConfirmation');
  if (confirmation) confirmation.classList.add('hidden');

  const blowBtn = document.getElementById('blowCandlesBtn');
  if (blowBtn) {
    blowBtn.innerHTML = '<span>🌬️ Blow Out All Candles!</span>';
    blowBtn.classList.remove('opacity-80', 'cursor-default');
  }
}

// Microphone Blowing Sensor
async function toggleMicrophoneBlow() {
  playPopSound();
  const btnText = document.getElementById('micBtnText');
  const micIcon = document.getElementById('micIcon');

  if (isMicListening) {
    stopMicrophoneListening();
    if (btnText) btnText.textContent = 'Use Real Microphone';
    if (micIcon) micIcon.textContent = 'mic';
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    micAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micAnalyzer = micAudioCtx.createAnalyser();
    micAnalyzer.fftSize = 256;
    const source = micAudioCtx.createMediaStreamSource(micStream);
    source.connect(micAnalyzer);

    isMicListening = true;
    if (btnText) btnText.textContent = 'Listening... Blow into mic! 🌬️';
    if (micIcon) micIcon.textContent = 'mic_external_on';

    checkBlowVolume();
  } catch (err) {
    alert("Microphone permission was denied or not supported. You can still blow the candles using the button or clicking them!");
  }
}

function checkBlowVolume() {
  if (!isMicListening || !micAnalyzer) return;
  const dataArray = new Uint8Array(micAnalyzer.frequencyBinCount);
  micAnalyzer.getByteFrequencyData(dataArray);

  // Compute average volume level
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const avgVolume = sum / dataArray.length;

  if (avgVolume > 65) {
    blowOutAllCandles();
    stopMicrophoneListening();
    const btnText = document.getElementById('micBtnText');
    if (btnText) btnText.textContent = 'Blow Detected! 🎉';
    return;
  }

  requestAnimationFrame(checkBlowVolume);
}

function stopMicrophoneListening() {
  isMicListening = false;
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
  }
  if (micAudioCtx) {
    micAudioCtx.close().catch(() => { });
  }
}

/* =========================================================
   7. BESTIE TRIVIA QUIZ
   ========================================================= */
const quizQuestions = [
  {
    title: "Who does nandika love the most?",
    options: [
      { text: "a. Mithun", isCorrect: false },
      { text: "b. Her roomates", isCorrect: false },
      { text: "c. Nancy", isCorrect: false },
      { text: "d. Shawarma", isCorrect: true }
    ],
    correctFeedback: "Spot on! Shawarma reigns supreme above all human beings! 🌯👑",
    wrongFeedback: "Wrong! You thought Mithun or Roommates? Shawarma is her one true love! 🌯😂"
  },
  {
    title: "Fav Hobby of nandika",
    options: [
      { text: "a. Studying", isCorrect: false },
      { text: "b. Annoying her roomates", isCorrect: false },
      { text: "c. Kollufying mithun", isCorrect: false },
      { text: "d. Kissing adhithi", isCorrect: true }
    ],
    correctFeedback: "CORRECT! Kissing Adhithi is her 24/7 dedicated passion project! 💋👩‍❤️‍👩",
    wrongFeedback: "Nope! Studying? Kollufying Mithun? Her real elite hobby is kissing Adhithi! 💋😂"
  },
  {
    title: "Her quoteline:",
    options: [
      { text: "a. Koorukula vandha koushik", isCorrect: false },
      { text: "b. I love you baby", isCorrect: false },
      { text: "c. Thambi thappu thambi", isCorrect: false },
      { text: "d. Andha ananya illa anjitha kooda poyi irru", isCorrect: true }
    ],
    correctFeedback: "ICONIC! 'Andha ananya illa anjitha kooda poyi irru' — her signature dialogue whenever drama strikes! 💅🗣️",
    wrongFeedback: "WRONG! If you haven't heard 'Andha ananya illa anjitha kooda poyi irru', be grateful! 💁‍♀️🔥"
  },
  {
    title: "Her personal bank account:",
    options: [
      { text: "a. Appa", isCorrect: false },
      { text: "b. Friends", isCorrect: false },
      { text: "c. Mithun", isCorrect: false },
      { text: "d. All of the above", isCorrect: true }
    ],
    correctFeedback: "1000% FACTS! Appa, Mithun, and Friends — unlimited multi-source sponsorship! 💳💸",
    wrongFeedback: "Incorrect! It's not just one — it's ALL OF THE ABOVE! Infinite wealth glitch! 🛍️💳"
  },
  {
    title: "The one subject she hates to the core:",
    options: [
      { text: "a. Accounts", isCorrect: false },
      { text: "b. Economics", isCorrect: false },
      { text: "c. Maths", isCorrect: true },
      { text: "d. Excel", isCorrect: false }
    ],
    correctFeedback: "EXACTLY! Maths is pure psychological warfare, hated to the absolute core! 📚❌",
    wrongFeedback: "Wrong! It's MATHS! Absolute mortal enemy number one! 📉🙅‍♀️"
  }
];

let quizCurrentIdx = 0;
let quizScore = 0;
let quizAnsweredCurrent = false;

function initTriviaQuiz() {
  loadQuestion(0);
}

function loadQuestion(idx) {
  const q = quizQuestions[idx];
  if (!q) return;

  quizAnsweredCurrent = false;
  const titleEl = document.getElementById('questionTitle');
  const stepEl = document.getElementById('quizStepIndicator');
  const stepBadgeEl = document.getElementById('quizStepBadge');
  const progressEl = document.getElementById('quizProgressBar');
  const percentEl = document.getElementById('quizProgressPercent');
  const optionsEl = document.getElementById('quizOptions');
  const feedbackEl = document.getElementById('quizFeedback');
  const nextBox = document.getElementById('quizNextBox');

  const pct = Math.round(((idx + 1) / quizQuestions.length) * 100);

  if (titleEl) titleEl.textContent = `${idx + 1}. ${q.title}`;
  if (stepEl) stepEl.textContent = `Question ${idx + 1} of ${quizQuestions.length}`;
  if (stepBadgeEl) stepBadgeEl.textContent = `${idx + 1}`;
  if (percentEl) percentEl.textContent = `${pct}%`;
  if (progressEl) progressEl.style.width = `${pct}%`;
  if (feedbackEl) feedbackEl.classList.add('hidden');
  if (nextBox) nextBox.classList.add('hidden');

  const letters = ['A', 'B', 'C', 'D'];
  if (optionsEl) {
    optionsEl.innerHTML = '';
    q.options.forEach((opt, optIdx) => {
      const btn = document.createElement('button');
      btn.id = `quiz-opt-${optIdx}`;
      btn.className = 'quiz-opt w-full p-3.5 sm:p-4 rounded-2xl border border-[#E6E2DB] bg-[#FEF9F2] hover:bg-white hover:border-[#805062] font-label text-xs sm:text-sm text-left transition-all duration-200 active:scale-[0.99] shadow-xs flex items-center justify-between gap-3 group';

      const cleanText = opt.text.replace(/^[a-d]\.\s*/i, '');
      const letter = letters[optIdx] || `${optIdx + 1}`;

      btn.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1 pr-2">
          <span class="opt-letter w-7 h-7 rounded-xl bg-white border border-[#E6E2DB] text-[#805062] group-hover:border-[#805062] group-hover:bg-[#FFD9E4] font-bold font-mono text-xs flex items-center justify-center shrink-0 transition-colors shadow-2xs">${letter}</span>
          <span class="opt-text font-bold text-[#1D1C18] group-hover:text-[#805062] leading-snug break-words text-left">${cleanText}</span>
        </div>
        <span class="opt-status-badge text-[11px] font-bold px-3 py-1 rounded-full shrink-0 whitespace-nowrap hidden shadow-xs"></span>
      `;
      btn.onclick = () => selectQuizAnswer(optIdx);
      optionsEl.appendChild(btn);
    });
  }
}

function selectQuizAnswer(pickedIdx) {
  if (quizAnsweredCurrent) return;
  quizAnsweredCurrent = true;

  const q = quizQuestions[quizCurrentIdx];
  const pickedOpt = q.options[pickedIdx];
  const isCorrect = pickedOpt.isCorrect;

  if (isCorrect) {
    quizScore++;
    playChimeSound();
    const scoreEl = document.getElementById('quizScore');
    if (scoreEl) scoreEl.textContent = quizScore;
  } else {
    playPopSound();
  }

  // Highlight all options (show which was picked and which was correct)
  q.options.forEach((opt, idx) => {
    const btn = document.getElementById(`quiz-opt-${idx}`);
    if (!btn) return;
    btn.disabled = true;
    const badge = btn.querySelector('.opt-status-badge');
    const letter = btn.querySelector('.opt-letter');
    const text = btn.querySelector('.opt-text');

    if (opt.isCorrect) {
      // Highlight the correct option in Emerald Green
      btn.className = 'quiz-opt w-full p-3.5 sm:p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 text-emerald-950 font-label font-bold text-xs sm:text-sm text-left shadow-sm flex items-center justify-between gap-3 ring-2 ring-emerald-200 transition-all';
      if (letter) {
        letter.className = 'opt-letter w-7 h-7 rounded-xl bg-emerald-600 text-white border border-emerald-600 font-bold font-mono text-xs flex items-center justify-center shrink-0 shadow-xs';
      }
      if (text) {
        text.className = 'opt-text font-bold text-emerald-950 leading-snug break-words';
      }
      if (badge) {
        badge.classList.remove('hidden');
        if (idx === pickedIdx) {
          badge.textContent = '✓ Correct! 🎉';
        } else {
          badge.textContent = '✓ Correct Option';
        }
        badge.className = 'opt-status-badge text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-600 text-white shadow-xs shrink-0 whitespace-nowrap inline-flex items-center gap-1';
      }
    } else if (idx === pickedIdx && !isCorrect) {
      // Highlight wrong selected option in Rose Red
      btn.className = 'quiz-opt w-full p-3.5 sm:p-4 rounded-2xl border-2 border-rose-400 bg-rose-50 text-rose-950 font-label font-semibold text-xs sm:text-sm text-left shadow-sm flex items-center justify-between gap-3 ring-2 ring-rose-200 transition-all';
      if (letter) {
        letter.className = 'opt-letter w-7 h-7 rounded-xl bg-rose-500 text-white border border-rose-500 font-bold font-mono text-xs flex items-center justify-center shrink-0 shadow-xs';
      }
      if (text) {
        text.className = 'opt-text font-bold text-rose-950 leading-snug break-words';
      }
      if (badge) {
        badge.classList.remove('hidden');
        badge.textContent = '✗ Your Pick';
        badge.className = 'opt-status-badge text-[11px] font-bold px-3 py-1 rounded-full bg-rose-500 text-white shadow-xs shrink-0 whitespace-nowrap inline-flex items-center gap-1';
      }
    } else {
      // Other options muted
      btn.className = 'quiz-opt w-full p-3.5 sm:p-4 rounded-2xl border border-stone-200 bg-stone-50/60 text-stone-400 font-label text-xs sm:text-sm text-left flex items-center justify-between gap-3 opacity-40 cursor-not-allowed';
      if (letter) {
        letter.className = 'opt-letter w-7 h-7 rounded-xl bg-stone-200 text-stone-500 border border-stone-300 font-bold font-mono text-xs flex items-center justify-center shrink-0';
      }
      if (badge) {
        badge.classList.add('hidden');
      }
    }
  });

  // Display Feedback message
  const feedbackEl = document.getElementById('quizFeedback');
  if (feedbackEl) {
    feedbackEl.classList.remove('hidden');
    if (isCorrect) {
      feedbackEl.className = 'mt-4 p-3.5 rounded-2xl text-center font-label text-xs sm:text-sm font-bold bg-[#FFD9E4] text-[#805062] border border-[#F2B6CB] shadow-xs animate-fade-in';
      feedbackEl.innerHTML = `<span>🎉 ${q.correctFeedback}</span>`;
    } else {
      feedbackEl.className = 'mt-4 p-3.5 rounded-2xl text-center font-label text-xs sm:text-sm font-bold bg-[#FFDCC5] text-[#755844] border border-[#FFCCAA] shadow-xs animate-fade-in';
      feedbackEl.innerHTML = `<span>❌ ${q.wrongFeedback}</span>`;
    }
  }

  // Show "Next Question" button and wait for user click
  const nextBox = document.getElementById('quizNextBox');
  const nextBtnText = document.getElementById('quizNextBtnText');
  if (nextBox && nextBtnText) {
    if (quizCurrentIdx === quizQuestions.length - 1) {
      nextBtnText.textContent = 'See Final Results 🏆';
    } else {
      nextBtnText.textContent = 'Next Question';
    }
    nextBox.classList.remove('hidden');
  }
}

function nextQuizQuestion() {
  playPopSound();
  quizCurrentIdx++;
  if (quizCurrentIdx < quizQuestions.length) {
    loadQuestion(quizCurrentIdx);
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  document.getElementById('quizQuestionBox')?.classList.add('hidden');
  document.getElementById('quizNextBox')?.classList.add('hidden');
  const feedbackEl = document.getElementById('quizFeedback');
  if (feedbackEl) feedbackEl.classList.add('hidden');

  const resultBox = document.getElementById('quizResultBox');
  const iconEl = document.getElementById('quizResultIcon');
  const titleEl = document.getElementById('quizResultTitle');
  const scoreEl = document.getElementById('quizFinalScore');
  const pctEl = document.getElementById('quizScorePercent');
  const msgEl = document.getElementById('quizFinalMsg');

  const pct = Math.round((quizScore / quizQuestions.length) * 100);
  if (scoreEl) scoreEl.textContent = quizScore;
  if (pctEl) pctEl.textContent = `${pct}%`;

  if (quizScore === 5) {
    if (iconEl) iconEl.textContent = '👑';
    if (titleEl) titleEl.textContent = 'Certified 100% Nandika Encyclopedia! 👑🏆';
    if (msgEl) msgEl.textContent = 'Flawless score! You know her inside and out 💖💍';
    setTimeout(() => {
      triggerMegaCelebration('quiz');
    }, 400);
  } else if (quizScore === 4) {
    if (iconEl) iconEl.textContent = '🌟';
    if (titleEl) titleEl.textContent = 'Elite Nandika Connoisseur! 🌟💖';
    if (msgEl) msgEl.textContent = '4 out of 5! So close to perfection! You know almost all her goofy secrets, chaotic habits, and inside jokes. Mithun is proud! 👏✨';
    launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 45);
  } else if (quizScore === 3) {
    if (iconEl) iconEl.textContent = '🌸';
    if (titleEl) titleEl.textContent = 'Certified Bestie in Training! 🌸👀';
    if (msgEl) msgEl.textContent = '3 out of 5! You know her pretty well, but Nandika might still give you side-eye 😂';
  } else if (quizScore >= 1) {
    if (iconEl) iconEl.textContent = '📚';
    if (titleEl) titleEl.textContent = 'Do You Even Know Her Bro? 😂💀';
    if (msgEl) msgEl.textContent = `Only ${quizScore} out of 5?! Aiyo! 🙈`;
  } else {
    if (iconEl) iconEl.textContent = '👻';
    if (titleEl) titleEl.textContent = 'Jumpscare Level Ignorance! 👻🤡';
    if (msgEl) msgEl.textContent = '0 out of 5?! Nandika is going to kollufy you! 🏃‍♂️💨';
  }

  if (resultBox) resultBox.classList.remove('hidden');
}

function resetQuiz() {
  playPopSound();
  quizCurrentIdx = 0;
  quizScore = 0;
  quizAnsweredCurrent = false;
  document.getElementById('quizScore').textContent = '0';
  document.getElementById('quizQuestionBox')?.classList.remove('hidden');
  document.getElementById('quizResultBox')?.classList.add('hidden');
  document.getElementById('quizNextBox')?.classList.add('hidden');
  document.getElementById('quizFeedback')?.classList.add('hidden');
  const progressEl = document.getElementById('quizProgressBar');
  const percentEl = document.getElementById('quizProgressPercent');
  const stepBadgeEl = document.getElementById('quizStepBadge');
  if (progressEl) progressEl.style.width = '20%';
  if (percentEl) percentEl.textContent = '20%';
  if (stepBadgeEl) stepBadgeEl.textContent = '1';
  loadQuestion(0);
}

/* =========================================================
   8. REAL HTML5 CANVAS SCRATCH CARDS
   ========================================================= */
function initScratchCards() {
  const scratchConfigs = [
    { id: 'scratch1', color: ['#FFE082', '#FFD54F', '#FFA000'] },
    { id: 'scratch2', color: ['#E1BEE7', '#CE93D8', '#BA68C8'] },
    { id: 'scratch3', color: ['#F8BBD0', '#F48FB1', '#E91E63'] },
    { id: 'scratch4', color: ['#B2DFDB', '#80CBC4', '#26A69A'] },
    { id: 'scratch5', color: ['#D1C4E9', '#B39DDB', '#7E57C2'] },
    { id: 'scratch6', color: ['#F48FB1', '#CE93D8', '#AB47BC'] }
  ];

  scratchConfigs.forEach((cfg) => {
    setupScratchCanvas(cfg.id, cfg.color);
  });
}

function setupScratchCanvas(canvasId, gradientColors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeAndPaint() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, gradientColors[0]);
    grad.addColorStop(0.5, gradientColors[1]);
    grad.addColorStop(1, gradientColors[2]);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scratch prompt text
    ctx.fillStyle = '#65394B';
    ctx.font = 'bold 12px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ Scratch to Reveal ✨', canvas.width / 2, canvas.height / 2);
  }

  resizeAndPaint();
  window.addEventListener('resize', resizeAndPaint);

  let isScratching = false;
  let scratchedPixels = 0;
  let isRevealed = false;

  function scratch(e) {
    if (!isScratching || isRevealed) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    playScratchSound();
    scratchedPixels++;

    if (scratchedPixels > 25 && !isRevealed) {
      isRevealed = true;
      canvas.style.transition = 'opacity 0.5s ease-out';
      canvas.style.opacity = '0';
      setTimeout(() => {
        canvas.style.display = 'none';
        launchConfettiBurst();
      }, 500);
    }
  }

  canvas.addEventListener('mousedown', () => { isScratching = true; });
  canvas.addEventListener('mouseup', () => { isScratching = false; });
  canvas.addEventListener('mousemove', scratch);

  canvas.addEventListener('touchstart', (e) => { isScratching = true; scratch(e); }, { passive: true });
  canvas.addEventListener('touchend', () => { isScratching = false; });
  canvas.addEventListener('touchmove', scratch, { passive: true });
}

/* =========================================================
   9. TREAT CATCHER MINI ARCADE GAME (5,000 PT CHALLENGE EDITION)
   ========================================================= */
// Always start fresh from 0 every time the website is opened
try {
  localStorage.removeItem('nandika_arcade_best_score');
  localStorage.removeItem('nandika_treat_secret_unlocked');
} catch (e) { }

const ARCADE_TARGET_SCORE = 40000;
let arcadeActive = false;
let arcadeScore = 0;
let arcadeCombo = 0;
let arcadeBestScore = 0;
let isTreatSecretUnlocked = false;
let arcadeTime = 30;
let arcadeTimerId = null;
let basketX = 150;
const basketWidth = 68;
let gameItems = [];
let floatingPopups = [];

// Milestones flagged so we don't repeat the same commentary
let scoreMilestonesHit = new Set();
let timeMilestonesHit = new Set();

function initArcadeGame() {
  const gameArea = document.getElementById('arcadeGameArea');
  const canvas = document.getElementById('gameCanvas');
  const bestScoreEl = document.getElementById('arcadeBestScore');
  if (bestScoreEl) bestScoreEl.textContent = arcadeBestScore;

  updateArcadeProgressBar(arcadeBestScore);
  renderArcadeSecretMessage();

  if (!canvas || !gameArea) return;

  function resizeGameCanvas() {
    canvas.width = gameArea.clientWidth;
    canvas.height = gameArea.clientHeight;
    basketX = canvas.width / 2 - basketWidth / 2;
  }
  resizeGameCanvas();
  window.addEventListener('resize', resizeGameCanvas);

  // Mouse & touch basket movement
  gameArea.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    basketX = e.clientX - rect.left - basketWidth / 2;
    basketX = Math.max(0, Math.min(canvas.width - basketWidth, basketX));
  });

  gameArea.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      basketX = e.touches[0].clientX - rect.left - basketWidth / 2;
      basketX = Math.max(0, Math.min(canvas.width - basketWidth, basketX));
    }
  }, { passive: true });

  // Arrow keys support
  window.addEventListener('keydown', (e) => {
    if (!arcadeActive) return;
    if (e.key === 'ArrowLeft') {
      basketX = Math.max(0, basketX - 28);
    } else if (e.key === 'ArrowRight') {
      basketX = Math.min(canvas.width - basketWidth, basketX + 28);
    }
  });
}

function updateArcadeProgressBar(score) {
  const bar = document.getElementById('secretProgressBar');
  const stats = document.getElementById('secretProgressStats');
  const lockIcon = document.getElementById('secretLockIcon');
  if (!bar || !stats) return;

  const pct = Math.min(100, Math.round((score / ARCADE_TARGET_SCORE) * 100));
  bar.style.width = `${pct}%`;

  if (score >= ARCADE_TARGET_SCORE && isTreatSecretUnlocked) {
    stats.textContent = `${score} / ${ARCADE_TARGET_SCORE.toLocaleString()} pts (UNLOCKED! 💖)`;
    if (lockIcon) lockIcon.textContent = '🔓';
  } else {
    stats.textContent = `${score} / ${ARCADE_TARGET_SCORE.toLocaleString()} pts (${pct}%)`;
    if (lockIcon) lockIcon.textContent = '🔒';
  }
}

function renderArcadeSecretMessage() {
  // Kept as a clean helper: result is displayed strictly once inside arcadeStartOverlay
  const container = document.getElementById('arcadeSecretMessageBox');
  if (container) {
    container.classList.add('hidden');
    container.innerHTML = '';
  }
}

function scrollToSecretMessage() {
  const el = document.getElementById('arcadeSecretMessageBox');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-4', 'ring-[#F2B6CB]');
    setTimeout(() => el.classList.remove('ring-4', 'ring-[#F2B6CB]'), 2000);
  }
}

function setArcadeComment(emoji, text, isHighlight = false) {
  const commentBox = document.getElementById('arcadeCommentary');
  const emojiEl = document.getElementById('commentaryEmoji');
  const textEl = document.getElementById('commentaryText');
  if (!commentBox || !textEl || !emojiEl) return;

  emojiEl.textContent = emoji;
  textEl.textContent = text;

  if (isHighlight) {
    commentBox.classList.add('scale-105', 'bg-[#FEC1D6]', 'text-[#880E4F]');
    setTimeout(() => {
      commentBox.classList.remove('scale-105', 'bg-[#FEC1D6]', 'text-[#880E4F]');
    }, 450);
  }
}

function playComboSound(combo) {
  if (!soundFxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const baseFreq = 480 + Math.min(combo * 45, 600);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) { }
}

function startArcadeGame() {
  playPopSound();
  const overlay = document.getElementById('arcadeStartOverlay');
  if (overlay) overlay.classList.add('hidden');

  arcadeActive = true;
  arcadeScore = 0;
  arcadeCombo = 0;
  arcadeTime = 30;
  gameItems = [];
  floatingPopups = [];
  scoreMilestonesHit.clear();
  timeMilestonesHit.clear();

  document.getElementById('arcadeScore').textContent = '0';
  document.getElementById('arcadeCombo').textContent = 'x0';
  document.getElementById('arcadeTimer').textContent = '30s';
  updateArcadeProgressBar(0);
  setArcadeComment('🚀', "GO NANDIKA! Aim for 10,000 points to unlock Mithun's secret message when the game ends!", true);

  clearInterval(arcadeTimerId);
  arcadeTimerId = setInterval(() => {
    arcadeTime--;
    document.getElementById('arcadeTimer').textContent = `${arcadeTime}s`;

    if (arcadeTime === 20 && !timeMilestonesHit.has(20)) {
      timeMilestonesHit.add(20);
      setArcadeComment('⚡', "20s left! You're in the groove, push your combo tempo!", true);
    } else if (arcadeTime === 15 && !timeMilestonesHit.has(15)) {
      timeMilestonesHit.add(15);
      setArcadeComment('⏰', "HALFWAY MARK! Big stars & cakes dropping fast! Keep that combo streak!", true);
    } else if (arcadeTime === 10 && !timeMilestonesHit.has(10)) {
      timeMilestonesHit.add(10);
      setArcadeComment('🚨', "10 SECONDS LEFT! FINAL SPRINT! PUSH FOR 10,000 POINTS!", true);
      playChimeSound();
    } else if (arcadeTime === 5 && !timeMilestonesHit.has(5)) {
      timeMilestonesHit.add(5);
      setArcadeComment('🔥', "5, 4, 3... MAXIMUM FOCUS! FINISH STRONG TO UNLOCK!!", true);
    }

    if (arcadeTime <= 0) {
      endArcadeGame();
    }
  }, 1000);

  requestAnimationFrame(arcadeGameLoop);
}

function arcadeGameLoop() {
  if (!arcadeActive) return;
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spawn new items (slightly faster as score/time progresses to allow reaching 10,000 points with good combos)
  const spawnRate = 0.065 + (30 - arcadeTime) * 0.0022;
  if (Math.random() < spawnRate) {
    const types = [
      { emoji: '🍓', points: 25, speed: 2.5, name: 'Strawberry' },
      { emoji: '💖', points: 35, speed: 2.9, name: 'Heart' },
      { emoji: '🧋', points: 45, speed: 3.3, name: 'Boba' },
      { emoji: '🍰', points: 65, speed: 3.1, name: 'Birthday Cake' },
      { emoji: '⭐', points: 100, speed: 3.7, name: 'Golden Star' },
      { emoji: '🌧️', points: -15, speed: 2.2, name: 'Raindrop' }
    ];
    const randVal = Math.random();
    let pick;
    if (randVal < 0.25) pick = types[0]; // 🍓 (+25)
    else if (randVal < 0.48) pick = types[1]; // 💖 (+35)
    else if (randVal < 0.68) pick = types[2]; // 🧋 (+45)
    else if (randVal < 0.82) pick = types[3]; // 🍰 (+65)
    else if (randVal < 0.94) pick = types[4]; // ⭐ (+100)
    else pick = types[5]; // 🌧️ (-15)

    gameItems.push({
      x: Math.random() * (canvas.width - 36) + 18,
      y: -24,
      emoji: pick.emoji,
      points: pick.points,
      speed: pick.speed,
      name: pick.name
    });
  }

  // Draw Basket with subtle tilt
  const basketY = canvas.height - 38;
  ctx.font = '38px serif';
  ctx.fillText('🧺', basketX, basketY + 28);

  // Update & Draw Items
  for (let i = gameItems.length - 1; i >= 0; i--) {
    const item = gameItems[i];
    item.y += item.speed;

    ctx.font = '26px serif';
    ctx.fillText(item.emoji, item.x, item.y);

    // Collision Detection with basket
    if (
      item.y >= basketY - 8 &&
      item.y <= basketY + 28 &&
      item.x >= basketX - 12 &&
      item.x <= basketX + basketWidth
    ) {
      handleItemCaught(item, basketX + basketWidth / 2, basketY);
      gameItems.splice(i, 1);
      continue;
    }

    // Dropped off screen
    if (item.y > canvas.height + 25) {
      gameItems.splice(i, 1);
    }
  }

  // Draw Floating Score Popups
  for (let i = floatingPopups.length - 1; i >= 0; i--) {
    const pop = floatingPopups[i];
    pop.y += pop.vy;
    pop.opacity -= 0.025;

    ctx.save();
    ctx.globalAlpha = Math.max(0, pop.opacity);
    ctx.fillStyle = pop.color;
    ctx.font = 'bold 15px Quicksand, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pop.text, pop.x, pop.y);
    ctx.restore();

    if (pop.opacity <= 0) {
      floatingPopups.splice(i, 1);
    }
  }

  requestAnimationFrame(arcadeGameLoop);
}

function handleItemCaught(item, popX, popY) {
  if (item.points > 0) {
    arcadeCombo++;
    // Rewarding combo multiplier so 10,000 points is exciting and achievable with skilled combos
    const comboBonus = Math.floor(arcadeCombo / 2) * 12;
    const earnedPoints = item.points + comboBonus;
    arcadeScore = Math.max(0, arcadeScore + earnedPoints);

    document.getElementById('arcadeScore').textContent = arcadeScore;
    document.getElementById('arcadeCombo').textContent = `x${arcadeCombo}`;
    playComboSound(arcadeCombo);
    updateArcadeProgressBar(arcadeScore);

    // Floating text
    floatingPopups.push({
      x: popX + (Math.random() - 0.5) * 20,
      y: popY,
      text: comboBonus > 0 ? `+${earnedPoints} (Combo!)` : `+${earnedPoints}`,
      color: item.points >= 65 ? '#880E4F' : '#665590',
      opacity: 1,
      vy: -1.6
    });

    // Exciting combo cheers
    if (arcadeCombo === 3) {
      setArcadeComment('🔥', 'COMBO x3! You are on fire, birthday girl!', true);
    } else if (arcadeCombo === 5) {
      setArcadeComment('⚡', 'COMBO x5! FASTEST HANDS IN TOWN! KEEP IT UP!', true);
    } else if (arcadeCombo === 8) {
      setArcadeComment('👑', 'COMBO x8! ABSOLUTE QUEEN OF REFLEXES!!', true);
      launchConfettiBurst();
    } else if (arcadeCombo === 12) {
      setArcadeComment('✨', 'COMBO x12! UNBELIEVABLE RUN! YOU CANNOT BE STOPPED!', true);
      launchConfettiBurst();
    } else if (item.emoji === '⭐') {
      setArcadeComment('🌟', 'GOLDEN STAR CAUGHT! +100 POINTS! PURE MAGIC!', true);
    }

    // Score milestone cheers towards 10,000 Points (Message unlocks ONLY when game ends!)
    if (arcadeScore >= 2500 && !scoreMilestonesHit.has(2500)) {
      scoreMilestonesHit.add(2500);
      setArcadeComment('🎉', '2,500 POINTS! Great start! Keep chaining combos!', true);
    } else if (arcadeScore >= 5000 && !scoreMilestonesHit.has(5000)) {
      scoreMilestonesHit.add(5000);
      setArcadeComment('🌟', '5,000 POINTS! HALFWAY TO 10,000! YOU GOT THIS!', true);
      launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 30);
    } else if (arcadeScore >= 7500 && !scoreMilestonesHit.has(7500)) {
      scoreMilestonesHit.add(7500);
      setArcadeComment('🚀', '7,500 POINTS! 3/4 TO THE SECRET MESSAGE! PUSH IT!!', true);
      launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 35);
    } else if (arcadeScore >= 9000 && !scoreMilestonesHit.has(9000)) {
      scoreMilestonesHit.add(9000);
      setArcadeComment('🔥', '9,000 POINTS! ALMOST 10,000! FINISH THE TIMER TO UNLOCK!!', true);
    } else if (arcadeScore >= ARCADE_TARGET_SCORE && !scoreMilestonesHit.has(40000)) {
      scoreMilestonesHit.add(40000);
      playChimeSound();
      launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 60);
      setArcadeComment('👑', '🚨 10,000 POINTS HIT! Survive till the timer ends to reveal the message! 💍✨', true);
    }

    // Personal best high score tracking in real-time
    if (arcadeScore > arcadeBestScore && arcadeBestScore > 0 && !scoreMilestonesHit.has('record')) {
      scoreMilestonesHit.add('record');
      setArcadeComment('🏆', 'NEW PERSONAL RECORD SMASHED! KEEP CLIMBING!', true);
    }
  } else {
    // Caught Raindrop
    arcadeCombo = 0;
    arcadeScore = Math.max(0, arcadeScore + item.points);
    document.getElementById('arcadeScore').textContent = arcadeScore;
    document.getElementById('arcadeCombo').textContent = 'x0';
    playPopSound();
    updateArcadeProgressBar(arcadeScore);

    floatingPopups.push({
      x: popX,
      y: popY,
      text: '-15 🌧️',
      color: '#BA1A1A',
      opacity: 1,
      vy: -1.2
    });

    setArcadeComment('🌧️', "Oof, a raindrop! Shake it off Nandika, next treat is yours!", true);
  }
}

function endArcadeGame() {
  arcadeActive = false;
  clearInterval(arcadeTimerId);
  launchConfettiBurst();

  const isNewRecord = arcadeScore > arcadeBestScore;
  if (isNewRecord) {
    arcadeBestScore = arcadeScore;
    const bestScoreEl = document.getElementById('arcadeBestScore');
    if (bestScoreEl) bestScoreEl.textContent = arcadeBestScore;
  }

  const overlay = document.getElementById('arcadeStartOverlay');

  // The secret message ONLY unlocks when 10,000 points has been reached AND the game ends!
  if (arcadeScore >= ARCADE_TARGET_SCORE) {
    isTreatSecretUnlocked = true;
    updateArcadeProgressBar(arcadeScore);

    if (overlay) {
      overlay.innerHTML = `
        <div class="py-2 px-1 max-w-md mx-auto space-y-2.5">
          <div class="inline-flex items-center space-x-2 px-4 py-1 bg-[#FFD9E4] text-[#880E4F] rounded-full text-xs font-label font-bold border border-white shadow-xs">
            <span class="heartbeat-pulse">💍</span>
            <span>Mithun's Secret Message Unlocked</span>
            <span class="heartbeat-pulse">💖</span>
          </div>

          <h3 class="font-display font-bold text-xl sm:text-2xl text-[#880E4F]">
            CHALLENGE COMPLETE! 10,000+ POINTS! 🏆
          </h3>
          <p class="text-xs font-label font-bold text-[#805062]">Final Score: <span class="text-[#880E4F] font-mono text-sm">${arcadeScore.toLocaleString()} Points!</span></p>

          <div class="my-2 p-4 sm:p-5 bg-gradient-to-br from-[#FFF0F5] via-[#FFF8F3] to-[#FFF0F5] border-2 border-[#F2B6CB] rounded-2xl shadow-lg relative overflow-hidden">
            <div class="absolute -top-10 -right-10 w-28 h-28 bg-[#FFD9E4]/40 rounded-full blur-xl pointer-events-none"></div>
            <p class="font-handwriting text-3xl sm:text-5xl text-[#880E4F] font-bold py-1 heartbeat-pulse drop-shadow-xs">
              Hi kanmani! I ate shawarma without you heheheh
            </p>
            <p class="font-handwriting text-base sm:text-xl text-[#805062] pt-1">
              "You caught all those treats, but you're forever the sweetest catch of my life. Happy 18th Birthday, wifey! 💍🌸💕"
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button onclick="celebrateCouplePromise()" class="px-6 py-2.5 bg-gradient-to-r from-[#880E4F] to-[#805062] text-white font-label font-bold text-xs sm:text-sm rounded-full shadow-md hover:scale-105 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer">
              <span>💍 Say YES & Celebrate! 💖</span>
            </button>
            <button onclick="startArcadeGame()" class="px-5 py-2.5 bg-white text-[#805062] border border-[#EAE4DB] hover:border-[#805062] font-label font-bold text-xs sm:text-sm rounded-full shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer">
              Play Again 🍓
            </button>
          </div>
        </div>
      `;
      overlay.classList.remove('hidden');
    }
    setArcadeComment('👑', `🎉 UNBELIEVABLE! Nandika scored ${arcadeScore.toLocaleString()} points and UNLOCKED Mithun's secret message! 💍💖`, true);
  } else {
    const needed = ARCADE_TARGET_SCORE - arcadeScore;
    updateArcadeProgressBar(arcadeBestScore);

    if (overlay) {
      overlay.innerHTML = `
        <span class="text-4xl animate-bounce">🍓🧺✨</span>
        <p class="font-display font-bold text-lg text-[#665590]">Almost Unlocked!</p>
        <p class="text-sm font-label font-bold text-[#805062]">Final Score: ${arcadeScore.toLocaleString()} / 10,000 Points</p>
        <p class="text-xs font-bold text-[#880E4F] bg-[#FFD9E4] px-3.5 py-1 rounded-full my-1.5 border border-[#F2B6CB]">
          Only ${needed.toLocaleString()} more points to unlock Mithun's secret message!
        </p>
        <p class="text-xs text-[#49454F] max-w-xs pt-0.5">Keep combos going and grab golden stars (+100) & cakes (+65)! Secret message opens only when you reach 10,000 points!</p>
        <button onclick="startArcadeGame()" class="mt-2 px-6 py-2.5 bg-[#805062] text-white font-label font-bold text-xs rounded-full shadow-md hover:scale-105 active:scale-95 transition-all">
          Try Again to Unlock (Need ${needed.toLocaleString()} pts) 🔄
        </button>
      `;
      overlay.classList.remove('hidden');
    }
    setArcadeComment('🍓', `So close! Nandika scored ${arcadeScore} pts — only ${needed} pts away from unlocking the secret message!`, true);
  }
}

/* =========================================================
   10. GRAND FINALE GIFT BOX & WAX-SEALED LETTER
   ========================================================= */
let isGiftOpen = false;

function toggleGiftBox() {
  playPopSound();
  isGiftOpen = !isGiftOpen;

  const lid = document.getElementById('giftBoxLid');
  const bow = document.getElementById('giftRibbonBow');
  const letter = document.getElementById('heartfeltLetter');
  const unwrapBtn = document.getElementById('unwrapBtn');

  if (isGiftOpen) {
    if (lid) lid.style.transform = 'translate(-50%, -45px) rotate(-14deg)';
    if (bow) bow.style.transform = 'translate(-50%, -55px) rotate(12deg)';
    if (letter) letter.classList.remove('hidden');
    if (unwrapBtn) unwrapBtn.innerHTML = '<span>Close Box 📦</span>';
    launchConfettiBurst();
  } else {
    if (lid) lid.style.transform = 'translate(-50%, 0) rotate(0deg)';
    if (bow) bow.style.transform = 'translate(-50%, 0) rotate(0deg)';
    if (letter) letter.classList.add('hidden');
    if (unwrapBtn) unwrapBtn.innerHTML = '<span>Unwrap the Gift 🎁</span>';
  }
}

function initLetterCustomizer() {
  const savedLetter = localStorage.getItem('nandika_birthday_letter');
  if (savedLetter) {
    applyCustomLetter(savedLetter);
  }
}

function openLetterEditor() {
  playPopSound();
  const modal = document.getElementById('letterEditorModal');
  const textarea = document.getElementById('customLetterInput');
  const currentText = document.querySelector('#heartfeltLetter p')?.textContent.trim() || '';

  if (textarea) textarea.value = localStorage.getItem('nandika_birthday_letter') || currentText;
  if (modal) modal.classList.remove('hidden');
}

function closeLetterEditor() {
  playPopSound();
  document.getElementById('letterEditorModal')?.classList.add('hidden');
}

function saveCustomLetter() {
  playPopSound();
  const text = document.getElementById('customLetterInput')?.value;
  if (text) {
    localStorage.setItem('nandika_birthday_letter', text);
    applyCustomLetter(text);
  }
  closeLetterEditor();
  launchConfettiBurst();
}

function applyCustomLetter(text) {
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  const container = document.getElementById('heartfeltLetter');
  if (!container) return;

  const pTags = container.querySelectorAll('p');
  if (pTags.length > 0 && paragraphs.length > 0) {
    pTags[0].textContent = paragraphs[0];
    if (paragraphs[1] && pTags[1]) pTags[1].textContent = paragraphs[1];
    if (paragraphs[2] && pTags[2]) pTags[2].textContent = paragraphs[2];
  }
}

/* =========================================================
   11. ALL PHOTOS SCRAPBOOK ROLL & LIGHTBOX ZOOM
   ========================================================= */
const ALL_NANDIKA_PHOTOS = [
  { src: "nands/IMG-20260624-WA0012.jpg", caption: "Blue saree angel 💙🥻", date: "June 2026" },
  { src: "nands/IMG-20260624-WA0016.jpg", caption: "Desert tongue menace 👅🐪", date: "June 2026" },
  { src: "nands/IMG-20260624-WA0017.jpg", caption: "Tiny family treasure 👑👨‍👩‍👧", date: "June 2026" },
  { src: "nands/IMG-20260625-WA0000.jpg", caption: "Corpo Baddie 👗✨", date: "June 2026" },
  { src: "nands/IMG-20260625-WA0001.jpg", caption: "Sassy hair whip kung-fu 💁‍♀️🥋", date: "June 2026" },
  { src: "nands/IMG-20260625-WA0002.jpg", caption: "So bad camera couldnt focus 🏎️💨", date: "June 2026" },
  { src: "nands/IMG-20260625-WA0009.jpg", caption: "Kinder Joy happiness 🍫🥚💐", date: "June 2026" },
  { src: "nands/IMG-20260625-WA0014.jpg", caption: "Would smash 🔥😎", date: "June 2026" },
  { src: "nands/IMG-20260625-WA0092.jpg", caption: "Rawr Rawr 🕷️💅", date: "June 2026" },
  { src: "nands/IMG-20260626-WA0036.jpg", caption: "Elevator drip with wifey 🥻🤍", date: "Forever" },
  { src: "nands/IMG-20260708-WA0016.jpg", caption: "Grumpy puppy pout 🥺🐶", date: "July 2026" },
  { src: "nands/IMG-20260716-WA0028.jpg", caption: "Krishna who? 🦚🧈", date: "July 2026" },
  { src: "nands/IMG-20260804-WA0004.jpg", caption: "Campus cutie 🚲🎒", date: "August 2026" },
  { src: "nands/IMG-20260817-WA0011.jpg", caption: "Needs her 3rd year mech🤟💙", date: "August 2026" },
  { src: "nands/IMG-20260819-WA0062.jpg", caption: "Idk what to put here   🦓✨", date: "August 2026" },
  { src: "nands/IMG-20260819-WA0063.jpg", caption: "Dreamy cream dress 🤍👗", date: "August 2026" },
  { src: "nands/IMG-20260819-WA0066.jpg", caption: "Candy cane trial fit 🍭🪞", date: "August 2026" },
  { src: "nands/IMG-20260819-WA0073.jpg", caption: "Outfit #47 of the day 🛍️😅", date: "August 2026" },
  { src: "nands/IMG-20260819-WA0083.jpg", caption: "Pink top, empty the wallet 🌸💳", date: "August 2026" },
  { src: "nands/IMG-20260820-WA0070.jpg", caption: "Drama Queen 💃🖤", date: "August 2026" },
  { src: "nands/IMG-20260820-WA0072.jpg", caption: "selfie pulla 🥻🪞", date: "August 2026" },
  { src: "nands/IMG-20260826-WA0027.jpg", caption: "Golden Bitch 🌾💛", date: "August 2026" },
  { src: "nands/IMG-20260902-WA0031.jpg", caption: "Lowk fav top 🌴❤️", date: "September 2026" },
  { src: "nands/IMG-20260906-WA0338.jpg", caption: "Im too tired to type 🧚‍♀️💙", date: "September 2026" },
  { src: "nands/IMG-20260906-WA0339.jpg", caption: "White tee, extra sassy 💅😏", date: "September 2026" },
  { src: "nands/IMG-20260906-WA0340.jpg", caption: "Hi cutie 👀👗", date: "September 2026" },
  { src: "nands/IMG-20260912-WA0079.jpg", caption: "Messi\'s #1 menace ⚽🩷", date: "September 2026" },
  { src: "nands/IMG_20260627_002658_617.jpg", caption: "Little fairy 🌱🧚‍♀️", date: "June 2026" },
  { src: "nands/IMG_20260627_002740_341.jpg", caption: "Waiting for food delivery 🍕👀", date: "June 2026" },
  { src: "nands/IMG_20260627_002745_852.jpg", caption: "Tree root conqueror 🌳🦸‍♀️", date: "June 2026" },
  { src: "nands/IMG_20260627_002747_499.jpg", caption: "Elsa who? Cold queen ❄️👑", date: "June 2026" },
  { src: "nands/IMG_20260627_002755_181.jpg", caption: "You got games on your phone? 🐟📸", date: "June 2026" },
  { src: "nands/IMG_20260627_002806_590.jpg", caption: "Heart arch main character 💖✨", date: "June 2026" },
  { src: "nands/IMG_20260627_002816_231.jpg", caption: "Fluffball doggy chaos 🐶👧", date: "June 2026" },
  { src: "nands/IMG_20260627_002904_587.jpg", caption: "Caught with snacks 🍪😂", date: "June 2026" },
  { src: "nands/IMG_20260627_002924_058.jpg", caption: "Big brain padippi 🧠💪", date: "June 2026" },
  { src: "nands/IMG_20260627_003033_355.jpg", caption: "Pink cupcake baby 🧁👑", date: "June 2026" },
  { src: "nands/IMG_20260627_003036_343.jpg", caption: "Boss baby night patrol 🕶️👶", date: "June 2026" },
  { src: "nands/IMG_20260627_003047_926.jpg", caption: "Brokest mall queen 🛍️💙", date: "June 2026" },
  { src: "nands/IMG_20260627_003051_779.jpg", caption: "Jee Sottaya jee? 💁‍♀️🪜", date: "June 2026" },
  { src: "nands/IMG_20260627_003134_782.jpg", caption: "1st birthday confusion 🎂👶", date: "June 2026" },
  { src: "nands/IMG_20260627_003151_809.jpg", caption: "Korangus 🍼👶", date: "June 2026" },
  { src: "nands/IMG_20260627_003217_798.jpg", caption: "Graduation angel 🎓🪽", date: "June 2026" },
  { src: "nands/IMG_20260627_003253_695.jpg", caption: "4-in-1 chubby cheeks 🥺🎀", date: "June 2026" },
  { src: "nands/IMG_20260627_202220_555.jpg", caption: "Sweet pink ribbons 🎀🥰", date: "June 2026" },
  { src: "nands/IMG_20260627_202605_469.jpg", caption: "Fingers taste yummy 😋👶", date: "June 2026" },
  { src: "nands/IMG_20260627_203049_001.jpg", caption: "Mfer think she sum holmes 🕵️‍♀️🔍", date: "June 2026" },
  { src: "nands/IMG_20260627_203344_431.jpg", caption: "Boutta sink the ship 🚂📞", date: "June 2026" },
  { src: "nands/IMG_20260627_203525_223.jpg", caption: "That glow tho 🌙✨", date: "June 2026" },
  { src: "nands/IMG_20260629_094724_326.jpg", caption: "My fingers hurt 🛒👀", date: "June 2026" },
  { src: "nands/IMG_20260629_094730_486.jpg", caption: "Pinterest main character 🤍💫", date: "June 2026" },
  { src: "nands/IMG_20260629_094732_811.jpg", caption: "Princess 🌸🚗", date: "June 2026" },
  { src: "nands/IMG_20260629_094757_441.jpg", caption: "Baddie No.1 🕶️💨", date: "June 2026" },
  { src: "nands/IMG_20260629_094801_594.jpg", caption: "Desi Bitch 🦆💋", date: "June 2026" },
  { src: "nands/IMG_20260701_010638_345.jpg", caption: "Digicam Bitch 📷🥻", date: "July 2026" },
  { src: "nands/IMG_20260701_011118_251.jpg", caption: "IHS survivor ✌️🎒", date: "July 2026" },
  { src: "nands/IMG_20260701_011719_821.jpg", caption: "Me when shawarma 🚗🥟", date: "July 2026" },
  { src: "nands/IMG_20260701_011732_636.jpg", caption: "Where is my hubby? 🍰🍹", date: "July 2026" },
  { src: "nands/IMG_20260709_173614_111.jpg", caption: "Dramtic aaah ☔⛲", date: "July 2026" },
  { src: "nands/IMG_20260713_073025_217.jpg", caption: "Hi pondatti 😼❤️", date: "July 2026" },
  { src: "nands/IMG_20260715_082421_095.jpg", caption: "Reddy Akka idk🏮💖", date: "July 2026" },
  { src: "nands/Screenshot_20260822_143108_WhatsApp.jpg", caption: "Blanket burrito 🌯💤", date: "August 2026" },
  { src: "nands/Screenshot_20260901_223037_WhatsApp.jpg", caption: "Random BS ☕🗣️", date: "September 2026" },
  { src: "nands/Snapchat-168940691.jpg", caption: "Jumpscare 👻👹", date: "June 2026" }
];

function initAllPhotosGallery() {
  const grid = document.getElementById('allPhotosGrid');
  if (!grid) return;

  grid.innerHTML = ALL_NANDIKA_PHOTOS.map((item, idx) => {
    const escapedCap = item.caption.replace(/'/g, "\\'");
    return `
      <div class="snap-book-card bg-white p-2.5 pb-4 rounded-xl polaroid-shadow border border-[#EAE4DB] transform ${idx % 2 === 0 ? '-rotate-1' : 'rotate-1'} hover:rotate-0 hover:scale-105 transition-all cursor-pointer group" onclick="openSinglePhoto('${item.src}', '${escapedCap}', '${item.date}')">
        <div class="relative aspect-[4/5] rounded-lg overflow-hidden bg-[#F2EDE6] shadow-inner mb-2">
          <img src="${item.src}" loading="lazy" alt="${item.caption.replace(/"/g, '&quot;')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
        </div>
        <p class="font-handwriting text-sm text-center text-[#805062] font-bold truncate px-1">${item.caption}</p>
      </div>
    `;
  }).join('');
}

function openSinglePhoto(src, caption = '', date = 'Special Keepsake 🌸') {
  playPopSound();
  const modal = document.getElementById('polaroidModal');
  const modalImg = document.getElementById('modalImg');
  const modalCaption = document.getElementById('modalCaption');
  const modalDate = document.getElementById('modalDate');
  if (modal && modalImg) {
    modalImg.src = src;
    if (modalCaption) modalCaption.textContent = caption;
    if (modalDate) modalDate.textContent = date;
    modal.classList.remove('hidden');
  }
}

function openAllPhotosGallery() {
  playPopSound();
  const modal = document.getElementById('allPhotosModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAllPhotosGallery() {
  playPopSound();
  const modal = document.getElementById('allPhotosModal');
  if (modal) modal.classList.add('hidden');
}

/* =========================================================
   12. VIDEO REELS PLAYBACK & MODAL (WITH MUSIC DUCKING & BUTTON HIDING)
   ========================================================= */

function isAnyVideoPlaying() {
  const videos = document.querySelectorAll('video');
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    if (v.id === 'introVideoPlayer' && !window.introSequenceActive) continue;
    if (!v.paused && !v.ended && v.currentTime > 0) {
      return true;
    }
  }
  return false;
}

function fadeBgmForVideo(fadeOut, durationMs = 800) {
  clearInterval(bgmDuckingInterval);

  if (fadeOut) {
    if (isMusicPlaying) {
      bgmWasPlayingBeforeVideo = true;
    }
    if (!bgmWasPlayingBeforeVideo && !isMusicPlaying) {
      return;
    }
    const startFactor = bgmDuckingFactor;
    const startTime = Date.now();
    bgmDuckingInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      bgmDuckingFactor = Math.max(0, startFactor * (1 - progress));

      const sliderVal = (document.getElementById('volumeSlider')?.value || 80) / 100;
      if (customAudioEl) {
        customAudioEl.volume = Math.max(0, Math.min(1, sliderVal * bgmDuckingFactor));
      }

      if (progress >= 1) {
        clearInterval(bgmDuckingInterval);
        bgmDuckingFactor = 0;
      }
    }, 25);
  } else {
    // Fade back in
    if (!bgmWasPlayingBeforeVideo || musicManuallyStopped) {
      return;
    }
    if (!isMusicPlaying && !musicManuallyStopped && typeof window.startMusicPlayback === 'function') {
      window.startMusicPlayback();
    }
    const startFactor = bgmDuckingFactor;
    const startTime = Date.now();
    bgmDuckingInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      bgmDuckingFactor = Math.min(1, startFactor + (1 - startFactor) * progress);

      const sliderVal = (document.getElementById('volumeSlider')?.value || 80) / 100;
      if (customAudioEl) {
        customAudioEl.volume = Math.max(0, Math.min(1, sliderVal * bgmDuckingFactor));
      }

      if (progress >= 1) {
        clearInterval(bgmDuckingInterval);
        bgmDuckingFactor = 1.0;
        bgmWasPlayingBeforeVideo = false;
      }
    }, 25);
  }
}

function toggleVideoPlayback(videoId) {
  const vid = document.getElementById(videoId);
  const icon = document.getElementById('reelIcon-' + videoId);
  const container = vid ? (vid.closest('.reel-video-container') || vid.parentElement) : null;
  if (!vid) return;

  if (vid.paused) {
    // Pause other video players
    document.querySelectorAll('video').forEach(v => {
      if (v !== vid && !v.paused && v.id !== 'introVideoPlayer') {
        v.pause();
        const otherIcon = document.getElementById('reelIcon-' + v.id);
        if (otherIcon) otherIcon.textContent = 'play_arrow';
        const otherC = v.closest('.reel-video-container') || v.parentElement;
        if (otherC) otherC.classList.remove('video-is-playing');
      }
    });

    // Fade out background music
    fadeBgmForVideo(true);

    // Optimistically update UI immediately so button hides right away
    if (icon) icon.textContent = 'pause';
    if (container) container.classList.add('video-is-playing');

    const playPromise = vid.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay blocked, attempting muted play:', err);
        vid.muted = true;
        vid.play().catch(() => {
          if (icon) icon.textContent = 'play_arrow';
          if (container) container.classList.remove('video-is-playing');
          if (!isAnyVideoPlaying()) fadeBgmForVideo(false);
        });
      });
    }
  } else {
    vid.pause();
    if (icon) icon.textContent = 'play_arrow';
    if (container) container.classList.remove('video-is-playing');
    if (!isAnyVideoPlaying()) {
      fadeBgmForVideo(false);
    }
  }
}

function playVideoInModal(src, title = 'Living Video Reel') {
  playPopSound();
  // Pause any inline playing videos to prevent audio overlap
  document.querySelectorAll('video').forEach(v => {
    if (!v.paused && v.id !== 'modalVideoPlayer') {
      v.pause();
      const otherIcon = document.getElementById('reelIcon-' + v.id);
      if (otherIcon) otherIcon.textContent = 'play_arrow';
      const otherC = v.closest('.reel-video-container') || v.parentElement;
      if (otherC) otherC.classList.remove('video-is-playing');
    }
  });
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalVideoPlayer');
  const titleEl = document.getElementById('modalVideoTitle');
  if (modal && player) {
    player.src = src;
    if (titleEl) titleEl.textContent = title;
    modal.classList.remove('hidden');
    fadeBgmForVideo(true);
    player.play().catch(() => { });
  }
}

function closeVideoModal() {
  playPopSound();
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('modalVideoPlayer');
  if (player) {
    player.pause();
    player.src = '';
  }
  if (modal) modal.classList.add('hidden');
  if (!isAnyVideoPlaying()) {
    fadeBgmForVideo(false);
  }
}

function initLivingReels() {
  for (let i = 1; i <= 12; i++) {
    const vidId = 'reelVid' + i;
    const vid = document.getElementById(vidId);
    if (!vid) continue;

    vid.removeAttribute('loop');

    const container = vid.closest('.reel-video-container') || vid.parentElement;
    if (container) container.classList.add('reel-video-container');

    const overlay = container ? container.querySelector('[onclick*="toggleVideoPlayback"]') : null;
    if (overlay) overlay.classList.add('reel-play-overlay');

    const icon = document.getElementById('reelIcon-' + vidId);

    vid.addEventListener('play', () => {
      if (container) container.classList.add('video-is-playing');
      if (icon) icon.textContent = 'pause';
      fadeBgmForVideo(true);
    });

    vid.addEventListener('pause', () => {
      if (container) container.classList.remove('video-is-playing');
      if (icon) icon.textContent = 'play_arrow';
      if (!isAnyVideoPlaying()) {
        fadeBgmForVideo(false);
      }
    });

    vid.addEventListener('ended', () => {
      if (container) container.classList.remove('video-is-playing');
      if (icon) icon.textContent = 'play_arrow';
      vid.currentTime = 0;
      if (!isAnyVideoPlaying()) {
        fadeBgmForVideo(false);
      }
    });
  }

  // Modal player events
  const modalPlayer = document.getElementById('modalVideoPlayer');
  if (modalPlayer) {
    modalPlayer.addEventListener('play', () => {
      fadeBgmForVideo(true);
    });
    modalPlayer.addEventListener('pause', () => {
      if (!isAnyVideoPlaying()) {
        fadeBgmForVideo(false);
      }
    });
    modalPlayer.addEventListener('ended', () => {
      if (!isAnyVideoPlaying()) {
        fadeBgmForVideo(false);
      }
    });
  }
}

/* =========================================================
   13. THE ETERNAL PROMISE & FULL SCREEN MEGA CELEBRATION
   ========================================================= */
let megaCelebrationTimer = null;
let megaCelebrationInterval = null;
let megaCelebrationRemainingMs = 5000;

function playHypeFanfareSound() {
  if (!soundFxEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();

    // Triumphant royal brass/synth arpeggio fanfare
    const notes = [
      { f: 523.25, time: 0, dur: 0.12 },
      { f: 659.25, time: 0.1, dur: 0.12 },
      { f: 783.99, time: 0.2, dur: 0.14 },
      { f: 1046.50, time: 0.32, dur: 0.35 },
      { f: 880.00, time: 0.52, dur: 0.14 },
      { f: 1046.50, time: 0.68, dur: 0.6 }
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.time);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + n.time);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.dur);
    });
  } catch (e) { }
}

function launchMegaConfettiStorm() {
  // Center primary blast
  launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 100);

  // Left and right crossfire cannons
  setTimeout(() => {
    launchConfettiBurst(window.innerWidth * 0.15, window.innerHeight * 0.65, 80);
    launchConfettiBurst(window.innerWidth * 0.85, window.innerHeight * 0.65, 80);
  }, 240);

  // High sky shower
  setTimeout(() => {
    launchConfettiBurst(window.innerWidth * 0.35, window.innerHeight * 0.3, 70);
    launchConfettiBurst(window.innerWidth * 0.65, window.innerHeight * 0.3, 70);
  }, 580);

  // Grand finale blast
  setTimeout(() => {
    launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.35, 90);
  }, 1000);
}

function triggerMegaCelebration(theme = 'couple') {
  const modal = document.getElementById('megaCelebrationModal');
  const card = document.getElementById('megaCelebrationCard');
  if (!modal || !card) return;

  // Hype screen vibration
  document.body.classList.remove('hype-screen-shake');
  void document.body.offsetWidth;
  document.body.classList.add('hype-screen-shake');
  setTimeout(() => document.body.classList.remove('hype-screen-shake'), 450);

  // Audio Fanfare + Confetti
  playHypeFanfareSound();
  launchMegaConfettiStorm();

  // Customize messaging & photo according to trigger
  const badgeEl = document.getElementById('megaCelebrationBadge');
  const titleEl = document.getElementById('megaCelebrationTitle');
  const subtitleEl = document.getElementById('megaCelebrationSubtitle');
  const msgEl = document.getElementById('megaCelebrationMsg');
  const mainImg = document.getElementById('megaCelebrationMainImg');
  const captionEl = document.getElementById('megaCelebrationPhotoCaption');
  const photoTag = document.getElementById('megaCelebrationPhotoTag');

  if (theme === 'couple') {
    if (badgeEl) badgeEl.textContent = 'ETERNAL PROMISE CELEBRATION';
    if (titleEl) titleEl.textContent = 'Mithun ❤️ Nandika Forever!';
    if (subtitleEl) subtitleEl.textContent = '💍 Till Death Do Us Apart • Soulmates For Eternity! 💍';
    if (msgEl) msgEl.textContent = 'Thank you for being my bestie, my sweetest headache, and my entire universe. Happy 18th Birthday, my love! 💖✨';
    if (mainImg) mainImg.src = 'nands/IMG-20260626-WA0036.jpg';
    if (captionEl) captionEl.textContent = 'Elevator drip with wifey 🥻🤍';
    if (photoTag) photoTag.textContent = '💍 Wifey & Hubby';
  } else if (theme === 'quiz') {
    if (badgeEl) badgeEl.textContent = '100% TRIVIA SUPREMACY';
    if (titleEl) titleEl.textContent = 'Certified Nandika Encyclopedia! 👑🏆';
    if (subtitleEl) subtitleEl.textContent = '🌟 You Know Her Better Than Anyone Else! 🌟';
    if (msgEl) msgEl.textContent = 'Shawarma over everyone, Adhithi kissies, Ananya/Anjitha threats, multi-bank accounts, and Maths hatred! Flawless knowledge! 💯🔥';
    if (mainImg) mainImg.src = 'nands/IMG_20260629_094757_441.jpg';
    if (captionEl) captionEl.textContent = 'Baddie No.1 🕶️💨';
    if (photoTag) photoTag.textContent = '👑 Trivia Legend';
  } else if (theme === 'arcade') {
    if (badgeEl) badgeEl.textContent = '5,000 PTS ARCADE CHAMPION';
    if (titleEl) titleEl.textContent = 'Nandika\'s Treat Master! 🍓🧺';
    if (subtitleEl) subtitleEl.textContent = '🎉 Secret Love Note Fully Unlocked! 💌';
    if (msgEl) msgEl.textContent = 'Phenomenal reflexes! Mithun is head over heels in awe. Secret proposal message unlocked forever! 💍💖';
    if (mainImg) mainImg.src = 'nands/IMG-20260625-WA0009.jpg';
    if (captionEl) captionEl.textContent = 'Kinder Joy happiness 🍫🥚💐';
    if (photoTag) photoTag.textContent = '🍓 Arcade Queen';
  } else {
    // Default general celebration (Navbar / Confetti button)
    if (badgeEl) badgeEl.textContent = '18TH BIRTHDAY SUPREMACY ACTIVATED';
    if (titleEl) titleEl.textContent = 'Happy 18th Birthday, Nandika! 👑💖';
    if (subtitleEl) subtitleEl.textContent = '💍 The Queen of Mithun\'s Heart • Forever & Always! 💍';
    if (msgEl) msgEl.textContent = '18 years of iconic drama, chaotic laughter, and endless love! Unstoppable soulmates forever! ✨🌸';
    if (mainImg) mainImg.src = 'nands/IMG-20260626-WA0036.jpg';
    if (captionEl) captionEl.textContent = 'Elevator drip with wifey 🥻🤍';
    if (photoTag) photoTag.textContent = '💍 Always My Forever';
  }

  // Floating celebration emojis
  spawnFloatingCelebrationEmojis();

  // Show Modal
  modal.classList.remove('hidden');
  void modal.offsetWidth;
  card.classList.remove('scale-90', 'opacity-0');
  card.classList.add('mega-card-pop-in');

  // Start 5-second countdown timer
  startMegaCelebrationTimer(5000);
}

function spawnFloatingCelebrationEmojis() {
  const container = document.getElementById('celebrationFloatingEmojis');
  if (!container) return;
  container.innerHTML = '';
  const emojis = ['👑', '💖', '💍', '🎂', '✨', '🌸', '🥂', '🥳', '🚀', '🎉', '🍰', '💃'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'floating-celebration-emoji';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = `${Math.random() * 95}%`;
    el.style.animationDelay = `${Math.random() * 1.8}s`;
    el.style.animationDuration = `${3.2 + Math.random() * 2}s`;
    el.style.fontSize = `${1.8 + Math.random() * 1.4}rem`;
    container.appendChild(el);
  }
}

function startMegaCelebrationTimer(durationMs = 5000) {
  clearInterval(megaCelebrationInterval);
  clearTimeout(megaCelebrationTimer);

  megaCelebrationRemainingMs = durationMs;
  const bar = document.getElementById('megaCelebrationTimerBar');
  const timerText = document.getElementById('megaCelebrationTimerText');
  if (bar) bar.style.width = '100%';

  const intervalStep = 100;
  megaCelebrationInterval = setInterval(() => {
    megaCelebrationRemainingMs -= intervalStep;
    const pct = Math.max(0, (megaCelebrationRemainingMs / durationMs) * 100);
    const secsLeft = Math.ceil(megaCelebrationRemainingMs / 1000);

    if (bar) bar.style.width = `${pct}%`;
    if (timerText) timerText.textContent = `Auto-closing in ${secsLeft}s...`;

    if (megaCelebrationRemainingMs <= 0) {
      clearInterval(megaCelebrationInterval);
      closeMegaCelebration();
    }
  }, intervalStep);
}

function moreHypeConfetti() {
  playHypeFanfareSound();
  launchMegaConfettiStorm();
  spawnFloatingCelebrationEmojis();
  startMegaCelebrationTimer(6000); // Extend duration so they can enjoy the hype!
}

function closeMegaCelebration() {
  clearInterval(megaCelebrationInterval);
  clearTimeout(megaCelebrationTimer);

  const modal = document.getElementById('megaCelebrationModal');
  const card = document.getElementById('megaCelebrationCard');
  if (card) {
    card.classList.remove('mega-card-pop-in');
    card.classList.add('scale-90', 'opacity-0');
  }
  if (modal) {
    modal.style.transition = 'opacity 0.4s ease';
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.style.opacity = '1';
      if (card) card.classList.remove('scale-90', 'opacity-0');
    }, 400);
  }
}

function handleCelebrationBackdropClick(e) {
  if (e.target && e.target.id === 'megaCelebrationModal') {
    closeMegaCelebration();
  }
}

function celebrateCouplePromise() {
  triggerMegaCelebration('couple');
}

/* =========================================================
   14. SWEET WORD SEARCH PUZZLE GAME (7 WORDS)
   ========================================================= */
const WORD_SEARCH_CONFIG = {
  grid: [
    'TSPZZOTRDB',
    'SNANDIKARC',
    'WXZSXDZCPH',
    'ISMITHUNQE',
    'FDHPLOXHTL',
    'ERJTUOUPBL',
    'YPAKKIVCTA',
    'JRGUXRBEZM',
    'GRKANMANIZ',
    'TJPCUQUUXP'
  ],
  words: [
    { id: 'MITHUN', label: 'Mithun 👑', bg: '#FFE4D6', border: '#F2B6CB', text: '#755844' },
    { id: 'NANDIKA', label: 'Nandika 🌸', bg: '#FFD9E4', border: '#F2B6CB', text: '#880E4F' },
    { id: 'LOVE', label: 'Love 💖', bg: '#FFCCD9', border: '#F48FB1', text: '#805062' },
    { id: 'PAKKI', label: 'Pakki 🐣', bg: '#FFF3D6', border: '#FFE082', text: '#755844' },
    { id: 'CHELLAM', label: 'Chellam 🍯', bg: '#E8DEF8', border: '#D0BCFF', text: '#4D3D76' },
    { id: 'KANMANI', label: 'Kanmani 💎', bg: '#D6F5E8', border: '#A5D6A7', text: '#1B5E20' },
    { id: 'WIFEY', label: 'Wifey 💍', bg: '#EBE5FC', border: '#CE93D8', text: '#512DA8' }
  ],
  solutions: {
    'MITHUN': [[3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7]],
    'NANDIKA': [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7]],
    'LOVE': [[4, 4], [5, 5], [6, 6], [7, 7]],
    'PAKKI': [[6, 1], [6, 2], [6, 3], [6, 4], [6, 5]],
    'CHELLAM': [[1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9]],
    'KANMANI': [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8]],
    'WIFEY': [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0]]
  }
};

let wsFoundWords = new Set();
let wsIsDragging = false;
let wsStartCell = null;
let wsCurrentSelection = [];
let wsCellElements = []; // 2D array [row][col]

function initWordSearchGame() {
  const gridEl = document.getElementById('wordSearchGrid');
  const chipsEl = document.getElementById('wsWordChips');
  if (!gridEl || !chipsEl) return;

  renderWordSearchChips();
  renderWordSearchGrid();
  setupWordSearchEvents();
  updateWordSearchProgress();
}

function renderWordSearchChips() {
  const chipsEl = document.getElementById('wsWordChips');
  if (!chipsEl) return;
  chipsEl.innerHTML = '';

  WORD_SEARCH_CONFIG.words.forEach(w => {
    const isFound = wsFoundWords.has(w.id);
    const chip = document.createElement('div');
    chip.id = 'ws-chip-' + w.id;
    chip.className = `ws-word-chip px-3.5 py-1.5 rounded-full text-xs font-label font-bold border transition-all cursor-pointer select-none flex items-center space-x-1 shadow-xs ${isFound
      ? 'found text-white'
      : 'hover:scale-105 bg-white/90 text-[#49454F] border-[#EAE4DB] hover:border-[#805062]'
      }`;
    if (isFound) {
      chip.style.backgroundColor = w.bg;
      chip.style.borderColor = w.border;
      chip.style.color = w.text;
      chip.innerHTML = `<span>✓</span><span>${w.label}</span>`;
    } else {
      chip.innerHTML = `<span>${w.label}</span>`;
      chip.onclick = () => hintSpecificWord(w.id);
    }
    chipsEl.appendChild(chip);
  });
}

function renderWordSearchGrid() {
  const gridEl = document.getElementById('wordSearchGrid');
  if (!gridEl) return;
  gridEl.innerHTML = '';
  wsCellElements = [];

  for (let r = 0; r < 10; r++) {
    wsCellElements[r] = [];
    for (let c = 0; c < 10; c++) {
      const letter = WORD_SEARCH_CONFIG.grid[r][c];
      const cell = document.createElement('div');
      cell.className = 'ws-cell aspect-square text-xs sm:text-sm md:text-base select-none';
      cell.textContent = letter;
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridEl.appendChild(cell);
      wsCellElements[r][c] = cell;
    }
  }

  applyAllFoundWordStyles();
}

function applyAllFoundWordStyles() {
  wsFoundWords.forEach(wordId => {
    const coords = WORD_SEARCH_CONFIG.solutions[wordId];
    const wordObj = WORD_SEARCH_CONFIG.words.find(w => w.id === wordId);
    if (!coords || !wordObj) return;

    coords.forEach(([r, c]) => {
      const cell = wsCellElements[r]?.[c];
      if (cell) {
        cell.style.backgroundColor = wordObj.bg;
        cell.style.borderColor = wordObj.border;
        cell.style.color = wordObj.text;
        cell.classList.add('font-black', 'shadow-xs');
      }
    });
  });
}

function getLineCells(r1, c1, r2, c2) {
  const dr = r2 - r1;
  const dc = c2 - c1;
  const absR = Math.abs(dr);
  const absC = Math.abs(dc);

  if (dr === 0 && dc === 0) return [{ r: r1, c: c1 }];
  if (dr !== 0 && dc !== 0 && absR !== absC) return null;

  const stepR = dr === 0 ? 0 : Math.sign(dr);
  const stepC = dc === 0 ? 0 : Math.sign(dc);
  const len = Math.max(absR, absC) + 1;

  const cells = [];
  for (let i = 0; i < len; i++) {
    cells.push({
      r: r1 + stepR * i,
      c: c1 + stepC * i
    });
  }
  return cells;
}

function getCellCoordsFromEvent(e) {
  let target = e.target;
  if (e.touches && e.touches.length > 0) {
    const touch = e.touches[0];
    target = document.elementFromPoint(touch.clientX, touch.clientY);
  }
  if (!target || !target.classList.contains('ws-cell')) return null;
  return {
    r: parseInt(target.dataset.row, 10),
    c: parseInt(target.dataset.col, 10)
  };
}

function clearSelectionHighlight() {
  document.querySelectorAll('.ws-cell-selecting, .ws-cell-start').forEach(el => {
    el.classList.remove('ws-cell-selecting', 'ws-cell-start');
  });
  wsCurrentSelection = [];
}

function highlightCells(coordsList) {
  clearSelectionHighlight();
  wsCurrentSelection = coordsList;
  coordsList.forEach(({ r, c }) => {
    const cell = wsCellElements[r]?.[c];
    if (cell) cell.classList.add('ws-cell-selecting');
  });
}

function checkCurrentSelection() {
  if (!wsCurrentSelection || wsCurrentSelection.length < 2) {
    clearSelectionHighlight();
    return false;
  }

  const lettersForward = wsCurrentSelection.map(({ r, c }) => WORD_SEARCH_CONFIG.grid[r][c]).join('');
  const lettersBackward = [...lettersForward].reverse().join('');

  let matchedWord = null;
  for (const w of WORD_SEARCH_CONFIG.words) {
    if (!wsFoundWords.has(w.id)) {
      if (w.id === lettersForward || w.id === lettersBackward) {
        matchedWord = w;
        break;
      }
    }
  }

  if (matchedWord) {
    onWordFound(matchedWord);
    clearSelectionHighlight();
    wsStartCell = null;
    return true;
  } else {
    const feedback = document.getElementById('wsFeedbackBanner');
    if (feedback) {
      feedback.innerHTML = `<span>Keep looking! '<strong>${lettersForward}</strong>' isn't on the list. Try another! ✨</span>`;
    }
    clearSelectionHighlight();
    wsStartCell = null;
    return false;
  }
}

function onWordFound(wordObj) {
  playChimeSound();
  wsFoundWords.add(wordObj.id);

  // Confetti burst
  launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 45);

  applyAllFoundWordStyles();
  renderWordSearchChips();
  updateWordSearchProgress();

  const feedback = document.getElementById('wsFeedbackBanner');
  if (feedback) {
    feedback.innerHTML = `<span class="text-[#880E4F] font-black animate-pulse">🎉 Wonderful! You found "${wordObj.label}"!</span>`;
  }

  if (wsFoundWords.size === WORD_SEARCH_CONFIG.words.length) {
    setTimeout(celebrateWordSearchVictory, 400);
  }
}

function updateWordSearchProgress() {
  const countEl = document.getElementById('wsFoundCount');
  const barEl = document.getElementById('wsProgressBar');
  const total = WORD_SEARCH_CONFIG.words.length;
  const found = wsFoundWords.size;

  if (countEl) countEl.textContent = found;
  if (barEl) {
    const pct = Math.round((found / total) * 100);
    barEl.style.width = pct + '%';
  }
}

function celebrateWordSearchVictory() {
  playChimeSound();
  launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 80);
  setTimeout(() => {
    launchConfettiBurst(window.innerWidth * 0.35, window.innerHeight * 0.35, 60);
    launchConfettiBurst(window.innerWidth * 0.65, window.innerHeight * 0.35, 60);
  }, 260);

  const victoryCard = document.getElementById('wsVictoryCard');
  if (victoryCard) {
    victoryCard.classList.remove('hidden');
    victoryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const feedback = document.getElementById('wsFeedbackBanner');
  if (feedback) {
    feedback.innerHTML = `<span class="text-[#880E4F] font-black">👑 YOU FOUND ALL 7 WORDS! Perfect score, Nandika! 💖💍</span>`;
  }
}

function celebrateWordSearchWinAgain() {
  playChimeSound();
  launchConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.4, 80);
  setTimeout(() => {
    launchConfettiBurst(window.innerWidth * 0.3, window.innerHeight * 0.4, 50);
    launchConfettiBurst(window.innerWidth * 0.7, window.innerHeight * 0.4, 50);
  }, 200);
}

function resetWordSearch() {
  playPopSound();
  wsFoundWords.clear();
  wsStartCell = null;
  wsCurrentSelection = [];
  clearSelectionHighlight();

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const cell = wsCellElements[r]?.[c];
      if (cell) {
        cell.style.backgroundColor = '';
        cell.style.borderColor = '';
        cell.style.color = '';
        cell.className = 'ws-cell aspect-square text-xs sm:text-sm md:text-base select-none';
      }
    }
  }

  renderWordSearchChips();
  updateWordSearchProgress();

  const victoryCard = document.getElementById('wsVictoryCard');
  if (victoryCard) victoryCard.classList.add('hidden');

  const feedback = document.getElementById('wsFeedbackBanner');
  if (feedback) {
    feedback.innerHTML = `<span>✨ Puzzle reset! Drag across letters or tap first & last letter.</span>`;
  }
}

function hintWordSearch() {
  const unfound = WORD_SEARCH_CONFIG.words.find(w => !wsFoundWords.has(w.id));
  if (!unfound) return;
  hintSpecificWord(unfound.id);
}

function hintSpecificWord(wordId) {
  playPopSound();
  const solution = WORD_SEARCH_CONFIG.solutions[wordId];
  const wordObj = WORD_SEARCH_CONFIG.words.find(w => w.id === wordId);
  if (!solution || !wordObj) return;

  const [firstR, firstC] = solution[0];
  const cell = wsCellElements[firstR]?.[firstC];
  if (cell) {
    cell.classList.remove('ws-cell-hint');
    void cell.offsetWidth;
    cell.classList.add('ws-cell-hint');
    setTimeout(() => cell.classList.remove('ws-cell-hint'), 2400);
  }

  const feedback = document.getElementById('wsFeedbackBanner');
  if (feedback) {
    feedback.innerHTML = `<span>💡 Hint for <strong>${wordObj.label}</strong>: Starts with '<strong>${wordId[0]}</strong>' at row ${firstR + 1}!</span>`;
  }
}

function setupWordSearchEvents() {
  const gridEl = document.getElementById('wordSearchGrid');
  if (!gridEl) return;

  // Pointer / Mouse Drag Support
  gridEl.addEventListener('mousedown', (e) => {
    const coords = getCellCoordsFromEvent(e);
    if (!coords) return;
    wsIsDragging = true;
    wsStartCell = coords;
    highlightCells([coords]);
  });

  window.addEventListener('mousemove', (e) => {
    if (!wsIsDragging || !wsStartCell) return;
    const coords = getCellCoordsFromEvent(e);
    if (!coords) return;
    const line = getLineCells(wsStartCell.r, wsStartCell.c, coords.r, coords.c);
    if (line) {
      highlightCells(line);
      const str = line.map(({ r, c }) => WORD_SEARCH_CONFIG.grid[r][c]).join('');
      const feedback = document.getElementById('wsFeedbackBanner');
      if (feedback) feedback.innerHTML = `<span>Scanning: <strong>${str}</strong></span>`;
    }
  });

  window.addEventListener('mouseup', () => {
    if (wsIsDragging) {
      wsIsDragging = false;
      if (wsCurrentSelection.length > 1) {
        checkCurrentSelection();
      } else {
        if (wsStartCell) {
          const cell = wsCellElements[wsStartCell.r]?.[wsStartCell.c];
          if (cell) cell.classList.add('ws-cell-start');
          const char = WORD_SEARCH_CONFIG.grid[wsStartCell.r][wsStartCell.c];
          const feedback = document.getElementById('wsFeedbackBanner');
          if (feedback) feedback.innerHTML = `<span>Selected '<strong>${char}</strong>' — now tap the ending letter!</span>`;
        }
      }
    }
  });

  // Touch Drag Support
  gridEl.addEventListener('touchstart', (e) => {
    const coords = getCellCoordsFromEvent(e);
    if (!coords) return;
    wsIsDragging = true;
    wsStartCell = coords;
    highlightCells([coords]);
  }, { passive: true });

  gridEl.addEventListener('touchmove', (e) => {
    if (!wsIsDragging || !wsStartCell) return;
    const coords = getCellCoordsFromEvent(e);
    if (!coords) return;
    const line = getLineCells(wsStartCell.r, wsStartCell.c, coords.r, coords.c);
    if (line) {
      highlightCells(line);
      const str = line.map(({ r, c }) => WORD_SEARCH_CONFIG.grid[r][c]).join('');
      const feedback = document.getElementById('wsFeedbackBanner');
      if (feedback) feedback.innerHTML = `<span>Scanning: <strong>${str}</strong></span>`;
    }
  }, { passive: true });

  gridEl.addEventListener('touchend', () => {
    if (wsIsDragging) {
      wsIsDragging = false;
      if (wsCurrentSelection.length > 1) {
        checkCurrentSelection();
      } else {
        if (wsStartCell) {
          const cell = wsCellElements[wsStartCell.r]?.[wsStartCell.c];
          if (cell) cell.classList.add('ws-cell-start');
          const char = WORD_SEARCH_CONFIG.grid[wsStartCell.r][wsStartCell.c];
          const feedback = document.getElementById('wsFeedbackBanner');
          if (feedback) feedback.innerHTML = `<span>Selected '<strong>${char}</strong>' — now tap the ending letter!</span>`;
        }
      }
    }
  });

  // Two-Tap Selection Mode (tap start letter, then tap end letter)
  gridEl.addEventListener('click', (e) => {
    const coords = getCellCoordsFromEvent(e);
    if (!coords) return;

    if (!wsStartCell) {
      // First tap
      wsStartCell = coords;
      highlightCells([coords]);
      const cell = wsCellElements[coords.r]?.[coords.c];
      if (cell) cell.classList.add('ws-cell-start');
      const char = WORD_SEARCH_CONFIG.grid[coords.r][coords.c];
      const feedback = document.getElementById('wsFeedbackBanner');
      if (feedback) feedback.innerHTML = `<span>Selected '<strong>${char}</strong>' — now tap the ending letter!</span>`;
    } else {
      // Second tap
      if (wsStartCell.r === coords.r && wsStartCell.c === coords.c) {
        clearSelectionHighlight();
        wsStartCell = null;
        const feedback = document.getElementById('wsFeedbackBanner');
        if (feedback) feedback.innerHTML = `<span>Deselected. Tap any letter to start! ✨</span>`;
      } else {
        const line = getLineCells(wsStartCell.r, wsStartCell.c, coords.r, coords.c);
        if (line) {
          highlightCells(line);
          checkCurrentSelection();
        } else {
          clearSelectionHighlight();
          wsStartCell = null;
          const feedback = document.getElementById('wsFeedbackBanner');
          if (feedback) feedback.innerHTML = `<span>Words must be in a straight line (horizontal, vertical, or diagonal)!</span>`;
        }
      }
    }
  });
}

/* =========================================================
   CUTE BIRTHDAY INTRO SEQUENCE ENGINE
   ========================================================= */
let introTimer1 = null;
let introTimer2 = null;
let introHeartInterval = null;
let introVideoStarted = false;
let introMusicGain = null;
let introMusicTimer = null;
let introMelodyIndex = 0;
let introMusicPlaying = false;
let introAudioUnlocked = false;

function initIntroSequence() {
  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;

  // Mark intro as active so website background vinyl doesn't conflict
  window.introSequenceActive = true;
  document.body.classList.add('intro-active');

  // Spawn gentle floating pastel hearts in the background
  startIntroFloatingHearts();

  // Wire up video events
  const video = document.getElementById('introVideoPlayer');
  const loader = document.getElementById('introVideoLoader');
  const playPauseIcon = document.getElementById('introVideoPlayPauseIcon');

  if (video) {
    video.volume = 1.0;
    video.muted = false;

    video.addEventListener('waiting', () => {
      if (loader) loader.classList.remove('opacity-0', 'pointer-events-none');
    });
    video.addEventListener('canplay', () => {
      if (loader) loader.classList.add('opacity-0', 'pointer-events-none');
      updateIntroTimelineUI(video.currentTime, video.duration || 0);
    });
    video.addEventListener('playing', () => {
      if (loader) loader.classList.add('opacity-0', 'pointer-events-none');
      const prompt = document.getElementById('introVideoPlayPrompt');
      if (prompt) prompt.classList.add('hidden');
      if (playPauseIcon) playPauseIcon.textContent = 'pause';
      updateIntroVideoMuteUI(video.muted);
    });
    video.addEventListener('pause', () => {
      if (playPauseIcon) playPauseIcon.textContent = 'play_arrow';
    });
    video.addEventListener('timeupdate', () => {
      updateIntroTimelineUI(video.currentTime, video.duration || 0);
    });
    video.addEventListener('loadedmetadata', () => {
      updateIntroTimelineUI(video.currentTime, video.duration || 0);
    });
    video.addEventListener('durationchange', () => {
      updateIntroTimelineUI(video.currentTime, video.duration || 0);
    });
    video.addEventListener('ended', () => {
      finishIntroAndEnterWebsite();
    });
  }

  // Pre-prime audio on any early interaction
  const primeAudioContext = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => { });
    }
  };
  ['touchstart', 'keydown', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, primeAudioContext, { once: true, passive: true });
  });

  // Hold on Phase 1 until user explicitly taps the button to enter the website!
  clearTimeout(introTimer1);
  clearTimeout(introTimer2);
}

/* --- Intro Music Box Synthesizer (Celesta & Bell) --- */
function startIntroMusic() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => { });
  }

  introMusicPlaying = true;
  introMelodyIndex = 0;

  if (!introMusicGain) {
    introMusicGain = ctx.createGain();
    introMusicGain.connect(ctx.destination);
  }
  introMusicGain.gain.cancelScheduledValues(ctx.currentTime);
  introMusicGain.gain.setValueAtTime(0.24, ctx.currentTime);

  clearTimeout(introMusicTimer);
  playNextIntroNote();
}

function playNextIntroNote() {
  if (!introMusicPlaying || !window.introSequenceActive) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const item = melody[introMelodyIndex];
  if (item && item.f > 0 && introMusicGain) {
    try {
      // Main Celesta chime
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(item.f * 1.5, ctx.currentTime);
      noteGain.gain.setValueAtTime(0.20, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + item.d * 1.3);
      osc.connect(noteGain);
      noteGain.connect(introMusicGain);
      osc.start();
      osc.stop(ctx.currentTime + item.d * 1.3);

      // Sweet harmonic bell overtone
      const oscHarmonic = ctx.createOscillator();
      const noteGainHarmonic = ctx.createGain();
      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(item.f * 3.0, ctx.currentTime);
      noteGainHarmonic.gain.setValueAtTime(0.045, ctx.currentTime);
      noteGainHarmonic.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + item.d * 0.9);
      oscHarmonic.connect(noteGainHarmonic);
      noteGainHarmonic.connect(introMusicGain);
      oscHarmonic.start();
      oscHarmonic.stop(ctx.currentTime + item.d * 0.9);
    } catch (e) { }
  }

  introMelodyIndex = (introMelodyIndex + 1) % melody.length;
  const delay = (item ? item.d : 0.5) * 520;
  clearTimeout(introMusicTimer);
  introMusicTimer = setTimeout(playNextIntroNote, delay);
}

function fadeOutIntroMusic(durationMs = 1200) {
  const ctx = getAudioContext();
  if (ctx && introMusicGain && introMusicPlaying) {
    try {
      const now = ctx.currentTime;
      introMusicGain.gain.cancelScheduledValues(now);
      introMusicGain.gain.setValueAtTime(introMusicGain.gain.value, now);
      introMusicGain.gain.linearRampToValueAtTime(0.0001, now + (durationMs / 1000));
    } catch (e) { }
  }
  setTimeout(() => {
    stopIntroMusic();
  }, durationMs);
}

function stopIntroMusic() {
  introMusicPlaying = false;
  clearTimeout(introMusicTimer);
}

function handleIntroStartClick() {
  introAudioUnlocked = true;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => { });
  }

  // Pre-unmute video so browser autoplay with sound is permitted
  const video = document.getElementById('introVideoPlayer');
  if (video) {
    video.muted = false;
    video.volume = 1.0;
  }

  startIntroMusic();

  const btn = document.getElementById('introStartMusicBtn');
  const btnText = document.getElementById('introStartBtnText');
  if (btn) btn.classList.remove('animate-pulse');
  if (btnText) btnText.textContent = 'Music Playing 🎵 (Fades for video)';

  // If clicked directly by user on Phase 1, advance smoothly to Phase 2
  const phase1 = document.getElementById('introPhase1');
  if (phase1 && !phase1.classList.contains('hidden') && !phase1.classList.contains('intro-phase-exit')) {
    clearTimeout(introTimer1);
    goToPhase2();
  }
}

function handleIntroOverlayClick(e) {
  // If user clicked anywhere on the overlay before music started, start it
  if (!introMusicPlaying && window.introSequenceActive && !introVideoStarted) {
    handleIntroStartClick();
  }
}

function startIntroFloatingHearts() {
  const container = document.getElementById('introFloatingHearts');
  if (!container) return;
  clearInterval(introHeartInterval);

  const emojis = ['💖', '🌸', '✨', '💕', '🌷', '🎂', '🧸', '💌'];
  introHeartInterval = setInterval(() => {
    if (!window.introSequenceActive) {
      clearInterval(introHeartInterval);
      return;
    }
    const particle = document.createElement('div');
    particle.className = 'floating-intro-particle';
    particle.style.left = `${Math.random() * 92 + 4}%`;
    particle.style.fontSize = `${Math.random() * 14 + 16}px`;
    particle.style.animationDuration = `${Math.random() * 2.5 + 4}s`;
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    container.appendChild(particle);

    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
    }, 6000);
  }, 450);
}

function switchIntroPhase(fromId, toId, onComplete) {
  const fromEl = document.getElementById(fromId);
  const toEl = document.getElementById(toId);

  if (fromEl) {
    fromEl.classList.remove('intro-phase-enter');
    fromEl.classList.add('intro-phase-exit');

    setTimeout(() => {
      fromEl.classList.add('hidden');
      fromEl.classList.remove('intro-phase-exit');

      if (toEl) {
        toEl.classList.remove('hidden');
        // Trigger reflow for CSS transition
        void toEl.offsetWidth;
        toEl.classList.remove('intro-phase-exit');
        toEl.classList.add('intro-phase-enter');
        if (onComplete) onComplete();
      }
    }, 550);
  } else if (toEl) {
    toEl.classList.remove('hidden');
    void toEl.offsetWidth;
    toEl.classList.remove('intro-phase-exit');
    toEl.classList.add('intro-phase-enter');
    if (onComplete) onComplete();
  }
}

function goToPhase2() {
  if (!window.introSequenceActive) return;
  switchIntroPhase('introPhase1', 'introPhase2', () => {
    playChimeSound();
    // In Phase 2 ("I hope you enjoy this."), display for 2800ms, then transition to Phase 3
    introTimer2 = setTimeout(() => {
      goToPhase3();
    }, 2800);
  });
}

function goToPhase3() {
  if (!window.introSequenceActive) return;
  switchIntroPhase('introPhase2', 'introPhase3', () => {
    playPopSound();
    // Smoothly fade out the intro music as the video starts playing!
    fadeOutIntroMusic(1300);
    startIntroVideo();
  });
}

function startIntroVideo() {
  const video = document.getElementById('introVideoPlayer');
  if (!video) return;

  introVideoStarted = true;
  video.currentTime = 0;
  video.volume = 1.0;
  video.muted = false;

  updateIntroVideoMuteUI(false);

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      video.muted = false;
      video.volume = 1.0;
      updateIntroVideoMuteUI(false);
    }).catch((err) => {
      console.log('Video autoplay with sound restricted by browser, showing tap prompt:', err);
      const prompt = document.getElementById('introVideoPlayPrompt');
      if (prompt) {
        prompt.classList.remove('hidden');
      }
      // Start muted as visual buffer behind the button until the user taps
      video.muted = true;
      video.play().catch(() => { });
      updateIntroVideoMuteUI(true);
    });
  }
}

function playIntroVideoExplicit() {
  const video = document.getElementById('introVideoPlayer');
  const prompt = document.getElementById('introVideoPlayPrompt');
  if (prompt) prompt.classList.add('hidden');
  if (video) {
    fadeOutIntroMusic(300); // Stop any remaining intro music
    video.muted = false;
    video.volume = 1.0;
    video.play().then(() => {
      updateIntroVideoMuteUI(false);
    }).catch(() => {
      video.play().catch(() => { });
    });
  }
}

function toggleIntroVideoMute() {
  const video = document.getElementById('introVideoPlayer');
  if (!video) return;
  video.muted = !video.muted;
  if (!video.muted) {
    video.volume = 1.0;
    fadeOutIntroMusic(300);
  }
  updateIntroVideoMuteUI(video.muted);
}

function updateIntroVideoMuteUI(isMuted) {
  const icon = document.getElementById('introVideoMuteIcon');
  const label = document.getElementById('introVideoMuteLabel');
  const badge = document.getElementById('introVideoSoundStatusBadge');

  if (icon) icon.textContent = isMuted ? 'volume_off' : 'volume_up';
  if (label) label.textContent = isMuted ? 'Muted' : 'Sound On';

  if (badge) {
    if (isMuted) {
      badge.className = 'text-[10px] sm:text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-label font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-100 transition-colors';
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span><span>Tap for Sound 🔇</span>';
      badge.onclick = () => toggleIntroVideoMute();
    } else {
      badge.className = 'text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-label font-bold flex items-center gap-1';
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Sound Active 🔊</span>';
      badge.onclick = null;
    }
  }
}

function finishIntroAndEnterWebsite() {
  const overlay = document.getElementById('introOverlay');
  if (!overlay || !window.introSequenceActive) return;

  window.introSequenceActive = false;
  clearTimeout(introTimer1);
  clearTimeout(introTimer2);
  clearInterval(introHeartInterval);
  stopIntroMusic();

  // Stop video playback
  const video = document.getElementById('introVideoPlayer');
  if (video) {
    video.pause();
  }

  // Grand Celebration Confetti Explosion!
  const w = window.innerWidth;
  const h = window.innerHeight;
  launchConfettiBurst(w * 0.25, h * 0.4, 50);
  launchConfettiBurst(w * 0.75, h * 0.4, 50);
  setTimeout(() => {
    launchConfettiBurst(w * 0.5, h * 0.35, 75);
  }, 250);

  // Smooth cinematic curtain dismiss
  overlay.style.transition = 'opacity 0.75s ease-out, transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)';
  overlay.style.opacity = '0';
  overlay.style.transform = 'scale(1.06)';
  overlay.style.pointerEvents = 'none';

  setTimeout(() => {
    overlay.classList.add('hidden');
    document.body.classList.remove('intro-active');

    // Smoothly start website background music
    if (typeof window.startMusicPlayback === 'function' && !musicManuallyStopped) {
      window.startMusicPlayback();
    }
  }, 750);
}

function skipIntroToWebsite() {
  playPopSound();
  finishIntroAndEnterWebsite();
}

let isScrubbingIntroTimeline = false;

function formatVideoTime(secs) {
  if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function updateIntroTimelineUI(currentTime, duration) {
  const timeline = document.getElementById('introVideoTimeline');
  const curTimeEl = document.getElementById('introVideoCurrentTime');
  const durEl = document.getElementById('introVideoDuration');

  if (timeline && isFinite(duration) && duration > 0 && !isScrubbingIntroTimeline) {
    const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
    timeline.value = pct;
    timeline.style.setProperty('--scrub-pct', `${pct}%`);
  }
  if (curTimeEl && !isScrubbingIntroTimeline) {
    curTimeEl.textContent = formatVideoTime(currentTime);
  }
  if (durEl && isFinite(duration) && duration > 0) {
    durEl.textContent = formatVideoTime(duration);
  }
}

function handleTimelineInput(e) {
  isScrubbingIntroTimeline = true;
  const video = document.getElementById('introVideoPlayer');
  const val = parseFloat(e.target.value);
  e.target.style.setProperty('--scrub-pct', `${val}%`);
  if (video && isFinite(video.duration) && video.duration > 0) {
    const previewTime = (val / 100) * video.duration;
    const curTimeEl = document.getElementById('introVideoCurrentTime');
    if (curTimeEl) curTimeEl.textContent = formatVideoTime(previewTime);
  }
}

function handleTimelineChange(e) {
  const video = document.getElementById('introVideoPlayer');
  const val = parseFloat(e.target.value);
  if (video && isFinite(video.duration) && video.duration > 0) {
    const targetTime = (val / 100) * video.duration;
    try {
      video.currentTime = targetTime;
    } catch (err) {
      console.warn('Seek error:', err);
    }
  }
  setTimeout(() => {
    isScrubbingIntroTimeline = false;
    if (video) {
      updateIntroTimelineUI(video.currentTime, video.duration || 0);
    }
  }, 100);
}

function toggleIntroVideoPlayPause() {
  const video = document.getElementById('introVideoPlayer');
  const icon = document.getElementById('introVideoPlayPauseIcon');
  if (!video) return;
  if (video.paused) {
    video.play().catch(() => { });
    if (icon) icon.textContent = 'pause';
  } else {
    video.pause();
    if (icon) icon.textContent = 'play_arrow';
  }
}

function skipIntroVideoTime(seconds) {
  const video = document.getElementById('introVideoPlayer');
  if (!video) return;
  const dur = (isFinite(video.duration) && video.duration > 0) ? video.duration : 99999;
  const cur = isFinite(video.currentTime) ? video.currentTime : 0;
  const targetTime = Math.max(0, Math.min(dur, cur + seconds));
  try {
    video.currentTime = targetTime;
  } catch (err) {
    console.warn('Skip error:', err);
  }
  updateIntroTimelineUI(targetTime, isFinite(video.duration) ? video.duration : 0);
}

function handleIntroVideoContainerClick(e) {
  if (e.target.closest('button') || e.target.closest('input')) return;
  toggleIntroVideoPlayPause();
}

function replayIntro() {
  const overlay = document.getElementById('introOverlay');
  if (!overlay) return;

  // Pause website background music so it doesn't conflict with intro video
  if (typeof window.stopMusicPlayback === 'function') {
    window.stopMusicPlayback();
  }

  window.introSequenceActive = true;
  document.body.classList.add('intro-active');

  // Reset video & timeline
  const video = document.getElementById('introVideoPlayer');
  if (video) {
    video.pause();
    video.currentTime = 0;
    updateIntroTimelineUI(0, video.duration || 0);
  }
  const prompt = document.getElementById('introVideoPlayPrompt');
  if (prompt) prompt.classList.add('hidden');
  const playPauseIcon = document.getElementById('introVideoPlayPauseIcon');
  if (playPauseIcon) playPauseIcon.textContent = 'play_arrow';

  // Reset phases
  const p1 = document.getElementById('introPhase1');
  const p2 = document.getElementById('introPhase2');
  const p3 = document.getElementById('introPhase3');

  if (p1) {
    p1.classList.remove('hidden', 'intro-phase-exit');
    p1.classList.add('intro-phase-enter');
  }
  if (p2) {
    p2.classList.add('hidden');
    p2.classList.remove('intro-phase-enter', 'intro-phase-exit');
  }
  if (p3) {
    p3.classList.add('hidden');
    p3.classList.remove('intro-phase-enter', 'intro-phase-exit');
  }

  // Restore overlay
  overlay.classList.remove('hidden');
  overlay.style.opacity = '1';
  overlay.style.transform = 'none';
  overlay.style.pointerEvents = 'auto';

  // Start timeline
  startIntroFloatingHearts();
  clearTimeout(introTimer1);
  clearTimeout(introTimer2);

  introTimer1 = setTimeout(() => {
    goToPhase2();
  }, 3200);
}

let loveClickCount = 0;

function triggerFloatingLoveHeart(e) {
  loveClickCount++;
  try {
    playPopSound();
  } catch (err) { }

  const countEl = document.getElementById('floatingLoveCount');
  if (countEl) {
    countEl.textContent = `Loved x${loveClickCount} 💕`;
  }

  // Calculate coordinates safely from clicked element or fallback to button
  const btn = (e && e.currentTarget) ? e.currentTarget : document.getElementById('floatingSendLoveBtn');
  const rect = btn ? btn.getBoundingClientRect() : { left: window.innerWidth - 120, top: window.innerHeight - 60, width: 80 };
  const startX = rect.left + rect.width / 2;
  const startY = rect.top;

  const heartEmojis = ['💖', '💕', '🌸', '✨', '💐', '🥰', '💌', '🌷', '🎂', '🧸'];
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div');
    el.className = 'floating-love-heart';
    el.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
    el.style.left = `${startX + (Math.random() - 0.5) * 40}px`;
    el.style.top = `${startY}px`;
    el.style.fontSize = `${Math.random() * 10 + 20}px`;
    el.style.setProperty('--tx', `${(Math.random() - 0.5) * 140}px`);
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 60}deg`);
    document.body.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1800);
  }

  if (loveClickCount % 10 === 0 && typeof launchConfettiBurst === 'function') {
    launchConfettiBurst(startX, startY - 40, 45);
  }
}

function toggleBgmQuick() {
  if (typeof window.toggleManualMusic === 'function') {
    window.toggleManualMusic();
  }
  const icon = document.getElementById('floatingBgmIcon');
  if (icon) {
    icon.textContent = isMusicPlaying ? 'music_note' : 'music_off';
  }
}

// Expose globally
window.skipIntroToWebsite = skipIntroToWebsite;
window.finishIntroAndEnterWebsite = finishIntroAndEnterWebsite;
window.replayIntro = replayIntro;
window.playIntroVideoExplicit = playIntroVideoExplicit;
window.toggleIntroVideoMute = toggleIntroVideoMute;
window.toggleIntroVideoPlayPause = toggleIntroVideoPlayPause;
window.skipIntroVideoTime = skipIntroVideoTime;
window.handleTimelineInput = handleTimelineInput;
window.handleTimelineChange = handleTimelineChange;
window.handleIntroVideoContainerClick = handleIntroVideoContainerClick;
window.triggerFloatingLoveHeart = triggerFloatingLoveHeart;
window.toggleBgmQuick = toggleBgmQuick;
window.handleIntroStartClick = handleIntroStartClick;
window.handleIntroOverlayClick = handleIntroOverlayClick;
window.toggleVideoPlayback = toggleVideoPlayback;
window.playVideoInModal = playVideoInModal;
window.closeVideoModal = closeVideoModal;
window.initLivingReels = initLivingReels;
window.fadeBgmForVideo = fadeBgmForVideo;
window.isAnyVideoPlaying = isAnyVideoPlaying;





