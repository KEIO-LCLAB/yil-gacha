'use strict';
window.YILConfig = (() => {
  const endpoint = 'https://firestore.googleapis.com/v1/projects/yil-gacha-ichii/databases/(default)/documents/settings/gacha';
  const apiKey = 'AIzaSyABHs1FPPBTM7fnUB-lMu1WnT-KsF72Sw4';
  const validMax = value => Number.isInteger(value) && value >= 2 && value <= 11;
  function probability(cards, max) {
    if (!validMax(max) || !Number.isInteger(cards) || cards < 1 || cards > max) throw new RangeError('枚数が範囲外です');
    return Math.round(100 * Math.pow((cards - 1) / (max - 1), 1.7)) / 100;
  }
  async function read() {
    const response = await fetch(endpoint, {cache:'no-store',signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('上限設定を取得できません');
    const data = await response.json(), max = Number(data.fields?.maxCards?.integerValue);
    if (!validMax(max)) throw new Error('上限設定が不正です');
    return max;
  }
  return {endpoint, apiKey, probability, validMax, read};
})();
