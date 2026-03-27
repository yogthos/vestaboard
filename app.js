// ── Vestaboard Retro Terminal ──
// 6 rows × 22 columns split-flap display

const ROWS = 6;
const COLS = 22;

// Characters the flap cycles through (in order)
const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:\'"%,./?°';

// ── Board State ──

const board = document.getElementById('board');
let cells = []; // 2D array of DOM elements
let currentChars = []; // 2D array of current characters
let activeModule = 'clock';
let cycleTimer = null;
let moduleIndex = 0;

function initBoard() {
  board.innerHTML = '';
  cells = [];
  currentChars = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    const charRow = [];
    for (let c = 0; c < COLS; c++) {
      const flap = document.createElement('div');
      flap.className = 'flap';
      const inner = document.createElement('div');
      inner.className = 'flap-inner';
      inner.textContent = ' ';
      flap.appendChild(inner);
      board.appendChild(flap);
      row.push(flap);
      charRow.push(' ');
    }
    cells.push(row);
    currentChars.push(charRow);
  }
}

// ── Split-Flap Animation Engine ──

function setChar(row, col, targetChar, delay) {
  return new Promise(resolve => {
    setTimeout(() => {
      const flap = cells[row][col];
      const inner = flap.querySelector('.flap-inner');
      const current = currentChars[row][col];
      const target = (targetChar || ' ').toUpperCase();

      if (current === target) {
        resolve();
        return;
      }

      // Clear any color classes
      flap.className = 'flap';

      // Check if target is a color token
      const colorMatch = target.match(/^\{(\w+)\}$/);
      if (colorMatch) {
        flap.classList.add(`color-${colorMatch[1]}`);
        inner.textContent = ' ';
        currentChars[row][col] = target;
        resolve();
        return;
      }

      // Flip through intermediate characters for realism
      const currentIdx = FLAP_CHARS.indexOf(current);
      const targetIdx = FLAP_CHARS.indexOf(target);

      if (targetIdx === -1) {
        inner.textContent = target;
        currentChars[row][col] = target;
        resolve();
        return;
      }

      // Determine flip steps (always flip forward)
      const steps = currentIdx <= targetIdx
        ? targetIdx - currentIdx
        : FLAP_CHARS.length - currentIdx + targetIdx;

      const totalSteps = Math.min(steps, 8); // Cap intermediate flips
      let step = 0;

      function flipNext() {
        if (step >= totalSteps) {
          inner.textContent = target;
          currentChars[row][col] = target;
          flap.classList.remove('flipping');
          resolve();
          return;
        }

        const intermediateIdx = (currentIdx + Math.round((step / totalSteps) * steps)) % FLAP_CHARS.length;
        inner.textContent = FLAP_CHARS[intermediateIdx];
        flap.classList.add('flipping');

        step++;
        setTimeout(() => {
          flap.classList.remove('flipping');
          setTimeout(flipNext, 30);
        }, 60);
      }

      flipNext();
    }, delay);
  });
}

function setBoard(lines, colors) {
  // lines: array of strings (up to 6), each up to 22 chars
  // colors: optional 2D array of color names (null = default)
  const promises = [];
  for (let r = 0; r < ROWS; r++) {
    const line = (lines[r] || '').padEnd(COLS).substring(0, COLS).toUpperCase();
    for (let c = 0; c < COLS; c++) {
      const delay = (r * COLS + c) * 15 + Math.random() * 40;
      const char = line[c];

      // Apply color if provided
      if (colors && colors[r] && colors[r][c]) {
        cells[r][c].className = `flap color-${colors[r][c]}`;
      }

      promises.push(setChar(r, c, char, delay));
    }
  }
  return Promise.all(promises);
}

function clearBoard() {
  const emptyLines = Array(ROWS).fill(''.padEnd(COLS));
  return setBoard(emptyLines);
}

// ── Content Modules ──

const modules = {
  clock: {
    interval: 1000,
    render() {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const secs = now.getSeconds().toString().padStart(2, '0');

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
        'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const date = now.getDate();
      const year = now.getFullYear();

      const time = `${hours}:${mins}:${secs}`;
      const dateLine = `${monthName} ${date}, ${year}`;

      return [
        center(''),
        center(dayName),
        center(''),
        center(time),
        center(''),
        center(dateLine),
      ];
    }
  },

  quotes: {
    interval: 15000,
    index: 0,
    quotes: [
      { text: 'CAN A NATION BE FREE IF IT OPPRESSES OTHER NATIONS? IT CANNOT', author: 'VLADIMIR LENIN' },
      { text: 'SIMPLICITY IS THE ULTIMATE SOPHISTICATION', author: 'LEONARDO DA VINCI' },
      { text: 'REASON HAS ALWAYS EXISTED, BUT NOT ALWAYS IN A REASONABLE FORM', author: 'KARL MARX' },
      { text: 'HISTORICAL EXPERIENCE IS WRITTEN IN IRON AND BLOOD', author: 'MAO ZEDONG' },
      { text: 'IN THE MIDDLE OF DIFFICULTY LIES OPPORTUNITY', author: 'EINSTEIN' },
      { text: 'QUANTITY HAS A QUALITY ALL ITS OWN', author: 'JOSEF STALIN' },
      { text: 'LESS IS MORE', author: 'MIES VAN DER ROHE' },      
      { text: 'THE BEST WAY TO PREDICT THE FUTURE IS TO INVENT IT', author: 'ALAN KAY' },
    ],
    render() {
      const q = this.quotes[this.index % this.quotes.length];
      this.index++;
      const wrapped = wordWrap(q.text, COLS);
      // Reserve last row for author
      while (wrapped.length < ROWS - 1) wrapped.push('');
      wrapped.length = ROWS - 1; // Truncate if too long
      wrapped.push(padRight(`- ${q.author}`, COLS));
      return wrapped;
    }
  },

  weather: {
    interval: 10000,
    conditions: [
      { icon: '///', city: 'NEW YORK', temp: 42, cond: 'RAIN', hi: 45, lo: 38 },
      { icon: '***', city: 'LONDON', temp: 48, cond: 'OVERCAST', hi: 50, lo: 44 },
      { icon: ' O ', city: 'LOS ANGELES', temp: 72, cond: 'SUNNY', hi: 75, lo: 65 },
      { icon: '...', city: 'TOKYO', temp: 58, cond: 'FOGGY', hi: 62, lo: 54 },
      { icon: '+++', city: 'SYDNEY', temp: 80, cond: 'CLEAR', hi: 84, lo: 72 },
      { icon: '***', city: 'PARIS', temp: 52, cond: 'CLOUDY', hi: 55, lo: 48 },
    ],
    index: 0,
    render() {
      const w = this.conditions[this.index % this.conditions.length];
      this.index++;
      return [
        center('WEATHER REPORT'),
        center(`${w.icon}  ${w.city}  ${w.icon}`),
        center(''),
        center(`${w.temp}°F  ${w.cond}`),
        center(`HI ${w.hi}°  LO ${w.lo}°`),
        center(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()),
      ];
    }
  },

  stats: {
    interval: 5000,
    render() {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const dayOfYear = Math.floor((now - startOfYear) / 86400000) + 1;
      const daysInYear = ((now.getFullYear() % 4 === 0) ? 366 : 365);
      const pctYear = Math.floor((dayOfYear / daysInYear) * 100);
      const weekNum = Math.ceil(dayOfYear / 7);

      const uptime = formatUptime();

      return [
        center('SYSTEM STATS'),
        '',
        padBoth('YEAR PROGRESS', `${pctYear}%`),
        padBoth('DAY OF YEAR', `${dayOfYear}/${daysInYear}`),
        padBoth('WEEK', `${weekNum}/52`),
        padBoth('SESSION', uptime),
      ];
    }
  },

  custom: {
    interval: null,
    text: '',
    render() {
      if (!this.text) {
        return [
          center(''),
          center('TYPE A MESSAGE'),
          center('BELOW AND HIT'),
          center('SEND TO DISPLAY'),
          center('ON THE BOARD'),
          center(''),
        ];
      }
      const wrapped = wordWrap(this.text.toUpperCase(), COLS);
      // Center vertically
      while (wrapped.length < ROWS) {
        if (wrapped.length % 2 === 0) wrapped.unshift('');
        else wrapped.push('');
      }
      wrapped.length = ROWS;
      return wrapped.map(l => center(l.trim()));
    }
  }
};

// ── Helpers ──

function center(str) {
  const s = str.substring(0, COLS);
  const pad = Math.floor((COLS - s.length) / 2);
  return ' '.repeat(pad) + s + ' '.repeat(COLS - pad - s.length);
}

function padRight(str, len) {
  return str.substring(0, len).padEnd(len);
}

function padBoth(left, right) {
  const gap = COLS - left.length - right.length;
  if (gap < 1) return (left + ' ' + right).substring(0, COLS);
  return left + ' '.repeat(gap) + right;
}

function wordWrap(text, maxLen) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > maxLen) {
      lines.push(center(current));
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(center(current));
  return lines;
}

const sessionStart = Date.now();
function formatUptime() {
  const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── Module Controller ──

let moduleTimer = null;

function activateModule(name) {
  activeModule = name;
  const mod = modules[name];

  // Update button states
  document.querySelectorAll('.controls button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.module === name);
  });

  // Show/hide custom input
  document.getElementById('custom-input').classList.toggle('hidden', name !== 'custom');

  // Clear existing timer
  if (moduleTimer) {
    clearInterval(moduleTimer);
    moduleTimer = null;
  }

  // Render immediately
  renderModule();

  // Set up recurring render if module has an interval
  if (mod.interval) {
    moduleTimer = setInterval(renderModule, mod.interval);
  }
}

function renderModule() {
  const mod = modules[activeModule];
  const lines = mod.render();
  setBoard(lines);
}

// ── Auto-cycle through modules (except custom) ──

const autoCycleModules = ['clock', 'quotes', 'weather', 'stats'];
let autoCycleEnabled = false;
let autoCycleTimer = null;

function startAutoCycle() {
  autoCycleEnabled = true;
  autoCycleTimer = setInterval(() => {
    moduleIndex = (moduleIndex + 1) % autoCycleModules.length;
    activateModule(autoCycleModules[moduleIndex]);
  }, 20000);
}

function stopAutoCycle() {
  autoCycleEnabled = false;
  if (autoCycleTimer) {
    clearInterval(autoCycleTimer);
    autoCycleTimer = null;
  }
}

// ── Event Listeners ──

document.querySelectorAll('.controls button').forEach(btn => {
  btn.addEventListener('click', () => {
    stopAutoCycle(); // Manual selection stops auto-cycle
    activateModule(btn.dataset.module);
  });
});

document.getElementById('custom-send').addEventListener('click', () => {
  const input = document.getElementById('custom-text');
  modules.custom.text = input.value;
  renderModule();
});

document.getElementById('custom-text').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    modules.custom.text = e.target.value;
    renderModule();
  }
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const key = e.key;
  if (key === '1') activateModule('clock');
  if (key === '2') activateModule('quotes');
  if (key === '3') activateModule('weather');
  if (key === '4') activateModule('stats');
  if (key === '5') activateModule('custom');
});

// ── Boot Sequence ──

function boot() {
  initBoard();

  // Show boot animation
  const bootLines = [
    '  INITIALIZING . . .  ',
    '                      ',
    '  VESTABOARD TERMINAL ',
    '  REV 2.4   1987      ',
    '                      ',
    '  SYSTEM READY        ',
  ];

  setBoard(bootLines).then(() => {
    setTimeout(() => {
      activateModule('clock');
    }, 2000);
  });
}

boot();
