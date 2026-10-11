const ROUNDS = 5;
const MEMORIZE_MS = 3000;

const swatch = document.getElementById("swatch");
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

// CSS doesn't support HSB directly, so convert HSB -> HSL
function hsbToCss(h, s, b) {
  s /= 100;
  b /= 100;
  const l = b * (1 - s / 2);
  const sl = (l === 0 || l === 1) ? 0 : (b - l) / Math.min(l, 1 - l);
  return `hsl(${h}, ${Math.round(sl * 100)}%, ${Math.round(l * 100)}%)`;
}

function calcScore(t, g) {
  let dh = Math.abs(t[0] - g[0]);
  dh = Math.min(dh, 360 - dh) / 180; // hue wraps around
  const ds = Math.abs(t[1] - g[1]) / 100;
  const db = Math.abs(t[2] - g[2]) / 100;
  const dist = Math.sqrt(dh ** 2 + ds ** 2 + db ** 2);
  return Math.max(0, Math.round(100 * (1 - dist)));
}

function getGuess() {
  return [+sliders.hue.value, +sliders.sat.value, +sliders.bri.value];
}

function updateSwatch() {
  labels.hue.textContent = sliders.hue.value;
  labels.sat.textContent = sliders.sat.value;
  labels.bri.textContent = sliders.bri.value;
  if (guessing) {
    swatch.style.background = hsbToCss(...getGuess());
  }
}

function startRound() {
  if (round >= ROUNDS) {
    round = 0;
    total = 0;
  }
  swatch.classList.add("is-playing");
  round++;
  target = [
    Math.floor(Math.random() * 360),
    Math.floor(Math.random() * 101),
    Math.floor(Math.random() * 101),
  ];
  guessing = false;
  swatch.style.background = hsbToCss(...target);
  info.textContent = `Round ${round}/${ROUNDS}: memorize!`;
  button.disabled = true;
  setTimeout(beginGuess, MEMORIZE_MS);
}

function beginGuess() {
  sliders.hue.value = 0;
  sliders.sat.value = 50;
  sliders.bri.value = 50;
  guessing = true;
  updateSwatch();
  info.textContent = "Match the color!";
  button.textContent = "Submit";
  button.disabled = false;
  button.onclick = submit;
}

function submit() {
  guessing = false;
  const guess = getGuess();
  const score = calcScore(target, guess);
  total += score;
  swatch.style.background = hsbToCss(...target);
  info.textContent =
    `Score: ${score}  |  Total: ${total}\n` +
    `Guess: ${guess.join(", ")}  Target: ${target.join(", ")}`;
  button.textContent = round < ROUNDS ? "Next round" : "Play again";
  button.onclick = startRound;
}

Object.values(sliders).forEach(s => s.addEventListener("input", updateSwatch));
button.onclick = startRound;