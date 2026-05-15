const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const { buildServer } = require('../server');

test('GET /routes returns at least two GeoJSON LineString routes', async () => {
  const server = await buildServer();
  await server.ready();

  const response = await server.inject({ method: 'GET', url: '/routes' });
  assert.equal(response.statusCode, 200);

  const body = response.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length >= 2);

  for (const feature of body) {
    assert.equal(feature.type, 'Feature');
    assert.equal(feature.geometry.type, 'LineString');
    assert.ok(Array.isArray(feature.geometry.coordinates));
  }

  await server.close();
});

test('WebSocket /ws accepts connection and sends vehicle updates', async () => {
  const server = await buildServer();
  await server.listen({ port: 0, host: '127.0.0.1' });
  const address = server.server.address();
  const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('Timed out waiting for websocket message'));
    }, 4000);

    ws.on('message', (message) => {
      clearTimeout(timeout);
      const parsed = JSON.parse(String(message));
      assert.ok(Array.isArray(parsed));
      assert.ok(parsed.length > 0);
      const first = parsed[0];
      assert.equal(typeof first.vehicle_id, 'string');
      assert.equal(typeof first.route_id, 'string');
      assert.ok(Array.isArray(first.position));
      assert.equal(typeof first.speed, 'number');
      assert.equal(typeof first.timestamp, 'string');
      ws.close();
      resolve();
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  await server.close();
});
