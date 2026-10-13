# ⚔️ Stickman Battle (v1.0)

> **A real-time 1v1 multiplayer combat arena where players battle by writing Python code directly in their browser!**

Made with ❤️ by **Arrows Development Hub**.

---

## 🌟 Overview

**Stickman Battle** combines the excitement of fighting games with the power of learning Python programming. Instead of using a keyboard or controller, each player commands their fighter by writing actual Python code (loops, conditions, and custom battle functions) in an in-browser code editor.

Watch your Python loops come to life on an HTML5 canvas as stickmen run, leap with trigonometric physics, clash swords, block with shields, and knock each other back in 60 FPS real-time multiplayer!

---

## 🚀 What's Inside Version 1.0 (v1.0 Released)

- [x] **Real-Time 1v1 Multiplayer Engine**: Powered by Flask-SocketIO at 60 FPS.
- [x] **Action Queue Architecture**: Python loops (e.g. `for i in range(5): move(); attack()`) execute sequentially and visibly frame-by-frame instead of collapsing into a single instant.
- [x] **Combat & Physics Engine**:
  - Realistic gravity, ground collision, and screen boundaries.
  - Accurate body hitboxes (`105px`) vs. sword clash distance (`155px`).
  - Mutual sword clashes: simultaneous strikes parry each other with dynamic knockback and zero damage!
  - 30-frame active shield parry (`block()`) that blocks incoming sword strikes.
- [x] **Lobby & Matchmaking System**:
  - Player 1 creates a game and gets a link to share with Player 2.
  - Waiting screen automatically dismisses when Player 2 connects.
- [x] **Canvas UI & Match Lifecycle**:
  - 5 Hearts display (`❤️❤️❤️❤️❤️`) over each stickman's head.
  - `💀 DEAD` status and large Winner announcement banner (`PLAYER 1 / 2 WINS! 🏆`).
  - In-game **Play Again / Rematch** button that completely resets fighter positions, health, and queues for the next round.
- [x] **Production Cloud Deployment Ready**: Includes `render.yaml`, `requirements.txt`, dynamic port binding, and `gunicorn` with `eventlet` support for Render.com.

---

## 📖 Fighter Code Manual (Python API Reference)

Players can use any standard Python logic (`for`, `while`, `if/else`, variables) combined with the following battle commands:

| Command | Arguments | Description | Example |
| :--- | :--- | :--- | :--- |
| `move(step)` | `step=1` | Moves fighter forward by step distance (1 step = 10px). | `move(3)` |
| `run(step)` | `step=1` | Runs forward across the field. | `run(5)` |
| `jump(power)` | `power=5` | Leaps vertically upward against gravity. | `jump(7)` |
| `long_jump(step, power)` | `step=2, power=5` | Synchronized forward leap leaping over incoming strikes. | `long_jump(4, 6)` |
| `project(angle, power)` | `angle=45, power=5` | Mathematical angled jump calculated via trigonometry ($\sin/\cos$). | `project(60, 8)` |
| `flip()` | *None* | Flips facing direction (Right $\leftrightarrow$ Left). | `flip()` |
| `attack()` | *None* | Swings sword with a 3-phase arc (Windup $\rightarrow$ Slash $\rightarrow$ Return). | `attack()` |
| `block()` | *None* | Raises shield to block incoming sword damage for 30 frames. | `block()` |

### 💡 Example Battle Tactics

#### 1. Basic March & Slash:
```python
for i in range(4):
    move(2)
    attack()
```

#### 2. Evasive Counter-Attack:
```python
jump(6)
long_jump(3, 5)
attack()
block()
```

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
   - **Start Command:** `gunicorn --worker-class eventlet -w 1 game:app`
5. Click **Deploy Web Service** and play live with friends anywhere in the world!

---

## 🔮 Roadmap (Coming in v2.0)

- [ ] **Speech Bubbles (`print`)**: Printed text appears as dialogue bubbles directly above the stickman's mouth on canvas.
- [ ] **Interactive In-Game Messaging (`input`)**: Two-way interactive pop-up messages sent between opponents during the match.
- [ ] **Tactical Sensory Functions**: `get_enemy_distance()`, `is_enemy_attacking()`, and `get_my_health()`.
- [ ] **Trigonometric Spell Casts**: Mathematical wave attacks ($\sin$, $\cos$, $\tan$).
- [ ] **Advanced Skeleton**: Articulated knees, elbows, and ninja movement physics.

<!-- ei readme ai er lekha pore mai nije likhe nebo  -->