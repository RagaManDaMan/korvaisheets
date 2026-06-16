/**
 * KorvaiSheets — Core Application Logic
 * Implements Tala calculations, Solkattu translations, Yati classification,
 * Web Audio scheduling, and the Redesign Assistant.
 */

// STATE MANAGEMENT
const state = {
  // Tala Configuration
  talaPreset: 'adi',
  beats: 8,
  gati: 4,
  cycles: 2,
  offset: 0,
  
  // Solkattu Mappings
  renderStyle: 'notation', // 'notation' (classical t,,) or 'syllabic' (recitative ta-ka)
  notationDict: {
    1: ',',
    2: 't,',
    3: 't,,',
    4: 't,,,',
    5: 'ttktt',
    6: 'tt,ktt',
    7: 't,t,ktt',
    8: 't,t,k,tt',
    9: 't,t,k,t,ktt'
  },
  syllabicDict: {
    1: ',',
    2: 'ta-ka',
    3: 'ta-ki-ta',
    4: 'ta-ka-dhi-mi',
    5: 'ta-ka-ta-ki-ta',
    6: 'ta-ki-ta-ta-ki-ta',
    7: 'ta-ka-dhi-mi-ta-ki-ta',
    8: 'ta-ka-dhi-mi-ta-ka-dhi-mi',
    9: 'ta-ka-dhi-mi-ta-ka-ta-ki-ta'
  },

  // Editor Lines
  lines: [
    [6, 1, 6, 1, 6],
    [6, 1, 6, 1, 6],
    [6, 1, 6, 1, 6]
  ],

  // Audio Player State
  bpm: 120,
  isPlaying: false,
  loop: false,
  playGapsTick: true,
  
  // Scheduler variables
  audioCtx: null,
  schedulerTimerId: null,
  nextMatraTime: 0,
  currentMatraInKorvai: 0,
  flatKorvaiEvents: [], // Flatted list of all matra events

  // Standalone Metronome variables
  metronomeActive: false,
  metronomeSound: 'woodblock',
  metronomeSubdivisions: true,
  metronomeStep: 0,
  playTriggered: false,
};

// PRESET LESSONS DATA
const presets = {
  'ex4-sama': {
    tala: 'adi', beats: 8, gati: 4, cycles: 2, offset: -4, // 64 - 4 = 60
    lines: [
      [6, 1, 6, 1, 6],
      [6, 1, 6, 1, 6],
      [6, 1, 6, 1, 6]
    ]
  },
  'ex4-sroto': {
    tala: 'adi', beats: 8, gati: 4, cycles: 2, offset: -4, // 64 - 4 = 60
    lines: [
      [5, 1, 5, 1, 5],
      [6, 1, 6, 1, 6],
      [7, 1, 7, 1, 7]
    ]
  },
  'ex4-mixed': {
    tala: 'adi', beats: 8, gati: 4, cycles: 2, offset: -4, // 64 - 4 = 60
    lines: [
      [6, 1, 6, 1, 6],
      [5, 1, 6, 1, 7],
      [7, 1, 6, 1, 5]
    ]
  },
  'ex4-adi64': {
    tala: 'adi', beats: 8, gati: 4, cycles: 2, offset: 0, // 64
    lines: [
      [6, 1, 6, 1, 6, 2],
      [5, 1, 6, 1, 7, 2],
      [7, 1, 6, 1, 5]
    ]
  },
  'ex5-gopuccha': {
    tala: 'custom', beats: 39, gati: 1, cycles: 1, offset: 0, // 39
    lines: [
      [7, 5, 5, 5, 3],
      [7, 3, 5, 3, 3, 3],
      [7, 5, 3, 7, 7, 3, 7, 9] // sum = 48. wait, let's keep the user's specific spreadsheet numbers
    ]
  },
  'ex5-rupakam': {
    tala: 'rupakam', beats: 3, gati: 4, cycles: 2, offset: 1, // 24 + 1 = 25
    lines: [
      [7, 5, 5, 5, 3]
    ]
  },
  'ex7-gopuccha': {
    tala: 'custom', beats: 30, gati: 1, cycles: 1, offset: 0, // 30
    lines: [
      [4, 4, 4, 3, 3, 3, 2, 2, 2, 3]
    ]
  },
  'ex7-river': {
    tala: 'custom', beats: 30, gati: 1, cycles: 1, offset: 0, // 30
    lines: [
      [2, 2, 2, 3, 3, 3, 4, 4, 4, 3]
    ]
  }
};

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  calculateTalaTarget();
  renderDictionary();
  renderEditorLines();
  updateCalculations();
});

// UI EVENT LISTENERS & DOM SETUP
function initUI() {
  // Tala Selectors
  const talaSelect = document.getElementById('tala-select');
  const customTalaFields = document.getElementById('custom-tala-fields');
  const customBeatsInput = document.getElementById('custom-beats');
  const customGatiSelect = document.getElementById('custom-gati');
  const targetCyclesInput = document.getElementById('target-cycles');
  const targetOffsetInput = document.getElementById('target-offset');

  talaSelect.addEventListener('change', (e) => {
    state.talaPreset = e.target.value;
    if (state.talaPreset === 'custom') {
      customTalaFields.classList.remove('hidden');
    } else {
      customTalaFields.classList.add('hidden');
      updateTalaVariablesFromPreset();
    }
    calculateTalaTarget();
    updateCalculations();
  });

  customBeatsInput.addEventListener('input', (e) => {
    state.beats = parseInt(e.target.value) || 8;
    calculateTalaTarget();
    updateCalculations();
  });

  customGatiSelect.addEventListener('change', (e) => {
    state.gati = parseInt(e.target.value) || 4;
    calculateTalaTarget();
    updateCalculations();
  });

  targetCyclesInput.addEventListener('input', (e) => {
    state.cycles = parseFloat(e.target.value) || 1;
    calculateTalaTarget();
    updateCalculations();
  });

  targetOffsetInput.addEventListener('input', (e) => {
    state.offset = parseInt(e.target.value) || 0;
    calculateTalaTarget();
    updateCalculations();
  });

  // Dictionary style buttons
  const styleNotationBtn = document.getElementById('style-notation-btn');
  const styleSyllableBtn = document.getElementById('style-syllable-btn');

  styleNotationBtn.addEventListener('click', () => {
    styleNotationBtn.classList.add('active');
    styleSyllableBtn.classList.remove('active');
    state.renderStyle = 'notation';
    renderDictionary();
    updateCalculations();
  });

  styleSyllableBtn.addEventListener('click', () => {
    styleSyllableBtn.classList.add('active');
    styleNotationBtn.classList.remove('active');
    state.renderStyle = 'syllabic';
    renderDictionary();
    updateCalculations();
  });

  document.getElementById('reset-dict-btn').addEventListener('click', () => {
    // Reset to defaults
    state.notationDict = { 1: ',', 2: 't,', 3: 't,,', 4: 't,,,', 5: 'ttktt', 6: 'tt,ktt', 7: 't,t,ktt', 8: 't,t,k,tt', 9: 't,t,k,t,ktt' };
    state.syllabicDict = { 1: ',', 2: 'ta-ka', 3: 'ta-ki-ta', 4: 'ta-ka-dhi-mi', 5: 'ta-ka-ta-ki-ta', 6: 'ta-ki-ta-ta-ki-ta', 7: 'ta-ka-dhi-mi-ta-ki-ta', 8: 'ta-ka-dhi-mi-ta-ka-dhi-mi', 9: 'ta-ka-dhi-mi-ta-ka-ta-ki-ta' };
    renderDictionary();
    updateCalculations();
  });

  // Editor Actions
  document.getElementById('add-line-btn').addEventListener('click', () => {
    // Duplicate the last line or add a default
    const lastLine = state.lines[state.lines.length - 1] || [6, 1, 6, 1, 6];
    state.lines.push([...lastLine]);
    renderEditorLines();
    updateCalculations();
  });

  // Redesign Assistant Apply
  document.getElementById('apply-suggestion-btn').addEventListener('click', applyRedesignSuggestion);

  // Metronome / Audio Controls
  const playBtn = document.getElementById('play-btn');
  const bpmSlider = document.getElementById('bpm-slider');
  const bpmVal = document.getElementById('bpm-val');
  const playGapsTick = document.getElementById('play-gaps-tick');
  const loopKorvai = document.getElementById('loop-korvai');

  playBtn.addEventListener('click', () => {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  bpmSlider.addEventListener('input', (e) => {
    state.bpm = parseInt(e.target.value);
    bpmVal.textContent = state.bpm;
  });

  playGapsTick.addEventListener('change', (e) => {
    state.playGapsTick = e.target.checked;
  });

  loopKorvai.addEventListener('change', (e) => {
    state.loop = e.target.checked;
  });

  // Presets load
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const presetId = e.currentTarget.getAttribute('data-preset');
      loadPreset(presetId);
    });
  });

  // Modal Help
  const modal = document.getElementById('help-modal');
  document.getElementById('help-btn').addEventListener('click', () => {
    modal.classList.remove('hidden');
  });
  document.getElementById('close-modal-btn').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Symmetric Nudge Button
  const nudgeBtn = document.getElementById('nudge-btn');
  nudgeBtn.addEventListener('click', symmetricNudge);

  // Standalone Metronome controls
  const metroToggleBtn = document.getElementById('metronome-toggle-btn');
  const metroSoundSelect = document.getElementById('metronome-sound-select');
  const metroSubdivisionsCb = document.getElementById('metronome-subdivisions');

  metroToggleBtn.addEventListener('click', () => {
    if (state.metronomeActive) {
      stopBackgroundMetronome();
    } else {
      startBackgroundMetronome();
    }
  });

  metroSoundSelect.addEventListener('change', (e) => {
    state.metronomeSound = e.target.value;
  });

  metroSubdivisionsCb.addEventListener('change', (e) => {
    state.metronomeSubdivisions = e.target.checked;
  });
}

// UPDATE TALA VARIABLES FROM PRESETS
function updateTalaVariablesFromPreset() {
  const select = document.getElementById('tala-select');
  const val = select.value;
  if (val === 'adi') {
    state.beats = 8;
    state.gati = 4;
  } else if (val === 'rupakam') {
    state.beats = 3;
    state.gati = 4;
  } else if (val === 'khandachapu') {
    state.beats = 5;
    state.gati = 1;
  } else if (val === 'misrachapu') {
    state.beats = 7;
    state.gati = 1;
  }
}

// CALCULATE TALA TARGET MATRAS
function calculateTalaTarget() {
  const targetMatras = (state.beats * state.gati * state.cycles) + state.offset;
  document.getElementById('target-matras-display').textContent = targetMatras;
  document.getElementById('math-target-val').textContent = targetMatras;
  
  // Format formula text
  const formulaStr = `${state.beats} beats &times; ${state.gati} gati &times; ${state.cycles} cycles ${state.offset !== 0 ? (state.offset > 0 ? ' + ' + state.offset : ' - ' + Math.abs(state.offset)) : ''} = ${targetMatras} matras`;
  document.getElementById('target-formula-display').innerHTML = formulaStr;
  
  // Update display name of Tala in metronome
  const talaNames = {
    'adi': 'Adi Tala (8 Beats, Chatusra Gati = 32)',
    'rupakam': 'Rupakam Tala (3 Beats, Chatusra Gati = 12)',
    'khandachapu': 'Khanda Chapu (5 Matras)',
    'misrachapu': 'Misra Chapu (7 Matras)',
    'custom': `Custom Tala (${state.beats} Beats, Gati ${state.gati})`
  };
  document.getElementById('tala-name-display').textContent = talaNames[state.talaPreset] || talaNames['custom'];

  buildMetronomeTrack();
}

// BUILD METRONOME BEATS TRACK
function buildMetronomeTrack() {
  const track = document.getElementById('metronome-track');
  track.innerHTML = '';
  
  // Create nodes for each beat of the Tala cycle
  const totalBeats = state.beats;
  for (let i = 0; i < totalBeats; i++) {
    const node = document.createElement('div');
    node.className = 'beat-node';
    // Accent on first beat (Samam)
    if (i === 0) {
      node.classList.add('accent');
      node.textContent = 'S';
    } else {
      node.textContent = i + 1;
    }
    node.id = `beat-node-${i}`;
    track.appendChild(node);
  }
}

// RENDER DICTIONARY EDITABLE VALUES
function renderDictionary() {
  const container = document.getElementById('dict-mappings-container');
  container.innerHTML = '';
  
  const activeDict = state.renderStyle === 'notation' ? state.notationDict : state.syllabicDict;
  
  for (let k = 1; k <= 9; k++) {
    const row = document.createElement('div');
    row.className = 'dict-row';
    
    const key = document.createElement('div');
    key.className = 'dict-key';
    key.textContent = k;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control dict-input';
    input.value = activeDict[k];
    input.placeholder = `Syllables for ${k}`;
    input.addEventListener('input', (e) => {
      activeDict[k] = e.target.value;
      updateCalculations();
    });
    
    row.appendChild(key);
    row.appendChild(input);
    container.appendChild(row);
  }
}

// RENDER KORVAI EDITOR LINES
function renderEditorLines() {
  const container = document.getElementById('editor-lines-container');
  container.innerHTML = '';
  
  state.lines.forEach((lineNumbers, index) => {
    const row = document.createElement('div');
    row.className = 'editor-line-row';
    row.id = `editor-line-row-${index}`;
    
    const topBar = document.createElement('div');
    topBar.className = 'line-top-bar';
    
    const numSpan = document.createElement('div');
    numSpan.className = 'line-number';
    numSpan.textContent = index + 1;
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'line-input-wrapper';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control line-input';
    input.value = lineNumbers.join(', ');
    input.placeholder = 'e.g. 6, 1, 6, 1, 6';
    input.id = `line-input-${index}`;
    
    input.addEventListener('input', (e) => {
      // Parse CSV input into array of integers
      const parsed = e.target.value
        .split(',')
        .map(x => parseInt(x.trim()))
        .filter(x => !isNaN(x) && x > 0);
      
      state.lines[index] = parsed;
      updateCalculations();
    });
    
    const sumSpan = document.createElement('div');
    sumSpan.className = 'line-sum';
    sumSpan.id = `line-sum-${index}`;
    sumSpan.textContent = '0';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-line';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete Line';
    deleteBtn.addEventListener('click', () => {
      if (state.lines.length <= 1) return; // Keep at least one line
      state.lines.splice(index, 1);
      renderEditorLines();
      updateCalculations();
    });
    
    inputWrapper.appendChild(input);
    topBar.appendChild(numSpan);
    topBar.appendChild(inputWrapper);
    topBar.appendChild(sumSpan);
    topBar.appendChild(deleteBtn);
    
    const bottomBar = document.createElement('div');
    bottomBar.className = 'line-bottom-bar';
    
    const label = document.createElement('div');
    label.className = 'solkattu-display-label';
    label.textContent = state.renderStyle === 'notation' ? 'Classical Notation' : 'Phonetic Solkattu';
    
    const value = document.createElement('div');
    value.className = 'solkattu-display-value';
    value.id = `solkattu-display-${index}`;
    value.textContent = '...';
    
    bottomBar.appendChild(label);
    bottomBar.appendChild(value);
    
    row.appendChild(topBar);
    row.appendChild(bottomBar);
    
    container.appendChild(row);
  });
}

// UPDATE CORE CALCULATIONS, SYLLABLES, SHAPES, & MISMATCHES
function updateCalculations() {
  let totalKorvaiMatras = 0;
  const lineSums = [];
  
  const activeDict = state.renderStyle === 'notation' ? state.notationDict : state.syllabicDict;
  
  // Translate each line to solkattu
  state.lines.forEach((lineNumbers, index) => {
    let lineSum = 0;
    let solkattuParts = [];
    
    // Track syllable indices for highlighting during audio playback
    let syllableMarkup = [];
    let syllableGlobalIndex = totalKorvaiMatras;
    
    lineNumbers.forEach((num, numIdx) => {
      lineSum += num;
      const phraseText = activeDict[num] || `(${num})`;
      
      // Parse individual syllables/strokes for visual HTML markup
      let items = [];
      if (state.renderStyle === 'notation') {
        // Classically: split characters. Each char represents 1 matra
        items = phraseText.split('');
      } else {
        // Phonetically: split by dashes, each representing a syllable stroke. 
        // If it's a gap (,), keep it.
        items = phraseText === ',' ? [','] : phraseText.split('-');
      }
      
      items.forEach((item, itemIdx) => {
        const spanId = `syllable-global-${syllableGlobalIndex}`;
        syllableMarkup.push(`<span id="${spanId}">${item}</span>`);
        syllableGlobalIndex++;
      });
      
      // Add divider space between numbers in editor for readability
      if (numIdx < lineNumbers.length - 1) {
        syllableMarkup.push('<span class="divider"> </span>');
      }
    });
    
    lineSums.push(lineSum);
    totalKorvaiMatras += lineSum;
    
    // Update line sum label
    const sumEl = document.getElementById(`line-sum-${index}`);
    if (sumEl) sumEl.textContent = `${lineSum} m`;
    
    // Update solkattu markup
    const displayEl = document.getElementById(`solkattu-display-${index}`);
    if (displayEl) {
      displayEl.innerHTML = syllableMarkup.join('');
    }
  });
  
  // Update total sum
  document.getElementById('total-korvai-matras').textContent = totalKorvaiMatras;
  
  // Check mismatch
  const targetMatras = (state.beats * state.gati * state.cycles) + state.offset;
  const difference = targetMatras - totalKorvaiMatras;
  
  const mismatchBadge = document.getElementById('mismatch-badge');
  const mismatchText = document.getElementById('mismatch-text');
  
  mismatchBadge.className = 'math-item status-badge';
  
  if (difference === 0) {
    mismatchBadge.classList.add('match');
    mismatchText.textContent = 'Perfect Match!';
    hideSuggestion();
  } else if (difference > 0) {
    mismatchBadge.classList.add('deficit');
    mismatchText.textContent = `Deficit of ${difference} matras`;
    showSuggestion(difference, totalKorvaiMatras, targetMatras);
  } else {
    mismatchBadge.classList.add('surplus');
    mismatchText.textContent = `Surplus of ${Math.abs(difference)} matras`;
    showSuggestion(difference, totalKorvaiMatras, targetMatras);
  }
  
  // Show or hide nudge button
  const nudgeBtn = document.getElementById('nudge-btn');
  if (difference !== 0) {
    nudgeBtn.classList.remove('hidden');
  } else {
    nudgeBtn.classList.add('hidden');
  }

  // Render Yati Shape visualizer
  renderYatiVisualizer(lineSums);
  
  // Pre-flatten the events for audio player
  flattenPlaybackEvents();
}

// REDESIGN ASSISTANT SUGGESTIONS
function showSuggestion(diff, total, target) {
  const box = document.getElementById('redesign-suggestion-box');
  const text = document.getElementById('suggestion-text');
  const applyBtn = document.getElementById('apply-suggestion-btn');
  
  box.classList.remove('hidden');
  applyBtn.classList.remove('hidden');
  
  const numLines = state.lines.length;
  
  if (diff > 0) {
    // Deficit: We need to add matras
    if (numLines === 3) {
      if (diff === 4) {
        text.textContent = `💡 Add 2 matras (karvais) to the end of the first two lines/repetitions. (e.g. append ", 2" to first two lines). Line 3 remains unchanged.`;
        applyBtn.dataset.strategy = 'adi-4';
      } else if (diff === 2) {
        text.textContent = `💡 Add 1 matra (karvai) to the end of the first two lines/repetitions. (e.g. append ", 1" to first two lines).`;
        applyBtn.dataset.strategy = 'adi-2';
      } else if (diff % 3 === 0) {
        const perLine = diff / 3;
        text.textContent = `💡 Distribute evenly: Add a gap of ${perLine} matra(s) to the end of all three lines. (e.g. append ", ${perLine}" to all lines).`;
        applyBtn.dataset.strategy = `even-all-${perLine}`;
      } else {
        text.textContent = `💡 Add a gap of ${diff} matras to the end of the last line to reach ${target} matras.`;
        applyBtn.dataset.strategy = `append-last-${diff}`;
      }
    } else {
      if (diff % numLines === 0) {
        const perLine = diff / numLines;
        text.textContent = `💡 Distribute evenly: Add a gap of ${perLine} matras to the end of each line.`;
        applyBtn.dataset.strategy = `even-all-${perLine}`;
      } else {
        text.textContent = `💡 Add a gap of ${diff} matras to the end of the last line.`;
        applyBtn.dataset.strategy = `append-last-${diff}`;
      }
    }
  } else {
    // Surplus: We need to reduce matras
    const surplus = Math.abs(diff);
    text.textContent = `⚠️ The composition is too long by ${surplus} matras. You can shorten phrases or remove gaps/karvais from the end.`;
    applyBtn.classList.add('hidden'); // Cannot easily auto-truncate safely, user must adjust
  }
}

function hideSuggestion() {
  document.getElementById('redesign-suggestion-box').classList.add('hidden');
}

// APPLY SUGGESTION LOGIC
function applyRedesignSuggestion(e) {
  const strategy = e.target.dataset.strategy;
  if (!strategy) return;
  
  if (strategy === 'adi-4') {
    state.lines[0].push(2);
    state.lines[1].push(2);
  } else if (strategy === 'adi-2') {
    state.lines[0].push(1);
    state.lines[1].push(1);
  } else if (strategy.startsWith('even-all-')) {
    const val = parseInt(strategy.split('-')[2]);
    state.lines.forEach(line => line.push(val));
  } else if (strategy.startsWith('append-last-')) {
    const val = parseInt(strategy.split('-')[2]);
    state.lines[state.lines.length - 1].push(val);
  }
  
  // Re-sync UI inputs and values
  renderEditorLines();
  updateCalculations();
}

// YATI SHAPE VISUALIZER
function renderYatiVisualizer(lineSums) {
  const svg = document.getElementById('yati-svg');
  svg.innerHTML = '';
  
  if (lineSums.length === 0) return;
  
  // Define Gradient
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="var(--accent-indigo)" />
      <stop offset="100%" stop-color="var(--accent-blue)" />
    </linearGradient>
  `;
  svg.appendChild(defs);
  
  const maxVal = Math.max(...lineSums, 1);
  const minVal = Math.min(...lineSums);
  const numLines = lineSums.length;
  
  const svgWidth = 400;
  const svgHeight = 200;
  const maxBarWidth = 280;
  
  // Draw centerline
  const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  centerLine.setAttribute('x1', svgWidth / 2);
  centerLine.setAttribute('y1', 10);
  centerLine.setAttribute('x2', svgWidth / 2);
  centerLine.setAttribute('y2', svgHeight - 10);
  centerLine.setAttribute('class', 'yati-svg-line');
  svg.appendChild(centerLine);
  
  // Calculate vertical positions
  lineSums.forEach((sum, idx) => {
    // Width proportional to sum
    const width = (sum / maxVal) * maxBarWidth;
    // Center alignment coordinates
    const x = (svgWidth - width) / 2;
    // Distribute y coordinates evenly
    let y = 30;
    if (numLines > 1) {
      y = 30 + (idx * (svgHeight - 70) / (numLines - 1));
    } else {
      y = (svgHeight - 30) / 2;
    }
    
    // Draw Bar
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', 24);
    rect.setAttribute('rx', 6);
    rect.setAttribute('ry', 6);
    rect.setAttribute('class', 'yati-svg-bar');
    svg.appendChild(rect);
    
    // Draw Text overlay
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', svgWidth / 2);
    text.setAttribute('y', y + 17);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '12px');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'var(--font-mono)');
    text.textContent = `${sum} matras`;
    svg.appendChild(text);
  });
  
  // Classify Yati Shape
  classifyYati(lineSums);
}

function classifyYati(lineSums) {
  const shapeNameEl = document.getElementById('yati-shape-name');
  const shapeDescEl = document.getElementById('yati-shape-desc');
  
  if (lineSums.length < 2) {
    // Fallback classification on phrases within the first line if single line editor
    const firstLine = state.lines[0] || [];
    if (firstLine.length >= 3) {
      classifyPhrasesYati(firstLine, shapeNameEl, shapeDescEl);
    } else {
      shapeNameEl.textContent = 'Single Sequence';
      shapeDescEl.textContent = 'Too few elements to determine rhythmic yati shape.';
    }
    return;
  }
  
  const isSama = lineSums.every(val => val === lineSums[0]);
  
  let isIncreasing = true;
  let isDecreasing = true;
  
  for (let i = 1; i < lineSums.length; i++) {
    if (lineSums[i] <= lineSums[i - 1]) isIncreasing = false;
    if (lineSums[i] >= lineSums[i - 1]) isDecreasing = false;
  }
  
  // mrindangam: narrow ends, wide center
  // damaruka: wide ends, narrow center
  let isMridangam = false;
  let isDamaruka = false;
  if (lineSums.length === 3) {
    if (lineSums[0] < lineSums[1] && lineSums[2] < lineSums[1]) isMridangam = true;
    if (lineSums[0] > lineSums[1] && lineSums[2] > lineSums[1]) isDamaruka = true;
  }
  
  if (isSama) {
    shapeNameEl.textContent = 'Sama Yati (Symmetrical Block)';
    shapeDescEl.textContent = 'All repetitions/lines are of equal duration. Represents steady flow, equilibrium, and solid structure.';
  } else if (isIncreasing) {
    shapeNameEl.textContent = 'Srotovaha Yati (Increasing River)';
    shapeDescEl.textContent = 'Each line systematically grows longer, mimicking a river widening as it flows. Represents build-up of tension and climax.';
  } else if (isDecreasing) {
    shapeNameEl.textContent = 'Gopuccha Yati (Tapering Tail)';
    shapeDescEl.textContent = 'Lines reduce in length, resembling the tapering tail of a cow. Creates an effect of structural condensation and rapid resolution.';
  } else if (isMridangam) {
    shapeNameEl.textContent = 'Mridangam Yati (Double-conical)';
    shapeDescEl.textContent = 'Starts narrow, expands in the middle line, and resolves narrow at the end. Mirrors the shape of the mridangam drum.';
  } else if (isDamaruka) {
    shapeNameEl.textContent = 'Damaruka Yati (Hourglass)';
    shapeDescEl.textContent = 'Starts wide, tapers in the middle line, and widens again. Shapes like Shiva\'s damaruka drum.';
  } else {
    shapeNameEl.textContent = 'Misra Yati (Mixed Structures)';
    shapeDescEl.textContent = 'Complex transitions across repetitions. Combines elements of growth, contraction, or asymmetrical pacing.';
  }
}

function classifyPhrasesYati(phrases, nameEl, descEl) {
  // Filter out gaps (1s) to analyze the actual phrases
  const actualPhrases = phrases.filter(x => x !== 1);
  if (actualPhrases.length < 2) {
    nameEl.textContent = 'Simple Sequence';
    descEl.textContent = 'No clear yati shape detected in phrases.';
    return;
  }
  
  const isSama = actualPhrases.every(val => val === actualPhrases[0]);
  let isInc = true;
  let isDec = true;
  for (let i = 1; i < actualPhrases.length; i++) {
    if (actualPhrases[i] <= actualPhrases[i-1]) isInc = false;
    if (actualPhrases[i] >= actualPhrases[i-1]) isDec = false;
  }
  
  if (isSama) {
    nameEl.textContent = 'Sama Yati phrases';
    descEl.textContent = 'Phrases inside the line are uniform (e.g. 6-6-6).';
  } else if (isInc) {
    nameEl.textContent = 'Srotovaha Yati phrases';
    descEl.textContent = 'Phrases increase inside the line (e.g. 5-6-7).';
  } else if (isDec) {
    nameEl.textContent = 'Gopuccha Yati phrases';
    descEl.textContent = 'Phrases decrease/taper inside the line (e.g. 7-6-5).';
  } else {
    nameEl.textContent = 'Misra Yati phrases';
    descEl.textContent = 'Varying phrase lengths within the same line.';
  }
}

// PRE-FLATTEN THE ENTIRE KORVAI SEQUENCE FOR AUDIO PLAYBACK
function flattenPlaybackEvents() {
  state.flatKorvaiEvents = [];
  const activeDict = state.renderStyle === 'notation' ? state.notationDict : state.syllabicDict;
  
  let globalMatraIndex = 0;
  
  state.lines.forEach((lineNumbers, lineIndex) => {
    lineNumbers.forEach((num) => {
      const phraseText = activeDict[num] || '';
      
      if (state.renderStyle === 'notation') {
        let i = 0;
        const text = phraseText;
        const reverseMap = {
          't': 'taam', 'k': 'kaam', 'd': 'dheem', 'm': 'meem', 'g': 'geem',
          'n': 'naam', 'r': 'reem', 'l': 'laam', 'j': 'jheem', 'c': 'chaam'
        };
        const shortMap = {
          't': 'ta', 'k': 'ka', 'd': 'dhi', 'm': 'mi', 'g': 'gin',
          'n': 'nam', 'r': 'ri', 'l': 'la', 'j': 'jham', 'c': 'cha'
        };
        
        while (i < text.length) {
          const char = text[i].toLowerCase();
          
          if (char === ' ') {
            i++;
            continue;
          }
          
          if (char === ';') {
            state.flatKorvaiEvents.push({
              type: 'gap',
              syllable: ';',
              lineIndex: lineIndex,
              globalIndex: globalMatraIndex
            });
            globalMatraIndex++;
            state.flatKorvaiEvents.push({
              type: 'continuation',
              syllable: ';',
              lineIndex: lineIndex,
              globalIndex: globalMatraIndex
            });
            globalMatraIndex++;
            i++;
          } else if (char === ',') {
            state.flatKorvaiEvents.push({
              type: 'gap',
              syllable: ',',
              lineIndex: lineIndex,
              globalIndex: globalMatraIndex
            });
            globalMatraIndex++;
            i++;
          } else if (shortMap[char]) {
            if (i + 1 < text.length && text[i + 1] === ',') {
              state.flatKorvaiEvents.push({
                type: 'stroke',
                syllable: reverseMap[char],
                lineIndex: lineIndex,
                globalIndex: globalMatraIndex
              });
              globalMatraIndex++;
              state.flatKorvaiEvents.push({
                type: 'continuation',
                syllable: ',',
                lineIndex: lineIndex,
                globalIndex: globalMatraIndex
              });
              globalMatraIndex++;
              i += 2;
            } else {
              state.flatKorvaiEvents.push({
                type: 'stroke',
                syllable: shortMap[char],
                lineIndex: lineIndex,
                globalIndex: globalMatraIndex
              });
              globalMatraIndex++;
              i++;
            }
          } else {
            i++;
          }
        }
      } else {
        const spaced = phraseText.replace(/-/g, ' ').replace(/,/g, ' , ').replace(/;/g, ' ; ');
        const items = spaced.split(/\s+/).filter(Boolean);
        items.forEach((item) => {
          if (item === ';') {
            state.flatKorvaiEvents.push({
              type: 'gap',
              syllable: ';',
              lineIndex: lineIndex,
              globalIndex: globalMatraIndex
            });
            globalMatraIndex++;
            state.flatKorvaiEvents.push({
              type: 'continuation',
              syllable: ';',
              lineIndex: lineIndex,
              globalIndex: globalMatraIndex
            });
            globalMatraIndex++;
          } else {
            const isGap = (item === ',');
            state.flatKorvaiEvents.push({
              type: isGap ? 'gap' : 'stroke',
              syllable: item,
              lineIndex: lineIndex,
              globalIndex: globalMatraIndex
            });
            globalMatraIndex++;
          }
        });
      }
    });
  });
}

// AUDIO SYNTH ENGINE (WEB AUDIO API)
function initAudio() {
  if (!state.audioCtx) {
    state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function startPlayback() {
  initAudio();
  
  if (state.metronomeActive) {
    // If background metronome is running, align start to the next Samam
    state.playTriggered = true;
    const playBtn = document.getElementById('play-btn');
    playBtn.innerHTML = '<span class="play-icon">⏳</span> Waiting...';
  } else {
    // Start playback immediately
    state.isPlaying = true;
    state.currentMatraInKorvai = 0;
    state.metronomeStep = 0;
    state.nextMatraTime = state.audioCtx.currentTime + 0.1;
    
    const playBtn = document.getElementById('play-btn');
    playBtn.classList.add('playing');
    playBtn.innerHTML = '<span class="play-icon">■</span> Stop Playback';
    
    schedulerLoop();
  }
}

function stopPlayback() {
  state.isPlaying = false;
  state.playTriggered = false;
  
  const playBtn = document.getElementById('play-btn');
  playBtn.classList.remove('playing');
  playBtn.innerHTML = '<span class="play-icon">▶</span> Play Korvai';
  
  if (!state.metronomeActive) {
    clearTimeout(state.schedulerTimerId);
    state.schedulerTimerId = null;
    clearVisualHighlights();
  } else {
    // Keep metronome highlights going, just clear play highlights
    document.querySelectorAll('.editor-line-row').forEach(row => {
      row.classList.remove('playing-line');
    });
    document.querySelectorAll('.solkattu-display-value span').forEach(span => {
      span.classList.remove('highlight-syllable');
    });
  }
}

function schedulerLoop() {
  if (!state.isPlaying && !state.metronomeActive && !state.playTriggered) {
    clearTimeout(state.schedulerTimerId);
    state.schedulerTimerId = null;
    return;
  }
  
  // Schedule any notes falling in the lookahead window
  while (state.nextMatraTime < state.audioCtx.currentTime + 0.1) {
    scheduleNextSubdivision(state.nextMatraTime);
    
    // Calculate durations
    const secondsPerBeat = 60.0 / state.bpm;
    const matraDuration = secondsPerBeat / state.gati;
    
    state.nextMatraTime += matraDuration;
  }
  
  // Schedule next iteration
  state.schedulerTimerId = setTimeout(schedulerLoop, 25.0);
}

// SCHEDULE A SINGLE SUBDIVISION (Metronome click + Drum stroke)
function scheduleNextSubdivision(time) {
  if (state.metronomeStep === undefined) {
    state.metronomeStep = 0;
  }

  // Tala cycle length in matras
  const cycleMatras = state.beats * state.gati;
  const talaMatraIndex = state.metronomeStep % cycleMatras;
  const isMainBeat = (talaMatraIndex % state.gati === 0);
  const beatNumber = Math.floor(talaMatraIndex / state.gati);
  
  // Handle start alignment
  if (isMainBeat && beatNumber === 0 && state.playTriggered) {
    state.isPlaying = true;
    state.playTriggered = false;
    state.currentMatraInKorvai = 0;
    
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.classList.add('playing');
      playBtn.innerHTML = '<span class="play-icon">■</span> Stop Playback';
    }
  }

  // 1. Play Standalone Metronome if active
  if (state.metronomeActive) {
    if (isMainBeat) {
      const isSamam = (beatNumber === 0);
      playMetronomeClick(time, isSamam, state.metronomeSound);
    } else if (state.metronomeSubdivisions) {
      playSubdivisionTick(time);
    }
    
    // Trigger visual highlights even if no Korvai is playing
    if (!state.isPlaying) {
      scheduleVisualMetronomeOnly(beatNumber, isMainBeat, time);
    }
  } else {
    // If metronome is not standalone active, conformed metronome plays conformed to Korvai
    if (state.isPlaying && isMainBeat) {
      const isSamam = (beatNumber === 0);
      playMetronomeClick(time, isSamam, 'woodblock');
    }
  }

  // 2. Play Korvai Stroke
  if (state.isPlaying) {
    const event = state.flatKorvaiEvents[state.currentMatraInKorvai];
    if (event) {
      if (event.type === 'stroke') {
        playMridangamStroke(time, event.syllable);
      } else if (event.type === 'gap' && state.playGapsTick) {
        playGapTick(time);
      }
      
      // Visual feedback highlighting
      scheduleVisualUpdate(event, beatNumber, isMainBeat, time);
      
      state.currentMatraInKorvai++;
      if (state.currentMatraInKorvai >= state.flatKorvaiEvents.length) {
        if (state.loop) {
          state.currentMatraInKorvai = 0;
        } else {
          // Finish play
          state.isPlaying = false;
          const finishTime = time;
          setTimeout(() => {
            if (!state.isPlaying) {
              const playBtn = document.getElementById('play-btn');
              if (playBtn) {
                playBtn.classList.remove('playing');
                playBtn.innerHTML = '<span class="play-icon">▶</span> Play Korvai';
              }
              if (!state.metronomeActive) {
                clearVisualHighlights();
              } else {
                document.querySelectorAll('.editor-line-row').forEach(row => {
                  row.classList.remove('playing-line');
                });
                document.querySelectorAll('.solkattu-display-value span').forEach(span => {
                  span.classList.remove('highlight-syllable');
                });
              }
            }
          }, (finishTime - state.audioCtx.currentTime) * 1000);
        }
      }
    }
  }

  state.metronomeStep++;
}

// STANDALONE METRONOME PLAYBACK FUNCTIONS
function startBackgroundMetronome() {
  initAudio();
  state.metronomeActive = true;
  
  const btn = document.getElementById('metronome-toggle-btn');
  btn.classList.add('active-metro');
  btn.innerHTML = `<span id="metronome-toggle-icon">■</span> Stop Background Metronome`;
  
  if (!state.schedulerTimerId) {
    state.metronomeStep = 0;
    state.nextMatraTime = state.audioCtx.currentTime + 0.1;
    schedulerLoop();
  }
}

function stopBackgroundMetronome() {
  state.metronomeActive = false;
  
  const btn = document.getElementById('metronome-toggle-btn');
  btn.classList.remove('active-metro');
  btn.innerHTML = `<span id="metronome-toggle-icon">📢</span> Start Background Metronome`;
  
  if (!state.isPlaying && !state.playTriggered) {
    clearTimeout(state.schedulerTimerId);
    state.schedulerTimerId = null;
    clearVisualHighlights();
  }
}

// METRONOME VISUAL TRACKING
function scheduleVisualMetronomeOnly(beatNumber, isMainBeat, time) {
  const delay = (time - state.audioCtx.currentTime) * 1000;
  setTimeout(() => {
    if (!state.metronomeActive || state.isPlaying) return;
    
    if (isMainBeat) {
      document.querySelectorAll('.beat-node').forEach(node => {
        node.classList.remove('active-beat');
      });
      const activeBeatNode = document.getElementById(`beat-node-${beatNumber}`);
      if (activeBeatNode) {
        activeBeatNode.classList.add('active-beat');
      }
      document.getElementById('metronome-counter').textContent = `Beat: ${beatNumber + 1} / ${state.beats}`;
    }
  }, delay);
}

// AUDIO SYNTH: Metronome beats
function playMetronomeClick(time, isSamam, soundPreset) {
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  let freq = 800;
  let duration = 0.04;
  let volume = 0.25;
  
  if (soundPreset === 'woodblock') {
    freq = isSamam ? 1000 : 850;
    duration = 0.03;
    volume = isSamam ? 0.35 : 0.25;
    
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.start(time);
    osc.stop(time + duration);
    
    if (isSamam) {
      const thump = state.audioCtx.createOscillator();
      const thumpGain = state.audioCtx.createGain();
      thump.connect(thumpGain);
      thumpGain.connect(state.audioCtx.destination);
      thump.frequency.setValueAtTime(120, time);
      thump.frequency.linearRampToValueAtTime(70, time + 0.06);
      thumpGain.gain.setValueAtTime(0.4, time);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      thump.start(time);
      thump.stop(time + 0.07);
    }
  } else if (soundPreset === 'bell') {
    freq = isSamam ? 1600 : 1300;
    duration = 0.15;
    volume = isSamam ? 0.25 : 0.15;
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    const ringOsc = state.audioCtx.createOscillator();
    const ringGain = state.audioCtx.createGain();
    ringOsc.connect(ringGain);
    ringGain.connect(state.audioCtx.destination);
    ringOsc.frequency.setValueAtTime(freq * 2, time);
    ringGain.gain.setValueAtTime(volume * 0.5, time);
    ringGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    ringOsc.start(time);
    ringOsc.stop(time + duration);
    
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.start(time);
    osc.stop(time + duration);
  } else if (soundPreset === 'mridangam') {
    if (isSamam) {
      freq = 190;
      duration = 0.15;
      volume = 0.45;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(110, time + duration);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    } else {
      freq = 600;
      duration = 0.04;
      volume = 0.3;
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(300, time + duration);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    }
  } else {
    freq = isSamam ? 1000 : 800;
    duration = 0.05;
    volume = 0.15;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.setValueAtTime(volume, time + duration - 0.01);
    gain.gain.linearRampToValueAtTime(0.001, time + duration);
    osc.start(time);
    osc.stop(time + duration);
  }
}

// AUDIO SYNTH: Subdivision tick
function playSubdivisionTick(time) {
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  osc.frequency.setValueAtTime(1500, time);
  gain.gain.setValueAtTime(0.03, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
  
  osc.start(time);
  osc.stop(time + 0.02);
}

// SYMMETRIC NUDGE AUTOMATION
function symmetricNudge() {
  const targetMatras = (state.beats * state.gati * state.cycles) + state.offset;
  let totalKorvaiMatras = state.lines.reduce((sum, line) => sum + line.reduce((a, b) => a + b, 0), 0);
  let diff = targetMatras - totalKorvaiMatras;
  
  if (diff === 0) return;
  
  const numLines = state.lines.length;
  
  if (numLines === 1) {
    // Single line editor: nudge that line directly
    state.lines[0] = nudgeLineSymmetrically(state.lines[0], diff);
  } else {
    // Multi-line editor: distribute adjustments symmetrically across lines
    const lineAdjustments = distributeSymmetrically(numLines, diff);
    
    // Nudge each line internally by its assigned adjustment
    state.lines = state.lines.map((line, idx) => {
      const lineAdj = lineAdjustments[idx];
      return nudgeLineSymmetrically(line, lineAdj);
    });
  }
  
  // Re-sync UI inputs and values
  renderEditorLines();
  updateCalculations();
}

// SYMMETRIC DISTRIBUTION ALGORITHM
function distributeSymmetrically(numElements, totalDiff) {
  const arr = new Array(numElements).fill(0);
  let d = totalDiff;
  const K = numElements;
  const mid = Math.floor(K / 2);
  
  const step = d > 0 ? 1 : -1;
  const absD = Math.abs(d);
  let currentAbsD = 0;
  
  // 1. Evenly distribute full cycles
  const fullCycles = Math.floor(absD / K);
  if (fullCycles > 0) {
    for (let i = 0; i < K; i++) {
      arr[i] = fullCycles * step;
    }
    currentAbsD = fullCycles * K;
  }
  
  // 2. Distribute the remainder symmetrically
  let rem = absD - currentAbsD;
  if (rem > 0) {
    // If remainder is odd and K is odd, add/sub to center first
    if (rem % 2 !== 0 && K % 2 !== 0) {
      arr[mid] += step;
      rem -= 1;
    }
    
    // Distribute remaining even amount symmetrically outwards from center
    let offset = 1;
    while (rem >= 2) {
      const leftIdx = mid - offset;
      const rightIdx = mid + offset;
      
      if (leftIdx >= 0 && rightIdx < K) {
        arr[leftIdx] += step;
        arr[rightIdx] += step;
        rem -= 2;
        offset++;
      } else {
        // Reset offset if we reached boundary but still have remainder
        offset = 1;
      }
    }
    
    // Leftover odd remainder (can happen with even K)
    if (rem > 0) {
      if (K % 2 === 0) {
        arr[mid - 1] += step;
      } else {
        arr[mid] += step;
      }
    }
  }
  
  return arr;
}

// NUDGE A SINGLE LINE SYMMETRICALLY
function nudgeLineSymmetrically(line, diff) {
  const arr = [...line];
  let d = diff;
  if (d === 0) return arr;
  
  const K = arr.length;
  const mid = Math.floor(K / 2);
  
  if (d > 0) {
    // Addition: distribute and add to array elements
    const adjs = distributeSymmetrically(K, d);
    for (let i = 0; i < K; i++) {
      arr[i] += adjs[i];
    }
  } else {
    // Safe subtraction: decrement symmetrically while guarding against values < 1
    let rem = Math.abs(d);
    
    while (rem > 0) {
      let decreased = false;
      
      // Try center first if rem is odd
      if (rem % 2 !== 0 && K % 2 !== 0) {
        if (arr[mid] > 1) {
          arr[mid] -= 1;
          rem -= 1;
          decreased = true;
        }
      }
      
      // Try to find a symmetric pair to decrement
      if (rem >= 2) {
        for (let offset = 1; offset <= mid; offset++) {
          const leftIdx = mid - offset;
          const rightIdx = mid + offset;
          if (leftIdx >= 0 && rightIdx < K) {
            if (arr[leftIdx] > 1 && arr[rightIdx] > 1) {
              arr[leftIdx] -= 1;
              arr[rightIdx] -= 1;
              rem -= 2;
              decreased = true;
              break;
            }
          }
        }
      }
      
      // Fallback: decrease first available element > 1
      if (!decreased) {
        for (let i = 0; i < K; i++) {
          if (arr[i] > 1) {
            arr[i] -= 1;
            rem -= 1;
            decreased = true;
            break;
          }
        }
        if (!decreased) {
          // Everything is 1, cannot decrease further
          break;
        }
      }
    }
  }
  return arr;
}

// AUDIO SYNTH: Mridangam hit
function playMridangamStroke(time, syllable) {
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  const cleanSyl = syllable.toLowerCase().trim();
  
  let startFreq = 380;
  let endFreq = 180;
  let duration = 0.08;
  let volume = 0.5;
  
  const trebleLong = ['taam', 'thaam', 'thoom', 'toom', 'jhem', 'jem'];
  const bassLong = ['dheem', 'naam', 'daam', 'deem'];
  
  if (trebleLong.includes(cleanSyl)) {
    // Long open treble stroke
    startFreq = 440;
    endFreq = 440;
    duration = 0.35;
    volume = 0.45;
    
    const ringOsc = state.audioCtx.createOscillator();
    const ringGain = state.audioCtx.createGain();
    ringOsc.connect(ringGain);
    ringGain.connect(state.audioCtx.destination);
    ringOsc.frequency.setValueAtTime(880, time);
    ringGain.gain.setValueAtTime(0.15, time);
    ringGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    ringOsc.start(time);
    ringOsc.stop(time + 0.15);
  } else if (bassLong.includes(cleanSyl)) {
    // Long open bass stroke
    startFreq = 160;
    endFreq = 110;
    duration = 0.4;
    volume = 0.6;
    
    const subOsc = state.audioCtx.createOscillator();
    const subGain = state.audioCtx.createGain();
    subOsc.connect(subGain);
    subGain.connect(state.audioCtx.destination);
    subOsc.frequency.setValueAtTime(80, time);
    subOsc.frequency.exponentialRampToValueAtTime(55, time + 0.35);
    subGain.gain.setValueAtTime(0.4, time);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    subOsc.start(time);
    subOsc.stop(time + 0.4);
  } else if (['t', 'ta', 'tha', 'te'].includes(cleanSyl)) {
    startFreq = 650;
    endFreq = 350;
    duration = 0.05;
    volume = 0.45;
  } else if (['k', 'ki', 'ka', 'ke'].includes(cleanSyl)) {
    startFreq = 480;
    endFreq = 260;
    duration = 0.04;
    volume = 0.35;
  } else if (['d', 'dhi', 'g', 'n', 'na', 'mi', 'num'].includes(cleanSyl)) {
    startFreq = 190;
    endFreq = 120;
    duration = 0.14;
    volume = 0.6;
    
    const subOsc = state.audioCtx.createOscillator();
    const subGain = state.audioCtx.createGain();
    subOsc.connect(subGain);
    subGain.connect(state.audioCtx.destination);
    
    subOsc.frequency.setValueAtTime(95, time);
    subOsc.frequency.exponentialRampToValueAtTime(60, time + 0.12);
    
    subGain.gain.setValueAtTime(0.4, time);
    subGain.gain.linearRampToValueAtTime(0.01, time + 0.12);
    
    subOsc.start(time);
    subOsc.stop(time + 0.13);
  }
  
  osc.frequency.setValueAtTime(startFreq, time);
  osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration - 0.01);
  
  gain.gain.setValueAtTime(volume, time);
  gain.gain.linearRampToValueAtTime(0.001, time + duration);
  
  osc.start(time);
  osc.stop(time + duration);
}

// AUDIO SYNTH: Soft click on gaps
function playGapTick(time) {
  const osc = state.audioCtx.createOscillator();
  const gain = state.audioCtx.createGain();
  osc.connect(gain);
  gain.connect(state.audioCtx.destination);
  
  osc.frequency.setValueAtTime(1800, time);
  gain.gain.setValueAtTime(0.04, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
  
  osc.start(time);
  osc.stop(time + 0.02);
}

// VISUAL TIMING ANIMATIONS
function scheduleVisualUpdate(event, beatNumber, isMainBeat, time) {
  const delay = (time - state.audioCtx.currentTime) * 1000;
  
  setTimeout(() => {
    if (!state.isPlaying) return;
    
    document.querySelectorAll('.editor-line-row').forEach((row, i) => {
      if (i === event.lineIndex) {
        row.classList.add('playing-line');
      } else {
        row.classList.remove('playing-line');
      }
    });
    
    document.querySelectorAll('.solkattu-display-value span').forEach(span => {
      span.classList.remove('highlight-syllable');
    });
    const activeSpan = document.getElementById(`syllable-global-${event.globalIndex}`);
    if (activeSpan) {
      activeSpan.classList.add('highlight-syllable');
      activeSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
    
    if (isMainBeat) {
      document.querySelectorAll('.beat-node').forEach(node => {
        node.classList.remove('active-beat');
      });
      const activeBeatNode = document.getElementById(`beat-node-${beatNumber}`);
      if (activeBeatNode) {
        activeBeatNode.classList.add('active-beat');
      }
      document.getElementById('metronome-counter').textContent = `Beat: ${beatNumber + 1} / ${state.beats}`;
    }
  }, delay);
}

// CLEAR HIGHLIGHTS
function clearVisualHighlights() {
  document.querySelectorAll('.editor-line-row').forEach(row => {
    row.classList.remove('playing-line');
  });
  document.querySelectorAll('.solkattu-display-value span').forEach(span => {
    span.classList.remove('highlight-syllable');
  });
  document.querySelectorAll('.beat-node').forEach(node => {
    node.classList.remove('active-beat');
  });
  document.getElementById('metronome-counter').textContent = 'Beat: -';
}

// LOAD SPREADSHEET PRESET LESSONS
function loadPreset(presetId) {
  const preset = presets[presetId];
  if (!preset) return;
  
  const select = document.getElementById('tala-select');
  select.value = preset.tala;
  state.talaPreset = preset.tala;
  
  if (preset.tala === 'custom') {
    document.getElementById('custom-tala-fields').classList.remove('hidden');
    document.getElementById('custom-beats').value = preset.beats;
    document.getElementById('custom-gati').value = preset.gati;
  } else {
    document.getElementById('custom-tala-fields').classList.add('hidden');
  }
  
  state.beats = preset.beats;
  state.gati = preset.gati;
  state.cycles = preset.cycles;
  state.offset = preset.offset;
  
  document.getElementById('target-cycles').value = preset.cycles;
  document.getElementById('target-offset').value = preset.offset;
  
  state.lines = JSON.parse(JSON.stringify(preset.lines));
  
  stopPlayback();
  
  calculateTalaTarget();
  renderEditorLines();
  updateCalculations();
}

