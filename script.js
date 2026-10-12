const GUESS_MS = 10000;
const MAX_HP = 10;
const HP_PLAYER = "#e8639f";
const HP_ENEMY = "#6aa7f0";
const HP_TRACK = "#cfcdc4";
const HEAL_ON_DEFEAT = 2;
const ENEMY_PAUSE_MS = 1000;

const ENEMIES = [
  { name: "Slime", hp: 8, min: 1, max: 2, color: "#6aa7f0", memorizeMs: 3000 },
  { name: "Sprout", hp: 10, min: 1, max: 4, color: "#7fd400", memorizeMs: 2500 },
  { name: "Boss Bloom", hp: 12, min: 2, max: 5, color: "#e8639f", memorizeMs: 2000 },
];

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
const playerSprite = document.getElementById("player-sprite");
const enemySprite = document.getElementById("enemy-sprite");
const enemyNameLabel = document.getElementById("enemy-name");
const colorPanel = document.querySelector(".color-panel");
const panelHandle = document.getElementById("panel-handle");
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
let enemyIndex = 0;
let enemyHp = ENEMIES[0].hp;
let guessing = false;
let target = [0, 0, 0];
let countdownInterval = null;
let enemyTimeout = null;
let guessTimeout = null;
let beginGuessTimeout = null;
let introTimers = [];
let shakeTimer = null;
let flashTimer = null;
let round = 0;
let dropTimers = [];
let dropItem = null;
let dropShadow = null;

function currentEnemy() {
  return ENEMIES[enemyIndex];
}


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

const SVG_NS = "http://www.w3.org/2000/svg";

function buildWavePath() {
  const points = [];
  for (let x = 3; x <= 247; x += 2) {
    const y = 12 + 5 * Math.sin(((x - 3) / 244) * Math.PI * 2 * 6);
    points.push(`${x} ${y}`);
  }
  return `M ${points.join(" L ")}`;
}

function buildBar(bar, color, maxHp) {
  const max = maxHp || MAX_HP;
  bar.replaceChildren();
  const d = buildWavePath();
  const clipId = `clip-${bar.id}`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 250 24");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "24");
  svg.setAttribute("overflow", "visible");

  const defs = document.createElementNS(SVG_NS, "defs");
  const clipPath = document.createElementNS(SVG_NS, "clipPath");
  clipPath.setAttribute("id", clipId);
  const clipRect = document.createElementNS(SVG_NS, "rect");
  clipRect.setAttribute("class", "hp-clip");
  clipRect.setAttribute("x", "0");
  clipRect.setAttribute("y", "0");
  clipRect.setAttribute("width", "250");
  clipRect.setAttribute("height", "24");
  clipPath.append(clipRect);
  defs.append(clipPath);

  const track = document.createElementNS(SVG_NS, "path");
  track.setAttribute("d", d);
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", HP_TRACK);
  track.setAttribute("stroke-width", "3");
  track.setAttribute("stroke-linecap", "round");
  track.setAttribute("stroke-linejoin", "round");

  const fill = document.createElementNS(SVG_NS, "path");
  fill.setAttribute("d", d);
  fill.setAttribute("fill", "none");
  fill.setAttribute("stroke", color || (bar.id === "player-hp" ? HP_PLAYER : HP_ENEMY));
  fill.setAttribute("stroke-width", "4");
  fill.setAttribute("stroke-linecap", "round");
  fill.setAttribute("stroke-linejoin", "round");
  fill.setAttribute("clip-path", `url(#${clipId})`);

  svg.append(defs, track, fill);
  bar.append(svg);
}

function renderHp() {
  setBarWidth(playerHpBar, playerHp, MAX_HP);
  setBarWidth(enemyHpBar, enemyHp, currentEnemy().hp);
  dangerVignette.classList.toggle("active", playerHp < 5);
}

function setBarWidth(bar, hp, maxHp) {
  const rect = bar.querySelector(".hp-clip");
  if (rect) {
    const max = maxHp || MAX_HP;
    rect.setAttribute("width", String(250 * Math.max(0, hp) / max));
  }
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

function clearDropItem() {
  dropTimers.forEach(id => clearTimeout(id));
  dropTimers = [];
  if (dropItem) {
    dropItem.remove();
    dropItem = null;
  }
  if (dropShadow) {
    dropShadow.remove();
    dropShadow = null;
  }
  playerSprite.classList.remove("poof-out");
  playerSprite.style.opacity = "";
  playerSprite.style.transform = "";
}

function spawnItemDrop() {
  const arenaRect = battleArena.getBoundingClientRect();
  const spriteRect = playerSprite.getBoundingClientRect();
  const centerX = spriteRect.left - arenaRect.left + spriteRect.width / 2;
  const groundY = spriteRect.bottom - arenaRect.top;

  playerSprite.classList.add("poof-out");

  dropTimers.push(setTimeout(() => {
    dropShadow = document.createElement("div");
    dropShadow.className = "drop-shadow is-pop";
    dropShadow.style.left = `${centerX}px`;
    dropShadow.style.top = `${groundY - 7}px`;
    battleArena.append(dropShadow);

    dropItem = document.createElement("img");
    dropItem.className = "drop-item is-pop";
    dropItem.src = "assets/rotten-flesh.jpg";
    dropItem.alt = "";
    dropItem.style.left = `${centerX}px`;
    dropItem.style.top = `${groundY - 64}px`;
    battleArena.append(dropItem);

    const settle = event => {
      if (event.animationName !== "drop-pop") return;
      dropItem.classList.remove("is-pop");
      dropItem.classList.add("is-idle");
      dropShadow.classList.remove("is-pop");
      dropShadow.classList.add("is-idle");
    };
    dropItem.addEventListener("animationend", settle);
  }, 250));
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

function clearBeginGuessTimer() {
  clearTimeout(beginGuessTimeout);
  beginGuessTimeout = null;
}

function setupEnemy() {
  const enemy = currentEnemy();
  enemyHp = enemy.hp;
  buildBar(enemyHpBar, enemy.color, enemy.hp);
}

function nextEnemy() {
  enemyIndex += 1;
  clearFloats();
  setupEnemy();
  renderHp();
  info.textContent = `${currentEnemy().name} appears!`;
  button.disabled = true;
  button.onclick = null;
  enemyTimeout = setTimeout(() => {
    enemyTimeout = null;
    startRound();
  }, ENEMY_PAUSE_MS);
}

function resetBattle() {
  clearIntroTimers();
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  clearGuessTimer();
  clearBeginGuessTimer();
  clearShake();
  clearFlash();
  clearFloats();
  clearDropItem();
  playerHp = MAX_HP;
  enemyIndex = 0;
  guessing = false;
  setupEnemy();
  renderHp();
  round = 0;
  roundLabel.textContent = "round 1";
  resultSwatches.hidden = true;
  swatch.hidden = false;
  swatch.style.background = "";
  swatch.classList.remove("is-playing");
  memorizeTime.hidden = true;
  info.textContent = `${currentEnemy().name} appears!`;
  setSlidersDisabled(true);
  button.textContent = "Start";
  button.disabled = true;
  button.onclick = null;
}

function startFight() {
  hideEndOverlay();
  if (panelOutsideArena()) {
    resetPanelPosition();
  }
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
  clearBeginGuessTimer();
  clearShake();
  clearFlash();
  clearFloats();
  clearDropItem();
  playerHp = MAX_HP;
  enemyIndex = 0;
  setupEnemy();
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
  clearBeginGuessTimer();
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
  if (result === "lose") {
    spawnItemDrop();
    dropTimers.push(setTimeout(() => showEndOverlay(result), 1200));
  } else {
    showEndOverlay(result);
  }
}

function startRound() {
  setRound(round + 1);
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  clearGuessTimer();
  clearBeginGuessTimer();
  resultSwatches.hidden = true;
  swatch.hidden = false;
  memorizeTime.hidden = false;
  const memorizeMs = currentEnemy().memorizeMs;
  let millisecondsRemaining = memorizeMs;
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
  info.textContent = `${currentEnemy().name} appears!`;
  button.disabled = true;
  beginGuessTimeout = setTimeout(beginGuess, memorizeMs);
}

function beginGuess() {
  clearBeginGuessTimer();
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
  const enemy = currentEnemy();
  const damage = enemy.min + Math.floor(Math.random() * (enemy.max - enemy.min + 1));
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

function defeatEnemy(score, damage, crit, timedOut) {
  clearGuessTimer();
  clearBeginGuessTimer();
  clearTimeout(enemyTimeout);
  enemyTimeout = null;
  memorizeTime.hidden = true;
  button.disabled = true;
  guessing = false;
  setSlidersDisabled(true);
  guessColor.style.backgroundColor = hsbToCss(...getGuess());
  targetColor.style.backgroundColor = hsbToCss(...target);
  swatch.hidden = true;
  resultSwatches.hidden = false;

  playerHp = Math.min(MAX_HP, playerHp + HEAL_ON_DEFEAT);
  renderHp();

  const hitMessage = `${timedOut ? "Time up. " : ""}${crit ? "CRIT! " : ""}Score: ${score}. You hit for ${damage}.`;

  if (enemyIndex >= ENEMIES.length - 1) {
    endGame("win", `${hitMessage} ${currentEnemy().name} defeated. You win!`);
    return;
  }

  info.textContent = `${currentEnemy().name} defeated! ${hitMessage}`;
  button.textContent = "next";
  button.disabled = false;
  button.onclick = () => {
    clearTimeout(enemyTimeout);
    enemyTimeout = null;
    button.onclick = null;
    nextEnemy();
  };

  enemyTimeout = setTimeout(() => {
    enemyTimeout = null;
    if (button.onclick) {
      button.onclick = null;
      nextEnemy();
    }
  }, ENEMY_PAUSE_MS);
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
    defeatEnemy(score, damage, crit, timedOut);
    return;
  }

  info.textContent = `${timedOut ? "Time up. " : ""}${crit ? "CRIT! " : ""}Score: ${score}. You hit for ${damage}.`;
  button.textContent = "enemy turn";
  button.disabled = true;
  enemyTimeout = setTimeout(enemyAttack, 900);
}

setSlidersDisabled(true);
buildBar(playerHpBar, HP_PLAYER, MAX_HP);
setupEnemy();
renderHp();
updateSliderTracks();
Object.values(sliders).forEach(s => s.addEventListener("input", updateSwatch));
button.onclick = startFight;
endPlayAgain.onclick = () => {
  hideEndOverlay();
  startFight();
};
endLeave.onclick = resetToIdle;

/* ===== draggable color panel ===== */
let panelDrag = null;
let panelRaf = null;
let panelPointer = { x: 0, y: 0 };
let panelOffset = { x: 0, y: 0 };

function panelIsDraggable() {
  return !window.matchMedia("(max-width: 800px)").matches;
}

function applyPanelTransform() {
  colorPanel.style.transform =
    `translate3d(${panelOffset.x}px, ${panelOffset.y}px, 0)`;
}

function clampPanel() {
  if (!panelDrag) {
    return;
  }
  const nextX = Math.min(
    Math.max(panelPointer.x - panelDrag.grabX - panelDrag.baseLeft, panelDrag.minX),
    panelDrag.maxX
  );
  const nextY = Math.min(
    Math.max(panelPointer.y - panelDrag.grabY - panelDrag.baseTop, panelDrag.minY),
    panelDrag.maxY
  );
  if (nextX === panelOffset.x && nextY === panelOffset.y) {
    return;
  }
  panelOffset.x = nextX;
  panelOffset.y = nextY;
  applyPanelTransform();
}

function panelFrame() {
  panelRaf = null;
  clampPanel();
}

function schedulePanelFrame() {
  if (panelRaf === null) {
    panelRaf = requestAnimationFrame(panelFrame);
  }
}

function resetPanelPosition() {
  panelOffset.x = 0;
  panelOffset.y = 0;
  colorPanel.style.transform = "";
  colorPanel.classList.remove("dragging");
  document.body.classList.remove("dragging");
}

function panelOutsideArena() {
  if (panelOffset.x === 0 && panelOffset.y === 0) {
    return false;
  }
  const arenaRect = battleArena.getBoundingClientRect();
  const rect = colorPanel.getBoundingClientRect();
  return rect.left < arenaRect.left ||
    rect.top < arenaRect.top ||
    rect.right > arenaRect.right ||
    rect.bottom > arenaRect.bottom;
}

function clampPanelToArena() {
  if (!panelIsDraggable()) {
    resetPanelPosition();
    return;
  }
  if (panelOffset.x === 0 && panelOffset.y === 0) {
    return;
  }
  const arenaRect = battleArena.getBoundingClientRect();
  const rect = colorPanel.getBoundingClientRect();
  const baseLeft = rect.left - panelOffset.x;
  const baseTop = rect.top - panelOffset.y;
  const minX = arenaRect.left - baseLeft;
  const maxX = arenaRect.right - rect.width - baseLeft;
  const minY = arenaRect.top - baseTop;
  const maxY = arenaRect.bottom - rect.height - baseTop;
  panelPointer.x = baseLeft + panelOffset.x;
  panelPointer.y = baseTop + panelOffset.y;
  panelDrag = { grabX: 0, grabY: 0, baseLeft, baseTop, minX, maxX, minY, maxY };
  clampPanel();
  panelDrag = null;
}

function onPanelPointerMove(event) {
  if (!panelDrag) {
    return;
  }
  panelPointer.x = event.clientX;
  panelPointer.y = event.clientY;
  schedulePanelFrame();
}

function onPanelPointerEnd(event) {
  if (!panelDrag) {
    return;
  }
  if (panelRaf !== null) {
    cancelAnimationFrame(panelRaf);
    panelRaf = null;
  }
  clampPanel();
  panelDrag = null;
  colorPanel.classList.remove("dragging");
  document.body.classList.remove("dragging");
  window.removeEventListener("pointermove", onPanelPointerMove);
  window.removeEventListener("pointerup", onPanelPointerEnd);
  window.removeEventListener("pointercancel", onPanelPointerEnd);
  if (panelHandle.hasPointerCapture(event.pointerId)) {
    panelHandle.releasePointerCapture(event.pointerId);
  }
}

panelHandle.addEventListener("pointerdown", event => {
  if (!panelIsDraggable() || event.button !== 0) {
    return;
  }
  event.preventDefault();

  const arenaRect = battleArena.getBoundingClientRect();
  const rect = colorPanel.getBoundingClientRect();
  const baseLeft = rect.left - panelOffset.x;
  const baseTop = rect.top - panelOffset.y;

  panelPointer.x = event.clientX;
  panelPointer.y = event.clientY;
  panelDrag = {
    grabX: event.clientX - rect.left,
    grabY: event.clientY - rect.top,
    baseLeft,
    baseTop,
    minX: arenaRect.left - baseLeft,
    maxX: arenaRect.right - rect.width - baseLeft,
    minY: arenaRect.top - baseTop,
    maxY: arenaRect.bottom - rect.height - baseTop,
  };

  colorPanel.classList.add("dragging");
  document.body.classList.add("dragging");
  panelHandle.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", onPanelPointerMove);
  window.addEventListener("pointerup", onPanelPointerEnd);
  window.addEventListener("pointercancel", onPanelPointerEnd);
});

panelHandle.addEventListener("dblclick", () => {
  if (!panelIsDraggable()) {
    return;
  }
  resetPanelPosition();
});

window.addEventListener("resize", clampPanelToArena);
