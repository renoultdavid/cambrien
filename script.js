/* ========================================================
   1. GESTION DU FAISCEAU LUMINEUX & OBSCURITÉ
   ======================================================== */
const darknessLayer = document.getElementById('darkness-layer');
const scene = document.getElementById('scene');
const introBanner = document.getElementById('intro-banner');
const beaconAno = document.getElementById('beacon-ano');
const beaconOpa = document.getElementById('beacon-opa');
let isFullyIlluminated = false;

// Rayon réduit du faisceau lumineux
const TORCH_RADIUS = 65;

function checkProximity(x, y, beaconElem) {
  if (isFullyIlluminated) {
    beaconElem.classList.add('in-light');
    return;
  }
  const bRect = beaconElem.getBoundingClientRect();
  const sRect = scene.getBoundingClientRect();
  
  const bX = (bRect.left + bRect.width / 2) - sRect.left;
  const bY = (bRect.top + bRect.height / 2) - sRect.top;

  const dist = Math.hypot(x - bX, y - bY);

  if (dist < TORCH_RADIUS + 35) {
    beaconElem.classList.add('in-light');
  } else {
    beaconElem.classList.remove('in-light');
  }
}

function updateTorch(x, y) {
  if (isFullyIlluminated) return;
  
  if (introBanner) {
    introBanner.style.opacity = '0';
  }

  darknessLayer.style.background = `radial-gradient(circle ${TORCH_RADIUS}px at ${x}px ${y}px, transparent 0%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.99) 100%)`;

  checkProximity(x, y, beaconAno);
  checkProximity(x, y, beaconOpa);
}

// Suivi curseur et tactile iPad
scene.addEventListener('mousemove', (e) => {
  const rect = scene.getBoundingClientRect();
  updateTorch(e.clientX - rect.left, e.clientY - rect.top);
});

scene.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = scene.getBoundingClientRect();
    updateTorch(touch.clientX - rect.left, touch.clientY - rect.top);
  }
}, { passive: true });

scene.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = scene.getBoundingClientRect();
    updateTorch(touch.clientX - rect.left, touch.clientY - rect.top);
  }
}, { passive: true });


/* ========================================================
   2. PILOTAGE YOUTUBE & VALIDATION DES DÉFIS
   ======================================================== */
let playerAno = null;
let playerOpa = null;
const scores = { ano: 0, opa: 0 };
const answered = { ano: {}, opa: {} };
const completedMissions = { ano: false, opa: false };

function onYouTubeIframeAPIReady() {
  playerAno = new YT.Player('yt-player-ano', {
    height: '100%',
    width: '100%',
    videoId: 'vG5wsDhYWMc',
    playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1 },
    events: {
      'onReady': (e) => { e.target.unMute(); e.target.setVolume(100); },
      'onStateChange': (e) => { if (e.data === YT.PlayerState.ENDED) switchToQuiz('ano'); }
    }
  });

  playerOpa = new YT.Player('yt-player-opa', {
    height: '100%',
    width: '100%',
    videoId: '3yuPbXmwVFw',
    playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1 },
    events: {
      'onReady': (e) => { e.target.unMute(); e.target.setVolume(100); },
      'onStateChange': (e) => { if (e.data === YT.PlayerState.ENDED) switchToQuiz('opa'); }
    }
  });
}

function switchToQuiz(id) {
  document.getElementById('panel-video-' + id).style.display = 'none';
  document.getElementById('panel-quiz-' + id).style.display = 'block';
}

function switchToVideo(id) {
  document.getElementById('panel-quiz-' + id).style.display = 'none';
  document.getElementById('panel-video-' + id).style.display = 'block';
  const player = (id === 'ano') ? playerAno : playerOpa;
  if (player && player.seekTo) {
    player.seekTo(0);
    player.playVideo();
  }
}

function checkAnswer(animal, qNum, optIndex, isCorrect) {
  if (answered[animal][qNum]) return;
  answered[animal][qNum] = true;

  const card = document.getElementById(`q-${animal}-${qNum}`);
  const btns = card.querySelectorAll('.option-btn');
  const clickedBtn = btns[optIndex];
  const fb = document.getElementById(`fb-${animal}-${qNum}`);

  btns.forEach(b => b.classList.add('locked'));

  if (isCorrect) {
    clickedBtn.classList.add('correct');
    fb.className = 'feedback-box show correct';
    fb.innerHTML = '<strong>✓ Exact !</strong> Excellente observation scientifique.';
    scores[animal]++;
    document.getElementById(`score-${animal}`).textContent = scores[animal];
  } else {
    clickedBtn.classList.add('wrong');
    btns.forEach((b, i) => {
      if ((animal === 'ano' && ((qNum === 1 && i === 1) || (qNum === 2 && i === 0) || (qNum === 3 && i === 1))) ||
          (animal === 'opa' && ((qNum === 1 && i === 1) || (qNum === 2 && i === 1) || (qNum === 3 && i === 1)))) {
        b.classList.add('correct');
      }
    });
    fb.className = 'feedback-box show wrong';
    fb.innerHTML = '<strong>✗ Erreur.</strong> Observez la bonne réponse en vert.';
  }

  // Vérification de validation de la fiche en cours
  if (Object.keys(answered[animal]).length === 3) {
    document.getElementById(`congrats-${animal}`).style.display = 'block';
    completedMissions[animal] = true;

    // Mise à jour du carnet
    const logItem = document.getElementById(`log-item-${animal}`);
    const logStatus = document.getElementById(`log-status-${animal}`);
    logItem.style.opacity = '1';
    logItem.style.borderColor = 'var(--glow-green)';
    logStatus.textContent = '✓ Fiche & Questionnaire validés';
    logStatus.style.color = 'var(--glow-green)';

    const validatedCount = Object.values(completedMissions).filter(Boolean).length;
    document.getElementById('log-count').textContent = validatedCount;

    // Si les 2 fiches sont validées -> fermeture et lever de jour progressif sur 10s
    if (completedMissions.ano && completedMissions.opa) {
      setTimeout(() => {
        closeModal(`modal-${animal === 'ano' ? 'anomalocaris' : 'opabinia'}`);
        startPrecise10sSunrise();
      }, 1300);
    }
  }
}


/* ========================================================
   3. LEVER DE JOUR EN 10S & MACHINE À ÉCRIRE
   ======================================================== */
function startPrecise10sSunrise() {
  isFullyIlluminated = true;
  beaconAno.classList.add('in-light');
  beaconOpa.classList.add('in-light');

  darknessLayer.style.background = '#000000';
  darknessLayer.style.opacity = '1';

  const duration = 10000; // 10 secondes réelles
  const startTime = performance.now();

  function animateSunrise(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    darknessLayer.style.opacity = (1 - progress).toString();

    if (progress < 1) {
      requestAnimationFrame(animateSunrise);
    } else {
      document.getElementById('victory-badge').classList.add('show');
      openFinalSummaryTypewriter();
    }
  }

  requestAnimationFrame(animateSunrise);
}

function openFinalSummaryTypewriter() {
  const summaryOverlay = document.getElementById('final-summary');
  summaryOverlay.classList.add('active');

  const textAno = "BILAN DE L'EXPÉDITION :\n• Rôle : Premier grand prédateur pélagique (-508 Ma).\n• Nage : Propulsion ondulatoire rapide par palettes souples.\n• Outil : Deux grands appendices barbelés rabattant les proies vers sa bouche circulaire.";
  const textOpa = "BILAN DE L'EXPÉDITION :\n• Rôle : Arthropode souche benthique (fond marin).\n• Vision : 5 yeux sur pédoncules pour une détection à 360°.\n• Outil : Longue trompe articulée terminée par une pince pour fouiller la vase marine.";

  typeWriterEffect('text-summary-ano', 'caret-ano', textAno, 18, () => {
    typeWriterEffect('text-summary-opa', 'caret-opa', textOpa, 18, () => {
      document.getElementById('btn-to-site').style.display = 'inline-flex';
    });
  });
}

function typeWriterEffect(elemId, caretId, text, speed, onComplete) {
  const elem = document.getElementById(elemId);
  const caret = document.getElementById(caretId);
  let idx = 0;
  elem.textContent = "";

  const interval = setInterval(() => {
    if (idx < text.length) {
      elem.textContent += text.charAt(idx);
      idx++;
    } else {
      clearInterval(interval);
      if (caret) caret.style.display = 'none';
      if (onComplete) onComplete();
    }
  }, speed);
}

function openSiteModal() {
  document.getElementById('final-summary').classList.remove('active');
  openModal('modal-site');
}


/* ========================================================
   4. MODALES & NAVIGATION
   ======================================================== */
function openModal(id) {
  document.getElementById(id).classList.add('active');

  if (id === 'modal-anomalocaris') {
    document.getElementById('panel-quiz-ano').style.display = 'none';
    document.getElementById('panel-video-ano').style.display = 'block';
    if (playerAno && playerAno.playVideo) {
      playerAno.seekTo(0);
      playerAno.unMute();
      playerAno.setVolume(100);
      playerAno.playVideo();
    }
  }

  if (id === 'modal-opabinia') {
    document.getElementById('panel-quiz-opa').style.display = 'none';
    document.getElementById('panel-video-opa').style.display = 'block';
    if (playerOpa && playerOpa.playVideo) {
      playerOpa.seekTo(0);
      playerOpa.unMute();
      playerOpa.setVolume(100);
      playerOpa.playVideo();
    }
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  if (id === 'modal-anomalocaris' && playerAno && playerAno.pauseVideo) playerAno.pauseVideo();
  if (id === 'modal-opabinia' && playerOpa && playerOpa.pauseVideo) playerOpa.pauseVideo();
}

function toggleLogbook() {
  document.getElementById('logbook').classList.toggle('open');
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal-overlay')) {
    closeModal(event.target.id);
  }
};

window.onkeydown = function(event) {
  if (event.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => closeModal(m.id));
    document.getElementById('logbook').classList.remove('open');
  }
};
