const GAME_TYPES = {
    patterns: { name: 'Number Patterns', nameSi: 'සංඛ්‍යා රටා' },
    mathPuzzles: { name: 'Math Puzzles', nameSi: 'ගණිත පෙහෙළිකා' },
    mathVerify: { name: 'Math Verification', nameSi: 'නිවැරදි ගණිත ගැටලු පරීක්ෂා කිරීම' },
    calculator: { name: 'Calculator Cube', nameSi: 'Calculator Cube' },
    colorCube: { name: 'Color Cube', nameSi: 'පාට ඝනකය' }
};

// Color Cube game: 6 face colors; Three.js BoxGeometry order: 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
const COLOR_CUBE_PALETTE = [0xe53935, 0x1e88e5, 0x43a047, 0xfdd835, 0xfb8c00, 0x8e24aa];
const COLOR_CUBE_DIRECTIONS = [
    { face: 0, labelSi: 'දකුණේ', labelEn: 'Right' },
    { face: 1, labelSi: 'වම්', labelEn: 'Left' },
    { face: 2, labelSi: 'උඩ', labelEn: 'Top' },
    { face: 3, labelSi: 'යට', labelEn: 'Bottom' },
    { face: 5, labelSi: 'පිටුපස', labelEn: 'Back' }
];
let colorCubeFaceColors = [];
let colorCubeAskedFace = 4;

let scene, camera, renderer, cube;
let score = 0;
let gameActive = false;
let currentAnswer;
let currentGameType = 'patterns';
let isInputLocked = false;
let targetRotation = { x: 0, y: 0, z: 0 };
let randomAnimationMode = true;
let lastFaceIndex = -1;
let questionTimerInterval = null;
let questionTimeLeft = 0; // level time left (seconds)
const LEVEL_TIME_SECONDS = 90;
const QUESTION_TIME = LEVEL_TIME_SECONDS;
const BONUS_THRESHOLD_FAST = 10;
const BONUS_THRESHOLD_QUICK = 5;
const BONUS_FAST = 50;
const BONUS_QUICK = 25;
const GAME_MAX_LEVEL = (typeof NUMBER_PATTERN_QUESTIONS_BY_LEVEL !== 'undefined' && Array.isArray(NUMBER_PATTERN_QUESTIONS_BY_LEVEL))
    ? NUMBER_PATTERN_QUESTIONS_BY_LEVEL.length : 20;
const QUESTIONS_ON_RETRY = 1;
const MAX_SKIPS = 3;
let currentLevel = 1;
let questionInLevel = 0;
let skipsRemaining = MAX_SKIPS;
let isRetryRound = false;
let retryQuestionsDone = 0;
let savedLevel = 1;
let savedQuestionInLevel = 0;
let lastAskedKeys = [];
let askedInCurrentLevel = [];
const MAX_AVOID_REPEAT = 15;
let lastRetryIdx = -1;
var levelUp3xUsedThisGame = false;
let cubeSkinEmissive = 0x000000;
let cubeSkinIntensity = 0;
let glowLights = [];

// Lifeline usage flags per level
let lifeline5050Used = false;
let lifelineExtraTimeUsed = false;
let lifelineSkipUsed = false;

// Keep track of current question data (esp. for patterns)
let currentQuestionData = null;
let currentPatternSkin = null;

// Number Patterns: 4 side faces only. 6 questions → face cycle 0,1,2,3,0,1 (front, right, back, left, front, right).
// BoxGeometry: 4=front(+Z), 0=right(+X), 5=back(-Z), 1=left(-X)
const PATTERNS_FACE_COUNT = 4;
const PATTERNS_FACE_CONFIGS = [
    { materialIndex: 4, x: 0, y: 0, z: 0 },                   // front
    { materialIndex: 0, x: 0, y: -Math.PI / 2, z: 0 },        // right
    { materialIndex: 5, x: 0, y: -Math.PI, z: 0 },            // back
    { materialIndex: 1, x: 0, y: -3 * Math.PI / 2, z: 0 }     // left
];
// Other game types use same 4-face cycle
const QUESTION_FACE_CONFIGS = PATTERNS_FACE_CONFIGS;

var _patternRandomMoveTimeout = null;
var PATTERNS_RANDOM_MOVE_DURATION_MS = 1200;

function init3D() {
    try {
        if (!document.getElementById('canvas-container')) {
            console.error('canvas-container not found');
            return;
        }
            scene = new THREE.Scene();
        scene.background = new THREE.Color(0xfff7ed);

        var v = getViewportSize();
        camera = new THREE.PerspectiveCamera(45, v.w / v.h, 0.1, 1000);
        camera.position.z = 3.85;

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(v.w, v.h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 0.4);
        directional.position.set(5, 5, 5);
        scene.add(directional);

        const glowColors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0xff6b9d, 0xa8e6cf, 0xffd3a5];
        glowLights = [];
        for (let i = 0; i < 6; i++) {
            const light = new THREE.PointLight(glowColors[i], 2, 10);
            const angle = (i / 6) * Math.PI * 2;
            light.position.set(
                Math.cos(angle) * 3,
                Math.sin(angle * 2) * 2,
                Math.sin(angle) * 3
            );
            scene.add(light);
            glowLights.push(light);
        }

        const geometry = new THREE.BoxGeometry(1.05, 1.05, 1.05);
        const materials = Array(6).fill().map(() => new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x000000,
            emissiveIntensity: 0
        }));
        cube = new THREE.Mesh(geometry, materials);
        scene.add(cube);

        enableRandomAnimation();

        window.addEventListener('resize', onWindowResize);
        if (typeof visualViewport !== 'undefined') {
            visualViewport.addEventListener('resize', onWindowResize);
        }
        animate();
    } catch (e) {
        console.error('init3D failed:', e);
        document.body.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif;color:#333">Game failed to load. Please refresh.<br>' + (e.message || '') + '</div>';
    }
}

function getViewportSize() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    if (typeof visualViewport !== 'undefined' && visualViewport.height > 0) {
        h = visualViewport.height;
    }
    return { w: w, h: h };
}
function onWindowResize() {
    if (!camera || !renderer) return;
    var v = getViewportSize();
    camera.aspect = v.w / v.h;
    camera.updateProjectionMatrix();
    renderer.setSize(v.w, v.h);
}

function animate() {
    requestAnimationFrame(animate);
    try {
    const time = Date.now() * 0.001;

    if (cube && scene && camera && renderer) {
        if (randomAnimationMode) {
            cube.position.set(0, 0.25, 0);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.015;
            cube.rotation.z += 0.005;

            const glowIntensity = 0.3 + Math.sin(time * 2) * 0.2;
            const hue = (time * 0.5) % 1;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);

            cube.material.forEach(mat => {
                mat.emissive = color;
                mat.emissiveIntensity = glowIntensity;
            });

            glowLights.forEach((light, i) => {
                const angle = (i / 6) * Math.PI * 2 + time;
                light.position.x = Math.cos(angle) * 3;
                light.position.y = Math.sin(angle * 2) * 2 + Math.sin(time + i) * 0.5;
                light.position.z = Math.sin(angle) * 3;
                light.intensity = 1.5 + Math.sin(time * 2 + i) * 0.8;
            });
        } else {
            const baseSpeed = 0.08;
            cube.rotation.x += (targetRotation.x - cube.rotation.x) * baseSpeed;
            cube.rotation.y += (targetRotation.y - cube.rotation.y) * baseSpeed;
            cube.rotation.z += (targetRotation.z - cube.rotation.z) * baseSpeed;
            cube.position.set(0, 0.25, 0);

            cube.material.forEach(mat => {
                try {
                    if (mat.emissive && typeof mat.emissive.setHex === 'function') {
                        mat.emissive.setHex(cubeSkinEmissive);
                    } else {
                        mat.emissive = new THREE.Color(cubeSkinEmissive);
                    }
                } catch (e) {
                    mat.emissive = new THREE.Color(cubeSkinEmissive);
                }
                mat.emissiveIntensity = cubeSkinIntensity;
            });

            glowLights.forEach(light => {
                light.intensity = 0.3;
            });
        }
    }
    if (renderer && scene && camera) renderer.render(scene, camera);
    } catch (e) {
        console.warn('animate error:', e);
    }
}

function enableRandomAnimation() {
    randomAnimationMode = true;
}

function disableRandomAnimation() {
    randomAnimationMode = false;
}

function notifyScoreUpdate(currentScore) {
    try {
        if (typeof FBInstantBridge !== 'undefined' && FBInstantBridge.isFBInstant()) {
            FBInstantBridge.setLeaderboardScore(currentScore);
        }
        if (typeof scoreUpdate !== 'undefined') {
            scoreUpdate.postMessage(currentScore.toString());
        } else if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('scoreUpdate', currentScore);
        }
    } catch (e) {
        console.log('Error notifying score update: ' + e);
    }
}

function showNormalGameOver(finalScore) {
    document.getElementById('ad-offer-screen').classList.add('hidden');
    document.getElementById('ad-offer-screen').classList.remove('visible');
    document.getElementById('over-screen').classList.remove('hidden');
    document.getElementById('over-screen').classList.add('visible');
    document.getElementById('final-score').innerText = finalScore;
    document.getElementById('iq-msg').innerText = finalScore > 1500 ? "Excellent! You are super smart!" : "Good attempt! Keep practicing.";
}

function notifyGameOver(finalScore) {
    try {
        if (typeof gameOver !== 'undefined') {
            gameOver.postMessage(finalScore.toString());
        } else if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('gameOver', finalScore);
        } else {
            showNormalGameOver(finalScore);
        }
    } catch (e) {
        console.log('Error notifying game over: ' + e);
    }
}

function requestRewardedAd(onSuccess) {
    var isPlayAgain = !onSuccess;
    var btn = document.getElementById(isPlayAgain ? 'btn-watch-ad' : 'btn-watch-ad-skip');
    if (btn && btn.disabled) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }

    function onAdDone() {
        document.getElementById('ad-offer-screen').classList.add('hidden');
        document.getElementById('ad-offer-screen').classList.remove('visible');
        document.getElementById('skip-question-ad-screen').classList.add('hidden');
        document.getElementById('skip-question-ad-screen').classList.remove('visible');
        var playBtn = document.getElementById('btn-watch-ad');
        if (playBtn) { playBtn.disabled = false; playBtn.textContent = 'ඇඩ් එක බලන්න / Watch ad'; }
        var skipBtn = document.getElementById('btn-watch-ad-skip');
        if (skipBtn) { skipBtn.disabled = false; skipBtn.textContent = 'ඇඩ් එක බලන්න / Watch ad'; }
        if (onSuccess) onSuccess(); else doRetry();
    }

    window.rewardedAdWatched = onAdDone;

    if (typeof FBInstantBridge !== 'undefined' && FBInstantBridge.isFBInstant()) {
        FBInstantBridge.showRewardedAd(null, onAdDone, function() { onAdDone(); });
        return;
    }
    if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        window.flutter_inappwebview.callHandler('showRewardedAd');
        return;
    }
    setTimeout(onAdDone, 800);
}

function showSkipQuestionAdOffer(onCancel) {
    if (skipsRemaining <= 0) return;
    window._skipAdIsRetry = false;
    stopQuestionTimer();
    document.getElementById('skip-question-msg').innerHTML = 'ඇඩ් එකක් බලා මෙම ප්‍රශ්නය මගහරින්න.<br>Watch an ad to skip this question.';
    document.getElementById('skip-question-ad-screen').classList.remove('hidden');
    document.getElementById('skip-question-ad-screen').classList.add('visible');
    window._skipAdOnCancel = onCancel || function() {
        document.getElementById('skip-question-ad-screen').classList.add('hidden');
        document.getElementById('skip-question-ad-screen').classList.remove('visible');
        startQuestionTimer();
    };
}

function showSkipQuestionAdOfferWrong() {
    if (skipsRemaining <= 0) {
        endGame();
        return;
    }
    savedLevel = currentLevel;
    savedQuestionInLevel = questionInLevel;
    window._skipAdIsRetry = true;
    document.getElementById('skip-question-msg').innerHTML = 'වැරදියි! ඇඩ් එකක් බලා වෙනත් ප්‍රශ්නයක් ලබා ගන්න.<br>Wrong! Watch an ad to get a different question.';
    document.getElementById('skip-question-ad-screen').classList.remove('hidden');
    document.getElementById('skip-question-ad-screen').classList.add('visible');
    window._skipAdOnCancel = function() {
        window._skipAdIsRetry = false;
        document.getElementById('skip-question-ad-screen').classList.add('hidden');
        document.getElementById('skip-question-ad-screen').classList.remove('visible');
        endGame();
    };
}

function drawMandalaFace(ctx, cx, cy, scale, gold) {
    var s = scale || 1;
    ctx.save();
    ctx.strokeStyle = gold;
    ctx.fillStyle = gold;

    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 240 * s, cy - 240 * s, 480 * s, 480 * s);
    ctx.globalAlpha = 1;

    var drawCorner = function(ox, oy, flipX, flipY) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(flipX, flipY);
        ctx.fillStyle = gold;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(70 * s, 0);
        ctx.quadraticCurveTo(0, 0, 0, 70 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };
    drawCorner(cx - 240 * s, cy - 240 * s, 1, 1);
    drawCorner(cx + 240 * s, cy - 240 * s, -1, 1);
    drawCorner(cx - 240 * s, cy + 240 * s, 1, -1);
    drawCorner(cx + 240 * s, cy + 240 * s, -1, -1);

    ctx.setLineDash([10 * s, 5 * s]);
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, 220 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, 180 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (var i = 0; i < 12; i++) {
        var angle = (i / 12) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, -180 * s);
        ctx.bezierCurveTo(30 * s, -140 * s, -30 * s, -140 * s, 0, -180 * s);
        ctx.strokeStyle = gold;
        ctx.lineWidth = 2 * s;
        ctx.stroke();
        ctx.restore();
    }

    ctx.lineWidth = 4 * s;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 120 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 100 * s, 100 * s, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 100 * s, 100 * s, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 15 * s, 0, Math.PI * 2);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 40 * s, 0, Math.PI * 2);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 1 * s;
    ctx.stroke();
    ctx.restore();
}

function drawLiyawelaCarving(ctx, w, h, borderColor) {
    var cx = w / 2, cy = h / 2;
    var sc = w / 512;
    var col = borderColor || '#5d4037';
    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = Math.max(1, 2 * sc);
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(20 * sc, 20 * sc, w - 40 * sc, h - 40 * sc);
    ctx.globalAlpha = 0.35;
    var drawCorner = function(ox, oy, flipX, flipY) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(flipX, flipY);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(45 * sc, 0);
        ctx.quadraticCurveTo(0, 0, 0, 45 * sc);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.restore();
    };
    drawCorner(20 * sc, 20 * sc, 1, 1);
    drawCorner(w - 20 * sc, 20 * sc, -1, 1);
    drawCorner(20 * sc, h - 20 * sc, 1, -1);
    drawCorner(w - 20 * sc, h - 20 * sc, -1, -1);
    ctx.globalAlpha = 0.25;
    ctx.setLineDash([8 * sc, 4 * sc]);
    ctx.beginPath();
    ctx.arc(cx, cy, 200 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (var i = 0; i < 8; i++) {
        var a = (i / 8) * Math.PI * 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(0, -200 * sc);
        ctx.bezierCurveTo(25 * sc, -160 * sc, -25 * sc, -160 * sc, 0, -200 * sc);
        ctx.stroke();
        ctx.restore();
    }
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = Math.max(1, 2.5 * sc);
    ctx.beginPath();
    ctx.arc(cx, cy, 100 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
}

function createNumberTexture(sequence, missingIdx, skin) {
    if (!sequence || !Array.isArray(sequence) || sequence.length < 4) {
        sequence = [1, 2, 3, 4];
        missingIdx = 0;
    }
    const s = skin || { border: '#e65100', line: '#ffcc80', accent: '#ff6d00', bg: '#fff3e0' };
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    var gold = s.border || '#d4af37';
    ctx.fillStyle = s.bg || '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    var darken = function(hex, amt) {
        if (!hex || hex.length < 7) return '#5d4037';
        var r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
        var g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
        var b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
        return '#' + [r, g, b].map(function(x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    };
    var frameBase = s.border && s.border.length >= 7 ? darken(s.border, 80) : '#5d4037';
    var innerBase = s.bg || '#ffffff';

    const panels = [
        { x: 30, y: 30, w: 211, h: 211, innerBg: innerBase, frameColor: frameBase },
        { x: 271, y: 30, w: 211, h: 211, innerBg: innerBase, frameColor: darken(frameBase, 15) },
        { x: 30, y: 271, w: 211, h: 211, innerBg: innerBase, frameColor: darken(frameBase, 25) },
        { x: 271, y: 271, w: 211, h: 211, innerBg: innerBase, frameColor: frameBase }
    ];
    const positions = [
        { x: 135, y: 135 }, { x: 376, y: 135 },
        { x: 135, y: 376 }, { x: 376, y: 376 }
    ];
    const depth = 4;

    if (s.style === 'mandala') {
        ctx.fillStyle = innerBase;
        ctx.fillRect(0, 0, 512, 512);
        drawMandalaFace(ctx, 256, 256, 512 / 500, gold);
    } else {
        panels.forEach((p, i) => {
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.2)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            ctx.fillStyle = p.frameColor;
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.restore();
            ctx.fillStyle = p.innerBg;
            ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
            ctx.strokeStyle = s.border;
            ctx.lineWidth = 3;
            ctx.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
        });
        drawLiyawelaCarving(ctx, 512, 512, s.border);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var numDepth = s.style === 'mandala' ? 6 : depth;
    sequence.forEach((num, i) => {
        const isMissing = i === missingIdx;
        const txt = String(isMissing ? '?' : num);
        ctx.font = isMissing ? '600 140px Poppins' : '600 115px Poppins';
        if (s.style === 'mandala') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillText(txt, positions[i].x + numDepth, positions[i].y + numDepth);
            ctx.fillStyle = 'rgba(212,175,55,0.4)';
            ctx.fillText(txt, positions[i].x - numDepth * 0.6, positions[i].y - numDepth * 0.6);
            ctx.fillStyle = isMissing ? (s.accent || gold) : gold;
            ctx.fillText(txt, positions[i].x, positions[i].y);
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillText(txt, positions[i].x + depth, positions[i].y + depth);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillText(txt, positions[i].x - depth * 0.5, positions[i].y - depth * 0.5);
            ctx.fillStyle = isMissing ? s.accent : '#1e293b';
            ctx.fillText(txt, positions[i].x, positions[i].y);
        }
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.center.set(0.5, 0.5);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
}

function createAnswerTexture(val) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f97316';
    ctx.font = '900 220px Poppins, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 6;
    ctx.fillText(String(val), canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.center.set(0.5, 0.5);
    return tex;
}

function createEquationTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 512, 512);

    /* මධ්‍යම රූප/ප්‍රස්ථාරය - එක් panel එකක් */
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(60, 120, 392, 220);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(68, 128, 376, 204);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 4;
    ctx.strokeRect(68, 128, 376, 204);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const d = 3;
    ctx.font = '600 75px Poppins';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(text, 256 + d, 256 + d);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(text, 256 - d * 0.5, 256 - d * 0.5);
    ctx.fillStyle = '#1e293b';
    ctx.fillText(text, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.center.set(0.5, 0.5);
    return tex;
}

function createCalculatorTexture(nums, op, result) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);

    const panels = [
        { x: 30, y: 30, w: 211, h: 211 }, { x: 271, y: 30, w: 211, h: 211 },
        { x: 30, y: 271, w: 211, h: 211 }, { x: 271, y: 271, w: 211, h: 211 }
    ];
    const positions = [
        { x: 135, y: 135 }, { x: 376, y: 135 },
        { x: 135, y: 376 }, { x: 376, y: 376 }
    ];
    const d = 3;

    panels.forEach((p, i) => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.restore();
        ctx.fillStyle = i % 2 ? '#fafafa' : '#ffffff';
        ctx.fillRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 3;
        ctx.strokeRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16);
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 110px Poppins';
    nums.forEach((num, i) => {
        const txt = String(num);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText(txt, positions[i].x + d, positions[i].y + d);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(txt, positions[i].x - d * 0.5, positions[i].y - d * 0.5);
        ctx.fillStyle = '#1e293b';
        ctx.fillText(txt, positions[i].x, positions[i].y);
    });

    ctx.font = '600 75px Poppins';
    const opTxt = op + ' = ?';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(opTxt, 256 + d, 430 + d);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(opTxt, 256 - d * 0.5, 430 - d * 0.5);
    ctx.fillStyle = '#f97316';
    ctx.fillText(opTxt, 256, 430);

    const tex = new THREE.CanvasTexture(canvas);
    tex.center.set(0.5, 0.5);
    return tex;
}

function questionKey(type, data) {
    if (type === 'patterns') return 'p:' + data.seq.join(',') + ':' + data.mIdx;
    if (type === 'mathPuzzles' || type === 'mathVerify') return 'm:' + data.eq;
    if (type === 'calculator') return 'c:' + data.nums.join(',') + ':' + data.op;
    return 'u:' + Math.random();
}

function generatePattern() {
    let q;
    if (isRetryRound && typeof RETRY_PATTERN_QUESTIONS !== 'undefined' && RETRY_PATTERN_QUESTIONS.length > 0) {
        const pool = RETRY_PATTERN_QUESTIONS;
        let idx;
        if (pool.length > 1 && lastRetryIdx >= 0) {
            for (let t = 0; t < 20; t++) {
                idx = Math.floor(Math.random() * pool.length);
                if (idx !== lastRetryIdx) break;
            }
        } else {
            idx = Math.floor(Math.random() * pool.length);
        }
        lastRetryIdx = idx;
        q = pool[idx];
    } else if (typeof NUMBER_PATTERN_QUESTIONS_BY_LEVEL !== 'undefined' && NUMBER_PATTERN_QUESTIONS_BY_LEVEL.length > 0) {
        const levelIdx = Math.min(currentLevel - 1, NUMBER_PATTERN_QUESTIONS_BY_LEVEL.length - 1);
        const levelQs = NUMBER_PATTERN_QUESTIONS_BY_LEVEL[levelIdx];
        var alreadyInLevel = function(i) {
            var k = 'p:' + levelQs[i].seq.join(',') + ':' + levelQs[i].mIdx;
            return askedInCurrentLevel.indexOf(k) >= 0;
        };
        var available = levelQs.map(function(_, i) { return i; }).filter(function(i) { return !alreadyInLevel(i); });
        var qIdx = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : Math.floor(Math.random() * levelQs.length);
        q = levelQs[qIdx];
    }
    if (q) {
        return { type: 'patterns', seq: q.seq, mIdx: q.mIdx, ans: q.seq[q.mIdx] };
    }
    const types = ['add', 'sub', 'double'];
    const type = types[Math.floor(Math.random() * types.length)];
    let seq = [];
    if (type === 'add') {
        let start = Math.floor(Math.random() * 10) + 1;
        let step = Math.floor(Math.random() * 5) + 1;
        for(let i=0; i<4; i++) seq.push(start + (i * step));
    } else if (type === 'sub') {
        let step = Math.floor(Math.random() * 3) + 1;
        let start = 15 + Math.floor(Math.random() * 10);
        for(let i=0; i<4; i++) seq.push(start - (i * step));
    } else {
        let start = Math.floor(Math.random() * 4) + 1;
        for(let i=0; i<4; i++) seq.push(start * Math.pow(2, i));
    }
    const mIdx = Math.floor(Math.random() * 4);
    return { type: 'patterns', seq, mIdx, ans: seq[mIdx] };
}

function generateMathPuzzle() {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;
    if (op === '+') {
        a = Math.floor(Math.random() * 15) + 2;
        ans = Math.floor(Math.random() * 20) + a + 2;
        b = ans - a;
    } else if (op === '-') {
        ans = Math.floor(Math.random() * 15) + 2;
        b = Math.floor(Math.random() * 10) + 1;
        a = ans + b;
    } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        ans = a * b;
    }
    const eq = a + ' ' + op + ' ? = ' + ans;
    return { type: 'mathPuzzles', eq, ans: b };
}

function generateMathVerify() {
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, correct, wrong;
    if (op === '+') {
        a = Math.floor(Math.random() * 15) + 2;
        b = Math.floor(Math.random() * 10) + 2;
        correct = a + b;
        wrong = correct + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
    } else if (op === '-') {
        a = Math.floor(Math.random() * 20) + 10;
        b = Math.floor(Math.random() * 8) + 2;
        correct = a - b;
        wrong = correct + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
    } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        correct = a * b;
        wrong = correct + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
    }
    const isCorrect = Math.random() > 0.5;
    const displayAns = isCorrect ? correct : wrong;
    const eq = a + ' ' + op + ' ' + b + ' = ' + displayAns;
    return { type: 'mathVerify', eq, ans: isCorrect };
}

function generateCalculator() {
    const useSum = Math.random() > 0.5;
    const nums = useSum
        ? [1,2,3,4].map(() => Math.floor(Math.random() * 12) + 1)
        : [1,2,3,4].map(() => Math.floor(Math.random() * 6) + 1);
    const ans = useSum ? nums.reduce((a,b) => a+b, 0) : nums.reduce((a,b) => a*b, 1);
    return { type: 'calculator', nums, op: useSum ? '+' : '×', ans };
}

function generatePuzzle() {
    if (questionInLevel === 0) askedInCurrentLevel = [];
    var avoidKeys = askedInCurrentLevel;
    var data;
    if (currentGameType === 'patterns') {
        data = generatePattern();
    } else if (currentGameType === 'mathPuzzles') {
        for (var attempt = 0; attempt < 50; attempt++) {
            data = generateMathPuzzle();
            var key = questionKey('mathPuzzles', data);
            if (avoidKeys.indexOf(key) < 0) break;
        }
        data = data || generateMathPuzzle();
    } else if (currentGameType === 'mathVerify') {
        for (var attempt = 0; attempt < 50; attempt++) {
            data = generateMathVerify();
            var key = questionKey('mathVerify', data);
            if (avoidKeys.indexOf(key) < 0) break;
        }
        data = data || generateMathVerify();
    } else if (currentGameType === 'calculator') {
        for (var attempt = 0; attempt < 50; attempt++) {
            data = generateCalculator();
            var key = questionKey('calculator', data);
            if (avoidKeys.indexOf(key) < 0) break;
        }
        data = data || generateCalculator();
    } else {
        data = generatePattern();
    }
    var key = questionKey(data.type, data);
    askedInCurrentLevel.push(key);
    lastAskedKeys.push(key);
    if (lastAskedKeys.length > MAX_AVOID_REPEAT) lastAskedKeys.shift();
    return data;
}

var _nextQuestionRetries = 0;

function startColorCubeRound() {
    if (!cube || !cube.material) {
        setTimeout(startColorCubeRound, 150);
        return;
    }
    var palette = COLOR_CUBE_PALETTE.slice();
    for (var i = palette.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = palette[i]; palette[i] = palette[j]; palette[j] = t;
    }
    colorCubeFaceColors = palette.slice(0, 6);
    for (var f = 0; f < 6; f++) {
        var el = document.getElementById('net-face-' + f);
        if (el) el.style.backgroundColor = '#' + ('000000' + colorCubeFaceColors[f].toString(16)).slice(-6);
    }
    document.getElementById('color-cube-net-screen').classList.remove('hidden');
    document.getElementById('color-cube-question').classList.add('hidden');
    document.getElementById('options-grid').innerHTML = '';
    document.getElementById('options-grid').className = '';
    var btn = document.getElementById('btn-net-continue');
    if (btn) btn.onclick = function() { foldAndShowQuestion(); };
}

function foldAndShowQuestion() {
    document.getElementById('color-cube-net-screen').classList.add('hidden');
    if (!cube || !cube.material || colorCubeFaceColors.length < 6) return;
    for (var i = 0; i < 6; i++) {
        cube.material[i].color.setHex(colorCubeFaceColors[i]);
        cube.material[i].map = null;
        cube.material[i].emissive.setHex(0x000000);
        cube.material[i].emissiveIntensity = 0;
    }
    targetRotation.x = 0; targetRotation.y = 0; targetRotation.z = 0;
    disableRandomAnimation();
    cubeSkinEmissive = 0;
    cubeSkinIntensity = 0;
    var dirs = COLOR_CUBE_DIRECTIONS.slice();
    dirs.sort(function() { return Math.random() - 0.5; });
    var chosen = dirs[0];
    colorCubeAskedFace = chosen.face;
    currentAnswer = colorCubeFaceColors[colorCubeAskedFace];
    currentQuestionData = { type: 'colorCube', ans: currentAnswer, askedFace: colorCubeAskedFace };
    var correctHex = colorCubeFaceColors[colorCubeAskedFace];
    var wrongHexes = colorCubeFaceColors.filter(function(_, idx) { return idx !== colorCubeAskedFace; });
    var options = [correctHex];
    for (var k = 0; options.length < 4 && k < 20; k++) {
        var w = wrongHexes[Math.floor(Math.random() * wrongHexes.length)];
        if (options.indexOf(w) === -1) options.push(w);
    }
    while (options.length < 4) options.push(wrongHexes[options.length % wrongHexes.length]);
    options.sort(function() { return Math.random() - 0.5; });
    var qEl = document.getElementById('color-cube-question');
    if (qEl) {
        qEl.textContent = chosen.labelSi + ' මුහුණතේ පාට කුමක්ද? / ' + chosen.labelEn + ' face color?';
        qEl.classList.remove('hidden');
    }
    var grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    grid.className = 'columns-2 color-cube-options';
    options.forEach(function(hex) {
        var btn = document.createElement('button');
        btn.className = 'option-btn color-cube-option';
        btn.style.backgroundColor = '#' + ('000000' + hex.toString(16)).slice(-6);
        btn.style.color = (hex === 0xfdd835) ? '#1a1a1a' : '#fff';
        btn.dataset.hex = String(hex);
        btn.onclick = function() { handleAnswer(hex, btn); };
        grid.appendChild(btn);
    });
    document.getElementById('game-controls').classList.remove('hidden');
    document.getElementById('game-controls').classList.add('visible');
    startQuestionTimer();
}

/**
 * Number Patterns: completely 2D – show pattern on a card overlay, cube has no texture.
 */
function showNumberPatternCard(seq, missingIdx) {
    var card = document.getElementById('number-pattern-card');
    if (!card) return;
    if (!seq || !Array.isArray(seq) || seq.length < 4) seq = [1, 2, 3, 4];
    if (typeof missingIdx !== 'number' || missingIdx < 0 || missingIdx > 3) missingIdx = 0;
    for (var i = 0; i < 4; i++) {
        var cell = document.getElementById('pattern-cell-' + i);
        if (cell) {
            var val = i === missingIdx ? '?' : (seq[i] != null && seq[i] !== '' ? String(seq[i]) : '?');
            cell.textContent = val;
            cell.classList.toggle('missing', i === missingIdx);
        }
    }
    card.style.display = 'flex';
    card.style.visibility = 'visible';
    card.classList.remove('hidden');
    requestAnimationFrame(function() {
        if (card && currentGameType === 'patterns') {
            card.style.display = 'flex';
            card.classList.remove('hidden');
        }
    });
}
function hideNumberPatternCard() {
    var card = document.getElementById('number-pattern-card');
    if (card) {
        card.style.display = 'none';
        card.classList.add('hidden');
    }
}
function updateNumberPatternCardAnswer(val) {
    var card = document.getElementById('number-pattern-card');
    if (!card || card.classList.contains('hidden')) return;
    for (var i = 0; i < 4; i++) {
        var cell = document.getElementById('pattern-cell-' + i);
        if (cell && cell.classList.contains('missing')) {
            cell.textContent = String(val);
            cell.classList.remove('missing');
            return;
        }
    }
}

function setupNumberPatternsQuestion(data) {
    if (_patternRandomMoveTimeout) {
        clearTimeout(_patternRandomMoveTimeout);
        _patternRandomMoveTimeout = null;
    }
    if (!cube || !cube.material || cube.material.length >= 6) {
        for (var m = 0; m < 6; m++) cube.material[m].map = null;
    }
    if (camera) {
        camera.position.set(0, 0, 3.85);
        camera.lookAt(0, 0.25, 0);
    }
    var levelForSkin = isRetryRound ? savedLevel : currentLevel;
    var skin = null;
    var sd = typeof GameStorage !== 'undefined' ? GameStorage.read() : {};
    if (sd.selectedSkinId && typeof getSkinById === 'function') skin = getSkinById(sd.selectedSkinId);
    if (!skin && typeof getSkinForLevel === 'function') skin = getSkinForLevel(levelForSkin);
    currentPatternSkin = skin || null;
    if (typeof applyCubeSkin === 'function') applyCubeSkin(levelForSkin);
    disableRandomAnimation();
    var qIdx = isRetryRound ? savedQuestionInLevel : questionInLevel;
    lastFaceIndex = qIdx % PATTERNS_FACE_COUNT;
    targetRotation.x = 0;
    targetRotation.y = (qIdx % 4) * (-Math.PI / 2);
    targetRotation.z = 0;
    if (cube) {
        cube.rotation.x = 0;
        cube.rotation.y = targetRotation.y;
        cube.rotation.z = 0;
    }
    var seq = (data && data.seq && Array.isArray(data.seq)) ? data.seq : [1, 2, 3, 4];
    var mIdx = (data && typeof data.mIdx === 'number' && data.mIdx >= 0 && data.mIdx <= 3) ? data.mIdx : 0;
    showNumberPatternCard(seq, mIdx);
}

function nextQuestion() {
    if (currentGameType === 'colorCube') {
        startColorCubeRound();
        return;
    }
    if (!cube || !cube.material) {
        _nextQuestionRetries = (_nextQuestionRetries || 0) + 1;
        if (_nextQuestionRetries > 50) {
            console.error('Cube failed to initialize');
            document.body.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif;color:#c00">Game could not start. Please refresh.</div>';
            return;
        }
        setTimeout(function() { nextQuestion(); }, 150);
        return;
    }
    _nextQuestionRetries = 0;
    isInputLocked = false;
    document.getElementById('level-val').innerText = String(currentLevel);
    const progEl = document.getElementById('progress-val');
    if (isRetryRound) {
        progEl.innerText = (savedQuestionInLevel + 1) + '/' + QUESTIONS_PER_LEVEL;
    } else {
        progEl.innerText = (questionInLevel + 1) + '/' + QUESTIONS_PER_LEVEL;
    }
    updateSkipButton();

    const data = generatePuzzle();
    if (!data || data.ans === undefined) {
        console.warn('Invalid puzzle data', data);
        setTimeout(nextQuestion, 200);
        return;
    }
    currentAnswer = data.ans;
    currentQuestionData = data;

    if (currentGameType === 'patterns') {
        setupNumberPatternsQuestion(data);
    } else {
        cubeSkinEmissive = 0x000000;
        cubeSkinIntensity = 0;
        var texture;
        if (data.type === 'mathPuzzles') texture = createEquationTexture(data.eq);
        else if (data.type === 'mathVerify') texture = createEquationTexture(data.eq);
        else if (data.type === 'calculator') texture = createCalculatorTexture(data.nums, data.op, data.ans);
        else texture = createNumberTexture(data.seq, data.mIdx);
        if (cube && cube.material && cube.material.length >= 6) {
            var qIdx = isRetryRound ? savedQuestionInLevel : questionInLevel;
            var cfg = QUESTION_FACE_CONFIGS[qIdx % QUESTION_FACE_CONFIGS.length];
            var matIndex = cfg.materialIndex != null ? cfg.materialIndex : 4;
            var mat = cube.material[matIndex] || cube.material[0];
            mat.map = texture;
            disableRandomAnimation();
            targetRotation.x = cfg.x || 0;
            targetRotation.y = cfg.y || 0;
            targetRotation.z = cfg.z || 0;
            lastFaceIndex = qIdx % QUESTION_FACE_CONFIGS.length;
            if (camera) {
                camera.position.set(0, 0, 3.85);
                camera.lookAt(0, 0.25, 0);
            }
        }
    }

    renderOptions(data);
    startQuestionTimer();
}

function startQuestionTimer() {
    if (questionTimerInterval) return;
    updateSkipButton();
    updateQuestionTimer();
    questionTimerInterval = setInterval(() => {
        questionTimeLeft -= 0.1;
        updateQuestionTimer();
        if (questionTimeLeft <= 0) {
            clearInterval(questionTimerInterval);
            endGame();
        }
    }, 100);
}

function stopQuestionTimer() {
    clearInterval(questionTimerInterval);
}

function applyCubeSkin(level) {
    if (!cube) return;
    var s;
    var d = typeof GameStorage !== 'undefined' ? GameStorage.read() : {};
    var sel = d.selectedSkinId;
    if (sel && typeof getSkinById === 'function') {
        s = getSkinById(sel);
    } else if (typeof getSkinForLevel === 'function') {
        s = getSkinForLevel(level);
    } else return;
    cubeSkinEmissive = parseInt(s.border.replace('#', ''), 16);
    cubeSkinIntensity = 0.25;
}

function updateSkipButton() {
    const btn5050 = document.getElementById('btn-5050');
    const btnExtra = document.getElementById('btn-extra-time');
    const btnSkipHard = document.getElementById('btn-skip-hard');
    if (btn5050) btn5050.disabled = lifeline5050Used;
    if (btnExtra) btnExtra.disabled = lifelineExtraTimeUsed;
    if (btnSkipHard) btnSkipHard.disabled = lifelineSkipUsed;
}

function updateQuestionTimer() {
    const el = document.getElementById('question-timer-text');
    const fill = document.getElementById('question-timer-fill');
    if (!el || !fill) return;
    el.innerText = Math.ceil(Math.max(0, questionTimeLeft));
    fill.style.width = `${(questionTimeLeft / QUESTION_TIME) * 100}%`;
    if (questionTimeLeft < 5) el.classList.add('warning');
    else el.classList.remove('warning');
}

function renderOptions(data) {
    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    grid.className = '';

    if (data.type === 'mathVerify') {
        grid.classList.add('columns-1');
        const opts = [
            { val: true, label: 'නිවැරදි (True)' },
            { val: false, label: 'වැරදි (False)' }
        ];
        opts.sort(() => Math.random() - 0.5);
        opts.forEach(o => {
            const btn = document.createElement('button');
            btn.className = "option-btn";
            btn.innerText = o.label;
            btn.onclick = () => handleAnswer(o.val, btn);
            grid.appendChild(btn);
        });
        return;
    }

    grid.classList.add('columns-2');
    const correct = typeof data.ans === 'number' ? data.ans : 0;
    let choices = [correct];
    for (let attempts = 0; choices.length < 4 && attempts < 50; attempts++) {
        let offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() > 0.5 ? 1 : -1);
        let val = correct + offset;
        if (val >= 0 && !choices.includes(val)) choices.push(val);
    }
    while (choices.length < 4) {
        choices.push(correct + choices.length);
    }
    choices.sort(() => Math.random() - 0.5);

    choices.forEach(val => {
        const btn = document.createElement('button');
        btn.className = "option-btn";
        btn.innerText = val;
        btn.onclick = () => handleAnswer(val, btn);
        grid.appendChild(btn);
    });
}

function use5050Lifeline() {
    if (lifeline5050Used) return;
    const grid = document.getElementById('options-grid');
    if (!grid) return;
    const buttons = Array.prototype.slice.call(grid.querySelectorAll('.option-btn'));
    if (buttons.length < 3) return;
    const wrongButtons = buttons.filter(function(b) {
        if (currentGameType === 'colorCube' && b.dataset.hex != null) {
            return parseInt(b.dataset.hex, 10) !== currentAnswer;
        }
        return parseFloat(b.innerText) !== currentAnswer;
    });
    if (wrongButtons.length <= 1) return;
    wrongButtons.sort(function() { return Math.random() - 0.5; });
    wrongButtons.slice(0, 2).forEach(function(b) {
        b.disabled = true;
        b.style.opacity = '0.4';
    });
    lifeline5050Used = true;
    updateSkipButton();
}

function useExtraTimeLifeline() {
    if (lifelineExtraTimeUsed) return;
    questionTimeLeft = Math.min(QUESTION_TIME, questionTimeLeft + 5);
    updateQuestionTimer();
    lifelineExtraTimeUsed = true;
    updateSkipButton();
}

function useSkipHardLifeline() {
    if (lifelineSkipUsed) return;
    lifelineSkipUsed = true;
    updateSkipButton();
    stopQuestionTimer();
    advanceAsCorrect(true, questionTimeLeft);
}

function advanceAsCorrect(fromSkip, timeLeft) {
    if (fromSkip) {
        skipsRemaining--;
        updateSkipButton();
    }
    let points = 100;
    let bonus = 0;
    if (!fromSkip && timeLeft != null && timeLeft > 0) {
        if (timeLeft >= BONUS_THRESHOLD_FAST) { bonus = BONUS_FAST; points += BONUS_FAST; }
        else if (timeLeft >= BONUS_THRESHOLD_QUICK) { bonus = BONUS_QUICK; points += BONUS_QUICK; }
    }
    score += points;
    document.getElementById('score-val').innerText = score;
    const bonusEl = document.getElementById('score-bonus');
    if (bonusEl && bonus > 0) {
        bonusEl.textContent = ' +' + bonus + '!';
        bonusEl.classList.remove('hidden');
        bonusEl.classList.add('score-anim');
        setTimeout(() => { bonusEl.classList.add('hidden'); bonusEl.classList.remove('score-anim'); bonusEl.textContent = ''; }, 1200);
    }
    document.getElementById('score-val').classList.add('score-anim');
    notifyScoreUpdate(score);
    const bestScoreEl = document.getElementById('best-score-val');
    const currentBest = parseInt(bestScoreEl.innerText) || 0;
    if (score > currentBest) {
        bestScoreEl.innerText = score;
        bestScoreEl.classList.add('score-anim');
        GameStorage.write({ bestScore: score });
        setTimeout(() => bestScoreEl.classList.remove('score-anim'), 400);
    }
    // Mark current face for this question as correct (6 faces per level)
    var faceIdx = isRetryRound ? savedQuestionInLevel : questionInLevel;
    markLevelFaceCorrect(faceIdx);

    setTimeout(() => {
        document.getElementById('score-val').classList.remove('score-anim');
        if (isRetryRound) {
            isRetryRound = false;
            questionInLevel = savedQuestionInLevel + 1;
            currentLevel = savedLevel;
            if (questionInLevel >= QUESTIONS_PER_LEVEL) {
                currentLevel++;
                questionInLevel = 0;
                GameStorage.write({ maxLevel: currentLevel });
                if (currentLevel > GAME_MAX_LEVEL) {
                    showGameComplete();
                    return;
                }
                showLevelUpCelebration(currentLevel);
            } else {
                nextQuestion();
            }
        } else {
            questionInLevel++;
            if (questionInLevel >= QUESTIONS_PER_LEVEL) {
                currentLevel++;
                questionInLevel = 0;
                GameStorage.write({ maxLevel: currentLevel });
                if (currentLevel > GAME_MAX_LEVEL) {
                    showGameComplete();
                    return;
                }
                showLevelUpCelebration(currentLevel);
            } else {
                nextQuestion();
            }
        }
    }, 400);
}

function showGameComplete() {
    gameActive = false;
    stopQuestionTimer();
    var d = GameStorage.read();
    GameStorage.write({
        bestScore: Math.max(d.bestScore || 0, score),
        maxLevel: GAME_MAX_LEVEL,
        totalScore: (d.totalScore || 0) + score,
        lastGameScore: score,
        coins: (d.coins || 0) + Math.floor(score / 50)
    });
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-controls').classList.add('hidden');
    document.getElementById('over-screen').classList.remove('hidden');
    document.getElementById('over-screen').classList.add('visible');
    document.getElementById('final-score').innerText = score;
    document.getElementById('iq-msg').innerText = 'සාර්ථකයි! ඔබ සියලු මට්ටම් සම්පූර්ණ කළා!';
}

function handleAnswer(val, btn) {
    if (isInputLocked) return;
    isInputLocked = true;

    if (val === currentAnswer) {
        const timeLeft = questionTimeLeft;
        stopQuestionTimer();
        btn.classList.add('correct');
        showAnswerOnCube(val);
        setTimeout(function() {
            advanceAsCorrect(false, timeLeft);
        }, 600);
    } else {
        stopQuestionTimer();
        btn.classList.add('wrong');
        setTimeout(function() {
            endGame();
        }, 500);
    }
}

var GIFT_COOLDOWNS = [2, 30, 60];
function awardGiftOnLevelComplete() {
    var d = GameStorage.read();
    var slots = d.giftSlots || [];
    if (slots.length >= 3) return;
    slots.push({ obtainedAt: Date.now() });
    GameStorage.write({ giftSlots: slots });
}
var LEVEL_UP_COINS = 8;
function showLevelUpCelebration(newLevel) {
    if (newLevel > GAME_MAX_LEVEL) {
        showGameComplete();
        return;
    }
    awardGiftOnLevelComplete();
    renderGifts();
    var d = GameStorage.read();
    var baseCoins = LEVEL_UP_COINS;
    GameStorage.write({ coins: (d.coins || 0) + baseCoins });
    var overlay = document.getElementById('level-up-overlay');
    var container = document.getElementById('confetti-container');
    var numEl = document.getElementById('level-up-num');
    var coinsValEl = document.getElementById('level-up-coins-val');
    var adBtn = document.getElementById('btn-level-up-ad');
    var nextBtn = document.getElementById('btn-next-level');
    if (!overlay || !container || !numEl) return;
    numEl.innerText = String(newLevel);
    if (coinsValEl) coinsValEl.innerText = String(baseCoins);
    if (adBtn) {
        adBtn.disabled = false;
        adBtn.style.display = levelUp3xUsedThisGame ? 'none' : '';
    }
    container.innerHTML = '';
    var colors = ['#f97316', '#dc2626', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6'];
    for (var i = 0; i < 60; i++) {
        var p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = Math.random() * 100 + '%';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animation = 'confetti-fall ' + (2 + Math.random() * 1.5) + 's linear ' + (Math.random() * 0.5) + 's forwards';
        container.appendChild(p);
    }
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');

    function goNextLevel() {
        overlay.classList.add('hidden');
        overlay.classList.remove('visible');
        container.innerHTML = '';
        resetLevelFaces();
        questionTimeLeft = LEVEL_TIME_SECONDS;
        clearInterval(questionTimerInterval);
        questionTimerInterval = null;
        nextQuestion();
    }
    if (nextBtn) nextBtn.onclick = function() { goNextLevel(); };
    if (adBtn && !levelUp3xUsedThisGame) {
        adBtn.onclick = function() {
            if (adBtn.disabled) return;
            levelUp3xUsedThisGame = true;
            adBtn.disabled = true;
            function afterCoinsAwarded() {
                var dd = GameStorage.read();
                var extra = (LEVEL_UP_COINS * 3) - LEVEL_UP_COINS;
                GameStorage.write({ coins: (dd.coins || 0) + extra });
                if (coinsValEl) coinsValEl.innerText = '24';
                showLevelUpCoinScatter(adBtn);
                setTimeout(function() {
                    adBtn.style.display = 'none';
                }, 1150);
            }
            if (typeof FBInstantBridge !== 'undefined' && FBInstantBridge.showRewardedAd) {
                FBInstantBridge.showRewardedAd('level_up_3x', afterCoinsAwarded, function() { levelUp3xUsedThisGame = false; adBtn.disabled = false; });
            } else {
                afterCoinsAwarded();
            }
        };
    }
}

function showLevelUpCoinScatter(originButton) {
    var container = document.getElementById('level-up-coin-scatter');
    if (!container || !originButton) return;
    container.innerHTML = '';
    var overlay = document.getElementById('level-up-overlay');
    var overlayRect = overlay ? overlay.getBoundingClientRect() : { left: 0, top: 0 };
    var btnRect = originButton.getBoundingClientRect();
    var centerX = (btnRect.left - overlayRect.left) + btnRect.width / 2;
    var centerY = (btnRect.top - overlayRect.top) + btnRect.height / 2;
    var numCoins = 18;
    for (var i = 0; i < numCoins; i++) {
        var angle = (i / numCoins) * Math.PI * 2 + Math.random() * 0.5;
        var dist = 60 + Math.random() * 80;
        var tx = Math.cos(angle) * dist;
        var ty = Math.sin(angle) * dist - 30;
        var el = document.createElement('div');
        el.className = 'coin-scatter-piece';
        el.style.left = centerX + 'px';
        el.style.top = centerY + 'px';
        el.style.setProperty('--tx', tx + 'px');
        el.style.setProperty('--ty', ty + 'px');
        el.style.animationDelay = (Math.random() * 0.1) + 's';
        container.appendChild(el);
    }
    setTimeout(function() { container.innerHTML = ''; }, 1300);
}

const PRESS_DELAY = 180;
function doAfterPress(fn) { setTimeout(fn, PRESS_DELAY); }

function goToGame(typeId) {
    currentGameType = typeId || 'patterns';
    const g = GAME_TYPES[currentGameType];
    document.getElementById('selected-game-name').innerText = g ? g.nameSi + ' / ' + g.name : '';
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

function startGame() {
    _nextQuestionRetries = 0;
    score = 0;
    const saved = typeof GameStorage !== 'undefined' ? GameStorage.read() : { maxLevel: 1 };
    currentLevel = Math.max(1, saved.maxLevel || 1);
    questionInLevel = 0;
    skipsRemaining = MAX_SKIPS;
    lifeline5050Used = false;
    lifelineExtraTimeUsed = false;
    lifelineSkipUsed = false;
    isRetryRound = false;
    retryQuestionsDone = 0;
    gameActive = true;
    lastFaceIndex = -1;
    lastAskedKeys = [];
    askedInCurrentLevel = [];
    lastRetryIdx = -1;
    levelUp3xUsedThisGame = false;
    questionTimeLeft = LEVEL_TIME_SECONDS;
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
    disableRandomAnimation();

    document.getElementById('score-val').innerText = "0";
    document.getElementById('level-val').innerText = String(currentLevel);
    document.getElementById('progress-val').innerText = "1/" + QUESTIONS_PER_LEVEL;
    resetLevelFaces();
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('skip-question-ad-screen').classList.add('hidden');
    document.getElementById('skip-question-ad-screen').classList.remove('visible');
    document.getElementById('over-screen').classList.add('hidden');
    document.getElementById('over-screen').classList.remove('visible');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('hud').classList.add('visible');
    document.getElementById('game-controls').classList.remove('hidden');
    document.getElementById('game-controls').classList.add('visible');
    updateSkipButton();

    nextQuestion();
}

function endGame() {
    gameActive = false;
    stopQuestionTimer();
    if (_patternRandomMoveTimeout) {
        clearTimeout(_patternRandomMoveTimeout);
        _patternRandomMoveTimeout = null;
    }
    savedLevel = currentLevel;
    savedQuestionInLevel = questionInLevel;
    const d = GameStorage.read();
    var updates = { totalScore: (d.totalScore || 0) + score, lastGameScore: score };
    if (score > d.bestScore) updates.bestScore = score;
    updates.coins = (d.coins || 0) + Math.floor(score / 50);
    GameStorage.write(updates);
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('game-controls').classList.add('hidden');
    document.getElementById('game-controls').classList.remove('visible');
    var netEl = document.getElementById('color-cube-net-screen');
    if (netEl) netEl.classList.add('hidden');
    var qEl = document.getElementById('color-cube-question');
    if (qEl) qEl.classList.add('hidden');
    hideNumberPatternCard();

    document.getElementById('skip-question-ad-screen').classList.add('hidden');
    document.getElementById('skip-question-ad-screen').classList.remove('visible');
    document.getElementById('ad-offer-score').innerText = score;
    document.getElementById('ad-offer-screen').classList.remove('hidden');
    document.getElementById('ad-offer-screen').classList.add('visible');
    document.getElementById('over-screen').classList.add('hidden');
    document.getElementById('over-screen').classList.remove('visible');
    updateAdOfferRetryUI();

    if (typeof gameOver !== 'undefined') {
        gameOver.postMessage(score.toString());
    } else if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
        window.flutter_inappwebview.callHandler('gameOver', score);
    }
}

function updateAdOfferRetryUI() {
    const btn = document.getElementById('btn-watch-ad');
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'ඇඩ් එක බලන්න / Watch ad';
    }
}

function doRetry() {
    isRetryRound = true;
    retryQuestionsDone = 0;
    document.getElementById('ad-offer-screen').classList.add('hidden');
    document.getElementById('ad-offer-screen').classList.remove('visible');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('hud').classList.add('visible');
    document.getElementById('game-controls').classList.remove('hidden');
    document.getElementById('game-controls').classList.add('visible');
    if (currentGameType === 'colorCube') {
        startColorCubeRound();
    } else {
        nextQuestion();
    }
}

var _lastHomeScore = 0;
var _lastHomeIQ = null;
var MAX_METER_SCORE = 10000;
var MIN_IQ = 80;
var MAX_IQ = 150;

/* Level faces meter (6 questions per level) */
var levelFaces = [];
var LEVEL_FACES_COUNT = 6;

function initLevelFaces() {
    var container = document.getElementById('level-faces');
    if (!container) return;
    container.innerHTML = '';
    levelFaces = [];
    for (var i = 0; i < LEVEL_FACES_COUNT; i++) {
        var face = document.createElement('div');
        face.className = 'level-face';
        var span = document.createElement('span');
        span.textContent = '?';
        face.appendChild(span);
        container.appendChild(face);
        levelFaces.push(face);
    }
}

function resetLevelFaces() {
    if (!levelFaces || levelFaces.length === 0) initLevelFaces();
    for (var i = 0; i < levelFaces.length; i++) {
        var face = levelFaces[i];
        if (!face) continue;
        face.classList.remove('correct');
        if (face.firstChild) face.firstChild.textContent = '?';
    }
}

function markLevelFaceCorrect(idx) {
    if (!levelFaces || levelFaces.length === 0) return;
    if (idx < 0 || idx >= levelFaces.length) return;
    var face = levelFaces[idx];
    if (!face) return;
    face.classList.add('correct');
    if (face.firstChild) face.firstChild.textContent = String(idx + 1);
}

function showAnswerOnCube(val) {
    if (currentGameType === 'colorCube') return;
    if (currentGameType === 'patterns') {
        updateNumberPatternCardAnswer(val);
        return;
    }
    if (!cube || !cube.material || cube.material.length < 6 || typeof THREE === 'undefined') return;
    var qIdx = isRetryRound ? savedQuestionInLevel : questionInLevel;
    var faceIdx = lastFaceIndex >= 0 ? lastFaceIndex : qIdx % QUESTION_FACE_CONFIGS.length;
    var cfg = QUESTION_FACE_CONFIGS[faceIdx];
    if (!cfg) return;
    var matIndex = cfg.materialIndex != null ? cfg.materialIndex : 4;
    var mat = cube.material[matIndex] || cube.material[0];
    var tex = createAnswerTexture(val);
    mat.map = tex;
}

/**
 * IQ ගණනය: මීට පෙර game එකේ ලකුණ (lastGameScore) මත පදනම්ව
 * සූත්‍රය: IQ = 80 + (ලකුණු ÷ 25), උපරිම 150
 * උදා: 250→90, 500→100, 1000→120, 1750+→150
 * IQ වැඩි හෝ අඩු විය හැක (අවසාන game එකේ ලකුණ අනුව)
 */
function scoreToIQ(score) {
    if (!score || score <= 0) return null;
    var iq = 80 + Math.min(70, Math.floor(score / 25));
    return Math.min(150, iq);
}
function animateMeterValue(el, fromVal, toVal, duration, suffix) {
    if (!el) return;
    suffix = suffix || '';
    var start = Date.now();
    function tick() {
        var t = Math.min(1, (Date.now() - start) / duration);
        var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var val = Math.round(fromVal + (toVal - fromVal) * ease);
        el.innerText = String(val) + suffix;
        if (t < 1) requestAnimationFrame(tick);
    }
    tick();
}
var meter3DIQ = null;
var meter3DScore = null;
var meter3DAnimationId = null;

function createMeterTextCanvas(text) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 128;
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 64);
    return canvas;
}

function createAnalogMeter3D(container, needleColor) {
    if (!container || typeof THREE === 'undefined') return null;
    var w = container.clientWidth || 280;
    var h = container.clientHeight || 220;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    renderer.setClearColor(0x1a1a1a);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 10);
    scene.add(dirLight);

    var meterGroup = new THREE.Group();
    var bodyGeom = new THREE.CylinderGeometry(4, 4.1, 0.8, 64);
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });
    var body = new THREE.Mesh(bodyGeom, bodyMat);
    body.rotation.x = Math.PI / 2;
    meterGroup.add(body);

    var faceGeom = new THREE.CircleGeometry(3.7, 64);
    var faceMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
    var face = new THREE.Mesh(faceGeom, faceMat);
    face.position.z = 0.41;
    meterGroup.add(face);

    var scaleGroup = new THREE.Group();
    scaleGroup.position.z = 0.42;
    for (var i = 0; i <= 100; i += 2) {
        var angle = (Math.PI * 0.75) - (i / 100 * (Math.PI * 1.5));
        var isMajor = i % 10 === 0;
        var markGeom = new THREE.BoxGeometry(isMajor ? 0.08 : 0.03, isMajor ? 0.4 : 0.2, 0.01);
        var markMat = new THREE.MeshBasicMaterial({ color: i > 80 ? 0xd32f2f : 0x333333 });
        var mark = new THREE.Mesh(markGeom, markMat);
        mark.position.set(Math.cos(angle) * 3.2, Math.sin(angle) * 3.2, 0);
        mark.rotation.z = angle - Math.PI / 2;
        scaleGroup.add(mark);
        if (isMajor) {
            var canvas = createMeterTextCanvas(i.toString());
            var texture = new THREE.CanvasTexture(canvas);
            var labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
            var labelGeom = new THREE.PlaneGeometry(0.6, 0.6);
            var label = new THREE.Mesh(labelGeom, labelMat);
            label.position.set(Math.cos(angle) * 2.6, Math.sin(angle) * 2.6, 0.01);
            scaleGroup.add(label);
        }
    }
    meterGroup.add(scaleGroup);

    var needleGroup = new THREE.Group();
    needleGroup.position.z = 0.5;
    var needleGeom = new THREE.BoxGeometry(0.06, 3.2, 0.02);
    needleGeom.translate(0, 1.2, 0);
    var needleMat = new THREE.MeshStandardMaterial({ color: needleColor, emissive: needleColor, emissiveIntensity: 0.15 });
    var needleMesh = new THREE.Mesh(needleGeom, needleMat);
    needleGroup.add(needleMesh);
    var pinGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.15, 32);
    var pinMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 });
    var pin = new THREE.Mesh(pinGeom, pinMat);
    pin.rotation.x = Math.PI / 2;
    needleGroup.add(pin);
    meterGroup.add(needleGroup);

    var glassGeom = new THREE.CircleGeometry(3.7, 64);
    var glassMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, shininess: 500 });
    var glass = new THREE.Mesh(glassGeom, glassMat);
    glass.position.z = 0.6;
    meterGroup.add(glass);
    scene.add(meterGroup);

    var targetAngle = Math.PI * 0.75;
    var currentAngle = Math.PI * 0.75;
    function pctToAngle(pct) { return (Math.PI * 0.75) - (pct / 100 * Math.PI * 1.5); }
    return {
        setTargetPct: function(pct) { targetAngle = pctToAngle(Math.min(100, Math.max(0, pct))); },
        setCurrentPct: function(pct) { currentAngle = pctToAngle(Math.min(100, Math.max(0, pct))); needleGroup.rotation.z = currentAngle - Math.PI / 2; },
        updateAndRender: function() {
            currentAngle += (targetAngle - currentAngle) * 0.1;
            needleGroup.rotation.z = currentAngle - Math.PI / 2;
            var time = Date.now() * 0.001;
            meterGroup.rotation.y = Math.sin(time * 0.5) * 0.08;
            meterGroup.rotation.x = Math.cos(time * 0.5) * 0.04;
            renderer.render(scene, camera);
        }
    };
}

function ensureMeter3D() {
    var iqContainer = document.getElementById('meter-iq-full');
    var scoreContainer = document.getElementById('meter-score-full');
    if (iqContainer && !meter3DIQ) meter3DIQ = createAnalogMeter3D(iqContainer, 0x0369a1);
    if (scoreContainer && !meter3DScore) meter3DScore = createAnalogMeter3D(scoreContainer, 0xd32f2f);
}

function updateHomepageStats(animate) {
    var d = typeof GameStorage !== 'undefined' ? GameStorage.read() : { bestScore: 0, totalScore: 0, coins: 0 };
    var total = d.totalScore || 0;
    var coins = d.coins || 0;
    var iqScore = d.lastGameScore != null ? d.lastGameScore : d.bestScore;
    var iqVal = iqScore > 0 ? scoreToIQ(iqScore) : null;
    var meterWrap = document.getElementById('meter-fullscreen');
    var normalWrap = document.getElementById('home-stats-normal');
    var scoreEl = document.getElementById('home-best-score');
    var iqEl = document.getElementById('home-iq');
    var totalNormalEl = document.getElementById('home-total-normal');
    var iqNormalEl = document.getElementById('home-iq-normal');
    var coinsEl = document.getElementById('home-coins-normal');
    var scorePct = Math.min(100, (total / MAX_METER_SCORE) * 100);
    var iqPct = iqVal != null ? ((iqVal - MIN_IQ) / (MAX_IQ - MIN_IQ)) * 100 : 0;
    var lastScorePct = Math.min(100, (_lastHomeScore / MAX_METER_SCORE) * 100);
    var lastIqPct = _lastHomeIQ != null ? ((_lastHomeIQ - MIN_IQ) / (MAX_IQ - MIN_IQ)) * 100 : 0;
    var needsAnim = animate && (total !== _lastHomeScore || iqVal !== _lastHomeIQ);
    if (needsAnim && meterWrap && normalWrap) {
        normalWrap.classList.add('hidden');
        meterWrap.classList.remove('hidden');
        animateMeterValue(scoreEl, _lastHomeScore, total, 900);
        if (iqEl) {
            if (iqVal != null) {
                var fromIq = _lastHomeIQ != null ? _lastHomeIQ : MIN_IQ;
                animateMeterValue(iqEl, fromIq, iqVal, 900);
            } else {
                iqEl.innerText = '--';
            }
        }
        setTimeout(function() {
            if (totalNormalEl) totalNormalEl.innerText = String(total);
            if (iqNormalEl) iqNormalEl.innerText = iqVal != null ? String(iqVal) : '--';
            if (coinsEl) coinsEl.innerText = String(coins);
            if (meterWrap) meterWrap.classList.add('hidden');
            if (normalWrap) normalWrap.classList.remove('hidden');
        }, 3000);
    } else {
        if (meterWrap) meterWrap.classList.add('hidden');
        if (normalWrap) normalWrap.classList.remove('hidden');
        if (totalNormalEl) totalNormalEl.innerText = String(total);
        if (iqNormalEl) iqNormalEl.innerText = iqVal != null ? String(iqVal) : '--';
        if (coinsEl) coinsEl.innerText = String(coins);
    }
    _lastHomeScore = total;
    _lastHomeIQ = iqVal;
}

function exitGameToHome() {
    if (gameActive) {
        gameActive = false;
        stopQuestionTimer();
        var d = GameStorage.read();
        var updates = { totalScore: (d.totalScore || 0) + score, lastGameScore: score, coins: (d.coins || 0) + Math.floor(score / 50) };
        if (score > d.bestScore) updates.bestScore = score;
        GameStorage.write(updates);
    }
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-controls').classList.add('hidden');
    var netEl = document.getElementById('color-cube-net-screen');
    if (netEl) netEl.classList.add('hidden');
    var colorQEl = document.getElementById('color-cube-question');
    if (colorQEl) colorQEl.classList.add('hidden');
    hideNumberPatternCard();
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('skip-question-ad-screen').classList.add('hidden');
    document.getElementById('ad-offer-screen').classList.add('hidden');
    document.getElementById('over-screen').classList.add('hidden');
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('game-controls').classList.remove('visible');
    updateHomepageStats(true);
    updateHomepageBackground();
    enableRandomAnimation();
}
var marketplacePreviews = [];
var marketplaceAnimating = false;
function destroyMarketplacePreviews() {
    marketplacePreviews.forEach(function(p) {
        try {
            if (p.cube && p.cube.geometry) p.cube.geometry.dispose();
            if (p.cube && p.cube.material) {
                var mats = Array.isArray(p.cube.material) ? p.cube.material : [p.cube.material];
                mats.forEach(function(m) {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            }
            if (p.renderer) p.renderer.dispose();
        } catch (e) {}
    });
    marketplacePreviews = [];
    marketplaceAnimating = false;
}
function createMarketplaceCubePreview(container, skin) {
    if (!container || typeof THREE === 'undefined' || !skin) return;
    var size = 120;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(skin.bg || '#ffffff');
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 2.2;
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    container.appendChild(renderer.domElement);
    var ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    var directional = new THREE.DirectionalLight(0xffffff, 0.5);
    directional.position.set(2, 2, 2);
    scene.add(directional);
    var geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    var tex = typeof createNumberTexture === 'function' ? createNumberTexture([1, 2, 3, 4], 0, skin) : null;
    var emissiveHex = 0x000000;
    if (skin && skin.border) {
        var hex = skin.border.replace('#', '');
        if (hex.length === 6) emissiveHex = parseInt(hex, 16);
    }
    var materials = Array(6).fill().map(function() {
        return new THREE.MeshStandardMaterial({
            map: tex,
            color: 0xffffff,
            roughness: 0.25,
            metalness: 0.2,
            emissive: new THREE.Color(emissiveHex),
            emissiveIntensity: 0.25
        });
    });
    var cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    var preview = { scene: scene, camera: camera, renderer: renderer, cube: cube, tex: tex };
    marketplacePreviews.push(preview);
}
function animateMarketplacePreviews() {
    if (marketplacePreviews.length === 0) return;
    var mpEl = document.getElementById('marketplace');
    if (!mpEl || mpEl.classList.contains('hidden')) return;
    marketplaceAnimating = true;
    function tick() {
        if (marketplacePreviews.length === 0 || !document.getElementById('marketplace') || document.getElementById('marketplace').classList.contains('hidden')) {
            marketplaceAnimating = false;
            return;
        }
        var t = Date.now() * 0.001;
        marketplacePreviews.forEach(function(p, i) {
            if (p.cube) {
                p.cube.rotation.x += 0.008;
                p.cube.rotation.y += 0.012;
                p.cube.rotation.z += 0.004;
            }
            if (p.renderer && p.scene && p.camera) p.renderer.render(p.scene, p.camera);
        });
        requestAnimationFrame(tick);
    }
    tick();
}
function openMarketplace() {
    document.getElementById('homepage').classList.add('hidden');
    document.getElementById('marketplace').classList.remove('hidden');
    renderMarketplace();
}
function closeMarketplace() {
    destroyMarketplacePreviews();
    document.getElementById('marketplace').classList.add('hidden');
    document.getElementById('homepage').classList.remove('hidden');
    updateHomepageStats(false);
    renderGifts();
    updateHomepageBackground();
}
function renderMarketplace() {
    destroyMarketplacePreviews();
    var d = GameStorage.read();
    var coins = d.coins || 0;
    var owned = d.purchasedSkins || [];
    var maxLevel = d.maxLevel || 1;
    var selected = d.selectedSkinId;
    document.getElementById('marketplace-coins-val').innerText = coins;
    var grid = document.getElementById('marketplace-grid');
    grid.innerHTML = '';
    if (typeof SKIN_CATALOG === 'undefined') return;
    SKIN_CATALOG.forEach(function(skin) {
        var canUse = skin.price === 0 || owned.indexOf(skin.id) >= 0 || maxLevel >= skin.levelUnlock;
        var isEquipped = selected === skin.id;
        var card = document.createElement('div');
        card.className = 'skin-card' + (canUse ? ' owned' : '') + (isEquipped ? ' equipped' : '');
        var priceStr = skin.price === 0 ? 'Free' : skin.price + ' කාසි';
        var unlockStr = canUse ? '✓ Unlocked' : (skin.levelUnlock ? 'Lvl ' + skin.levelUnlock + ' or ' + priceStr : priceStr);
        var previewDiv = document.createElement('div');
        previewDiv.className = 'skin-preview skin-preview-3d';
        previewDiv.style.background = skin.bg || '#fff';
        card.appendChild(previewDiv);
        var nameSpan = document.createElement('span');
        nameSpan.className = 'skin-name';
        nameSpan.textContent = skin.name + ' / ' + skin.nameSi;
        card.appendChild(nameSpan);
        var priceSpan = document.createElement('span');
        priceSpan.className = 'skin-price';
        priceSpan.textContent = unlockStr;
        card.appendChild(priceSpan);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'skin-equip';
        btn.textContent = canUse ? (isEquipped ? '✓ Equipped' : 'Use') : 'Buy';
        card.appendChild(btn);
        createMarketplaceCubePreview(previewDiv, skin);
        if (canUse && !isEquipped) {
            btn.onclick = function() { equipSkin(skin.id); };
        } else {
            btn.onclick = function() { purchaseSkin(skin.id, skin.price); };
        }
        grid.appendChild(card);
    });
    if (!marketplaceAnimating) animateMarketplacePreviews();
}
function purchaseSkin(id, price) {
    var d = GameStorage.read();
    var coins = d.coins || 0;
    if (coins < price) return;
    var owned = d.purchasedSkins || [];
    if (owned.indexOf(id) >= 0) return;
    owned.push(id);
    GameStorage.write({ coins: coins - price, purchasedSkins: owned });
    renderMarketplace();
}
function equipSkin(id) {
    GameStorage.write({ selectedSkinId: id });
    renderMarketplace();
    if (document.getElementById('homepage') && !document.getElementById('homepage').classList.contains('hidden')) {
        updateHomepageBackground();
    }
}

var giftTimerInterval = null;
var giftBoxPreviews = [];
var giftBoxAnimating = false;
function destroyGiftBoxPreviews() {
    giftBoxPreviews.forEach(function(p) {
        try {
            if (p.box && p.box.geometry) p.box.geometry.dispose();
            if (p.box && p.box.material) {
                var mats = Array.isArray(p.box.material) ? p.box.material : [p.box.material];
                mats.forEach(function(m) { m.dispose(); });
            }
            if (p.renderer) p.renderer.dispose();
        } catch (e) {}
    });
    giftBoxPreviews = [];
    giftBoxAnimating = false;
}

var fullScreenGiftBoxState = null;

function buildGiftBoxMesh(scale) {
    scale = scale || 1;
    var boxMat = new THREE.MeshPhongMaterial({ color: 0x1d3557, side: THREE.DoubleSide, shininess: 100 });
    var ribbonMat = new THREE.MeshPhongMaterial({ color: 0xcc2222, shininess: 80, specular: 0x331111, side: THREE.DoubleSide });
    var wallSize = 2;
    var wallGeom = new THREE.PlaneGeometry(wallSize, wallSize);

    var giftGroup = new THREE.Group();
    var bottom = new THREE.Mesh(wallGeom, boxMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -1;
    giftGroup.add(bottom);

    var wallConfigs = [
        { pos: [0, 0, 1], rot: [0, 0, 0] },
        { pos: [0, 0, -1], rot: [0, Math.PI, 0] },
        { pos: [1, 0, 0], rot: [0, Math.PI / 2, 0] },
        { pos: [-1, 0, 0], rot: [0, -Math.PI / 2, 0] }
    ];
    wallConfigs.forEach(function(cfg) {
        var wallGroup = new THREE.Group();
        var wall = new THREE.Mesh(wallGeom, boxMat);
        wallGroup.add(wall);
        var ribbonGeom = new THREE.BoxGeometry(0.4, 2.02, 0.05);
        var ribbonSeg = new THREE.Mesh(ribbonGeom, ribbonMat);
        ribbonSeg.position.z = 0.01;
        wallGroup.add(ribbonSeg);
        wallGroup.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        wallGroup.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
        giftGroup.add(wallGroup);
    });

    var lidGroup = new THREE.Group();
    lidGroup.position.y = 1;
    var lidGeom = new THREE.BoxGeometry(2.2, 0.22, 2.2);
    var lidMat = new THREE.MeshPhongMaterial({ color: 0x457b9d, shininess: 120 });
    var lid = new THREE.Mesh(lidGeom, lidMat);
    lid.position.y = 0.1;
    lidGroup.add(lid);
    var lrib1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 2.25), ribbonMat);
    var lrib2 = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.28, 0.42), ribbonMat);
    lrib1.position.y = 0.1;
    lrib2.position.y = 0.1;
    lidGroup.add(lrib1, lrib2);

    var bowGroup = new THREE.Group();
    bowGroup.position.y = 0.3;
    var knot = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), ribbonMat);
    knot.scale.set(1, 0.8, 0.6);
    bowGroup.add(knot);
    var loopGeom = new THREE.TorusGeometry(0.28, 0.1, 12, 32, Math.PI * 1.1);
    var leftLoop = new THREE.Mesh(loopGeom, ribbonMat);
    leftLoop.rotation.y = Math.PI / 2;
    leftLoop.rotation.z = Math.PI / 1.05;
    leftLoop.position.x = -0.32;
    leftLoop.scale.set(1.4, 0.8, 1);
    bowGroup.add(leftLoop);
    var rightLoop = new THREE.Mesh(loopGeom, ribbonMat);
    rightLoop.rotation.y = -Math.PI / 2;
    rightLoop.rotation.z = -Math.PI / 1.05;
    rightLoop.position.x = 0.32;
    rightLoop.scale.set(1.4, 0.8, 1);
    bowGroup.add(rightLoop);
    var tailGeom = new THREE.PlaneGeometry(0.35, 0.7);
    var leftTail = new THREE.Mesh(tailGeom, ribbonMat);
    leftTail.position.set(-0.25, -0.25, 0.2);
    leftTail.rotation.set(0.4, 0.3, 0.5);
    bowGroup.add(leftTail);
    var rightTail = new THREE.Mesh(tailGeom, ribbonMat);
    rightTail.position.set(0.25, -0.25, 0.2);
    rightTail.rotation.set(0.4, -0.3, -0.5);
    bowGroup.add(rightTail);
    lidGroup.add(bowGroup);
    giftGroup.add(lidGroup);
    giftGroup.scale.set(scale, scale, scale);
    return { giftGroup: giftGroup, lidGroup: lidGroup };
}

function createFullScreenGiftBox(container) {
    if (!container || typeof THREE === 'undefined') return null;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    var w = container.clientWidth || window.innerWidth || 300;
    var h = container.clientHeight || window.innerHeight || 300;
    var camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.set(0, 5, 8);
    var giftCenterY = 2;
    camera.lookAt(0, giftCenterY, 0);
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    var oldCanvas = container.querySelector('canvas');
    if (oldCanvas) oldCanvas.remove();
    container.appendChild(renderer.domElement);
    var ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    var spot = new THREE.SpotLight(0xffffff, 1.5);
    spot.position.set(10, 15, 10);
    scene.add(spot);
    var innerLight = new THREE.PointLight(0xffd700, 1, 10);
    innerLight.position.set(0, 0.5, 0);
    innerLight.name = 'innerLight';
    scene.add(innerLight);

    var built = buildGiftBoxMesh(1);
    var giftGroup = built.giftGroup;
    var lidGroup = built.lidGroup;
    giftGroup.position.y = giftCenterY;
    scene.add(giftGroup);

    var coinCount = 60;
    var coins = [];
    var coinGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.03, 16);
    var coinMat = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 250 });
    for (var c = 0; c < coinCount; c++) {
        var coin = new THREE.Mesh(coinGeom, coinMat);
        coin.visible = false;
        coin.velocity = new THREE.Vector3();
        coin.rotationSpeed = new THREE.Vector3(Math.random() * 0.1, Math.random() * 0.1, Math.random() * 0.1);
        scene.add(coin);
        coins.push(coin);
    }

    fullScreenGiftBoxState = {
        scene: scene, camera: camera, renderer: renderer,
        giftGroup: giftGroup, lidGroup: lidGroup, coins: coins,
        isOpen: false, bounceTime: 0,
        lidVelocity: new THREE.Vector3(),
        lidAngularVelocity: new THREE.Vector3(),
        animationId: null
    };
    return fullScreenGiftBoxState;
}
function destroyFullScreenGiftBox() {
    if (!fullScreenGiftBoxState) return;
    if (fullScreenGiftBoxState.animationId) cancelAnimationFrame(fullScreenGiftBoxState.animationId);
    try {
        fullScreenGiftBoxState.coins.forEach(function(c) {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        fullScreenGiftBoxState.renderer.dispose();
        var container = document.getElementById('gift-box-3d-container');
        if (container) {
            var canvas = container.querySelector('canvas');
            if (canvas) canvas.remove();
        }
    } catch (e) {}
    fullScreenGiftBoxState = null;
}
function showFullScreenGiftBox(reward, onOpenedCallback) {
    var container = document.getElementById('gift-box-3d-container');
    var overlay = document.getElementById('gift-opened-overlay');
    var rewardCard = document.getElementById('gift-opened-reward-card');
    var tapHint = document.getElementById('gift-box-tap-hint');
    if (!container || !overlay) return;
    rewardCard.classList.add('hidden');
    overlay.classList.remove('hidden');
    var state = createFullScreenGiftBox(container);
    if (!state) { onOpenedCallback(); return; }
    if (tapHint) tapHint.classList.remove('hidden');

    function burstCoins() {
        state.coins.forEach(function(coin) {
            coin.visible = true;
            coin.position.copy(state.giftGroup.position);
            coin.position.y += 0.5;
            coin.velocity.set(
                (Math.random() - 0.5) * 0.25,
                Math.random() * 0.5 + 0.3,
                (Math.random() - 0.5) * 0.25
            );
        });
    }
    function triggerLidFly() {
        state.lidVelocity.set(0.1, 0.5, 0.2);
        state.lidAngularVelocity.set(Math.random() * 0.2, Math.random() * 0.1, 0.15);
    }

    var openedAt = null;
    function onTap() {
        if (state.isOpen) return;
        state.isOpen = true;
        burstCoins();
        triggerLidFly();
        if (tapHint) tapHint.classList.add('hidden');
        openedAt = Date.now();
    }
    container.addEventListener('click', onTap);
    container.style.cursor = 'pointer';

    function animate() {
        if (!fullScreenGiftBoxState) return;
        if (!state.isOpen) {
            state.bounceTime += 0.05;
            state.giftGroup.position.y = Math.abs(Math.sin(state.bounceTime)) * 0.5;
            var scaleVal = 1 + Math.sin(state.bounceTime * 2) * 0.05;
            state.giftGroup.scale.set(1 / scaleVal, scaleVal, 1 / scaleVal);
            state.giftGroup.rotation.y += 0.01;
        } else {
            state.lidGroup.position.add(state.lidVelocity);
            state.lidGroup.rotation.x += state.lidAngularVelocity.x;
            state.lidGroup.rotation.y += state.lidAngularVelocity.y;
            state.lidGroup.rotation.z += state.lidAngularVelocity.z;
            state.lidVelocity.y -= 0.015;
            state.giftGroup.position.y += (0 - state.giftGroup.position.y) * 0.1;
            state.giftGroup.scale.x += (1 - state.giftGroup.scale.x) * 0.1;
            state.giftGroup.scale.y += (1 - state.giftGroup.scale.y) * 0.1;
            state.giftGroup.scale.z += (1 - state.giftGroup.scale.z) * 0.1;
            state.coins.forEach(function(coin) {
                if (coin.visible) {
                    coin.position.add(coin.velocity);
                    coin.velocity.y -= 0.008;
                    coin.rotation.x += coin.rotationSpeed.x;
                    coin.rotation.y += coin.rotationSpeed.y;
                    if (coin.position.y < -15) coin.visible = false;
                }
            });
            if (openedAt && (Date.now() - openedAt) > 2500) {
                openedAt = null;
                container.removeEventListener('click', onTap);
                container.style.cursor = '';
                state.animationId = null;
                destroyFullScreenGiftBox();
                if (onOpenedCallback) onOpenedCallback();
                return;
            }
        }
        var innerLight = state.scene.getObjectByName('innerLight');
        if (innerLight) innerLight.intensity = state.isOpen ? 6 : 1;
        state.renderer.render(state.scene, state.camera);
        state.animationId = requestAnimationFrame(animate);
    }
    animate();
}

function createGiftBoxPreview(container) {
    if (!container || typeof THREE === 'undefined') return;
    var size = 56;
    var scene = new THREE.Scene();
    scene.background = null;
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.3, 2.2);
    camera.lookAt(0, 0, 0);
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 2, 2));
    container.appendChild(renderer.domElement);
    var ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    var dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 4, 5);
    scene.add(dir);
    var built = buildGiftBoxMesh(0.38);
    var giftGroup = built.giftGroup;
    scene.add(giftGroup);
    giftBoxPreviews.push({ scene: scene, camera: camera, renderer: renderer, giftGroup: giftGroup });
}
function animateGiftBoxPreviews() {
    if (giftBoxPreviews.length === 0) return;
    var hp = document.getElementById('homepage');
    if (!hp || hp.classList.contains('hidden')) return;
    giftBoxAnimating = true;
    function tick() {
        if (giftBoxPreviews.length === 0) return;
        var hpEl = document.getElementById('homepage');
        if (!hpEl || hpEl.classList.contains('hidden')) {
            giftBoxAnimating = false;
            return;
        }
        var t = Date.now() * 0.001;
        giftBoxPreviews.forEach(function(p) {
            if (p.giftGroup) {
                p.giftGroup.rotation.y += 0.02;
                p.giftGroup.rotation.x = Math.sin(t * 0.8) * 0.15;
            }
            if (p.renderer && p.scene && p.camera) p.renderer.render(p.scene, p.camera);
        });
        requestAnimationFrame(tick);
    }
    tick();
}
function getGiftCoinsReward(slotIndex) {
    var ranges = [[5, 15], [20, 50], [50, 150]];
    var r = ranges[Math.min(slotIndex, 2)] || [5, 15];
    return r[0] + Math.floor(Math.random() * (r[1] - r[0] + 1));
}
function getGiftReward(slotIndex) {
    var coins = getGiftCoinsReward(slotIndex);
    var skinId = null;
    if (typeof SKIN_CATALOG !== 'undefined' && Math.random() < 0.18) {
        var d = GameStorage.read();
        var owned = d.purchasedSkins || [];
        var available = SKIN_CATALOG.filter(function(s) { return owned.indexOf(s.id) < 0; });
        if (available.length > 0) {
            skinId = available[Math.floor(Math.random() * available.length)].id;
        }
    }
    return { coins: coins, skinId: skinId };
}
function getGiftMsRemaining(gift, slotIndex) {
    var mins = GIFT_COOLDOWNS[Math.min(slotIndex, 2)] || 1;
    var canOpenAt = gift.obtainedAt + mins * 60 * 1000;
    return Math.max(0, canOpenAt - Date.now());
}
function formatGiftTime(ms) {
    if (ms <= 0) return 'Open';
    var s = Math.floor(ms / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    if (m > 0) return m + ':' + (s < 10 ? '0' : '') + s;
    return s + 's';
}
function renderGifts() {
    destroyGiftBoxPreviews();
    var container = document.getElementById('gift-slots');
    if (!container) return;
    var d = GameStorage.read();
    var slots = d.giftSlots || [];
    var giftsWrap = document.getElementById('home-gifts');
    if (giftsWrap) giftsWrap.style.display = '';
    container.innerHTML = '';
    for (var i = 0; i < 3; i++) {
        var gift = slots[i];
        var slot = document.createElement('div');
        slot.className = 'gift-slot' + (gift ? '' : ' empty');
        if (gift) {
            var boxDiv = document.createElement('div');
            boxDiv.className = 'gift-slot-3d';
            slot.appendChild(boxDiv);
            createGiftBoxPreview(boxDiv);
            var msLeft = getGiftMsRemaining(gift, i);
            var ready = msLeft <= 0;
            var timeStr = ready ? 'Open!' : formatGiftTime(msLeft);
            var timeSpan = document.createElement('span');
            timeSpan.className = 'gift-slot-time';
            timeSpan.setAttribute('data-index', String(i));
            timeSpan.textContent = timeStr;
            slot.appendChild(timeSpan);
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = ready ? 'gift-slot-btn' : 'gift-slot-btn gift-slot-btn-ad';
            btn.setAttribute('data-index', String(i));
            btn.textContent = ready ? 'Open' : 'Ad to open';
            btn.onclick = (function(idx) {
                return function() {
                    var s = GameStorage.read().giftSlots || [];
                    if (getGiftMsRemaining(s[idx], idx) <= 0) openGift(idx);
                    else openGiftWithAd(idx);
                };
            })(i);
            slot.appendChild(btn);
        } else {
            var emptyDiv = document.createElement('div');
            emptyDiv.className = 'gift-slot-icon gift-slot-empty';
            emptyDiv.textContent = '—';
            slot.appendChild(emptyDiv);
        }
        container.appendChild(slot);
    }
    if (!giftBoxAnimating) animateGiftBoxPreviews();
    if (giftTimerInterval) clearInterval(giftTimerInterval);
    giftTimerInterval = setInterval(function() {
        var slots = (GameStorage.read().giftSlots || []);
        for (var j = 0; j < slots.length; j++) {
            var ms = getGiftMsRemaining(slots[j], j);
            var ready = ms <= 0;
            var el = document.querySelector('.gift-slot-time[data-index="' + j + '"]');
            if (el) el.textContent = ready ? 'Open!' : formatGiftTime(ms);
            var slotDiv = el ? el.closest('.gift-slot') : null;
            var btn = slotDiv ? slotDiv.querySelector('.gift-slot-btn') : null;
            if (btn && ready && btn.classList.contains('gift-slot-btn-ad')) {
                btn.classList.remove('gift-slot-btn-ad');
                btn.textContent = 'Open';
                btn.onclick = (function(idx) { return function() { openGift(idx); }; })(j);
            }
        }
    }, 1000);
}
function applyGiftRewardAndShow(index, reward) {
    var d = GameStorage.read();
    var slots = d.giftSlots || [];
    var newSlots = slots.slice(0, index).concat(slots.slice(index + 1));
    var newCoins = (d.coins || 0) + reward.coins;
    var newPurchased = (d.purchasedSkins || []).slice();
    if (reward.skinId && newPurchased.indexOf(reward.skinId) < 0) {
        newPurchased.push(reward.skinId);
    }
    GameStorage.write({ giftSlots: newSlots, coins: newCoins, purchasedSkins: newPurchased });
    renderGifts();

    var rewardEl = document.getElementById('gift-opened-reward');
    var skinEl = document.getElementById('gift-opened-skin');
    if (rewardEl) rewardEl.innerText = '+' + reward.coins + ' කාසි!';
    if (skinEl) {
        if (reward.skinId && typeof getSkinById === 'function') {
            var s = getSkinById(reward.skinId);
            skinEl.textContent = '🎨 ' + (s ? (s.nameSi + ' / ' + s.name) : reward.skinId) + ' skin ලැබුණා!';
            skinEl.classList.remove('hidden');
        } else {
            skinEl.classList.add('hidden');
        }
    }

    showFullScreenGiftBox(reward, function() {
        document.getElementById('gift-opened-reward-card').classList.remove('hidden');
    });
}
function openGift(index) {
    var d = GameStorage.read();
    var slots = d.giftSlots || [];
    var gift = slots[index];
    if (!gift || getGiftMsRemaining(gift, index) > 0) return;
    var reward = getGiftReward(index);
    applyGiftRewardAndShow(index, reward);
}
function openGiftWithAd(index) {
    var d = GameStorage.read();
    var slots = d.giftSlots || [];
    if (!slots[index]) return;
    function doOpen() {
        var reward = getGiftReward(index);
        applyGiftRewardAndShow(index, reward);
    }
    if (typeof FBInstantBridge !== 'undefined' && FBInstantBridge.showRewardedAd) {
        FBInstantBridge.showRewardedAd('gift_open', doOpen, function() {});
    } else {
        doOpen();
    }
}
function closeGiftOpened() {
    destroyFullScreenGiftBox();
    document.getElementById('gift-opened-reward-card').classList.add('hidden');
    document.getElementById('gift-opened-overlay').classList.add('hidden');
    var tapHint = document.getElementById('gift-box-tap-hint');
    if (tapHint) tapHint.classList.remove('hidden');
}
function updateHomepageBackground() {
    var d = typeof GameStorage !== 'undefined' ? GameStorage.read() : {};
    var sel = d.selectedSkinId;
    var bgColor = '#fff7ed';
    var borderColor = '#f97316';
    if (sel && typeof getSkinById === 'function') {
        var s = getSkinById(sel);
        if (s) {
            if (s.bg) bgColor = s.bg;
            if (s.border) borderColor = s.border;
        }
    }
    document.body.style.background = bgColor;
    var homeCard = document.querySelector('#homepage .glass-card');
    if (homeCard) {
        homeCard.style.borderTopColor = borderColor;
    }
}

function backToHome() {
    updateHomepageStats(true);
    renderGifts();
    updateHomepageBackground();
    document.getElementById('homepage').classList.remove('hidden');
    document.getElementById('marketplace').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('ad-offer-screen').classList.add('hidden');
    document.getElementById('ad-offer-screen').classList.remove('visible');
    document.getElementById('skip-question-ad-screen').classList.add('hidden');
    document.getElementById('skip-question-ad-screen').classList.remove('visible');
    document.getElementById('over-screen').classList.add('hidden');
    document.getElementById('over-screen').classList.remove('visible');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('game-controls').classList.add('hidden');
    var netEl = document.getElementById('color-cube-net-screen');
    if (netEl) netEl.classList.add('hidden');
    var colorQ = document.getElementById('color-cube-question');
    if (colorQ) colorQ.classList.add('hidden');
    hideNumberPatternCard();
    enableRandomAnimation();
}

function bootGame() {
    if (typeof THREE === 'undefined') {
        document.body.innerHTML = '<div style="padding:2rem;text-align:center;font-family:sans-serif">Three.js failed to load. Check your internet connection.</div>';
        return;
    }
    var p = (typeof GameStorage !== 'undefined' && GameStorage.loadFromFB) ?
        GameStorage.loadFromFB() : Promise.resolve();
    p.then(function() {
        if (typeof GameStorage !== 'undefined') GameStorage.loadSavedProgress();
        updateHomepageStats(false);
        renderGifts();
        updateHomepageBackground();
    }).catch(function() {});
    if (!cube && typeof THREE !== 'undefined') init3D();
    updateHomepageStats(false);
    var backBtn = document.getElementById('btn-game-back');
    if (backBtn) backBtn.onclick = function() { doAfterPress(exitGameToHome); };
    var playAdBtn = document.getElementById('btn-watch-ad');
    if (playAdBtn) playAdBtn.onclick = function() { requestRewardedAd(); };
    var skipAdBtn = document.getElementById('btn-skip-ad');
    if (skipAdBtn) skipAdBtn.onclick = function() {
        showNormalGameOver(score);
    };
    var watchSkipBtn = document.getElementById('btn-watch-ad-skip');
    if (watchSkipBtn) watchSkipBtn.onclick = function() {
        if (skipsRemaining <= 0) return;
        var isRetry = window._skipAdIsRetry;
        requestRewardedAd(function() {
            isInputLocked = false;
            window._skipAdIsRetry = false;
            document.getElementById('skip-question-ad-screen').classList.add('hidden');
            document.getElementById('skip-question-ad-screen').classList.remove('visible');
            if (isRetry) {
                doRetry();
            } else {
                advanceAsCorrect(true);
            }
        });
    };
    var cancelSkipBtn = document.getElementById('btn-cancel-skip');
    if (cancelSkipBtn) cancelSkipBtn.onclick = function() {
        if (window._skipAdOnCancel) window._skipAdOnCancel();
    };
    var btn5050 = document.getElementById('btn-5050');
    if (btn5050) btn5050.onclick = function() {
        if (!gameActive || isInputLocked) return;
        use5050Lifeline();
    };
    var btnExtra = document.getElementById('btn-extra-time');
    if (btnExtra) btnExtra.onclick = function() {
        if (!gameActive || isInputLocked) return;
        useExtraTimeLifeline();
    };
    var btnSkipHard = document.getElementById('btn-skip-hard');
    if (btnSkipHard) btnSkipHard.onclick = function() {
        if (!gameActive || isInputLocked) return;
        useSkipHardLifeline();
    };
};

function initFBInstant() {
    var bridge = typeof FBInstantBridge !== 'undefined' ? FBInstantBridge : null;
    var booted = false;
    function ensureBoot() {
        if (!booted) { booted = true; bootGame(); }
    }
    if (bridge && bridge.isFBInstant()) {
        var timeout = setTimeout(ensureBoot, 5000);
        bridge.init()
            .then(function() {
                if (bridge.setLoadingProgress) bridge.setLoadingProgress(30);
                return bridge.startGame();
            })
            .then(function() {
                clearTimeout(timeout);
                if (bridge.setLoadingProgress) bridge.setLoadingProgress(100);
                ensureBoot();
            })
            .catch(function() { clearTimeout(timeout); ensureBoot(); });
    } else {
        bootGame();
    }
}

window.onload = function() {
    if (typeof THREE !== 'undefined') {
        init3D();
    }
    if (typeof FBInstant !== 'undefined') {
        initFBInstant();
    } else {
        setTimeout(function() {
            if (typeof FBInstant !== 'undefined') initFBInstant();
            else bootGame();
        }, 100);
    }
};
