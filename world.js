// world.js - Game World, Starfield, and Space Stations

class Starfield {
    constructor(width, height) {
        this.layers = [];
        this.width = width;
        this.height = height;

        // Create multiple parallax layers
        this.createLayer(200, 0.1, 1, 'rgba(255, 255, 255, 0.3)');  // Distant
        this.createLayer(100, 0.2, 1.5, 'rgba(255, 255, 255, 0.5)'); // Medium
        this.createLayer(50, 0.4, 2, 'rgba(255, 255, 255, 0.8)');    // Close
        this.createLayer(10, 0.6, 3, 'rgba(200, 220, 255, 1)');      // Very close
    }

    createLayer(count, parallax, size, color) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * this.width * 4 - this.width * 2,
                y: Math.random() * this.height * 4 - this.height * 2,
                size: Math.random() * size + 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
        this.layers.push({ stars, parallax, color });
    }

    render(ctx, camera, dt) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        for (const layer of this.layers) {
            ctx.fillStyle = layer.color;

            for (const star of layer.stars) {
                // Parallax offset
                const px = star.x - camera.x * layer.parallax;
                const py = star.y - camera.y * layer.parallax;

                // Only render stars that are on or near screen
                if (px > -50 && px < w + 50 && py > -50 && py < h + 50) {
                    // Twinkle effect
                    star.twinkle += dt * (1 + Math.random());
                    const twinkleAlpha = 0.5 + Math.sin(star.twinkle) * 0.5;

                    ctx.globalAlpha = twinkleAlpha;
                    ctx.beginPath();
                    ctx.arc(px, py, star.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;
    }
}

class SpaceStation {
    constructor(x, y, name, type = 'trading') {
        this.x = x;
        this.y = y;
        this.name = name;
        this.type = type;
        this.size = 60;
        this.dockRadius = 120; // Increased from 100
        this.rotation = 0;
        this.rotationSpeed = 0.1;

        // Station services
        this.services = {
            repair: true,
            refuel: true,
            missions: true
        };

        // Docking state
        this.dockedShip = null;

        // Visual properties
        this.color = '#00d4ff';
        this.secondaryColor = '#4dd9ff';

        // Station lights
        this.lights = [];
        for (let i = 0; i < 8; i++) {
            this.lights.push({
                angle: (Math.PI * 2 / 8) * i,
                phase: Math.random() * Math.PI * 2
            });
        }

        // Load station image
        this.image = new Image();
        this.image.src = 'assets/space_station.png';
    }

    update(dt) {
        this.rotation += this.rotationSpeed * dt;
    }

    canDock(ship) {
        const dx = ship.x - this.x;
        const dy = ship.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);

        return distance < this.dockRadius && speed < 80; // Increased speed limit from 50 to 80
    }

    dock(ship) {
        ship.isDocked = true;
        ship.x = this.x;
        ship.y = this.y;
        ship.vx = 0;
        ship.vy = 0;
        this.dockedShip = ship;

        // Repair ship when docking
        ship.repair();

        return true;
    }

    undock(ship) {
        ship.isDocked = false;
        ship.x = this.x + this.dockRadius + 50;
        ship.y = this.y;
        this.dockedShip = null;
    }

    render(ctx, camera, time) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Dock zone indicator
        ctx.save();
        ctx.translate(screenX, screenY);

        // Dock radius circle
        ctx.beginPath();
        ctx.arc(0, 0, this.dockRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Station body (Procedural Pixel Art)
        ctx.rotate(this.rotation);

        const pSize = 4;
        const grid = this.getPixelSprite();
        const offsetX = -(grid[0].length * pSize) / 2;
        const offsetY = -(grid.length * pSize) / 2;

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const pixel = grid[y][x];
                if (pixel > 0) {
                    ctx.fillStyle = pixel === 1 ? this.color : (pixel === 2 ? '#555' : '#fff');
                    ctx.fillRect(offsetX + x * pSize, offsetY + y * pSize, pSize, pSize);
                }
            }
        }

        // Blinking lights
        for (const light of this.lights) {
            const phase = (time / 1000 + light.phase) % (Math.PI * 2);
            const alpha = Math.sin(phase) > 0 ? 0.8 : 0.2;

            const lx = Math.cos(light.angle) * this.size;
            const ly = Math.sin(light.angle) * this.size;

            ctx.beginPath();
            ctx.arc(lx, ly, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
            ctx.fill();
        }

        ctx.restore();

        // Station name
        ctx.save();
        ctx.font = '12px "Orbitron", sans-serif';
        ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, screenX, screenY - this.size - 15);
        ctx.restore();
    }

    getPixelSprite() {
        // Large circular station grid
        return [
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 1, 1, 2, 2, 2, 1, 1, 0],
            [0, 1, 2, 0, 0, 0, 2, 1, 0],
            [1, 2, 0, 1, 1, 1, 0, 2, 1],
            [1, 2, 0, 1, 2, 1, 0, 2, 1],
            [1, 2, 0, 1, 1, 1, 0, 2, 1],
            [0, 1, 2, 0, 0, 0, 2, 1, 0],
            [0, 1, 1, 2, 2, 2, 1, 1, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0]
        ];
    }
}

class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.starfield = null;
        this.stations = [];
        this.explosions = [];

        // World bounds (soft)
        this.bounds = {
            left: -width / 2,
            right: width / 2,
            top: -height / 2,
            bottom: height / 2
        };
    }

    init(canvasWidth, canvasHeight) {
        this.starfield = new Starfield(canvasWidth, canvasHeight);

        // Create some space stations
        this.stations.push(new SpaceStation(0, 0, 'ALPHA STATION', 'home'));
        this.stations.push(new SpaceStation(2000, 500, 'TRADING POST', 'trading'));
        this.stations.push(new SpaceStation(-1500, 1200, 'OUTPOST GAMMA', 'military'));
        this.stations.push(new SpaceStation(1000, -1800, 'RESEARCH LAB', 'science'));
    }

    update(dt, time) {
        // Update stations
        for (const station of this.stations) {
            station.update(dt);
        }

        // Update explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const exp = this.explosions[i];
            exp.age += dt;
            if (exp.age > exp.duration) {
                this.explosions.splice(i, 1);
            }
        }
    }

    createExplosion(x, y, size) {
        this.explosions.push({
            x, y,
            size,
            age: 0,
            duration: 0.8,
            particles: this.generateExplosionParticles(x, y, size)
        });
    }

    generateExplosionParticles(x, y, size) {
        const particles = [];
        const count = 20 + Math.floor(size);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4,
                color: Math.random() > 0.5 ? '#ff6b35' : '#ffd700'
            });
        }
        return particles;
    }

    render(ctx, camera, dt, time) {
        // Render starfield
        if (this.starfield) {
            this.starfield.render(ctx, camera, dt);
        }

        // Render stations
        for (const station of this.stations) {
            station.render(ctx, camera, time);
        }

        // Render explosions
        this.renderExplosions(ctx, camera, dt);
    }

    renderExplosions(ctx, camera, dt) {
        for (const exp of this.explosions) {
            const progress = exp.age / exp.duration;

            // Update and render particles
            for (const p of exp.particles) {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.95;
                p.vy *= 0.95;

                const screenX = p.x - camera.x;
                const screenY = p.y - camera.y;
                const alpha = 1 - progress;
                const size = p.size * (1 - progress * 0.5);

                ctx.beginPath();
                ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
                ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
                ctx.globalAlpha = alpha;
                ctx.fill();
            }

            // Central flash
            if (progress < 0.3) {
                const flashAlpha = (0.3 - progress) / 0.3;
                const flashSize = exp.size * (1 + progress * 3);

                ctx.beginPath();
                ctx.arc(exp.x - camera.x, exp.y - camera.y, flashSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha * 0.5})`;
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    findNearestStation(x, y) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const station of this.stations) {
            const dx = station.x - x;
            const dy = station.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = station;
            }
        }

        return { station: nearest, distance: nearestDist };
    }

    getStationInDockRange(ship) {
        for (const station of this.stations) {
            if (station.canDock(ship)) {
                return station;
            }
        }
        return null;
    }
}

// Export
window.Starfield = Starfield;
window.SpaceStation = SpaceStation;
window.World = World;
