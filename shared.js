'use strict';
window.YILConfig = (() => {
  const storageKey = 'yil-gacha:max-cards:v1';
  const validMax = value => Number.isInteger(value) && value >= 2 && value <= 11;
  function probability(cards, max) {
    if (!validMax(max) || !Number.isInteger(cards) || cards < 1 || cards > max) throw new RangeError('枚数が範囲外です');
    return Math.round(100 * Math.pow((cards - 1) / (max - 1), 1.7)) / 100;
  }
  function override() {
    try { const value = Number(localStorage.getItem(storageKey)); return validMax(value) ? value : null; }
    catch { return null; }
  }
  function setOverride(max) {
    if (!validMax(max)) throw new RangeError('枚数が範囲外です');
    localStorage.setItem(storageKey, String(max));
    if (override() !== max) throw new Error('保存できません');
  }
  function clearOverride() { localStorage.removeItem(storageKey); }
  async function readCommon() {
    if (location.protocol === 'file:') return 11;
    const response = await fetch('settings.json?t=' + Date.now(), {cache:'no-store',signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('共通設定を取得できません');
    const data = await response.json();
    if (!validMax(data.maxCards)) throw new Error('共通設定が不正です');
    return data.maxCards;
  }
  async function read() { const own = override(); if (own !== null) return own; const common = await readCommon(); return override() ?? common; }
  function label(max) { return override() !== null ? `この端末：上限${max}枚（端末別設定）` : `共通設定：上限${max}枚`; }
  return {probability, validMax, read, readCommon, override, setOverride, clearOverride, label};
})();
