// Web Audio で操作音・タイピング音を合成します(音声ファイル不要)。
// 初回クリック後に有効化されます(ブラウザの自動再生制限のため)。
const Snd = (() => {
  let ctx = null, master = null, on = true;
  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch { on = false; }
  }
  function resume() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); }

  function tone(freq, dur, type = "sine", vol = 1, slideTo = null) {
    if (!on) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.5, hp = 1200) {
    if (!on) return;
    ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  // タイピング音(キーごとに少し高さを散らす)
  let lastKey = 0;
  function key() {
    const now = performance.now();
    if (now - lastKey < 18) return; // 連打抑制
    lastKey = now;
    noise(0.025, 0.35, 2600 + Math.random() * 1400);
    tone(420 + Math.random() * 180, 0.03, "square", 0.08);
  }
  const api = {
    resume,
    setEnabled(v) { on = v; if (v) resume(); },
    enabled: () => on,
    key,
    click() { tone(660, 0.05, "triangle", 0.5); noise(0.02, 0.2, 2000); },
    tabSwitch() { tone(520, 0.06, "sine", 0.4, 780); },
    toggleOn() { tone(600, 0.07, "sine", 0.5, 1000); tone(1000, 0.09, "sine", 0.3); },
    toggleOff() { tone(700, 0.08, "sine", 0.5, 380); },
    save() { tone(700, 0.07, "triangle", 0.4, 950); setTimeout(() => tone(1100, 0.1, "sine", 0.35), 70); },
    success() { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.14, "triangle", 0.45), i * 80)); },
    fail() { tone(300, 0.18, "sawtooth", 0.4, 140); setTimeout(() => tone(220, 0.2, "sawtooth", 0.35, 110), 90); },
    publish() { // 出品成功の華やかな音
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, "triangle", 0.4), i * 70));
      setTimeout(() => noise(0.15, 0.25, 3000), 60);
    },
    hover() { tone(900, 0.02, "sine", 0.08); },
    boot() { tone(200, 0.3, "sawtooth", 0.3, 800); setTimeout(() => tone(1200, 0.2, "sine", 0.2), 150); },
  };
  return api;
})();
window.Snd = Snd;
