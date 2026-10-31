const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateWaterRisk, calculateConsumption, recommendIrrigation, localAssistant } = require('../lib/rules');

test('classifica risco alto em calor e estiagem', () => {
  const result = calculateWaterRisk({ temperature: 35, humidity: 30, rainfall: 0, dryDays: 15 });
  assert.equal(result.level, 'alto');
  assert.ok(result.score >= 70);
});

test('calcula consumo residencial positivo e detalhado', () => {
  const result = calculateConsumption({ residents: 2, showerMinutes: 5, laundryLoads: 4 });
  assert.ok(result.totalLiters > 0);
  assert.equal(Object.keys(result.breakdown).length, 5);
});

test('recomendação de irrigação reduz volume após chuva', () => {
  const dry = recommendIrrigation({ areaM2: 20, rainDays: 10 });
  const wet = recommendIrrigation({ areaM2: 20, rainDays: 1 });
  assert.ok(wet.liters < dry.liters);
});

test('assistente local responde sem chave externa', () => {
  assert.match(localAssistant('Como economizar água?'), /Banhos curtos/i);
});
