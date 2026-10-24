// קוביות החשבון - משחק חיבור וחיסור בתחום ה-10 לכיתות א'-ב'

const DICE_THEMES = [
  { bg: '#FF6B6B', border: '#D64545', pip: '#FFFFFF' }, // אדום אלמוג
  { bg: '#4ECDC4', border: '#2FA69E', pip: '#FFFFFF' }, // טורקיז
  { bg: '#FFD166', border: '#DDA62B', pip: '#2B2D42' }, // צהוב חם
  { bg: '#A78BFA', border: '#7C3AED', pip: '#FFFFFF' }, // סגול לילך
  { bg: '#60A5FA', border: '#2563EB', pip: '#FFFFFF' }, // כחול שמיים
  { bg: '#F472B6', border: '#DB2777', pip: '#FFFFFF' }, // ורוד מסטיק
  { bg: '#34D399', border: '#059669', pip: '#FFFFFF' }, // ירוק מנטה
  { bg: '#FB923C', border: '#EA580C', pip: '#FFFFFF' }  // כתום אפרסק
];

// מיקומי נקודות בקובייה ברשת 3x3 (אינדקסים 0 עד 8)
const PIP_PATTERNS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

// מצב המשחק
const state = {
  mode: 'add',             // 'add' | 'sub' | 'mix'
  currentOp: '+',          // '+' | '-'
  totalQuestions: 5,
  currentQuestionIndex: 0, // 0-based
  firstTryCorrectCount: 0,
  mistakeOnCurrent: false,
  hasRolled: false,
  questionSolved: false,
  die1Value: 3,
  die2Value: 1,
  activeInput: null,
  soundEnabled: true,
  musicEnabled: false,
  history: []
};

// רכיבי DOM
const die1El = document.getElementById('die1');
const die2El = document.getElementById('die2');
const pipGrid1 = document.getElementById('pipGrid1');
const pipGrid2 = document.getElementById('pipGrid2');
const btnRoll = document.getElementById('btnRoll');
const playBtnText = document.getElementById('playBtnText');
const instructionBanner = document.getElementById('instructionBanner');
const equationSection = document.getElementById('equationSection');
const equationHint = document.getElementById('equationHint');
const operatorSymbol = document.getElementById('operatorSymbol');
const inputNum1 = document.getElementById('inputNum1');
const inputNum2 = document.getElementById('inputNum2');
const inputResult = document.getElementById('inputResult');
const btnCheck = document.getElementById('btnCheck');
const btnNext = document.getElementById('btnNext');
const feedbackBox = document.getElementById('feedbackBox');
const feedbackIcon = document.getElementById('feedbackIcon');
const feedbackText = document.getElementById('feedbackText');
const questionCounter = document.getElementById('questionCounter');
const progressBarFill = document.getElementById('progressBarFill');
const scoreCount = document.getElementById('scoreCount');
const totalQuestionsSelect = document.getElementById('totalQuestionsSelect');
const playCard = document.getElementById('playCard');
const summaryCard = document.getElementById('summaryCard');
const trophyContainer = document.getElementById('trophyContainer');
const regularSummaryHeader = document.getElementById('regularSummaryHeader');
const summaryReportText = document.getElementById('summaryReportText');
const historyList = document.getElementById('historyList');
const btnRestart = document.getElementById('btnRestart');
const btnSpeakInstruction = document.getElementById('btnSpeakInstruction');
const btnMusicToggle = document.getElementById('btnMusicToggle');
const musicStatusText = document.getElementById('musicStatusText');
const btnSoundToggle = document.getElementById('btnSoundToggle');
const soundStatusText = document.getElementById('soundStatusText');

// מערכת שמע (Web Audio API) למוסיקת רקע נעימה, מחיאות כפיים וצלילי קוביות
let audioCtx = null;
let musicInterval = null;

function ensureAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// צליל נקישת קובייה בזמן גלגול
function playDiceTickSound() {
  if (!state.soundEnabled) return;
  ensureAudioContext();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(280 + Math.random() * 220, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

// צליל מחיאות כפיים ותרועת ניצחון
function playApplauseAndCheer() {
  if (!state.soundEnabled) return;
  ensureAudioContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  // מנגינת ניצחון שמחה
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.11);
    gain.gain.setValueAtTime(0.16, now + idx * 0.11);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + idx * 0.11);
    osc.stop(now + idx * 0.11 + 0.35);
  });

  // סינתזה של מחיאות כפיים (רעש לבן מסונן בפעימות)
  for (let i = 0; i < 10; i++) {
    const clapTime = now + i * 0.11 + (Math.random() * 0.03);
    const bufferSize = audioCtx.sampleRate * 0.08;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.3));
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100 + Math.random() * 400, clapTime);
    filter.Q.setValueAtTime(1.5, clapTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.18, clapTime);
    gain.gain.exponentialRampToValueAtTime(0.01, clapTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(clapTime);
    noise.stop(clapTime + 0.08);
  }
}

// צליל שגיאה עדין
function playErrorSound() {
  if (!state.soundEnabled) return;
  ensureAudioContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const freqs = [300, 240];
  freqs.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.15);
    gain.gain.setValueAtTime(0.14, now + idx * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + idx * 0.15);
    osc.stop(now + idx * 0.15 + 0.22);
  });
}

// מוסיקת רקע רגועה ונעימה
function toggleBackgroundMusic() {
  state.musicEnabled = !state.musicEnabled;
  if (state.musicEnabled) {
    ensureAudioContext();
    btnMusicToggle.classList.add('active');
    musicStatusText.textContent = 'מוסיקה: פעיל';
    startMelodyLoop();
  } else {
    btnMusicToggle.classList.remove('active');
    musicStatusText.textContent = 'מוסיקה: כבוי';
    stopMelodyLoop();
  }
}

function startMelodyLoop() {
  stopMelodyLoop();
  const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 293.66, 349.23, 440.00, 349.23];
  let step = 0;

  const playStep = () => {
    if (!state.musicEnabled || !audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(melody[step % melody.length], now);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
    step++;
  };

  playStep();
  musicInterval = setInterval(playStep, 600);
}

function stopMelodyLoop() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

// דיבוב והקראת הוראות בעברית (Web Speech API)
function speakHebrew(text) {
  if (!state.soundEnabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'he-IL';
    utter.rate = 0.92;
    utter.pitch = 1.05;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    // התעלמות אם הדפדפן לא תומך בדיבוב
  }
}

// בניית רשת הנקודות של הקוביות
function initPipGrids() {
  [pipGrid1, pipGrid2].forEach((grid) => {
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const pip = document.createElement('div');
      pip.className = 'pip';
      grid.appendChild(pip);
    }
  });
}

function renderDieFace(gridEl, value) {
  const pips = gridEl.querySelectorAll('.pip');
  const activeIndices = PIP_PATTERNS[value] || [];
  pips.forEach((pip, index) => {
    if (activeIndices.includes(index)) {
      pip.classList.add('visible');
    } else {
      pip.classList.remove('visible');
    }
  });
}

// החלפת צבעי הקוביות מתרגיל לתרגיל
function randomizeDiceColors() {
  const idx1 = Math.floor(Math.random() * DICE_THEMES.length);
  let idx2 = Math.floor(Math.random() * DICE_THEMES.length);
  while (idx2 === idx1) {
    idx2 = Math.floor(Math.random() * DICE_THEMES.length);
  }

  const theme1 = DICE_THEMES[idx1];
  const theme2 = DICE_THEMES[idx2];

  document.documentElement.style.setProperty('--die1-bg', theme1.bg);
  document.documentElement.style.setProperty('--die1-border', theme1.border);
  document.documentElement.style.setProperty('--die1-pip', theme1.pip);

  document.documentElement.style.setProperty('--die2-bg', theme2.bg);
  document.documentElement.style.setProperty('--die2-border', theme2.border);
  document.documentElement.style.setProperty('--die2-pip', theme2.pip);
}

// הגרלת ערכי קוביות כך שהחיבור או החיסור יהיו בתחום ה-10
function generateDiceValuesForRound() {
  // קביעת פעולה לתרגיל הנוכחי
  if (state.mode === 'add') {
    state.currentOp = '+';
  } else if (state.mode === 'sub') {
    state.currentOp = '-';
  } else {
    state.currentOp = Math.random() < 0.5 ? '+' : '-';
  }

  operatorSymbol.textContent = state.currentOp;

  if (state.currentOp === '+') {
    // בחיבור בתחום ה-10: כל קובייה בין 1 ל-6 וסה"כ הסכום <= 10
    const validPairs = [];
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 <= 10) {
          validPairs.push([d1, d2]);
        }
      }
    }
    const chosen = validPairs[Math.floor(Math.random() * validPairs.length)];
    state.die1Value = chosen[0];
    state.die2Value = chosen[1];
  } else {
    // בחיסור בתחום ה-10: הקובייה השמאלית בתרגיל גדולה או שווה לשנייה כדי שההפרש יהיה אי-שלילי
    const validPairs = [];
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 >= d2) {
          validPairs.push([d1, d2]);
        }
      }
    }
    const chosen = validPairs[Math.floor(Math.random() * validPairs.length)];
    state.die1Value = chosen[0];
    state.die2Value = chosen[1];
  }
}

// הטלת הקוביות בלחיצה על פליי
function rollDice() {
  if (state.questionSolved) return;

  btnRoll.disabled = true;
  btnRoll.classList.remove('pulse');
  feedbackBox.classList.add('hidden');

  randomizeDiceColors();
  generateDiceValuesForRound();

  die1El.classList.add('rolling');
  die2El.classList.add('rolling');

  let ticks = 0;
  const maxTicks = 10;
  const rollTimer = setInterval(() => {
    const temp1 = Math.floor(Math.random() * 6) + 1;
    const temp2 = Math.floor(Math.random() * 6) + 1;
    renderDieFace(pipGrid1, temp1);
    renderDieFace(pipGrid2, temp2);
    playDiceTickSound();
    ticks++;

    if (ticks >= maxTicks) {
      clearInterval(rollTimer);
      finishRoll();
    }
  }, 75);
}

function finishRoll() {
  die1El.classList.remove('rolling');
  die2El.classList.remove('rolling');

  renderDieFace(pipGrid1, state.die1Value);
  renderDieFace(pipGrid2, state.die2Value);

  state.hasRolled = true;
  btnRoll.disabled = false;
  playBtnText.textContent = 'הטל שוב';

  // פתיחת משבצות התרגיל
  equationSection.classList.remove('locked');
  [inputNum1, inputNum2, inputResult].forEach((inp) => {
    inp.disabled = false;
    inp.value = '';
    inp.classList.remove('correct-field', 'wrong-field');
  });
  btnCheck.disabled = false;

  if (state.currentOp === '+') {
    instructionBanner.textContent = 'ספרו את הנקודות בקוביות והשלימו את תרגיל החיבור במשבצות!';
    equationHint.textContent = 'כתבו כמה נקודות בכל קובייה ומה הסכום שלהן:';
  } else {
    instructionBanner.textContent = 'ספרו את הנקודות בקוביות והשלימו את תרגיל החיסור במשבצות!';
    equationHint.textContent = 'כתבו את מספר הנקודות בקוביות וחשבו את ההפרש:';
  }

  setActiveInput(inputNum1);
  speakHebrew(instructionBanner.textContent);
}

function setActiveInput(inputEl) {
  [inputNum1, inputNum2, inputResult].forEach((el) => el.classList.remove('active-field'));
  state.activeInput = inputEl;
  if (inputEl && !inputEl.disabled) {
    inputEl.classList.add('active-field');
    inputEl.focus();
  }
}

// בדיקת התרגיל והפתרון של התלמיד
function checkAnswer() {
  if (!state.hasRolled || state.questionSolved) return;

  const val1 = parseInt(inputNum1.value, 10);
  const val2 = parseInt(inputNum2.value, 10);
  const res = parseInt(inputResult.value, 10);

  if (Number.isNaN(val1) || Number.isNaN(val2) || Number.isNaN(res)) {
    showFeedback(false, 'נא למלא את כל המשבצות במספרים!');
    return;
  }

  const d1 = state.die1Value;
  const d2 = state.die2Value;

  let isEquationMatchingDice = false;
  let expectedResult = 0;

  if (state.currentOp === '+') {
    expectedResult = d1 + d2;
    // בחיבור ניתן לכתוב את שתי הקוביות בכל סדר (חוק החילופיות: 3+1=4 או 1+3=4)
    isEquationMatchingDice =
      (val1 === d1 && val2 === d2) || (val1 === d2 && val2 === d1);
  } else {
    expectedResult = d1 - d2;
    isEquationMatchingDice = val1 === d1 && val2 === d2;
  }

  const isResultCorrect = res === expectedResult;

  if (isEquationMatchingDice && isResultCorrect) {
    handleCorrectAnswer(val1, val2, res);
  } else {
    handleWrongAnswer(isEquationMatchingDice, isResultCorrect);
  }
}

function handleCorrectAnswer(val1, val2, res) {
  state.questionSolved = true;

  if (!state.mistakeOnCurrent) {
    state.firstTryCorrectCount++;
    scoreCount.textContent = state.firstTryCorrectCount;
  }

  state.history.push({
    equation: `${val1} ${state.currentOp} ${val2} = ${res}`,
    firstTry: !state.mistakeOnCurrent
  });

  [inputNum1, inputNum2, inputResult].forEach((inp) => {
    inp.classList.remove('wrong-field', 'active-field');
    inp.classList.add('correct-field');
    inp.disabled = true;
  });

  btnCheck.disabled = true;
  btnRoll.disabled = true;

  showFeedback(true, 'מצוין! פתרון נכון! 👏🎉');
  playApplauseAndCheer();
  launchFireworks();
  speakHebrew('כל הכבוד! תשובה נכונה!');

  btnNext.classList.remove('hidden');
  if (state.currentQuestionIndex + 1 >= state.totalQuestions) {
    btnNext.textContent = 'לסיום וקבלת תעודה 🏆';
  } else {
    btnNext.textContent = 'לתרגיל הבא ⬅️';
  }
}

function handleWrongAnswer(isEquationMatchingDice, isResultCorrect) {
  state.mistakeOnCurrent = true;

  [inputNum1, inputNum2, inputResult].forEach((inp) => {
    inp.classList.remove('wrong-field');
    // הפעלת אנימציית רעידה מחדש
    void inp.offsetWidth;
  });

  if (!isEquationMatchingDice) {
    inputNum1.classList.add('wrong-field');
    inputNum2.classList.add('wrong-field');
  }
  if (!isResultCorrect) {
    inputResult.classList.add('wrong-field');
  }

  showFeedback(false, '❌ נסה/נסי שנית');
  playErrorSound();
  speakHebrew('נסה או נסי שנית');
}

function showFeedback(isSuccess, message) {
  feedbackBox.classList.remove('hidden', 'success', 'error');
  feedbackBox.classList.add(isSuccess ? 'success' : 'error');
  feedbackIcon.textContent = isSuccess ? '👏🎉' : '❌';
  feedbackText.textContent = message;
}

// מעבר לתרגיל הבא או למסך הסיום
function nextQuestion() {
  state.currentQuestionIndex++;
  if (state.currentQuestionIndex >= state.totalQuestions) {
    showSummaryScreen();
  } else {
    prepareQuestionRound();
  }
}

function prepareQuestionRound() {
  state.hasRolled = false;
  state.questionSolved = false;
  state.mistakeOnCurrent = false;

  updateStatusHeader();
  randomizeDiceColors();

  playBtnText.textContent = 'הטל קוביות';
  btnRoll.disabled = false;
  btnRoll.classList.add('pulse');

  equationSection.classList.add('locked');
  [inputNum1, inputNum2, inputResult].forEach((inp) => {
    inp.value = '';
    inp.disabled = true;
    inp.classList.remove('correct-field', 'wrong-field', 'active-field');
  });

  btnCheck.disabled = true;
  btnNext.classList.add('hidden');
  feedbackBox.classList.add('hidden');

  instructionBanner.textContent = 'לחצו על לחצן הפליי (▶️) כדי להטיל את הקוביות!';
}

function updateStatusHeader() {
  const currentNum = state.currentQuestionIndex + 1;
  questionCounter.textContent = `תרגיל ${currentNum} מתוך ${state.totalQuestions}`;
  const pct = (currentNum / state.totalQuestions) * 100;
  progressBarFill.style.width = `${pct}%`;
  scoreCount.textContent = state.firstTryCorrectCount;
}

// מסך סיום ודיווח
function showSummaryScreen() {
  playCard.classList.add('hidden');
  summaryCard.classList.remove('hidden');

  const correct = state.firstTryCorrectCount;
  const total = state.totalQuestions;

  summaryReportText.textContent = `פתרת נכון ${correct} תרגילים מתוך ${total} תרגילים!`;

  if (correct === total) {
    trophyContainer.classList.remove('hidden');
    regularSummaryHeader.classList.add('hidden');
    playApplauseAndCheer();
    launchFireworks(2600);
    speakHebrew(`כל הכבוד! פתרת נכון את כל ${total} התרגילים וזכית בגביע מקום ראשון!`);
  } else {
    trophyContainer.classList.add('hidden');
    regularSummaryHeader.classList.remove('hidden');
    playApplauseAndCheer();
    speakHebrew(`סיימת את התרגול! פתרת נכון ${correct} מתוך ${total} תרגילים.`);
  }

  // הצגת רשימת התרגילים שנפתרו
  historyList.innerHTML = '';
  state.history.forEach((item) => {
    const badge = document.createElement('div');
    badge.className = `history-item ${item.firstTry ? 'perfect' : 'retried'}`;
    badge.innerHTML = `<span>${item.firstTry ? '⭐' : '✔️'}</span> <span>${item.equation}</span>`;
    historyList.appendChild(badge);
  });
}

function restartGame() {
  state.totalQuestions = parseInt(totalQuestionsSelect.value, 10) || 5;
  state.currentQuestionIndex = 0;
  state.firstTryCorrectCount = 0;
  state.history = [];

  summaryCard.classList.add('hidden');
  playCard.classList.remove('hidden');

  renderDieFace(pipGrid1, 3);
  renderDieFace(pipGrid2, 1);
  prepareQuestionRound();
}

// אנימציית זיקוקים חגיגית על גבי קנבס
const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrameId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchFireworks(duration = 1600) {
  const colors = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#F472B6'];

  function createBurst(x, y) {
    for (let i = 0; i < 42; i++) {
      const angle = (Math.PI * 2 * i) / 42;
      const speed = 2 + Math.random() * 5.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 4
      });
    }
  }

  createBurst(canvas.width * 0.25, canvas.height * 0.35);
  setTimeout(() => createBurst(canvas.width * 0.75, canvas.height * 0.35), 250);
  setTimeout(() => createBurst(canvas.width * 0.5, canvas.height * 0.25), 500);

  if (duration > 1800) {
    setTimeout(() => createBurst(canvas.width * 0.3, canvas.height * 0.45), 900);
    setTimeout(() => createBurst(canvas.width * 0.7, canvas.height * 0.4), 1250);
  }

  if (!animFrameId) {
    animateFireworks();
  }
}

function animateFireworks() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // כוח משיכה עדין
    p.alpha -= 0.016;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  particles = particles.filter((p) => p.alpha > 0);

  if (particles.length > 0) {
    animFrameId = requestAnimationFrame(animateFireworks);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    animFrameId = null;
  }
}

// חיבור אירועים
btnRoll.addEventListener('click', rollDice);
btnCheck.addEventListener('click', checkAnswer);
btnNext.addEventListener('click', nextQuestion);
btnRestart.addEventListener('click', restartGame);

[inputNum1, inputNum2, inputResult].forEach((inp, idx, arr) => {
  inp.addEventListener('focus', () => setActiveInput(inp));
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      checkAnswer();
    }
  });
  inp.addEventListener('input', () => {
    // מעבר אוטומטי למשבצת הבאה אם הוזנה ספרה
    if (inp.value.length >= 1 && idx < arr.length - 1 && inp.value !== '1') {
      setActiveInput(arr[idx + 1]);
    }
  });
});

// מקלדת מספרים על המסך
document.querySelectorAll('.num-key').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!state.hasRolled || state.questionSolved) return;
    if (!state.activeInput || state.activeInput.disabled) {
      setActiveInput(inputNum1);
    }

    const val = btn.dataset.val;
    if (val === 'clear') {
      state.activeInput.value = '';
      state.activeInput.focus();
      return;
    }

    state.activeInput.value = val;

    // מעבר אוטומטי למשבצת הבאה לנוחות התלמיד
    if (state.activeInput === inputNum1) {
      setActiveInput(inputNum2);
    } else if (state.activeInput === inputNum2) {
      setActiveInput(inputResult);
    } else {
      inputResult.focus();
    }
  });
});

// בחירת מצב (חיבור / חיסור / משולב)
document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    restartGame();
  });
});

totalQuestionsSelect.addEventListener('change', restartGame);

btnSpeakInstruction.addEventListener('click', () => {
  speakHebrew(
    'שלום תלמידים! לחצו על לחצן הפליי הירוק כדי לסובב את שתי הקוביות. לאחר שהקוביות נעצרות, ספרו כמה נקודות יש בכל קובייה, כתבו את המספרים במשבצות ופתרו את התרגיל!'
  );
});

btnMusicToggle.addEventListener('click', toggleBackgroundMusic);

btnSoundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) {
    btnSoundToggle.classList.add('active');
    soundStatusText.textContent = 'צלילים: פעיל';
  } else {
    btnSoundToggle.classList.remove('active');
    soundStatusText.textContent = 'צלילים: כבוי';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
});

// אתחול ראשוני
initPipGrids();
renderDieFace(pipGrid1, 3);
renderDieFace(pipGrid2, 1);
prepareQuestionRound();
