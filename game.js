// Square Dino Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const distanceDiv = document.getElementById('distance');
// New HUD elements (may be null if not in DOM yet)
const bestScoreSpan = document.getElementById('bestScore');
const finalDistanceSpan = document.getElementById('finalDistance');
const menuBox = document.getElementById('menuBox');
const gameOverBox = document.getElementById('gameOverBox');
const pauseBox = document.getElementById('pauseBox');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const buffIndicator = document.getElementById('buffIndicator');
// Buff bar elements
const barRocket = document.getElementById('barRocket');
const barMagnet = document.getElementById('barMagnet');
const barSlow = document.getElementById('barSlow');
const barGlide = document.getElementById('barGlide');
const barTank = document.getElementById('barTank');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// Game constants
const GRAVITY = 1.2;
const JUMP_POWER = -18;
const DUCK_POWER = 8;
const GROUND_Y = Math.floor(window.innerHeight * 0.7);
const PLAYER_SIZE = 40;
const OBSTACLE_SIZE = 26;
// Base horizontal world speed (reduced from 8 to 6 to make nhân vật cảm giác chậm lại)
const OBSTACLE_SPEED = 6; // was 8
// (Optional) If muốn tăng tốc dần theo quãng đường: bỏ comment đoạn dưới và dùng getBaseSpeed() thay vì hằng số.
// const BASE_SPEED = 6; // tốc độ ban đầu
// const MAX_BASE_SPEED = 10; // tốc độ trần
// const SPEED_GROWTH_PER_DISTANCE = 0.0008; // mỗi 1 đơn vị distance tăng một chút
// function getBaseSpeedDynamic() {
//     return Math.min(MAX_BASE_SPEED, BASE_SPEED + distance * SPEED_GROWTH_PER_DISTANCE);
// }
const ITEM_SIZE = 30;
// New item / buff constants
const ROCKET_MIN_OBSTACLE_INDEX = 3; // earliest obstacle index that can force rocket award
const ROCKET_RANDOM_CHANCE = 0.35; // chance to spawn rocket in a qualifying rest gap
// Rocket flight ~200m (distance increments 1 per frame) => 200 frames
const ROCKET_BUFF_DURATION = 200; // frames (was 50)
const ROCKET_LAND_PROTECT_DISTANCE = PLAYER_SIZE * 50; // '50m' tương đối ~ 50 lần kích thước đơn vị
// New vibrant obstacle palette (used when USE_OLD_OBSTACLE_COLORS = false or per-spawn random)
const OB_PALETTE = [
    '#c0392b', // deep red
    '#e74c3c', // bright red
    '#d35400', // orange mushroom stem
    '#a67c52', // bark brown
    '#8e5d34', // dark bark
    '#27ae60', // leaf green
    '#2ecc71', // bright leaf
    '#c8d96f', // mossy top
    '#f1c40f'  // golden accent
];
// Background & ground visual palettes
// Forest theme palettes (bright day sky + layered greens + earthy ground)
const SKY_GRADIENT_COLORS = ['#58c5f8', '#4bb3f0', '#42a5e5', '#3a8fcf'];
const CLOUD_PALETTE = ['#ffffff', '#f5fbff', '#e9f7ff', '#dbefff'];
// Ground palettes (restored)
const GROUND_TILE_PALETTE = ['#5a3f2b', '#64452f', '#6e4c33', '#755233', '#7d5836'];
const GROUND_ACCENT_PALETTE = ['#8ccf4d', '#79ba41', '#6aad36'];
// Grassy field + flowers customization
// You can tweak these to change how the new ground looks
const GRASS_FIELD_HEIGHT = 110; // total thickness of the grass area below the running surface
const GRASS_TOP_HIGHLIGHT = '#cffe86';
const GRASS_GRADIENT_COLORS = ['#b9f96a', '#82d942', '#4c9e2a']; // top->bottom
const FLOWER_SEGMENT_WIDTH = 48; // horizontal cell size for deterministic flower placement
const FLOWER_DENSITY = 0.55; // increased density for main clusters
const FLOWER_COLORS = ['#ffffff', '#ffe25a', '#ffb6ec', '#ff7d7d', '#d4b4ff']; // softened pastel
const FLOWER_CENTER_COLOR = '#ffef7a';
const FLOWER_CLUSTER_MAX = 9; // allow bigger clusters
const EXTRA_FILL_FLOWER_DENSITY = 0.22; // more filler flowers
const SECOND_ROW_FLOWER_CHANCE = 0.45; // chance to spawn a second staggered layer behind
// Mountain + tree customization
const MOUNTAIN_LAYERS = [
    { color: '#e2f9ff', speed: 0.008, height: 180, variance: 28, spacing: 0.95 },
    { color: '#cdefff', speed: 0.014, height: 160, variance: 40, spacing: 0.90 },
    { color: '#b2e1f8', speed: 0.022, height: 140, variance: 48, spacing: 0.85 },
    { color: '#98d2f1', speed: 0.032, height: 120, variance: 55, spacing: 0.80 }
];
const TREE_LAYER = { speed: 0.18, spacing: 260, trunkColor: '#7a4d19', leafColors: ['#3b7d2c', '#4fa83d', '#62c24a'] };
// Enlarged clouds scaling
const CLOUD_SCALE_MIN = 15;
const CLOUD_SCALE_MAX = 20;
// Dynamic grass fill: set to true to auto stretch to bottom
const GRASS_DYNAMIC_FILL = true;

// ================= UI LAYOUT CONFIG (pixel positions) =================
// All key UI elements use these so you can tweak easily in one place.
const UI_POS = {
    // Difficulty toggle button (top-right primary)
    diffToggle: { top: 120, right: 8 },
    // Difficulty badge (under toggle)
    diffBadge: { top: 160, right: 8 },
    // Test tank button (for debugging) (placed further down)
    testTank: { top: 86, right: 8 }
};
// Behavior flags
const HIDE_TEST_BUTTON_DURING_PLAY = false; // always show test button now
const ENABLE_TANK_CANCEL_KEY = true;       // allow canceling tank mode mid-run (Key X)
// Overhead obstacle size adjustments
const OVERHEAD_OBS_HEIGHT = Math.floor(OBSTACLE_SIZE * 0.55); // lower (shorter) than ground obstacles
const OVERHEAD_OBS_WIDTH_MIN = Math.floor(OBSTACLE_SIZE * 1.8); // stretch range
const OVERHEAD_OBS_WIDTH_MAX = Math.floor(OBSTACLE_SIZE * 3.2);
// New: force duck requirement — bottom of overhead sits low enough that standing hits, ducking passes
const OVERHEAD_FORCE_DUCK = true; // set false to revert higher placement
const OVERHEAD_DUCK_CLEARANCE = 2; // pixels gap above crouched head

function applyUIPositions() {
    if (diffToggleBtn) {
        diffToggleBtn.style.top = UI_POS.diffToggle.top + 'px';
        diffToggleBtn.style.right = UI_POS.diffToggle.right + 'px';
    }
    if (diffBadge) {
        diffBadge.style.top = UI_POS.diffBadge.top + 'px';
        diffBadge.style.right = UI_POS.diffBadge.right + 'px';
    }
    if (testBtn) {
        testBtn.style.top = UI_POS.testTank.top + 'px';
        testBtn.style.right = UI_POS.testTank.right + 'px';
    }
}

// Helper previously removed by accident
function randRange(a, b) { return a + Math.random() * (b - a); }
// Deterministic hash -> [0,1) for procedural placement
function hash01(x) {
    // Simple deterministic hash -> [0,1)
    let v = (Math.sin(x * 127.1 + 311.7) * 43758.5453123) % 1;
    if (v < 0) v += 1;
    return v;
}
// Cloud layer config referenced by initClouds
const CLOUD_LAYER_CONFIG = [
    { speed: 0.08, count: 5 },
    { speed: 0.12, count: 4 },
    { speed: 0.18, count: 3 }
];
// Ensure cloudLayers declared (avoid implicit global)
let cloudLayers = [];
// Replace procedural cloud rectangles with pixel-style segmented clouds
const PIXEL_CLOUD_PATTERNS = [
    // Each pattern: rows of 0/1; we will scale up by a factor for crisp pixel look
    [
        '001111000',
        '011111110',
        '111111111',
        '011111110',
    ],
    [
        '000111100000',
        '001111111000',
        '011111111100',
        '111111111110',
        '011111111100',
    ],
    [
        '001111100',
        '011111110',
        '111111111',
        '111111111',
        '011111110',
    ],
    [
        '000011110000',
        '001111111100',
        '011111111110',
        '111111111111',
        '011111111110',
    ],
];
// Override initClouds to use elongated horizontal placement with chosen pattern
function initClouds() {
    cloudLayers = CLOUD_LAYER_CONFIG.map((cfg, li) => {
        const arr = [];
        for (let i = 0; i < cfg.count; i++) {
            const pattern = PIXEL_CLOUD_PATTERNS[Math.floor(Math.random() * PIXEL_CLOUD_PATTERNS.length)];
            const scale = randRange(CLOUD_SCALE_MIN, CLOUD_SCALE_MAX); // enlarged clouds
            arr.push({
                x: Math.random() * canvas.width,
                y: Math.random() * (GROUND_Y * 0.38) + li * 10,
                pattern,
                scale,
                c: CLOUD_PALETTE[0],
                cShadow: '#b9e6ff',
                speed: (cfg.speed * randRange(0.7, 1.25)) * 0.9 // slight overall slow for big size
            });
        }
        return arr;
    });
}
// Now that all cloud-related constants & functions exist, initialize canvas & clouds
resizeCanvas();
initClouds();
const SHIELD_HIT_MIN = 1;
const SHIELD_HIT_MAX = 2;
const MAGNET_DURATION = 400; // frames ~ depends on speed (approx distance 20m user spec)
const MAGNET_RADIUS = 260; // pixels radius for attraction
const SLOW_DURATION = 600; // frames (~10s at 60fps)
const SLOW_SPEED_MULTIPLIER = 0.5; // 50% horizontal speed
// Vertical slow tuning: reduce gravity ONLY so nhân vật bay lâu hơn nhưng vẫn đạt chiều cao bình thường
// Giữ nguyên lực nhảy để cảm giác bật lên vẫn mạnh nhưng rơi xuống chậm lại.
const SLOW_GRAVITY_SCALE = 0.80; // gravity multiplier while slow active (0.45 => rơi chậm ~45%)
const SLOW_DESCENT_DAMP = 0.85; // apply each frame when falling (vy>0) under slow for extra float
const SLOW_JUMP_SCALE = 0.90; // giảm lực bật đầu khi slow để nhảy không quá cao
// Glide (paper airplane) constants (frame-based duration)
const GLIDE_DURATION_FRAMES = 300; // 300 frames (~5s @60fps)
const GLIDE_SPEED_MULTIPLIER = 0.75; // slower horizontal pace while gliding for relaxed feel
// Tank mode constants (activated once after collecting ALL 5 unique item types: rocket, glide, shield, magnet, slow)
const TANK_MODE_DURATION = PLAYER_SIZE * 400; // distance of harder wave mode
const TANK_SPEED_MULTIPLIER = 1.2; // speed up during tank mode
const TANK_GAP_SHRINK = 0.8; // multiply gaps when tank mode active
const TANK_OBSTACLE_EXTRA_CHANCE = 0.25; // chance to spawn an extra mid-gap small obstacle
const TANK_FIRE_COOLDOWN = 14; // frames between shots
const TANK_BULLET_SPEED = 18;
const TANK_BULLET_SIZE = 10;
// Difficulty tuning constants
const OBSTACLE_MIN_GAP_BASE = PLAYER_SIZE * 11; // previously 5
const OBSTACLE_MAX_GAP_BASE = PLAYER_SIZE * 20; // previously 10
const OBSTACLE_MIN_GAP_WITH_ROCKET = PLAYER_SIZE * 15; // previously 12
const OBSTACLE_MAX_GAP_WITH_ROCKET = PLAYER_SIZE * 22; // previously 18
// Rocket flight height
const ROCKET_HEIGHT = 120;
// Wave / pacing constants (exact 5 obstacles then a guaranteed empty rest gap)
const OBSTACLES_PER_WAVE = 5; // fixed wave size (updated)
const REST_GAP_MIN = PLAYER_SIZE * 18;
const REST_GAP_MAX = PLAYER_SIZE * 26;
// Safe landing distance for rocket (player.x forward clearance after rocket ends)
const SAFE_LAND_DISTANCE = PLAYER_SIZE * 30;
// Wave planning state
let waveObstacleIndex = 0; // 0 => ready to start new wave, 1..3 obstacles within wave
let currentWavePlan = null; // {gaps:[gap1..gap5], restWidth, _restRegion}
let restGapFrames = 0; // (deprecated) frames remaining of rest gap (to be replaced by distance)
let restGapDistance = 0; // pixels remaining of rest gap (independent of speed)
const OVERHEAD_CLEARANCE = 6; // small gap (pixels) when crouching under overhead obstacle
const LANDING_SAFE_BUFFER = PLAYER_SIZE * 20; // width guaranteed obstacle-free when landing from rocket
const ITEM_SAFE_OBS_GAP = PLAYER_SIZE * 3; // minimum distance from nearest obstacle for item spawn ease
let obstacleSpawnBlockFrames = 0; // frames to block obstacle spawning (e.g., during rocket landing)
// removed: upcomingRestGap (old scheduling approach)

// Game state & player
let gameState = 'menu'; // menu | playing | paused | gameover
let highScore = parseInt(localStorage.getItem('squareRunHigh') || '0', 10);
if (bestScoreSpan) bestScoreSpan.textContent = highScore;

let player = {
    x: Math.floor(window.innerWidth / 4),
    y: GROUND_Y,
    vy: 0,
    isJumping: false,
    isDucking: false,
    buff: null,
    buffTimer: 0,
    shieldCharges: 0,
    magnetTimer: 0,
    totalObstaclesPassed: 0, // track for rocket scheduling
    shieldFlashTimer: 0,
    slowTimer: 0,
    landingProtectRemaining: 0, // distance (pixels) remaining of post-rocket one-hit protection
    glideRemaining: 0, // frames of glide left
    tankModeRemaining: 0, // distance of tank mode left
    // New: unique item collection state (must collect all once to unlock tank)
    collectedUnique: {
        rocket: false,
        glide: false,
        shield: false,
        magnet: false,
        slow: false
    },
    tankUnlocked: false, // set true after tank mode has been granted (prevent repeats)
    fireCooldown: 0 // for tank bullets
};
let obstacles = [];
let items = [];
let particles = []; // dust particles
let projectiles = []; // tank bullets
let distance = 0;
let lastObstacleTime = 0;
let lastItemTime = 0;
let animationId;
let groundOffset = 0;
let loopStopped = false; // track if main loop stopped after gameover

let difficulty = 'hard'; // 'easy' | 'hard'
const DIFFICULTY_SPEED_MULTIPLIERS = { easy: 0.7, hard: 1.0 };
// Optional simple on-screen indicator element (create if not exists)
let diffBadge = document.getElementById('difficultyBadge');
if (!diffBadge) {
    diffBadge = document.createElement('div');
    diffBadge.id = 'difficultyBadge';
    diffBadge.style.position = 'fixed';
    diffBadge.style.padding = '4px 10px';
    diffBadge.style.background = 'rgba(0,0,0,0.4)';
    diffBadge.style.color = '#fff';
    diffBadge.style.fontFamily = 'monospace';
    diffBadge.style.fontSize = '14px';
    diffBadge.style.border = '1px solid #ffffff55';
    diffBadge.style.borderRadius = '6px';
    diffBadge.style.zIndex = '50';
    diffBadge.style.pointerEvents = 'none';
    diffBadge.textContent = 'HARD';
    diffBadge.style.top = UI_POS.diffBadge.top + 'px';
    diffBadge.style.right = UI_POS.diffBadge.right + 'px';
    document.body.appendChild(diffBadge);
}
function updateDifficultyBadge() { if (diffBadge) diffBadge.textContent = difficulty.toUpperCase(); }

// On–screen difficulty toggle button (user can change only when not actively playing)
let diffToggleBtn = document.getElementById('difficultyToggleBtn');
if (!diffToggleBtn) {
    diffToggleBtn = document.createElement('button');
    diffToggleBtn.id = 'difficultyToggleBtn';
    diffToggleBtn.textContent = 'ĐỘ KHÓ: HARD';
    Object.assign(diffToggleBtn.style, {
        position: 'fixed',
        padding: '6px 14px',
        background: '#2e2e2e',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '13px',
        border: '1px solid #858585',
        borderRadius: '6px',
        zIndex: 60,
        cursor: 'pointer',
        letterSpacing: '0.5px'
    });
    diffToggleBtn.style.top = UI_POS.diffToggle.top + 'px';
    diffToggleBtn.style.right = UI_POS.diffToggle.right + 'px';
    document.body.appendChild(diffToggleBtn);
}

function syncDifficultyButton() {
    if (diffToggleBtn) diffToggleBtn.textContent = 'ĐỘ KHÓ: ' + difficulty.toUpperCase();
}

if (diffToggleBtn) {
    diffToggleBtn.addEventListener('click', () => {
        if (gameState === 'menu' || gameState === 'paused' || gameState === 'gameover') {
            difficulty = (difficulty === 'hard') ? 'easy' : 'hard';
            updateDifficultyBadge();
            syncDifficultyButton();
        } else {
            // Optional tiny feedback flash when attempting during play
            diffToggleBtn.style.transform = 'scale(0.92)';
            setTimeout(() => diffToggleBtn.style.transform = '', 120);
        }
    });
}

function getCurrentSpeed() {
    const base = OBSTACLE_SPEED * (DIFFICULTY_SPEED_MULTIPLIERS[difficulty] || 1); // apply difficulty multiplier
    let speed = base;
    if (player.slowTimer > 0) speed *= SLOW_SPEED_MULTIPLIER;
    if (player.glideRemaining > 0) speed *= GLIDE_SPEED_MULTIPLIER;
    if (player.tankModeRemaining > 0) speed *= TANK_SPEED_MULTIPLIER;
    return speed;
}

function setBar(barEl, fillRatio) {
    if (!barEl) return;
    const fill = barEl.querySelector('.buff-fill');
    if (fillRatio > 0) {
        barEl.classList.remove('hidden-bar');
        const pct = Math.min(100, Math.max(0, fillRatio * 100));
        fill.style.width = pct.toFixed(1) + '%';
        // Remove previous state classes
        barEl.classList.remove('low', 'critical');
        // Determine thresholds
        if (pct <= 15) barEl.classList.add('critical');
        else if (pct <= 35) barEl.classList.add('low');
        // Provide remaining seconds approximation if bar has a known duration
        // Durations: Rocket=ROCKET_BUFF_DURATION frames, Magnet=MAGNET_DURATION, Slow=SLOW_DURATION
        let totalFrames = 0;
        if (barEl.id === 'barRocket') totalFrames = ROCKET_BUFF_DURATION;
        else if (barEl.id === 'barMagnet') totalFrames = MAGNET_DURATION;
        else if (barEl.id === 'barSlow') totalFrames = SLOW_DURATION;
        else if (barEl.id === 'barGlide') totalFrames = GLIDE_DURATION_FRAMES;
        if (totalFrames > 0 && (barEl.classList.contains('low') || barEl.classList.contains('critical'))) {
            const remainingFrames = Math.round(totalFrames * fillRatio);
            const remainingSec = (remainingFrames / 60).toFixed(1);
            fill.setAttribute('data-remaining', remainingSec + 's');
        } else {
            fill.removeAttribute('data-remaining');
        }
    } else {
        fill.style.width = '0%';
        fill.removeAttribute('data-remaining');
        barEl.classList.add('hidden-bar');
        barEl.classList.remove('low', 'critical');
    }
}

function updateBuffBars() {
    // Rocket uses player.buffTimer / ROCKET_BUFF_DURATION
    const rocketRatio = (player.buff === 'rocket' && player.buffTimer > 0) ? player.buffTimer / ROCKET_BUFF_DURATION : 0;
    const magnetRatio = player.magnetTimer > 0 ? player.magnetTimer / MAGNET_DURATION : 0;
    const slowRatio = player.slowTimer > 0 ? player.slowTimer / SLOW_DURATION : 0;
    const glideRatio = player.glideRemaining > 0 ? player.glideRemaining / GLIDE_DURATION_FRAMES : 0;
    const tankRatio = player.tankModeRemaining > 0 ? player.tankModeRemaining / TANK_MODE_DURATION : 0;
    setBar(barRocket, rocketRatio);
    setBar(barMagnet, magnetRatio);
    setBar(barSlow, slowRatio);
    setBar(barGlide, glideRatio);
    setBar(barTank, tankRatio);
}

function show(el) { if (el) el.classList.remove('hidden'); }
function hide(el) { if (el) el.classList.add('hidden'); }

function resetGame() {
    player.y = GROUND_Y;
    player.vy = 0;
    player.isJumping = false;
    player.isDucking = false;
    player.buff = null;
    player.buffTimer = 0;
    player.shieldCharges = 0;
    player.magnetTimer = 0;
    player.totalObstaclesPassed = 0;
    player.shieldFlashTimer = 0;
    player.slowTimer = 0;
    player.landingProtectRemaining = 0;
    player.glideRemaining = 0;
    player.tankModeRemaining = 0;
    // Reset unique collection (tank only once per run, but we allow re-collect logic fresh on restart)
    player.collectedUnique.rocket = false;
    player.collectedUnique.glide = false;
    player.collectedUnique.shield = false;
    player.collectedUnique.magnet = false;
    player.collectedUnique.slow = false;
    player.tankUnlocked = false;
    player.fireCooldown = 0;
    obstacles = [];
    items = [];
    particles = [];
    distance = 0;
    lastObstacleTime = 0;
    lastItemTime = 0;
    if (buffIndicator) buffIndicator.textContent = '';
    // Reset buff bars
    function hideBar(b) { if (!b) return; b.classList.add('hidden-bar'); const f = b.querySelector('.buff-fill'); if (f) f.style.width = '0%'; }
    hideBar(barRocket); hideBar(barMagnet); hideBar(barSlow);
    // Wave planning reset
    waveObstacleIndex = 0;
    currentWavePlan = null;
    restGapFrames = 0;
    restGapDistance = 0;
    obstacleSpawnBlockFrames = 0;
}

function startGame() {
    resetGame();
    gameState = 'playing';
    updateDifficultyBadge();
    hide(menuBox); hide(gameOverBox); hide(pauseBox);
    updateTestButtonVisibility();
}

function endGame() {
    gameState = 'gameover';
    if (finalDistanceSpan) finalDistanceSpan.textContent = distance;
    if (distance > highScore) {
        highScore = distance;
        localStorage.setItem('squareRunHigh', highScore);
        if (bestScoreSpan) bestScoreSpan.textContent = highScore;
    }
    show(gameOverBox);
    loopStopped = true;
    updateTestButtonVisibility();
}

function togglePause() {
    if (gameState === 'playing') { gameState = 'paused'; show(pauseBox); }
    else if (gameState === 'paused') { gameState = 'playing'; hide(pauseBox); animationId = requestAnimationFrame(gameLoop); }
    updateTestButtonVisibility();
}

function spawnObstacle() {
    // Block obstacle spawning during protected landing window
    if (obstacleSpawnBlockFrames > 0) return;

    // Start a new wave plan if needed
    if (waveObstacleIndex === 0 || !currentWavePlan) {
        const gaps = [];
        for (let i = 0; i < OBSTACLES_PER_WAVE; i++) {
            let gap = Math.floor(Math.random() * (OBSTACLE_MAX_GAP_BASE - OBSTACLE_MIN_GAP_BASE)) + OBSTACLE_MIN_GAP_BASE;
            if (player.tankModeRemaining > 0) gap = Math.floor(gap * TANK_GAP_SHRINK);
            gaps.push(gap);
        }
        currentWavePlan = {
            gaps,
            restWidth: Math.floor(Math.random() * (REST_GAP_MAX - REST_GAP_MIN)) + REST_GAP_MIN,
            _rocketOffered: false
        };
        waveObstacleIndex = 1;
    } else {
        waveObstacleIndex++;
    }

    // Determine base X reference (last obstacle or screen edge)
    let lastX = canvas.width;
    if (obstacles.length > 0) lastX = obstacles[obstacles.length - 1].x;

    let gapAhead = 0;
    if (waveObstacleIndex >= 1 && waveObstacleIndex <= OBSTACLES_PER_WAVE) {
        gapAhead = currentWavePlan.gaps[waveObstacleIndex - 1];
    }

    let newX = lastX + gapAhead;

    // Ensure not too close to player
    const MIN_DISTANCE_FROM_PLAYER = PLAYER_SIZE * 6;
    newX = Math.max(newX, player.x + MIN_DISTANCE_FROM_PLAYER);

    // Shape selection each obstacle
    let typeRand = Math.random();
    let shape = 'square';
    let isOverhead = false;
    if (typeRand < 0.33) shape = 'square';
    else if (typeRand < 0.66) shape = 'diamond';
    else { shape = 'overhead'; isOverhead = true; }

    // Compute Y placement (overhead vs ground)
    let oy;
    let ow = OBSTACLE_SIZE;
    let oh = OBSTACLE_SIZE;
    if (isOverhead) {
        const crouchHeight = Math.floor(PLAYER_SIZE * 0.6);
        // Duck top Y (player top when crouched): player.y becomes GROUND_Y + (PLAYER_SIZE - crouchHeight)
        const duckTopY = GROUND_Y + (PLAYER_SIZE - crouchHeight);
        let desiredBottom;
        if (OVERHEAD_FORCE_DUCK) {
            // Place bottom just a little above crouched head, but below standing head (standing head at GROUND_Y)
            // Since coordinate increases downward: standing head (GROUND_Y) < desiredBottom < duckTopY
            desiredBottom = duckTopY - OVERHEAD_DUCK_CLEARANCE;
            // Clamp to ensure still below duckTopY and above standing head
            if (desiredBottom <= GROUND_Y + 1) desiredBottom = GROUND_Y + 1;
            if (desiredBottom >= duckTopY - 1) desiredBottom = duckTopY - 1;
        } else {
            // Original higher placement (player could pass standing)
            desiredBottom = GROUND_Y - (PLAYER_SIZE - crouchHeight) - OVERHEAD_CLEARANCE;
        }
        oh = OVERHEAD_OBS_HEIGHT; // shorter
        ow = Math.floor(OVERHEAD_OBS_WIDTH_MIN + Math.random() * (OVERHEAD_OBS_WIDTH_MAX - OVERHEAD_OBS_WIDTH_MIN));
        oy = desiredBottom - oh;
    } else {
        oy = GROUND_Y;
    }
    // Assign a random color from palette for more vibrant look (single push)
    const color = OB_PALETTE[Math.floor(Math.random() * OB_PALETTE.length)];
    obstacles.push({ x: newX, y: oy, shape, isOverhead, color, w: ow, h: oh });
    // Possibly spawn an extra small obstacle during tank mode inside large gaps
    if (player.tankModeRemaining > 0 && Math.random() < TANK_OBSTACLE_EXTRA_CHANCE) {
        const extraX = newX + (OBSTACLE_SIZE * 2) + Math.random() * (OBSTACLE_SIZE * 3);
        const extraColor = OB_PALETTE[Math.floor(Math.random() * OB_PALETTE.length)];
        obstacles.push({ x: extraX, y: GROUND_Y, shape: 'square', isOverhead: false, mini: true, color: extraColor });
    }

    // Rocket appears between obstacle 4 and 5 (spawn right after we spawn obstacle 4, before obstacle 5)
    if (waveObstacleIndex === 4 && !currentWavePlan._rocketOffered) {
        // Predict where obstacle 5 will spawn (relative)
        const gapTo5 = currentWavePlan.gaps[4];
        const obstacle4X = newX;
        const obstacle5X = obstacle4X + gapTo5;
        // Place rocket somewhere 35% into the gap so player sees it BEFORE passing obstacle 4
        const rocketX = obstacle4X + gapTo5 * 0.35;
        const hasRocketItem = items.some(it => it.type === 'rocket');
        if (player.buff !== 'rocket' && !hasRocketItem) {
            const probabilityRocket = 0.5;
            if (Math.random() < probabilityRocket) {
                items.push({ x: rocketX, y: GROUND_Y - 110, type: 'rocket', shape: 'circle' });
                // Do not block spawns yet; only when picked up
            }
        }
        currentWavePlan._rocketOffered = true;
    }

    // After third obstacle, we will not spawn any new obstacle until past rest gap
    if (waveObstacleIndex === OBSTACLES_PER_WAVE) {
        // Start rest gap measured in pixels (independent of speed) directly by restWidth
        restGapDistance = currentWavePlan.restWidth;
        waveObstacleIndex = 0;
    }
}

function spawnItem() {
    // Weighted pool (remove old tank part logic). Tank unlock is automatic, so no 'part' or 'tank' items.
    const pool = [];
    if (player.glideRemaining <= 0 && player.buff !== 'rocket') pool.push('glide');
    // Shield weight 3
    pool.push('shield', 'shield', 'shield');
    // Magnet weight 1
    pool.push('magnet');
    // Slow weight 2 (if not active and no slow item present)
    const hasSlowItem = items.some(it => it.type === 'slow');
    if (player.slowTimer <= 0 && !hasSlowItem) pool.push('slow', 'slow');
    if (pool.length === 0) return;
    const type = pool[Math.floor(Math.random() * pool.length)];
    let shape = 'square';
    if (type === 'magnet') shape = 'triangle';
    else if (type === 'slow') shape = 'circle';
    else if (type === 'glide') shape = 'circle';
    // base spawn X
    let spawnX = canvas.width;
    function nearestObstacleDistance(x) {
        let minD = Infinity;
        for (const o of obstacles) {
            const dx = Math.abs((o.x + OBSTACLE_SIZE / 2) - x);
            if (dx < minD) minD = dx;
        }
        return minD;
    }
    let attempts = 0;
    while (nearestObstacleDistance(spawnX) < ITEM_SAFE_OBS_GAP * 1.2 && attempts < 6) { spawnX += ITEM_SAFE_OBS_GAP; attempts++; }
    items.push({ x: spawnX, y: GROUND_Y - 110, type, shape });
}

function updatePlayer() {
    if (player.buff === 'rocket') {
        // Maintain flight height, no gravity influence during buff
        player.vy = 0;
        player.y = GROUND_Y - ROCKET_HEIGHT;
        player.buffTimer--;
        if (player.buffTimer <= 0) {
            // End rocket: allow natural gravity fall instead of teleporting
            player.buff = null;
            if (buffIndicator) buffIndicator.textContent = '';
            player.isJumping = true; // enable fall physics
            // Activate landing protection distance
            player.landingProtectRemaining = ROCKET_LAND_PROTECT_DISTANCE;
            // Do NOT change player.x so landing feels natural
        }
        return;
    }
    // Decrement magnet timer
    if (player.magnetTimer > 0) player.magnetTimer--;
    if (player.slowTimer > 0) {
        player.slowTimer--;
        if (player.slowTimer === 0) {
            // Grant protection when slow ends
            player.landingProtectRemaining = Math.max(player.landingProtectRemaining, ROCKET_LAND_PROTECT_DISTANCE);
        }
    }
    if (player.shieldFlashTimer > 0) player.shieldFlashTimer--;
    // Decrement landing protection by traveled distance (approx speed per frame)
    if (player.landingProtectRemaining > 0) {
        player.landingProtectRemaining -= getCurrentSpeed();
        if (player.landingProtectRemaining < 0) player.landingProtectRemaining = 0;
    }
    if (player.glideRemaining > 0) {
        player.glideRemaining--; // consume 1 frame
        // Maintain a gentle glide height slightly higher than rocket
        player.vy = 0;
        player.y = GROUND_Y - (ROCKET_HEIGHT - 25);
        if (player.glideRemaining === 0) {
            // Grant protection when glide ends
            player.landingProtectRemaining = Math.max(player.landingProtectRemaining, ROCKET_LAND_PROTECT_DISTANCE);
        }
    }
    if (player.tankModeRemaining > 0) {
        player.tankModeRemaining -= getCurrentSpeed();
        if (player.tankModeRemaining < 0) player.tankModeRemaining = 0;
    }
    if (player.fireCooldown > 0) player.fireCooldown--;
    if (player.isJumping) {
        // Gravity scaling only (no change to initial jump velocity)
        const gScale = player.slowTimer > 0 ? SLOW_GRAVITY_SCALE : 1;
        player.vy += GRAVITY * gScale;
        // Extra float on descent (after peak) while slow active
        if (player.slowTimer > 0 && player.vy > 0) {
            player.vy *= SLOW_DESCENT_DAMP; // damp descent speed
        }
        player.y += player.vy;
        if (player.y >= GROUND_Y) {
            player.y = GROUND_Y;
            player.vy = 0;
            player.isJumping = false;
            // Land puff
            spawnDust(3, true);
        }
    }
    if (player.isDucking) {
        player.y = GROUND_Y + DUCK_POWER;
    } else if (!player.isJumping && !player.buff) {
        player.y = GROUND_Y;
    }
}

function updateObstacles() {
    for (let obs of obstacles) {
        obs.x -= getCurrentSpeed();
    }
    // Count passed obstacles
    const remaining = [];
    for (let obs of obstacles) {
        if (obs.x + OBSTACLE_SIZE > 0) {
            remaining.push(obs);
        } else {
            player.totalObstaclesPassed++;
        }
    }
    obstacles = remaining;
}

function updateItems() {
    for (let item of items) {
        item.x -= getCurrentSpeed();
    }
    // Magnet attraction: move items toward player if within radius
    if (player.magnetTimer > 0) {
        for (let item of items) {
            const dx = (player.x + PLAYER_SIZE / 2) - (item.x + ITEM_SIZE / 2);
            const dy = (player.y + PLAYER_SIZE / 2) - (item.y + ITEM_SIZE / 2);
            const dist = Math.hypot(dx, dy);
            if (dist < MAGNET_RADIUS) {
                const pull = 6; // attraction speed
                item.x += (dx / (dist || 1)) * pull;
                item.y += (dy / (dist || 1)) * pull;
            }
        }
    }
    items = items.filter(item => item.x + ITEM_SIZE > 0);
}

// ------------------ PARTICLES (dust) ------------------
function spawnDust(count = 1, big = false) {
    for (let i = 0; i < count; i++) {
        let palette;
        if (player.buff === 'rocket') palette = ['#ffb347', '#ff8c42', '#ff7034'];
        else if (player.glideRemaining > 0) palette = ['#9bd7ff', '#6bb6ec', '#c3ecff'];
        else if (player.slowTimer > 0) palette = ['#b27ad6', '#8245a8', '#cfa2ff'];
        else if (player.landingProtectRemaining > 0) palette = ['#ffe27a', '#ffcc33', '#ffc94d'];
        else if (player.tankModeRemaining > 0) palette = ['#b0b0b0', '#8d8d8d', '#d2d2d2'];
        else palette = big ? ['#c2b280', '#9e9274'] : ['#9e9274', '#807763'];
        const color = palette[Math.floor(Math.random() * palette.length)];
        particles.push({
            x: player.x + (PLAYER_SIZE * 0.4) + Math.random() * (PLAYER_SIZE * 0.2),
            y: GROUND_Y + PLAYER_SIZE - 4,
            vx: - (1 + Math.random() * 2),
            vy: - (0.5 + Math.random() * (big ? 2 : 1)),
            life: big ? 22 : 14,
            size: big ? 5 : 3,
            color
        });
    }
}

function updateParticles() {
    const next = [];
    for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity on dust
        p.life--;
        if (p.life > 0) next.push(p);
    }
    particles = next;
    // Spawn running dust if on ground, not jumping, not rocket
    if (!player.isJumping && player.buff !== 'rocket') {
        if (Math.random() < 0.25) spawnDust(1, false);
    }
}

function checkCollision(a, b, aw, ah, bw, bh) {
    return (
        a.x < b.x + bw &&
        a.x + aw > b.x &&
        a.y < b.y + bh &&
        a.y + ah > b.y
    );
}

function handleCollisions() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        let collided = false;
        if (obs.isOverhead) {
            const ow = obs.w || OBSTACLE_SIZE;
            const oh = obs.h || OVERHEAD_OBS_HEIGHT;
            if (!player.isDucking && checkCollision(player, obs, PLAYER_SIZE, PLAYER_SIZE, ow, oh)) collided = true;
        } else {
            const size = obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE;
            if (checkCollision(player, obs, PLAYER_SIZE, PLAYER_SIZE, size, size)) collided = true;
        }
        if (collided) {
            // Tank crush: if in tank mode, destroy obstacle instead of taking damage
            if (player.tankModeRemaining > 0) {
                const ow = obs.isOverhead ? (obs.w || OBSTACLE_SIZE) : (obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                const oh = obs.isOverhead ? (obs.h || OVERHEAD_OBS_HEIGHT) : (obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                spawnExplosion(obs.x + ow / 2, obs.y + oh / 2, obs.mini);
                obstacles.splice(i, 1);
                continue;
            }
            // Consume landing protection first if active
            if (player.landingProtectRemaining > 0) {
                player.landingProtectRemaining = 0; // consumed
                const ow = obs.isOverhead ? (obs.w || OBSTACLE_SIZE) : (obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                const oh = obs.isOverhead ? (obs.h || OVERHEAD_OBS_HEIGHT) : (obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                spawnExplosion(obs.x + ow / 2, obs.y + oh / 2, obs.mini);
                obstacles.splice(i, 1);
                continue;
            }
            if (player.shieldCharges > 0) {
                player.shieldCharges--;
                player.shieldFlashTimer = 20; // frames of flash
                const ow = obs.isOverhead ? (obs.w || OBSTACLE_SIZE) : (obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                const oh = obs.isOverhead ? (obs.h || OVERHEAD_OBS_HEIGHT) : (obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                spawnExplosion(obs.x + ow / 2, obs.y + oh / 2, obs.mini);
                obstacles.splice(i, 1); // remove obstacle so it can't drain multiple charges
                continue; // proceed to next obstacle
            } else {
                endGame();
                return;
            }
        }
    }
    for (let i = items.length - 1; i >= 0; i--) {
        if (checkCollision(player, items[i], PLAYER_SIZE, PLAYER_SIZE, ITEM_SIZE, ITEM_SIZE)) {
            if (items[i].type === 'rocket') {
                player.buff = 'rocket';
                player.buffTimer = ROCKET_BUFF_DURATION;
                if (buffIndicator) buffIndicator.textContent = '🚀';
                // Extend protection if not already set (avoid shrinking existing longer block)
                obstacleSpawnBlockFrames = Math.max(obstacleSpawnBlockFrames, ROCKET_BUFF_DURATION + 30);
            } else if (items[i].type === 'glide') {
                player.glideRemaining = GLIDE_DURATION_FRAMES;
                if (buffIndicator) buffIndicator.textContent = '✈️';
            } else if (items[i].type === 'shield') {
                // Random 1-2 charges
                const charges = Math.floor(Math.random() * (SHIELD_HIT_MAX - SHIELD_HIT_MIN + 1)) + SHIELD_HIT_MIN;
                player.shieldCharges += charges;
            } else if (items[i].type === 'magnet') {
                player.magnetTimer = MAGNET_DURATION;
            } else if (items[i].type === 'slow') {
                player.slowTimer = SLOW_DURATION;
            }
            // Mark unique collections (even if item effect already applied)
            if (items[i].type === 'rocket') player.collectedUnique.rocket = true;
            else if (items[i].type === 'glide') player.collectedUnique.glide = true;
            else if (items[i].type === 'shield') player.collectedUnique.shield = true;
            else if (items[i].type === 'magnet') player.collectedUnique.magnet = true;
            else if (items[i].type === 'slow') player.collectedUnique.slow = true;
            // Check unlock condition
            if (!player.tankUnlocked) {
                const allCollected = Object.values(player.collectedUnique).every(v => v);
                if (allCollected) {
                    player.tankUnlocked = true;
                    player.tankModeRemaining = TANK_MODE_DURATION;
                    if (buffIndicator) buffIndicator.textContent = '🪖';
                }
            }
            items.splice(i, 1);
        }
    }
}

function drawPlayer() {
    ctx.save();
    const frame = Math.floor(distance / 12) % 2;
    // Higher contrast player colors: base teal + alternate bright lime for leg animation
    let baseColorA = '#0669d9';
    let baseColorB = '#0ddc8d';
    let color = frame ? baseColorA : baseColorB;
    if (player.buff === 'rocket') color = frame ? '#ffbb55' : '#ffaa22';
    else if (player.isDucking && !player.isJumping) color = frame ? '#0aa57a' : '#099263';
    if (player.tankModeRemaining > 0) {
        // Draw simplified tank body
        const bodyY = player.y + PLAYER_SIZE - Math.floor(PLAYER_SIZE * 0.55);
        const bodyH = Math.floor(PLAYER_SIZE * 0.55);
        const treadH = Math.floor(bodyH * 0.45);
        const hullH = bodyH - treadH;
        // Treads
        ctx.fillStyle = '#3d3d3d';
        ctx.fillRect(player.x - 4, bodyY + hullH, PLAYER_SIZE + 8, treadH);
        // Notches on treads
        ctx.fillStyle = '#5a5a5a';
        for (let i = 0; i < 6; i++) {
            const notchX = player.x - 2 + i * ((PLAYER_SIZE + 4) / 5);
            ctx.fillRect(Math.round(notchX), bodyY + hullH + treadH / 3, 6, treadH / 3);
        }
        // Hull
        ctx.fillStyle = '#2f6b6b';
        ctx.fillRect(player.x, bodyY, PLAYER_SIZE, hullH);
        // Turret
        const turretW = PLAYER_SIZE * 0.55;
        const turretH = hullH * 0.55;
        const turretX = player.x + PLAYER_SIZE * 0.22;
        const turretY = bodyY - turretH + 4;
        ctx.fillStyle = '#348f8f';
        ctx.fillRect(turretX, turretY, turretW, turretH);
        // Barrel
        const barrelLen = PLAYER_SIZE * 0.9;
        ctx.fillStyle = '#256060';
        ctx.fillRect(turretX + turretW - 4, turretY + turretH / 2 - 4, barrelLen, 8);
        // Shield outline if has shield
        if (player.shieldCharges > 0 || player.shieldFlashTimer > 0) {
            ctx.strokeStyle = player.shieldFlashTimer > 0 && player.shieldFlashTimer % 6 < 3 ? '#ffffff' : '#8ce1ff';
            ctx.lineWidth = 3;
            ctx.strokeRect(player.x - 4, bodyY - turretH + 2, PLAYER_SIZE + barrelLen + 10, bodyH + turretH + 2);
        }
        ctx.restore();
        return;
    }
    ctx.fillStyle = color;
    let h = PLAYER_SIZE;
    let y = player.y;
    if (player.isDucking && !player.isJumping && player.buff !== 'rocket') {
        h = Math.floor(PLAYER_SIZE * 0.6);
        y = player.y + PLAYER_SIZE - h;
    }
    ctx.fillRect(player.x, y, PLAYER_SIZE, h);
    // Outline for visibility
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x - 1.5, y - 1.5, PLAYER_SIZE + 3, h + 3);
    if (player.shieldFlashTimer > 0) {
        ctx.strokeStyle = player.shieldFlashTimer % 6 < 3 ? '#ffffff' : '#4fc3f7';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 2, y - 2, PLAYER_SIZE + 4, h + 4);
    } else if (player.shieldCharges > 0) {
        ctx.strokeStyle = '#8ce1ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x - 2, y - 2, PLAYER_SIZE + 4, h + 4);
    }
    if (player.buff === 'rocket') {
        ctx.fillStyle = '#ff7f2a';
        ctx.fillRect(player.x - 8, player.y + PLAYER_SIZE - 14, 6, 12);
        ctx.fillStyle = '#ffe680';
        ctx.fillRect(player.x - 6, player.y + PLAYER_SIZE - 12, 4, 8);
    }
    ctx.restore();
}

function drawObstacles() {
    for (let obs of obstacles) {
        ctx.save();
        // Classic color restore option
        // Toggle these constants if you want different palette quickly
        const USE_OLD_OBSTACLE_COLORS = true; // set false to go back to gray style
        const OB_COLOR_SQUARE = '#d95838';    // old style square color
        const OB_COLOR_DIAMOND = '#e6c744';   // old style diamond color
        const OB_COLOR_OVERHEAD = '#4fb07a';  // old style overhead color
        if (USE_OLD_OBSTACLE_COLORS) {
            // Use the per-spawn random vibrant color if available for more variety
            if (obs.color) ctx.fillStyle = obs.color;
            else if (obs.isOverhead) ctx.fillStyle = OB_COLOR_OVERHEAD;
            else if (obs.shape === 'diamond') ctx.fillStyle = OB_COLOR_DIAMOND;
            else ctx.fillStyle = OB_COLOR_SQUARE; // square & fallback
        } else {
            // Fallback grayscale
            if (obs.color) ctx.fillStyle = obs.color; else if (obs.isOverhead) ctx.fillStyle = '#5a5a5a'; else ctx.fillStyle = '#6b6b6b';
        }
        if (obs.shape === 'square') {
            const size = obs.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE;
            ctx.fillRect(obs.x, obs.y + (obs.mini ? (OBSTACLE_SIZE - size) : 0), size, size);
        } else if (obs.isOverhead) {
            const w = obs.w || OBSTACLE_SIZE;
            const h = obs.h || OVERHEAD_OBS_HEIGHT;
            ctx.fillRect(obs.x, obs.y, w, h);
        } else if (obs.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(obs.x + OBSTACLE_SIZE / 2, obs.y);
            ctx.lineTo(obs.x + OBSTACLE_SIZE, obs.y + OBSTACLE_SIZE / 2);
            ctx.lineTo(obs.x + OBSTACLE_SIZE / 2, obs.y + OBSTACLE_SIZE);
            ctx.lineTo(obs.x, obs.y + OBSTACLE_SIZE / 2);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawItems() {
    for (let item of items) {
        ctx.save();
        if (item.type === 'rocket') ctx.fillStyle = '#ffa500';
        else if (item.type === 'shield') ctx.fillStyle = '#4fc3f7';
        else if (item.type === 'magnet') ctx.fillStyle = '#f1c40f';
        else if (item.type === 'slow') ctx.fillStyle = '#9b59b6';
        else if (item.type === 'glide') ctx.fillStyle = '#9bd7ff';
        // Removed part/tank items (tank now unlocks automatically)
        else ctx.fillStyle = '#2ecc71';
        if (item.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(item.x + ITEM_SIZE / 2, item.y + ITEM_SIZE / 2, ITEM_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (item.shape === 'square') {
            ctx.fillRect(item.x, item.y, ITEM_SIZE, ITEM_SIZE);
        } else if (item.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(item.x + ITEM_SIZE / 2, item.y);
            ctx.lineTo(item.x + ITEM_SIZE, item.y + ITEM_SIZE);
            ctx.lineTo(item.x, item.y + ITEM_SIZE);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

// Tank projectiles
function fireTankBullet() {
    if (player.tankModeRemaining <= 0) return;
    if (player.fireCooldown > 0) return;
    player.fireCooldown = TANK_FIRE_COOLDOWN;
    const yMid = player.y + (PLAYER_SIZE * 0.5);
    projectiles.push({ x: player.x + PLAYER_SIZE, y: yMid - TANK_BULLET_SIZE / 2, vx: TANK_BULLET_SPEED });
}

function updateProjectiles() {
    if (projectiles.length === 0) return;
    const next = [];
    for (let p of projectiles) {
        p.x += p.vx;
        // Collision with obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            const ow = o.isOverhead ? (o.w || OBSTACLE_SIZE) : (o.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
            const oh = o.isOverhead ? (o.h || OVERHEAD_OBS_HEIGHT) : (o.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
            if (p.x < o.x + ow && p.x + TANK_BULLET_SIZE > o.x && p.y < o.y + oh && p.y + TANK_BULLET_SIZE > o.y) {
                spawnExplosion(o.x + ow / 2, o.y + oh / 2, o.mini);
                obstacles.splice(i, 1); // destroy obstacle
                p.vx = 0; // bullet consumed
                break;
            }
        }
        if (p.vx !== 0 && p.x < canvas.width + 200) next.push(p);
    }
    projectiles = next;
}

function drawProjectiles() {
    if (projectiles.length === 0) return;
    ctx.save();
    ctx.fillStyle = '#ffd447';
    for (let p of projectiles) {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), TANK_BULLET_SIZE, TANK_BULLET_SIZE);
        // simple muzzle tail
        ctx.fillStyle = '#ffef99';
        ctx.fillRect(Math.round(p.x - 6), Math.round(p.y + TANK_BULLET_SIZE / 3), 6, TANK_BULLET_SIZE / 3);
        ctx.fillStyle = '#ffd447';
    }
    ctx.restore();
}

// Simple explosion particle burst
function spawnExplosion(x, y, small = false) {
    const count = small ? 6 : 14;
    for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (small ? 2 : 3) + Math.random() * 2.5;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd * 0.6,
            life: 18 + Math.random() * 10,
            size: small ? 3 : 4,
            color: ['#ffbf3a', '#ffc94d', '#ff9333', '#ffd86b'][Math.floor(Math.random() * 4)]
        });
    }
}

function drawGround() {
    ctx.save();
    const topY = GROUND_Y + PLAYER_SIZE; // running surface top line
    const fieldHeight = GRASS_DYNAMIC_FILL ? (canvas.height - topY) : GRASS_FIELD_HEIGHT;
    if (gameState === 'playing') groundOffset = (groundOffset + getCurrentSpeed()) % (FLOWER_SEGMENT_WIDTH * 1000);

    // Grass gradient
    const g = ctx.createLinearGradient(0, topY, 0, topY + fieldHeight);
    GRASS_GRADIENT_COLORS.forEach((col, i) => g.addColorStop(i / (GRASS_GRADIENT_COLORS.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, topY, canvas.width, fieldHeight);

    // Top highlight
    ctx.fillStyle = GRASS_TOP_HIGHLIGHT;
    ctx.fillRect(0, topY, canvas.width, 4);

    // Depth noise near bottom
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#2b5d19';
    for (let x = 0; x < canvas.width; x += 6) {
        const h = 6 + Math.sin((x + groundOffset * 0.25) * 0.035) * 3;
        ctx.fillRect(x, topY + fieldHeight - 24 - h, 4, h);
    }
    ctx.globalAlpha = 1;

    const visibleSegments = Math.ceil(canvas.width / FLOWER_SEGMENT_WIDTH) + 2;
    const segmentOffset = Math.floor((groundOffset / FLOWER_SEGMENT_WIDTH));

    // Main flower clusters
    for (let i = -1; i < visibleSegments; i++) {
        const worldIndex = segmentOffset + i;
        const segX = (i * FLOWER_SEGMENT_WIDTH) - (groundOffset % FLOWER_SEGMENT_WIDTH);
        const r = hash01(worldIndex * 1.123);
        if (r < FLOWER_DENSITY) {
            const clusterSize = 3 + Math.floor(hash01(worldIndex * 7.77) * (FLOWER_CLUSTER_MAX - 2));
            const baseY = topY + 5;
            for (let f = 0; f < clusterSize; f++) {
                const fr = hash01(worldIndex * 91.31 + f * 13.5);
                const x = segX + 4 + fr * (FLOWER_SEGMENT_WIDTH - 8);
                const stemTopY = baseY + hash01(worldIndex * 0.37 + f) * 12;
                const petalColor = FLOWER_COLORS[Math.floor(hash01(worldIndex * 0.791 + f * 2.17) * FLOWER_COLORS.length)];
                // Stem
                ctx.fillStyle = '#2f6e1e';
                ctx.fillRect(Math.round(x), Math.round(stemTopY), 2, 8);
                // Petals (plus shape)
                const px = Math.round(x - 2);
                const py = Math.round(stemTopY - 5);
                ctx.fillStyle = petalColor;
                ctx.fillRect(px + 2, py, 2, 2);
                ctx.fillRect(px + 2, py + 4, 2, 2);
                ctx.fillRect(px, py + 2, 2, 2);
                ctx.fillRect(px + 4, py + 2, 2, 2);
                ctx.fillRect(px + 2, py + 2, 2, 2);
                ctx.fillStyle = FLOWER_CENTER_COLOR;
                ctx.fillRect(px + 2, py + 2, 2, 2);
            }
            // Optional second row behind cluster (taller, slightly dim)
            if (hash01(worldIndex * 17.77) < SECOND_ROW_FLOWER_CHANCE) {
                ctx.globalAlpha = 0.7;
                const rowCount = 1 + Math.floor(hash01(worldIndex * 3.333) * 4);
                for (let r2 = 0; r2 < rowCount; r2++) {
                    const rr = hash01(worldIndex * 55.1 + r2 * 6.3);
                    const x = segX + 8 + rr * (FLOWER_SEGMENT_WIDTH - 16);
                    const stemTopY = topY + 10 + hash01(worldIndex * 4.2 + r2) * 14;
                    ctx.fillStyle = '#28591a';
                    ctx.fillRect(Math.round(x), Math.round(stemTopY), 2, 10);
                    ctx.fillStyle = FLOWER_COLORS[Math.floor(hash01(worldIndex * 2.19 + r2) * FLOWER_COLORS.length)];
                    ctx.fillRect(Math.round(x - 1), Math.round(stemTopY - 3), 4, 4);
                }
                ctx.globalAlpha = 1;
            }
        } else if (hash01(worldIndex * 5.555) < EXTRA_FILL_FLOWER_DENSITY) {
            // Lone filler flower
            const x = segX + 10 + hash01(worldIndex * 11.11) * (FLOWER_SEGMENT_WIDTH - 20);
            const stemTopY = topY + 7 + hash01(worldIndex * 3.3) * 10;
            ctx.fillStyle = '#2f6e1e';
            ctx.fillRect(Math.round(x), Math.round(stemTopY), 2, 5);
            ctx.fillStyle = FLOWER_COLORS[Math.floor(hash01(worldIndex * 9.7) * FLOWER_COLORS.length)];
            ctx.fillRect(Math.round(x - 1), Math.round(stemTopY - 3), 4, 4);
        }
    }

    // Tall grass tufts front layer
    for (let i = 0; i < visibleSegments; i++) {
        const worldIndex = segmentOffset + i + 8000;
        if (hash01(worldIndex * 3.31) < 0.14) {
            const segX = (i * FLOWER_SEGMENT_WIDTH) - (groundOffset % FLOWER_SEGMENT_WIDTH) + 6;
            const baseX = segX + hash01(worldIndex * 9.1) * (FLOWER_SEGMENT_WIDTH - 12);
            const bladeCount = 6 + Math.floor(hash01(worldIndex * 1.77) * 6);
            for (let b = 0; b < bladeCount; b++) {
                const off = (b - bladeCount / 2) * 2;
                const h = 18 + hash01(worldIndex * 2.93 + b) * 16;
                ctx.strokeStyle = b % 2 ? '#56bb44' : '#3d8a2f';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(baseX + off, topY + 12);
                ctx.quadraticCurveTo(baseX + off + 2, topY + 12 - h * 0.4, baseX + off + Math.sin(off) * 3, topY + 12 - h);
                ctx.stroke();
            }
        }
    }
    ctx.restore();
}

function drawBackground() {
    // Sky gradient
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const stops = SKY_GRADIENT_COLORS.length - 1;
    SKY_GRADIENT_COLORS.forEach((col, i) => g.addColorStop(i / stops, col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const horizonY = GROUND_Y + PLAYER_SIZE - 40; // baseline for farthest mountains

    // Multi-layer mountains
    MOUNTAIN_LAYERS.forEach((layer, li) => {
        const span = canvas.width / layer.spacing;
        const offset = (distance * layer.speed) % span;
        for (let i = -1; i < 6; i++) {
            const peakX = (i * span * 0.85) + (span - offset);
            const baseH = layer.height;
            const variance = (Math.sin((i + li * 10) * 13.37) + 1) * 0.5 * layer.variance;
            const peakY = horizonY - baseH + variance - li * 14;
            ctx.fillStyle = layer.color;
            ctx.beginPath();
            ctx.moveTo(peakX, peakY);
            ctx.lineTo(peakX - span * 0.55, horizonY);
            ctx.lineTo(peakX + span * 0.55, horizonY);
            ctx.closePath();
            ctx.fill();
        }
    });

    // Tall background trees (behind clouds but in front of mountains?) -> we draw before clouds so clouds drift over
    const treeBaseY = GROUND_Y + PLAYER_SIZE;
    const treeSpan = TREE_LAYER.spacing;
    const treeOffset = (distance * TREE_LAYER.speed) % treeSpan;
    for (let x = -treeSpan; x < canvas.width + treeSpan; x += treeSpan) {
        const baseX = x - treeOffset + treeSpan;
        const seed = Math.sin((baseX + distance) * 0.0021);
        const trunkH = 120 + (seed * 0.5 + 0.5) * 80; // 120-200
        const trunkW = 14 + (seed * 0.5 + 0.5) * 6;
        // Trunk
        ctx.fillStyle = TREE_LAYER.trunkColor;
        ctx.fillRect(baseX, treeBaseY - trunkH, trunkW, trunkH);
        // Layered canopies (3 tiers)
        const canopyLevels = 3;
        for (let c = 0; c < canopyLevels; c++) {
            const tierY = treeBaseY - trunkH + c * (trunkH / canopyLevels * 0.35);
            const tierW = trunkW * 3.2 + (canopyLevels - c) * 18;
            const leafColor = TREE_LAYER.leafColors[c % TREE_LAYER.leafColors.length];
            ctx.fillStyle = leafColor;
            ctx.beginPath();
            ctx.moveTo(baseX + trunkW / 2, tierY - 22);
            ctx.quadraticCurveTo(baseX - tierW / 2, tierY + 14, baseX + trunkW / 2, tierY + 10);
            ctx.quadraticCurveTo(baseX + trunkW + tierW / 2, tierY + 14, baseX + trunkW / 2, tierY - 22);
            ctx.closePath();
            ctx.fill();
        }
    }

    // Enlarged pixel clouds (already moved in init) -- draw after trees so clouds appear in front
    cloudLayers.forEach(layer => {
        for (let cl of layer) {
            cl.x -= cl.speed;
            if (cl.x + cl.pattern[0].length * cl.scale < 0) {
                cl.x = canvas.width + Math.random() * 200;
                cl.y = Math.random() * (GROUND_Y * 0.38);
            }
            // Shadow
            for (let row = 0; row < cl.pattern.length; row++) {
                for (let col = 0; col < cl.pattern[row].length; col++) {
                    if (cl.pattern[row][col] === '1') {
                        ctx.fillStyle = cl.cShadow;
                        ctx.fillRect(Math.round(cl.x + col * cl.scale + 1), Math.round(cl.y + row * cl.scale + 1), cl.scale, cl.scale);
                    }
                }
            }
            // Body
            for (let row = 0; row < cl.pattern.length; row++) {
                for (let col = 0; col < cl.pattern[row].length; col++) {
                    if (cl.pattern[row][col] === '1') {
                        ctx.fillStyle = cl.c;
                        ctx.fillRect(Math.round(cl.x + col * cl.scale), Math.round(cl.y + row * cl.scale), cl.scale, cl.scale);
                    }
                }
            }
        }
    });
}

function draw() {
    drawBackground();
    drawGround();
    drawPlayer();
    drawObstacles();
    drawItems();
    drawProjectiles();
    // Draw particles last (over ground, under UI) but before UI overlays
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
}

function gameLoop(ts) {
    if (gameState === 'playing') {
        updatePlayer();
        updateObstacles();
        updateItems();
        updateProjectiles();
        updateParticles();
        handleCollisions();
        if (obstacleSpawnBlockFrames > 0) obstacleSpawnBlockFrames--;
        distance += 1;
        if (distanceDiv) distanceDiv.textContent = distance;
        if (restGapDistance > 0) {
            // Reduce by world movement (speed) each frame
            restGapDistance -= getCurrentSpeed();
        } else if (ts - lastObstacleTime > 1200) {
            spawnObstacle();
            lastObstacleTime = ts;
        }
        if (ts - lastItemTime > 3000 && Math.random() < 0.5) { spawnItem(); lastItemTime = ts; }
        // Update buff indicator string
        if (buffIndicator) {
            let parts = [];
            if (player.buff === 'rocket') parts.push('🚀');
            if (player.shieldCharges > 0) parts.push('🛡️x' + player.shieldCharges);
            if (player.magnetTimer > 0) parts.push('🧲');
            if (player.slowTimer > 0) parts.push('⏳');
            if (player.landingProtectRemaining > 0) parts.push('🛬');
            if (player.glideRemaining > 0) parts.push('✈️');
            if (player.tankModeRemaining > 0) parts.push('🪖');
            buffIndicator.textContent = parts.join('  ');
        }
        updateBuffBars();
    }
    draw();
    if (gameState !== 'gameover') {
        loopStopped = false;
        animationId = requestAnimationFrame(gameLoop);
    } else {
        loopStopped = true;
    }
}

// Controls
window.addEventListener('keydown', e => {
    // Difficulty toggle key: KeyD cycles easy<->hard while not playing or when paused
    if (e.code === 'KeyD' && (gameState === 'menu' || gameState === 'paused' || gameState === 'gameover')) {
        difficulty = difficulty === 'hard' ? 'easy' : 'hard';
        updateDifficultyBadge();
        syncDifficultyButton();
    }
    if (gameState === 'menu' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame();
        // loop is already running from initial requestAnimationFrame
    }
    // Allow restart from gameover via Space / Enter
    if (gameState === 'gameover' && (e.code === 'Space' || e.code === 'Enter')) {
        startGame();
        if (loopStopped) animationId = requestAnimationFrame(gameLoop);
    }
    if (gameState === 'playing') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            if (!player.isJumping && !player.buff) {
                player.isJumping = true;
                // Apply reduced jump strength when slow active
                const jumpScale = player.slowTimer > 0 ? SLOW_JUMP_SCALE : 1;
                player.vy = JUMP_POWER * jumpScale;
            }
        }
        if (e.code === 'ArrowDown') {
            if (!player.isJumping && !player.buff) { player.isDucking = true; }
        }
        if (e.code === 'KeyF') {
            fireTankBullet();
        }
        if (ENABLE_TANK_CANCEL_KEY && e.code === 'KeyX' && player.tankModeRemaining > 0) {
            player.tankModeRemaining = 0; // cancel tank
        }
    }
    if (e.code === 'KeyP') togglePause();
});
window.addEventListener('keyup', e => { if (e.code === 'ArrowDown') player.isDucking = false; });

startBtn && startBtn.addEventListener('click', () => { startGame(); });
restartBtn && restartBtn.addEventListener('click', () => { startGame(); if (loopStopped) animationId = requestAnimationFrame(gameLoop); });

// Temporary test button to force unlock tank mode (for debugging)
let testBtn = document.getElementById('testTankBtn');
if (!testBtn) {
    testBtn = document.createElement('button');
    testBtn.id = 'testTankBtn';
    testBtn.textContent = 'TEST TANK';
    Object.assign(testBtn.style, {
        position: 'fixed',
        padding: '6px 12px',
        background: '#444',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        border: '1px solid #888',
        borderRadius: '4px',
        zIndex: 60,
        cursor: 'pointer'
    });
    testBtn.style.top = UI_POS.testTank.top + 'px';
    testBtn.style.right = UI_POS.testTank.right + 'px';
    document.body.appendChild(testBtn);
}
function updateTestButtonVisibility() {
    if (!testBtn) return;
    if (HIDE_TEST_BUTTON_DURING_PLAY && gameState === 'playing') {
        testBtn.style.display = 'none';
    } else {
        testBtn.style.display = 'block';
    }
}
function setTestButtonLabel() {
    if (!testBtn) return;
    testBtn.textContent = (player.tankModeRemaining > 0) ? 'TẮT TANK' : 'BẬT TANK';
}
setTestButtonLabel();
testBtn.addEventListener('click', () => {
    if (player.tankModeRemaining > 0) {
        // turn off
        player.tankModeRemaining = 0;
    } else {
        player.tankUnlocked = true;
        player.tankModeRemaining = TANK_MODE_DURATION;
    }
    setTestButtonLabel();
});

// Ensure initial sync for difficulty button
syncDifficultyButton();

resetGame();
draw();
animationId = requestAnimationFrame(gameLoop);
/*
======================== CUSTOMIZATION GUIDE ========================
Flowers / Grass:
  - FLOWER_DENSITY: tăng/giảm mật độ cụm hoa chính.
  - EXTRA_FILL_FLOWER_DENSITY: hoa lẻ xen kẽ giữa khoảng trống.
  - FLOWER_CLUSTER_MAX: số hoa tối đa trong một cụm.
  - SECOND_ROW_FLOWER_CHANCE: tỷ lệ có hàng hoa phía sau (tạo chiều sâu).
  - GRASS_DYNAMIC_FILL = true để bãi cỏ tự kéo xuống hết phần dưới canvas.
Mountains:
  - MOUNTAIN_LAYERS: thêm/bớt layer, chỉnh speed (parallax), height, variance.
Trees:
  - TREE_LAYER.spacing thay đổi khoảng cách; speed nhỏ hơn để cây xa hơn.
Clouds:
  - CLOUD_SCALE_MIN/MAX để phóng to/thu nhỏ mây pixel.
Difficulty:
  - DIFFICULTY_SPEED_MULTIPLIERS sửa multiplier cho easy/hard.
Ground Colors:
  - GRASS_GRADIENT_COLORS (mảng từ trên xuống dưới), GRASS_TOP_HIGHLIGHT để thay highlight.
====================================================================
*/
