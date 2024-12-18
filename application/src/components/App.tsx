import MapView from './MapView';
import MapLegend from './MapLegend';
import { useRef, useState } from 'react';

export default function Frame(): JSX.Element {
  return (
    <div
      sx={{ height: '100%', width: '100%', position: 'relative' }}
      ref={mapContainer}
    />
  );
}
