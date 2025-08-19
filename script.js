// --------- DOM --------
const $ = (sel) => document.querySelector(sel);
const stackEl  = $('#stack');
const traceEl  = $('#trace');
const resultEl = $('#result');

const runBtn   = $('#runBtn');
const pauseBtn = $('#pauseBtn');
const stepBtn  = $('#stepBtn');
const resetBtn = $('#resetBtn');

const inputN   = $('#inputN');
const speed    = $('#speed');
const speedOut = $('#speedOut');

// reflect speed value
speed.addEventListener('input', () => speedOut.textContent = `${speed.value}ms`);
speedOut.textContent = `${speed.value}ms`;

// --------- Execution Controller (auto/step & cancel) ---------
class Exec {
  constructor(ms) {
    this.ms = ms;
    this.autoplay = true;
    this._pendingStep = null;
    this._aborted = false;
  }
  setSpeed(ms) { this.ms = ms; }
  pause() { this.autoplay = false; }
  resume() { this.autoplay = true; this.step(); }
  step() {
    if (this._pendingStep) {
      const r = this._pendingStep;
      this._pendingStep = null;
      r();
    }
  }
  abort() { this._aborted = true; this.step(); }
  get aborted() { return this._aborted; }

  async tick() {
    if (this._aborted) throw new Error('aborted');
    if (this.autoplay) {
      await new Promise(r => setTimeout(r, this.ms));
    } else {
      await new Promise(r => (this._pendingStep = r));
    }
    if (this._aborted) throw new Error('aborted');
  }
}

// --------- UI helpers ---------
function clearUI() {
  stackEl.innerHTML = '';
  traceEl.innerHTML = '';
  resultEl.textContent = '';
}
function appendLog(text, kind = 'call') {
  const box = document.createElement('div');
  box.className = `box event-${kind === 'ret' ? 'ret' : 'call'}`;
  box.textContent = text;
  traceEl.appendChild(box);
  traceEl.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
}
function addFrame(n) {
  const el = document.createElement('div');
  el.className = 'frame pending';
  el.innerHTML = `<div class="title">factorial(${n})</div><div class="desc">호출 준비…</div>`;
  stackEl.appendChild(el);
  stackEl.firstElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return {
    setActive() {
      el.classList.remove('pending'); el.classList.add('active');
      el.querySelector('.desc').textContent = '실행 중…';
    },
    setReturning(text) {
      el.classList.remove('active'); el.classList.add('returning');
      el.querySelector('.desc').textContent = text;
    },
    setDone() { el.classList.add('done'); },
  };
}

// --------- Algorithm (actual recursion, but instrumented) ---------
async function factorial(n, exec, depth = 0) {
  const frame = addFrame(n);
  appendLog(`${'  '.repeat(depth)}호출: factorial(${n})`, 'call');
  await exec.tick();
  frame.setActive();

  if (n <= 1) {
    frame.setReturning('→ 1 반환');
    appendLog(`${'  '.repeat(depth)}반환: 1`, 'ret');
    await exec.tick();
    frame.setDone();
    return 1;
  }

  const sub = await factorial(n - 1, exec, depth + 1);
  await exec.tick();

  const total = n * sub;
  frame.setReturning(`→ ${n} * ${sub} = ${total}`);
  appendLog(`${'  '.repeat(depth)}반환: ${total}`, 'ret');
  await exec.tick();
  frame.setDone();
  return total;
}

// --------- Wiring ---------
let exec = null;

function setControlsRunning(isRunning) {
  runBtn.disabled   = isRunning;
  pauseBtn.disabled = !isRunning;
  stepBtn.disabled  = !isRunning;
  resetBtn.disabled = !isRunning;

  if (!isRunning) {
    pauseBtn.textContent = '일시정지';
  }
}

runBtn.addEventListener('click', async () => {
  const n = Math.max(0, Math.min(12, parseInt(inputN.value || '0', 10)));
  inputN.value = String(n);

  clearUI();
  exec = new Exec(parseInt(speed.value, 10));
  setControlsRunning(true);

  try {
    const result = await factorial(n, exec, 0);
    resultEl.textContent = `결과: ${result}`;
  } catch (e) {
    if (e?.message !== 'aborted') {
      resultEl.textContent = `오류: ${String(e)}`;
    } else {
      resultEl.textContent = '실행이 취소되었어요.';
    }
  } finally {
    setControlsRunning(false);
  }
});

pauseBtn.addEventListener('click', () => {
  if (!exec) return;
  if (exec.autoplay) {
    exec.pause();
    pauseBtn.textContent = '재생';
  } else {
    exec.resume();
    pauseBtn.textContent = '일시정지';
  }
});

stepBtn.addEventListener('click', () => {
  if (!exec) return;
  if (exec.autoplay) {
    // 자동 재생 중이면 일시정지부터
    exec.pause();
    pauseBtn.textContent = '재생';
  }
  exec.step();
});

resetBtn.addEventListener('click', () => {
  if (exec) exec.abort();
  clearUI();
  setControlsRunning(false);
});

speed.addEventListener('change', () => {
  if (exec) exec.setSpeed(parseInt(speed.value, 10));
});
