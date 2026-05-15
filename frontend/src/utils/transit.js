function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const base = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const arc = 2 * Math.atan2(Math.sqrt(base), Math.sqrt(1 - base));

  return earthRadiusKm * arc;
}

function calculateETA({ currentPosition, nextStopPosition, speedKmh }) {
  if (!speedKmh || speedKmh <= 0) {
    return Infinity;
  }

  const distanceKm = haversineDistanceKm(currentPosition, nextStopPosition);
  return (distanceKm / speedKmh) * 60;
}

function getReconnectDelay(attemptNumber) {
  const boundedAttempt = Math.min(Math.max(0, attemptNumber), 5);
  return Math.min(30000, 1000 * Math.pow(2, boundedAttempt));
}

module.exports = {
  calculateETA,
  getReconnectDelay,
  haversineDistanceKm,
};
