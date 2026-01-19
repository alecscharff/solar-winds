// ui.js - User Interface Management

class UI {
    constructor(game) {
        this.game = game;

        // Cache DOM elements
        this.elements = {
            hullBar: document.getElementById('hull-bar'),
            hullValue: document.getElementById('hull-value'),
            shieldBar: document.getElementById('shield-bar'),
            shieldValue: document.getElementById('shield-value'),
            energyBar: document.getElementById('energy-bar'),
            energyValue: document.getElementById('energy-value'),
            coordX: document.getElementById('coord-x'),
            coordY: document.getElementById('coord-y'),
            messageDisplay: document.getElementById('message-display'),
            minimap: document.getElementById('minimap'),
            powerEngines: document.getElementById('power-engines'),
            powerShields: document.getElementById('power-shields'),
            powerWeapons: document.getElementById('power-weapons'),
            powerSensors: document.getElementById('power-sensors'),
            powerEnginesValue: document.getElementById('power-engines-value'),
            powerShieldsValue: document.getElementById('power-shields-value'),
            powerWeaponsValue: document.getElementById('power-weapons-value'),
            powerSensorsValue: document.getElementById('power-sensors-value'),
            powerTotal: document.getElementById('power-total'),
            missionText: document.getElementById('mission-text'),
            dialogueBox: document.getElementById('dialogue-box'),
            dialogueTitle: document.getElementById('dialogue-title'),
            dialogueContent: document.getElementById('dialogue-content'),
            dialogueOptions: document.getElementById('dialogue-options'),
            dialogueClose: document.getElementById('dialogue-close'),
            starMap: document.getElementById('star-map'),
            starMapCanvas: document.getElementById('star-map-canvas'),
            gameOver: document.getElementById('game-over'),
            pauseScreen: document.getElementById('pause-screen'),
            restartBtn: document.getElementById('restart-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            // Settings inputs
            settingMusicVol: document.getElementById('setting-music-vol'),
            settingSfxVol: document.getElementById('setting-sfx-vol'),
            settingGameSpeed: document.getElementById('setting-game-speed'),
            settingPlayerSpeed: document.getElementById('setting-player-speed'),
            settingEnemySpeed: document.getElementById('setting-enemy-speed'),
            settingBrakePower: document.getElementById('setting-brake-power'),
            settingWeaponSeeking: document.getElementById('setting-weapon-seeking'),
            // Settings values
            valMusicVol: document.getElementById('val-music-vol'),
            valSfxVol: document.getElementById('val-sfx-vol'),
            valGameSpeed: document.getElementById('val-game-speed'),
            valPlayerSpeed: document.getElementById('val-player-speed'),
            valEnemySpeed: document.getElementById('val-enemy-speed'),
            valBrakePower: document.getElementById('val-brake-power'),
            valWeaponSeeking: document.getElementById('val-weapon-seeking')
        };

        // Minimap context
        this.minimapCtx = this.elements.minimap.getContext('2d');
        this.elements.minimap.width = 150;
        this.elements.minimap.height = 120;

        // Star map context
        this.starMapCtx = this.elements.starMapCanvas.getContext('2d');

        // Message queue
        this.messages = [];
        this.currentMessage = null;
        this.messageTimer = 0;

        // Setup event listeners
        this.setupEventListeners();

        // Star Map Click Listener for Waypoints
        this.elements.starMapCanvas.addEventListener('click', (e) => {
            const rect = this.elements.starMapCanvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            this.handleStarMapClick(clickX, clickY);
        });
    }

    setupEventListeners() {
        // Power sliders
        const powerSliders = ['Engines', 'Shields', 'Weapons', 'Sensors'];
        powerSliders.forEach(system => {
            const slider = this.elements[`power${system}`];
            slider.addEventListener('input', () => {
                this.onPowerChange(system.toLowerCase(), parseInt(slider.value));
            });
        });

        // Dialogue close button
        this.elements.dialogueClose.addEventListener('click', () => {
            this.hideDialogue();
        });

        // Restart button
        this.elements.restartBtn.addEventListener('click', () => {
            this.game.restart();
        });

        // Resume button
        if (this.elements.resumeBtn) {
            this.elements.resumeBtn.addEventListener('click', () => {
                this.game.togglePause();
            });
        }

        // Settings Listeners
        this.setupSettingListener('settingMusicVol', 'valMusicVol', (val) => {
            return val + '%';
        }, (val) => {
            window.audioManager.setMusicVolume(val / 100);
        });

        this.setupSettingListener('settingSfxVol', 'valSfxVol', (val) => {
            return val + '%';
        }, (val) => {
            window.audioManager.setSfxVolume(val / 100);
        });

        this.setupSettingListener('settingGameSpeed', 'valGameSpeed', (val) => {
            return (val / 100).toFixed(1) + 'x';
        }, (val) => {
            this.game.setGameSpeed(val / 100);
        });

        this.setupSettingListener('settingPlayerSpeed', 'valPlayerSpeed', (val) => {
            return (val / 100).toFixed(1) + 'x';
        }, (val) => {
            if (this.game.player) {
                this.game.player.setSpeedMultiplier(val / 100);
            }
        });

        this.setupSettingListener('settingEnemySpeed', 'valEnemySpeed', (val) => {
            return (val / 100).toFixed(1) + 'x';
        }, (val) => {
            this.game.enemySpawner.setSpeedMultiplier(val / 100);
        });

        this.setupSettingListener('settingBrakePower', 'valBrakePower', (val) => {
            return (val / 100).toFixed(2);
        }, (val) => {
            if (this.game.player) {
                this.game.player.setBrakePower(val / 100);
            }
        });

        this.setupSettingListener('settingWeaponSeeking', 'valWeaponSeeking', (val) => {
            return (val / 10).toFixed(1);
        }, (val) => {
            if (this.game.player) {
                this.game.player.setWeaponSeeking(val / 10);
            }
        });
    }

    setupSettingListener(inputId, valueId, formatFn, callback) {
        const input = this.elements[inputId];
        const valueDisplay = this.elements[valueId];

        if (input && valueDisplay) {
            input.addEventListener('input', () => {
                const val = parseInt(input.value);
                valueDisplay.textContent = formatFn(val);
                callback(val);
            });
        }
    }

    onPowerChange(system, value) {
        if (this.game.player) {
            this.game.player.setPower(system, value);
            this.updatePowerDisplay();
        }
    }

    update(dt, player) {
        if (!player) return;

        // Update status bars
        const hullPercent = (player.hull / player.maxHull) * 100;
        const shieldPercent = (player.shields / player.maxShields) * 100;
        const energyPercent = (player.energy / player.maxEnergy) * 100;

        this.elements.hullBar.style.width = `${hullPercent}%`;
        this.elements.hullValue.textContent = `${Math.round(hullPercent)}%`;

        this.elements.shieldBar.style.width = `${shieldPercent}%`;
        this.elements.shieldValue.textContent = `${Math.round(shieldPercent)}%`;

        this.elements.energyBar.style.width = `${energyPercent}%`;
        this.elements.energyValue.textContent = `${Math.round(energyPercent)}%`;

        // Update coordinates
        this.elements.coordX.textContent = Math.round(player.x);
        this.elements.coordY.textContent = Math.round(player.y);

        // Update power display
        this.updatePowerDisplay();

        // Update mission text
        if (this.game.missionSystem) {
            this.elements.missionText.textContent = this.game.missionSystem.getActiveMissionText();
        }

        // Update messages
        this.updateMessage(dt);

        // Update minimap
        this.renderMinimap(player);
    }

    updatePowerDisplay() {
        if (!this.game.player) return;

        const player = this.game.player;

        this.elements.powerEngines.value = player.power.engines;
        this.elements.powerShields.value = player.power.shields;
        this.elements.powerWeapons.value = player.power.weapons;
        this.elements.powerSensors.value = player.power.sensors;

        this.elements.powerEnginesValue.textContent = `${player.power.engines}%`;
        this.elements.powerShieldsValue.textContent = `${player.power.shields}%`;
        this.elements.powerWeaponsValue.textContent = `${player.power.weapons}%`;
        this.elements.powerSensorsValue.textContent = `${player.power.sensors}%`;

        // Safety check for refactored ship methods
        const total = typeof player.getTotalPower === 'function' ? player.getTotalPower() : 0;
        this.elements.powerTotal.textContent = total;

        // Visual feedback for over budget
        const totalContainer = this.elements.powerTotal.parentElement;
        if (total > 200) {
            totalContainer.classList.add('over-budget');
        } else {
            totalContainer.classList.remove('over-budget');
        }
    }

    showMessage(text, duration = 3) {
        this.messages.push({ text, duration });
    }

    updateMessage(dt) {
        if (this.currentMessage) {
            this.messageTimer -= dt;
            if (this.messageTimer <= 0) {
                this.currentMessage = null;
                this.elements.messageDisplay.textContent = '';
            }
        }

        if (!this.currentMessage && this.messages.length > 0) {
            this.currentMessage = this.messages.shift();
            this.messageTimer = this.currentMessage.duration;
            this.elements.messageDisplay.textContent = this.currentMessage.text;
        }
    }

    renderMinimap(player) {
        const ctx = this.minimapCtx;
        const w = this.elements.minimap.width;
        const h = this.elements.minimap.height;

        // Clear
        ctx.fillStyle = 'rgba(0, 20, 40, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Scale factor
        const sensorRange = player.getSensorRange();
        const scale = Math.min(w, h) / (sensorRange * 2);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const x = (w / 4) * i;
            const y = (h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Draw stations
        if (this.game.world) {
            for (const station of this.game.world.stations) {
                const dx = station.x - player.x;
                const dy = station.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < sensorRange) {
                    const sx = w / 2 + dx * scale;
                    const sy = h / 2 + dy * scale;

                    ctx.beginPath();
                    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#00d4ff';
                    ctx.fill();
                }
            }
        }

        // Draw enemies
        if (this.game.enemySpawner) {
            for (const enemy of this.game.enemySpawner.getAll()) {
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < sensorRange) {
                    const sx = w / 2 + dx * scale;
                    const sy = h / 2 + dy * scale;

                    ctx.beginPath();
                    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                    ctx.fillStyle = '#ff3366';
                    ctx.fill();
                }
            }
        }

        // Draw player (center)
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#39ff14';
        ctx.fill();

        // Draw Waypoint
        if (this.game.waypoint && this.game.waypoint.active) {
            const wp = this.game.waypoint;
            const dx = wp.x - player.x;
            const dy = wp.y - player.y;

            // Draw direction arrow on edge of radar if out of range, or dot if in range
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            if (dist < sensorRange) {
                // In range
                const sx = w / 2 + dx * scale;
                const sy = h / 2 + dy * scale;

                ctx.beginPath();
                ctx.moveTo(sx, sy - 6);
                ctx.lineTo(sx + 5, sy + 4);
                ctx.lineTo(sx - 5, sy + 4);
                ctx.closePath();
                ctx.fillStyle = '#ffaa00';
                ctx.fill();
            } else {
                // Out of range indicator
                const indicatorDist = Math.min(w, h) / 2 - 10;
                const ix = w / 2 + Math.cos(angle - Math.PI / 2) * indicatorDist; // - PI/2 because canvas rotation... wait standard math
                const ix2 = w / 2 + Math.cos(angle) * indicatorDist;
                const iy2 = h / 2 + Math.sin(angle) * indicatorDist;

                ctx.beginPath();
                ctx.arc(ix2, iy2, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffaa00';
                ctx.fill();
            }
        }

        // Draw player direction
        const dirLen = 8;
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(
            w / 2 + Math.cos(player.rotation) * dirLen,
            h / 2 + Math.sin(player.rotation) * dirLen
        );
        ctx.strokeStyle = '#39ff14';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Range circle
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    showDialogue(title, content, options = []) {
        this.elements.dialogueTitle.textContent = title;
        this.elements.dialogueContent.innerHTML = content;

        // Clear and add options
        this.elements.dialogueOptions.innerHTML = '';
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'dialogue-option';
            btn.textContent = option.text;
            btn.addEventListener('click', () => {
                option.action();
            });
            this.elements.dialogueOptions.appendChild(btn);
        });

        this.elements.dialogueBox.classList.remove('hidden');
        this.game.isPaused = true;
    }

    hideDialogue() {
        this.elements.dialogueBox.classList.add('hidden');
        this.game.isPaused = false;
    }

    showStarMap() {
        this.elements.starMap.classList.remove('hidden');
        this.renderStarMap();
    }

    hideStarMap() {
        this.elements.starMap.classList.add('hidden');
    }

    toggleStarMap() {
        if (this.elements.starMap.classList.contains('hidden')) {
            this.showStarMap();
        } else {
            this.hideStarMap();
        }
    }

    renderStarMap() {
        const canvas = this.elements.starMapCanvas;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const ctx = this.starMapCtx;
        const w = canvas.width;
        const h = canvas.height;

        // Clear
        ctx.fillStyle = 'rgba(0, 10, 20, 1)';
        ctx.fillRect(0, 0, w, h);

        // World bounds
        const worldW = this.game.world.width;
        const worldH = this.game.world.height;
        const scale = Math.min(w / worldW, h / worldH) * 0.8;
        const offsetX = w / 2;
        const offsetY = h / 2;

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridSize = 500;
        for (let x = -worldW / 2; x <= worldW / 2; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(offsetX + x * scale, offsetY - worldH / 2 * scale);
            ctx.lineTo(offsetX + x * scale, offsetY + worldH / 2 * scale);
            ctx.stroke();
        }
        for (let y = -worldH / 2; y <= worldH / 2; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(offsetX - worldW / 2 * scale, offsetY + y * scale);
            ctx.lineTo(offsetX + worldW / 2 * scale, offsetY + y * scale);
            ctx.stroke();
        }

        // Draw stations
        if (this.game.world) {
            for (const station of this.game.world.stations) {
                const sx = offsetX + station.x * scale;
                const sy = offsetY + station.y * scale;

                ctx.beginPath();
                ctx.arc(sx, sy, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#00d4ff';
                ctx.fill();

                ctx.font = '10px "Orbitron", sans-serif';
                ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
                ctx.textAlign = 'center';
                ctx.fillText(station.name, sx, sy - 15);
            }
        }

        // Draw enemies
        if (this.game.enemySpawner) {
            for (const enemy of this.game.enemySpawner.getAll()) {
                const sx = offsetX + enemy.x * scale;
                const sy = offsetY + enemy.y * scale;

                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ff3366';
                ctx.fill();
            }
        }

        // Draw player
        if (this.game.player) {
            const sx = offsetX + this.game.player.x * scale;
            const sy = offsetY + this.game.player.y * scale;

            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#39ff14';
            ctx.fill();

            // Direction indicator
            const dirLen = 15;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(
                sx + Math.cos(this.game.player.rotation) * dirLen,
                sy + Math.sin(this.game.player.rotation) * dirLen
            );
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw Waypoint
        if (this.game.waypoint && this.game.waypoint.active) {
            const sx = offsetX + this.game.waypoint.x * scale;
            const sy = offsetY + this.game.waypoint.y * scale;

            ctx.beginPath();
            ctx.moveTo(sx, sy - 10);
            ctx.lineTo(sx + 8, sy + 6);
            ctx.lineTo(sx - 8, sy + 6);
            ctx.closePath();
            ctx.fillStyle = '#ffaa00';
            ctx.fill();

            ctx.font = '12px "Orbitron", sans-serif';
            ctx.fillStyle = '#ffaa00';
            ctx.textAlign = 'center';
            ctx.fillText('WAYPOINT', sx, sy - 15);
        }
    }

    handleStarMapClick(clickX, clickY) {
        const canvas = this.elements.starMapCanvas;
        const w = canvas.width;
        const h = canvas.height;
        const worldW = this.game.world.width;
        const worldH = this.game.world.height;
        const scale = Math.min(w / worldW, h / worldH) * 0.8;
        const offsetX = w / 2;
        const offsetY = h / 2;

        // Reverse transform
        const worldX = (clickX - offsetX) / scale;
        const worldY = (clickY - offsetY) / scale;

        this.game.setWaypoint(worldX, worldY);
    }

    showGameOver() {
        this.elements.gameOver.classList.remove('hidden');
    }

    hideGameOver() {
        this.elements.gameOver.classList.add('hidden');
    }

    showPause() {
        this.elements.pauseScreen.classList.remove('hidden');
    }

    hidePause() {
        this.elements.pauseScreen.classList.add('hidden');
    }

    showStationDialogue(station) {
        const content = `
            <p>Welcome to <strong>${station.name}</strong>.</p>
            <p>Your ship has been repaired and refueled.</p>
            <p>Credits: <span style="color: #ffd700">${this.game.credits}</span></p>
        `;

        const options = [
            {
                text: 'View Missions',
                action: () => {
                    this.showMissionDialogue(station);
                }
            },
            {
                text: 'Undock',
                action: () => {
                    station.undock(this.game.player);
                    this.hideDialogue();
                }
            }
        ];

        this.showDialogue('STATION DOCKED', content, options);
    }

    showMissionDialogue(station) {
        const missions = this.game.missionSystem.getMissionsForStation(station.name);

        let content = '<p>Available missions:</p>';

        const options = missions.map(mission => ({
            text: `${mission.title} - ${mission.credits} credits`,
            action: () => {
                if (this.game.missionSystem.acceptMission(mission)) {
                    this.showMessage(`Mission accepted: ${mission.title}`);
                    station.undock(this.game.player);
                    this.hideDialogue();
                }
            }
        }));

        options.push({
            text: 'Back',
            action: () => {
                this.showStationDialogue(station);
            }
        });

        this.showDialogue('AVAILABLE MISSIONS', content, options);
    }
}

// Export
window.UI = UI;
