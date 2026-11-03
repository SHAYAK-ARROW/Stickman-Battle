# ⚔️ Stickman Battle (v2.0)

> **A real-time 1v1 multiplayer combat arena where players battle by writing Python code directly in their browser!**

Made with ❤️ by **Arrows Development Hub**.

---

## 🌟 Overview

**Stickman Battle** combines the excitement of fighting games with the power of learning Python programming. Instead of using a keyboard or controller, each player commands their fighter by writing actual Python code (loops, conditions, and custom battle functions) in an in-browser code editor.

Watch your Python loops come to life on an HTML5 canvas as stickmen run, leap with trigonometric physics, clash swords, block with shields, duck under slashes, cast glowing trigonometric wave spells, and knock each other back in 60 FPS real-time multiplayer!

---

## 🚀 What's Inside (v2.0 Released)

- [x] **Real-Time 1v1 Multiplayer Engine**: Powered by Flask-SocketIO at 60 FPS.
- [x] **Action Queue Architecture**: Python loops execute sequentially and visibly frame-by-frame instead of collapsing into a single instant.
- [x] **Combat & Physics Engine**:
  - Realistic gravity, ground collision, and screen boundaries.
  - Accurate body hitboxes (`105px`) vs. sword clash distance (`155px`).
  - Mutual sword clashes: simultaneous strikes parry each other with dynamic knockback and zero damage!
  - Active shield parry (`block()`) that blocks incoming strikes.
  - **Heavy Attacks (`heavy_attack()`)**: Slower windup dealing 2 hearts damage or completely shattering enemy shield blocks!
  - **Ranged Projectile (`throw_sword()`)**: Hurling spinning swords across the screen.
- [x] **Evasive Maneuvers**:
  - **`crouch()` / `duck()`**: Lowers stickman body to evade high sword slashes and flying projectiles.
  - **`dash()` / `dodge()`**: High-speed bursts forward or backward (`speed_x = 10`).
- [x] **Trigonometric Magic Spells**:
  - **`sin_wave()`**: Oscillating sine energy wave.
  - **`cos_wave()`**: Crashing overhead shockwave.
  - **`tan_spike()`**: Vertical energy spike surging from the ground that launches enemies into the air.
  - **`sec_barrier()`**: Hyperbolic curved force field that absorbs incoming projectiles.
  - **`cosec_dome()`**: Overhead protective dome against jumping strikes and falling shockwaves.
  - **`cot_wall()`**: Stationary vertical neon firewall with high pushback.
- [x] **Tactical Sensors & Intelligence**:
  - `get_enemy_distance()`, `is_enemy_attacking()`, `get_my_health()`, and `get_enemy_health()`.
- [x] **Speech & Interactive Challenge Dialogue**:
  - `print("dialogue")` shows live speech bubbles over stickmen.
  - `input("challenge")` triggers real-time challenge dialogue modals between opponents.
- [x] **Security & AST Sandboxing**:
  - Prohibits `import`, dunder attributes (`__*`), `while` infinite loops, and `try/except`.

---

## 📖 Fighter Code Manual (Python API Reference)

Players can use standard Python logic (`for`, `if/else`, variables) combined with the following battle commands:

| Category | Command | Arguments | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Movement** | `move(step)` | `step=1` | Moves fighter forward by step distance. | `move(3)` |
| | `run(step)` | `step=1` | Runs forward across the field. | `run(5)` |
| | `dash(step)` | `step=3` | High-speed forward sprint/dash. | `dash(4)` |
| | `dodge(step)` | `step=3` | Rapid evasive backward leap. | `dodge(3)` |
| | `crouch()` / `duck()` | *None* | Ducks down to evade incoming high slashes. | `crouch()` |
| | `jump(power)` | `power=5` | Leaps vertically upward against gravity. | `jump(7)` |
| | `long_jump(step, power)` | `step=2, power=5` | Synchronized forward leap. | `long_jump(4, 6)` |
| | `project(angle, power)` | `angle=45, power=5` | Angled jump calculated via trigonometry ($\sin/\cos$). | `project(60, 8)` |
| | `flip()` | *None* | Flips facing direction (Right $\leftrightarrow$ Left). | `flip()` |
| **Combat** | `attack()` | *None* | Swings sword with a 3-phase arc (1 damage). | `attack()` |
| | `heavy_attack()` | *None* | Powerful slash dealing 2 damage or breaking shields! | `heavy_attack()` |
| | `throw_sword()` | *None* | Ranged attack: throws sword across the arena. | `throw_sword()` |
| | `block()` | *None* | Raises shield to block incoming strikes (30 frames). | `block()` |
| **Trig Spells** | `sin_wave()` | *None* | Fires oscillating $\sin(x)$ magic energy wave. | `sin_wave()` |
| | `cos_wave()` | *None* | Crashes heavy $\cos(x)$ overhead shockwave. | `cos_wave()` |
| | `tan_spike()` | *None* | Surges sharp $\tan(x)$ ground spike launching enemies. | `tan_spike()` |
| | `sec_barrier()` | *None* | Deploys curved $\sec(x)$ shield absorbing projectiles. | `sec_barrier()` |
| | `cosec_dome()` | *None* | Deploys $\csc(x)$ dome defending overhead strikes. | `cosec_dome()` |
| | `cot_wall()` | *None* | Erects $\cot(x)$ barricade pushing enemies back. | `cot_wall()` |
| **Sensors** | `get_enemy_distance()` | *None* | Distance to opponent in pixels. | `if get_enemy_distance() < 120:` |
| | `is_enemy_attacking()` | *None* | Returns True if enemy is currently attacking. | `if is_enemy_attacking(): block()` |
| | `get_my_health()` | *None* | Returns own remaining hearts. | `if get_my_health() <= 2:` |
| | `get_enemy_health()` | *None* | Returns opponent's remaining hearts. | `if get_enemy_health() == 1:` |
| **Dialogue** | `print(text)` | `text` | Renders speech bubble above fighter's head. | `print("En garde!")` |
| | `input(prompt)` | `prompt` | Sends challenge prompt to opponent's screen. | `input("Ready?")` |

---

## 🛠️ Tech Stack

- **Backend:** Python 3.12, Flask, Flask-SocketIO, Eventlet, Gunicorn
- **Frontend:** Vanilla JavaScript, HTML5 Canvas API, Socket.IO Client
- **Architecture:** Action Queue Command Pattern, Physics Simulation Loop, Client-Server State Sync

---

## 💻 Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/ShayakSadhukhan/Stickman-Battle.git
cd Stickman-Battle
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the game server
```bash
python game.py
```

### 4. Open in browser
Open two separate browser tabs to simulate both fighters:
- **Player 1:** [http://localhost:5000/player1](http://localhost:5000/player1)
- **Player 2:** [http://localhost:5000/player2](http://localhost:5000/player2)

---

## ☁️ Deploying to Render.com

This project is pre-configured for **Render**:

1. Push your code to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) $\rightarrow$ **New Web Service**.
3. Select your repository. Render will automatically detect `render.yaml`!
4. Or configure manually:
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python game.py`
5. Click **Deploy Web Service** and play live with friends anywhere in the world!
