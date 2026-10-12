const MEMORIZE_MS = 3000;
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
}

function resetBattle() {
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  playerHp = MAX_HP;
  enemyHp = MAX_HP;
  renderHp();
}

function playAgain() {
  resetBattle();
  startRound();
}

function endGame(message) {
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  guessing = false;
  setSlidersDisabled(true);
  info.textContent = message;
  button.textContent = "play again";
  button.disabled = false;
  button.onclick = playAgain;
}

function startRound() {
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
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
  memorizeTime.hidden = true;
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
}

function enemyAttack() {
  const damage = 1 + Math.floor(Math.random() * 4);
  playerHp = Math.max(0, playerHp - damage);
  renderHp();

  if (playerHp <= 0) {
    endGame(`Enemy hit for ${damage}. You lose.`);
    return;
  }

  info.textContent = `Enemy hit for ${damage}.`;
  button.textContent = "una una";
  button.disabled = false;
  button.onclick = startRound;
}

function submit() {
  guessing = false;
  setSlidersDisabled(true);
  const guess = getGuess();
  const score = calcScore(target, guess);
  const damage = calcDamage(score);
  enemyHp = Math.max(0, enemyHp - damage);
  renderHp();
  guessColor.style.backgroundColor = hsbToCss(...guess);
  targetColor.style.backgroundColor = hsbToCss(...target);
  swatch.hidden = true;
  resultSwatches.hidden = false;

  if (enemyHp <= 0) {
    endGame(`Score: ${score}. You hit for ${damage}. You win.`);
    return;
  }

  info.textContent = `Score: ${score}. You hit for ${damage}.`;
  button.textContent = "enemy turn";
  button.disabled = true;
  enemyTimeout = setTimeout(enemyAttack, 900);
}

setSlidersDisabled(true);
renderHp();
updateSliderTracks();
Object.values(sliders).forEach(s => s.addEventListener("input", updateSwatch));
button.onclick = startRound;
