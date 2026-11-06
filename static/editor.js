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

function initCodeMirror() {
    if (typeof CodeMirror !== "undefined" && ide) {
        const frame = document.querySelector(".editor-frame");
        if (frame) frame.classList.add("has-codemirror");

        codeMirrorInstance = CodeMirror.fromTextArea(ide, {
            mode: { name: "python", version: 3, singleLineStringErrors: false },
            theme: "dracula",
            lineNumbers: true,
            indentUnit: 4,
            tabSize: 4,
            indentWithTabs: false,
            lineWrapping: true,
            autofocus: false,
            viewportMargin: Infinity
        });

        window.codeMirrorInstance = codeMirrorInstance;

        codeMirrorInstance.on("change", function() {
            codeMirrorInstance.save();
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
