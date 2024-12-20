import { useRef, useState, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function App(): JSX.Element {
  const mapContainer = useRef(null); // Create a reference for the map container
  const mapRef = useRef<mapboxgl.Map | null>(null); // Use ref to store the map instance

  // these are in centimeters
  type TInterval = '50' | '100' | '500';
  const intervals: TInterval[] = ['50', '100', '500'];

  const [selectedInterval, setSelectedInterval] = useState<TInterval>('500');
  const [isMapLoaded, setIsMapLoaded] = useState(false); // To track map loading state

  const legendData = [
    { depth: 0, color: '#6fb7db ' },
    { depth: 7.5, color: '#4f8fb3 ' },
    { depth: 15, color: '#2f688b ' },
    { depth: 22.5, color: '#1f4063 ' },
    { depth: 30, color: '#00204d ' },
  ];

  type GeoJSON = any; // TODO: type this using GeoJSON library

  // Function to update the vector tile layer based on the selected interval
  const updateLayer = () => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing layer if it exists
    if (map.getSource('contours')) {
      map.removeLayer('contours');
      map.removeLayer('contour-labels');
      map.removeSource('contours');
    }
    if (map.getSource('contours-comparison')) {
      map.removeLayer('contours-comparison');
      map.removeSource('contours-comparison');
    }

    // add comparison usace_contours_100
    if (selectedInterval === '100') {
      // Add the vector tile source and layer for bathymetry_contours_{selectedInterval}
      map.addSource('contours-comparison', {
        type: 'vector',
        promoteId: 'id',
        scheme: 'xyz',
        tiles: [
          `http://localhost:8081/collections/public.usace_contours_100/tiles/{z}/{x}/{y}?properties=contourelevation`,
        ],
      });

      map.addLayer(
        {
          id: 'contours-comparison',
          source: 'contours-comparison',
          'source-layer': 'default',
          type: 'line',
          paint: {
            'line-width': 2,
            'line-color': [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'contourelevation']],
              0,
              '#f8d7d0',
              7.5,
              '#f1a0a0',
              15,
              '#e57373',
              22.5,
              '#d32f2f',
              30,
              '#b71c1c',
            ],
          },
        },
        'building-number-label' // Add this layer under the map labels
      );
    }

    // Add the vector tile source and layer for bathymetry_contours_{selectedInterval}
    map.addSource('contours', {
      type: 'vector',
      promoteId: 'id',
      scheme: 'xyz',
      tiles: [
        `http://localhost:8081/collections/public.bathymetry_contours_${selectedInterval}/tiles/{z}/{x}/{y}?properties=id,depth_m`,
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
            0,
            '#6fb7db',
            7.5,
            '#4f8fb3',
            15,
            '#2f688b',
            22.5,
            '#1f4063',
            30,
            '#00204d',
          ],
        },
      },
      'building-number-label' // Add this layer under the map labels
    );

    // Add the symbol layer for the labels
    map.addLayer(
      {
        id: 'contour-labels',
        type: 'symbol',
        source: 'contours',
        'source-layer': 'default',
        layout: {
          'text-field': ['get', 'depth_m'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 12,
          'text-anchor': 'center',
          'symbol-placement': 'line',
          'text-offset': [0, 0.5],
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      },
      'building-number-label'
    ); // Add this layer under the map labels
  };

  useEffect(() => {
    // Initialize the map when the component is mounted (only once)
    mapRef.current = new mapboxgl.Map({
      accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      container: mapContainer.current as unknown as HTMLElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-122.50131047087203, 37.78496010360176],
      zoom: 12,
    });

    // Add zoom and rotation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    mapRef.current.on('load', () => {
      // Initially load the layer
      updateLayer();
      setIsMapLoaded(true);

      mapRef.current!.addSource('boundingBox', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-123.12680722333779, 37.304461713435416],
                [-123.12680722333779, 38.26545849376811],
                [-121.87581371840625, 38.26545849376811],
                [-121.87581371840625, 37.304461713435416],
                [-123.12680722333779, 37.304461713435416],
              ],
            ],
          },
        } as GeoJSON,
      });

      mapRef.current!.addLayer({
        id: 'boundingBoxLayer',
        type: 'line',
        source: 'boundingBox',
        paint: {
          'line-color': '#000',
          'line-width': 2,
        },
      });
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
          maxWidth: '200px',
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
          <p>
            Blue lines are created by my pipeline. When 1m is activated, USACE's
            contours show as red lines for comparison.
          </p>
        </div>
      </div>
    </div>
  );
}
