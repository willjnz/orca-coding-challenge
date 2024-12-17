import { memo, useEffect, useRef, useState } from 'react';
import mapboxgl, { GeoJSONFeature, Map } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Box from '@mui/material/Box';
import { TSetSelectedStationId, TMapRef } from '../interfaces';
import { Typography } from '@mui/material';

const handleStationClick = (
  feature: GeoJSONFeature,
  setSelectedStationId: TSetSelectedStationId,
  mapRefCurrent: Map
) => {
  if (feature && mapRefCurrent) {
    const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
      number,
      number,
    ];
    mapRefCurrent.flyTo({
      center: coordinates,
      zoom: 15,
    });

    setSelectedStationId(feature.properties!.id as string);
  }
};

// // TODO: what does this handleTerrainLayer "handle"?
// function handleTerrainLayer(mapRefCurrent: Map) {
//     if (!mapRefCurrent.getSource('mapbox-dem')) {
//       mapRefCurrent.addSource('mapbox-dem', {
//         type: 'raster-dem',
//         url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
//         tileSize: 512,
//         maxzoom: 14,
//       });
//     }
//     mapRefCurrent.setTerrain({ source: 'mapbox-dem', exaggeration: 5 });
// }

function MapView(props: {
  mapRef: TMapRef;
  setSelectedStationId: TSetSelectedStationId;
}): JSX.Element {
  const { mapRef, setSelectedStationId } = props;

  const mapContainer = useRef<string | HTMLElement | null>(null);

  const mapVariable = 'ground_water_level_m_above_sealevel_avg';
  // const [mapVariable, _setMapVariable] = useState('ground_water_level_m_above_sealevel_avg');

  const [yearMonth, setYearMonth] = useState('2015-01');

  function countUp(
    startDate: string,
    endDate: string,
    callback: (date: string) => void
  ) {
    // Parse the start and end dates
    let currentDate = new Date(`${startDate}-01`);
    const finalDate = new Date(`${endDate}-01`);

    // Interval to count up
    const interval = setInterval(() => {
      // Format current date as YYYY-MM
      const formattedDate = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}`;

      // Call the callback with the current date
      callback(formattedDate);

      // Stop when we reach the end date
      if (currentDate >= finalDate) {
        clearInterval(interval);
      }

      // Increment the month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }, 2000);

    return interval; // Return the interval so it can be cleared if needed
  }

  useEffect(() => {
    // on load, render the map
    if (!mapContainer.current) return;

    // const initMap = () => {
    const mapboxAccessToken = import.meta.env
      .VITE_MAPBOX_ACCESS_TOKEN as string;
    if (!mapboxAccessToken) {
      console.error('Mapbox access token is not set in environment variables');
      return;
    }

    mapboxgl.accessToken = mapboxAccessToken;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/orbicaeu/clzs3lv2j00ek01nz2wu0f5oo',
      center: [12.8105, 52.616],
      zoom: 7,
    });

    mapRef.current.on('style.load', () => {
      // Add source and layer whenever base style is loaded (e.g. on load, or changing the basemap)
      // TODO: make these layers part of the basemap so they don't need to be added dynamically here
      console.log('Map and source loaded');

      // handleTerrainLayer(mapRef.current);
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    mapRef.current.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 80, unit: 'metric' }),
      'bottom-left'
    );
    // };
    // if (!mapRef || !mapRef.current) initMap();

    return () => {
      if (mapRef && mapRef.current) {
        console.log('Cleaning up map');
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Start the interval when the component mounts
    // TODO: this happens for the first timepoint before the map is ready
    const interval = countUp('2015-01', '2017-03', (date: string) => {
      setYearMonth(date);
    });

    // Clear the interval when the component unmounts
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // TODO: add a nice check to see if the map style is rendered
    try {
      // remove source and layers to be updated
      if (mapRef.current!.getSource('measuring_stations_tipg')) {
        mapRef.current!.removeLayer('measuring_stations_tipg');
        mapRef.current!.removeLayer('measuring_stations_tipg_highlight');
        mapRef.current!.removeLayer('measuring_stations_tipg_selected');
        mapRef.current!.removeSource('measuring_stations_tipg');
      }
      // add a vector tile layer from tipg
      mapRef.current!.addSource('measuring_stations_tipg', {
        type: 'vector',
        promoteId: 'id',
        scheme: 'xyz',
        tiles: [
          `${import.meta.env.VITE_TIPG_URL}collections/public.ground_water_level_monthly_with_geom/tiles/{z}/{x}/{y}?properties=id,${mapVariable}&limit=5000&year_month=${yearMonth}`, // todo: add &datetime-column=aktueller_gws_zeitpunkt
        ],
      });
      mapRef.current!.addLayer({
        id: 'measuring_stations_tipg',
        type: 'circle',
        source: 'measuring_stations_tipg',
        'source-layer': 'default',
        paint: {
          'circle-radius': 4,
          'circle-color': [
            'interpolate',
            ['linear'],
            ['to-number', ['get', mapVariable]],
            -1.3922,
            '#FFEDA0',
            82.717625,
            '#FEB24C',
            165.43525,
            '#F03B20',
            // TODO: get the data range from a new azure function so that we can symobolize a layer nicely
            // // TODO: style this based on the mapVariable
            // 0,
            // 'rgba(255, 1, 1, 1)', // Extrem niedrig (< 5. Perzentil)
            // 5,
            // 'rgba(255, 1, 1, 1)', // Extrem niedrig (< 5. Perzentil)
            // 15,
            // 'rgba(254, 71, 72, 1)', // Sehr niedrig (> 5. - 15. Perzentil)
            // 25,
            // 'rgba(254, 71, 72, 1)', // Niedrig (> 15. - 25. Perzentil)
            // 50,
            // 'rgba(227, 165, 192, 1)', // Normal (> 25. - 75. Perzentil)
            // 75,
            // 'rgba(138, 130, 247, 1)', // Hoch (> 75. - 85. Perzentil)
            // 85,
            // 'rgba(72, 71, 254, 1)', // Sehr hoch (> 85. - 95. Perzentil)
            // 95,
            // 'rgba(72, 71, 254, 1)', // Sehr hoch (> 85. - 95. Perzentil)
            // 100,
            // 'rgba(0, 2, 255, 1)', // Extrem hoch (> 95. Perzentil)
            // 'rgba(128, 128, 128, 1)', // Default color if no match (optional)
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
      });
      mapRef.current!.addLayer({
        id: 'measuring_stations_tipg_highlight',
        type: 'circle',
        source: 'measuring_stations_tipg',
        'source-layer': 'default',
        paint: {
          'circle-radius': 7,
          'circle-color': '#00ffff',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
        filter: ['==', 'id', ''], // Initially no point is highlighted
      });

      mapRef.current!.addLayer({
        id: 'measuring_stations_tipg_selected',
        type: 'circle',
        source: 'measuring_stations_tipg',
        'source-layer': 'default',
        paint: {
          'circle-radius': 12,
          'circle-color': '#00ffff',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
        filter: ['==', 'id', ''], // Initially no point is highlighted
      });

      mapRef.current!.on('click', 'measuring_stations_tipg', function (e) {
        // Get the features at the clicked location
        const features = mapRef.current!.queryRenderedFeatures(e.point, {
          layers: ['measuring_stations_tipg'],
        });

        if (features.length > 0) {
          // Do something with the clicked feature/s
          const feature = features[0]; // TODO: handle overlapping points
          handleStationClick(feature, setSelectedStationId, mapRef.current!);

          // Update the highlight layer to display the hovered point
          mapRef.current!.setFilter('measuring_stations_tipg_selected', [
            '==',
            'id',
            feature.properties!.id,
          ]);
        }
      });

      // Change cursor to pointer on mouse enter over the measuring_stations_tipg layer
      mapRef.current!.on('mouseenter', 'measuring_stations_tipg', (e) => {
        mapRef.current!.getCanvas().style.cursor = 'pointer';

        // Get the feature under the mouse
        const features = mapRef.current!.queryRenderedFeatures(e.point, {
          layers: ['measuring_stations_tipg'],
        });

        if (features.length > 0) {
          const feature = features[0]; // Get the hovered feature

          // Update the highlight layer to display the hovered point
          mapRef.current!.setFilter('measuring_stations_tipg_highlight', [
            '==',
            'id',
            feature.properties!.id,
          ]);
        }
      });
      // Reset cursor to default when mouse leaves the measuring_stations_tipg layer
      mapRef.current!.on('mouseleave', 'measuring_stations_tipg', () => {
        mapRef.current!.getCanvas().style.cursor = ''; // Reset cursor to default
        mapRef.current!.setFilter('measuring_stations_tipg_highlight', [
          '==',
          'id',
          '',
        ]); // Remove highlight by resetting filter
      });
    } catch (e) {
      console.log(e);
    }
  }, [yearMonth]);

  return (
    <>
      <Box
        sx={{ height: '100%', width: '100%', position: 'relative' }}
        ref={mapContainer}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '30px',
          right: '50px',
          zIndex: 9999,
          background: '#fff',
          p: 2,
          borderRadius: '4px',
          boxShadow: '0 0 0 2px rgba(0, 0, 0, .1)',
        }}
      >
        <Typography>Zeit: {yearMonth}</Typography>
      </Box>
    </>
  );
}

export default memo(MapView, () => false);
