import React, { useEffect, useRef, useContext, useState } from 'react';
import ReactDOM from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { styled } from '@mui/system';
import MapLegend from './MapLegend';
import MapPopup from './MapPopup';
import BasemapSwitcher from './BasemapSwitcher';
import { User } from '../context';
import { useShiftSegmentStore } from '../store/shiftSegment';
import { useSelectedShiftStore } from '../store/selectedShift';
import { useMapStore } from '../store/map';
import { useShiftsStore } from '../store/shifts';
import { useLocaleStore } from '../store/locale';
import './Mapbox.css';
import { useShallow } from 'zustand/react/shallow';

const MapContainer = styled('div')`
    height: 100%;
    width: 100%;
`;

export default function Map() {
    const { accessToken } = useContext(User.State);
    const { lang, i18n } = useLocaleStore(
        useShallow((state) => ({
            lang: state.lang,
            i18n: state.i18n,
        }))
    );
    const ShiftsState = useShiftsStore((state) => state); // Shifts in store
    const mapContainer = useRef(null);

    // if layers have changed, it triggers the filtering
    const [layersHaveChanged, setLayersHaveChanged] = useState(false);

    // zoom state so that we can change the display etc based on the zoom
    const [mapZoom, setMapZoom] = useState();

    const [markers, setMarkers] = useState([]);

    // state to be input by the user to filter the map layers by vehicle_direction
    const [directionFilter, setDirectionFilter] = useState('Forward, Backward');

    const [selectedBasemap, setSelectedBasemap] = useState({
        name: i18n.monochromeLight,
        id: 'ckmahljkg3fuu17qiv3qkcnb8',
    });

    const activeYear = ShiftsState?.params.activeYear;
    
    const { mapState } = useMapStore(
        useShallow((state) => ({
            mapState: state.mapState,
        }))
    );

    const {
        isComparing,
        isSegmentSelected,
        addShiftSegmentEndpoints,
        comparableSegments,
        shiftSegmentTrackNumber,
    } = useShiftSegmentStore(
        useShallow((state) => ({
            isComparing: state.isComparing,
            isSegmentSelected: state.isSegmentSelected,
            addShiftSegmentEndpoints: state.addShiftSegmentEndpoints,
            comparableSegments: state.comparableSegments,
            shiftSegmentTrackNumber: state.shiftSegmentTrackNumber,
        }))
    );
    const { selectedShift, setSelectedShift } = useSelectedShiftStore(
        useShallow((state) => ({
            selectedShift: state.selectedShift,
            setSelectedShift: state.setSelectedShift,
        }))
    );

    // the useRef is needed so that we can access the latest states within callbacks such as the map on load and map on click
    const ShiftsStateRef = useRef(ShiftsState);
    useEffect(() => {
        ShiftsStateRef.current = ShiftsState.shifts;
    }, [ShiftsState.shifts]);
    const SelectedShiftStateRef = useRef();
    SelectedShiftStateRef.current = selectedShift;

    function addAllLayers(map) {
        // get layer ID of the boundary layer, we want to place the shift on top of that
        const layers = map.getStyle().layers;
        const layerIds = layers.map((layer) => {
            return layer.id;
        });
        let boundarylayername;
        layerIds.forEach((v) => {
            if (v.includes('admin')) {
                boundarylayername = v;
            }
        });

        // add data sources
        map.addSource('Shift', {
            type: 'vector',
            tiles: [
                `https://${import.meta.env.VITE_API_HOSTNAME}/api/getVectorTile?x={x}&y={y}&z={z}&layer=shift&fields=shift_id&code=${import.meta.env.VITE_API_KEY}&year=${activeYear}`,
            ],
        });
        map.addSource('GPSPoint', {
            type: 'vector',
            tiles: [
                `https://${import.meta.env.VITE_API_HOSTNAME}/api/getVectorTile?x={x}&y={y}&z={z}&layer=gps&fields=gps_id,active_nozzles,date_time,chainage,track_number,vehicle_direction,vehicle_speed,distance_cumul,weed_zone_density,spray_avg_state,spray_zone_chemical_quantity,spray_zone_chemical_area,shift_id&code=${import.meta.env.VITE_API_KEY}&year=${activeYear}`,
            ],
            generateId: true,
        });
        map.addSource('Spray', {
            type: 'vector',
            tiles: [
                `https://${import.meta.env.VITE_API_HOSTNAME}/api/getVectorTile?x={x}&y={y}&z={z}&layer=spray&fields=value,shift_id&code=${import.meta.env.VITE_API_KEY}&year=${activeYear}`,
            ],
        });
        map.addSource('Weed', {
            type: 'vector',
            tiles: [
                `https://${import.meta.env.VITE_API_HOSTNAME}/api/getVectorTile?x={x}&y={y}&z={z}&layer=weed&fields=value,shift_id&code=${import.meta.env.VITE_API_KEY}&year=${activeYear}`,
            ],
        });
        map.addSource('RestrictedArea', {
            type: 'vector',
            tiles: [
                `https://${import.meta.env.VITE_API_HOSTNAME}/api/getVectorTile?x={x}&y={y}&z={z}&layer=restricted_area&fields=restricted_area_id,label,company_id&code=${import.meta.env.VITE_API_KEY}&year=${activeYear}`,
            ],
        });

        // add the shifts
        map.addLayer(
            {
                id: 'Shift',
                type: 'line',
                source: 'Shift',
                'source-layer': 'Shift',
                maxzoom: 16,
                paint: {
                    // make lines wider as the user zooms in
                    'line-width': {
                        type: 'exponential',
                        base: 2,
                        stops: [
                            [0, 3],
                            [7, 6],
                            [15, 20],
                        ],
                    },
                    // style the shift lines by property
                    'line-color': '#e85b62',
                },
            },
            boundarylayername
        );
        // add the weedmap
        map.addLayer(
            {
                id: 'Weed',
                type: 'circle',
                source: 'Weed',
                'source-layer': 'Weed',
                minzoom: 17,
                layout: {
                    visibility: 'none',
                },
                paint: {
                    'circle-color': [
                        'interpolate',
                        ['linear'],
                        ['to-number', ['get', 'value']],
                        0,
                        'rgba(255, 255, 255, 0)', // Completely transparent at 0
                        0.01,
                        'rgba(229, 245, 224, 0.05)', // Slightly more opaque
                        0.25,
                        'rgba(128, 202, 126, 0.2)', // More opaque
                        0.5,
                        'rgba(60, 159, 57, 0.35)', // Halfway opacity
                        0.75,
                        'rgba(33, 111, 30, 0.45)', // More opaque
                        1,
                        'rgba(3, 86, 0, 0.6)', // Most opaque at 1
                    ],
                    'circle-stroke-width': 0,
                    // make circles larger as the user zooms in
                    'circle-radius': {
                        base: 5,
                        stops: [
                            [15, 1.5],
                            [22, 3],
                        ],
                    },
                },
            },
            boundarylayername
        );
        map.addLayer(
            {
                id: 'WeedHighlight',
                type: 'circle',
                source: 'Weed',
                'source-layer': 'Weed',
                minzoom: 17,
                layout: {
                    visibility: 'none',
                },
                paint: {
                    'circle-opacity': 0,
                    'circle-stroke-width': 4,
                    'circle-stroke-color': '#00ffff',
                    // make circles larger as the user zooms in
                    'circle-radius': {
                        base: 2.75,
                        stops: [
                            [12, 2],
                            [22, 30],
                        ],
                    },
                },
            },
            boundarylayername
        );

        // // Add the heatmap layer for Spray data
        // map.addLayer(
        //     {
        //         id: 'SprayHeatmap',
        //         type: 'heatmap',
        //         source: 'Spray', // Ensure this is the correct source for your Spray data
        //         'source-layer': 'Spray',
        //         minzoom: 12, // Set your desired minimum zoom level for the heatmap
        //         maxzoom: 16,
        //         paint: {
        //             // Define the color gradient for the heatmap
        //             'heatmap-color': [
        //                 'interpolate',
        //                 ['linear'],
        //                 ['heatmap-density'],
        //                 0,
        //                 'rgba(255, 255, 255, 0)', // Transparent for low density
        //                 0.2,
        //                 'rgba(255, 224, 178, 0.6)', // Lighter color for lower density
        //                 0.4,
        //                 'rgba(255, 159, 95, 0.8)', // Intermediate color
        //                 1,
        //                 'rgba(255, 95, 31, 0.95)', // Original fill color for high density
        //             ],
        //             // Adjust the heatmap radius based on zoom level
        //             'heatmap-radius': {
        //                 stops: [
        //                     [16, 15 * 0.55],
        //                     [22, 25 * 0.55],
        //                 ],
        //             },
        //             // Adjust the heatmap intensity
        //             'heatmap-intensity': {
        //                 stops: [
        //                     [16, 1],
        //                     [22, 3],
        //                 ],
        //             },
        //             // Heatmap opacity
        //             'heatmap-opacity': 0.75,
        //         },
        //     },
        //     boundarylayername
        // );
        // add the spraymap
        map.addLayer(
            {
                id: 'Spray',
                type: 'fill',
                source: 'Spray',
                'source-layer': 'Spray',
                minzoom: 16,
                layout: {
                    visibility: 'none',
                },
                paint: {
                    // Use a step expression to categorize the data into six intensity classes
                    'fill-color': 'rgba(237, 91, 95, 0.8)',
                    'fill-outline-color': 'rgba(237, 91, 95, 1)',
                },
            },
            boundarylayername
        );

        map.addLayer(
            {
                id: 'SprayHighlight',
                type: 'line',
                source: 'Spray',
                'source-layer': 'Spray',
                minzoom: 16,
                layout: {
                    visibility: 'none',
                },
                paint: {
                    'line-width': 4,
                    'line-color': '#00ffff',
                },
            },
            boundarylayername
        );

        // add the RestrictedArea highlight
        map.addLayer(
            {
                id: 'RestrictedAreaHighlight',
                type: 'fill',
                source: 'RestrictedArea',
                'source-layer': 'RestrictedArea',
                minzoom: 5,
                layout: {
                    visibility: 'none',
                },
                paint: {
                    'fill-outline-color': '#ed1313',
                    'fill-color': '#f55d5d',
                    'fill-opacity': 0.75,
                },
            },
            boundarylayername
        );

        // add the RestrictedArea
        map.addLayer(
            {
                id: 'RestrictedArea',
                type: 'fill',
                source: 'RestrictedArea',
                'source-layer': 'RestrictedArea',
                minzoom: 6,
                layout: {
                    visibility: 'none',
                },
                paint: {
                    'fill-outline-color': '#fb883b',
                    'fill-color': '#fbb03b',
                    'fill-opacity': 0.5,
                },
            },
            boundarylayername
        );

        // add the gps points symbolized for spraying
        map.addLayer(
            {
                id: 'GPSPoint',
                type: 'circle',
                source: 'GPSPoint',
                'source-layer': 'GPSPoint',
                minzoom: 8,
                paint: {
                    'circle-color': [
                        'case',
                        ['has', 'spray_avg_state'],
                        'rgba(144, 17, 243, 0.8)', // Color when spray_avg_state exists and is not 0
                        'rgba(232, 91, 98, 0.6)', // Fallback color for when spray_avg_state is missing (null or undefined)
                    ],
                    'circle-stroke-width': 0,
                    // make circles larger as the user zooms in
                    'circle-radius': {
                        base: 2,
                        stops: [
                            [14, 4],
                            [22, 30],
                        ],
                    },
                },
            },
            boundarylayername
        );

        map.addLayer(
            {
                id: 'GPSPointHighlight',
                type: 'circle',
                source: 'GPSPoint',
                'source-layer': 'GPSPoint',
                minzoom: 8,
                paint: {
                    'circle-opacity': 0,
                    'circle-stroke-color': '#00ffff',
                    'circle-stroke-width': 4,
                    'circle-radius': {
                        base: 1.75,
                        stops: [
                            [14, 4],
                            [22, 30],
                        ],
                    },
                },
                filter: ['in', 'gps_id', ''],
            },
            boundarylayername
        );

        setLayersHaveChanged(!layersHaveChanged);
    }

    function changeBasemap(map) {
        addAllLayers(map);
    }
    function basemapChangeListener() {
        changeBasemap(mapState);
    }

    const initMap = () => {
        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
        const mapboxGlMap = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/youssefberrada/ckmahljkg3fuu17qiv3qkcnb8',
            center: [9.9, 49.84],
            zoom: 3.5,
            attributionControl: false,
            preserveDrawingBuffer: true, // for the pdf export
            // use transformRequest to modify requests that begin with `http://myHost`
            transformRequest: (url, resourceType) => {
                if (resourceType === 'Tile' && url.includes('getVectorTile')) {
                    return {
                        url,
                        headers: { authorization: `Bearer ${accessToken}` },
                    };
                } else return { url };
            },
        });
        // initial setting of the zoom state
        setMapZoom(9);

        mapboxGlMap.addControl(
            new mapboxgl.AttributionControl({
                customAttribution:
                    "<a href='https://www.mapular.com' target='_blank'>Site by Mapular<img src='/mapular.favicon.ico' alt='Mapular' height='13' width='13' style='position: relative;top: 2px;margin-left: 3px;' /></a>",
            })
        );

        // Add zoom and rotation controls to the map.
        mapboxGlMap.addControl(new mapboxgl.NavigationControl());

        // Draw = new MapboxDraw({
        //     displayControlsDefault: false,
        //     controls: {
        //         polygon: true,
        //         trash: true,
        //     },
        // });
        // mapboxGlMap.addControl(Draw, 'top-right');
        // mapboxGlMap.on('draw.create', (e) => {
        //     // add the geom of the drawn polygon to state to filter the shifts by intersection
        //     const { setBboxShifts } = useShiftsStore.getState();
        //     setBboxShifts(e.features[0].geometry);
        // });

        // mapboxGlMap.on('draw.delete', () => {
        //     // clear the geom filter
        //     const { setBboxShifts } = useShiftsStore.getState();
        //     setBboxShifts(null);
        // });

        // // make sure that the user can only create one polygon at a time
        // mapboxGlMap.on('draw.modechange', () => {
        //     const data = Draw.getAll();
        //     if (Draw.getMode() === 'draw_polygon') {
        //         const pids = [];

        //         // ID of the added template empty feature
        //         const lid = data.features[data.features.length - 1].id;

        //         data.features.forEach((f) => {
        //             if (f.geometry.type === 'Polygon' && f.id !== lid) {
        //                 pids.push(f.id);
        //             }
        //         });
        //         Draw.delete(pids);
        //     }
        // });

        mapboxGlMap.on('load', () => {
            addAllLayers(mapboxGlMap);
            // when clicking on the whole shifts layer, fly to it and set the selected shift
            mapboxGlMap.on('click', 'Shift', (e) => {
                if (
                    e.features.length &&
                    e.features[0].properties &&
                    e.features[0].properties.shift_id
                ) {
                    // get the shift data from the shifts context
                    if (ShiftsStateRef.current) {
                        const filteredShift = ShiftsStateRef.current.find(
                            (shift) =>
                                shift.shiftID ===
                                e.features[0].properties.shift_id
                        );
                        if (filteredShift) {
                            setSelectedShift(filteredShift);
                            mapboxGlMap.fitBounds(filteredShift.clean.bounds, {
                                padding: 20,
                            });
                        }
                    }
                }
            });

            // iterate some layer names and make the layers have a pointer cursor when hovered
            ['GPSPoint', 'Spray', 'Shift', 'RestrictedArea'].forEach((lr) => {
                // Change the cursor to a pointer when the mouse is over the shift-points layer.
                mapboxGlMap.on('mouseenter', lr, () => {
                    mapboxGlMap.getCanvas().style.cursor = 'pointer';
                });
                // Change it back to a pointer when it leaves.
                mapboxGlMap.on('mouseleave', lr, () => {
                    mapboxGlMap.getCanvas().style.cursor = '';
                });
            });

            mapboxGlMap.on('zoomend', () => {
                setMapZoom(mapboxGlMap.getZoom().toFixed(2));
            });

            // set the map context now that the map has been initialised
            useMapStore.setState({
                mapState: mapboxGlMap,
            });
        });
    };

    useEffect(() => {
        // create the map
        if (!mapState && accessToken) initMap();
    }, [accessToken, mapState]);

    useEffect(() => {
        if (mapState) {
            const mapLayer = mapState.getLayer('baselineSegment');
            if (typeof mapLayer !== 'undefined') {
                // Remove map layer & source.
                mapState
                    .removeLayer('baselineSegment')
                    .removeSource('baselineSegment');
            }
            if (
                comparableSegments &&
                Object.entries(comparableSegments).length !== 0
            ) {
                mapState.addSource('baselineSegment', {
                    type: 'geojson',
                    data: comparableSegments.baseline_segment.geometry,
                });
                mapState.addLayer(
                    {
                        id: 'baselineSegment',
                        type: 'line',
                        source: 'baselineSegment',
                        paint: {
                            'line-width': 9,
                            'line-color': '#e0218a',
                        },
                    },
                    'GPSPoint' // add this layer under GPS points
                );
            }
        }
    }, [comparableSegments, mapState]);

    function addMapPopupListener(e) {
        const layers = ['GPSPoint', 'Spray', 'RestrictedArea'];
        const f = mapState.queryRenderedFeatures(e.point, {
            layers,
        });
        // get coordinates of mouse click
        const coordinates = e.lngLat;
        if (f.length) {
            const feature = f[0]; // top layer
            const currentLayerId = `${feature.layer.id}Id`;
            layers.forEach((layer) => {
                if (layer === feature.layer.id) {
                    Object.entries(feature.properties).forEach(
                        ([key, value]) => {
                            if (key === currentLayerId) {
                                mapState.setFilter(
                                    `${feature.layer.id}Highlight`,
                                    ['in', currentLayerId, value]
                                );
                            }
                        }
                    );
                } else {
                    mapState.setFilter(`${layer}Highlight`, [
                        'in',
                        `${layer}Id`,
                        '',
                    ]);
                }
            });
            // create popup node
            // eslint-disable-next-line no-undef
            const popupNode = document.createElement('div');
            const root = ReactDOM.createRoot(popupNode);
            root.render(<MapPopup feature={feature} />);
            // set popup on map
            new mapboxgl.Popup({ offset: 15, anchor: 'left' })
                .setLngLat(coordinates)
                .setDOMContent(popupNode)
                .addTo(mapState);

            mapState.flyTo({
                center: e.lngLat,
                essential: true,
            });
        } else {
            // handle clickaway -> clear filter
            layers.forEach((layer) => {
                mapState.setFilter(`${layer}Highlight`, [
                    'in',
                    `${layer}Id`,
                    '',
                ]);
            });
        }
    }

    useEffect(() => {
        // add popup to the topmost layer
        if (mapState && !isComparing) {
            mapState.on('click', addMapPopupListener);
            return () => mapState.off('click', addMapPopupListener);
        }
    }, [mapState, isComparing]);

    function shiftEndPointListener(e) {
        // const layers = ['GPSPoint'];
        const f = mapState.queryRenderedFeatures(e.point, {
            layers: ['GPSPoint'],
        });
        if (f.length) {
            const feature = f[0];
            const coords = {
                lng: feature.geometry.coordinates[0],
                lat: feature.geometry.coordinates[1],
            };
            // const coords = e.lngLat;
            const marker = new mapboxgl.Marker();
            setMarkers((prevState) => [...prevState, marker]);
            marker.setLngLat(coords).addTo(mapState);
            addShiftSegmentEndpoints(feature.properties.gps_id);
            // set vehicle_direction filter to align with the selected GPS point
            const dir = feature.properties.vehicle_direction.substring(
                feature.properties.vehicle_direction.indexOf('_') + 1
            );
            const directionString =
                dir.charAt(0).toUpperCase() + dir.slice(1).toLowerCase();
            setDirectionFilter(directionString);
            useShiftSegmentStore.setState({
                shiftSegmentvehicle_direction: directionString,
            });
            useShiftSegmentStore.setState({
                shiftSegmentTrackNumber: feature.properties.track_number,
            });
        }
    }

    useEffect(() => {
        if (mapState && isComparing && !isSegmentSelected) {
            // if we are in compare mode and our segment state has less than two end points
            // add markers
            mapState.on('click', shiftEndPointListener);
            return () => mapState.off('click', shiftEndPointListener);
        } else if (
            mapState &&
            !isComparing &&
            !isSegmentSelected &&
            markers.length > 0
        ) {
            // remove markers if we are not in comparing mode anymore
            markers.forEach((marker) => marker.remove());

            // also remove layers we don't want to show anymore
            const mapLayer = mapState.getLayer('SegmentKPIs');
            if (typeof mapLayer !== 'undefined') {
                // Remove map layer & source.
                mapState.removeLayer('rowNumber');
                mapState.removeLayer('SegmentKPIs').removeSource('SegmentKPIs');
            }
        }
    }, [mapState, isComparing, isSegmentSelected]);

    // change mapstyle
    useEffect(() => {
        if (mapState) {
            const currentStyle = mapState.getStyle();
            // check if the selected basemap is already the currenlty used one
            // this prevents to overwrite style on initial load
            if (!currentStyle.sprite.includes(selectedBasemap.id)) {
                const selectedBasemapRef = `mapbox://styles/youssefberrada/${selectedBasemap.id}`;
                mapState.setStyle(selectedBasemapRef);
                mapState.on('style.load', basemapChangeListener);
                return () => mapState.off('style.load', basemapChangeListener);
            }
        }
    }, [mapState, selectedBasemap]);

    // effect for filtering/unfiltering the spray, weed, gps points, and shift layers
    useEffect(() => {
        if (mapState && ShiftsState && Array.isArray(ShiftsState.shifts) && ShiftsState.shifts.length > 0) {
            // create the initial filter  based on attribute and spatial filters
            const ShiftIdsToDisplay = ShiftsState.shifts.map(
                (obj) => obj.shiftID
            );
            const bidirectionalFilter = [
                'in',
                'shift_id',
                ...ShiftIdsToDisplay,
            ];
            const forwardFilter = [
                'all',
                ['in', 'shift_id', ...ShiftIdsToDisplay],
                ['in', 'vehicle_direction', 'DIRECTION_FORWARD'],
            ];

            const backwardFilter = [
                'all',
                ['in', 'shift_id', ...ShiftIdsToDisplay],
                ['in', 'vehicle_direction', 'DIRECTION_BACKWARD'],
            ];

            // there is a shift selected
            if (selectedShift) {
                const selectedFilter = [
                    'in',
                    'shift_id',
                    selectedShift.shiftID,
                ];
                // Filter direction-naive layers by shift id
                mapState.setFilter('Spray', selectedFilter);
                mapState.setFilter('Weed', selectedFilter);
                // shift selected and no vehicle_direction filter
                if (directionFilter === 'Forward, Backward') {
                    mapState.setFilter('Shift', selectedFilter);
                    mapState.setFilter('GPSPoint', selectedFilter);
                    // shift selected and forward vehicle_direction filter
                } else if (directionFilter === 'Forward') {
                    let filter = [
                        'all',
                        selectedFilter,
                        ['in', 'shift_id', ...ShiftIdsToDisplay],
                        ['in', 'vehicle_direction', 'DIRECTION_FORWARD'],
                    ];
                    if (shiftSegmentTrackNumber) {
                        filter = [
                            'all',
                            selectedFilter,
                            ['in', 'shift_id', ...ShiftIdsToDisplay],
                            ['in', 'vehicle_direction', 'DIRECTION_FORWARD'],
                            ['in', 'track_number', shiftSegmentTrackNumber],
                        ];
                    }
                    mapState.setFilter('Shift', selectedFilter);
                    mapState.setFilter('GPSPoint', filter);
                    // shift selected and backward vehicle_direction filter
                } else if (directionFilter === 'Backward') {
                    let filter = [
                        'all',
                        selectedFilter,
                        ['in', 'shift_id', ...ShiftIdsToDisplay],
                        ['in', 'vehicle_direction', 'DIRECTION_BACKWARD'],
                    ];
                    if (shiftSegmentTrackNumber) {
                        filter = [
                            'all',
                            selectedFilter,
                            ['in', 'shift_id', ...ShiftIdsToDisplay],
                            ['in', 'vehicle_direction', 'DIRECTION_BACKWARD'],
                            ['in', 'track_number', shiftSegmentTrackNumber],
                        ];
                    }
                    mapState.setFilter('Shift', selectedFilter);
                    mapState.setFilter('GPSPoint', filter);
                }
                // there is no shift selected
            } else {
                // no shift selected and no vehicle_direction filter
                if (directionFilter === 'Forward, Backward') {
                    mapState.setFilter('Shift', bidirectionalFilter);
                    mapState.setFilter('GPSPoint', bidirectionalFilter);
                    // no shift selected and forward vehicle_direction filter
                } else if (directionFilter === 'Forward') {
                    mapState.setFilter('Shift', bidirectionalFilter);
                    mapState.setFilter('GPSPoint', forwardFilter);
                    // no shift selected and backward vehicle_direction filter
                } else if (directionFilter === 'Backward') {
                    mapState.setFilter('Shift', bidirectionalFilter);
                    mapState.setFilter('GPSPoint', backwardFilter);
                }
            }
        }
        // setIsInitialLoad(false);
    }, [
        directionFilter,
        ShiftsState?.shifts,
        selectedShift,
        layersHaveChanged,
        shiftSegmentTrackNumber,
    ]);

    // update the map label language when locale language changes
    useEffect(() => {
        if (mapState) {
            mapState.getStyle().layers.forEach((thisLayer) => {
                if (thisLayer.id.indexOf('-label') > 0) {
                    mapState.setLayoutProperty(thisLayer.id, 'text-field', [
                        'get',
                        `name_${lang}`,
                    ]);
                }
            });
        }
    }, [lang]);

    // update the map layers when the selected year changes
    useEffect(() => {
        if (mapState) {
            // because the layers are vector tiles we cannot simply
            // setData like we could for a geojson source.
            /*
            // One option would be to:
            // 1. remove layers
            // 2. remove sources
            // 3. add sources using new url
            // 4. add layers referencing new sources
            const sources = [
                'Shift',
                'GPSPoint',
                'Spray',
                'Weed',
            ];
            const layers = [
                'Shift',
                'GPSPoint',
                'Spray',
                'Weed',
                'SprayHighlight',
                'WeedHighlight',
                'gpsHighlight',
            ];
            layers.forEach((l) => {
                mapState.removeLayer(l);
            });
            sources.forEach((l) => {
                mapState.removeSource(l);
            });
            */

            // doing the above method would mean doing a lot of what is done in initMap()
            // to opt for simplicity (while losing performance due to reloading the map)
            // I have simply re-called initMap()
            initMap();
        }
    }, [activeYear]);

    return (
        <>
            <MapContainer id="mapContainer" ref={mapContainer}>
                {selectedBasemap && (
                    <BasemapSwitcher
                        {...selectedBasemap}
                        setSelectedBasemap={setSelectedBasemap}
                    />
                )}
            </MapContainer>
            <MapLegend
                mapZoom={mapZoom}
                directionFilter={directionFilter}
                setDirectionFilter={setDirectionFilter}
            />
        </>
    );
}
