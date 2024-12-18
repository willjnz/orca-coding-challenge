import { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function App(): JSX.Element {
  const mapContainer = useRef(null); // Create a reference for the map container
  const mapRef = useRef<mapboxgl.Map | null>(null); // Use ref to store the map instance

  // these are in centimeters
  type TInterval = '50' | '100' | '500';
  const intervals: TInterval[] = ['50', '100', '500'];

  const [selectedInterval, setSelectedInterval] = useState<TInterval>('100');
  const [isMapLoaded, setIsMapLoaded] = useState(false); // To track map loading state

  const legendData = [
    { depth: -7000, color: '#4B0082' },
    { depth: -4000, color: '#191970' },
    { depth: -1000, color: '#00008B' },
    { depth: -200, color: '#4682B4' },
    { depth: 0, color: '#A0D3FF' },
  ];

  // Function to update the vector tile layer based on the selected interval
  const updateLayer = () => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing layer if it exists
    if (map.getSource('contours')) {
      map.removeLayer('contours');
      map.removeSource('contours');
    }

    // Add the vector tile source and layer for bathymetry_contours_{selectedInterval}

    // Add a vector tile layer from Tipg
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
      'building-number-label' // Add this layer under the map labels
    );
  };

  useEffect(() => {
    // Initialize the map when the component is mounted (only once)
    mapRef.current = new mapboxgl.Map({
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      container: mapContainer.current as unknown as HTMLElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-120.759538, 35.13],
      zoom: 8,
    });

    // Add zoom and rotation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    mapRef.current.on('load', () => {
      // Initially load the layer
      updateLayer();
      setIsMapLoaded(true);
    });

    // Cleanup function to remove the map when the component unmounts
    return () => mapRef.current?.remove();
  }, []); // Empty dependency array, only runs once to initialize the map

  useEffect(() => {
    // Update the layer when selectedInterval changes, but don't re-initialize the map
    const map = mapRef.current;
    if (map && isMapLoaded) {
      updateLayer(); // Call the updateLayer function to refresh the layer based on the selectedInterval
    }
  }, [selectedInterval]); // This effect runs when selectedInterval changes

  return (
    <div>
      <div
        ref={mapContainer}
        style={{
          width: '100vw',
          height: '100vh',
        }}
      ></div>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '50px',
          padding: '8px',
        }}
        className="mapboxgl-ctrl mapboxgl-ctrl-group"
      >
        <h3>Contour Interval (m)</h3>
        {intervals.map((interval) => (
          <label key={interval}>
            <input
              type="radio"
              name="interval"
              value={interval}
              checked={selectedInterval === interval}
              onChange={() => setSelectedInterval(interval)}
            />
            {parseInt(interval) / 100}
          </label>
        ))}
        <div className="legend-container">
          <h3>Depth (m)</h3>
          <div className="legend">
            {legendData.map((item, index) => (
              <div key={index} className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span>{item.depth} m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
