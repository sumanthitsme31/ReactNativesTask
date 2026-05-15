import React, { useEffect, useRef } from 'react';
import { AnimatedRegion, MarkerAnimated } from 'react-native-maps';
import { View, Text, StyleSheet } from 'react-native';

const UPDATE_INTERVAL = 3000;
const ANIMATION_BUFFER_MS = 100;

export default function AnimatedVehicleMarker({ vehicle, onPress }) {
  const regionRef = useRef(null);

  if (!regionRef.current) {
    const { latitude, longitude } = vehicle.coordinate;
    regionRef.current = new AnimatedRegion({
      latitude,
      longitude,
      latitudeDelta: 0,
      longitudeDelta: 0,
    });
  }

  useEffect(() => {
    regionRef.current
      .timing({
        latitude: vehicle.coordinate.latitude,
        longitude: vehicle.coordinate.longitude,
        duration: UPDATE_INTERVAL - ANIMATION_BUFFER_MS,
        useNativeDriver: false,
      })
      .start();
  }, [vehicle.coordinate.latitude, vehicle.coordinate.longitude]);

  return (
    <MarkerAnimated
      coordinate={regionRef.current}
      onPress={onPress}
      testID={`vehicle-marker-${vehicle.vehicle_id}`}
      data-testid={`vehicle-marker-${vehicle.vehicle_id}`}
      identifier={`vehicle-marker-${vehicle.vehicle_id}`}
    >
      <View style={styles.marker}>
        <Text style={styles.markerText}>{vehicle.vehicle_id}</Text>
      </View>
    </MarkerAnimated>
  );
}

const styles = StyleSheet.create({
  marker: {
    backgroundColor: '#1f2937',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: '#fff',
    borderWidth: 1,
  },
  markerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
