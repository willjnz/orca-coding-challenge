import { useState, useReducer, memo, useCallback } from 'react';
import { Typography, Box, Collapse, Tooltip, IconButton } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import {
  ILegendLayer,
  ILegendState,
  TLegendTypes,
  TMapRef,
} from '../interfaces';
import styles from './MapLegend.module.css';
import { LegendSymbol } from './elements';

// use useReducer because it can be more efficient than useState.
const initialState: ILegendState = {
  groups: {
    Aktuell: {
      label: 'Aktuell',
      expanded: true,
      layers: {
        'gws-latest': {
          id: 'gws-latest',
          label: 'Grundwasserstand',
          expanded: true,
          visible: true,
          tooltip: 'Referenzzeitraum 1991 - 2020',
          type: 'POINT',
          mapLayers: [
            'measuring_stations_tipg',
            'measuring_stations_tipg_highlight',
            'measuring_stations_tipg_selected',
          ],
          symbology: [
            { label: 'Extrem hoch (> 95. Perzentil)', color: '#0002ff' },
            { label: 'Sehr hoch (> 85. - 95. Perzentil)', color: '#4847fe' },
            { label: 'Hoch (> 75. - 85. Perzentil)', color: '#8a82f7' },
            { label: 'Normal (> 25. - 75. Perzentil)', color: '#e3a5c0' },
            { label: 'Niedrig (> 15. - 25. Perzentil)', color: '#fe4748' },
            { label: 'Sehr niedrig (> 5. - 15. Perzentil)', color: '#ff0101' },
            { label: 'Extrem niedrig (< 5. Perzentil)', color: '#ff0101' },
            { label: 'Null', color: '#808080' },
            { label: 'Multiple Points Overlapping', color: '#000' },
          ],
        },
        // {
        //   id: 'gws-diff-latest',
        //   label: 'Grundwasserstandsabweichung',
        //   expanded: true,
        //   visible: false,
        //   // tooltip: '',
        //   type: 'POINT',
        //   symbology: [
        //     {
        //       label: '1',
        //       color: '#dd3130',
        //     },
        //     {
        //       label: '2',
        //       color: '#ebbcbc',
        //     },
        //   ],
        // },
        // {
        //   id: 'leitf_cl-latest',
        //   label: 'Versalzung',
        //   expanded: true,
        //   visible: false,
        //   // tooltip: '',
        //   type: 'POINT',
        //   symbology: [
        //     {
        //       label: '1',
        //       color: '#dd3130',
        //     },
        //     {
        //       label: '2',
        //       color: '#ebbcbc',
        //     },
        //   ],
        // },
      },
    },
    // 'Saisonale Vorhersage': [
    //   {
    //     id: 'gws-prediction',
    //     label: 'Grundwasserstand',
    //     expanded: true,
    //     visible: false,
    //     // tooltip: '',
    //     type: 'POINT',
    //     symbology: [
    //       {
    //         label: '1',
    //         color: '#dd3130',
    //       },
    //       {
    //         label: '2',
    //         color: '#ebbcbc',
    //       },
    //     ],
    //   },
    //   {
    //     id: 'gws-diff-prediction',
    //     label: 'Grundwasserstandsabweichung',
    //     expanded: true,
    //     visible: false,
    //     // tooltip: '',
    //     type: 'POINT',
    //     symbology: [
    //       {
    //         label: '1',
    //         color: '#dd3130',
    //       },
    //       {
    //         label: '2',
    //         color: '#ebbcbc',
    //       },
    //     ],
    //   },
    //   {
    //     id: 'leitf_cl-prediction',
    //     label: 'Versalzung',
    //     expanded: true,
    //     visible: false,
    //     // tooltip: '',
    //     type: 'POINT',
    //     symbology: [
    //       {
    //         label: '1',
    //         color: '#dd3130',
    //       },
    //       {
    //         label: '2',
    //         color: '#ebbcbc',
    //       },
    //     ],
    //   },
    // ],
    // Szenarien: [
    //   {
    //     id: 'klimaszenarien-2100',
    //     label: 'Klimaszenarien (Langfristprojektionen bis 2100)',
    //     expanded: true,
    //     visible: false,
    //     // tooltip: '',
    //     type: 'POINT',
    //     symbology: [
    //       {
    //         label: '1',
    //         color: '#dd3130',
    //       },
    //       {
    //         label: '2',
    //         color: '#ebbcbc',
    //       },
    //     ],
    //   },
    //   {
    //     id: 'gws-extraction',
    //     label: 'Grundwasserentnahmen',
    //     expanded: true,
    //     visible: false,
    //     // tooltip: '',
    //     type: 'POINT',
    //     symbology: [
    //       {
    //         label: '1',
    //         color: '#dd3130',
    //       },
    //       {
    //         label: '2',
    //         color: '#ebbcbc',
    //       },
    //     ],
    //   },
    //   {
    //     id: 'agricultural-irrigation',
    //     label: 'Landwirtschaftliche Bewässerung',
    //     expanded: true,
    //     visible: false,
    //     // tooltip: '',
    //     type: 'POINT',
    //     symbology: [
    //       {
    //         label: '1',
    //         color: '#dd3130',
    //       },
    //       {
    //         label: '2',
    //         color: '#ebbcbc',
    //       },
    //     ],
    //   },
    // ],
    Andere: {
      label: 'Andere',
      expanded: true,
      layers: {
        'gw-flurabstand': {
          id: 'gw-flurabstand',
          label: 'Grundwasserflurabstand',
          expanded: true,
          visible: true,
          // tooltip: '',
          type: 'POLYGON',
          symbology: [
            {
              label: 'Klasse 1',
              color: '#C94D4D',
            },
            {
              label: 'Klasse 2',
              color: '#D4754C',
            },
            {
              label: 'Klasse 3',
              color: '#DE914E',
            },
            {
              label: 'Klasse 4',
              color: '#E7AA4D',
            },
            {
              label: 'Klasse 5',
              color: '#F2C64E',
            },
            {
              label: 'Klasse 6',
              color: '#F7E14D',
            },
            {
              label: 'Klasse 7',
              color: '#FFFF4D',
            },
            {
              label: 'Klasse 8',
              color: '#DEE74D',
            },
            {
              label: 'Klasse 9',
              color: '#C4D64D',
            },
            {
              label: 'Klasse 10',
              color: '#A9C24E',
            },
            {
              label: 'Klasse 11',
              color: '#8FB04D',
            },
            {
              label: 'Klasse 12',
              color: '#7A9E4D',
            },
            {
              label: 'Klasse 13',
              color: '#638F4C',
            },
          ],
        },
        wasserschutzgebiete: {
          id: 'wasserschutzgebiete',
          label: 'Wasserschutzgebiete',
          expanded: true,
          visible: true,
          // // tooltip: '',
          type: 'POLYGON',
          symbology: [
            {
              label: 'Zone I',
              color: '#4A4DEF',
            },
            {
              label: 'Zone II',
              color: '#BDC3E7',
            },
            {
              label: 'Zone III',
              color: '#BDEFFF',
            },
            {
              label: 'Zone III A',
              color: '#94E3F7',
            },
            {
              label: 'Zone III B',
              color: '#DEEFFF',
            },
          ],
        },
        'GWVersalz-Atlas25a': {
          id: 'GWVersalz-Atlas25a',
          label: 'Grundwasserversalzung (Atlas Brandenburg)',
          expanded: true,
          visible: true,
          // tooltip: '',
          type: 'POLYGON',
          mapLayers: ['GWVersalz-Atlas25a', 'GWVersalz-Atlas25a-line'],
          symbology: [
            {
              label:
                'Südgrenze zusammenhängender Salzwasserverbreitung im präquartären Untergrund',
              color: '#ff0000',
              type: 'LINE',
            },
            {
              label: 'Salzwasser oberhalb Rupelton',
              color: '#FFE5E5',
              type: 'POLYGON',
            },
            {
              label: 'Salzwasser flächenhaft oberhalb NN',
              color: '#990000',
              type: 'POLYGON',
            },
          ],
        },
        'Rinnen-Atlas25b': {
          id: 'Rinnen-Atlas25b',
          label: 'Rinnen Atlas25',
          expanded: true,
          visible: true,
          // tooltip: '',
          type: 'POLYGON',
          mapLayers: ['Rinnen-Atlas25b-line', 'Rinnen-Atlas25b'],
          symbology: [
            {
              label: 'Rupelton reduziert',
              color: '#b7b7b7',
              type: 'POLYGON',
            },
            {
              label: 'Rupelton ausgeräumt',
              color: '#ffffff',
              type: 'POLYGON',
            },
            {
              label: 'Südgrenze des tonigen Rupeltons',
              color: '#000000',
              type: 'LINE',
            },
            {
              label: 'Flächenhafte Verbreitung des Rupeltons',
              color: '#7f7f7f',
              type: 'POLYGON',
            },
          ],
        },
      },
    },
  },
};

function reducer(
  state: ILegendState,
  action: { type: string; groupId: string; layerId?: string }
) {
  switch (action.type) {
    case 'TOGGLE_VISIBILITY': {
      const { groupId, layerId } = action;
      if (!layerId) {
        throw new Error('Missing layerId in action');
      }
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...state.groups[groupId],
            layers: {
              ...state.groups[groupId].layers,
              [layerId]: {
                ...state.groups[groupId].layers[layerId],
                visible: !state.groups[groupId].layers[layerId].visible,
              },
            },
          },
        },
      };
    }
    case 'TOGGLE_EXPANDED_LAYER': {
      const { groupId, layerId } = action;
      if (!layerId) {
        throw new Error('Missing layerId in action');
      }
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...state.groups[groupId],
            layers: {
              ...state.groups[groupId].layers,
              [layerId]: {
                ...state.groups[groupId].layers[layerId],
                expanded: !state.groups[groupId].layers[layerId].expanded,
              },
            },
          },
        },
      };
    }
    case 'TOGGLE_EXPANDED_GROUP': {
      const { groupId } = action;
      return {
        ...state,
        groups: {
          ...state.groups,
          [groupId]: {
            ...state.groups[groupId],
            expanded: !state.groups[groupId].expanded,
          },
        },
      };
    }
    default:
      return state;
  }
}

const LayerToggle = memo(
  (props: {
    layer: ILegendLayer;
    groupId: string;
    toggleVisibility: TToggleVisibility;
    toggleMapVisibility: TToggleMapVisibility;
  }) => {
    const { layer, groupId, toggleVisibility, toggleMapVisibility } = props;
    // TODO: make alternative layers radio buttons
    // {layerGroupName === 'Aktuell' || layerGroupName === 'Saisonale Vorhersage' ? (
    //     <VisibilityRadioSwitch />) : (<VisibilitySwitch />
    //  )}
    return (
      <label>
        <input
          type="checkbox"
          checked={layer.visible}
          onChange={() => {
            toggleMapVisibility(!layer.visible, layer.mapLayers || [layer.id]);
            toggleVisibility(groupId, layer.id);
          }}
        />
        {layer.label}
      </label>
    );
  }
);

const ExpandToggle = memo(
  (props: { id: string; expanded: boolean; toggle: any }) => {
    const { id, expanded, toggle } = props;
    return (
      <IconButton
        onClick={() => toggle(id)}
        size="small"
        sx={{ marginLeft: '8px' }}
      >
        {expanded ? (
          <ExpandMoreIcon sx={{ height: '16px', width: '16px' }} />
        ) : (
          <ExpandLessIcon sx={{ height: '16px', width: '16px' }} />
        )}
      </IconButton>
    );
  }
);

type TToggleVisibility = (groupId: string, layerId: string) => void;
type TToggleMapVisibility = (
  layerVisibility: boolean,
  mapLayers: string[]
) => void;

function MapLegend(props: { mapRef: TMapRef }): JSX.Element {
  const { mapRef } = props;
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLegendOpen, setIsLegendOpen] = useState(true);

  const toggleVisibility: TToggleVisibility = useCallback(
    (groupId, layerId) => {
      dispatch({ type: 'TOGGLE_VISIBILITY', groupId, layerId });
    },
    []
  );

  const toggleExpandedLayer = useCallback(
    (groupId: string, layerId: string) => {
      dispatch({ type: 'TOGGLE_EXPANDED_LAYER', groupId, layerId });
    },
    []
  );

  const toggleExpandedGroup = useCallback((groupId: string) => {
    dispatch({ type: 'TOGGLE_EXPANDED_GROUP', groupId });
  }, []);

  const toggleMapVisibility: TToggleMapVisibility = (
    layerVisibility,
    mapLayers
  ) => {
    mapLayers.forEach((id) =>
      mapRef.current?.setLayoutProperty(
        id,
        'visibility',
        layerVisibility ? 'visible' : 'none'
      )
    );
  };

  return (
    <div className={styles.legendContainer}>
      <div className={styles.legendHeader}>
        <Typography variant="h5">Legende</Typography>
        <IconButton
          onClick={() => setIsLegendOpen(!isLegendOpen)}
          size="small"
          sx={{ padding: 0 }}
        >
          {isLegendOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </div>
      <Collapse in={isLegendOpen} className={styles.legendMain}>
        <Box className={styles.legendContent}>
          {Object.entries(state.groups).map(([groupId, group]) => (
            <div key={groupId} className={styles.legendGroupContainer}>
              <div className={styles.legendGroupHeading}>
                <Typography variant="h6">{group.label}</Typography>
                <ExpandToggle
                  id={groupId}
                  expanded={group.expanded}
                  toggle={() => toggleExpandedGroup(groupId)}
                />
              </div>
              <Collapse in={group.expanded}>
                <div className={styles.gap}>
                  {Object.values(group.layers).map((layer) => (
                    <div key={layer.id}>
                      <div className={styles.legendItem}>
                        <div className={styles.flex}>
                          <LayerToggle
                            layer={layer}
                            groupId={groupId}
                            toggleVisibility={() =>
                              toggleVisibility(groupId, layer.id)
                            }
                            toggleMapVisibility={() =>
                              toggleMapVisibility(
                                !layer.visible,
                                layer.mapLayers || [layer.id]
                              )
                            }
                          />
                          {layer.tooltip && (
                            <Tooltip title={layer.tooltip}>
                              <InfoIcon
                                sx={{
                                  height: '16px',
                                  color: '#5e5e5e',
                                }}
                              />
                            </Tooltip>
                          )}
                        </div>
                        <ExpandToggle
                          id={layer.id}
                          expanded={layer.expanded}
                          toggle={() => toggleExpandedLayer(groupId, layer.id)}
                        />
                        {/* {layer.rasterRamp ? (
                      <Box className={styles.coastalFloodContainer}>
                        <Box
                          className={styles.coastalFloodColorRamp}
                          sx={{
                            background: `linear-gradient(to top, ${layer.rasterRamp?.min?.color}, ${layer.rasterRamp?.max?.color})`,
                          }}
                        />
                        <Box className={styles.coastalFloodNumbers}>
                          <Typography
                            variant="body2"
                            display="inline"
                            sx={{ lineHeight: '8px' }}
                          >
                            {layer.rasterRamp?.max?.value}
                          </Typography>
                          <Typography
                            variant="body2"
                            display="inline"
                            sx={{ lineHeight: '8px' }}
                          >
                            {layer.rasterRamp?.min?.value}
                          </Typography>
                        </Box>
                      </Box>
                    ) */}
                      </div>
                      {layer.symbology && (
                        <Collapse in={layer.expanded}>
                          <div className={styles.symbology}>
                            {layer.symbology.map((symbol) => (
                              <div
                                className={styles.subLayerContainer}
                                key={symbol.label}
                              >
                                <LegendSymbol
                                  color={symbol.color}
                                  type={layer.type as TLegendTypes}
                                />
                                <Typography
                                  variant="body2"
                                  display="inline"
                                  sx={{
                                    fontSize: '0.75rem',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {symbol.label}
                                </Typography>
                              </div>
                            ))}
                          </div>
                        </Collapse>
                      )}
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>
          ))}
        </Box>
      </Collapse>
    </div>
  );
}

const MapLegendMemo = memo(MapLegend);
export default MapLegendMemo;
