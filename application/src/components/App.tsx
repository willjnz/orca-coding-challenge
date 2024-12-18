import { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function App(): JSX.Element {
  const mapContainer = useRef(null); // Create a reference for the map container

  type TInterval = '5' | '10' | '50';

  const [selectedInterval, setSelectedInterval] = useState<TInterval>('10');

  useEffect(() => {
    // Initialize the map when the component is mounted
    const map = new mapboxgl.Map({
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      container: mapContainer.current as unknown as HTMLElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-120.759538, 35.13],
      zoom: 8,
    });

    // Add zoom and rotation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Add the vector tile source and layer for bathymetry_contours_5
    map.on('load', () => {
      // add a vector tile layer from tipg
      map.addSource('contours', {
        type: 'vector',
        promoteId: 'id',
        scheme: 'xyz',
        tiles: [
          `http://localhost:8081/collections/public.bathymetry_contours_${selectedInterval}/tiles/{z}/{x}/{y}?properties=id,depth_m&limit=10000`,
        ],
      });
      map.addLayer(
        {
          id: 'contours',
          source: 'contours',
          'source-layer': 'default',
          type: 'line',
          paint: {
            'line-width': 2,
            'line-color': [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'depth_m']],
              -7000,
              '#4B0082',
              -4000,
              '#191970',
              -1000,
              '#00008B',
              -200,
              '#4682B4',
              -0,
              '#A0D3FF',
            ],
          },
        },
        'building-number-label'
      ); // add this layer under the map labels
    });

    // Cleanup function to remove the map when the component unmounts
    return () => map.remove();
  }, []);
  return (
    <div
      ref={mapContainer} // Set the map container reference
      style={{
        width: '100vw', // Full viewport width
        height: '100vh', // Full viewport height
      }}
    ></div>
  );
}
