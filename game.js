// game.js - Main Game Engine

class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Off-screen buffer for retro effects
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // Game state
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;

        // Time tracking
        this.lastTime = 0;
        this.deltaTime = 0;
        this.gameTime = 0;
        this.timeScale = 1.0;

        // Camera
        this.camera = { x: 0, y: 0 };

        // Waypoint system
        this.waypoint = null;

        // Game objects
        this.player = null;
        this.world = null;
        this.enemySpawner = null;
        this.missionSystem = null;
        this.ui = null;

        // Player resources
        this.credits = 500;

        // Input state
        this.keys = {};
        this.mousePos = { x: 0, y: 0 };

        // Retro graphics settings
        this.retroFX = {
            scanlines: true,
            chromaticAberration: true,
            vignette: true,
            bloom: true,
            colorDepth: 32, // Simulated color depth (lower = more retro)
            pixelScale: 1   // 2 = half resolution for chunky pixels
        };

        // Bind methods
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    async init() {
        // Initialize audio
        await window.audioManager.init();

        // Setup canvas
        this.handleResize();

        // Create world
        this.world = new World(6000, 6000);
        this.world.init(this.canvas.width, this.canvas.height);

        // Create player
        this.player = new Ship(0, 200, true);

        // Create enemy spawner
        this.enemySpawner = new EnemySpawner(this.world);

        // Spawn some initial enemies
        this.enemySpawner.spawnAt(500, 300, 'fighter');
        this.enemySpawner.spawnAt(-600, 400, 'scout');

        // Create mission system
        this.missionSystem = new MissionSystem();

        // Create UI
        this.ui = new UI(this);

        // Setup event listeners
        this.setupEventListeners();

        // Start game loop
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.gameLoop);

        // Show welcome message
        this.showMessage('Welcome to Solar Winds. Press E to dock at stations.');
    }

    setupEventListeners() {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('resize', this.handleResize);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;
        });
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;

        // Resume audio context on first interaction
        window.audioManager.resume();

        // Pause toggle
        if (e.code === 'Escape') {
            if (!this.isGameOver) {
                this.togglePause();
            }
        }

        // Star map toggle
        if (e.code === 'Tab') {
            e.preventDefault();
            this.ui.toggleStarMap();
        }

        // Dock
        if (e.code === 'KeyE') {
            this.tryDock();
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const controlPanel = document.getElementById('control-panel');
        const controlPanelHeight = controlPanel ? controlPanel.offsetHeight : 100;

        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight - controlPanelHeight;

        // Also resize offscreen canvas
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
    }

    handleClick(e) {
        // Resume audio on click
        window.audioManager.resume();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.ui.showPause();
        } else {
            this.ui.hidePause();
        }
    }

    tryDock() {
        if (this.player.isDocked) return;

        const station = this.world.getStationInDockRange(this.player);
        if (station) {
            station.dock(this.player);
            window.audioManager.play('dock');
            this.missionSystem.onStationVisited(station);
            this.ui.showStationDialogue(station);
        } else {
            this.showMessage('No station in range. Approach slowly to dock.');
        }
    }

    showMessage(text, duration = 3) {
        if (this.ui) {
            this.ui.showMessage(text, duration);
        }
    }

    createExplosion(x, y, size) {
        if (this.world) {
            this.world.createExplosion(x, y, size);
        }
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;

        try {
            // Calculate delta time
            this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1) * this.timeScale;
            this.lastTime = currentTime;

            if (!this.isPaused && !this.isGameOver) {
                this.gameTime += this.deltaTime;
                this.update(this.deltaTime);
            }

            this.render();
        } catch (e) {
            console.error('Game Loop Crash:', e);
            this.isRunning = false;
        }

        if (this.isRunning) {
            requestAnimationFrame(this.gameLoop);
        }
    }

    update(dt) {
        // Create input for player
        const input = {
            thrust: this.keys['KeyW'] || this.keys['ArrowUp'],
            brake: this.keys['KeyS'] || this.keys['ArrowDown'],
            rotateLeft: this.keys['KeyA'] || this.keys['ArrowLeft'],
            rotateRight: this.keys['KeyD'] || this.keys['ArrowRight']
        };

        // Fire weapon
        if (this.keys['Space']) {
            this.player.fire();
        }

        // Update player
        this.player.update(dt, input);

        // Update camera to follow player
        this.updateCamera();

        // Update world
        this.world.update(dt, this.gameTime * 1000);

        // Update enemies
        this.enemySpawner.update(dt, this.player);

        // Auto-target enemies if weapon seeking is enabled
        if (this.player.weaponSeeking > 0) {
            this.player.autoTarget(this.enemySpawner.getAll());
        }

        // Update missions
        this.missionSystem.update(dt);

        // Check collisions
        this.checkCollisions();

        // Check game over
        if (this.player.isDestroyed) {
            this.gameOver();
        }

        // Update UI
        this.ui.update(dt, this.player);
    }

    updateCamera() {
        // Smooth camera follow
        const targetX = this.player.x - this.canvas.width / 2;
        const targetY = this.player.y - this.canvas.height / 2;

        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;
    }

    checkCollisions() {
        const enemies = this.enemySpawner.getAll();

        // Player projectiles vs enemies
        for (const proj of this.player.projectiles) {
            for (const enemy of enemies) {
                if (enemy.isDestroyed) continue;

                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.size) {
                    enemy.takeDamage(proj.damage);
                    proj.age = 10; // Mark for removal

                    if (enemy.isDestroyed) {
                        this.credits += enemy.credits;
                        this.missionSystem.onEnemyKilled(enemy.type);
                        this.showMessage(`+${enemy.credits} credits`);
                    }
                }
            }
        }

        // Enemy projectiles vs player
        for (const enemy of enemies) {
            for (const proj of enemy.projectiles) {
                const dx = proj.x - this.player.x;
                const dy = proj.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.player.size) {
                    this.player.takeDamage(proj.damage);
                    proj.age = 10; // Mark for removal
                }
            }
        }

        // Remove marked projectiles
        this.player.projectiles = this.player.projectiles.filter(p => p.age < 10);
        for (const enemy of enemies) {
            enemy.projectiles = enemy.projectiles.filter(p => p.age < 10);
        }
    }

    render() {
        // Render to offscreen buffer first
        const offCtx = this.offscreenCtx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear offscreen buffer with transparency to avoid "white boxes" in additive blending
        offCtx.clearRect(0, 0, w, h);

        // Render world (starfield, stations, explosions)
        this.world.render(offCtx, this.camera, this.deltaTime, this.gameTime * 1000);

        // Render enemies
        this.enemySpawner.render(offCtx, this.camera);

        // Render player
        if (!this.player.isDestroyed) {
            this.player.render(offCtx, this.camera);
            this.player.renderProjectiles(offCtx, this.camera);
        }

        // Render dock indicator
        this.renderDockIndicator(offCtx);

        // Apply retro post-processing to main canvas
        this.applyRetroFX();
    }

    applyRetroFX() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear main canvas with deep dark space color
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);

        // Chromatic aberration (RGB shift)
        if (this.retroFX.chromaticAberration) {
            const aberration = 2;

            // Draw original content
            ctx.drawImage(this.offscreenCanvas, 0, 0);

            // Red shift (additive)
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.5;
            ctx.drawImage(this.offscreenCanvas, -aberration, 0);

            // Blue shift (additive)
            ctx.drawImage(this.offscreenCanvas, aberration, 0);
            ctx.restore();
        } else {
            ctx.drawImage(this.offscreenCanvas, 0, 0);
        }

        // Bloom/glow effect
        if (this.retroFX.bloom) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.08;
            ctx.filter = 'blur(8px)';
            ctx.drawImage(this.offscreenCanvas, 0, 0);
            ctx.filter = 'blur(16px)';
            ctx.globalAlpha = 0.05;
            ctx.drawImage(this.offscreenCanvas, 0, 0);
            ctx.restore();
        }

        // Scanlines
        if (this.retroFX.scanlines) {
            ctx.save();
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = ctx.createPattern(this.getScanlinePattern(), 'repeat');
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }

        // Vignette
        if (this.retroFX.vignette) {
            const gradient = ctx.createRadialGradient(
                w / 2, h / 2, h * 0.3,
                w / 2, h / 2, h * 0.9
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        // Subtle CRT curve distortion (just corners)
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const curveGrad = ctx.createRadialGradient(
            w / 2, h / 2, 0,
            w / 2, h / 2, Math.max(w, h) * 0.7
        );
        curveGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        curveGrad.addColorStop(0.85, 'rgba(200, 200, 220, 1)');
        curveGrad.addColorStop(1, 'rgba(100, 100, 120, 1)');
        ctx.fillStyle = curveGrad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    getScanlinePattern() {
        if (this._scanlinePattern) return this._scanlinePattern;

        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 2;
        patternCanvas.height = 4;
        const pCtx = patternCanvas.getContext('2d');

        pCtx.fillStyle = 'rgba(0, 0, 0, 0)';
        pCtx.fillRect(0, 0, 2, 4);
        pCtx.fillStyle = 'rgba(0, 0, 0, 1)';
        pCtx.fillRect(0, 2, 2, 1);

        this._scanlinePattern = patternCanvas;
        return patternCanvas;
    }

    renderDockIndicator(ctx) {
        if (this.player.isDocked) return;

        const station = this.world.getStationInDockRange(this.player);
        if (station) {
            const screenX = station.x - this.camera.x;
            const screenY = station.y - this.camera.y;

            ctx.save();
            ctx.font = '14px "Orbitron", sans-serif';
            ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
            ctx.textAlign = 'center';

            // Check speed
            const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
            if (speed < 80) {
                ctx.fillText('Press E to dock', screenX, screenY + station.size + 30);
            } else {
                ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
                ctx.fillText('Slow down to dock', screenX, screenY + station.size + 30);
            }
            ctx.restore();
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.ui.showGameOver();
    }

    restart() {
        // Reset game state
        this.isGameOver = false;
        this.isPaused = false;
        this.credits = 500;
        this.gameTime = 0;

        // Reset player
        this.player = new Ship(0, 200, true);

        // Reset enemies
        this.enemySpawner = new EnemySpawner(this.world);
        this.enemySpawner.spawnAt(500, 300, 'fighter');
        this.enemySpawner.spawnAt(-600, 400, 'scout');

        // Reset missions
        this.missionSystem = new MissionSystem();

        // Hide game over screen
        this.ui.hideGameOver();

        this.showMessage('Ship systems online. Good luck, pilot.');
    }
    setGameSpeed(speed) {
        this.timeScale = speed;
    }

    setWaypoint(x, y) {
        this.waypoint = { x, y, active: true };
        this.showMessage('Waypoint set');
    }

    clearWaypoint() {
        this.waypoint = null;
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', async () => {
    window.game = new Game();
    await window.game.init();
});
