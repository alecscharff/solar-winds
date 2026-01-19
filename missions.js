// missions.js - Mission System

class Mission {
    constructor(data) {
        this.id = data.id || Math.random().toString(36).substr(2, 9);
        this.title = data.title;
        this.description = data.description;
        this.type = data.type; // 'bounty', 'delivery', 'exploration'
        this.status = 'available'; // available, active, completed, failed

        // Objectives
        this.objectives = data.objectives || [];
        this.currentObjective = 0;

        // Rewards
        this.credits = data.credits || 100;

        // Target (for bounty missions)
        this.targetType = data.targetType;
        this.targetCount = data.targetCount || 1;
        this.targetsKilled = 0;

        // Location (for delivery/exploration)
        this.destination = data.destination;

        // Time limit (optional)
        this.timeLimit = data.timeLimit;
        this.timeRemaining = data.timeLimit;

        // Giver
        this.giver = data.giver || 'Unknown';
    }

    start() {
        this.status = 'active';
        this.targetsKilled = 0;
        this.timeRemaining = this.timeLimit;
    }

    update(dt) {
        if (this.status !== 'active') return;

        // Update time limit
        if (this.timeLimit) {
            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.fail();
            }
        }
    }

    onEnemyKilled(enemyType) {
        if (this.status !== 'active') return;

        if (this.type === 'bounty') {
            if (!this.targetType || this.targetType === enemyType) {
                this.targetsKilled++;

                if (this.targetsKilled >= this.targetCount) {
                    this.complete();
                }
            }
        }
    }

    onStationVisited(station) {
        if (this.status !== 'active') return;

        if (this.type === 'delivery' || this.type === 'exploration') {
            if (this.destination === station.name) {
                this.complete();
            }
        }
    }

    complete() {
        this.status = 'completed';

        if (window.game) {
            window.game.showMessage(`Mission Complete! +${this.credits} credits`);
            window.game.credits += this.credits;
        }
    }

    fail() {
        this.status = 'failed';

        if (window.game) {
            window.game.showMessage('Mission Failed!');
        }
    }

    getProgress() {
        if (this.type === 'bounty') {
            return `${this.targetsKilled}/${this.targetCount} targets`;
        }
        if (this.type === 'delivery' || this.type === 'exploration') {
            return `Destination: ${this.destination}`;
        }
        return '';
    }

    getDisplayText() {
        let text = `${this.title}\n${this.description}\n\nProgress: ${this.getProgress()}`;
        if (this.timeLimit) {
            const mins = Math.floor(this.timeRemaining / 60);
            const secs = Math.floor(this.timeRemaining % 60);
            text += `\nTime: ${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return text;
    }
}

class MissionSystem {
    constructor() {
        this.availableMissions = [];
        this.activeMission = null;
        this.completedMissions = [];

        // Generate some starting missions
        this.generateMissions();
    }

    generateMissions() {
        // Bounty missions
        this.availableMissions.push(new Mission({
            title: 'Clear the Sector',
            description: 'Eliminate hostile ships threatening our trade routes.',
            type: 'bounty',
            targetCount: 3,
            credits: 300,
            giver: 'Station Commander'
        }));

        this.availableMissions.push(new Mission({
            title: 'Scout Hunter',
            description: 'Enemy scouts have been spotted. Destroy them before they report our position.',
            type: 'bounty',
            targetType: 'scout',
            targetCount: 2,
            credits: 200,
            giver: 'Intelligence Officer'
        }));

        this.availableMissions.push(new Mission({
            title: 'Heavy Assault',
            description: 'A heavily armed enemy vessel threatens the station. Take it down.',
            type: 'bounty',
            targetType: 'heavy',
            targetCount: 1,
            credits: 500,
            giver: 'Fleet Admiral'
        }));

        // Exploration missions
        this.availableMissions.push(new Mission({
            title: 'Survey Run',
            description: 'Travel to the Research Lab and collect data.',
            type: 'exploration',
            destination: 'RESEARCH LAB',
            targetLocation: null, // Will be set based on actual station location
            credits: 250,
            giver: 'Science Officer'
        }));

        this.availableMissions.push(new Mission({
            title: 'Supply Delivery',
            description: 'Deliver supplies to the Trading Post.',
            type: 'delivery',
            destination: 'TRADING POST',
            targetLocation: null, // Will be set based on actual station location
            credits: 200,
            giver: 'Quartermaster'
        }));
    }

    update(dt) {
        if (this.activeMission) {
            this.activeMission.update(dt);

            if (this.activeMission.status === 'completed') {
                this.completedMissions.push(this.activeMission);
                this.activeMission = null;
                this.generateNewMission();
            } else if (this.activeMission.status === 'failed') {
                this.activeMission = null;
            }
        }
    }

    acceptMission(mission) {
        if (this.activeMission) return false; // Already have an active mission

        const index = this.availableMissions.indexOf(mission);
        if (index > -1) {
            this.availableMissions.splice(index, 1);
            this.activeMission = mission;
            mission.start();

            // Auto-set waypoint for destination-based missions
            if (mission.destination && window.game && window.game.world) {
                const station = window.game.world.stations.find(s => s.name === mission.destination);
                if (station) {
                    window.game.setWaypoint(station.x, station.y);
                }
            }
            return true;
        }
        return false;
    }

    abandonMission() {
        if (this.activeMission) {
            this.activeMission.status = 'failed';
            this.activeMission = null;
        }
    }

    onEnemyKilled(enemyType) {
        if (this.activeMission) {
            this.activeMission.onEnemyKilled(enemyType);
        }
    }

    onStationVisited(station) {
        if (this.activeMission) {
            this.activeMission.onStationVisited(station);
        }
    }

    generateNewMission() {
        const missionTypes = [
            {
                title: 'Patrol Duty',
                description: 'Patrol the sector and eliminate threats.',
                type: 'bounty',
                targetCount: 2 + Math.floor(Math.random() * 3),
                credits: 200 + Math.floor(Math.random() * 200),
                giver: 'Station Commander'
            },
            {
                title: 'Priority Target',
                description: 'Eliminate the designated enemy vessel.',
                type: 'bounty',
                targetType: ['scout', 'fighter', 'heavy'][Math.floor(Math.random() * 3)],
                targetCount: 1,
                credits: 150 + Math.floor(Math.random() * 350),
                giver: 'Intelligence Officer'
            }
        ];

        const data = missionTypes[Math.floor(Math.random() * missionTypes.length)];
        this.availableMissions.push(new Mission(data));
    }

    getMissionsForStation(stationName) {
        // All missions available at any station for simplicity
        return this.availableMissions;
    }

    getActiveMissionText() {
        if (this.activeMission) {
            return this.activeMission.getDisplayText();
        }
        return 'No active mission';
    }
}

// Export
window.Mission = Mission;
window.MissionSystem = MissionSystem;
