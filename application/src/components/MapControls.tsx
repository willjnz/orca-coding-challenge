import { MouseEventHandler, ReactNode, useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  Modal,
  Box,
  Button,
  Typography,
  Select,
  MenuItem,
  Slider,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Grid,
  Paper,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import StraightenIcon from '@mui/icons-material/Straighten';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import TableViewIcon from '@mui/icons-material/TableView';
import MapIcon from '@mui/icons-material/Map';
import CloseIcon from '@mui/icons-material/Close';
import LaunchIcon from '@mui/icons-material/Launch';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import length from '@turf/length';
import dayjs from 'dayjs';
import styles from './MapControls.module.css';
import {
  TClimateScenario,
  TMapRef,
  TPrediction,
  TSetClimateScenario,
  TSetNumber,
  TSetPrediction,
  TSetString,
  TSetTimeslider,
  TSetType,
  TTimeslider,
  TType,
} from '../interfaces';
import DataTable from './DataTable';
import { Feature, FeatureCollection, LineString, Point } from 'geojson';

type MapControlButtonProps = {
  icon: ReactNode; // ReactNode to allow any valid JSX element as the icon
  tooltip: string; // Tooltip text is a string
  onClick: MouseEventHandler<HTMLButtonElement>; // Event handler for button clicks
};

const MeasureTool = ({ mapRef }: { mapRef: TMapRef }) => {
  if (!mapRef.current) return;
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    if (!mapRef.current) return;
    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    const linestring: Feature<LineString> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [],
      },
      properties: {},
    };

    const clickHandler = (e: any) => {
      if (!mapRef.current) return;
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['measure-points'],
      });

      if (geojson.features.length > 1) geojson.features.pop();

      if (features.length) {
        const id = features[0].properties!.id;
        geojson.features = geojson.features.filter(
          (point: Feature) => point.properties?.id !== id
        );
      } else {
        const point: Feature<Point> = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [e.lngLat.lng, e.lngLat.lat],
          },
          properties: {
            id: String(new Date().getTime()),
          },
        };

        geojson.features.push(point);
      }

      if (geojson.features.length > 1) {
        linestring.geometry.coordinates = geojson.features.map(
          (point: any) => point.geometry.coordinates
        );

        geojson.features.push(linestring);

        const distanceValue = length(linestring, { units: 'kilometers' });
        setDistance(distanceValue);
      } else {
        setDistance(0);
      }

      // @ts-expect-error bad mapbox types
      mapRef.current.getSource('geojson')!.setData(geojson);
    };

    const moveHandler = (e: any) => {
      if (!mapRef.current) return;
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['measure-points'],
      });
      mapRef.current.getCanvas().style.cursor = features.length
        ? 'pointer'
        : 'crosshair';
    };

    mapRef.current.addSource('geojson', {
      type: 'geojson',
      data: geojson,
    });

    mapRef.current.addLayer({
      id: 'measure-points',
      type: 'circle',
      source: 'geojson',
      paint: {
        'circle-radius': 5,
        'circle-color': '#000',
      },
      filter: ['in', '$type', 'Point'],
    });

    mapRef.current.addLayer({
      id: 'measure-lines',
      type: 'line',
      source: 'geojson',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#000',
        'line-width': 2.5,
      },
      filter: ['in', '$type', 'LineString'],
    });

    mapRef.current.on('click', clickHandler);
    mapRef.current.on('mousemove', moveHandler);

    return () => {
      if (!mapRef.current) return;
      mapRef.current.off('click', clickHandler);
      mapRef.current.off('mousemove', moveHandler);

      if (mapRef.current.getLayer('measure-points'))
        mapRef.current.removeLayer('measure-points');
      if (mapRef.current.getLayer('measure-lines'))
        mapRef.current.removeLayer('measure-lines');
      if (mapRef.current.getSource('geojson'))
        mapRef.current.removeSource('geojson');

      mapRef.current.getCanvas().style.cursor = '';
    };
  }, [mapRef.current]);

  return (
    <Box className={styles.measureTool}>
      <Typography variant="h6">Measurement Tool</Typography>
      <Typography>
        {distance > 0
          ? `Total distance: ${distance.toFixed(2)} km`
          : 'Click on the map to start measuring.'}
      </Typography>
    </Box>
  );
};

function MapControlButton({ icon, tooltip, onClick }: MapControlButtonProps) {
  // TODO: highlight while active
  // TODO: make the other controls inactive when one is selected
  return (
    <Tooltip title={tooltip} placement="left">
      <IconButton className={styles.controlButton} onClick={onClick}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}

function DownloadModalContent() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button
        variant="contained"
        size="small"
        onClick={() => alert('To do...')}
        disabled
      >
        Aktuelle Kartenansicht als PDF <CloudDownloadIcon />
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={() => alert('To do...')}
        disabled
      >
        Alle Daten als CSV <CloudDownloadIcon />
      </Button>
      <Button
        variant="contained"
        size="small"
        onClick={() =>
          window.open(
            `${import.meta.env.VITE_TIPG_URL}api.html`,
            '_blank',
            'noopener,noreferrer'
          )
        }
      >
        Zur Daten-API gehen <LaunchIcon />
      </Button>
    </Box>
  );
}

const PredictionSelect: React.FC<{
  selectedPrediction: TPrediction;
  setSelectedPrediction: TSetPrediction;
}> = ({ selectedPrediction, setSelectedPrediction }) => {
  const handleChange = (event: SelectChangeEvent<TPrediction>) => {
    setSelectedPrediction(event.target.value as TPrediction);
  };

  return (
    <Box sx={{ width: 200 }}>
      <Typography>Vorhersage</Typography>
      <FormControl fullWidth>
        <InputLabel id="vorhersage-select-label">Vorhersage</InputLabel>
        <Select
          labelId="vorhersage-select-label"
          value={selectedPrediction}
          onChange={handleChange}
          label="Vorhersage"
        >
          <MenuItem value="Saisonale">Saisonale</MenuItem>
          <MenuItem value="Dekadische">Dekadische</MenuItem>
          <MenuItem value="Langfrist">Langfrist</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

const TypeSelect: React.FC<{
  selectedType: TType;
  setSelectedType: TSetType;
}> = ({ selectedType, setSelectedType }) => {
  const handleChange = (event: SelectChangeEvent<TType>) => {
    setSelectedType(event.target.value as TType);
  };

  return (
    <Box sx={{ width: 200 }}>
      <Typography>Typ</Typography>
      <FormControl fullWidth>
        <InputLabel id="typ-select-label">Typ</InputLabel>
        <Select
          labelId="typ-select-label"
          value={selectedType}
          onChange={handleChange}
          label="Typ"
        >
          <MenuItem value="Alle">Alle</MenuItem>
          <MenuItem value="Forderbrunnen">Forderbrunnen</MenuItem>
          <MenuItem value="Grundwassermessstelle">
            Grundwassermessstelle
          </MenuItem>
          <MenuItem value="Fließgewässer">Fließgewässer</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

const generateMonthLabels = () => {
  const months = [];
  for (let year = 1950; year <= 2024; year++) {
    for (let month = 1; month <= 12; month++) {
      months.push(`${year}-${month.toString().padStart(2, '0')}`);
    }
  }
  return months;
};
const monthLabels = generateMonthLabels();
const TimeSlider: React.FC<{
  timeSliderRange: TTimeslider;
  setTimeSliderRange: TSetTimeslider;
}> = ({ timeSliderRange, setTimeSliderRange }) => {
  const handleChange = (_event: Event, newValue: TTimeslider) => {
    setTimeSliderRange(newValue as TTimeslider);
  };

  // Create evenly distributed marks
  const numMarks = 7;
  const marks = Array.from({ length: numMarks }, (_, i) => {
    const index = Math.floor((i / (numMarks - 1)) * (monthLabels.length - 1));
    return {
      value: index,
      label: dayjs(monthLabels[index]).format('YYYY'),
    };
  });

  return (
    <Box sx={{ width: '100%', padding: 6 }}>
      <Typography>Zeitschieber</Typography>
      <Slider
        value={timeSliderRange}
        min={0}
        max={monthLabels.length - 1}
        step={1}
        // @ts-expect-error this is a multi select only so this type error is not helpful
        onChange={handleChange}
        valueLabelDisplay="on"
        valueLabelFormat={(index) =>
          dayjs(monthLabels[index]).format('MMM YYYY')
        }
        marks={marks} // Add year labels
      />
      {/* <Typography variant="body1" sx={{ marginTop: 2 }}>
        Gewählter Zeitbereich: {dayjs(monthLabels[timeSliderRange[0]]).format('MMM YYYY')}{' '}
        - {dayjs(monthLabels[timeSliderRange[1]]).format('MMM YYYY')}
      </Typography> */}
    </Box>
  );
};

const ExtractionChangeSlider: React.FC<{
  extractionValue: number;
  setExtractionValue: TSetNumber;
}> = ({ extractionValue, setExtractionValue }) => {
  const handleChange = (_event: Event, newValue: number | number[]) => {
    setExtractionValue(newValue as number);
  };

  // Marks for the slider at regular intervals
  const marks = [
    { value: -30, label: '-30%' },
    { value: -20, label: '-20%' },
    { value: -10, label: '-10%' },
    { value: 0, label: '0%' },
    { value: 10, label: '+10%' },
    { value: 20, label: '+20%' },
    { value: 30, label: '+30%' },
  ];

  return (
    <Box sx={{ width: '100%', padding: 6 }}>
      <Typography>Änderung der Entnahme</Typography>
      <Slider
        value={extractionValue}
        min={-30}
        max={30}
        step={0.5}
        onChange={handleChange}
        valueLabelDisplay="on"
        valueLabelFormat={(val) => `${val}%`}
        marks={marks} // Add percentage labels
      />
    </Box>
  );
};

const ClimateScenarioSelect: React.FC<{
  selectedClimateScenario: TClimateScenario;
  setSelectedClimateScenario: TSetClimateScenario;
}> = ({ selectedClimateScenario, setSelectedClimateScenario }) => {
  const handleChange = (event: SelectChangeEvent<TClimateScenario>) => {
    setSelectedClimateScenario(event.target.value as TClimateScenario);
  };

  return (
    <Box sx={{ width: 200 }}>
      <Typography>Klimaszenarien</Typography>
      <FormControl fullWidth>
        <InputLabel id="klimaszenarien-select-label">Klimaszenarien</InputLabel>
        <Select
          labelId="klimaszenarien-select-label"
          value={selectedClimateScenario}
          onChange={handleChange}
          label="Klimaszenarien"
        >
          <MenuItem value="RCP2.6">RCP2.6</MenuItem>
          <MenuItem value="RCP4.5">RCP4.5</MenuItem>
          <MenuItem value="RCP8.5">RCP8.5</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

const ClimateScenarioSlider: React.FC<{
  climateScenarioValue: number;
  setClimateScenarioValue: TSetNumber;
}> = ({ climateScenarioValue, setClimateScenarioValue }) => {
  const handleChange = (_event: Event, newValue: number | number[]) => {
    setClimateScenarioValue(newValue as number);
  };

  // Marks for the slider at regular intervals
  const marks = [
    { value: 2.5, label: '2.5%' },
    { value: 25, label: '25%' },
    { value: 50, label: '50%' },
    { value: 75, label: '75%' },
    { value: 97.5, label: '97.5%' },
  ];

  return (
    <Box sx={{ width: '100%', padding: 6 }}>
      <Typography>Klimaszenarien nach Schätzungen (Perzentil)</Typography>
      <Slider
        value={climateScenarioValue}
        min={2.5}
        max={97.5}
        step={0.5}
        onChange={handleChange}
        valueLabelDisplay="on"
        valueLabelFormat={(val) => `${val.toFixed(1)}%`}
        marks={marks} // Add percentile labels
      />
    </Box>
  );
};

function FilterModalContent() {
  // TODO: make these fixed values instead of just a string.
  const [selectedPrediction, setSelectedPrediction] = useState<TPrediction>('');
  const [selectedType, setSelectedType] = useState<TType>('');
  const [selectedClimateScenario, setSelectedClimateScenario] =
    useState<TClimateScenario>('');
  const [extractionValue, setExtractionValue] = useState<number>(0);
  const [timeSliderRange, setTimeSliderRange] = useState<TTimeslider>([
    0,
    monthLabels.length - 1,
  ]);

  const [climateScenarioValue, setClimateScenarioValue] = useState<number>(50); // Default to 50% for a middle point
  return (
    <>
      <PredictionSelect
        selectedPrediction={selectedPrediction}
        setSelectedPrediction={setSelectedPrediction}
      />
      {selectedPrediction === 'Saisonale' && (
        <ExtractionChangeSlider
          extractionValue={extractionValue}
          setExtractionValue={setExtractionValue}
        />
      )}
      {selectedPrediction === 'Langfrist' && (
        <>
          <ClimateScenarioSelect
            selectedClimateScenario={selectedClimateScenario}
            setSelectedClimateScenario={setSelectedClimateScenario}
          />
          <ClimateScenarioSlider
            climateScenarioValue={climateScenarioValue}
            setClimateScenarioValue={setClimateScenarioValue}
          />
        </>
      )}
      {/* Type shows for all */}
      <TypeSelect
        selectedType={selectedType}
        setSelectedType={setSelectedType}
      />
      {/* Timeslider shows for all */}
      <TimeSlider
        timeSliderRange={timeSliderRange}
        setTimeSliderRange={setTimeSliderRange}
      />
      <Typography>
        Diese Filter/Einstellungen verändern die Kartendarstellung und die
        entsprechenden Diagramme. Ihr Benutzerprofil hat entweder Zugriff auf
        Daten eines Wasserversorgers oder auf Daten des Bundeslandes. Davon
        hängen die Nutzungsszenarien ab.
      </Typography>
    </>
  );
}

const DatasetSelect: React.FC<{
  selectedDataset: string;
  setSelectedDataset: TSetString;
}> = ({ selectedDataset, setSelectedDataset }) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedDataset(event.target.value as string);
  };

  return (
    <Box sx={{ width: 200 }}>
      <FormControl fullWidth>
        <InputLabel id="dataset-select-label">Datensatz</InputLabel>
        <Select
          labelId="dataset-select-label"
          value={selectedDataset}
          onChange={handleChange}
          label="Datensatz"
        >
          <MenuItem value="messstellen">Messstellen</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

function DataTableModalContent({ mapRef }: { mapRef: TMapRef }) {
  const [selectedDataset, setSelectedDataset] = useState<string>('messstellen');
  const errorMessage = (
    <Typography>Fehler: Kartendaten nicht verfügbar</Typography>
  );
  if (!mapRef.current) return errorMessage;
  const mapFeatures = mapRef.current.queryRenderedFeatures({
    layers: ['measuring_stations_tipg'],
  });
  if (!mapFeatures || mapFeatures.length === 0) return errorMessage;
  return (
    <Box>
      <Typography>
        Diese Tabelle zeigt nur die Daten in der Kartenansicht
      </Typography>
      <DatasetSelect
        selectedDataset={selectedDataset}
        setSelectedDataset={setSelectedDataset}
      />
      <Grid container spacing={2} sx={{}}>
        {/* 2/3 Section */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              padding: 2,
              height: '100%',
              maxHeight: '47vh',
              overflow: 'auto',
            }}
          >
            <DataTable mapFeatures={mapFeatures} />
          </Paper>
        </Grid>

        {/* 1/3 Section */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              padding: 2,
              height: '100%',
              maxHeight: '47vh',
              overflow: 'auto',
            }}
          >
            <Typography variant="h6">Statistik</Typography>
            <Typography>
              Grundwasserstand (m über dem mittleren Meeresspiegel (NHN))
            </Typography>
            <Typography>Min: 0</Typography>
            <Typography>Höchstwert: 5200</Typography>
            <Typography>Mittelwert: 3054</Typography>
            <Typography>Modus: 2091</Typography>
            <Typography>Median: 2980</Typography>
            <Typography>Standardabweichung: 945</Typography>
            <Typography>Varianz: 893,025</Typography>
            <Typography>Bereich: 5200</Typography>
            <Typography>25. Perzentil (Q1): 1500</Typography>
            <Typography>50. Perzentil (Q2 / Median): 2980</Typography>
            <Typography>75. Perzentil (Q3): 4300</Typography>
            <Typography>Interquartilsbereich (IQR): 2800</Typography>
            <Typography>Schiefe: 0,65 (leicht nach rechts verzerrt)</Typography>
            <Typography>Kurtosis: 2,5 (leicht leptokurtisch")</Typography>
            <Typography>Summe: 3.054.000</Typography>
            <Typography>Anzahl: 1,000</Typography>
            <Typography></Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function BasemapModalContent({ mapRef }: { mapRef: TMapRef }) {
  const errorMessage = (
    <Typography>Fehler: Kartendaten nicht verfügbar</Typography>
  );
  if (!mapRef.current) return errorMessage;
  const basemaps: { [key: string]: string } = {
    Gelände: 'mapbox://styles/orbicaeu/clzs3lv2j00ek01nz2wu0f5oo',
    Satellit: 'mapbox://styles/mapbox/satellite-streets-v12',
    Straßen: 'mapbox://styles/mapbox/streets-v12',
    Außenbereich: 'mapbox://styles/mapbox/outdoors-v12',
    Hell: 'mapbox://styles/mapbox/light-v11',
    Dunkel: 'mapbox://styles/mapbox/dark-v11',
  };
  const [currentBaseMap, setCurrentBaseMap] = useState('Gelände');

  const handleStyleChange = (event: any) => {
    if (!mapRef.current) return errorMessage;
    setCurrentBaseMap(event.target.value);
    mapRef.current.setStyle(basemaps[event.target.value]);
  };

  // TODO: layers in custom default map style do not show on the other basemaps. We need to add these in Mapbox Studio

  return (
    <Box sx={{ width: 200 }}>
      <Select value={currentBaseMap} onChange={handleStyleChange} fullWidth>
        {Object.keys(basemaps).map((key) => (
          <MenuItem key={key} value={key}>
            {key}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

function ModalSwitch({
  modalType,
  mapRef,
}: {
  modalType: ModalType;
  mapRef: TMapRef;
}): JSX.Element {
  switch (modalType) {
    case 'dataTable':
      return <DataTableModalContent mapRef={mapRef} />;
    case 'download':
      return <DownloadModalContent />;
    case 'filter':
      return <FilterModalContent />;
    case 'basemap':
      return <BasemapModalContent mapRef={mapRef} />;
    // default:
    //   return <Typography>Basiskartenoptionen</Typography>;
  }
}

const modalTitles = {
  download: 'Daten Herunterladen',
  filter: 'Filtern',
  dataTable: 'Datentabellen',
  basemap: 'Basiskarte wechseln',
};

type ModalType = keyof typeof modalTitles;

export default function MapControls(props: { mapRef: TMapRef }): JSX.Element {
  const { mapRef } = props;
  const [openModal, setOpenModal] = useState<ModalType | null>(null);

  const handleOpenModal = (modalType: ModalType) => {
    setOpenModal(modalType);
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };

  const [isMeasureToolActive, setIsMeasureToolActive] =
    useState<boolean>(false);

  return (
    <div className={`${styles.controlsContainer} mapboxgl-ctrl-group`}>
      <MapControlButton
        icon={<DownloadIcon color="primary" />}
        tooltip="Herunterladen"
        onClick={() => handleOpenModal('download')}
      />
      <MapControlButton
        icon={<FilterAltIcon color="primary" />}
        tooltip="Filtern"
        onClick={() => handleOpenModal('filter')}
      />
      <MapControlButton
        icon={<TableViewIcon color="primary" />}
        tooltip="Datentabelle"
        onClick={() => handleOpenModal('dataTable')}
      />
      <MapControlButton
        icon={<MapIcon color="primary" />}
        tooltip="Basiskarte wechseln"
        onClick={() => handleOpenModal('basemap')}
      />
      <MapControlButton
        icon={<StraightenIcon color="primary" />}
        // TODO: highlight while active
        tooltip={
          isMeasureToolActive
            ? 'Messwerkzeug deaktivieren'
            : 'Messwerkzeug aktivieren'
        }
        onClick={() => setIsMeasureToolActive((prev) => !prev)}
      />

      <Modal open={Boolean(openModal)} onClose={handleCloseModal}>
        <Box className={styles.modal}>
          <Box className={styles.modalHeader}>
            <Typography variant="h4">
              {openModal && modalTitles[openModal]}
            </Typography>
            <IconButton
              onClick={handleCloseModal}
              className={styles.closeButton}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box className={styles.modalContent}>
            {openModal && <ModalSwitch modalType={openModal} mapRef={mapRef} />}
          </Box>
        </Box>
      </Modal>

      {isMeasureToolActive && <MeasureTool mapRef={mapRef} />}
    </div>
  );
}
