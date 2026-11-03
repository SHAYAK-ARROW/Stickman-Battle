# ⚔️ Stickman Battle (v1.0)

> **A real-time 1v1 multiplayer combat arena where players battle by writing Python code directly in their browser!**

Made with ❤️ by **Arrows Development Hub**.

---

## 🌟 Overview

**Stickman Battle** combines the excitement of fighting games with the power of learning Python programming. Instead of using a keyboard or controller, each player commands their fighter by writing actual Python code (loops, conditions, and custom battle functions) in an in-browser code editor.

Watch your Python logic come to life on an HTML5 canvas as stickmen run, leap with trigonometric physics, clash swords, block with glowing heater shields, duck under slashes, cast glowing wave spells, and outplay each other in 60 FPS real-time multiplayer!

---

## 🚀 Key Features (v1.0 Release)

- [x] **Real-Time 1v1 Multiplayer**: Powered by Flask-SocketIO at 60 FPS with token-authorized private rooms.
- [x] **Action Queue Architecture**: Python commands execute sequentially and visibly frame-by-frame instead of collapsing into a single instant.
- [x] **Combat & Physics Engine**:
  - Realistic gravity, ground collision, and screen boundaries.
  - Dynamic weapon length hitboxes and collision detection.
  - Mutual sword clashes: simultaneous strikes parry each other with dynamic knockback and zero damage!
  - **Stylized Weaponry**:
    - **Sword**: Double-edged steel blade with metallic crossguard, handle grip, pommel, and sharp tip.
    - **Shield**: Curved medieval heater shield with glowing amber rim and active cyan energy barrier shimmer when `block()` is active.
  - **Special Combat Moves**:
    - `swing()`: Swift horizontal jab slash.
    - `heavy_attack()`: High-damage cleave that deals 2 hearts or completely shatters enemy shields.
    - `throw_sword()`: Ranged boomerang attack that flies up to 280px and magically returns to hand.
- [x] **Evasive Maneuvers**:
  - `crouch()` / `duck()`: Lowers stickman body with bent knee stance to evade high sword slashes and flying projectiles.
  - `dash(step)` / `dodge(step)`: High-speed bursts forward or backward.
  - `flip()`: Turns around to face the opposite direction.
- [x] **Trigonometric Magic Spells**:
  - `sin_wave(power)`: Oscillating sine energy wave.
  - `cos_wave(power)`: Crashing overhead shockwave.
  - `tan_spike(power)`: Vertical energy spike surging from the ground that launches enemies into the air.
  - `sec_barrier(power)`: Hyperbolic curved force field that absorbs incoming projectiles.
  - `cosec_dome(power)`: Overhead protective dome against jumping strikes and falling shockwaves.
  - `cot_wall(power)`: Stationary vertical firewall with high pushback.
- [x] **Tactical Sensors & Intelligence**:
  - `get_enemy_distance()`, `is_enemy_attacking()`, `get_my_health()`, and `get_enemy_health()`.
- [x] **Interactive Banter & Dialogue**:
  - `print("text")`: Live speech bubbles with player-colored identity tags.
  - `input("prompt")`: Triggers real-time challenge modal with one-click quick-banter response chips (`⚔️ Bring it on!`, `🛡️ Never!`, `🔥 Watch this!`, `GG`).
- [x] **Modern Dark UI/UX**:
  - Linear / Vercel-inspired dark theme with ambient lighting and subtle grid.
  - VS Code-style editor with line numbers, dynamic indent guides, and auto-indent.
  - Searchable commands manual dialog with live instant filtering and category pills.
  - Toast notification system replacing jarring browser `alert()` popups.
- [x] **Security & AST Sandboxing**:
  - AST security validator blocks forbidden functions, dunder attributes (`__*`), and system calls.
  - Loop depth and recursion detection prevents CPU denial-of-service.
  - Isolated subprocess worker with hard execution deadline.
  - Safe mathematical library access (`import math` allows `math.sin`, `math.cos`, `math.tan`).
  - Session token verification prevents player impersonation.

---

## 📖 Fighter Code Manual (Python API Reference)

| Category | Command | Description | Example |
| :--- | :--- | :--- | :--- |
| **Movement** | `move(step)` | Walk forward | `move(2)` |
| | `run(step)` | Run forward | `run(3)` |
| | `dash(step)` | High-speed forward sprint | `dash(4)` |
| | `dodge(step)` | Rapid evasive backward leap | `dodge(3)` |
| | `crouch()` / `duck()` | Crouch to evade high sword strikes | `crouch()` |
| | `jump(power)` | Jump vertically upward against gravity | `jump(5)` |
| | `long_jump(step, power)` | Synchronized forward leap | `long_jump(3, 5)` |
| | `flip()` | Face opposite direction | `flip()` |
| **Combat** | `attack()` | Standard sword strike (1 damage) | `attack()` |
| | `swing()` | Quick horizontal jab slash | `swing()` |
| | `heavy_attack()` | Powerful slash (2 damage or breaks shield) | `heavy_attack()` |
| | `throw_sword()` | Throw sword; returns like a boomerang | `throw_sword()` |
| | `block()` | Raise shield to block incoming strikes (30 frames) | `block()` |
| | `set_sword(length, angle)` | Set sword length (30-80 px) and angle | `set_sword(65, 10)` |
| | `set_shield(length, angle)` | Set shield length (20-70 px) and angle | `set_shield(50, 35)` |
| **Magic Spells** | `sin_wave(power=1)` | Oscillating $\sin(x)$ magic wave | `sin_wave(45)` |
| | `cos_wave(power=1)` | Descending overhead $\cos(x)$ shockwave | `cos_wave(45)` |
| | `tan_spike(power=1)` | Sharp ground $\tan(x)$ spike launching enemies | `tan_spike(45)` |
| | `sec_barrier(power=1)` | Curved $\sec(x)$ barrier absorbing projectiles | `sec_barrier(45)` |
| | `cosec_dome(power=1)` | Overhead $\csc(x)$ protective dome | `cosec_dome(45)` |
| | `cot_wall(power=1)` | Vertical $\cot(x)$ wall delivering knockback | `cot_wall(45)` |
| **Math Helpers** | `math.sin(power)` | Cast sine attack via math library | `import math`<br>`math.sin(45)` |
| | `math.cos(power)` | Cast cosine attack via math library | `math.cos(45)` |
| | `math.tan(power)` | Cast tangent spike via math library | `math.tan(45)` |
| **Sensors** | `get_enemy_distance()` | Distance to opponent in pixels | `if get_enemy_distance() < 120:` |
| | `is_enemy_attacking()` | Returns True if enemy is attacking | `if is_enemy_attacking(): block()` |
| | `get_my_health()` | Returns own remaining hearts | `if get_my_health() <= 2:` |
| | `get_enemy_health()` | Returns opponent's remaining hearts | `if get_enemy_health() == 1:` |
| **Dialogue** | `print(text)` | Displays speech bubble above fighter | `print("En garde!")` |
| | `input(prompt)` | Sends interactive challenge prompt to opponent | `input("Do you surrender?")` |

---

## 🛠️ Tech Stack

- **Backend:** Python 3.12, Flask, Flask-SocketIO, Eventlet / Simple-WebSocket, AST Security Validator
- **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, Socket.IO Client, DM Sans + Space Grotesk fonts
- **Architecture:** Subprocess Sandboxing, Action Queue Command Pattern, Physics Simulation Loop, Client-Server State Sync

---

## 💻 Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/SHAYAK-ARROW/Stickman-Battle.git
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
- **Home / Lobby:** [http://localhost:5000](http://localhost:5000)
- Click **"Create battle room"** to host a match as Player 1.
- Share the generated invite link or room code with a friend to join as Player 2.

---

## 🧪 Running Unit Tests

Run the full suite of 29 unit and security tests:
```bash
python -m unittest discover -p "test_*.py"
```

---

## ☁️ Deploying to Render.com

This project is pre-configured with `render.yaml`:
1. Push your code to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), click **New** $\rightarrow$ **Web Service**.
3. Connect your repository. Render detects `render.yaml` automatically.
4. Set build command: `pip install -r requirements.txt` and start command: `python game.py`.
5. Play online with friends anywhere in the world!
