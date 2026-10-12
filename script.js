const MEMORIZE_MS = 3000;
const GUESS_MS = 10000;
const MAX_HP = 10;

const swatch = document.getElementById("swatch");
const memorizeTime = document.getElementById("memorize-time");
const resultSwatches = document.getElementById("result-swatches");
const guessColor = document.getElementById("guess-color");
const targetColor = document.getElementById("target-color");
const playerHpBar = document.getElementById("player-hp");
const enemyHpBar = document.getElementById("enemy-hp");
const info = document.getElementById("info");
const button = document.getElementById("button");
const introOverlay = document.getElementById("intro-overlay");
const introText = document.getElementById("intro-text");
const endOverlay = document.getElementById("end-overlay");
const endTitle = document.getElementById("end-title");
const endPlayAgain = document.getElementById("end-play-again");
const endLeave = document.getElementById("end-leave");
const battleArena = document.querySelector(".battle-arena");
const dangerVignette = document.getElementById("danger-vignette");
const roundLabel = document.getElementById("round-label");
const enemyFighter = document.querySelector(".fighter-enemy");
const sliders = {
  hue: document.getElementById("hue"),
  sat: document.getElementById("sat"),
  bri: document.getElementById("bri"),
};
const labels = {
  hue: document.getElementById("hueVal"),
  sat: document.getElementById("satVal"),
  bri: document.getElementById("briVal"),
};

let playerHp = MAX_HP;
let enemyHp = MAX_HP;
let guessing = false;
let target = [0, 0, 0];
let countdownInterval = null;
let enemyTimeout = null;
let guessTimeout = null;
let introTimers = [];
let shakeTimer = null;
let flashTimer = null;
let round = 0;


function hsbToCss(h, s, b) {
  s /= 100;
  b /= 100;
  const l = b * (1 - s / 2);
  const sl = (l === 0 || l === 1) ? 0 : (b - l) / Math.min(l, 1 - l);
  return `hsl(${h}, ${Math.round(sl * 100)}%, ${Math.round(l * 100)}%)`;
}

function calcScore(t, g) {
  let dh = Math.abs(t[0] - g[0]);
  dh = Math.min(dh, 360 - dh) / 180;
  const ds = Math.abs(t[1] - g[1]) / 100;
  const db = Math.abs(t[2] - g[2]) / 100;
  const dist = Math.sqrt(dh ** 2 + ds ** 2 + db ** 2);
  return Math.max(0, Math.round(100 * (1 - dist)));
}

function calcDamage(score) {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  if (score >= 50) return 1;
  return 0;
}

function getGuess() {
  return [+sliders.hue.value, +sliders.sat.value, +sliders.bri.value];
}

function setSlidersDisabled(disabled) {
  Object.values(sliders).forEach(slider => {
    slider.disabled = disabled;
  });
}

function updateSliderTracks() {
  const [hue, saturation, brightness] = getGuess();
  sliders.sat.style.backgroundImage =
    `linear-gradient(90deg, ${hsbToCss(hue, 0, brightness)}, ${hsbToCss(hue, 100, brightness)})`;
  sliders.bri.style.backgroundImage =
    `linear-gradient(90deg, #000000, ${hsbToCss(hue, saturation, 100)})`;
}

function updateSwatch() {
  labels.hue.textContent = sliders.hue.value;
  labels.sat.textContent = sliders.sat.value;
  labels.bri.textContent = sliders.bri.value;
  updateSliderTracks();
  if (guessing) {
    swatch.style.background = hsbToCss(...getGuess());
  }
}

function renderHpBar(bar, hp) {
  bar.replaceChildren();
  for (let i = 0; i < MAX_HP; i++) {
    const slot = document.createElement("span");
    slot.className = "hp-slot";
    if (i >= hp) {
      slot.classList.add("empty");
      slot.style.backgroundColor = "#c4c8cc";
    }
    bar.append(slot);
  }
}

function renderHp() {
  renderHpBar(playerHpBar, playerHp);
  renderHpBar(enemyHpBar, enemyHp);
  dangerVignette.classList.toggle("active", playerHp < 5);
}

function shakeArena(damage) {
  const strong = damage >= 4;
  battleArena.classList.remove("screen-shake", "screen-shake--strong");
  void battleArena.offsetWidth;
  battleArena.classList.add("screen-shake");
  if (strong) {
    battleArena.classList.add("screen-shake--strong");
  }
  clearTimeout(shakeTimer);
  shakeTimer = setTimeout(() => {
    battleArena.classList.remove("screen-shake", "screen-shake--strong");
    shakeTimer = null;
  }, 200);
}

function clearShake() {
  clearTimeout(shakeTimer);
  shakeTimer = null;
  battleArena.classList.remove("screen-shake", "screen-shake--strong");
}

function setRound(value) {
  round = value;
  roundLabel.textContent = `round ${round}`;
}

function flashEnemyHp() {
  clearTimeout(flashTimer);
  enemyHpBar.classList.remove("flash");
  void enemyHpBar.offsetWidth;
  enemyHpBar.classList.add("flash");
  flashTimer = setTimeout(() => {
    enemyHpBar.classList.remove("flash");
    flashTimer = null;
  }, 150);
}

function spawnFloat(text, className, parent) {
  const el = document.createElement("span");
  el.className = `float-num ${className}`;
  el.textContent = text;
  el.style.left = `${30 + Math.random() * 40}%`;
  parent.append(el);
  el.addEventListener("animationend", () => el.remove(), { once: true });
}

function clearFloats() {
  document.querySelectorAll(".float-num").forEach(el => el.remove());
}

function clearFlash() {
  clearTimeout(flashTimer);
  flashTimer = null;
  enemyHpBar.classList.remove("flash");
}

function clearGuessTimer() {
  clearTimeout(guessTimeout);
  guessTimeout = null;
  clearInterval(countdownInterval);
  countdownInterval = null;
}

function startGuessTimer() {
  let millisecondsRemaining = GUESS_MS;
  memorizeTime.hidden = false;
  memorizeTime.textContent = (millisecondsRemaining / 1000).toFixed(1);
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    millisecondsRemaining = Math.max(0, millisecondsRemaining - 400);
    if (millisecondsRemaining > 0) {
      memorizeTime.textContent = (millisecondsRemaining / 1000).toFixed(1);
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 400);
  clearTimeout(guessTimeout);
  guessTimeout = setTimeout(() => {
    if (guessing) {
      submit(true);
    }
  }, GUESS_MS);
}

function clearIntroTimers() {
  introTimers.forEach(id => clearTimeout(id));
  introTimers = [];
}

function showIntroStep(text) {
  introText.textContent = text;
  introText.style.animation = "none";
  void introText.offsetWidth;
  introText.style.animation = "";
}

function hideIntro() {
  clearIntroTimers();
  introOverlay.hidden = true;
  introText.textContent = "";
  introText.style.animation = "none";
  void introText.offsetWidth;
  introText.style.animation = "";
}

const INTRO_STEPS = ["3", "2", "1", "FIGHT!"];
const INTRO_STEP_MS = 800;

function runIntro(onDone) {
  clearIntroTimers();
  introOverlay.hidden = false;
  setSlidersDisabled(true);
  button.disabled = true;
  INTRO_STEPS.forEach((step, i) => {
    introTimers.push(setTimeout(() => showIntroStep(step), i * INTRO_STEP_MS));
  });
  introTimers.push(setTimeout(() => {
    hideIntro();
    onDone();
  }, INTRO_STEPS.length * INTRO_STEP_MS));
}

function resetBattle() {
  clearIntroTimers();
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  clearGuessTimer();
  clearShake();
  clearFlash();
  clearFloats();
  playerHp = MAX_HP;
  enemyHp = MAX_HP;
  renderHp();
  setRound(0);
}

function startFight() {
  hideEndOverlay();
  resetBattle();
  runIntro(startRound);
}

function playAgain() {
  startFight();
}

function showEndOverlay(result) {
  endOverlay.hidden = false;
  endOverlay.classList.remove("win", "lose");
  endOverlay.classList.add(result === "win" ? "win" : "lose");
  endTitle.textContent = result === "win" ? "YOU WIN!" : "YOU LOSE";
}

function hideEndOverlay() {
  endOverlay.hidden = true;
  endOverlay.classList.remove("win", "lose");
  endTitle.textContent = "";
}

function resetToIdle() {
  hideEndOverlay();
  clearIntroTimers();
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  clearGuessTimer();
  clearShake();
  clearFlash();
  clearFloats();
  playerHp = MAX_HP;
  enemyHp = MAX_HP;
  renderHp();
  round = 0;
  roundLabel.textContent = "round 1";
  guessing = false;
  resultSwatches.hidden = true;
  swatch.hidden = false;
  memorizeTime.hidden = true;
  swatch.style.background = "";
  swatch.classList.remove("is-playing");
  info.textContent = "Press Start";
  setSlidersDisabled(true);
  button.textContent = "Start";
  button.disabled = false;
  button.onclick = startFight;
}

function endGame(result, message) {
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  clearGuessTimer();
  clearIntroTimers();
  clearShake();
  clearFlash();
  clearFloats();
  hideIntro();
  guessing = false;
  setSlidersDisabled(true);
  info.textContent = message;
  button.disabled = true;
  button.onclick = null;
  showEndOverlay(result);
}

function startRound() {
  setRound(round + 1);
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  clearGuessTimer();
  resultSwatches.hidden = true;
  swatch.hidden = false;
  memorizeTime.hidden = false;
  let millisecondsRemaining = MEMORIZE_MS;
  memorizeTime.textContent = (millisecondsRemaining / 1000).toFixed(1);
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    millisecondsRemaining = Math.max(0, millisecondsRemaining - 400);
    if (millisecondsRemaining > 0) {
      memorizeTime.textContent = (millisecondsRemaining / 1000).toFixed(1);
    } else {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }, 400);
  setSlidersDisabled(true);
  swatch.classList.add("is-playing");
  target = [
    Math.floor(Math.random() * 360),
    65 + Math.floor(Math.random() * 36),
    68 + Math.floor(Math.random() * 33),
  ];
  guessing = false;
  swatch.style.background = hsbToCss(...target);
  info.textContent = "memorize!";
  button.disabled = true;
  setTimeout(beginGuess, MEMORIZE_MS);
}

function beginGuess() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  sliders.hue.value = 0;
  sliders.sat.value = 50;
  sliders.bri.value = 50;
  guessing = true;
  setSlidersDisabled(false);
  updateSwatch();
  info.textContent = "match the color";
  button.textContent = "submit";
  button.disabled = false;
  button.onclick = submit;
  startGuessTimer();
}

function enemyAttack() {
  const damage = 1 + Math.floor(Math.random() * 4);
  playerHp = Math.max(0, playerHp - damage);
  renderHp();
  shakeArena(damage);

  if (playerHp <= 0) {
    endGame("lose", `Enemy hit for ${damage}. You lose.`);
    return;
  }

  info.textContent = `Enemy hit for ${damage}.`;
  button.textContent = "una una";
  button.disabled = false;
  button.onclick = startRound;
}

function submit(timedOut = false) {
  timedOut = timedOut === true;
  clearGuessTimer();
  memorizeTime.hidden = true;
  button.disabled = true;
  guessing = false;
  setSlidersDisabled(true);
  const guess = getGuess();
  const score = calcScore(target, guess);
  const crit = score >= 98;
  const damage = calcDamage(score) + (crit ? 1 : 0);
  enemyHp = Math.max(0, enemyHp - damage);
  renderHp();
  if (damage > 0) {
    shakeArena(damage);
    flashEnemyHp();
    spawnFloat(`${damage}`, "dmg", enemyFighter);
  }
  if (crit) {
    spawnFloat("CRIT!", "crit", enemyFighter);
  }
  guessColor.style.backgroundColor = hsbToCss(...guess);
  targetColor.style.backgroundColor = hsbToCss(...target);
  swatch.hidden = true;
  resultSwatches.hidden = false;

  if (enemyHp <= 0) {
    endGame("win", `${crit ? "CRIT! " : ""}Score: ${score}. You hit for ${damage}. You win.`);
    return;
  }

  info.textContent = `${timedOut ? "Time up. " : ""}${crit ? "CRIT! " : ""}Score: ${score}. You hit for ${damage}.`;
  button.textContent = "enemy turn";
  button.disabled = true;
  enemyTimeout = setTimeout(enemyAttack, 900);
}

setSlidersDisabled(true);
renderHp();
updateSliderTracks();
Object.values(sliders).forEach(s => s.addEventListener("input", updateSwatch));
button.onclick = startFight;
endPlayAgain.onclick = () => {
  hideEndOverlay();
  startFight();
};
endLeave.onclick = resetToIdle;
