# Real-Time Transit Tracker (Expo + Fastify)

This repository contains:

- `backend/`: Fastify server with REST + WebSocket transit simulation
- `frontend/`: Expo React Native app (Expo Go compatible) using `react-native-maps`

## Features implemented

- Fastify backend with:
  - `GET /health`
  - `GET /routes` returning at least two GeoJSON LineString routes
  - `ws://<host>:3000/ws` WebSocket endpoint
  - Vehicle update broadcasts every ~3 seconds
- Expo React Native frontend with:
  - `MapView` container (`data-testid="map-container"`)
  - Route polylines (`data-testid="polyline-route-[route_id]"`)
  - Smooth animated vehicle markers (`data-testid="vehicle-marker-[vehicle_id]"`)
  - Vehicle detail bottom sheet (`data-testid="vehicle-detail-sheet"` and detail ids)
  - ETA calculation via Haversine
  - Exponential backoff reconnection for WebSocket
  - Exposed test hooks:
    - `window.calculateETA(details)`
    - `window.getReconnectDelay(attemptNumber)`

## Backend setup

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3000` by default.

## Run backend with Docker Compose

```bash
docker-compose up --build
```

## Frontend setup (Expo Go)

```bash
cd frontend
npm install
```

Set API base URL to your machine IP so your phone can reach backend:

```bash
# example
export EXPO_PUBLIC_API_BASE_URL="http://192.168.1.10:3000"
npm start
```

Then scan the QR code with Expo Go.

## Testing

Backend tests:

```bash
cd backend
npm test
```

Frontend utility tests:

```bash
cd frontend
npm test
```

## Environment variables

See `.env.example`.
