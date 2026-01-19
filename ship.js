// ship.js - Ship Class for Physics and Rendering

class Ship {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.rotation = -Math.PI / 2; // Pointing up by default
        this.size = 20;

        // Ship properties
        this.isPlayer = isPlayer;
        this.maxSpeed = isPlayer ? 400 : 300;  // Player is faster
        this.baseMaxSpeed = this.maxSpeed; // Store base for multipliers
        this.acceleration = isPlayer ? 220 : 150; // Player accelerates faster
        this.rotationAccel = isPlayer ? 5 : 4; // Player turns faster
        this.drag = 0.99; // Less drag = more momentum
        this.brakeMultiplier = 0.92; // Stronger brakes
        this.brakePower = 0.92; // Configurable brake power

        // Health systems
        this.maxHull = 100;
        this.hull = this.maxHull;
        this.maxShields = 100;
        this.shields = this.maxShields;

        // Pixel sprite settings
        this.pixelSize = 3;
        this.sprite = this.generateSprite();

        this.maxEnergy = 100;
        this.energy = this.maxEnergy;

        // Power allocation (each 0-100, total should be 200)
        this.power = {
            engines: 50,
            shields: 50,
            weapons: 50,
            sensors: 50
        };

        // Weapon system
        this.weaponCooldown = 0;
        this.baseFireRate = 0.25; // seconds between shots
        this.weaponSeeking = 0; // Heat-seeking strength (0 = no seeking)
        this.target = null; // Current target for weapons
        this.projectiles = [];

        // State
        this.isThrusting = false;
        this.isBraking = false;
        this.isDocked = false;
        this.isDestroyed = false;

        // Visuals
        this.color = isPlayer ? '#00ff00' : '#ff0000';
        this.trailColor = isPlayer ? 'rgba(0, 255, 100, 0.5)' : 'rgba(255, 50, 50, 0.5)';
        this.trails = [];
    }

    setSpeedMultiplier(mult) {
        this.maxSpeed = this.baseMaxSpeed * mult;
    }

    setBrakePower(power) {
        this.brakePower = power;
    }

    setWeaponSeeking(strength) {
        this.weaponSeeking = strength;
    }

    setTarget(target) {
        this.target = target;
    }

    clearTarget() {
        this.target = null;
    }

    // Auto-target nearest enemy within sensor range
    autoTarget(enemies) {
        if (!enemies || enemies.length === 0) {
            this.target = null;
            return;
        }

        let nearest = null;
        let nearestDist = Infinity;
        const sensorRange = this.getSensorRange();

        for (const enemy of enemies) {
            if (enemy.isDestroyed) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < sensorRange && dist < nearestDist) {
                nearest = enemy;
                nearestDist = dist;
            }
        }

        this.target = nearest;
    }

    generateSprite() {
        // 90s SVGA style ship - 7x10 grid (pointing UP)
        // 0: transparent, 1: primary, 2: secondary, 3: highlight, 4: engine
        return [
            [0, 0, 0, 3, 0, 0, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 1, 3, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 0],
            [0, 1, 3, 1, 3, 1, 0],
            [1, 1, 2, 2, 2, 1, 1],
            [1, 2, 2, 2, 2, 2, 1],
            [1, 1, 0, 0, 0, 1, 1],
            [1, 0, 0, 0, 0, 0, 1],
            [0, 4, 0, 0, 0, 4, 0]
        ];
    }

    update(dt, input) {
        if (this.isDestroyed || this.isDocked) return;

        // Handle rotation
        if (input.rotateLeft) {
            this.rotation -= this.rotationAccel * dt;
        }
        if (input.rotateRight) {
            this.rotation += this.rotationAccel * dt;
        }

        // Handle thrust
        this.isThrusting = input.thrust;
        if (this.isThrusting) {
            // Apply acceleration based on rotation and engine power
            const engineMult = this.power.engines / 50;
            const ax = Math.cos(this.rotation) * this.acceleration * engineMult;
            const ay = Math.sin(this.rotation) * this.acceleration * engineMult;

            this.vx += ax * dt;
            this.vy += ay * dt;

            // Add trail
            if (Math.random() > 0.6) {
                this.addTrail();
            }
        }

        // Handle braking
        this.isBraking = input.brake;
        if (this.isBraking) {
            this.vx *= this.brakePower;
            this.vy *= this.brakePower;
        }

        // Apply drag
        this.vx *= this.drag;
        this.vy *= this.drag;

        // Limit max speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        // Update position
        const nextX = this.x + this.vx * dt;
        const nextY = this.y + this.vy * dt;

        // NaN Guard
        if (!isNaN(nextX) && !isNaN(nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            console.warn('NaN detected in ship position. Resetting velocity.');
            this.vx = 0;
            this.vy = 0;
        }

        // Update weapon cooldown
        if (this.weaponCooldown > 0) {
            this.weaponCooldown -= dt;
        }

        // Regenerate shields
        if (this.shields < this.maxShields) {
            const shieldRegen = (this.power.shields / 100) * 10 * dt;
            this.shields = Math.min(this.maxShields, this.shields + shieldRegen);
        }

        // Update trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            this.trails[i].age += dt;
            if (this.trails[i].age > 0.5) {
                this.trails.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            // Seeking logic
            if (p.seekTarget && !p.seekTarget.isDestroyed) {
                const dx = p.seekTarget.x - p.x;
                const dy = p.seekTarget.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    const angleToTarget = Math.atan2(dy, dx);
                    const currentAngle = Math.atan2(p.vy, p.vx);
                    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

                    // Smooth turning
                    let angleDiff = angleToTarget - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                    const turnRate = p.seekingStrength || 2.0; // Rad/s

                    const newAngle = currentAngle + Math.max(-turnRate * dt, Math.min(turnRate * dt, angleDiff));

                    p.vx = Math.cos(newAngle) * speed;
                    p.vy = Math.sin(newAngle) * speed;
                }
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.age += dt;
            if (p.age > 2) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    getTotalPower() {
        return Object.values(this.power).reduce((a, b) => a + b, 0);
    }

    getSensorRange() {
        return 400 + (this.power.sensors / 100) * 800;
    }

    setPower(system, value) {
        if (this.power.hasOwnProperty(system)) {
            this.power[system] = value;
        }
    }

    repair() {
        this.hull = this.maxHull;
        this.shields = this.maxShields;
        this.energy = this.maxEnergy;
    }

    addTrail() {
        this.trails.push({
            x: this.x - Math.cos(this.rotation) * 15,
            y: this.y - Math.sin(this.rotation) * 15,
            age: 0
        });
    }

    fire() {
        if (this.weaponCooldown > 0 || this.isDocked || this.isDestroyed) return;

        const weaponMult = 1 / (this.power.weapons / 50);
        this.weaponCooldown = this.baseFireRate * weaponMult;

        // Create projectile
        const speed = 600;
        const projectile = {
            x: this.x + Math.cos(this.rotation) * 20,
            y: this.y + Math.sin(this.rotation) * 20,
            vx: Math.cos(this.rotation) * speed + this.vx,
            vy: Math.sin(this.rotation) * speed + this.vy,
            age: 0,
            damage: 10 + (this.power.weapons / 10),
            seekTarget: this.target, // Ship needs to know its target
            seekingStrength: this.weaponSeeking || 0
        };
        this.projectiles.push(projectile);

        // Play sound
        window.audioManager.play('laser');
    }

    takeDamage(amount) {
        if (this.isDestroyed) return;

        // Apply to shields first
        if (this.shields > 0) {
            const shieldDamage = Math.min(this.shields, amount);
            this.shields -= shieldDamage;
            amount -= shieldDamage;
            window.audioManager.play('shieldHit');
        }

        // Apply remaining to hull
        if (amount > 0) {
            this.hull -= amount;
            window.audioManager.play('hullHit');
            if (this.hull <= 0) {
                this.destroy();
            }
        }
    }

    destroy() {
        this.isDestroyed = true;
        window.audioManager.play('explosion');
        if (window.game) {
            window.game.createExplosion(this.x, this.y, 40);
        }
    }

    render(ctx, camera) {
        if (this.isDestroyed) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw trails
        ctx.save();
        for (const trail of this.trails) {
            const alpha = 1 - trail.age / 0.5;
            const size = (1 - trail.age / 0.5) * 6;

            ctx.beginPath();
            ctx.arc(
                trail.x - camera.x,
                trail.y - camera.y,
                size,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = this.trailColor.replace('0.5', alpha * 0.5);
            ctx.fill();
        }
        ctx.restore();

        // Render shield glow
        if (this.shields > 0) {
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.beginPath();
            ctx.arc(0, 0, this.size + 5, 0, Math.PI * 2);
            const shieldAlpha = (this.shields / this.maxShields) * 0.3;
            ctx.strokeStyle = `rgba(0, 212, 255, ${shieldAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Render ship body using pixel-art system
        ctx.save();
        ctx.translate(screenX, screenY);
        // Correcting orientation: rotation 0 is Right, so we add PI/2 to rotate the "Up"-facing sprite
        ctx.rotate(this.rotation + Math.PI / 2);

        const colors = {
            1: this.color,
            2: '#888888',
            3: '#ffffff',
            4: this.isThrusting ? '#ffaa00' : '#440000'
        };

        const grid = this.sprite;
        const pSize = this.pixelSize;
        const offsetX = -(grid[0].length * pSize) / 2;
        const offsetY = -(grid.length * pSize) / 2;

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const pixel = grid[y][x];
                if (pixel > 0) {
                    ctx.fillStyle = colors[pixel] || '#ff00ff';
                    ctx.fillRect(offsetX + x * pSize, offsetY + y * pSize, pSize, pSize);
                }
            }
        }
        ctx.restore();
    }

    renderProjectiles(ctx, camera) {
        for (const proj of this.projectiles) {
            const screenX = proj.x - camera.x;
            const screenY = proj.y - camera.y;

            const angle = Math.atan2(proj.vy, proj.vx);

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(angle);

            const gradient = ctx.createLinearGradient(-15, 0, 10, 0);
            gradient.addColorStop(0, 'rgba(0, 255, 100, 0)');
            gradient.addColorStop(0.5, 'rgba(0, 255, 100, 0.8)');
            gradient.addColorStop(1, 'rgba(200, 255, 200, 1)');

            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(10, 0);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }
    }

    getBounds() {
        return {
            x: this.x - this.size,
            y: this.y - this.size,
            width: this.size * 2,
            height: this.size * 2
        };
    }
}

// Export for use in other files
window.Ship = Ship;
