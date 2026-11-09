# ⚔️ Stickman Battle

[![Play on itch.io](https://img.shields.io/badge/itch.io-Play%20Online-fa5c5c?style=for-the-badge&logo=itchdotio&logoColor=white)](https://arrows-dev.itch.io/stickman-battle)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-6366f1?style=for-the-badge&logo=render&logoColor=white)](https://stickman-battle.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776ab?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![WebSocket](https://img.shields.io/badge/Engine-60%20FPS%20Real--Time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)

> **A real-time 1v1 multiplayer combat arena where fighters battle by writing and executing Python algorithms directly in their browser.**
> 
> 🎮 **Play Live on itch.io:** [https://arrows-dev.itch.io/stickman-battle](https://arrows-dev.itch.io/stickman-battle)  
> 🌐 **Direct Mirror:** [https://stickman-battle.onrender.com](https://stickman-battle.onrender.com)  
> Made with precision by **Arrows Development Hub**.

> [!NOTE]
> **Free Tier Cold Starts:** The live demo is hosted on Render's free tier. If the server has been idle, it may take ~30–50 seconds to spin up on the initial visit. Once active, all WebSocket matchmaking and physics simulations run at silky-smooth 60 FPS.

---

## 🌟 Executive Summary

**Stickman Battle** replaces standard controllers and keyboards with actual Python code. Each player programs their fighter's behavior—using loops, conditionals, sensors, and mathematical spell functions—which execute in real time on an HTML5 Canvas at 60 FPS.

Whether dueling friends in private token-authenticated rooms or sparring against autonomous AI bots, victories are earned purely through algorithmic strategy, reaction timing, and tactical mathematics.

---

## 🏗️ System Architecture & Engineering Highlights

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BROWSER CLIENT (HTML5 / JS)                     │
│  - In-Browser Code Editor   - 60 FPS Canvas Renderer (Curves/Weapons)  │
│  - Real-Time Sensors        - WebSocket Client (State Interpolation)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSockets (Socket.IO)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     BACKEND ENGINE (Python / Flask)                    │
│                                                                        │
│   ┌─────────────────────┐   RPC   ┌────────────────────────────────┐   │
│   │ AST Security Worker │ ◄─────► │  60 FPS State Simulation Loop  │   │
│   │ - AST Parsing       │         │  - Action Queue Processor      │   │
│   │ - Forbidden Callout │         │  - Hitbox Collision Detection  │   │
│   │ - Isolated Sandbox  │         │  - Trig Energy Waves Engine    │   │
│   └─────────────────────┘         │  - Room Token Authorization    │   │
│                                   └────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. AST Security Analysis & Isolated Subprocess Sandboxing
Executing arbitrary user-submitted Python code in real time is a significant security challenge. Stickman Battle solves this with a two-phase defense:
* **Static AST Security Analysis ([`compiler.py`](compiler.py)):** Before execution, user code is parsed into an Abstract Syntax Tree (AST). The AST visitor strictly rejects forbidden primitives (`eval`, `exec`, `open`, `__import__`, `globals`, `locals`), enforces a hard loop-nesting limit (max 2 levels) to avoid CPU denial-of-service, and blocks recursive calls.
* **Process-Isolated Execution Worker:** Validated code runs in an isolated subprocess worker with a hard execution deadline (0.5s). Memory and state leaks are prevented by passing only primitive sensor snapshots into the worker and returning structured action tuples.

### 2. Action Queue Command Pattern
If standard Python loops (`for i in range(5): attack()`) executed normally, all five attacks would fire instantly in zero milliseconds. Stickman Battle decouples code execution from physics frames using an **Action Queue**:
* User code queues high-level intents (`move`, `attack`, `sin_wave`, `block`).
* The 60 FPS simulation loop consumes the queue sequentially frame-by-frame, applying realistic acceleration, gravity, weapon clash hitboxes, and cooldown frames.

### 3. Trigonometric Combat Spells
Instead of pre-rendered sprites, all projectile spells trace dynamic trigonometric functions:
* **Sine Wave (`sin_wave` / `math.sin`):** Oscillating transverse wave traveling along the ground plane.
* **Cosine Shockwave (`cos_wave` / `math.cos`):** Overhead shockwave falling with cosine phase.
* **Tangent Spike (`tan_spike` / `math.tan`):** Asymptote spike bursting vertically from the ground.
* **Force Fields (`sec_barrier`, `cosec_dome`, `cot_wall`):** Hyperbolic and reciprocal trigonometric energy shields that absorb incoming projectiles.

### 4. Autonomous AI Sparring Bot ([`bot.py`](bot.py))
* **Human-Paced Reaction Pacing:** Instead of a 0ms bot that parries every move instantly, the bot is calibrated with realistic human reaction jitter (0.8s–1.3s for Hard, 1.6s–2.4s for Easy).
* **Intentional Fallibility:** Configured with an intentional mistake rate (20% Hard, 45% Easy) ensuring matches feel competitive and organic.
* **Seamless Friend Takeover:** If Player 1 is practicing against the bot and a human friend joins via the room link, the bot automatically yields, promoting the room instantly into a fresh 1v1 PvP match.

### 5. Private Token-Authorized Matchmaking
* Room IDs are unpredictable (`room_<hex12>`).
* Each participant receives a cryptographically secure URL-safe token. Role spoofing (`?player=2` URL tampering) is strictly rejected by Socket.IO handshake verification.

---

## 🎮 Fighter API Quick Reference

The in-browser code editor grants fighters access to an expressive set of commands:

| Domain | Key Commands | Description |
| :--- | :--- | :--- |
| **Movement** | `move(step)`, `dash(step)`, `dodge(step)`, `jump(power)`, `long_jump(step, power)`, `crouch()`, `flip()`, `bend(angle)` | Full mobility, high-speed dashes, evasive crouching, and jumping physics. |
| **Melee Combat** | `attack()`, `heavy_attack()`, `swing()`, `block()`, `throw_sword()` | Dynamic weapon hitboxes, shield parries, shield-breaking heavy slashes, and boomerang throws. |
| **Magic Spells** | `sin_wave(power)`, `cos_wave(power)`, `tan_spike(power)`, `sec_barrier(power)`, `cosec_dome(power)` | Mathematical energy waves. Supports both direct calls and `import math; math.sin(power)`. |
| **Tactical Sensors** | `get_enemy_distance()`, `is_enemy_attacking()`, `get_my_health()`, `get_enemy_health()`, `get_my_energy()`, `get_enemy_energy()` | Read real-time arena distance, health, and stamina metrics to write smart algorithms. |
| **Emergency Actions** | `[Alt+S] Quick Shield`, `[Alt+D] Quick Dodge` | Tactical panic actions with 8s cooldown to defend while typing in the IDE. |
| **Interactive Dialogue** | `print(text)`, `input(prompt)` | Overhead player-colored speech bubbles and interactive challenge modals with quick-reply chips. |

*(Press the **Commands Manual** button inside the game interface for live searchable documentation and code samples).*

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend & Engine** | Python 3.12, Flask, Flask-SocketIO, Eventlet / Simple-WebSocket, Python AST |
| **Frontend & Client** | Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, WebSockets, DM Sans, Space Grotesk |
| **Architecture Patterns** | Subprocess Sandboxing, Command Action Queue, 60 FPS Fixed-Tick Simulation |
| **Workflow & Tooling** | AI-Assisted Pair Programming (Google Antigravity) |
| **Cloud Deployment** | Render.com Web Service (`render.yaml`), Gunicorn / Threading ASGI |

---

## 💻 Local Development & Quickstart

<details>
<summary><b>Click to expand setup instructions</b></summary>

```bash
# 1. Clone repository
git clone https://github.com/SHAYAK-ARROW/Stickman-Battle.git
cd Stickman-Battle

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch local game server (runs on http://localhost:5000)
python game.py
```

</details>

---

## 📬 Suggestions, Feedback & Bug Reports

Have an idea for a new trigonometric spell, balance tweak, or found a bug? We welcome all feedback and community contributions:

* **Direct Email:** [`shayaksadhukhan402@gmail.com`](mailto:shayaksadhukhan402@gmail.com)
* **GitHub Issues:** [Open an Issue or Suggestion](https://github.com/SHAYAK-ARROW/Stickman-Battle/issues)
* **Live Game Info Page:** Visit [`/info`](https://stickman-battle.onrender.com/info) for project details and release metadata.

---

## 📄 License & Open-Source Distribution

* **Creator & Lead Designer:** Shayak Sadhukhan ([Arrows Development Hub](https://github.com/SHAYAK-ARROW))
* **Development Workflow:** Architected & built using modern AI-assisted pair programming (Google Antigravity) with rigorous algorithmic verification and physics modeling.
* **Audio Engineering:** Procedural Web Audio API synthesis (dual-channel BGM with parallel drone pad + SFX).
* **Open-Source License:** Released under the **MIT License** — free for education, school computer labs, academic evaluation, and open-source contributions. See [`LICENSE`](LICENSE) for complete terms. Copyright (c) 2026 Shayak Sadhukhan.

### 💼 Academic & Institutional Deployment
* **Zero-Cost Digital Equity:** Schools, colleges, and state coding clubs are fully authorized to freely self-host, clone, and deploy Stickman Battle across computer labs for teaching programming under the MIT License.
* **Developer Edition & Support:** Optional support packages remain available on **itch.io** for those wishing to support continued development.
* **Direct Licensing & Academic Inquiries:** Contact [`shayaksadhukhan402@gmail.com`](mailto:shayaksadhukhan402@gmail.com).
