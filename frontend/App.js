import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, Pressable } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import AnimatedVehicleMarker from './src/components/AnimatedVehicleMarker';
import { useTransitWebSocket } from './src/hooks/useTransitWebSocket';
import { calculateETA, getReconnectDelay } from './src/utils/transit';

const DEFAULT_HTTP_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const WS_URL = DEFAULT_HTTP_BASE_URL.replace('http', 'ws') + '/ws';
const ROUTES_URL = `${DEFAULT_HTTP_BASE_URL}/routes`;

function toMapCoordinate(position) {
  return {
    longitude: position[0],
    latitude: position[1],
  };
}

export default function App() {
  const [routes, setRoutes] = useState([]);
  const [vehiclesById, setVehiclesById] = useState({});
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  useEffect(() => {
    fetch(ROUTES_URL)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRoutes(data);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch routes', error);
      });
  }, []);

  const onVehiclesUpdate = useCallback((vehicles) => {
    setVehiclesById((previous) => {
      const next = { ...previous };
      for (const vehicle of vehicles) {
        next[vehicle.vehicle_id] = {
          ...vehicle,
          coordinate: toMapCoordinate(vehicle.position),
        };
      }
      return next;
    });
  }, []);

  useTransitWebSocket(WS_URL, onVehiclesUpdate);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.calculateETA = calculateETA;
      window.getReconnectDelay = getReconnectDelay;
    }
  }, []);

  const vehicles = useMemo(() => Object.values(vehiclesById), [vehiclesById]);

  const selectedVehicle = selectedVehicleId ? vehiclesById[selectedVehicleId] : null;

  const selectedRoute = selectedVehicle
    ? routes.find((route) => route.properties.route_id === selectedVehicle.route_id)
    : null;

  const etaMinutes = useMemo(() => {
    if (!selectedVehicle || !selectedRoute) {
      return null;
    }

    const last = selectedRoute.geometry.coordinates[selectedRoute.geometry.coordinates.length - 1];
    if (!last) {
      return null;
    }

    return calculateETA({
      currentPosition: selectedVehicle.coordinate,
      nextStopPosition: { longitude: last[0], latitude: last[1] },
      speedKmh: selectedVehicle.speed,
    });
  }, [selectedRoute, selectedVehicle]);

  const etaDisplay =
    etaMinutes === null || !Number.isFinite(etaMinutes) ? 'N/A' : `${etaMinutes.toFixed(1)} min`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.mapWrapper} testID="map-container" data-testid="map-container">
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 40.7138,
            longitude: -74.001,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
        >
          {routes.map((route) => (
            <Polyline
              key={route.properties.route_id}
              coordinates={route.geometry.coordinates.map(([longitude, latitude]) => ({ longitude, latitude }))}
              strokeColor={route.properties.route_id === 'A1' ? '#2563eb' : '#ef4444'}
              strokeWidth={4}
              testID={`polyline-route-${route.properties.route_id}`}
              data-testid={`polyline-route-${route.properties.route_id}`}
            />
          ))}

          {vehicles.map((vehicle) => (
            <AnimatedVehicleMarker
              key={vehicle.vehicle_id}
              vehicle={vehicle}
              onPress={() => setSelectedVehicleId(vehicle.vehicle_id)}
            />
          ))}
        </MapView>
      </View>

      {selectedVehicle ? (
        <View style={styles.sheet} testID="vehicle-detail-sheet" data-testid="vehicle-detail-sheet">
          <Text style={styles.sheetTitle}>Vehicle details</Text>
          <Text testID="detail-vehicle-id" data-testid="detail-vehicle-id">Vehicle: {selectedVehicle.vehicle_id}</Text>
          <Text testID="detail-speed" data-testid="detail-speed">Speed: {selectedVehicle.speed} km/h</Text>
          <Text testID="detail-last-updated" data-testid="detail-last-updated">Updated: {selectedVehicle.timestamp}</Text>
          <Text>ETA to route end: {etaDisplay}</Text>
          <Pressable onPress={() => setSelectedVehicleId(null)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  sheetTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 8,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
