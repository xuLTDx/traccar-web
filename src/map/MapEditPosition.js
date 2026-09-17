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
    // setLngLat before addTo - addTo renders the marker immediately and crashes if it has no
    // position yet.
    marker.setLngLat(toMapCoordinates(longitude, latitude));
    marker.addTo(map);
    markerRef.current = marker;
    return () => marker.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markerRef.current.setLngLat(toMapCoordinates(longitude, latitude));
  }, [latitude, longitude]);

  return null;
};

export default MapEditPosition;
