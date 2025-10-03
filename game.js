// Square Dino Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const distanceDiv = document.getElementById('distance');
// New HUD elements (may be null if not in DOM yet)
const bestScoreSpan = document.getElementById('bestScore');
const finalDistanceSpan = document.getElementById('finalDistance');

// Image assets - khủng long thường
const dinoImage = new Image();
dinoImage.src = "pixel png/dino.png";

// Tải hình ảnh khủng long đặc biệt theo loại buff
const dinoImages = {
    normal: new Image(),
    alt: new Image(),
    rocket: new Image(),
    shield: new Image(),
    magnet: new Image(), 
    slow: new Image(),
    glide: new Image(),
    tank: new Image()
};

// Gán nguồn hình ảnh cho từng loại khủng long
dinoImages.normal.src = "pixel png/dino.png";
dinoImages.alt.src = "pixel png/dino2.png";
dinoImages.rocket.src = "pixel png/dinorocket.png";
dinoImages.shield.src = "pixel png/dinoshield.png";
dinoImages.magnet.src = "pixel png/dinomagnet.png";
dinoImages.slow.src = "pixel png/dinoslow.png";
dinoImages.glide.src = "pixel png/dinoglide.png";
dinoImages.tank.src = "pixel png/dinotank.png";

// GIF lửa rocket dưới dạng DOM overlay để giữ animation
let rocketGifEl = null;
function ensureRocketGifOverlay(){
    if (rocketGifEl) return rocketGifEl;
    rocketGifEl = document.createElement('img');
    rocketGifEl.src = 'pixel png/rocket.gif';
    rocketGifEl.alt = 'rocket flame';
    Object.assign(rocketGifEl.style, {
        position: 'absolute',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        zIndex: '5', // trên canvas, dưới HUD (HUD ~60)
        display: 'none'
    });
    document.body.appendChild(rocketGifEl);
    return rocketGifEl;
}
function showRocketGifAt(x, y, w, h){
    const el = ensureRocketGifOverlay();
    const rect = canvas.getBoundingClientRect();
    el.style.left = Math.round(rect.left + x) + 'px';
    el.style.top  = Math.round(rect.top + y) + 'px';
    el.style.width  = Math.max(1, Math.round(w)) + 'px';
    el.style.height = Math.max(1, Math.round(h)) + 'px';
    el.style.display = 'block';
}
function hideRocketGif(){ if (rocketGifEl) rocketGifEl.style.display = 'none'; }

// Tải hình ảnh các vật phẩm
const itemImages = {
    rocket: new Image(),
    shield: new Image(),
    magnet: new Image(),
    slow: new Image(),
    glide: new Image()
};
itemImages.rocket.src = "pixel png/rocket.png";
itemImages.shield.src = "pixel png/shield.png";
itemImages.magnet.src = "pixel png/magnet.png";
itemImages.slow.src = "pixel png/slow.png";
itemImages.glide.src = "pixel png/glide.png";

// Tải hình ảnh các chướng ngại vật
const obstacleImages = {
    square: new Image(),
    diamond: new Image(),
    gate: new Image()
};
obstacleImages.square.src = "pixel png/cactus.png";
obstacleImages.diamond.src = "pixel png/trap.png";
obstacleImages.gate.src = "pixel png/gate.png";

// Kích thước khủng long - có thể điều chỉnh để phù hợp hơn
const DINO_SIZE_MULTIPLIER = 2.0; // Tăng hệ số phóng to hình khủng long
// Tùy chỉnh hiệu ứng rocket gif
const ROCKET_GIF_SCALE = 0.9;      // kích thước theo bề rộng dino
const ROCKET_GIF_OFFSET_X = 0.05;  // lệch phải so với centerX theo bề rộng dino
const ROCKET_GIF_OVERLAP = 0.6;    // phần trăm chiều cao gif bị dino đè lên (0..1)
const menuBox = document.getElementById('menuBox');
const gameOverBox = document.getElementById('gameOverBox');
const pauseBox = document.getElementById('pauseBox');
const startBtn = document.getElementById('startBtn');
const helpBtn = document.getElementById('helpBtn');
const restartBtn = document.getElementById('restartBtn');
const buffIndicator = document.getElementById('buffIndicator');
const centerOverlay = document.getElementById('centerOverlay');
let bossHelpBox = null;

// Xóa toàn bộ hiệu ứng hỗ trợ để trận boss công bằng (không còn shield/magnet/slow/glide)
function clearSupportEffectsForBoss(){
    player.shieldCharges = 0;
    player.magnetTimer = 0;
    player.slowTimer = 0;
    player.landingProtectRemaining = 0;
    player.glideRemaining = 0;
    player.activeBuffs = [];
    updateBuffIndicator();
}

function showBossHelp() {
    try {
        if (!centerOverlay) return;
        if (!bossHelpBox) {
            bossHelpBox = document.createElement('div');
            bossHelpBox.id = 'bossHelpBox';
            bossHelpBox.className = 'overlay-box';
            bossHelpBox.style.maxWidth = '520px';
            bossHelpBox.innerHTML = `
                <h2 style="margin-top:0;margin-bottom:10px;">HƯỚNG DẪN BOSS GATE</h2>
                <div style="font-size:14px;line-height:1.5">
                    <ul style="margin:0 0 10px 18px;padding:0;">
                        <li>F: Bắn đạn (tối đa 5 viên, nạp +1 viên mỗi 2s)</li>
                        <li>Đạn của bạn có thể chặn đạn và Ground Wave của gate (viên đạn đó sẽ không gây sát thương boss)</li>
                        <li>Tránh: đạn cao/thấp, Ground Wave dày; khi boss gần hết máu sẽ xả Burst nhanh</li>
                        <li>HP: Bạn 200 HP (−10 mỗi lần trúng); Boss có thanh máu phía trên</li>
                    </ul>
                    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
                        <button class="game-btn" id="bossHelpCloseBtn">BẮT ĐẦU</button>
                    </div>
                </div>`;
            centerOverlay.appendChild(bossHelpBox);
            const closeBtn = bossHelpBox.querySelector('#bossHelpCloseBtn');
            if (closeBtn) closeBtn.addEventListener('click', hideBossHelp);
        } else {
            bossHelpBox.classList.remove('hidden');
        }
        // Auto dismiss sau 5s nếu người chơi không bấm
        setTimeout(() => { if (bossHelpBox && !bossHelpBox.classList.contains('hidden')) hideBossHelp(); }, 5000);
    } catch {}
}

function hideBossHelp(){
    if (bossHelpBox) bossHelpBox.classList.add('hidden');
}
let leftInfo = document.getElementById('leftInfo');
// Create a dedicated ammo display span to avoid replacing existing DOM (distance/buffIndicator)
let bossAmmoSpan = document.getElementById('bossAmmoSpan');
if (!bossAmmoSpan && leftInfo) {
    bossAmmoSpan = document.createElement('span');
    bossAmmoSpan.id = 'bossAmmoSpan';
    bossAmmoSpan.style.marginLeft = '10px';
    bossAmmoSpan.style.whiteSpace = 'nowrap';
    leftInfo.appendChild(bossAmmoSpan);
}
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

// Boss constants
const BOSS_GATE_SIZE = 150; // Kích thước cổng boss (tăng từ 100 lên 150)
// Vị trí cổng boss (có thể tinh chỉnh nhanh)
const BOSS_GATE_Y_OFFSET = 56; // + xuống dưới (px) — hạ thấp gate hơn nữa
const BOSS_FIGHT_TARGET_X_RATIO = 0.60; // vị trí mục tiêu bên phải màn hình (0.60 thay vì 0.70 cho cảm giác lệch trái hơn)
const BOSS_SPAWN_X_OFFSET = 120; // spawn gần hơn (so với +200)

// Boss attack configs
const BOSS_ATTACK_COOLDOWN_MIN = 90;   // ~1.5s ở 60fps
const BOSS_ATTACK_COOLDOWN_MAX = 150;  // ~2.5s
const BOSS_BULLET_SPEED = 8;
const BOSS_WAVE_SPEED = 8;
const BOSS_ENRAGE_RATIO = 0.35;        // <35% HP thì enrage
const BOSS_BURST_LOW_HP = 20;          // Khi máu <= 20 sẽ xả luồng đạn nhanh
// Boss ammo system for player shots
const BOSS_AMMO_MAX = 5;               // 5 lượt bắn
const BOSS_AMMO_RECHARGE_FRAMES = 120; // Mỗi 2 giây nạp 1 viên (60fps)
const BOSS_PLAYER_FIRE_CD_FRAMES = 14; // Hạn chế bắn liên tiếp
const BOSS_PRESSURE_CD_SCALE = 0.5;    // Trong lúc reload, boss bắn dồn dập hơn (giảm cooldown 50%)
const BOSS_PRESSURE_BULLET_SCALE = 1.15; // Trong lúc reload, đạn boss nhanh hơn 15%

const BOSS_MAX_HEALTH = 250; // Tăng máu tối đa của boss (từ 100 lên 250)
const BOSS_HEALTH_BAR_WIDTH = 300; // Tăng chiều rộng thanh máu (từ 200 lên 300)
const BOSS_HEALTH_BAR_HEIGHT = 25; // Tăng chiều cao thanh máu (từ 20 lên 25)
// Dino health in boss fight
const DINO_MAX_HEALTH = 200;
const DINO_DAMAGE_PER_HIT = 10;
const DINO_HEALTH_BAR_WIDTH = 220;
const DINO_HEALTH_BAR_HEIGHT = 16;
const BOSS_BATTLE_DISTANCE = 200; // Khoảng cách trận đấu với boss
const BOSS_DAMAGE_PER_SHOT = 10; // Sát thương mỗi phát bắn
const BOSS_TANK_ACTIVATION_COUNT = 4; // Số lần kích hoạt tank để gặp boss
const MAX_OBSTACLES = 8; // số lượng chướng ngại vật tối đa trên màn hình
const MAX_ITEMS = 4; // giới hạn số lượng vật phẩm trên màn hình
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
// Helper function to convert hex color to RGB
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse components
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    
    return { r, g, b };
}

// Convert RGB to hex string
function rgbToHex(r, g, b) {
    const toHex = v => {
        const s = Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
        return s;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Mix two colors (hex) by t in [0,1]
function mixHex(aHex, bHex, t) {
    const a = hexToRgb(aHex), b = hexToRgb(bHex);
    const r = a.r + (b.r - a.r) * t;
    const g = a.g + (b.g - a.g) * t;
    const bl = a.b + (b.b - a.b) * t;
    return rgbToHex(r, g, bl);
}

// Shade a color by mixing with white (t>0) or black (t<0)
function shadeHex(hex, t) {
    if (t === 0) return hex;
    return t > 0 ? mixHex(hex, '#ffffff', Math.min(1, t)) : mixHex(hex, '#000000', Math.min(1, -t));
}

// Convert a hex color to grayscale hex
function toGrayHex(hex) {
    const { r, g, b } = hexToRgb(hex);
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    return rgbToHex(gray, gray, gray);
}

// Get display color respecting grayscale mode
function displayHex(hex) {
    return window.gameUsesColor ? hex : toGrayHex(hex);
}

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

// Pixel-art rendering controls for background shapes
const BG_PIXEL = 2; // size of block for mountains/trees to keep pixel vibe

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

// Chế độ màu (grayscale ban đầu, sau khi hạ boss sẽ đổi thành màu)
window.gameUsesColor = false; // false = grayscale, true = color

const SHIELD_HIT_MIN = 1;
const SHIELD_HIT_MAX = 2;
const MAGNET_DURATION = 400; // frames ~ depends on speed (approx distance 20m user spec)
const MAGNET_RADIUS = 260; // pixels radius for attraction
const SLOW_DURATION = 240; // frames (~4s at 60fps)
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
const TANK_MODE_DURATION = PLAYER_SIZE * 40; // distance of harder wave mode (giảm 10 lần: từ 400 xuống 40)
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
    itemsCollected: 0, // track total items collected for tank mode
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
    fireCooldown: 0, // for tank bullets
    bossBulletCooldown: 0, // cooldown giữa các phát bắn boss
    bossAmmo: BOSS_AMMO_MAX, // số lượt bắn còn lại trong trận boss
    bossAmmoRecharge: 0, // đồng hồ nạp 1 viên
    activeBuffs: [], // Mảng theo dõi thứ tự nhặt vật phẩm
    useAltDino: false, // Sau khi hạ boss và va chạm gate -> dino2
    noItemUntilTs: 0, // ms timestamp: không spawn item cho tới thời điểm này
    
    // Boss battle properties
    tankActivationCount: 0, // Số lần đã kích hoạt chế độ tank
    isBossBattle: false, // Đang trong trận đấu với boss
    bossDistance: 0, // Khoảng cách đã đi trong trận đấu boss
    health: DINO_MAX_HEALTH, // máu dino (chỉ hiển thị trong boss battle)
    isDead: false,
};
let obstacles = [];
let items = [];
let particles = []; // dust particles
let projectiles = []; // tank bullets
// Boss attacks containers
let bossShots = [];  // {x,y,vx,vy,r,ttl,tele}
let bossWaves = [];  // {x,y,w,h,vx,ttl,tele}
let distance = 0;
let lastObstacleTime = 0;
let lastItemTime = 0;
let lastBossDefeatTime = 0;
let animationId;
let boss = null; // Boss object
let bossHealthBar = {
    current: BOSS_MAX_HEALTH,
    max: BOSS_MAX_HEALTH,
    isVisible: false,
    flashTimer: 0
};
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

// Help button on menu opens the instruction overlay
if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        // Hiển thị hướng dẫn tổng quan (dùng cùng overlay với boss để tái sử dụng)
        showBossHelp();
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
    player.bossBulletCooldown = 0; // Thời gian hồi chiêu đạn bắn boss
    player.bossAmmo = BOSS_AMMO_MAX;
    player.bossAmmoRecharge = 0;
    player.activeBuffs = []; // Reset danh sách hiệu ứng
    // Reset boss battle properties
    player.tankActivationCount = 0;
    player.isBossBattle = false;
    player.bossDistance = 0;
    boss = null;
    bossHealthBar.current = BOSS_MAX_HEALTH;
    bossHealthBar.isVisible = false;
    bossHealthBar.flashTimer = 0;
    // Reset unique collection (tank only once per run, but we allow re-collect logic fresh on restart)
    player.collectedUnique.rocket = false;
    player.collectedUnique.glide = false;
    player.collectedUnique.shield = false;
    player.collectedUnique.magnet = false;
    player.collectedUnique.slow = false;
    player.tankUnlocked = false;
    player.itemsCollected = 0;  // Counter for any items collected
    player.fireCooldown = 0;
    obstacles = [];
    items = [];
    particles = [];
    distance = 0;
    lastObstacleTime = 0;
    lastItemTime = 0;
    lastBossDefeatTime = 0;
    player.useAltDino = false;
    player.noItemUntilTs = 0;
    hideRocketGif();
    player.health = DINO_MAX_HEALTH;
    player.isDead = false;
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
    
    // Reset mảng hiệu ứng
    player.activeBuffs = [];
}

// Hàm quản lý hiệu ứng vật phẩm, giới hạn 3 hiệu ứng cùng lúc
function managePlayerBuffs(newBuff) {
    // Kiểm tra xem hiệu ứng này đã có trong danh sách chưa
    const existingIndex = player.activeBuffs.indexOf(newBuff);
    if (existingIndex >= 0) {
        // Nếu đã có, xóa hiệu ứng cũ và thêm mới vào cuối (reset thứ tự)
        player.activeBuffs.splice(existingIndex, 1);
    }
    
    // Thêm hiệu ứng mới vào danh sách
    player.activeBuffs.push(newBuff);
    
    // Nếu có quá 3 hiệu ứng, xóa hiệu ứng cũ nhất
    if (player.activeBuffs.length > 3) {
        const oldestBuff = player.activeBuffs.shift(); // Lấy và xóa hiệu ứng cũ nhất
        
        console.log("Đã đạt giới hạn 3 hiệu ứng. Xóa hiệu ứng cũ: " + oldestBuff);
        
        // Xóa hiệu ứng cũ
        if (oldestBuff === 'rocket') {
            // Rocket là hiệu ứng đặc biệt, xử lý riêng
            player.buff = null;
            player.buffTimer = 0;
        } else if (oldestBuff === 'glide') {
            player.glideRemaining = 0;
        } else if (oldestBuff === 'magnet') {
            player.magnetTimer = 0;
        } else if (oldestBuff === 'slow') {
            player.slowTimer = 0;
        } else if (oldestBuff === 'shield') {
            player.shieldCharges = 0;
        }
    }
    
    // Cập nhật hiển thị
    updateBuffIndicator();
}

// Hàm cập nhật hiển thị hiệu ứng
function updateBuffIndicator() {
    if (!buffIndicator) return;
    
    let parts = [];
    if (player.buff === 'rocket') parts.push('🚀');
    if (player.shieldCharges > 0) parts.push('🛡️x' + player.shieldCharges);
    if (player.magnetTimer > 0) parts.push('🧲');
    if (player.slowTimer > 0) parts.push('⏳');
    if (player.landingProtectRemaining > 0) parts.push('🛬');
    if (player.glideRemaining > 0) parts.push('✈️');
    if (player.tankModeRemaining > 0) parts.push('🪖');
    
    buffIndicator.textContent = parts.join(' ');
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
    // Block obstacle spawning during protected landing window or if too many obstacles
    if (obstacleSpawnBlockFrames > 0 || obstacles.length >= MAX_OBSTACLES) return;

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
    // Thêm một khoảng cách thêm để chướng ngại vật xuất hiện từ xa hơn bên phải
    const EXTRA_SPAWN_DISTANCE = canvas.width * 0.4; // 40% chiều rộng màn hình thêm
    
    // Đảm bảo chướng ngại vật luôn xuất hiện từ ngoài màn hình
    let lastX = canvas.width + EXTRA_SPAWN_DISTANCE;
    
    // Nếu có chướng ngại vật khác, đặt xa hơn chướng ngại vật cuối cùng
    if (obstacles.length > 0) {
        // Lấy chướng ngại vật xa nhất bên phải
        let farthestX = 0;
        for (const obs of obstacles) {
            if (obs.x > farthestX) farthestX = obs.x;
        }
        lastX = Math.max(farthestX, lastX);
    }

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
    
    // Chỉ chọn giữa square, diamond, và falling triangle
    if (typeRand < 0.33) {
        shape = 'square';
        // Đảm bảo shape cố định cho cactus
        const fixedShape = 'square';
    } 
    else if (typeRand < 0.66) {
        shape = 'diamond';
        // Đảm bảo shape cố định cho trap
        const fixedShape = 'diamond';
    }
    else {
        shape = 'falling_triangle'; // Chướng ngại vật tam giác rơi
    }

    // Compute Y placement (different for falling triangle)
    let oy;
    let ow = OBSTACLE_SIZE;
    let oh = OBSTACLE_SIZE;
    
    if (shape === 'falling_triangle') {
        // Falling triangle starts above the ground
        oy = GROUND_Y - OBSTACLE_SIZE * 2; // Bắt đầu từ trên cao
        // Thêm thông tin quỹ đạo cho tam giác rơi
        const trajectoryHeight = Math.random() * 150 + 100; // Độ cao quỹ đạo
        const targetX = player.x; // Mục tiêu là vị trí hiện tại của người chơi
        
        // Thêm thông tin vận tốc và trọng lực cho quỹ đạo parabol
        obstacles.push({ 
            x: newX, 
            y: oy, 
            shape, 
            isOverhead: false, 
            color: OB_PALETTE[Math.floor(Math.random() * OB_PALETTE.length)],
            w: ow, 
            h: oh,
            // Thông tin quỹ đạo
            initialY: oy,
            trajectoryHeight: trajectoryHeight,
            targetX: targetX,
            vx: -5, // Vận tốc ngang
            vy: -2, // Vận tốc ban đầu theo chiều dọc
            gravity: 0.15 // Lực hấp dẫn
        });
        
        // Return để tránh push lại một lần nữa ở cuối hàm
        return;
    } else {
        // Square và Diamond luôn ở mặt đất
        oy = GROUND_Y;
    }
    // Assign a random color from palette for more vibrant look (single push)
    const color = OB_PALETTE[Math.floor(Math.random() * OB_PALETTE.length)];
    // Xóa isOverhead vì không còn dùng nữa, và nó có thể gây nhầm lẫn
    obstacles.push({ x: newX, y: oy, shape, color, w: ow, h: oh, type: shape });
    // Không tạo ra chướng ngại vật mini square nữa

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
    // base spawn X, cũng thêm khoảng cách như chướng ngại vật
    const EXTRA_SPAWN_DISTANCE = canvas.width * 0.4; // 40% chiều rộng màn hình thêm
    let spawnX = canvas.width + EXTRA_SPAWN_DISTANCE;
    function nearestObstacleDistance(x) {
        let minD = Infinity;
        for (const o of obstacles) {
            const dx = Math.abs((o.x + OBSTACLE_SIZE / 2) - x);
            if (dx < minD) minD = dx;
        }
        return minD;
    }
    
    function isItemNearby(x) {
        // Kiểm tra có vật phẩm nào ở gần không
        for (const item of items) {
            const dx = Math.abs(item.x - x);
            if (dx < ITEM_SIZE * 4) return true;
        }
        return false;
    }
    
    // Đảm bảo vật phẩm xuất hiện ở vị trí an toàn
    let attempts = 0;
    const minSafeGap = ITEM_SAFE_OBS_GAP * 2; // Tăng khoảng cách an toàn
    
    // Đảm bảo xa chướng ngại vật và không trùng với vật phẩm khác
    while ((nearestObstacleDistance(spawnX) < minSafeGap || isItemNearby(spawnX)) && attempts < 10) {
        spawnX += ITEM_SAFE_OBS_GAP;
        attempts++;
    }
    
    // Nếu không tìm được vị trí tốt, di chuyển xa hơn
    if (attempts >= 10) {
        // Đưa vật phẩm ra xa phía trước, thay đổi độ cao
        spawnX += canvas.width * 0.2;
        items.push({ x: spawnX, y: GROUND_Y - 150, type, shape });
    } else {
        // Vị trí Y bình thường
        items.push({ x: spawnX, y: GROUND_Y - 110, type, shape });
    }
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
            player.isJumping = true; // enable fall physics
            // Activate landing protection distance
            player.landingProtectRemaining = ROCKET_LAND_PROTECT_DISTANCE;
            // Gradually reduce the obstacle spawn block for smoother transition
            obstacleSpawnBlockFrames = Math.min(obstacleSpawnBlockFrames, 30);
            // Do NOT change player.x so landing feels natural
            
            // Xóa rocket khỏi danh sách hiệu ứng đang hoạt động
            const rocketIndex = player.activeBuffs.indexOf('rocket');
            if (rocketIndex >= 0) {
                player.activeBuffs.splice(rocketIndex, 1);
            }
        }
        return;
    }
    // Decrement magnet timer
    if (player.magnetTimer > 0) {
        player.magnetTimer--;
        if (player.magnetTimer === 0) {
            // Xóa magnet khỏi danh sách hiệu ứng đang hoạt động
            const magnetIndex = player.activeBuffs.indexOf('magnet');
            if (magnetIndex >= 0) {
                player.activeBuffs.splice(magnetIndex, 1);
            }
        }
    }
    if (player.slowTimer > 0) {
        player.slowTimer--;
        if (player.slowTimer === 0) {
            // Grant protection when slow ends
            player.landingProtectRemaining = Math.max(player.landingProtectRemaining, ROCKET_LAND_PROTECT_DISTANCE);
            
            // Xóa slow khỏi danh sách hiệu ứng đang hoạt động
            const slowIndex = player.activeBuffs.indexOf('slow');
            if (slowIndex >= 0) {
                player.activeBuffs.splice(slowIndex, 1);
            }
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
            
            // Xóa glide khỏi danh sách hiệu ứng đang hoạt động
            const glideIndex = player.activeBuffs.indexOf('glide');
            if (glideIndex >= 0) {
                player.activeBuffs.splice(glideIndex, 1);
            }
        }
    }
    // Ẩn gif khi rocket không còn
    if (player.buff !== 'rocket') hideRocketGif();
    // Xử lý khoảng cách đến boss battle
    if (player.bossDistance > 0 && player.tankActivationCount >= BOSS_TANK_ACTIVATION_COUNT && !player.isBossBattle) {
        player.bossDistance -= getCurrentSpeed();
        
        if (player.bossDistance <= 0) {
            // Kích hoạt boss battle
            player.isBossBattle = true;
            // Xóa toàn bộ chướng ngại vật và vật phẩm còn trên màn hình
            obstacles = [];
            items = [];
            // Xóa hiệu ứng hỗ trợ để tránh miễn sát thương không mong muốn trong boss
            clearSupportEffectsForBoss();
            // Đảm bảo hiển thị dinotank trong trận boss
            player.tankUnlocked = true;
            if (typeof TANK_MODE_DURATION !== 'undefined') {
                player.tankModeRemaining = Math.max(player.tankModeRemaining || 0, TANK_MODE_DURATION);
            }
            createBoss();
            
            // Hiển thị thông báo boss xuất hiện
            player.bossAmmo = BOSS_AMMO_MAX;
            player.bossAmmoRecharge = 0;
            player.health = DINO_MAX_HEALTH;
            player.isDead = false;
            const notification = document.createElement('div');
            notification.textContent = 'BOSS XUẤT HIỆN! Bấm F để bắn!';
            notification.style.position = 'fixed';
            notification.style.top = '40%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '1000';
            notification.style.fontWeight = 'bold';
            notification.style.fontSize = '24px';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);

            // Hiển thị bảng hướng dẫn boss
            showBossHelp();
        }
    }
    
    // Giảm thời gian hồi chiêu đạn bắn boss
    if (player.bossBulletCooldown > 0) {
        player.bossBulletCooldown--;
    }

    // Quản lý thanh năng lượng bắn boss (ammo): mỗi 2s nạp 1 viên cho tới khi đầy
    if (player.isBossBattle && boss && !boss.isDefeated) {
        if (player.bossAmmo < BOSS_AMMO_MAX) {
            if (player.bossAmmoRecharge <= 0) {
                player.bossAmmoRecharge = BOSS_AMMO_RECHARGE_FRAMES;
            } else {
                player.bossAmmoRecharge--;
                if (player.bossAmmoRecharge <= 0) {
                    player.bossAmmo = Math.min(BOSS_AMMO_MAX, player.bossAmmo + 1);
                    // Nếu chưa đầy, tự động bắt đầu nạp viên kế tiếp ở frame tiếp theo
                }
            }
        }
    } else {
        // Không trong boss battle: reset về trạng thái mặc định
        player.bossAmmoRecharge = 0;
        player.bossAmmo = BOSS_AMMO_MAX;
    }
    
    // Giảm thời gian hồi đạn tank
    if (player.fireCooldown > 0) {
        player.fireCooldown--;
    }
    
    if (player.tankModeRemaining > 0) {
        // Trong màn đánh boss: không trừ thời gian tank (đóng băng thanh thời gian)
        // Chỉ trừ khi KHÔNG ở trong boss battle đang còn HP
        if (!(player.isBossBattle && boss && !boss.isDefeated)) {
            player.tankModeRemaining -= getCurrentSpeed();
        }
        if (player.tankModeRemaining <= 0 && !player.isBossBattle) {
            player.tankModeRemaining = 0;
            player.tankUnlocked = false; // Reset trạng thái để có thể kích hoạt lại
            
            // Tạo hiệu ứng thông báo khi chế độ tank kết thúc
            const notification = document.createElement('div');
            notification.textContent = 'Thu thập thêm 5 vật phẩm để kích hoạt lại chế độ tank!';
            notification.style.position = 'fixed';
            notification.style.top = '50%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.background = 'rgba(0, 0, 0, 0.7)';
            notification.style.color = '#fff';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.fontFamily = 'Arial, sans-serif';
            notification.style.fontSize = '16px';
            notification.style.zIndex = '100';
            document.body.appendChild(notification);
            
            // Xóa thông báo sau 2 giây
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 2000);
        }
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
        // Xử lý chướng ngại vật tam giác rơi theo quỹ đạo parabol
        if (obs.shape === 'falling_triangle') {
            // Cập nhật vị trí theo quỹ đạo parabol
            obs.x -= getCurrentSpeed() + obs.vx; // Di chuyển nhanh hơn các chướng ngại vật khác
            obs.vy += obs.gravity; // Tăng vận tốc rơi theo trọng lực
            obs.y += obs.vy;       // Cập nhật vị trí theo chiều dọc
            
            // Nếu chạm đất thì tạo hiệu ứng nổ nhỏ và xóa chướng ngại vật
            if (obs.y > GROUND_Y) {
                spawnExplosion(obs.x + OBSTACLE_SIZE/2, GROUND_Y, true);
                obstacles.splice(obstacles.indexOf(obs), 1);
            }
        } else {
            // Các chướng ngại vật khác di chuyển bình thường
            obs.x -= getCurrentSpeed();
        }
    }
    
    // Xóa chướng ngại vật nằm ngoài màn hình hoặc quá nhiều
    const remaining = [];
    for (let obs of obstacles) {
        // Chỉ giữ lại chướng ngại vật trong tầm nhìn và không quá xa bên phải
        if (obs.x + OBSTACLE_SIZE > -100 && obs.x < canvas.width * 1.5) {
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

// Hàm quản lý hiệu ứng vật phẩm, giới hạn 3 hiệu ứng cùng lúc
function manageBuffs(buffType) {
    // Kiểm tra xem hiệu ứng này đã có trong danh sách chưa
    const existingIndex = player.activeBuffs.findIndex(item => item === buffType);
    
    if (existingIndex >= 0) {
        // Nếu hiệu ứng đã tồn tại, xóa để cập nhật vị trí mới
        player.activeBuffs.splice(existingIndex, 1);
    }
    
    // Thêm hiệu ứng mới vào cuối danh sách (hiệu ứng mới nhất)
    player.activeBuffs.push(buffType);
    
    // Nếu có quá 3 hiệu ứng, xóa hiệu ứng cũ nhất
    if (player.activeBuffs.length > 3) {
        // Xác định hiệu ứng cũ nhất cần xóa
        const oldestBuff = player.activeBuffs.shift();
        console.log("Đã đạt giới hạn 3 hiệu ứng. Xóa hiệu ứng cũ: " + oldestBuff);
        
        // Xóa hiệu ứng cũ
        removeBuffEffect(oldestBuff);
    }
}

// Hàm xóa hiệu ứng
function removeBuffEffect(buffType) {
    if (buffType === 'rocket') {
        player.buff = null;
        player.buffTimer = 0;
    } else if (buffType === 'glide') {
        player.glideRemaining = 0;
    } else if (buffType === 'shield') {
        player.shieldCharges = 0;
    } else if (buffType === 'magnet') {
        player.magnetTimer = 0;
    } else if (buffType === 'slow') {
        player.slowTimer = 0;
    }
}

// Lấy hiệu ứng còn hoạt động mới nhất dựa trên player.activeBuffs (ưu tiên mục vừa nhặt)
function getLatestActiveBuff() {
    if (!Array.isArray(player.activeBuffs) || player.activeBuffs.length === 0) return null;
    for (let i = player.activeBuffs.length - 1; i >= 0; i--) {
        const b = player.activeBuffs[i];
        if (b === 'rocket' && player.buff === 'rocket' && player.buffTimer > 0) return 'rocket';
        if (b === 'glide' && player.glideRemaining > 0) return 'glide';
        if (b === 'shield' && player.shieldCharges > 0) return 'shield';
        if (b === 'magnet' && player.magnetTimer > 0) return 'magnet';
        if (b === 'slow' && player.slowTimer > 0) return 'slow';
    }
    return null;
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
        
        if (obs.shape === 'falling_triangle') {
            // Tam giác rơi: nếu người chơi cúi xuống, không va chạm
            if (!player.isDucking && checkCollision(player, obs, PLAYER_SIZE, PLAYER_SIZE, OBSTACLE_SIZE, OBSTACLE_SIZE)) {
                collided = true;
            }
        } else if (obs.shape === 'square') {
            // Xương rồng (cactus)
            if (checkCollision(player, obs, PLAYER_SIZE, PLAYER_SIZE, OBSTACLE_SIZE, OBSTACLE_SIZE)) {
                collided = true;
            }
        } else if (obs.shape === 'diamond') {
            // Bẫy (trap)
            if (checkCollision(player, obs, PLAYER_SIZE, PLAYER_SIZE, OBSTACLE_SIZE, OBSTACLE_SIZE)) {
                collided = true;
            }
        }
        
        if (collided) {
            // Tank crush: if in tank mode, destroy obstacle instead of taking damage
            if (player.tankModeRemaining > 0) {
                spawnExplosion(obs.x + OBSTACLE_SIZE / 2, obs.y + OBSTACLE_SIZE / 2, false);
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
            // Áp dụng hiệu ứng của vật phẩm
            if (items[i].type === 'rocket') {
                // Thêm vào hệ thống quản lý hiệu ứng
                manageBuffs('rocket');
                
                // Áp dụng hiệu ứng
                player.buff = 'rocket';
                player.buffTimer = ROCKET_BUFF_DURATION;
                
                // Extend protection if not already set (avoid shrinking existing longer block)
                obstacleSpawnBlockFrames = Math.max(obstacleSpawnBlockFrames, ROCKET_BUFF_DURATION + 30);
            } else if (items[i].type === 'glide') {
                manageBuffs('glide');
                player.glideRemaining = GLIDE_DURATION_FRAMES;
            } else if (items[i].type === 'shield') {
                // Random 1-2 charges
                const charges = Math.floor(Math.random() * (SHIELD_HIT_MAX - SHIELD_HIT_MIN + 1)) + SHIELD_HIT_MIN;
                player.shieldCharges += charges;
                manageBuffs('shield');
            } else if (items[i].type === 'magnet') {
                manageBuffs('magnet');
                player.magnetTimer = MAGNET_DURATION;
            } else if (items[i].type === 'slow') {
                manageBuffs('slow');
                player.slowTimer = SLOW_DURATION;
            }
            // Mark unique collections (even if item effect already applied)
            if (items[i].type === 'rocket') player.collectedUnique.rocket = true;
            else if (items[i].type === 'glide') player.collectedUnique.glide = true;
            else if (items[i].type === 'shield') player.collectedUnique.shield = true;
            else if (items[i].type === 'magnet') player.collectedUnique.magnet = true;
            else if (items[i].type === 'slow') player.collectedUnique.slow = true;
            
            // Increment the total items counter
            player.itemsCollected++;
            
            // Check unlock condition - now any 5 items will do, có thể kích hoạt nhiều lần
            if (player.itemsCollected >= 5) {
                player.tankUnlocked = true;
                player.tankModeRemaining = TANK_MODE_DURATION;
                player.itemsCollected = 0; // Reset counter để có thể thu thập và kích hoạt lại
                player.tankActivationCount++; // Tăng số lần kích hoạt tank
                
                if (buffIndicator) buffIndicator.textContent = '🪖';
                
                // Nếu đủ số lần kích hoạt tank, kích hoạt boss battle sau khi đi được BOSS_BATTLE_DISTANCE
                if (player.tankActivationCount >= BOSS_TANK_ACTIVATION_COUNT) {
                    console.log("Sẵn sàng kích hoạt boss battle sau " + BOSS_BATTLE_DISTANCE + "m");
                    // Không đặt isBossBattle = true ngay, mà để player di chuyển thêm một đoạn
                    player.bossDistance = BOSS_BATTLE_DISTANCE;
                }
            }
            items.splice(i, 1);
        }
    }
}

function drawPlayer() {
    ctx.save();
    const frame = Math.floor(distance / 12) % 2;
    
    // Không vẽ xe tăng nữa, luôn sử dụng hình khủng long
    
    // Use dino image instead of rectangle
    let h = PLAYER_SIZE * DINO_SIZE_MULTIPLIER; // Sử dụng hằng số có thể điều chỉnh
    let y = player.y - h * 0.3; // Đưa khủng long lên cao hơn nhiều
    
    if (player.isDucking && !player.isJumping && player.buff !== 'rocket') {
        h = Math.floor(PLAYER_SIZE * 1.0); // Giữ kích thước phù hợp khi cúi
        y = player.y + PLAYER_SIZE - h;
    }
    
    // Giữ nguyên tỷ lệ gốc của hình ảnh, tính toán chiều rộng và chiều cao từ ảnh gốc
    let originalWidth, originalHeight;
    
    // Nếu hình ảnh đã tải xong, lấy kích thước gốc của hình
    if (dinoImage.complete) {
        originalWidth = dinoImage.naturalWidth;
        originalHeight = dinoImage.naturalHeight;
    } else {
        // Giá trị mặc định nếu hình chưa tải xong
        originalWidth = originalHeight = 1;
    }
    
    // Tính toán chiều rộng dựa trên tỷ lệ ảnh gốc, giữ đúng tỷ lệ
    let aspectRatio = originalWidth / originalHeight;
    let w = h * aspectRatio;
    
    // Căn giữa hình ảnh so với hitbox của người chơi
    let centerX = player.x + PLAYER_SIZE/2 - w/2;
    
    // Chọn hình ảnh dino dựa vào trạng thái hiện tại (theo key)
    let currentDinoKey = player.useAltDino ? 'alt' : 'normal';
    // Luôn ưu tiên hiển thị dinotank khi tank đang kích hoạt
    if (player.tankModeRemaining > 0) {
        currentDinoKey = 'tank';
    } else {
        // Lấy buff mới nhất còn hoạt động để quyết định ảnh dino
        const latest = getLatestActiveBuff();
        if (latest === 'rocket') currentDinoKey = 'rocket';
        else if (latest === 'glide') currentDinoKey = 'glide';
        else if (latest === 'slow') currentDinoKey = 'slow';
        else if (latest === 'magnet') currentDinoKey = 'magnet';
        else if (latest === 'shield') currentDinoKey = 'shield';
    }
    let currentDinoImage = dinoImages[currentDinoKey];
    
    // Draw the appropriate dino image with proper sizing
    if (currentDinoImage.complete) {
        // Lấy kích thước thật của hình ảnh
        originalWidth = currentDinoImage.naturalWidth;
        originalHeight = currentDinoImage.naturalHeight;
        aspectRatio = originalWidth / originalHeight;
        
        // Giữ nguyên tỷ lệ khi phóng to
        w = h * aspectRatio; 
        
        // Cập nhật vị trí để giữ hình ở giữa hitbox
        centerX = player.x + PLAYER_SIZE/2 - w/2;
        
        // Đảm bảo khủng long không quá bé so với hitbox
        if (w < PLAYER_SIZE * 1.2) {
            w = PLAYER_SIZE * 1.2;
            h = w / aspectRatio;
            centerX = player.x + PLAYER_SIZE/2 - w/2;
        }
        
        // Điều chỉnh vị trí Y dựa trên buff hiện tại
        if (player.buff === 'rocket') {
            y -= PLAYER_SIZE * 0.1; // Nâng cao hơn khi đang bay rocket
        } else if (player.glideRemaining > 0) {
            y -= PLAYER_SIZE * 0.05; // Nâng cao hơn một chút khi glide
        }
        
    // Vẽ hình ảnh khủng long tương ứng
    // Khi chưa hạ boss (nền #37474F), áp dụng filter âm bản cho các ảnh buff/tank
    const invertable = ['normal','rocket','glide','magnet','shield','slow','tank'];
    const needInvert = !window.gameUsesColor && invertable.includes(currentDinoKey);
    if (needInvert) ctx.filter = 'invert(1)';
    ctx.drawImage(currentDinoImage, centerX, y, w, h);
    if (needInvert) ctx.filter = 'none';
        
        // Debug hitbox nếu cần
        if (false) { // Chuyển thành true để hiển thị hitbox
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
        }
    } else {
        // Fallback nếu hình ảnh chưa tải xong
        ctx.fillStyle = player.buff === 'rocket' ? '#ffbb55' : '#0669d9';
        ctx.fillRect(player.x, y, PLAYER_SIZE, h);
    }
    
    // Outline for visibility - vẽ hitbox nhưng không vẽ đè lên khủng long
    if (false) { // Ẩn hitbox, bỏ "false" nếu muốn hiển thị
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    }
    // Hiệu ứng nhấp nháy khi shield bị hit
    if (player.shieldFlashTimer > 0) {
        // Tạo hiệu ứng nhấp nháy khi shield bị hit
        if (player.shieldFlashTimer % 6 < 3) {
            ctx.save();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4; // Đường viền dày hơn
            ctx.strokeRect(centerX - 4, y - 4, w + 8, h + 8); // Viền lớn hơn
            ctx.restore();
        }
    }
    // Thêm hiệu ứng đặc biệt cho rocket: dùng DOM overlay gif để giữ animation
    // Chỉ hiển thị nếu rocket là vật phẩm gần nhất & không ở chế độ tank
    const latestBuff = getLatestActiveBuff();
    if (latestBuff === 'rocket' && player.tankModeRemaining <= 0) {
        const gifW = Math.max(24, Math.floor(w * ROCKET_GIF_SCALE));
        const gifH = Math.floor(gifW * 0.9);
        const gifX = Math.floor(centerX + w * ROCKET_GIF_OFFSET_X);
        const gifY = Math.floor(y + h - Math.floor(gifH * ROCKET_GIF_OVERLAP));
        showRocketGifAt(gifX, gifY, gifW, gifH);
    } else {
        hideRocketGif();
    }
    ctx.restore();
}

function drawObstacles() {
    for (let obs of obstacles) {
        ctx.save();
        
        if (obs.shape === 'square') {
            // Vẽ xương rồng bằng hình ảnh thay vì hình vuông
            if (obstacleImages.square.complete) {
                // Tính toán kích thước để giữ tỷ lệ ảnh
                const imgRatio = obstacleImages.square.naturalWidth / obstacleImages.square.naturalHeight;
                const drawHeight = OBSTACLE_SIZE * 2.0; // Tăng kích thước lên để xương rồng to hơn
                const drawWidth = drawHeight * imgRatio; // Chiều rộng tính theo tỉ lệ ảnh
                
                // Vẽ hình ảnh xương rồng
                ctx.drawImage(
                    obstacleImages.square,
                    obs.x - drawWidth/4, // Điều chỉnh vị trí ngang để căn giữa với hitbox
                    GROUND_Y - drawHeight + OBSTACLE_SIZE * 2.0, // Đặt sát mặt đất hơn nữa (tăng hệ số từ 1.5 lên 2.0)
                    drawWidth,
                    drawHeight
                );
                
                // Debug hitbox nếu cần
                if (false) { // Đổi thành true nếu muốn hiển thị hitbox
                    ctx.strokeStyle = 'red';
                    ctx.strokeRect(obs.x, obs.y, OBSTACLE_SIZE, OBSTACLE_SIZE);
                }
            }
        } else if (obs.shape === 'falling_triangle') {
            // Vẽ tam giác rơi theo quỹ đạo
            ctx.fillStyle = '#4fb07a'; // Màu cho tam giác rơi
            ctx.beginPath();
            ctx.moveTo(obs.x + OBSTACLE_SIZE/2, obs.y);
            ctx.lineTo(obs.x + OBSTACLE_SIZE, obs.y + OBSTACLE_SIZE);
            ctx.lineTo(obs.x, obs.y + OBSTACLE_SIZE);
            ctx.closePath();
            ctx.fill();
        } else if (obs.shape === 'diamond') {
            // Vẽ bẫy bằng hình ảnh thay vì hình kim cương
            if (obstacleImages.diamond.complete) {
                // Tính toán kích thước để giữ tỷ lệ ảnh nhưng nhỏ hơn
                const imgRatio = obstacleImages.diamond.naturalWidth / obstacleImages.diamond.naturalHeight;
                const drawHeight = OBSTACLE_SIZE * 1.3; // Thu nhỏ lại so với trước đây (từ 2 xuống 1.3)
                const drawWidth = drawHeight * imgRatio;
                
                // Vẽ hình ảnh bẫy
                ctx.drawImage(
                    obstacleImages.diamond,
                    obs.x - drawWidth/3, // Điều chỉnh vị trí ngang để căn giữa với hitbox
                    GROUND_Y - drawHeight + OBSTACLE_SIZE * 2.0, // Đặt sát mặt đất hơn nữa (tăng hệ số từ 1.5 lên 2.0)
                    drawWidth,
                    drawHeight
                );
                
                // Debug hitbox nếu cần
                if (false) { // Đổi thành true nếu muốn hiển thị hitbox
                    ctx.strokeStyle = 'red';
                    ctx.strokeRect(obs.x, obs.y, OBSTACLE_SIZE, OBSTACLE_SIZE);
                }
            }
        }
        ctx.restore();
    }
}

function drawItems() {
    // Vẽ hiệu ứng magnet nếu đang active - chỉ vẽ vòng tròn phạm vi, không vẽ icon magnet đi theo khủng long
    if (player.magnetTimer > 0) {
        ctx.save();
        const centerX = player.x + PLAYER_SIZE / 2;
        const centerY = player.y + PLAYER_SIZE / 2;
        // Vẽ vòng tròn biểu thị phạm vi hút (không vẽ biểu tượng magnet.png)
        ctx.strokeStyle = 'rgba(241, 196, 15, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, MAGNET_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    for (let item of items) {
        ctx.save();
        
        // Lấy hình ảnh tương ứng với loại vật phẩm
        const itemImage = itemImages[item.type];
        
        if (itemImage && itemImage.complete) {
            // Vẽ hình ảnh thay vì hình học cơ bản
            const size = ITEM_SIZE * 1.8; // Phóng to nhiều hơn để dễ nhìn hơn
            // Vẽ hình ở giữa vị trí vật phẩm
            ctx.drawImage(
                itemImage, 
                item.x - size/2 + ITEM_SIZE/2, 
                item.y - size/2 + ITEM_SIZE/2, 
                size, 
                size
            );
        } else {
            // Fallback nếu hình ảnh chưa tải xong
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
        }
        
        ctx.restore();
    }
}

// Tank projectiles
function fireTankBullet() {
    if (player.tankModeRemaining <= 0) return;
    if (player.fireCooldown > 0) return;
    player.fireCooldown = TANK_FIRE_COOLDOWN;
    
    // Vị trí bắn đạn từ phía mõm khủng long (điều chỉnh vị trí để phù hợp với hình ảnh)
    const yMid = player.y + (PLAYER_SIZE * 0.5);
    projectiles.push({ 
        x: player.x + PLAYER_SIZE, 
        y: yMid - TANK_BULLET_SIZE / 2, 
        vx: TANK_BULLET_SPEED 
    });
}

function updateProjectiles() {
    if (projectiles.length === 0) return;
    const next = [];
    
    for (let p of projectiles) {
        // Cập nhật vị trí đạn
        p.x += p.vx;
        p.y += p.vy || 0;
        
        let hitSomething = false;

        // Cho phép đạn người chơi chặn đạn và ground wave của boss
        if ((bossShots.length > 0 || bossWaves.length > 0) && (boss && boss.state === 'fight')) {
            const bulletSize = p.size || TANK_BULLET_SIZE;
            const px = p.x;
            const py = p.y;
            // 1) Chặn đạn tròn của boss
            for (let j = bossShots.length - 1; j >= 0; j--) {
                const s = bossShots[j];
                const br = bulletSize * 0.5;
                // va chạm hình tròn- hình chữ nhật đơn giản: dùng circRectHit với đạn người chơi như hình tròn nhỏ
                if (circRectHit(s.x, s.y, s.r, px, py, bulletSize, bulletSize)) {
                    // nổ nhỏ và loại bỏ cả hai
                    spawnExplosion(px + bulletSize / 2, py + bulletSize / 2, true);
                    bossShots.splice(j, 1);
                    hitSomething = true; // đạn của người chơi bị tiêu hao, không bay tới boss nữa
                    break;
                }
            }
            // 2) Chặn ground wave
            if (!hitSomething) {
                for (let k = bossWaves.length - 1; k >= 0; k--) {
                    const w = bossWaves[k];
                    const wy = w.y - Math.floor(w.h / 2);
                    if (rectHit(px, py, bulletSize, bulletSize, w.x, wy, w.w, w.h)) {
                        spawnExplosion(px + bulletSize / 2, py + bulletSize / 2, true);
                        bossWaves.splice(k, 1); // hủy cả wave khi bị bắn trúng
                        hitSomething = true;
                        break;
                    }
                }
            }
        }
        
        // Xử lý va chạm với boss nếu là đạn bắn boss
        if (!hitSomething && p.isBossBullet && boss && !boss.isDefeated) {
            // Kiểm tra va chạm với boss
            if (p.x < boss.x + boss.width && p.x + (p.size || TANK_BULLET_SIZE) > boss.x && 
                p.y < boss.y + boss.height && p.y + (p.size || TANK_BULLET_SIZE) > boss.y) {
                // Gây sát thương cho boss
                damageBoss(p.damage || BOSS_DAMAGE_PER_SHOT);
                // Tạo hiệu ứng nổ tại vị trí va chạm
                spawnExplosion(p.x, p.y, false);
                hitSomething = true;
            }
        } else {
            // Kiểm tra va chạm với chướng ngại vật cho đạn tank thường
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const o = obstacles[i];
                const ow = o.isOverhead ? (o.w || OBSTACLE_SIZE) : (o.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                const oh = o.isOverhead ? (o.h || OVERHEAD_OBS_HEIGHT) : (o.mini ? Math.floor(OBSTACLE_SIZE * 0.6) : OBSTACLE_SIZE);
                if (p.x < o.x + ow && p.x + (p.size || TANK_BULLET_SIZE) > o.x && 
                    p.y < o.y + oh && p.y + (p.size || TANK_BULLET_SIZE) > o.y) {
                    spawnExplosion(o.x + ow / 2, o.y + oh / 2, o.mini);
                    obstacles.splice(i, 1); // phá hủy chướng ngại vật
                    hitSomething = true;
                    break;
                }
            }
        }
        
        // Kiểm tra nếu đạn vẫn nằm trong màn hình và chưa va chạm với vật thể nào
        if (!hitSomething && p.x < canvas.width + 200 && p.x > -50 && p.y > -50 && p.y < canvas.height + 50) {
            next.push(p);
        }
    }
    
    projectiles = next;
}

function drawProjectiles() {
    if (projectiles.length === 0) return;
    ctx.save();
    
    for (let p of projectiles) {
        const bulletSize = p.size || TANK_BULLET_SIZE;
        
        if (p.isBossBullet) {
            // Vẽ đạn bắn boss với hiệu ứng đặc biệt
            // Vẽ vòng sáng xung quanh đạn
            const glowSize = bulletSize * 1.5;
            const gradient = ctx.createRadialGradient(
                Math.round(p.x + bulletSize/2), Math.round(p.y + bulletSize/2), 0,
                Math.round(p.x + bulletSize/2), Math.round(p.y + bulletSize/2), glowSize
            );
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(Math.round(p.x + bulletSize/2), Math.round(p.y + bulletSize/2), glowSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ đạn chính
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(Math.round(p.x + bulletSize/2), Math.round(p.y + bulletSize/2), bulletSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ lõi đạn
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(Math.round(p.x + bulletSize/2), Math.round(p.y + bulletSize/2), bulletSize/4, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ đuôi đạn (theo hướng bay)
            const trailLength = bulletSize * 2;
            const angle = Math.atan2(p.vy || 0, p.vx);
            ctx.save();
            ctx.translate(Math.round(p.x + bulletSize/2), Math.round(p.y + bulletSize/2));
            ctx.rotate(angle + Math.PI); // Quay đối diện với hướng bay
            
            const trailGradient = ctx.createLinearGradient(0, 0, trailLength, 0);
            trailGradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)');
            trailGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.moveTo(0, -bulletSize/3);
            ctx.lineTo(trailLength, -bulletSize/6);
            ctx.lineTo(trailLength, bulletSize/6);
            ctx.lineTo(0, bulletSize/3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
        } else {
            // Vẽ đạn tank thông thường
            ctx.fillStyle = p.color || '#ffd447';
            ctx.fillRect(Math.round(p.x), Math.round(p.y), bulletSize, bulletSize);
            
            // Hiệu ứng đuôi đạn cho đạn tank thông thường
            ctx.fillStyle = '#ffef99'; // Màu vàng nhạt
            ctx.fillRect(Math.round(p.x - 6), Math.round(p.y + bulletSize / 3), 6, bulletSize / 3);
        }
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

// Hiệu ứng flash toàn màn hình khi boss bị đánh bại và biến mất
function showFullScreenFlash() {
    // Tạo một div che phủ toàn màn hình
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = '#ffffff';
    flash.style.zIndex = '10000';
    flash.style.pointerEvents = 'none'; // Không cản trở tương tác với game
    flash.style.opacity = '0.9';
    flash.style.transition = 'opacity 1s ease-out';
    
    // Thêm vào body
    document.body.appendChild(flash);
    
    // Hiệu ứng mờ dần trong 1 giây
    setTimeout(() => {
        flash.style.opacity = '0';
    }, 50);
    
    // Xóa element sau khi hiệu ứng hoàn tất
    setTimeout(() => {
        if (flash && flash.parentNode) {
            flash.parentNode.removeChild(flash);
        }
    }, 1000);
}

// Hiển thị GIF nổ (explode2.gif) tại vị trí canvas (x,y) trong thời gian ngắn
function showGifExplosionAt(x, y, size = 140, durationMs = 900) {
    try {
        const rect = canvas.getBoundingClientRect();
        const img = document.createElement('img');
        img.src = 'pixel png/explode2.gif';
        img.style.position = 'absolute';
        img.style.pointerEvents = 'none';
        img.style.zIndex = '10000';
        img.style.width = size + 'px';
        img.style.height = size + 'px';
        img.style.left = (rect.left + window.scrollX + x - size / 2) + 'px';
        img.style.top = (rect.top + window.scrollY + y - size / 2) + 'px';
        document.body.appendChild(img);
        setTimeout(() => {
            if (img && img.parentNode) img.parentNode.removeChild(img);
            
            // Sau khi hiệu ứng explode2.gif kết thúc, chuyển sang dino2.png và xóa các hiệu ứng hỗ trợ
            player.useAltDino = true;
            // Xóa tất cả các hiệu ứng hỗ trợ
            player.buff = null;
            player.buffTimer = 0;
            player.shieldCharges = 0;
            player.magnetTimer = 0;
            player.slowTimer = 0;
            player.glideRemaining = 0;
            player.activeBuffs = [];
            
            // Nếu đang trong boss battle, cập nhật UI
            if (buffIndicator) {
                buffIndicator.textContent = '';
            }
        }, durationMs);
    } catch (e) {
        // Fallback: nếu DOM không sẵn sàng, bỏ qua lỗi
        console.warn('Failed to show GIF explosion:', e);
    }
}

// Hàm tạo boss
function createBoss() {
    // Khi tạo boss, xóa mọi chướng ngại vật và vật phẩm còn lại để màn hình sạch
    obstacles = [];
    items = [];
    
    // Tính toán kích thước boss dựa trên tỉ lệ ảnh gate.png
    let gateWidth = BOSS_GATE_SIZE;
    let gateHeight = BOSS_GATE_SIZE;
    
    // Điều chỉnh chiều rộng theo tỷ lệ ảnh nếu ảnh đã tải xong
    if (obstacleImages.gate.complete) {
        const imgRatio = obstacleImages.gate.naturalWidth / obstacleImages.gate.naturalHeight;
        gateWidth = gateHeight * imgRatio;
    }
    
    // Tạo cổng boss
    boss = {
        x: canvas.width + BOSS_SPAWN_X_OFFSET, // Spawn gần hơn để sớm vào khung hình
        y: GROUND_Y - BOSS_GATE_SIZE + OBSTACLE_SIZE + BOSS_GATE_Y_OFFSET,
        width: gateWidth,
        height: gateHeight,
        flashTimer: 0,
        isDefeated: false,
        defeatedTimer: 0,
        state: 'fight', // 'fight' | 'approach' | 'blink_out'
        blinkTimer: 0
    };
    
    // Hiển thị thanh máu boss
    bossHealthBar.current = BOSS_MAX_HEALTH;
    bossHealthBar.isVisible = true;
    // Attack scheduling
    boss.nextAttackIn = 120;
    boss.enraged = false;
    
    console.log("Boss created at position", boss.x, boss.y);
}

// Hàm xử lý đánh boss
function damageBoss(damage) {
    if (!boss || boss.isDefeated) return;
    
    bossHealthBar.current -= damage;
    bossHealthBar.flashTimer = 10; // Hiệu ứng nhấp nháy khi bị đánh
    
    // Tạo hiệu ứng nổ nhỏ khi đánh trúng boss
    spawnExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, true);
    
    // Kiểm tra nếu boss đã bị đánh bại
    if (bossHealthBar.current <= 0) {
        bossHealthBar.current = 0;
        boss.isDefeated = true;
        // Bắt đầu giai đoạn gate tiến về phía dino
        boss.state = 'approach';
        boss.blinkTimer = 0;
        // Ẩn thanh máu khi đã hết
        bossHealthBar.isVisible = false;
        console.log("Boss defeated! Gate approaching player...");
    }
}

// Hàm cập nhật boss
function updateBoss() {
    if (!boss) return;
    
    // Giai đoạn chiến đấu: gate trượt vào vị trí bên phải
    if (boss.state === 'fight') {
        const targetX = canvas.width * BOSS_FIGHT_TARGET_X_RATIO;
        if (boss.x > targetX) {
            boss.x -= getCurrentSpeed() * 0.5;
        }
        if (bossHealthBar.flashTimer > 0) bossHealthBar.flashTimer--;
        bossMaybeAttack();
        return;
    }

    // Sau khi HP = 0: gate tiến về phía dino như chướng ngại vật
    if (boss.state === 'approach') {
        // Cho gate di chuyển về phía người chơi
        boss.x -= getCurrentSpeed();
        // Kiểm tra va chạm với người chơi
        const collides = (
            player.x < boss.x + boss.width &&
            player.x + PLAYER_SIZE > boss.x &&
            player.y < boss.y + boss.height &&
            player.y + PLAYER_SIZE > boss.y
        );
        if (collides) {
            // Tính tâm vùng giao nhau để đặt hiệu ứng nổ GIF
            const ix = Math.max(player.x, boss.x);
            const iy = Math.max(player.y, boss.y);
            const iw = Math.max(0, Math.min(player.x + PLAYER_SIZE, boss.x + boss.width) - ix);
            const ih = Math.max(0, Math.min(player.y + PLAYER_SIZE, boss.y + boss.height) - iy);
            const cx = ix + iw / 2;
            const cy = iy + ih / 2;
            showGifExplosionAt(cx, cy, Math.max(120, Math.min(boss.width, boss.height)), 900);
            // Khi chạm vào gate: tắt chế độ tank ngay lập tức và chuyển về dino thường
            if (player.tankModeRemaining > 0) {
                player.tankModeRemaining = 0;
                player.tankUnlocked = false;
            }
            // Sự thay đổi sang dino2 và xóa hiệu ứng sẽ xảy ra sau khi explode2.gif kết thúc
            // Bắt đầu nhấp nháy và chuẩn bị biến mất
            boss.state = 'blink_out';
            boss.blinkTimer = 40; // thời gian nhấp nháy
            boss.flashTimer = 1;
        }
        return;
    }

    // Nhấp nháy rồi biến mất
    if (boss.state === 'blink_out') {
        if (boss.blinkTimer > 0) {
            boss.blinkTimer--;
            // Tạo hiệu ứng nhấp nháy ẩn/hiện
            boss.flashTimer = (boss.blinkTimer % 8 < 4) ? 1 : 0;
        } else {
            // Gate biến mất, kết thúc boss battle
            boss = null;
            player.isBossBattle = false;
            // Khóa spawn item trong 10s kể từ lúc hạ boss (đồng bộ theo ts trong gameLoop)
            lastBossDefeatTime = performance.now();
            player.noItemUntilTs = lastBossDefeatTime + 10000;
            
            // Tạo hiệu ứng flash toàn màn hình
            showFullScreenFlash();
            
            // Bỏ chế độ grayscale và bắt đầu hiệu ứng chuyển đổi màu
            window.gameUsesColor = true;
            window.justSwitchedToColor = true;
            window.colorTransitionAlpha = 0.5; // Độ mờ ban đầu của lớp phủ màu
            
            // Player đã chuyển sang dino2.png từ khi va chạm với gate trong hàm showGifExplosionAt
            // và các hiệu ứng hỗ trợ đã được xóa
        }
    }
}

// ========== Boss attacks ==========
function bossMaybeAttack(){
    if (!boss || boss.state !== 'fight') return;
    if (bossHealthBar.current / bossHealthBar.max <= BOSS_ENRAGE_RATIO) boss.enraged = true;
    if (boss.nextAttackIn > 0) { boss.nextAttackIn--; return; }
    const playerReloading = player && player.isBossBattle && (player.bossAmmo <= 0);
    // Nếu HP còn rất thấp (<=20) -> xả burst nhanh như hiện tại
    if (bossHealthBar.current <= BOSS_BURST_LOW_HP) {
        attackShootBurst(true); // fast mode
    } else {
        // Bình thường: chỉ bắn 1 viên vào trên hoặc dưới để ép nhảy/cúi né
        const choices = boss.enraged ? ['single','wave','single'] : ['single','wave'];
        const pick = choices[Math.floor(Math.random()*choices.length)];
        if (pick === 'single') attackSingleDirected(); else attackGroundWave();
    }
    // Khi người chơi đang nạp, giảm cooldown để tăng áp lực
    const cdScale = (boss.enraged ? 0.7 : 1.0) * (playerReloading ? BOSS_PRESSURE_CD_SCALE : 1.0);
    const cdMin = Math.max(10, Math.floor(BOSS_ATTACK_COOLDOWN_MIN * cdScale));
    const cdMax = Math.max(cdMin+2, Math.floor(BOSS_ATTACK_COOLDOWN_MAX * cdScale));
    boss.nextAttackIn = Math.floor(cdMin + Math.random()*(cdMax-cdMin));
}

function attackShootBurst(fast=false){
    const cx = boss.x + boss.width/2;
    const cy = boss.y + boss.height/2;
    const shots = boss.enraged ? 7 : 5;
    for (let i=0;i<shots;i++){
        const ang = Math.atan2((player.y+PLAYER_SIZE/2)-cy, (player.x+PLAYER_SIZE/2)-cx) + (i-(shots-1)/2)*(fast?0.12:0.08);
    let spd = fast ? BOSS_BULLET_SPEED*1.25 : BOSS_BULLET_SPEED;
    if (player && player.bossAmmo <= 0) spd *= BOSS_PRESSURE_BULLET_SCALE;
        bossShots.push({ x: cx, y: cy, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, r: 8, ttl: 360, tele: fast?8:12 });
    }
}

// Bắn 1 viên ở quỹ đạo trên hoặc dưới để ép nhảy/cúi
function attackSingleDirected(){
    const cx = boss.x + boss.width/2;
    const cy = boss.y + boss.height/2;
    // Chọn quỹ đạo: 'high' (đi ngang phần đầu) hoặc 'low' (đi ngang gần chân)
    const mode = Math.random()<0.5 ? 'high' : 'low';
    const targetY = mode==='high' ? (player.y + PLAYER_SIZE*0.25) : (player.y + PLAYER_SIZE*0.85);
    const ang = Math.atan2(targetY - cy, (player.x+PLAYER_SIZE/2) - cx);
    let base = BOSS_BULLET_SPEED*0.9;
    if (player && player.bossAmmo <= 0) base *= BOSS_PRESSURE_BULLET_SCALE;
    const vx = Math.cos(ang) * base;
    const vy = Math.sin(ang) * base;
    bossShots.push({ x: cx, y: cy, vx, vy, r: 8, ttl: 360, tele: 12, lane: mode });
}

function attackGroundWave(){
    const y = GROUND_Y + PLAYER_SIZE - 2; // trung tâm sóng gần mặt đất
    bossWaves.push({ x: boss.x, y, w: 48, h: 16, vx: -(BOSS_WAVE_SPEED + (boss.enraged?2:0)), ttl: 360, tele: 16 });
}

function updateBossAttacks(){
    // bullets
    const ns=[];
    for (const s of bossShots){
        if (s.tele>0){ s.tele--; } else { s.x+=s.vx; s.y+=s.vy; }
        if (--s.ttl>0 && s.x>-40 && s.x<canvas.width+40 && s.y>-40 && s.y<canvas.height+40){
            if (circRectHit(s.x,s.y,s.r, player.x,player.y, PLAYER_SIZE,PLAYER_SIZE)) { onBossHitPlayer(); continue; }
            ns.push(s);
        }
    }
    bossShots = ns;
    // waves
    const nw=[];
    for (const w of bossWaves){
        if (w.tele>0){ w.tele--; } else { w.x+=w.vx; }
        if (--w.ttl>0 && w.x + w.w > -40){
            const wy = w.y - Math.floor(w.h/2);
            if (rectHit(w.x, wy, w.w, w.h, player.x,player.y,PLAYER_SIZE,PLAYER_SIZE)) { onBossHitPlayer(); continue; }
            nw.push(w);
        }
    }
    bossWaves = nw;
}

function drawBossAttacks(){
    // shots
    for (const s of bossShots){
        if (s.tele>0){
            ctx.strokeStyle = 'rgba(255,230,100,0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r+6, 0, Math.PI*2); ctx.stroke();
        } else {
            const grad = ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2);
            grad.addColorStop(0,'rgba(255,255,160,0.9)');
            grad.addColorStop(1,'rgba(255,140,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        }
    }
    // waves
    for (const w of bossWaves){
        const wy = w.y - Math.floor(w.h/2);
        const gx = Math.round(w.x), gy = Math.round(wy), gw = Math.round(w.w), gh = Math.round(w.h);
        // halo nhẹ
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffe27a';
        ctx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
        ctx.restore();
        // lõi sáng
        ctx.fillStyle = '#ffcc33';
        ctx.fillRect(gx, gy, gw, gh);
    }
}

function onBossHitPlayer(){
    // Trong boss battle, luôn tính sát thương (mọi buff hỗ trợ đã được xóa khi vào boss)
    if (player.shieldCharges>0){
        // Vẫn trừ 1 lớp khiên nếu còn, nhưng vẫn nhận sát thương nhẹ để tránh bất tử
        player.shieldCharges--; player.shieldFlashTimer = 20;
    }
    // Mất máu khi trúng đạn/wave của boss
    player.health = Math.max(0, player.health - DINO_DAMAGE_PER_HIT);
    // Phạt nhẹ: tăng cooldown bắn để người chơi né đòn
    player.bossBulletCooldown = Math.max(player.bossBulletCooldown, 36);
    spawnExplosion(player.x+PLAYER_SIZE/2, player.y+PLAYER_SIZE/2, true);
    if (player.health <= 0 && !player.isDead) {
        player.isDead = true;
        // Kết thúc trận do dino gục (game over)
        gameState = 'gameover';
        if (finalDistanceSpan) finalDistanceSpan.textContent = distance;
        if (distance > highScore) {
            highScore = distance;
            localStorage.setItem('squareRunHigh', highScore);
            if (bestScoreSpan) bestScoreSpan.textContent = highScore;
        }
        show(gameOverBox);
        loopStopped = true;
    }
}

function circRectHit(cx,cy,r, rx,ry,rw,rh){
    const nx = Math.max(rx, Math.min(cx, rx+rw));
    const ny = Math.max(ry, Math.min(cy, ry+rh));
    const dx = cx-nx, dy = cy-ny; return (dx*dx+dy*dy) <= r*r;
}
function rectHit(ax,ay,aw,ah, bx,by,bw,bh){
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
}

// Hàm vẽ boss
function drawBoss() {
    if (!boss) return;
    
    ctx.save();
    
    // Vẽ cổng boss sử dụng gate.png
    if (obstacleImages.gate.complete) {
        // Nếu đang ở trạng thái blink_out và flashTimer=0 thì ẩn (nhấp nháy)
        const shouldHide = (boss.state === 'blink_out' && boss.flashTimer === 0);
        if (!shouldHide) {
            // Tính tỉ lệ khung hình dựa trên kích thước tự nhiên của ảnh
            const imgRatio = obstacleImages.gate.naturalWidth / obstacleImages.gate.naturalHeight;
            const drawHeight = boss.height; // Chiều cao dựa trên BOSS_GATE_SIZE
            const drawWidth = drawHeight * imgRatio; // Chiều rộng tính theo tỉ lệ ảnh để không bị bóp méo
            
            ctx.drawImage(
                obstacleImages.gate,
                boss.x,
                boss.y,
                drawWidth,
                drawHeight
            );
        }

        // Thêm hiệu ứng phát sáng khi boss bị đánh bại
        if ((boss.isDefeated || boss.state !== 'fight') && boss.flashTimer > 0) {
            ctx.globalAlpha = 0.6;
            ctx.globalCompositeOperation = 'lighter';
            // Tính tỉ lệ khung hình cho hiệu ứng phát sáng
            const imgRatio = obstacleImages.gate.naturalWidth / obstacleImages.gate.naturalHeight;
            const drawHeight = boss.height + 10; // Chiều cao lớn hơn một chút so với gate chính
            const drawWidth = drawHeight * imgRatio; // Chiều rộng tính theo tỉ lệ ảnh
            
            ctx.drawImage(
                obstacleImages.gate,
                boss.x - 5,
                boss.y - 5,
                drawWidth,
                drawHeight
            );
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        }
    } else {
        // Fallback nếu hình ảnh chưa tải xong
        ctx.fillStyle = '#555555';
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    }
    
    // Vẽ thanh máu của boss nếu đang hiển thị và boss chưa bị đánh bại
    if (bossHealthBar.isVisible) {
        const barX = (canvas.width - BOSS_HEALTH_BAR_WIDTH) / 2;
        const barY = 30; // Đặt thanh máu cao hơn một chút
        
        // Vẽ nền thanh máu
        ctx.fillStyle = '#222222';
        ctx.fillRect(barX - 5, barY - 5, BOSS_HEALTH_BAR_WIDTH + 10, BOSS_HEALTH_BAR_HEIGHT + 10);
        
        // Vẽ nền thanh máu chính
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, BOSS_HEALTH_BAR_WIDTH, BOSS_HEALTH_BAR_HEIGHT);
        
        // Tính tỷ lệ máu còn lại
        const healthRatio = bossHealthBar.current / bossHealthBar.max;
        
        // Hiệu ứng máu gradient
        const healthGradient = ctx.createLinearGradient(barX, barY, barX, barY + BOSS_HEALTH_BAR_HEIGHT);
        
        // Chọn màu cho thanh máu (đỏ khi máu thấp)
        if (bossHealthBar.flashTimer > 0) {
            healthGradient.addColorStop(0, '#ffffff');
            healthGradient.addColorStop(1, '#dddddd');
        } else if (healthRatio < 0.3) {
            healthGradient.addColorStop(0, '#ff3300');
            healthGradient.addColorStop(0.5, '#ff0000');
            healthGradient.addColorStop(1, '#cc0000');
        } else if (healthRatio < 0.6) {
            healthGradient.addColorStop(0, '#ffcc00');
            healthGradient.addColorStop(0.5, '#ffaa00');
            healthGradient.addColorStop(1, '#ff8800');
        } else {
            healthGradient.addColorStop(0, '#00ff00');
            healthGradient.addColorStop(0.5, '#00cc00');
            healthGradient.addColorStop(1, '#009900');
        }
        
        ctx.fillStyle = healthGradient;
        
        // Vẽ thanh máu hiện tại
        ctx.fillRect(barX, barY, BOSS_HEALTH_BAR_WIDTH * healthRatio, BOSS_HEALTH_BAR_HEIGHT);
        
        // Vẽ các đoạn phân chia thanh máu
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            const segX = barX + (BOSS_HEALTH_BAR_WIDTH / 10) * i;
            ctx.beginPath();
            ctx.moveTo(segX, barY);
            ctx.lineTo(segX, barY + BOSS_HEALTH_BAR_HEIGHT);
            ctx.stroke();
        }
        
        // Vẽ viền thanh máu
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, BOSS_HEALTH_BAR_WIDTH, BOSS_HEALTH_BAR_HEIGHT);
        
        // Vẽ chữ BOSS với đổ bóng
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', barX + BOSS_HEALTH_BAR_WIDTH / 2 + 2, barY - 12 + 2);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('BOSS', barX + BOSS_HEALTH_BAR_WIDTH / 2, barY - 12);
        
        // Thêm số máu hiện tại/tối đa
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${Math.ceil(bossHealthBar.current)}/${BOSS_MAX_HEALTH}`, barX + BOSS_HEALTH_BAR_WIDTH / 2, barY + BOSS_HEALTH_BAR_HEIGHT / 2 + 4);
    }
    
    ctx.restore();
}

function drawGround() {
    ctx.save();
    
    // Không sử dụng filter - thay vào đó tạo màu grayscale trực tiếp

    const topY = GROUND_Y + PLAYER_SIZE; // running surface top line
    const fieldHeight = GRASS_DYNAMIC_FILL ? (canvas.height - topY) : GRASS_FIELD_HEIGHT;
    if (gameState === 'playing') groundOffset = (groundOffset + getCurrentSpeed()) % (FLOWER_SEGMENT_WIDTH * 1000);

    // Trước khi hạ boss: nền tối giản — chỉ kẻ đường chân trời và vài hạt sỏi pixel
    if (!window.gameUsesColor) {
        // Pixel horizon with subtle bumps
    const px = 2; // line thickness
        const seg = 8; // horizontal segment length
    ctx.fillStyle = '#212121';
        for (let x = 0; x < canvas.width; x += seg) {
            const worldX = x + groundOffset;
            // Deterministic chance for a small bump every ~60px in world space
            const cell = Math.floor(worldX / 60);
            const r = hash01(cell * 5.123);
            let yOff = 0;
            if (r < 0.16) {
                // Triangular bump profile across the cell
                const t = ((worldX % 60) / 60); // 0..1 within cell
                const tri = 1 - Math.abs(t * 2 - 1); // peak at center
                const amp = 6; // max bump height in px
                yOff = -Math.round(tri * amp / px) * px; // snap to px grid and go upward
            }
            const y = topY + yOff;
            ctx.fillRect(x, y, seg, px);
        }
        // Sparse speckles under the line
    ctx.fillStyle = '#212121';
        const density = 0.08; // spawn probability per step
        const step = 10;
        for (let x = 0; x < canvas.width; x += step) {
            if (hash01(Math.floor((x + groundOffset) / step) * 1.97) < density) {
                const yy = topY + 6 + Math.floor(hash01(x * 3.3 + groundOffset * 0.1) * 10);
                ctx.fillRect(x, yy, 2, 2);
            }
        }
        ctx.restore();
        return;
    }
    
    // Tạo các màu grayscale trước cho hiệu năng
    if (!window.groundGrayColors) {
        window.groundGrayColors = {
            gradient: [],
            topHighlight: null,
            flowers: [],
            flowerCenter: null,
            grass: [],
            stems: null
        };
        
        // Chuyển đổi màu gradient
        GRASS_GRADIENT_COLORS.forEach(col => {
            const rgb = hexToRgb(col);
            const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
            window.groundGrayColors.gradient.push(`rgb(${gray},${gray},${gray})`);
        });
        
        // Chuyển đổi màu highlight
        const hlRgb = hexToRgb(GRASS_TOP_HIGHLIGHT);
        const hlGray = Math.round(0.299 * hlRgb.r + 0.587 * hlRgb.g + 0.114 * hlRgb.b);
        window.groundGrayColors.topHighlight = `rgb(${hlGray},${hlGray},${hlGray})`;
        
        // Chuyển đổi màu hoa
        FLOWER_COLORS.forEach(col => {
            const rgb = hexToRgb(col);
            const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b);
            window.groundGrayColors.flowers.push(`rgb(${gray},${gray},${gray})`);
        });
        
        // Chuyển đổi màu tâm hoa
        const fcRgb = hexToRgb(FLOWER_CENTER_COLOR);
        const fcGray = Math.round(0.299 * fcRgb.r + 0.587 * fcRgb.g + 0.114 * fcRgb.b);
        window.groundGrayColors.flowerCenter = `rgb(${fcGray},${fcGray},${fcGray})`;
        
        // Chuyển đổi màu cỏ
        window.groundGrayColors.stems = '#777777';
        window.groundGrayColors.grass = ['#555555', '#444444'];
    }

    // Grass gradient (color)
    const g = ctx.createLinearGradient(0, topY, 0, topY + fieldHeight);
    GRASS_GRADIENT_COLORS.forEach((col, i) => {
        g.addColorStop(i / (GRASS_GRADIENT_COLORS.length - 1), col);
    });
    ctx.fillStyle = g;
    ctx.fillRect(0, topY, canvas.width, fieldHeight);

    // Top highlight
    ctx.fillStyle = GRASS_TOP_HIGHLIGHT;
    ctx.fillRect(0, topY, canvas.width, 4);

    // Depth noise near bottom
    ctx.globalAlpha = 0.12;
    const depthColor = window.gameUsesColor ? '#2b5d19' : '#555555';
    ctx.fillStyle = depthColor;
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
                const petalIndex = Math.floor(hash01(worldIndex * 0.791 + f * 2.17) * FLOWER_COLORS.length);
                const petalColor = window.gameUsesColor ? FLOWER_COLORS[petalIndex] : window.groundGrayColors.flowers[petalIndex];
                // Stem
                ctx.fillStyle = window.gameUsesColor ? '#2f6e1e' : window.groundGrayColors.stems;
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
                ctx.fillStyle = window.gameUsesColor ? FLOWER_CENTER_COLOR : window.groundGrayColors.flowerCenter;
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
                    ctx.fillStyle = window.gameUsesColor ? '#28591a' : window.groundGrayColors.stems;
                    ctx.fillRect(Math.round(x), Math.round(stemTopY), 2, 10);
                    {
                        const idx = Math.floor(hash01(worldIndex * 2.19 + r2) * FLOWER_COLORS.length);
                        ctx.fillStyle = window.gameUsesColor ? FLOWER_COLORS[idx] : window.groundGrayColors.flowers[idx];
                    }
                    ctx.fillRect(Math.round(x - 1), Math.round(stemTopY - 3), 4, 4);
                }
                ctx.globalAlpha = 1;
            }
        } else if (hash01(worldIndex * 5.555) < EXTRA_FILL_FLOWER_DENSITY) {
            // Lone filler flower
            const x = segX + 10 + hash01(worldIndex * 11.11) * (FLOWER_SEGMENT_WIDTH - 20);
            const stemTopY = topY + 7 + hash01(worldIndex * 3.3) * 10;
            ctx.fillStyle = window.gameUsesColor ? '#2f6e1e' : window.groundGrayColors.stems;
            ctx.fillRect(Math.round(x), Math.round(stemTopY), 2, 5);
            {
                const idx = Math.floor(hash01(worldIndex * 9.7) * FLOWER_COLORS.length);
                ctx.fillStyle = window.gameUsesColor ? FLOWER_COLORS[idx] : window.groundGrayColors.flowers[idx];
            }
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
                ctx.strokeStyle = window.gameUsesColor ? (b % 2 ? '#56bb44' : '#3d8a2f') : window.groundGrayColors.grass[b % 2];
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
    ctx.save(); // Lưu trạng thái hiện tại
    
    // Trước khi hạ boss: nền tối giản giống Chrome Dino
    if (!window.gameUsesColor) {
        // Nền màu theo yêu cầu
        ctx.fillStyle = '#37474F';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Vẽ vài nét mây tối giản bằng các gạch pixel xám nhạt
        const cloudCount = 3;
        const speed = 0.3;
        for (let i = 0; i < cloudCount; i++) {
            const span = canvas.width / 3;
            const x = (i * span - (distance * speed) % (span + 120)) + 60;
            const y = 20 + (i % 2) * 18 + Math.sin((distance + i * 200) * 0.002) * 2;
            const w = 90 + (i % 2) * 30;
            const h = 18;
            const px = 3; // độ dày nét pixel
            ctx.fillStyle = '#212121';
            // đường đáy mây
            ctx.fillRect(Math.round(x), Math.round(y + h), w, px);
            // gờ đầu mây
            ctx.fillRect(Math.round(x + w * 0.15), Math.round(y + h * 0.25), Math.round(w * 0.5), px);
            ctx.fillRect(Math.round(x + w * 0.5), Math.round(y + h * 0.1), Math.round(w * 0.25), px);
        }

        ctx.restore();
        return; // Bỏ qua núi, cây, mây chi tiết cho đến khi hạ boss
    }

    // Sau khi hạ boss: nền màu phong phú
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const stops = SKY_GRADIENT_COLORS.length - 1;
    SKY_GRADIENT_COLORS.forEach((col, i) => {
        g.addColorStop(i / stops, col);
    });
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const horizonY = GROUND_Y + PLAYER_SIZE - 40; // baseline for farthest mountains

    // Multi-layer pixel mountains with subtle dither
    MOUNTAIN_LAYERS.forEach((layer, li) => {
        const span = canvas.width / layer.spacing;
        const offset = (distance * layer.speed) % span;
        const baseColor = displayHex(layer.color);
        const shadeA = displayHex(shadeHex(layer.color, -0.08));
        const shadeB = displayHex(shadeHex(layer.color, 0.08));
        for (let i = -1; i < 6; i++) {
            const peakX = (i * span * 0.85) + (span - offset);
            const baseH = layer.height;
            const variance = (Math.sin((i + li * 10) * 13.37) + 1) * 0.5 * layer.variance;
            const peakY = Math.round((horizonY - baseH + variance - li * 14) / BG_PIXEL) * BG_PIXEL;
            const baseLeft = Math.round((peakX - span * 0.55) / BG_PIXEL) * BG_PIXEL;
            const baseRight = Math.round((peakX + span * 0.55) / BG_PIXEL) * BG_PIXEL;
            const baseY = Math.round(horizonY / BG_PIXEL) * BG_PIXEL;

            // Main triangle fill (blocky)
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(peakX, peakY);
            ctx.lineTo(baseLeft, baseY);
            ctx.lineTo(baseRight, baseY);
            ctx.closePath();
            ctx.fill();

            // Simple dither stripes for volume
            ctx.fillStyle = shadeA;
            const stripeCount = 6;
            for (let s = 1; s <= stripeCount; s++) {
                const t = s / (stripeCount + 1);
                const y = Math.round((peakY + (baseY - peakY) * t) / BG_PIXEL) * BG_PIXEL;
                const left = peakX - (peakX - baseLeft) * t;
                const right = peakX + (baseRight - peakX) * t;
                const stripeH = BG_PIXEL;
                ctx.fillRect(Math.round(left), y, Math.round(right - left), stripeH);
            }

            // Highlight ridge near peak
            ctx.fillStyle = shadeB;
            ctx.fillRect(Math.round(peakX - 2 * BG_PIXEL), Math.round(peakY + 2 * BG_PIXEL), 4 * BG_PIXEL, BG_PIXEL);
        }
    });

    // Tall background trees (behind clouds but in front of mountains?) -> we draw before clouds so clouds drift over
    const treeBaseY = GROUND_Y + PLAYER_SIZE;
    const treeSpan = TREE_LAYER.spacing;
    const treeOffset = (distance * TREE_LAYER.speed) % treeSpan;
    
    // Tính toán màu grayscale cho cây trước khi vẽ - tăng hiệu năng
    if (!window.treeGrayColors) {
        window.treeGrayColors = {
            trunk: null,
            leaves: []
        };
        
        // Chuyển màu thân cây
        const trunkRgb = hexToRgb(TREE_LAYER.trunkColor);
        const trunkGray = Math.round(0.299 * trunkRgb.r + 0.587 * trunkRgb.g + 0.114 * trunkRgb.b);
        window.treeGrayColors.trunk = `rgb(${trunkGray},${trunkGray},${trunkGray})`;
        
        // Chuyển màu lá cây
        TREE_LAYER.leafColors.forEach(color => {
            const leafRgb = hexToRgb(color);
            const leafGray = Math.round(0.299 * leafRgb.r + 0.587 * leafRgb.g + 0.114 * leafRgb.b);
            window.treeGrayColors.leaves.push(`rgb(${leafGray},${leafGray},${leafGray})`);
        });
    }
    
    // Giảm số lượng cây hiển thị để tăng hiệu năng
    const treeStep = Math.max(1, Math.floor(treeSpan / 2));
    
    for (let x = -treeSpan; x < canvas.width + treeSpan; x += treeStep) {
        const baseX = x - treeOffset + treeSpan;
        const seed = Math.sin((baseX + distance) * 0.0021);
        const trunkH = 120 + (seed * 0.5 + 0.5) * 80; // 120-200
        const trunkW = 14 + (seed * 0.5 + 0.5) * 6;
        // Trunk with pixel shading
        const trunkColor = window.gameUsesColor ? TREE_LAYER.trunkColor : window.treeGrayColors.trunk;
        const trunkShade = displayHex(shadeHex(TREE_LAYER.trunkColor, -0.15));
        const trunkLight = displayHex(shadeHex(TREE_LAYER.trunkColor, 0.12));
        const trunkX = Math.round(baseX);
        const trunkY = Math.round(treeBaseY - trunkH);
        const trunkWpx = Math.round(trunkW);
        const trunkHpx = Math.round(trunkH);
        ctx.fillStyle = trunkColor;
        ctx.fillRect(trunkX, trunkY, trunkWpx, trunkHpx);
        // Bark stripes
        ctx.fillStyle = trunkShade;
        for (let yy = trunkY + BG_PIXEL * 2; yy < treeBaseY - BG_PIXEL * 2; yy += BG_PIXEL * 5) {
            ctx.fillRect(trunkX + BG_PIXEL, yy, trunkWpx - BG_PIXEL * 2, BG_PIXEL);
        }
        // Light center
        ctx.fillStyle = trunkLight;
        ctx.fillRect(trunkX + Math.floor(trunkWpx / 2) - BG_PIXEL, trunkY, 2 * BG_PIXEL, trunkHpx);
        // Layered canopies (3 tiers)
        const canopyLevels = 3;
        for (let c = 0; c < canopyLevels; c++) {
            const tierY = treeBaseY - trunkH + c * (trunkH / canopyLevels * 0.35);
            const tierW = trunkW * 3.2 + (canopyLevels - c) * 18;
            const leafBase = window.gameUsesColor ? TREE_LAYER.leafColors[c % TREE_LAYER.leafColors.length] : window.treeGrayColors.leaves[c % window.treeGrayColors.leaves.length];
            const leafShade = displayHex(shadeHex(window.gameUsesColor ? TREE_LAYER.leafColors[c % TREE_LAYER.leafColors.length] : toGrayHex(TREE_LAYER.leafColors[c % TREE_LAYER.leafColors.length]), -0.12));
            const cx = trunkX + trunkWpx / 2;
            const tierTop = Math.round(tierY - 22);
            const stepH = BG_PIXEL * 3;
            const steps = 5;
            for (let s = 0; s < steps; s++) {
                const w = Math.round((tierW - s * 8) / BG_PIXEL) * BG_PIXEL;
                const y = tierTop + s * stepH;
                ctx.fillStyle = leafBase;
                ctx.fillRect(Math.round(cx - w / 2), y, w, stepH);
                // shadow line
                ctx.fillStyle = leafShade;
                ctx.fillRect(Math.round(cx - w / 2), y + stepH - BG_PIXEL, w, BG_PIXEL);
            }
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
            
            // Xác định màu mây dựa trên chế độ màu
            // Chỉ tính toán một lần
            if (!cl.grayC) {
                const shadowRgb = hexToRgb(cl.cShadow || '#dddddd');
                const shadowGray = Math.round(0.299 * shadowRgb.r + 0.587 * shadowRgb.g + 0.114 * shadowRgb.b);
                cl.grayShadow = `rgb(${shadowGray},${shadowGray},${shadowGray})`;
                
                const cloudRgb = hexToRgb(cl.c || '#ffffff'); 
                const cloudGray = Math.round(0.299 * cloudRgb.r + 0.587 * cloudRgb.g + 0.114 * cloudRgb.b);
                cl.grayC = `rgb(${cloudGray},${cloudGray},${cloudGray})`;
            }
            
            // Shadow - blocky shadow
            ctx.fillStyle = window.gameUsesColor ? (cl.cShadow || '#dddddd') : cl.grayShadow;
            for (let row = 0; row < cl.pattern.length; row++) {
                for (let col = 0; col < cl.pattern[row].length; col++) {
                    if (cl.pattern[row][col] === '1') {
                        ctx.fillRect(Math.round(cl.x + col * cl.scale + 1), Math.round(cl.y + row * cl.scale + 1), cl.scale, cl.scale);
                    }
                }
            }
            
            // Body - add pixel highlight rows for depth
            ctx.fillStyle = window.gameUsesColor ? (cl.c || '#ffffff') : cl.grayC;
            for (let row = 0; row < cl.pattern.length; row++) {
                for (let col = 0; col < cl.pattern[row].length; col++) {
                    if (cl.pattern[row][col] === '1') {
                        ctx.fillRect(Math.round(cl.x + col * cl.scale), Math.round(cl.y + row * cl.scale), cl.scale, cl.scale);
                    }
                }
            }
            // subtle highlight line across upper third
            const hiY = Math.round(cl.y + (cl.pattern.length * cl.scale) * 0.33);
            ctx.fillStyle = displayHex('#ffffff');
            ctx.globalAlpha = 0.12;
            ctx.fillRect(Math.round(cl.x), hiY, Math.round(cl.pattern[0].length * cl.scale), BG_PIXEL);
            ctx.globalAlpha = 1;
        }
    });
    
    // Khôi phục lại trạng thái filter trước đó để các vật thể khác hiển thị bình thường
    ctx.restore();
    
    // Hiệu ứng màu chuyển đổi - chỉ vẽ khi mới đổi từ grayscale sang color
    if (window.gameUsesColor && window.justSwitchedToColor) {
        // Tạo hiệu ứng màu dần hiện lên
        ctx.fillStyle = `rgba(255, 255, 255, ${window.colorTransitionAlpha || 0})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Giảm dần độ mờ để màu hiện lên
        if (window.colorTransitionAlpha > 0) {
            window.colorTransitionAlpha -= 0.02;
        } else {
            window.justSwitchedToColor = false;
        }
    }
}

function draw() {
    drawBackground();
    drawGround();
    drawPlayer();
    // Không vẽ chướng ngại vật và vật phẩm trong trận boss để chỉ còn dino tank và boss gate
    if (!player.isBossBattle) {
        drawObstacles();
        drawItems();
    }
    drawProjectiles(); // Khôi phục phần vẽ đạn xe tăng
    
    // Vẽ boss nếu đang trong boss battle
    if (boss) {
        drawBoss();
        drawBossAttacks();
    }
    // Vẽ thanh máu của dino chỉ trong màn boss
    if (player.isBossBattle && boss && !boss.isDefeated) {
        const pad = 12;
        const barX = pad;
        const barY = 64; // nằm dưới panel Distance
        const ratio = Math.max(0, Math.min(1, player.health / DINO_MAX_HEALTH));
        // nền
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 4, barY - 4, DINO_HEALTH_BAR_WIDTH + 8, DINO_HEALTH_BAR_HEIGHT + 8);
        // khung
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, DINO_HEALTH_BAR_WIDTH, DINO_HEALTH_BAR_HEIGHT);
        // máu
        const grad = ctx.createLinearGradient(barX, barY, barX, barY + DINO_HEALTH_BAR_HEIGHT);
        grad.addColorStop(0, '#66ff66');
        grad.addColorStop(1, '#009933');
        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, Math.floor(DINO_HEALTH_BAR_WIDTH * ratio), DINO_HEALTH_BAR_HEIGHT);
        // nhãn
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`HP ${Math.ceil(player.health)}/${DINO_MAX_HEALTH}`, barX + 4, barY - 6);
    }
    // Draw particles last (over ground, under UI) but before UI overlays
    // Giảm số lượng particles được vẽ khi có nhiều
    const particleLimit = 25;
    const particlesToDraw = particles.length > particleLimit ? 
        particles.filter((_, index) => index % Math.ceil(particles.length / particleLimit) === 0) : 
        particles;
    
    for (let p of particlesToDraw) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
}

// Theo dõi thời gian frames
let lastFrameTime = 0;
let skipFrameCount = 0;

function gameLoop(ts) {
    // Tính FPS và thời gian giữa các frame
    const deltaTime = ts - lastFrameTime;
    lastFrameTime = ts;
    
    // Bỏ qua các frame khi FPS thấp - tránh tích lũy lag
    if (deltaTime > 50) { // Nếu quá 50ms (dưới 20fps)
        skipFrameCount++;
        if (skipFrameCount % 2 === 0) { // Bỏ qua một nửa frames khi lag
            requestAnimationFrame(gameLoop);
            return;
        }
    } else {
        skipFrameCount = 0;
    }
    
    if (gameState === 'playing') {
        updatePlayer();
        
        // Cập nhật boss nếu đang trong boss battle
        if (boss) {
            updateBoss();
            updateBossAttacks();
        }
        
        // Luôn cập nhật đạn và hạt để đạn bay trong màn boss
        updateProjectiles();
        updateParticles();

        // Chỉ cập nhật vị trí và sinh chướng ngại vật nếu không phải trong boss battle
        // hoặc boss đã bị đánh bại
        if (!player.isBossBattle || (boss && boss.isDefeated && boss.defeatedTimer === 0)) {
            updateObstacles();
            updateItems();
            // (đạn và hạt đã cập nhật ở trên để không bị đứng yên trong boss battle)
            handleCollisions();
            if (obstacleSpawnBlockFrames > 0) obstacleSpawnBlockFrames--;
            distance += 1;
            if (distanceDiv && distance % 5 === 0) distanceDiv.textContent = distance; // Cập nhật UI ít hơn
            // (đã chuyển cập nhật ammo ra ngoài để luôn chạy cả khi đang boss battle)
            
            // Chỉ sinh chướng ngại vật nếu không trong boss battle
            if (!player.isBossBattle) {
                if (restGapDistance > 0) {
                    // Reduce by world movement (speed) each frame
                    restGapDistance -= getCurrentSpeed();
                } else if (ts - lastObstacleTime > 1200 && obstacleSpawnBlockFrames <= 0) {
                    // Chỉ tạo chướng ngại vật khi không bị chặn
                    spawnObstacle();
                    lastObstacleTime = ts;
                    
                    // Tạo khoảng cách ngẫu nhiên trước chướng ngại vật tiếp theo
                    restGapDistance = Math.random() * 200 + 100;
                }
                
                // Tạo vật phẩm với tần suất phù hợp, nhưng không spawn trong 10s sau khi hạ boss
                const canSpawnItemsNow = (player.noItemUntilTs === 0 || ts >= player.noItemUntilTs);
                if (canSpawnItemsNow && ts - lastItemTime > 3000 && Math.random() < 0.4 && items.length < MAX_ITEMS) { 
                    spawnItem(); 
                    lastItemTime = ts; 
                }
            }
        }
        // Trong boss battle: đảm bảo danh sách luôn rỗng và bỏ qua va chạm
        else {
            if (player.isBossBattle) {
                if (obstacles.length) obstacles = [];
                if (items.length) items = [];
            }
        }
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

        // Cập nhật hiển thị thanh đạn (ammo) luôn mỗi frame khi đang playing
        if (bossAmmoSpan) {
            if (player.isBossBattle && boss && !boss.isDefeated) {
                const filled = '■'.repeat(Math.max(0, Math.min(BOSS_AMMO_MAX, player.bossAmmo)));
                const empty = '□'.repeat(Math.max(0, BOSS_AMMO_MAX - player.bossAmmo));
                let suffix = '';
                if (player.bossAmmo < BOSS_AMMO_MAX && player.bossAmmoRecharge > 0) {
                    bossAmmoSpan.style.color = '#ffcc33';
                    suffix = ` +${Math.ceil(player.bossAmmoRecharge/60)}s`;
                } else {
                    bossAmmoSpan.style.color = '';
                }
                bossAmmoSpan.textContent = `[${filled}${empty}]${suffix}`;
            } else {
                bossAmmoSpan.textContent = '';
            }
        }
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
        // Bắn vào boss khi nhấn F trong trận đấu boss
        if (e.code === 'KeyF' && player.isBossBattle && boss && !boss.isDefeated) {
            // Không thể bắn nếu hết đạn
            if (player.bossAmmo <= 0) return;
            // Kiểm tra hồi chiêu giữa các phát
            if (player.bossBulletCooldown > 0) return;
            // Đặt hồi chiêu bắn giữa các phát
            player.bossBulletCooldown = BOSS_PLAYER_FIRE_CD_FRAMES;
            // Giảm 1 viên đạn
            player.bossAmmo = Math.max(0, player.bossAmmo - 1);

            // Tạo đạn hướng tới boss
            const bulletSpeed = 20;
            const angle = Math.atan2(
                (boss.y + boss.height / 2) - (player.y + PLAYER_SIZE / 2),
                (boss.x + boss.width / 2) - (player.x + PLAYER_SIZE / 2)
            );
            projectiles.push({
                x: player.x + PLAYER_SIZE,
                y: player.y + PLAYER_SIZE / 2,
                vx: Math.cos(angle) * bulletSpeed,
                vy: Math.sin(angle) * bulletSpeed,
                size: 8,
                color: '#ffff00',
                isBossBullet: true,
                damage: BOSS_DAMAGE_PER_SHOT
            });
            spawnExplosion(player.x + PLAYER_SIZE, player.y + PLAYER_SIZE / 2, true);
        }
        
        if (e.code === 'KeyF' && !player.isBossBattle) {
            // Chỉ bắn đạn tank khi không trong boss battle
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
        // Bật tank mode và kích hoạt boss gate ngay lập tức
        player.tankUnlocked = true;
        player.tankModeRemaining = TANK_MODE_DURATION;
        
        // Kích hoạt boss battle ngay lập tức nếu chưa có boss
        if (!player.isBossBattle && !boss) {
            player.tankActivationCount = BOSS_TANK_ACTIVATION_COUNT; // Đảm bảo đủ số lần kích hoạt
            player.isBossBattle = true; // Đặt trạng thái boss battle
            clearSupportEffectsForBoss();
            createBoss(); // Tạo boss ngay lập tức
            
            // Thông báo boss xuất hiện
            const notification = document.createElement('div');
            notification.textContent = 'BOSS XUẤT HIỆN! Bấm F để bắn!';
            notification.style.position = 'fixed';
            notification.style.top = '40%';
            notification.style.left = '50%';
            notification.style.transform = 'translate(-50%, -50%)';
            notification.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '20px';
            notification.style.borderRadius = '10px';
            notification.style.zIndex = '1000';
            notification.style.fontWeight = 'bold';
            notification.style.fontSize = '24px';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 3000);
        }
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
