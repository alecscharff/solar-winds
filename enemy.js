// enemy.js - Enemy ship logic and spawning

class Enemy extends Ship {
    constructor(x, y, type = 'fighter') {
        super(x, y, false);
        this.type = type;
        this.state = 'patrol';
        this.target = null;
        this.stateTimer = 0;
        this.patrolAngle = Math.random() * Math.PI * 2;
        this.patrolSpeed = 0.3 + Math.random() * 0.3;

        // Combat parameters
        this.aggroRange = 300;  // Reduced from 400 - easier to avoid
        this.attackRange = 200; // Reduced from 250
        this.evadeThreshold = 35; // Hull percentage to start evading (more cautious)
        this.pursuitChance = 0.6; // Only pursue 60% of time

        // Different enemy types
        this.configureType(type);
    }

    configureType(type) {
        this.weaponSeeking = 3.0; // Default turning rate for seeking

        switch (type) {
            case 'scout':
                this.color = '#ffaa00';
                this.trailColor = 'rgba(255, 170, 0, 0.5)';
                this.size = 14;
                this.maxSpeed = 280; // Reduced from 350
                this.baseMaxSpeed = 280;
                this.acceleration = 140; // Reduced from 180
                this.maxHull = 50;
                this.hull = this.maxHull;
                this.maxShields = 30;
                this.shields = this.maxShields;
                this.evadeThreshold = 50; // More likely to flee
                this.credits = 100;
                this.weaponSeeking = 0; // Scouts don't seek
                break;

            case 'fighter':
                this.color = '#ff3366';
                this.trailColor = 'rgba(255, 51, 102, 0.5)';
                this.size = 18;
                this.maxSpeed = 220; // Reduced from 280
                this.baseMaxSpeed = 220;
                this.acceleration = 120; // Reduced from 150
                this.maxHull = 80;
                this.hull = this.maxHull;
                this.maxShields = 60;
                this.shields = this.maxShields;
                this.credits = 200;
                this.weaponSeeking = 2.0; // Moderate seeking
                break;

            case 'heavy':
                this.color = '#9d4edd';
                this.trailColor = 'rgba(157, 78, 221, 0.5)';
                this.size = 24;
                this.maxSpeed = 150; // Reduced from 200 - very slow
                this.baseMaxSpeed = 150;
                this.acceleration = 70; // Reduced from 100
                this.maxHull = 180;
                this.hull = this.maxHull;
                this.maxShields = 120;
                this.shields = this.maxShields;
                this.power.weapons = 70;
                this.evadeThreshold = 20;
                this.credits = 500;
                this.weaponSeeking = 4.0; // Strong seeking
                break;
        }

        // Regenerate sprite for type
        this.sprite = this.getPixelSprite();
    }

    update(dt, player) {
        this.stateTimer += dt;
        const distToPlayer = Math.sqrt(
            Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
        );

        const input = {
            thrust: false,
            brake: false,
            rotateLeft: false,
            rotateRight: false
        };

        if (!this.isDestroyed) {
            // Check for state transitions
            if (this.state === 'patrol') {
                // Only pursue sometimes - gives player chance to slip by
                if (distToPlayer < this.aggroRange && Math.random() < this.pursuitChance) {
                    this.state = 'pursue';
                    this.target = player;
                    this.stateTimer = 0;
                }
            } else if (this.state === 'pursue') {
                // Larger leash - easier to escape (2.5x instead of 1.5x)
                if (distToPlayer > this.aggroRange * 2.5) {
                    this.state = 'patrol';
                    this.stateTimer = 0;
                } else if (distToPlayer < this.attackRange) {
                    this.state = 'attack';
                    this.stateTimer = 0;
                }
            } else if (this.state === 'attack') {
                if (distToPlayer > this.attackRange * 1.5) {
                    this.state = 'pursue';
                    this.stateTimer = 0;
                }

                // Evade if hull is low
                if ((this.hull / this.maxHull) * 100 < this.evadeThreshold) {
                    this.state = 'evade';
                    this.stateTimer = 0;
                }
            } else if (this.state === 'evade') {
                if (distToPlayer > this.aggroRange * 1.5 || this.stateTimer > 5) {
                    this.state = 'patrol';
                    this.stateTimer = 0;
                }
            }

            // Execute state logic
            const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);

            switch (this.state) {
                case 'patrol':
                    this.executePatrol(dt, input);
                    break;
                case 'pursue':
                    this.executePursue(angleToPlayer, input);
                    break;
                case 'attack':
                    this.executeAttack(angleToPlayer, input);
                    break;
                case 'evade':
                    this.executeEvade(angleToPlayer, input);
                    break;
            }

            // Auto-fire in attack state
            if (this.state === 'attack' && distToPlayer < this.attackRange && Math.random() < 0.1) {
                this.fire();
            }
        }

        super.update(dt, input);
    }

    executePatrol(dt, input) {
        // Slow lazy circle
        this.patrolAngle += this.patrolSpeed * dt;
        const targetX = this.x + Math.cos(this.patrolAngle) * 100;
        const targetY = this.y + Math.sin(this.patrolAngle) * 100;
        const angle = Math.atan2(targetY - this.y, targetX - this.x);

        this.rotateToward(angle, input);
        input.thrust = true;
    }

    executePursue(angleToPlayer, input) {
        this.rotateToward(angleToPlayer, input);

        const angleDiff = this.angleDifference(this.rotation, angleToPlayer);
        // Only thrust 70% of the time - gives player speed advantage
        if (Math.abs(angleDiff) < 0.8 && Math.random() > 0.3) {
            input.thrust = true;
        }
    }

    executeAttack(angleToPlayer, input) {
        // Face player but don't always thrust
        this.rotateToward(angleToPlayer, input);

        const dist = Math.sqrt(Math.pow(this.target.x - this.x, 2) + Math.pow(this.target.y - this.y, 2));
        if (dist > this.attackRange * 0.8) {
            input.thrust = true;
        } else if (dist < this.attackRange * 0.4) {
            // Back away or orbit
            this.rotateToward(angleToPlayer + Math.PI, input);
            input.thrust = true;
        }
    }

    executeEvade(angleToPoint, input) {
        // Fly away from point
        this.rotateToward(angleToPoint + Math.PI, input);
        input.thrust = true;
    }

    rotateToward(targetAngle, input) {
        const diff = this.angleDifference(this.rotation, targetAngle);
        if (diff > 0.1) {
            input.rotateRight = true;
        } else if (diff < -0.1) {
            input.rotateLeft = true;
        }
    }

    angleDifference(a1, a2) {
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    getPixelSprite() {
        if (this.type === 'scout') {
            return [
                [0, 1, 0],
                [1, 3, 1],
                [1, 1, 1],
                [1, 0, 1],
                [4, 0, 4]
            ];
        } else if (this.type === 'heavy') {
            return [
                [0, 0, 1, 1, 1, 0, 0],
                [0, 1, 1, 1, 1, 1, 0],
                [1, 1, 3, 3, 3, 1, 1],
                [1, 1, 1, 1, 1, 1, 1],
                [1, 2, 2, 2, 2, 2, 1],
                [1, 2, 1, 1, 1, 2, 1],
                [1, 1, 0, 0, 0, 1, 1],
                [4, 4, 0, 0, 0, 4, 4]
            ];
        } else { // fighter
            return [
                [0, 0, 1, 0, 0],
                [0, 1, 3, 1, 0],
                [1, 1, 1, 1, 1],
                [1, 2, 1, 2, 1],
                [1, 0, 0, 0, 1],
                [4, 0, 0, 0, 4]
            ];
        }
    }

    render(ctx, camera) {
        if (this.isDestroyed) return;

        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Simple trail
        this.renderTrail(ctx, camera);

        // Render shield
        if (this.shields > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.size + 3, 0, Math.PI * 2);
            const sAlpha = (this.shields / this.maxShields) * 0.2;
            ctx.strokeStyle = `rgba(150, 0, 255, ${sAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Render pixel ship body
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.rotation + Math.PI / 2);

        const grid = this.sprite || this.getPixelSprite();
        const pSize = this.type === 'heavy' ? 4 : 3;

        const colors = {
            1: this.color,
            2: '#555555',
            3: '#ff00ff', // Cockpit
            4: this.isThrusting ? '#ffaa00' : '#220000'
        };

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

        this.renderProjectiles(ctx, camera);
    }

    renderTrail(ctx, camera) {
        ctx.save();
        for (const trail of this.trails) {
            const alpha = 1 - trail.age / 0.5;
            ctx.beginPath();
            ctx.arc(trail.x - camera.x, trail.y - camera.y, 4 * alpha, 0, Math.PI * 2);
            ctx.fillStyle = this.trailColor.replace('0.5', alpha * 0.3);
            ctx.fill();
        }
        ctx.restore();
    }
    applySpeedMultiplier(mult) {
        if (this.baseMaxSpeed) {
            this.maxSpeed = this.baseMaxSpeed * mult;
        }
    }
}

class EnemySpawner {
    constructor(world) {
        this.world = world;
        this.enemies = [];
        this.maxEnemies = 8;
        this.spawnInterval = 5;
        this.spawnCooldown = 0;
        this.speedMultiplier = 1.0;
    }

    setSpeedMultiplier(mult) {
        this.speedMultiplier = mult;
        // Update existing
        this.enemies.forEach(e => e.applySpeedMultiplier(mult));
    }

    update(dt, player) {
        // Update existing enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, player);

            if (enemy.isDestroyed && enemy.projectiles.length === 0) {
                this.enemies.splice(i, 1);
            }
        }

        // Spawn new enemies
        this.spawnCooldown -= dt;
        if (this.spawnCooldown <= 0 && this.enemies.length < this.maxEnemies) {
            this.spawnEnemy(player);
            this.spawnCooldown = this.spawnInterval;
        }
    }

    spawnEnemy(player) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 800 + Math.random() * 500;
        const x = player.x + Math.cos(angle) * distance;
        const y = player.y + Math.sin(angle) * distance;

        const types = ['scout', 'fighter', 'fighter', 'heavy'];
        const type = types[Math.floor(Math.random() * types.length)];

        const enemy = new Enemy(x, y, type);
        this.enemies.push(enemy);
        return enemy;
    }

    spawnAt(x, y, type = 'fighter') {
        const enemy = new Enemy(x, y, type);
        this.enemies.push(enemy);
        return enemy;
    }

    render(ctx, camera) {
        for (const enemy of this.enemies) {
            enemy.render(ctx, camera);
        }
    }

    getAll() {
        return this.enemies;
    }
}

// Export
window.Enemy = Enemy;
window.EnemySpawner = EnemySpawner;
