---
name: plain-html-ui
description: Build complex frontends using only plain HTML semantic elements with zero or minimal CSS. Use when creating functional UIs, dashboards, tools, chat interfaces, model loaders, or any web UI that should be brutalist, fast, and dependency-free. Triggers on requests for plain HTML, css-less UI, fieldset-based layout, brutalist frontend, or vanilla HTML interfaces.
when_to_use: User wants a UI built with only native HTML elements (fieldset, legend, select, input, textarea, button, progress, details, dialog, etc) without CSS frameworks, or wants to replicate the HemorroidaBot-style brutalist functional frontend pattern.
---

# Plain HTML UI - Brutalist Functional Frontend Skill

Create complex, production-grade frontends using ONLY plain HTML elements. No Tailwind, no Bootstrap, no component libraries. Just semantic HTML that works everywhere.

## Core Philosophy

1.  **Fieldset is your card/div** - Every logical section = `<fieldset><legend>Title</legend>...</fieldset>`
2.  **Native elements do the work** - Browser already gives you modals, dropdowns, accordions, progress, validation
3.  **ID-based JS, no frameworks** - `document.getElementById`, `onsubmit="return false;"`, vanilla events
4.  **CSS is optional and minimal** - If you must, only `max-width: 640px; margin: 0 auto; font-family: monospace` + `.row { display: flex; gap: 6px; flex-wrap: wrap; }`
5.  **Everything is a form** - Wrap interactive UI in `<form onsubmit="return false;">` to get Enter-key behavior and grouping for free

## Allowed Element Palette

You may ONLY use these elements for structure and interaction:

### Structure
- `h1, h2, h3, p, pre, hr, br`
- `fieldset, legend` - Primary grouping mechanism (your "card")
- `div` - ONLY with class `row` for button rows, or as empty container for dynamic content (`#messages`, `#file-list`, `#perf`)
- `form` - Wrapper with `onsubmit="return false;"`

### Inputs (all 100% width via minimal CSS, except radio/checkbox)
- `label` - Always associate with `for="id"` or wrap input
- `input type="text|number|file|checkbox|radio|range|color|date|password"` 
- `select > option, optgroup` - For enums, model pickers
- `textarea` - Multi-line, set `rows="3"`+
- `datalist` - For autocomplete without JS libraries: `<input list="x"><datalist id="x"><option>`
- `button type="button"` - Always explicit type, never default submit

### Display / Feedback
- `progress max="100" value="0"` - Loading, downloads, model loading
- `meter` - For scores, levels, stats
- `output` - For calculated results: `<output id="result">`
- `pre, code` - For logs, JSON, tool output
- `table, thead, tbody, tr, th, td` - For any grid data, no div grids
- `ul, ol, li` - Lists
- `p id="status"` - Status lines (single source of truth for state text)

### Advanced Native Widgets (Use these to avoid custom JS)
- `details > summary` - Accordion, collapsible sections, advanced options, logs drawer. This replaces all custom collapse JS.
  ```html
  <details>
    <summary>Advanced options</summary>
    <fieldset>...</fieldset>
  </details>
  ```
- `dialog` - Modal without libraries. Use `showModal()` / `close()`.
  ```html
  <dialog id="confirm-dlg">
    <p>Delete?</p>
    <div class="row">
      <button type="button" onclick="this.closest('dialog').close('ok')">OK</button>
      <button type="button" onclick="this.closest('dialog').close()">Cancel</button>
    </div>
  </dialog>
  ```
- `datalist` + `input` = combobox
- `input type="range"` = slider

## Canonical Template (Copy this)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>App Title</title>
<style>
  body { max-width: 640px; margin: 0 auto; padding: 20px; font-family: monospace; }
  textarea, select, input[type="text"], input[type="number"] { width: 100%; box-sizing: border-box; }
  .row { display: flex; gap: 6px; flex-wrap: wrap; }
  pre { white-space: pre-wrap; word-break: break-all; }
</style>
</head>
<body>

<h1>App Title</h1>
<p>One-line tagline of what this does.</p>

<form id="main-form" onsubmit="return false;">

  <fieldset>
    <legend>Model / Config</legend>
    <label for="model-select">Model:</label>
    <select id="model-select">
      <option value="qwen-3b">Qwen 2.5 3B</option>
      <option value="qwen-7b">Qwen 2.5 7B</option>
    </select>
  </fieldset>

  <fieldset>
    <legend>Download / Resources</legend>
    <label for="repo-input">Repo:</label>
    <input id="repo-input" type="text" placeholder="author/model-GGUF">
    <label for="file-input">File:</label>
    <input id="file-input" type="text" placeholder="model-q4_k_m.gguf">
    <br><br>
    <div class="row">
      <button type="button" id="list-btn">List files</button>
      <button type="button" id="dl-btn">Download & cache</button>
      <button type="button" id="cache-btn">View cache</button>
      <button type="button" id="load-btn">Load</button>
      <button type="button" id="unload-btn">Unload</button>
    </div>
    <p id="dl-status"></p>
    <progress id="dl-progress" max="100" value="0" style="display:none;width:100%"></progress>
    <div id="file-list"></div>
  </fieldset>

  <fieldset>
    <legend>Input / Voice</legend>
    <div class="row">
      <label><input type="radio" name="mode" value="text" checked> Text</label>
      <label><input type="radio" name="mode" value="voice"> Voice</label>
    </div>
    <div class="row">
      <button type="button" id="mic-btn">🎤 Dictate</button>
      <label><input type="checkbox" id="tts-chk"> Speak answer (TTS)</label>
    </div>
  </fieldset>

  <fieldset>
    <legend>Performance</legend>
    <div id="perf">No data. Send a message with model loaded.</div>
  </fieldset>

  <fieldset>
    <legend>Chat / Output</legend>
    <div class="row">
      <button type="button" id="clear-btn">Clear history</button>
    </div>
    <div id="messages"></div>
  </fieldset>

  <fieldset>
    <legend>Message</legend>
    <label for="user-input">Type or dictate:</label>
    <textarea id="user-input" rows="3" placeholder="Your message..."></textarea>
    <br>
    <button type="button" id="send-btn">Send</button>
  </fieldset>

</form>

<fieldset>
  <legend>Tools</legend>
  <div id="tools-grid"></div>
</fieldset>

<details>
  <summary>Advanced / Debug</summary>
  <fieldset>
    <legend>Logs</legend>
    <pre id="debug-log"></pre>
    <div class="row">
      <button type="button" id="export-log-btn">Export</button>
      <button type="button" id="clear-log-btn">Clear</button>
    </div>
  </fieldset>
</details>

<dialog id="alert-dlg">
  <p id="alert-msg"></p>
  <div class="row"><button type="button" onclick="this.closest('dialog').close()">Close</button></div>
</dialog>

<script src="app.js"></script>
</body>
</html>
```

## Pattern Catalog

### 1. Button Toolbar
Always wrap action buttons in `.row`. Never stack vertically unless it's primary action.
```html
<div class="row">
  <button type="button" id="list-btn">Listar arquivos</button>
  <button type="button" id="dl-btn">Baixar e cachear</button>
  <button type="button" id="cache-btn">Ver cache</button>
</div>
```

### 2. Status + Progress Pair
Every async action gets a `<p id="*-status">` + `<progress>` pair. Progress is hidden by default.
```html
<p id="dl-status"></p>
<progress id="dl-progress" max="100" value="0" style="display:none;width:100%"></progress>
```

### 3. Radio Group for Mode Switch
Use radio inside label for mode toggles. No custom switch components.
```html
<div class="row">
  <label><input type="radio" name="mode" value="text" checked> Text</label>
  <label><input type="radio" name="mode" value="voice"> Voice</label>
</div>
```

### 4. Checkbox for Boolean Flags
```html
<label><input type="checkbox" id="tts-chk"> Falar resposta (TTS)</label>
```

### 5. Chat Log
Simple div that you append to. Each message is fieldset or details.
```html
<div id="messages"></div>
<script>
// append like:
messages.innerHTML += `<fieldset><legend>user</legend><pre>${text}</pre></fieldset>`
</script>
```

### 6. File List / Dynamic Content Container
Empty div that JS populates with table or list.
```html
<div id="file-list"></div>
<!-- JS fills with <table><tr><td>file.gguf</td><td><button>...</button></td></tr></table> -->
```

### 7. Performance / Stats Block
A single div with small font, updated via JS.
```html
<fieldset>
  <legend>Desempenho</legend>
  <div id="perf">Sem dados.</div>
</fieldset>
```

### 8. Tool Grid
For many small tools, render buttons dynamically into a grid div.
```html
<fieldset>
  <legend>Ferramentas locais</legend>
  <div id="tools-grid"></div>
</fieldset>
```

## Complex Layouts Without CSS

- **Tabs**: Use `<select id="tab-select">` that shows/hides fieldsets, or `<details>` stack, or radio group + JS.
  ```html
  <fieldset>
    <legend>View</legend>
    <select id="view-select">
      <option value="chat">Chat</option>
      <option value="tools">Tools</option>
      <option value="settings">Settings</option>
    </select>
  </fieldset>
  <fieldset id="view-chat">...</fieldset>
  <fieldset id="view-tools" style="display:none">...</fieldset>
  ```

- **Split / Two Columns**: Don't. Stack vertically. If you MUST, use two fieldsets inside a `.row` with `style="flex:1"`.

- **Master-Detail**: Fieldset list on top, details fieldset below. Click populates detail.

- **Wizard / Multi-step**: One fieldset visible at a time, Next/Prev buttons swap `style.display`.

- **Dashboard**: Multiple fieldsets, each with table or pre inside. Use `<meter>` for KPIs.

## JS Glue Rules

- All IDs are kebab-case: `model-select`, `user-input`, `dl-btn`, `dl-status`
- Get elements once at top: `const modelSelect = document.getElementById('model-select')`
- No frameworks. No jQuery. No React.
- For send: `<button type="button" id="send-btn" onclick="sendMessage()">` OR addEventListener.
- Forms never submit: `onsubmit="return false;"`
- Dynamic lists: Build HTML strings with `<table>` or `<fieldset>` and set innerHTML, or createElement.
- Keep state in localStorage if needed, not in DOM classes.

## Anti-Patterns - NEVER Do

- ❌ `<div class="card">` - Use `<fieldset><legend>`
- ❌ `<div class="modal">` - Use `<dialog>`
- ❌ Custom dropdowns - Use `<select>` or `<input list="datalist">`
- ❌ `<div onclick>` - Use `<button type="button">`
- ❌ CSS grid / flex for layout beyond `.row` - Stack fieldsets vertically
- ❌ Icons libraries - Use emoji (🎤 📁 💾) or text
- ❌ CSS frameworks - No Tailwind, Bootstrap, Bulma
- ❌ `class="btn btn-primary"` - Just `<button>`
- ❌ Hiding with CSS classes - Use `style.display = 'none'` or `hidden` attribute

## Minimal CSS (If You Absolutely Must)

Copy this, nothing more:

```css
body { max-width: 640px; margin: 0 auto; padding: 20px; font-family: monospace; }
h1 { font-size: 1.8em; }
h2 { font-size: 1.2em; }
textarea { width: 100%; }
select, input[type="text"], input[type="number"], input[type="password"] { width: 100%; box-sizing: border-box; }
pre { white-space: pre-wrap; word-break: break-word; }
.row { display: flex; gap: 6px; flex-wrap: wrap; }
.rec { color: #c00; font-weight: bold; } /* for recording state */
#perf { font-size: 0.8em; }
```

If user asks for css-less, output ZERO css. Just plain HTML.

## Checklist Before Output

- [ ] All sections are `<fieldset><legend>`?
- [ ] All buttons have `type="button"`?
- [ ] Inputs have associated `<label for="">`?
- [ ] IDs are kebab-case?
- [ ] Dynamic containers (`#messages`, `#file-list`, `#perf`) are empty divs?
- [ ] Status p + progress pattern for async?
- [ ] Form has `onsubmit="return false;"`?
- [ ] No div cards, no custom modals, no framework classes?
- [ ] Uses emoji not icon fonts?

## Example Outputs

### Simple Tool UI
```html
<form onsubmit="return false;">
  <fieldset>
    <legend>Calculator</legend>
    <label for="expr-input">Expression:</label>
    <input id="expr-input" type="text" placeholder="2+2*3">
    <div class="row">
      <button type="button" id="calc-btn">Calculate</button>
      <button type="button" id="clear-calc-btn">Clear</button>
    </div>
    <p>Result:</p>
    <output id="calc-output"><pre>0</pre></output>
  </fieldset>
</form>
```

### File Manager UI
```html
<fieldset>
  <legend>Files</legend>
  <div class="row">
    <button type="button" id="refresh-btn">Refresh</button>
    <button type="button" id="upload-btn">Upload</button>
  </div>
  <table id="files-table" style="width:100%">
    <thead><tr><th>Name</th><th>Size</th><th>Action</th></tr></thead>
    <tbody id="files-body"></tbody>
  </table>
</fieldset>
```

Now build the requested UI using ONLY these patterns.
