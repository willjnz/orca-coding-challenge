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
      center: [-120.759538, 35.130000],
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
      map.addLayer({
        id: 'contours',
        source: 'contours',
        'source-layer': 'default',
        type: 'line',
        paint: {
          'line-color': '#ff0000', // Red color for the contours
          'line-width': 2, // Line width
        },
        // paint: {
        //   'circle-radius': 4,
        //   'circle-color': [
        //     'interpolate',
        //     ['linear'],
        //     ['to-number', ['get', mapVariable]],
        //     -1.3922,
        //     '#FFEDA0',
        //     82.717625,
        //     '#FEB24C',
        //     165.43525,
        //     '#F03B20',
        //     // TODO: get the data range from a new azure function so that we can symobolize a layer nicely
        //     // // TODO: style this based on the mapVariable
        //     // 0,
        //     // 'rgba(255, 1, 1, 1)', // Extrem niedrig (< 5. Perzentil)
        //     // 5,
        //     // 'rgba(255, 1, 1, 1)', // Extrem niedrig (< 5. Perzentil)
        //     // 15,
        //     // 'rgba(254, 71, 72, 1)', // Sehr niedrig (> 5. - 15. Perzentil)
        //     // 25,
        //     // 'rgba(254, 71, 72, 1)', // Niedrig (> 15. - 25. Perzentil)
        //     // 50,
        //     // 'rgba(227, 165, 192, 1)', // Normal (> 25. - 75. Perzentil)
        //     // 75,
        //     // 'rgba(138, 130, 247, 1)', // Hoch (> 75. - 85. Perzentil)
        //     // 85,
        //     // 'rgba(72, 71, 254, 1)', // Sehr hoch (> 85. - 95. Perzentil)
        //     // 95,
        //     // 'rgba(72, 71, 254, 1)', // Sehr hoch (> 85. - 95. Perzentil)
        //     // 100,
        //     // 'rgba(0, 2, 255, 1)', // Extrem hoch (> 95. Perzentil)
        //     // 'rgba(128, 128, 128, 1)', // Default color if no match (optional)
        //   ],
        //   'circle-stroke-color': '#fff',
        //   'circle-stroke-width': 1,
        // },
      });
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
