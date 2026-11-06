// ==============================================================================
// 📝 STICKMAN BATTLE - PYTHON CODE EDITOR & INTERACTIVE UI
// Handles: VS Code style line numbers, syntax error glow, indent guides,
// IDLE-style diagnostics, opponent dialogue prompt modal, command search.
// ==============================================================================

// --- PRIVATE IN-EDITOR DIAGNOSTICS (Opponent never sees this) ---
var codeMirrorInstance = null;
var activeErrorLine = null;

function showDiagnostics(msg) {
    const diag = document.getElementById("editor_diagnostics");
    const diagMsg = document.getElementById("diag_message");
    if (!diag || !diagMsg) return;
    diagMsg.innerText = msg;
    diag.style.display = "flex";

    // Highlight the failing line in CodeMirror or legacy gutter
    const match = msg.match(/line\s+(\d+)/i);
    if (match) {
        const lineNum = parseInt(match[1], 10);
        if (codeMirrorInstance) {
            if (activeErrorLine !== null) {
                codeMirrorInstance.removeLineClass(activeErrorLine, "background", "cm-error-line");
            }
            activeErrorLine = lineNum - 1;
            codeMirrorInstance.addLineClass(activeErrorLine, "background", "cm-error-line");
            codeMirrorInstance.scrollIntoView({ line: activeErrorLine, ch: 0 }, 50);
        } else {
            updateLineNumbers(lineNum);
        }
    }
}

function dismissDiagnostics() {
    const diag = document.getElementById("editor_diagnostics");
    if (diag) diag.style.display = "none";
    if (codeMirrorInstance && activeErrorLine !== null) {
        codeMirrorInstance.removeLineClass(activeErrorLine, "background", "cm-error-line");
        activeErrorLine = null;
    } else {
        updateLineNumbers();
    }
}


// --- VS Code Style Code Editor (Line Numbers, Dynamic Indent Guides & Auto-Indent) ---
var ide = document.getElementById("ide");
var lineNumbers = document.getElementById("line_numbers");
var indentGuides = document.getElementById("indent_guides");

function updateLineNumbers(highlightLine = null) {
    if (!ide || !lineNumbers) return;
    const lines = ide.value.split("\n");
    let numbers = "";
    for (let i = 1; i <= lines.length; i++) {
        if (highlightLine && i === highlightLine) {
            numbers += `<span class="line-error-highlight">${i}</span><br>`;
        } else {
            numbers += i + "<br>";
        }
    }
    lineNumbers.innerHTML = numbers;
}

function updateIndentGuides() {
    if (!ide || !indentGuides) return;
    const lines = ide.value.split("\n");
    const indents = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().length === 0) {
            indents.push(-1);
        } else {
            let leadingSpaces = 0;
            for (let c = 0; c < line.length; c++) {
                if (line[c] === ' ') leadingSpaces += 1;
                else if (line[c] === '\t') leadingSpaces += 4;
                else break;
            }
            indents.push(Math.floor(leadingSpaces / 4));
        }
    }
    
    for (let i = 0; i < indents.length; i++) {
        if (indents[i] === -1) {
            let prevIndent = 0;
            for (let p = i - 1; p >= 0; p--) {
                if (indents[p] !== -1) { prevIndent = indents[p]; break; }
            }
            let nextIndent = 0;
            for (let n = i + 1; n < indents.length; n++) {
                if (indents[n] !== -1) { nextIndent = indents[n]; break; }
            }
            indents[i] = Math.min(prevIndent, nextIndent);
        }
    }
    
    let html = "";
    for (let i = 0; i < lines.length; i++) {
        const lvl = indents[i];
        if (lvl > 0) {
            let spans = "";
            for (let j = 0; j < lvl; j++) {
                spans += '<span style="display:inline-block; width:4ch; height:20px; box-sizing:border-box; border-right:1px solid rgba(255, 255, 255, 0.15); vertical-align:top;"></span>';
            }
            html += `<div style="height:20px; line-height:20px; white-space:pre;">${spans}</div>`;
        } else {
            html += '<div style="height:20px; line-height:20px; white-space:pre;"></div>';
        }
    }
    indentGuides.innerHTML = html;
}

function syncEditorScroll() {
    if (!ide) return;
    if (lineNumbers) lineNumbers.scrollTop = ide.scrollTop;
    if (indentGuides) {
        indentGuides.scrollTop = ide.scrollTop;
        indentGuides.scrollLeft = ide.scrollLeft;
    }
}

function updateEditorUI() {
    updateLineNumbers();
    updateIndentGuides();
}

// --- Stickman Battle Game Autocomplete Dictionary (VS Code Style Hints) ---
const BATTLE_HINTS = [
    // Core combat commands
    { text: "attack()", displayText: "🗡️ attack() · Fast sword strike" },
    { text: "heavy_attack()", displayText: "💥 heavy_attack() · Break shields (slow)" },
    { text: "swing()", displayText: "⚔️ swing() · Swift horizontal slash" },
    { text: "block()", displayText: "🛡️ block() · Raise shield defense" },
    { text: "dodge()", displayText: "💨 dodge() · Quick backward retreat" },
    { text: "dash(3)", displayText: "⚡ dash(step) · Fast forward charge" },
    { text: "jump(15)", displayText: "🦘 jump(power) · Leap into air" },
    { text: "flip()", displayText: "🔄 flip() · Face opposite direction" },
    { text: "crouch(30)", displayText: "🦆 crouch(duration) · Duck under high strikes" },
    { text: "move(2)", displayText: "🏃 move(step) · Walk forward" },
    { text: "throw_sword()", displayText: "🗡️ throw_sword() · Ranged sword projectile" },

    // Trigonometric spells
    { text: "math.sin(45)", displayText: "🌊 math.sin(power) · Sine wave projectile" },
    { text: "math.cos(45)", displayText: "🌀 math.cos(power) · Cosine wave pulse" },
    { text: "math.tan(45)", displayText: "⚡ math.tan(power) · Ground spike eruption" },
    { text: "math.sec(45)", displayText: "🛡️ math.sec(power) · Kinetic barrier aura" },
    { text: "math.cosec(45)", displayText: "🔮 math.cosec(power) · Defensive dome" },
    { text: "math.cot(45)", displayText: "🧱 math.cot(power) · Shockwave wall" },

    // Tactical sensory telemetry
    { text: "get_enemy_distance()", displayText: "📏 get_enemy_distance() · Distance to opponent" },
    { text: "is_enemy_attacking()", displayText: "⚠️ is_enemy_attacking() · Opponent swinging?" },
    { text: "is_enemy_blocking()", displayText: "🛡️ is_enemy_blocking() · Opponent shielded?" },
    { text: "is_enemy_crouching()", displayText: "🦆 is_enemy_crouching() · Opponent ducking?" },
    { text: "is_enemy_airborne()", displayText: "🦘 is_enemy_airborne() · Opponent in air?" },
    { text: "get_enemy_direction()", displayText: "🧭 get_enemy_direction() · Opponent facing direction" },
    { text: "get_my_health()", displayText: "❤️ get_my_health() · Your remaining hearts" },
    { text: "get_enemy_health()", displayText: "💔 get_enemy_health() · Opponent remaining hearts" },
    { text: "get_my_energy()", displayText: "⚡ get_my_energy() · Your current stamina" },
    { text: "get_enemy_energy()", displayText: "🔋 get_enemy_energy() · Opponent stamina" },
    { text: "print()", displayText: "💬 print(msg) · Display speech bubble" },

    // Python basic syntax
    { text: "if ", displayText: "🔀 if condition:" },
    { text: "elif ", displayText: "🔀 elif condition:" },
    { text: "else:\n    ", displayText: "🔀 else:" },
    { text: "for i in range(5):\n    ", displayText: "🔁 for loop" },
    { text: "while ", displayText: "🔁 while loop (bounded)" },
    { text: "import math\n", displayText: "📐 import math" }
];

function initCodeMirror() {
    if (typeof CodeMirror !== "undefined" && ide) {
        const frame = document.querySelector(".editor-frame");
        if (frame) frame.classList.add("has-codemirror");

        // Register custom Python + Game Battle autocomplete provider
        CodeMirror.registerHelper("hint", "python", function(cm) {
            const cur = cm.getCursor();
            const token = cm.getTokenAt(cur);
            const line = cur.line;
            const lineText = cm.getLine(line);

            // Don't show combat command hints inside comments, strings, or when defining a function name (def ...)
            if (token.type === "comment" || token.type === "string" || token.type === "def") {
                return null;
            }

            // Also suppress suggestions if the user is typing a function name after 'def '
            const textBeforeCursor = lineText.slice(0, cur.ch);
            if (/^\s*def\s+\w*$/.test(textBeforeCursor)) {
                return null;
            }

            const start = token.start;
            const end = cur.ch;
            const word = token.string.toLowerCase().replace(/^[^\w\.]+/, "");

            if (!word) return null;

            // Smart scoring & prefix filtering:
            // 1. Direct prefix (e.g. 'g' -> 'get_enemy_distance()') -> score 1
            // 2. Word boundary prefix after '_' or '.' (e.g. 'dist' -> 'get_enemy_distance()', 'cos' -> 'math.cos()') -> score 2
            // 3. For multi-letter words (>= 3 chars), allow clean token substring match (score 3)
            // Never match single letters loosely inside unrelated words (e.g. 'g' inside 'swing' or 'range')!
            const scoredMatches = [];

            for (const h of BATTLE_HINTS) {
                const clean = h.text.toLowerCase().replace(/\(.*$/, "").trim();
                const parts = clean.split(/[_\.]/);

                let score = -1;

                if (clean.startsWith(word)) {
                    score = 1;
                } else if (parts.some(p => p.startsWith(word))) {
                    score = 2;
                } else if (word.length >= 3 && clean.includes(word)) {
                    score = 3;
                }

                if (score !== -1) {
                    scoredMatches.push({ item: h, score: score });
                }
            }

            if (scoredMatches.length === 0) return null;

            // Direct prefix matches come first, followed by subword matches
            scoredMatches.sort((a, b) => a.score - b.score);

            return {
                list: scoredMatches.map(m => {
                    const item = Object.assign({}, m.item);
                    item.render = function(element, self, data) {
                        const raw = data.displayText || data.text;
                        const parts = raw.split(" · ");
                        const left = parts[0] || data.text;
                        const right = parts[1] || "";

                        const cmdSpan = document.createElement("span");
                        cmdSpan.className = "hint-cmd";
                        cmdSpan.textContent = left;
                        element.appendChild(cmdSpan);

                        if (right) {
                            const descSpan = document.createElement("span");
                            descSpan.className = "hint-desc";
                            descSpan.textContent = " · " + right;
                            element.appendChild(descSpan);
                        }
                    };
                    return item;
                }),
                from: CodeMirror.Pos(line, start),
                to: CodeMirror.Pos(line, end)
            };
        });

        codeMirrorInstance = CodeMirror.fromTextArea(ide, {
            mode: { name: "python", version: 3, singleLineStringErrors: false },
            theme: "dracula",
            lineNumbers: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            lineWrapping: true,
            autofocus: false,
            viewportMargin: Infinity,
            extraKeys: {
                "Ctrl-Space": function(cm) {
                    cm.showHint({ hint: CodeMirror.hint.python, completeSingle: false });
                }
            }
        });

        window.codeMirrorInstance = codeMirrorInstance;

        // Auto-show suggestions on typing letters or dot
        codeMirrorInstance.on("inputRead", function(cm, change) {
            if (change.origin !== "+input") return;
            const ch = change.text[0];
            if (/[a-zA-Z_\.]/.test(ch)) {
                cm.showHint({ hint: CodeMirror.hint.python, completeSingle: false });
            }
        });

        let autoSaveDebounce = null;
        codeMirrorInstance.on("change", function() {
            codeMirrorInstance.save();
            clearTimeout(autoSaveDebounce);
            autoSaveDebounce = setTimeout(() => {
                const activeId = getActiveSlotId();
                const slots = getStrategyVault();
                const slot = slots.find(s => s.id === activeId);
                if (slot && codeMirrorInstance) {
                    slot.code = codeMirrorInstance.getValue();
                    slot.updated = Date.now();
                    saveStrategyVault(slots);
                }
            }, 400);
        });

        // Initialize 10-slot Strategy Vault with active slot
        initStrategyVault();

        // Render true VS Code-style vertical indent guides only for indented code blocks
        codeMirrorInstance.on("renderLine", function(cm, line, elt) {
            const text = line.text;
            let spaces = 0;
            while (spaces < text.length && text.charAt(spaces) === " ") spaces++;
            let lvl = Math.floor(spaces / 4);

            // If empty line, calculate surrounding indent level
            if (text.trim().length === 0) {
                const lineNo = cm.getLineNumber(line);
                let prevLvl = 0;
                for (let p = lineNo - 1; p >= 0; p--) {
                    const pt = cm.getLine(p);
                    if (pt && pt.trim().length > 0) {
                        let sp = 0;
                        while (sp < pt.length && pt.charAt(sp) === " ") sp++;
                        prevLvl = Math.floor(sp / 4);
                        break;
                    }
                }
                let nextLvl = 0;
                const total = cm.lineCount();
                for (let n = lineNo + 1; n < total; n++) {
                    const nt = cm.getLine(n);
                    if (nt && nt.trim().length > 0) {
                        let sp = 0;
                        while (sp < nt.length && nt.charAt(sp) === " ") sp++;
                        nextLvl = Math.floor(sp / 4);
                        break;
                    }
                }
                lvl = Math.min(prevLvl, nextLvl);
            }

            if (lvl > 0) {
                const guides = document.createElement("div");
                guides.className = "cm-indent-guides-bar";
                guides.setAttribute("aria-hidden", "true");
                for (let j = 0; j < lvl; j++) {
                    const span = document.createElement("span");
                    span.className = "cm-indent-guide-unit";
                    guides.appendChild(span);
                }
                elt.insertBefore(guides, elt.firstChild);
            }
        });

        setTimeout(function() {
            codeMirrorInstance.refresh();
        }, 120);
    } else if (ide) {
        // Fallback for standalone/legacy mode without CodeMirror
        ide.addEventListener("input", updateEditorUI);
        ide.addEventListener("scroll", syncEditorScroll);

        ide.addEventListener("keydown", function(e) {
            const start = this.selectionStart;
            const end = this.selectionEnd;

            if (e.key === "Tab") {
                e.preventDefault();
                this.value = this.value.substring(0, start) + "    " + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
                updateEditorUI();
            } else if (e.key === "Enter") {
                e.preventDefault();
                const textBefore = this.value.substring(0, start);
                const textAfter = this.value.substring(end);
                const currentLine = textBefore.split("\n").pop();
                const match = currentLine.match(/^\s*/);
                let indent = match ? match[0] : "";

                if (currentLine.trim().endsWith(":")) {
                    indent += "    ";
                }

                this.value = textBefore + "\n" + indent + textAfter;
                this.selectionStart = this.selectionEnd = start + 1 + indent.length;
                updateEditorUI();
                this.dispatchEvent(new Event("scroll"));
            } else if (e.key === "Backspace" && start === end && start >= 4) {
                const before = this.value.substring(start - 4, start);
                const currentLineBefore = this.value.substring(0, start).split("\n").pop();
                if (before === "    " && /^\s+$/.test(currentLineBefore)) {
                    e.preventDefault();
                    this.value = this.value.substring(0, start - 4) + this.value.substring(start);
                    this.selectionStart = this.selectionEnd = start - 4;
                    updateEditorUI();
                }
            }
        });

        updateEditorUI();
    }
}

// Initialize CodeMirror on page load
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCodeMirror);
} else {
    initCodeMirror();
}

// ==============================================================================
// 📁 STRATEGY VAULT - 10 SLOTS MANAGER & LIVE IN-BATTLE PRESET INSERTION
// ==============================================================================
const DEFAULT_PRESET_STRATEGIES = [
    {
        id: 1,
        title: "⚡ Blitz Rush",
        code: "# Slot 1: Blitz Rush - Fast gap-close and strike\nif get_enemy_distance() > 110:\n    dash(3)\nelse:\n    attack()\n"
    },
    {
        id: 2,
        title: "🛡️ Shield Breaker",
        code: "# Slot 2: Shield Breaker - Counter heavy defenders\nif get_enemy_distance() > 130:\n    dash(3)\nelif is_enemy_blocking():\n    heavy_attack()\nelse:\n    swing()\n"
    },
    {
        id: 3,
        title: "🌊 Wave Weaver",
        code: "# Slot 3: Wave Weaver - Ranged sine harassment\nif get_enemy_distance() > 200:\n    math.sin(50)\nelif get_enemy_distance() > 100:\n    dash(3)\nelse:\n    attack()\n"
    }
];

function getStrategyVault() {
    try {
        const raw = localStorage.getItem('stickman_strategy_vault_v1');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === 10) return parsed;
        }
    } catch (e) {
        console.warn("Strategy Vault parse failed:", e);
    }

    const slots = [];
    for (let i = 1; i <= 10; i++) {
        const preset = DEFAULT_PRESET_STRATEGIES.find(d => d.id === i);
        if (preset) {
            slots.push({ id: i, title: preset.title, code: preset.code, updated: Date.now() });
        } else {
            slots.push({ id: i, title: `Slot ${i}: [Empty]`, code: `# Slot ${i}: Custom Strategy\n# Write your Python combat logic here\n`, updated: null });
        }
    }
    saveStrategyVault(slots);
    return slots;
}

function saveStrategyVault(slots) {
    try {
        localStorage.setItem('stickman_strategy_vault_v1', JSON.stringify(slots));
    } catch (e) {
        console.warn("Strategy Vault save failed:", e);
    }
}

function getActiveSlotId() {
    const val = parseInt(localStorage.getItem('stickman_active_strategy_slot') || "1", 10);
    return isNaN(val) || val < 1 || val > 10 ? 1 : val;
}

function setActiveSlotId(slotId) {
    localStorage.setItem('stickman_active_strategy_slot', slotId.toString());
}

function initStrategyVault() {
    const select = document.getElementById('strategy_slot_select');
    const titleInput = document.getElementById('strategy_title_input');
    if (!select) return;

    const slots = getStrategyVault();
    const activeSlotId = getActiveSlotId();

    select.innerHTML = "";
    slots.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `Slot ${s.id}: ${s.title}`;
        select.appendChild(opt);
    });

    select.value = activeSlotId;
    const current = slots.find(s => s.id === activeSlotId) || slots[0];
    if (titleInput) {
        titleInput.value = current.title.replace(/^Slot \d+:\s*/, "");
    }

    // Populate active slot's saved code into editor
    if (codeMirrorInstance && current.code) {
        codeMirrorInstance.setValue(current.code);
        codeMirrorInstance.save();
    }
}

function onStrategySlotChange(slotId) {
    const id = parseInt(slotId, 10);
    setActiveSlotId(id);
    const slots = getStrategyVault();
    const slot = slots.find(s => s.id === id);
    if (!slot) return;

    const titleInput = document.getElementById('strategy_title_input');
    if (titleInput) {
        titleInput.value = slot.title.replace(/^Slot \d+:\s*/, "");
    }

    // Live insert into editor on slot change
    if (codeMirrorInstance && slot.code) {
        codeMirrorInstance.setValue(slot.code);
        codeMirrorInstance.save();
        codeMirrorInstance.focus();
    }
}

function saveCurrentStrategy() {
    const activeId = getActiveSlotId();
    const slots = getStrategyVault();
    const slot = slots.find(s => s.id === activeId);
    if (!slot) return;

    const titleInput = document.getElementById('strategy_title_input');
    let newTitle = titleInput ? titleInput.value.trim() : "";
    if (!newTitle) {
        newTitle = `Custom Strat ${activeId}`;
    }

    slot.title = newTitle;
    if (codeMirrorInstance) {
        slot.code = codeMirrorInstance.getValue();
    } else if (ide) {
        slot.code = ide.value;
    }
    slot.updated = Date.now();

    saveStrategyVault(slots);

    // Update select dropdown option label
    const select = document.getElementById('strategy_slot_select');
    if (select) {
        const opt = select.querySelector(`option[value="${activeId}"]`);
        if (opt) {
            opt.textContent = `Slot ${activeId}: ${newTitle}`;
        }
    }

    if (typeof showToast === 'function') {
        showToast({
            title: "Strategy Saved!",
            message: `Saved to Slot ${activeId}: "${newTitle}"`,
            type: "success",
            duration: 2200
        });
    }
}

function insertCurrentStrategy() {
    const activeId = getActiveSlotId();
    const slots = getStrategyVault();
    const slot = slots.find(s => s.id === activeId);
    if (!slot) return;

    if (codeMirrorInstance) {
        codeMirrorInstance.setValue(slot.code);
        codeMirrorInstance.save();
        codeMirrorInstance.focus();
    } else if (ide) {
        ide.value = slot.code;
        ide.focus();
    }

    if (typeof showToast === 'function') {
        showToast({
            title: "Strategy Inserted!",
            message: `Ready in live battle: "${slot.title}"`,
            type: "success",
            duration: 2000
        });
    }
}

// Global exposure
window.saveCurrentStrategy = saveCurrentStrategy;
window.insertCurrentStrategy = insertCurrentStrategy;
window.onStrategySlotChange = onStrategySlotChange;
window.initStrategyVault = initStrategyVault;

// --- OPPONENT INPUT MODAL (Model 1 Challenge/Dialogue) ---
socket.on('prompt_opponent_input', function(data) {
    if (data.from_player !== MY_PLAYER_ID) {
        let modal = document.getElementById('opponent_input_modal');
        let title = document.getElementById('input_modal_title');
        let prompt = document.getElementById('input_modal_prompt');
        let field = document.getElementById('input_modal_field');
        if (modal && prompt && field) {
            title.innerText = `💬 Player ${data.from_player} asks:`;
            prompt.innerText = data.prompt || "Say something:";
            field.value = "";
            modal.style.display = "block";
            setTimeout(() => field.focus(), 50);
        }
    }
});

function sendInputReply() {
    let modal = document.getElementById('opponent_input_modal');
    let field = document.getElementById('input_modal_field');
    if (!field || !modal) return;
    let reply = field.value.trim();
    if (reply) {
        socket.emit('reply_input', {
            room_id: typeof ROOM_ID !== 'undefined' ? ROOM_ID : 'default',
            from_player: MY_PLAYER_ID,
            reply: reply
        });
    }
    modal.style.display = "none";
    field.value = "";
}

document.addEventListener('DOMContentLoaded', () => {
    setupCommandsTableInsertButtons();
    document.getElementById('input_modal_send')?.addEventListener('click', sendInputReply);
    document.getElementById('input_modal_close')?.addEventListener('click', () => {
        let modal = document.getElementById('opponent_input_modal');
        if (modal) modal.style.display = "none";
    });
    document.getElementById('input_modal_field')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendInputReply();
        }
    });
});


// --- Commands Dialog Live Search Filter ---
function filterCommands(query) {
    const table = document.getElementById("commands_table");
    if (!table) return;
    const q = query.toLowerCase().trim();
    const rows = table.querySelectorAll("tr");
    rows.forEach((row, idx) => {
        if (idx === 0) return; // Skip table header
        const text = row.innerText.toLowerCase();
        row.style.display = (!q || text.includes(q)) ? "" : "none";
    });
}


// Quick banter chip helper for dialogue
function sendQuickReply(text) {
    const field = document.getElementById('input_modal_field');
    if (field) field.value = text;
    sendInputReply();
}


// --- Quick Code Snippet Insertion (Quick Chips & Commands Manual Insert) ---
function insertSnippet(snippet) {
    if (codeMirrorInstance) {
        const doc = codeMirrorInstance.getDoc();
        const cursor = doc.getCursor();
        let toInsert = snippet;
        const currentLine = doc.getLine(cursor.line) || "";
        if (currentLine.trim().length > 0) {
            toInsert = "\n" + toInsert;
        }
        doc.replaceRange(toInsert + "\n", cursor);
        codeMirrorInstance.focus();
        codeMirrorInstance.save();
        return;
    }

    const editor = document.getElementById("ide");
    if (!editor) return;
    
    const start = editor.selectionStart !== undefined ? editor.selectionStart : editor.value.length;
    const end = editor.selectionEnd !== undefined ? editor.selectionEnd : editor.value.length;
    const text = editor.value;
    
    let toInsert = snippet;
    // If not at beginning and preceding character isn't a newline, start on a new line
    if (start > 0 && text[start - 1] !== '\n') {
        toInsert = '\n' + toInsert;
    }
    // If not at end and succeeding character isn't a newline, end with a newline
    if (end < text.length && text[end] !== '\n') {
        toInsert = toInsert + '\n';
    }
    
    editor.value = text.substring(0, start) + toInsert + text.substring(end);
    const newPos = start + toInsert.length;
    editor.selectionStart = editor.selectionEnd = newPos;
    editor.focus();
    
    if (typeof updateLineNumbers === 'function') updateLineNumbers();
    if (typeof updateIndentGuides === 'function') updateIndentGuides();
}

window.insertSnippet = insertSnippet;

function setupCommandsTableInsertButtons() {
    const table = document.getElementById("commands_table");
    if (!table) return;
    
    const headerRow = table.querySelector("thead tr");
    if (headerRow && !headerRow.querySelector(".insert-col-header")) {
        const th = document.createElement("th");
        th.className = "insert-col-header";
        th.style.width = "75px";
        th.style.textAlign = "center";
        th.innerText = "Action";
        headerRow.appendChild(th);
    }
    
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach(tr => {
        if (tr.querySelector(".insert-cmd-btn")) return;
        let codeSnippet = "";
        if (tr.cells[3]) {
            codeSnippet = tr.cells[3].innerText.trim();
        } else if (tr.cells[1]) {
            codeSnippet = tr.cells[1].innerText.trim();
        }
        
        const td = document.createElement("td");
        td.style.textAlign = "center";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "insert-cmd-btn";
        btn.innerText = "➕ Insert";
        btn.title = `Insert "${codeSnippet}" into editor`;
        btn.onclick = (e) => {
            e.stopPropagation();
            insertSnippet(codeSnippet);
            if (typeof showToast === 'function') {
                showToast({
                    title: "Snippet Inserted!",
                    message: `Added "${codeSnippet}" to your combat code.`,
                    type: "success",
                    duration: 1800
                });
            }
        };
        td.appendChild(btn);
        tr.appendChild(td);
    });
}
