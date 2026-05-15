const path = require('node:path');
const fs = require('node:fs');
const Fastify = require('fastify');
const websocket = require('@fastify/websocket');
const { WebSocket } = require('ws');

const UPDATE_INTERVAL_MS = Number(process.env.UPDATE_INTERVAL_MS || 3000);
const ROUTES_DIRECTORY = path.join(__dirname, 'routes');
const PROGRESS_SPEED_DIVISOR = 90000;

function readRoutes() {
  const files = fs
    .readdirSync(ROUTES_DIRECTORY)
    .filter((file) => file.endsWith('.geojson'))
    .sort();

  return files.map((file) => {
    const fullPath = path.join(ROUTES_DIRECTORY, file);
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  });
}

function distance([lon1, lat1], [lon2, lat2]) {
  const dLon = lon2 - lon1;
  const dLat = lat2 - lat1;
  return Math.sqrt(dLon * dLon + dLat * dLat);
}

function getPositionForProgress(coordinates, progress) {
  if (!coordinates.length) {
    return [0, 0];
  }

  if (coordinates.length === 1) {
    return coordinates[0];
  }

  const clamped = Math.max(0, Math.min(progress, 0.999999));
  const segmentLengths = [];
  let total = 0;

  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const len = distance(coordinates[i], coordinates[i + 1]);
    segmentLengths.push(len);
    total += len;
  }

  const target = total * clamped;
  let traversed = 0;

  for (let i = 0; i < segmentLengths.length; i += 1) {
    const segment = segmentLengths[i];
    if (traversed + segment >= target) {
      const ratio = segment === 0 ? 0 : (target - traversed) / segment;
      const [lon1, lat1] = coordinates[i];
      const [lon2, lat2] = coordinates[i + 1];
      return [lon1 + (lon2 - lon1) * ratio, lat1 + (lat2 - lat1) * ratio];
    }
    traversed += segment;
  }

  return coordinates[coordinates.length - 1];
}

function createVehicles(routes) {
  return routes.map((route, index) => ({
    vehicle_id: `v${index + 1}`,
    route_id: route.properties.route_id,
    progress: index * 0.3,
    speed: 24 + index * 6,
  }));
}

async function buildServer() {
  const fastify = Fastify({ logger: true });
  await fastify.register(websocket);

  const routes = readRoutes();
  const routeMap = Object.fromEntries(routes.map((route) => [route.properties.route_id, route]));
  const vehicles = createVehicles(routes);

  const getPayload = () =>
    vehicles.map((vehicle) => {
      const route = routeMap[vehicle.route_id];
      const position = getPositionForProgress(route.geometry.coordinates, vehicle.progress);
      return {
        vehicle_id: vehicle.vehicle_id,
        route_id: vehicle.route_id,
        position,
        speed: vehicle.speed,
        timestamp: new Date().toISOString(),
      };
    });

  const tick = () => {
    vehicles.forEach((vehicle) => {
      const speedFactor = vehicle.speed / PROGRESS_SPEED_DIVISOR;
      vehicle.progress = (vehicle.progress + speedFactor) % 1;
    });

    const payload = JSON.stringify(getPayload());
    for (const client of fastify.websocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  };

  let timer;

  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.get('/routes', async () => routes);

  fastify.route({
    method: 'GET',
    url: '/ws',
    handler: async (_request, reply) => {
      reply.code(426).send({ message: 'Upgrade Required' });
    },
    wsHandler: () => {},
  });

  fastify.addHook('onReady', async () => {
    timer = setInterval(tick, UPDATE_INTERVAL_MS);
  });

  fastify.addHook('onClose', async () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  });

  return fastify;
}

async function start() {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const server = await buildServer();
  await server.listen({ port, host });
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildServer,
  getPositionForProgress,
};
