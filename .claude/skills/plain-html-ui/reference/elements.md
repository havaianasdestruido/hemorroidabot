# Plain HTML Element Reference

Complete catalog of allowed elements and when to use each.

## Structure

### fieldset + legend
Your primary card. Every logical group MUST be a fieldset.
```html
<fieldset>
  <legend>Section Title</legend>
  ...content...
</fieldset>
```
- Use for: Model config, Download, Chat, Tools, any grouping
- Never replace with div.card

### form
Wrap all interactive elements. Always `onsubmit="return false;"` to prevent page reload.
```html
<form id="main-form" onsubmit="return false;">
  <fieldset>...</fieldset>
</form>
```

### div.row
ONLY allowed div class. Provides button toolbar.
```css
.row { display: flex; gap: 6px; flex-wrap: wrap; }
```
```html
<div class="row">
  <button>One</button>
  <button>Two</button>
</div>
```

### div#dynamic
Empty divs for JS population:
- `#messages` - chat log
- `#file-list` - file listing
- `#perf` - performance stats
- `#tools-grid` - tools

## Inputs

### label
Always associate. Two patterns:
```html
<label for="my-input">Name:</label>
<input id="my-input" type="text">

<label><input type="checkbox"> Check me</label>
<label><input type="radio" name="group" value="1"> Option 1</label>
```

### input types
- `text` - single line text, repo names, file names
- `number` - numbers
- `checkbox` - boolean flags
- `radio` - mode switches (same name attribute)
- `range` - slider: `<input type="range" min="0" max="100">`
- `color` - color picker
- `date` - date picker
- `file` - file upload
- `password` - secrets

### select + option + optgroup
For enums, model selection, view switching.
```html
<select id="model-select">
  <optgroup label="Small">
    <option value="qwen-3b">Qwen 2.5 3B</option>
  </optgroup>
  <optgroup label="Large">
    <option value="qwen-7b">Qwen 2.5 7B</option>
  </optgroup>
</select>
```

### textarea
Multi-line input. Always set rows.
```html
<textarea id="user-input" rows="3" placeholder="Your message..."></textarea>
```

### datalist
Autocomplete without JS library.
```html
<input list="models" id="model-input" type="text">
<datalist id="models">
  <option value="Qwen 2.5 3B">
  <option value="Llama 3.2 3B">
</datalist>
```

### button
ALWAYS `type="button"` unless you want form submit. Never bare `<button>` inside form.
```html
<button type="button" id="send-btn">Send</button>
<button type="button" id="send-btn" onclick="sendMessage()">Send</button>
```

## Display

### p#status
Status text. One per async operation.
```html
<p id="dl-status"></p>
<p id="perf">No data.</p>
```

### progress
Loading, download progress. Hidden by default, shown during operation.
```html
<progress id="dl-progress" max="100" value="0" style="display:none;width:100%"></progress>
```
JS: `progress.style.display='block'; progress.value=50`

### meter
For static levels, scores, resource usage.
```html
<meter value="0.6" min="0" max="1">60%</meter>
<meter value="6" min="0" max="10" low="3" high="8" optimum="10">6/10</meter>
```

### output
For calculation results.
```html
<output id="result"><pre>0</pre></output>
```

### pre, code
For logs, JSON, formatted output.
```html
<pre id="log">log line 1
log line 2</pre>
<pre><code>{ "json": true }</code></pre>
```

### table
For ANY grid data. Never use div grids.
```html
<table style="width:100%">
  <thead><tr><th>Name</th><th>Action</th></tr></thead>
  <tbody id="body"><tr><td>file.gguf</td><td><button>Load</button></td></tr></tbody>
</table>
```

## Advanced Native

### details + summary
Accordion, collapsible, drawer - replaces all custom collapse JS.
```html
<details>
  <summary>Advanced options</summary>
  <fieldset>...</fieldset>
</details>

<details open>
  <summary>Logs (3)</summary>
  <pre>...</pre>
</details>
```

### dialog
Modal without libraries. Requires JS to open.
```html
<dialog id="my-dlg">
  <p>Message</p>
  <div class="row">
    <button type="button" onclick="this.closest('dialog').close('ok')">OK</button>
    <button type="button" onclick="this.closest('dialog').close()">Cancel</button>
  </div>
</dialog>
<script>
  document.getElementById('my-dlg').showModal()
</script>
```

### optgroup
Group options in select.

## Text

### h1, h2, h3, p
Standard headings. Keep hierarchy shallow. One h1 per page.
```html
<h1>App Name</h1>
<p>Tagline.</p>
<h2>Section (if needed outside fieldset)</h2>
```

### hr, br
- `br` - minimal line breaks between label/input pairs
- `hr` - section separator if needed outside fieldsets

## What NOT to Use

- div.card, div.modal, div.dropdown - use fieldset, dialog, select
- span for buttons - use button
- i, svg for icons - use emoji 🎤 📁 💾 ⚙️ ▶️
- Custom sliders - use input[type=range]
- Custom color pickers - use input[type=color]
