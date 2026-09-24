'use strict';
// All probability and prize decisions live here. rng is injectable for boundary tests.
function drawPrize(cards, rng = Math.random, max = 11) {
  if (!YILConfig.validMax(max) || !Number.isInteger(cards) || cards < 1 || cards > max) throw new RangeError('カード枚数が範囲外です');
  const probability = YILConfig.probability(cards, max);
  const roll = rng();
  return { cards, max, probability, roll, sticker: roll >= probability, clearFile: roll < probability, complete: cards === max };
}
(() => {
  const $ = id => document.getElementById(id);
  const input = $('cards'), result = $('result');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const offline = location.protocol === 'file:';
  let maxCards = 11, configReady = false;
  let pendingMax = null, refreshing = false;
  let cards = 1, phase = 'ready', audio, lastDraw = null;
  function applyMax(max) {
    if (!YILConfig.validMax(max)) return;
    if (phase !== 'ready') { pendingMax = max; return; }
    maxCards = max; cards = Number.isInteger(cards) ? Math.min(cards,max) : cards;
    input.max = max; if (Number.isInteger(cards)) input.value = cards;
    document.querySelector('.complete-callout').innerHTML = `${max}枚で<br>コンプリート！`;
    document.querySelector('.guarantee').textContent = `★ 1枚でシール確定 ／ ${max}枚でクリアファイル確定`;
    $('input-hint').textContent = `1〜${max}枚・数字をタップしても選べるよ`;
    render();
  }
  async function refreshSettings() {
    if (refreshing || document.hidden) return;
    refreshing = true;
    try { const max = await YILConfig.read(); configReady = true; applyMax(max); $('settings-status').textContent = YILConfig.label(max); }
    catch { configReady = false; render(); $('settings-status').textContent = '上限設定を取得できません。通信を確認して「再確認」を押してください。'; }
    finally { refreshing = false; }
  }

  const numberButtons = Array.from({ length: 11 }, (_, i) => {
    const button = document.createElement('button');
    button.textContent = i + 1;
    button.setAttribute('aria-label', `${i + 1}枚`);
    button.addEventListener('click', () => setCards(i + 1));
    $('numbers').append(button);
    return button;
  });
  const machine = document.querySelector('.machine');
  let bounceTimer = null, revealTimer = null, lastTap = 0;
  const visualCapsules = [...document.querySelectorAll('.visual-capsule')];
  const capsuleSlots = [[72,7,-18],[133,9,23],[36,65,13],[99,66,-12],[162,66,28],[34,122,-25],[98,123,19],[161,122,-16],[68,179,15],[132,180,-22]];
  let slotOrder = visualCapsules.map((_,i) => i);
  let mixAnimations = [];
  let mixRound = 0;
  function placeCapsules() {
    visualCapsules.forEach((capsule,i) => {
      const [x,y,angle] = capsuleSlots[slotOrder[i]];
      capsule.style.left = x + 'px'; capsule.style.top = y + 'px';
      capsule.style.transform = `rotate(${angle}deg)`;
    });
  }
  function mixCapsules() {
    mixAnimations.forEach(animation => animation.cancel()); mixAnimations = [];
    // Visual mixing uses crypto, independent of the prize draw's Math.random().
    const values = new Uint32Array(10); crypto.getRandomValues(values);
    const oldOrder = [...slotOrder];
    for (let i = 9; i > 0; i--) { const j = values[i] % (i+1); [slotOrder[i],slotOrder[j]] = [slotOrder[j],slotOrder[i]]; }
    if (slotOrder.every((v,i) => v === oldOrder[i])) slotOrder.push(slotOrder.shift());
    placeCapsules(); mixRound++;
    if (reducedMotion.matches) return;
    visualCapsules.forEach((capsule,i) => {
      const [ox,oy,oa] = capsuleSlots[oldOrder[i]], [x,y,angle] = capsuleSlots[slotOrder[i]];
      const arc = (i / 10 + mixRound * .13) * Math.PI * 2;
      const midX = 100 + Math.cos(arc) * 66, midY = 92 + Math.sin(arc) * 64;
      mixAnimations.push(capsule.animate([
        {transform:`translate(${ox-x}px,${oy-y}px) rotate(${oa}deg)`},
        {transform:`translate(${midX-x}px,${midY-y}px) rotate(${angle+180}deg)`,offset:.48},
        {transform:`translate(0,0) rotate(${angle+360}deg)`}
      ], {duration:900+i*12,easing:'cubic-bezier(.4,0,.2,1)'}));
    });
  }
  placeCapsules();
  function bounceMachine() {
    if (reducedMotion.matches) return;
    clearTimeout(bounceTimer);
    machine.classList.remove('bouncing');
    void machine.offsetWidth;
    machine.classList.add('bouncing');
    bounceTimer = setTimeout(() => machine.classList.remove('bouncing'), 650);
  }
  $('machine-tap').addEventListener('click', () => {
    if (phase !== 'ready' || Date.now() - lastTap < 1100) return;
    lastTap = Date.now();
    mixCapsules(); tone(540, 0, .09);
  });
  let previousPercent = 0;
  function render() {
    const valid = Number.isInteger(cards) && cards >= 1 && cards <= maxCards;
    input.setAttribute('aria-invalid', String(!valid));
    $('minus').disabled = phase !== 'ready' || (valid && cards === 1);
    $('plus').disabled = phase !== 'ready' || (valid && cards === maxCards);
    input.disabled = phase !== 'ready';
    $('machine-tap').disabled = phase !== 'ready';
    numberButtons.forEach((b, i) => { b.hidden = i + 1 > maxCards; b.disabled = phase !== 'ready'; b.setAttribute('aria-pressed', String(cards === i + 1)); });
    $('launch').disabled = phase !== 'ready' || !valid || !configReady;
    $('handle').disabled = phase !== 'ready' || !valid || !configReady;
    const percent = valid ? Math.round(drawProbability(cards) * 100) : null;
    $('prob').textContent = percent ?? '—';
    $('prob-label').textContent = valid ? `カード${cards}枚 → クリアファイル当選率` : `1〜${maxCards}の整数を入力してね`;
    const level = percent ?? 0;
    const gauge = $('fill');
    const chance = gauge.closest('.chance');
    gauge.style.width = `${level}%`;
    gauge.style.setProperty('--gauge-hue', String(185 - level * 1.4));
    chance.classList.toggle('high-chance', level >= 70);
    chance.classList.toggle('full-chance', level === 100);
    $('machine-message').textContent = level === 100 ? `${maxCards}枚コンプリート！` : level >= 70 ? 'ワクワクがいっぱい！' : 'タップでまぜてみよう';
    if (level !== previousPercent && valid && phase === 'ready') mixCapsules();
    if (level > previousPercent && phase === 'ready' && !reducedMotion.matches) {
      $('prob').getAnimations().forEach(animation => animation.cancel());
      $('prob').animate([{transform:'scale(1)'},{transform:'scale(1.16)',offset:.4},{transform:'scale(1)'}], {duration:380,easing:'ease-out'});
    }
    document.querySelectorAll('.visual-capsule').forEach((capsule, i) => {
      const share = valid ? Math.max(0, Math.min(100, (percent - i * 10) * 10)) : 0;
      capsule.classList.toggle('contains-file', share === 100);
      capsule.classList.toggle('partial-file', share > 0 && share < 100);
      capsule.classList.toggle('unknown-prize', !valid);
      capsule.style.setProperty('--file-share', `${share}%`);
    });
    $('capsule-legend').textContent = valid ? `黄色＝クリアファイル ${percent}% ／ 白＝シール ${100-percent}%` : `1〜${maxCards}枚を選んでね`;
    previousPercent = level;
    $('chance-note').textContent = valid ? `シール当選率 ${100 - percent}% ／ 景品はどちらか1つ！` : '景品はシールかクリアファイルのどちらか1つ！';
    updateDebug();
  }
  // Reuse the central probability logic without drawing a random number.
  function drawProbability(n) { return drawPrize(n, () => 0, maxCards).probability; }
  function setCards(n) { if (phase !== 'ready') return; cards = n; input.value = n; render(); }
  input.addEventListener('input', () => { cards = input.value === '' ? NaN : Number(input.value); render(); });
  $('minus').addEventListener('click', () => setCards(Math.max(1, Number.isInteger(cards) ? cards - 1 : 1)));
  $('plus').addEventListener('click', () => setCards(Math.min(maxCards, Number.isInteger(cards) ? cards + 1 : 1)));
  let soundTimeouts = [], drawTimer = null;
  function stopAllPendingSounds() {
    soundTimeouts.forEach(id => clearTimeout(id));
    soundTimeouts = [];
  }
  function tone(frequency, delay = 0, duration = .12) {
    if (delay > 0) {
      const tid = setTimeout(() => {
        tone(frequency, 0, duration);
      }, delay * 1000);
      soundTimeouts.push(tid);
      return;
    }
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime;
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.045, start); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      oscillator.start(start); oscillator.stop(start + duration);
    } catch (_) { /* Audio is optional; the draw remains available. */ }
  }
  const handle = $('handle');
  let drag = null;
  function angle(e, box) { return Math.atan2(e.clientY - box.top - box.height/2, e.clientX - box.left - box.width/2) * 180 / Math.PI; }
  function resetHandle() { drag = null; handle.style.transform = ''; }
  handle.addEventListener('pointerdown', e => {
    if (phase !== 'ready' || handle.disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const box = handle.getBoundingClientRect();
    drag = {id:e.pointerId, box, previous:angle(e,box), total:0};
    handle.setPointerCapture(e.pointerId); e.preventDefault();
  });
  handle.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id || phase !== 'ready') return;
    const current = angle(e,drag.box);
    const delta = (current - drag.previous + 540) % 360 - 180;
    drag.previous = current; drag.total = Math.max(0, Math.min(140, drag.total + delta));
    handle.style.transform = `rotate(${drag.total}deg)`;
    if (drag.total >= 120) { resetHandle(); startDraw(true); }
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => handle.addEventListener(type, resetHandle));
  handle.addEventListener('click', e => { if (e.detail === 0) startDraw(true); });
  $('launch').addEventListener('click', () => startDraw(false));
  async function startDraw(shouldMix = false) {
    if (phase !== 'ready' || !configReady || !Number.isInteger(cards) || cards < 1 || cards > maxCards) return;
    phase = 'checking'; render();
    {
      try {
        const fresh = await YILConfig.read();
        if (fresh !== maxCards) {
          phase = 'ready'; configReady = true; pendingMax = null; applyMax(fresh);
          $('settings-status').textContent = `上限が${fresh}枚に変更されました。確率を確認して、もう一度まわしてください。`;
          return;
        }
      } catch {
        phase = 'ready'; configReady = false; render();
        $('settings-status').textContent = '上限設定を確認できません。「再確認」を押してください。';
        return;
      }
    }
    pendingMax = null;
    phase = 'drawing';
    lastDraw = drawPrize(cards, Math.random, maxCards);
    render();
    if (shouldMix) mixCapsules();
    else { mixAnimations.forEach(animation => animation.cancel()); mixAnimations = []; }
    $('status').textContent = '抽選中。カプセルが出てくるよ！';
    $('launch').querySelector('span').textContent = 'カプセルが出てくるよ…';
    stopAllPendingSounds();
    if (!reducedMotion.matches) handle.animate([{rotate:'0deg'},{rotate:'360deg'}],{duration:850,easing:'ease-out'});
    for (let i = 0; i < 7; i++) tone(300 + i * 70, i * .15);
    drawTimer = setTimeout(presentCapsule, reducedMotion.matches ? 250 : 1200);
  }
  function presentCapsule() {
    drawTimer = null; phase = 'awaiting-open';
    $('drawing').classList.remove('opening'); $('drawing').hidden = false;
    document.querySelector('main').inert = true; document.querySelector('header').inert = true;
    $('open-capsule').disabled = false;
    $('open-title').textContent = 'カプセルが出てきた！';
    $('open-hint').textContent = 'タップしてあけよう！';
    $('open-capsule').focus(); updateDebug();
  }
  $('drawing').addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); $('open-capsule').focus(); }
  });
  $('open-capsule').addEventListener('click', () => {
    if (phase !== 'awaiting-open') return;
    phase = 'opening'; $('open-capsule').disabled = true;
    $('drawing').classList.add('opening');
    $('open-title').textContent = 'パカッ！'; $('open-hint').textContent = 'きみの景品は…';
    tone(880,0,.2);
    revealTimer = setTimeout(showResult, reducedMotion.matches ? 100 : 550);
  });
  function showResult() {
    clearTimeout(revealTimer); revealTimer = null;
    stopAllPendingSounds();
    if (drawTimer) { clearTimeout(drawTimer); drawTimer = null; }
    phase = 'result'; $('drawing').hidden = true;
    document.querySelector('main').inert = false; document.querySelector('header').inert = false;
    const win = lastDraw.clearFile, complete = lastDraw.complete;
    result.className = complete ? 'complete' : win ? 'winner' : 'sticker-only';
    $('result-tag').textContent = complete ? `ALL ${lastDraw.max} CARDS. AMAZING!` : win ? 'LUCKY DISCOVERY!' : 'NICE COLLECTION!';
    $('result-title').textContent = complete ? 'コンプリート！クリアファイルGET！' : win ? 'クリアファイルGET！' : 'シールGET！';
    $('result-copy').textContent = complete ? `${lastDraw.max}枚ぜんぶ集めたね。たくさんの発見をありがとう！` : win ? 'やったね！クリアファイルを受け取ろう。' : 'あつめてくれてありがとう！シールを受け取ろう。';
    result.querySelector('.confetti').replaceChildren();
    if (!reducedMotion.matches) for (let i = 0; i < (win ? 35 : 14); i++) {
      const piece = document.createElement('i');
      piece.style.left = `${(i * 37) % 100}%`; piece.style.animationDelay = `${-(i % 9) * .3}s`;
      result.querySelector('.confetti').append(piece);
    }
    result.showModal(); $('result-title').focus();
    [523,659,784,win ? 1047 : 880].forEach((n, i) => tone(n, i * .13, .25));
    $('status').textContent = ''; updateDebug();
  }
  // Only the explicit next-participant button dismisses the result.
  result.addEventListener('cancel', e => e.preventDefault());
  $('again').addEventListener('click', () => {
    if (phase !== 'result') return;
    result.close(); result.className = ''; result.querySelector('.confetti').replaceChildren();
    clearTimeout(bounceTimer); clearTimeout(revealTimer);
    machine.classList.remove('bouncing'); $('drawing').classList.remove('opening');
    mixAnimations.forEach(animation => animation.cancel()); mixAnimations = [];
    slotOrder = visualCapsules.map((_,i) => i); placeCapsules();
    stopAllPendingSounds(); lastTap = 0; resetHandle();
    $('launch').querySelector('span').textContent = 'ガチャをまわす';
    lastDraw = null; phase = 'ready'; cards = 1; input.value = '1'; previousPercent = 0;
    $('result-title').textContent = ''; $('result-copy').textContent = ''; $('status').textContent = '次の参加者。カード1枚にリセットしました。';
    if (pendingMax !== null) { const next = pendingMax; pendingMax = null; applyMax(next); }
    render(); refreshSettings(); numberButtons[0].focus();
  });
  const debugging = new URLSearchParams(location.search).get('debug') === '1';
  $('debug').hidden = !debugging;
  function updateDebug() {
    if ($('debug').hidden) return;
    $('debug-text').textContent = 'clearFileProbability = round(100 × ((cards - 1) / (maxCards - 1))^1.7) / 100\n判定: Math.random() < clearFileProbability\n' + Array.from({length:maxCards}, (_,i) => `${i+1}枚: クリアファイル ${Math.round(drawProbability(i+1)*100)}% / シール ${100-Math.round(drawProbability(i+1)*100)}%`).join(' / ') + `\n状態: ${phase}` + (lastDraw ? `\n直近の抽選: ${JSON.stringify(lastDraw)}` : '\n直近の抽選: なし');
  }
  $('retry-settings').addEventListener('click', refreshSettings);
  $('settings-status').textContent = '上限設定を確認中…';
  render(); refreshSettings();
  setInterval(refreshSettings,30000); document.addEventListener('visibilitychange',refreshSettings); window.addEventListener('storage', refreshSettings);
})();
