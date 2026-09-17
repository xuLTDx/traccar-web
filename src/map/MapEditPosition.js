import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { map } from './core/MapView';
import { toMapCoordinates, fromMapCoordinates } from './core/mapUtil';

// A single draggable pin, for visually repositioning something that isn't a device (e.g. a
// business address) instead of typing latitude/longitude by hand.
const MapEditPosition = ({ latitude, longitude, onChange }) => {
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const marker = new maplibregl.Marker({ draggable: true });
    marker.on('dragend', () => {
      const { lng, lat } = marker.getLngLat();
      const [newLongitude, newLatitude] = fromMapCoordinates(lng, lat);
      onChangeRef.current(newLatitude, newLongitude);
    });
    marker.addTo(map);
    markerRef.current = marker;
    return () => marker.remove();
  }, []);

  useEffect(() => {
    markerRef.current.setLngLat(toMapCoordinates(longitude, latitude));
  }, [latitude, longitude]);

  return null;
};

export default MapEditPosition;
