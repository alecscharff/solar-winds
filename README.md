# Solar Winds - Space Combat & Exploration

A modern, web-based remake of the classic **Solar Winds**, featuring retro SVGA-style graphics, deep space exploration, and a lofi synth soundtrack.

## 🚀 Getting Started

Since this is a client-side web application, you need to run it through a local web server to ensure all modules and assets load correctly.

### 1. Start the Server
You can use any static file server. Here are the most common methods:

**Using Python (Recommended):**
```bash
python -m http.server 8000
```

**Using Node.js/npx:**
```bash
npx serve .
```

### 2. Play the Game
Once the server is running, open your browser and navigate to:
`http://localhost:8000`

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| **W** / **↑** | Thrust (Accelerate) |
| **S** / **↓** | Brake (Decelerate) |
| **A / D** / **← / →** | Rotate Ship |
| **Space** | Fire Primary Weapon |
| **E** | Dock at Station (When in range) |
| **Tab** | Toggle Star Map |
| **Esc** | Pause Game / Settings |

---

## 🌌 Gameplay Mechanics

### 🛰️ Docking & Missions
- **How to Dock:** Approach a space station and slow down to below **80 speed**. When the prompt appears, press **E** to dock.
- **Missions:** Once docked, you can view and accept missions. Completing missions earns you **Credits**.
- **Repairs:** Docking at any station automatically repairs your hull and replenishes energy/shields.

### ⚡ Power Allocation
Manage your ship's energy distribution in the **Control Panel**:
- **ENG (Engines):** Increases top speed and acceleration.
- **SHD (Shields):** Increases shield regeneration rate and max capacity.
- **WPN (Weapons):** Increases fire rate and weapon energy capacity.
- **SNS (Sensors):** Increases radar range on your minimap.
- *Tip: You have a total power budget of 200. Balancing these is key to survival!*

### 🗺️ Navigation & Waypoints
- **Minimap:** Located in the top right (Sensors). It shows nearby stations (blue), enemies (red), and your current objective.
- **Star Map:** Press **Tab** to view the full sector.
- **Waypoints:** You can click anywhere on the **Star Map** to set a custom waypoint. This will appear as an orange indicator on your HUD and minimap.

### 🛠️ Settings & Customization
Press **Esc** to open the pause menu, where you can:
- Adjust **Music** and **SFX** volume.
- Tweak **Game Speed** and **Player/Enemy Speed**.
- Adjust **Weapon Seeking** strength (makes projectiles track enemies).
- Configure **Braking Power**.

---

## 🎨 Aesthetics
Solar Winds features a **Retro SVGA** aesthetic with modern post-processing:
- **Lofi Synth Soundtrack:** Immerse yourself in a space-themed lofi beat.
- **Retro FX:** Scanlines, chromatic aberration, and bloom effects for that 90s CRT feel.
- **Procedural Graphics:** Ships and stations are rendered with a pixel-perfect tech-noir style.

---

*Safe travels in the void, pilot.*
