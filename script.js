const ROUNDS = 5;
const MEMORIZE_MS = 3000;

const swatch = document.getElementById("swatch");
const memorizeTime = document.getElementById("memorize-time");
const resultSwatches = document.getElementById("result-swatches");
const guessColor = document.getElementById("guess-color");
const targetColor = document.getElementById("target-color");
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

let round = 0;
let total = 0;
let guessing = false;
let target = [0, 0, 0];
let countdownInterval = null;


function hsbToCss(h, s, b) {
  s /= 100;
  b /= 100;
  const l = b * (1 - s / 2);
  const sl = (l === 0 || l === 1) ? 0 : (b - l) / Math.min(l, 1 - l);
  return `hsl(${h}, ${Math.round(sl * 100)}%, ${Math.round(l * 100)}%)`;
}

function calcScore(t, g) {
  let dh = Math.abs(t[0] - g[0]);
  dh = Math.min(dh, 360 - dh) / 180; // 
  const ds = Math.abs(t[1] - g[1]) / 100;
  const db = Math.abs(t[2] - g[2]) / 100;
  const dist = Math.sqrt(dh ** 2 + ds ** 2 + db ** 2);
  return Math.max(0, Math.round(100 * (1 - dist)));
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

function startRound() {
  if (round >= ROUNDS) {
    round = 0;
    total = 0;
  }
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
  round++;
  target = [
    Math.floor(Math.random() * 360),
    65 + Math.floor(Math.random() * 36),
    68 + Math.floor(Math.random() * 33),
  ];
  guessing = false;
  swatch.style.background = hsbToCss(...target);
  info.textContent = `Round ${round}/${ROUNDS}: memorize!`;
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

function submit() {
  guessing = false;
  setSlidersDisabled(true);
  const guess = getGuess();
  const score = calcScore(target, guess);
  total += score;
  guessColor.style.backgroundColor = hsbToCss(...guess);
  targetColor.style.backgroundColor = hsbToCss(...target);
  swatch.hidden = true;
  resultSwatches.hidden = false;
  info.textContent = round < ROUNDS
    ? `Score: ${score}  |  Total: ${total}`
    : `Final score: ${total} / ${ROUNDS * 100}`;
  button.textContent = round < ROUNDS ? "una una" : "play again";
  button.onclick = startRound;
}

setSlidersDisabled(true);
updateSliderTracks();
Object.values(sliders).forEach(s => s.addEventListener("input", updateSwatch));
button.onclick = startRound;