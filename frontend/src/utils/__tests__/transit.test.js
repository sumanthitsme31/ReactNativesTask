const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateETA, getReconnectDelay } = require('../transit');

test('getReconnectDelay grows exponentially and caps at 30s', () => {
  assert.equal(getReconnectDelay(0), 1000);
  assert.equal(getReconnectDelay(1), 2000);
  assert.equal(getReconnectDelay(10), 30000);
});

test('calculateETA returns minutes using haversine distance', () => {
  const eta = calculateETA({
    currentPosition: { latitude: 40.7128, longitude: -74.006 },
    nextStopPosition: { latitude: 40.7228, longitude: -73.996 },
    speedKmh: 30,
  });

  assert.equal(typeof eta, 'number');
  assert.ok(eta > 0);
});

test('calculateETA returns Infinity for non-positive speed', () => {
  const eta = calculateETA({
    currentPosition: { latitude: 40.7128, longitude: -74.006 },
    nextStopPosition: { latitude: 40.7228, longitude: -73.996 },
    speedKmh: 0,
  });

  assert.equal(eta, Infinity);
});
