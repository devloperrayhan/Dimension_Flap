// --- AUDIO CONTROLLER ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const sfx = {
    jump: () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    score: () => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        osc.frequency.setValueAtTime(2000, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    },
    crash: () => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
};

// --- SETUP ---
const canvas = document.getElementById("birdCanvas");
const ctx = canvas.getContext("2d");
const uiLayer = document.querySelector(".ui-layer");
const scanlineDiv = document.querySelector(".scanlines");
const container = document.getElementById("game-container");
const themeBtn = document.getElementById("theme-btn");

let frames = 0;
const DEGREE = Math.PI / 180;
let shake = 0;

const state = { current: 0, getReady: 0, game: 1, over: 2 };

// --- THEME ENGINE ---
const themes = {
    neon: {
        id: 'neon',
        bgTop: "#1a0b2e",
        bgBottom: "#2d1b4e",
        bird: "#0ff",
        birdBorder: "#fff",
        pipe: "#111",
        pipeBorder: "#b026ff",
        ground: "#000",
        grid: "#b026ff",
        sunColors: ["#ff0055", "#ffcc00"],
        textMain: "#0ff",
        textShadow: "#b026ff",
        glow: true,
        scanlines: true,
        particleColor: "#0ff"
    },
    retro: {
        id: 'retro',
        bgTop: "#70c5ce",
        bgBottom: "#70c5ce",
        bird: "#f1c40f",
        birdBorder: "#000",
        pipe: "#2ecc71",
        pipeBorder: "#27ae60",
        ground: "#ded895",
        grid: "#d4ce80",
        sunColors: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"],
        textMain: "#fff",
        textShadow: "#000",
        glow: false,
        scanlines: false,
        particleColor: "#fff"
    }
};

let activeTheme = 'neon';
let colors = { ...themes.neon };

function toggleTheme() {
    activeTheme = activeTheme === 'neon' ? 'retro' : 'neon';
    colors = { ...themes[activeTheme] };

    if (activeTheme === 'neon') {
        document.body.style.backgroundColor = "#050010";
        scanlineDiv.style.opacity = "1";
        container.style.boxShadow = "0 0 100px rgba(176, 38, 255, 0.4)";
        uiLayer.style.color = "#0ff";
        uiLayer.style.textShadow = "2px 2px 0 #b026ff";
        themeBtn.innerText = "MODE: NEON";
    } else {
        document.body.style.backgroundColor = "#87ceeb";
        scanlineDiv.style.opacity = "0";
        container.style.boxShadow = "0 0 20px rgba(0,0,0,0.2)";
        uiLayer.style.color = "#fff";
        uiLayer.style.textShadow = "2px 2px 0 #000";
        themeBtn.innerText = "MODE: RETRO";
    }
}

themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTheme();
    this.blur();
});

themeBtn.innerText = "MODE: NEON";


// --- PARTICLE SYSTEM ---
const particles = [];
class Particle {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * (type === 'explosion' ? 5 : 1);
        this.speedY = (Math.random() - 0.5) * (type === 'explosion' ? 5 : 1);
        if (type === 'trail') { this.speedX = -2; this.speedY = (Math.random() - 0.5); }
        this.life = 1.0;
        this.decay = type === 'explosion' ? 0.03 : 0.05;
        this.color = type === 'explosion' ? '#ff0055' : colors.particleColor;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }
    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 20; i++) particles.push(new Particle(x, y, 'explosion'));
}

// --- CONTROLS ---
function flapAction() {
    if (state.current === state.getReady) {
        state.current = state.game;
        sfx.jump();
        uiLayer.style.display = "none";
        themeBtn.style.display = "none"; // <--- HIDE BUTTON HERE
    } else if (state.current === state.game) {
        bird.flap();
        sfx.jump();
        for (let i = 0; i < 3; i++) particles.push(new Particle(bird.x, bird.y + 10, 'trail'));
    } else if (state.current === state.over && frames - dieFrame > 30) {
        resetGame();
        state.current = state.getReady;
    }
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") flapAction();
});
canvas.addEventListener("click", flapAction);
canvas.addEventListener("touchstart", (e) => {
    if (e.target !== themeBtn) {
        e.preventDefault();
        flapAction();
    }
}, { passive: false });

let dieFrame = 0;
function resetGame() {
    bird.speedReset();
    pipes.reset();
    score.reset();
    frames = 0;
    particles.length = 0;
    shake = 0;
    uiLayer.style.display = "block";
    themeBtn.style.display = "block"; // <--- SHOW BUTTON HERE
}

// --- GAME OBJECTS ---

const bg = {
    draw: function () {
        let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, colors.bgTop);
        grad.addColorStop(1, colors.bgBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (colors.sunColors[0] !== "rgba(0,0,0,0)") {
            ctx.save();
            let sunGrad = ctx.createLinearGradient(0, 100, 0, 300);
            sunGrad.addColorStop(0, colors.sunColors[1]);
            sunGrad.addColorStop(1, colors.sunColors[0]);
            ctx.fillStyle = sunGrad;
            if (colors.glow) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = colors.sunColors[0];
            }
            ctx.beginPath();
            ctx.arc(canvas.width / 2, 350, 80, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = colors.bgBottom;
            ctx.shadowBlur = 0;
            for (let i = 280; i < 430; i += 8) {
                ctx.fillRect(canvas.width / 2 - 90, i, 180, i > 350 ? 4 : 2);
            }
            ctx.restore();
        } else {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            let cloudX = (frames * 0.5) % (canvas.width + 100) - 50;
            ctx.beginPath();
            ctx.arc(cloudX, 100, 30, 0, Math.PI * 2);
            ctx.arc(cloudX + 20, 90, 40, 0, Math.PI * 2);
            ctx.arc(cloudX + 50, 100, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        if (colors.glow && frames % 10 === 0 && Math.random() > 0.8) {
            ctx.fillStyle = "#FFF";
            ctx.fillRect(Math.random() * canvas.width, Math.random() * 200, 2, 2);
        }
    }
}

const ground = {
    h: 80,
    y: canvas.height - 80,
    draw: function () {
        ctx.fillStyle = colors.ground;
        ctx.fillRect(0, this.y, canvas.width, this.h);

        ctx.fillStyle = colors.grid;
        if (colors.glow) {
            ctx.fillStyle = "rgba(0,0,0,0)";
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = colors.grid;
            ctx.beginPath();
            ctx.moveTo(0, this.y);
            ctx.lineTo(canvas.width, this.y);
            ctx.stroke();
        } else {
            ctx.fillRect(0, this.y, canvas.width, 10);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#000";
            ctx.strokeRect(0, this.y, canvas.width, 10);
        }

        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        let offset = (frames * 3) % 40;

        if (colors.glow) {
            ctx.strokeStyle = colors.grid;
            for (let i = 0; i < canvas.width + 40; i += 40) {
                ctx.beginPath();
                let xVal = i - offset;
                let slant = (xVal - canvas.width / 2) * 0.8;
                ctx.moveTo(xVal, this.y);
                ctx.lineTo(xVal + slant, canvas.height);
                ctx.stroke();
            }
            for (let i = this.y; i < canvas.height; i += 20) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = colors.grid;
            for (let i = -40; i < canvas.width; i += 20) {
                ctx.beginPath();
                ctx.moveTo(i - offset, this.y + 10);
                ctx.lineTo(i - offset - 10, canvas.height);
                ctx.lineTo(i - offset + 5, canvas.height);
                ctx.lineTo(i - offset + 15, this.y + 10);
                ctx.fill();
            }
        }
    },
    update: function () { }
}

const bird = {
    x: 50, y: 150, w: 20, h: 20,
    speed: 0, gravity: 0.25, jump: 4.6,
    draw: function () {
        if (frames % 5 == 0 && state.current == state.game) {
            particles.push(new Particle(this.x, this.y + 10, 'trail'));
        }

        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        let rotation = this.speed * 0.1;
        ctx.rotate(Math.max(-25 * DEGREE, Math.min(rotation, 90 * DEGREE)));

        if (colors.glow) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = colors.bird;
        }

        ctx.fillStyle = colors.bird;
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

        if (!colors.glow) {
            ctx.strokeStyle = colors.birdBorder;
            ctx.lineWidth = 2;
            ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);
        }

        ctx.fillStyle = colors.birdBorder;
        ctx.fillRect(-this.w / 2 + 12, -this.h / 2 + 4, 6, 6);

        ctx.restore();
    },
    flap: function () { this.speed = -this.jump; },
    update: function () {
        const period = state.current == state.getReady ? 10 : 5;
        if (state.current == state.getReady) {
            this.y = 150 + Math.cos(frames / 15) * 5;
        } else {
            this.speed += this.gravity;
            this.y += this.speed;
            if (this.y + this.h >= canvas.height - ground.h) {
                this.y = canvas.height - ground.h - this.h;
                if (state.current == state.game) gameOver();
            }
        }
    },
    speedReset: function () { this.speed = 0; }
}

const pipes = {
    position: [], w: 50, gap: 110, dx: 2,
    draw: function () {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.gap;

            ctx.strokeStyle = colors.pipeBorder;
            ctx.lineWidth = 2;

            if (colors.glow) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = colors.pipeBorder;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillStyle = colors.pipe;

            ctx.fillRect(p.x, 0, this.w, topY);
            ctx.strokeRect(p.x, 0, this.w, topY);

            ctx.fillRect(p.x, bottomY, this.w, canvas.height - bottomY - ground.h);
            ctx.strokeRect(p.x, bottomY, this.w, canvas.height - bottomY - ground.h);

            ctx.shadowBlur = 0;

            ctx.fillStyle = colors.glow ? "rgba(176, 38, 255, 0.2)" : "rgba(255,255,255,0.2)";
            ctx.fillRect(p.x + 10, 0, 5, topY);
            ctx.fillRect(p.x + 10, bottomY, 5, canvas.height - bottomY - ground.h);

            if (!colors.glow) {
                ctx.fillStyle = colors.pipe;
                ctx.fillRect(p.x - 2, topY - 20, this.w + 4, 20);
                ctx.strokeRect(p.x - 2, topY - 20, this.w + 4, 20);
                ctx.fillRect(p.x - 2, bottomY, this.w + 4, 20);
                ctx.strokeRect(p.x - 2, bottomY, this.w + 4, 20);
            }
        }
    },
    update: function () {
        if (state.current !== state.game) return;

        if (frames % 100 == 0) {
            this.position.push({
                x: canvas.width,
                y: Math.max(50, Math.random() * (canvas.height - ground.h - 150))
            });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            const pad = 4;
            if (
                bird.x + bird.w - pad > p.x &&
                bird.x + pad < p.x + this.w &&
                (bird.y + pad < p.y || bird.y + bird.h - pad > p.y + this.gap)
            ) {
                gameOver();
            }

            if (p.x + this.w <= 0) {
                this.position.shift();
                score.value += 1;
                sfx.score();
                score.best = Math.max(score.value, score.best);
                localStorage.setItem('neon_flap_best', score.best);
            }
        }
    },
    reset: function () { this.position = []; }
}

const score = {
    best: localStorage.getItem('neon_flap_best') || 0,
    value: 0,
    draw: function () {
        ctx.fillStyle = colors.textMain;
        ctx.strokeStyle = colors.textShadow;
        ctx.lineWidth = 2;

        if (state.current == state.game) {
            ctx.font = "40px 'Press Start 2P'";
            if (colors.glow) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = colors.textShadow;
            }
            ctx.fillText(this.value, canvas.width / 2 - 15, 60);
            ctx.shadowBlur = 0;
            if (!colors.glow) ctx.strokeText(this.value, canvas.width / 2 - 15, 60);

        } else if (state.current == state.over) {
            ctx.fillStyle = colors.glow ? "rgba(0,0,0,0.8)" : "#ded895";
            ctx.fillRect(canvas.width / 2 - 100, 160, 200, 120);
            ctx.strokeRect(canvas.width / 2 - 100, 160, 200, 120);

            ctx.fillStyle = colors.glow ? "#fff" : "#e67e22";
            ctx.textAlign = "center";
            ctx.font = "15px 'Press Start 2P'";
            ctx.fillText("SCORE", canvas.width / 2, 190);
            ctx.font = "25px 'Press Start 2P'";
            ctx.fillStyle = colors.glow ? "#0ff" : "#fff";
            if (!colors.glow) ctx.strokeText(this.value, canvas.width / 2, 220);
            ctx.fillText(this.value, canvas.width / 2, 220);

            ctx.fillStyle = colors.glow ? "#fff" : "#e67e22";
            ctx.font = "10px 'Press Start 2P'";
            ctx.fillText("BEST: " + this.best, canvas.width / 2, 260);
            ctx.textAlign = "start";
        }
    },
    reset: function () { this.value = 0; }
}

function gameOver() {
    if (state.current == state.over) return;
    state.current = state.over;
    sfx.crash();
    createExplosion(bird.x + bird.w / 2, bird.y + bird.h / 2);
    shake = 20;
    dieFrame = frames;
}

function draw() {
    ctx.save();
    if (shake > 0) {
        let dx = (Math.random() - 0.5) * shake;
        let dy = (Math.random() - 0.5) * shake;
        ctx.translate(dx, dy);
        shake *= 0.9;
        if (shake < 0.5) shake = 0;
    }

    bg.draw();
    pipes.draw();
    ground.draw();

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    if (state.current != state.over || (Math.floor(Date.now() / 200) % 2)) {
        if (state.current != state.over || frames - dieFrame < 10) bird.draw();
    }

    score.draw();

    if (state.current == state.getReady) {
        ctx.fillStyle = colors.textMain;
        ctx.strokeStyle = colors.textShadow;
        ctx.textAlign = "center";
        ctx.font = "20px 'Press Start 2P'";

        if (colors.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = colors.textMain;
        }
        ctx.fillText("DIMENSION FLAP", canvas.width / 2, 200);
        ctx.shadowBlur = 0;
        if (!colors.glow) ctx.strokeText("DIMENSION FLAP", canvas.width / 2, 200);

    } else if (state.current == state.over) {
        ctx.fillStyle = colors.glow ? "#ff0055" : "#e74c3c";
        ctx.textAlign = "center";
        ctx.font = "30px 'Press Start 2P'";

        if (colors.glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ff0055";
        } else {
            ctx.strokeText("GAME OVER", canvas.width / 2, 120);
        }
        ctx.fillText("GAME OVER", canvas.width / 2, 120);
        ctx.shadowBlur = 0;

        if (frames - dieFrame > 30) {
            ctx.fillStyle = colors.textMain;
            ctx.font = "10px 'Press Start 2P'";
            ctx.fillText("Tap to Restart", canvas.width / 2, 320);
        }
    }
    ctx.textAlign = "start";

    ctx.restore();
}

function loop() {
    bird.update();
    pipes.update();
    draw();
    frames++;
    requestAnimationFrame(loop);
}

loop();