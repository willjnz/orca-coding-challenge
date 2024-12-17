import { Suspense } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
} from '@mui/material';
import * as React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import styles from './RightSidePanel.module.css';
import SoilProfileGraph from './graphs/SoilProfileGraph';
import DeviationFromMeanAnnualTemperatureGraph from './graphs/DeviationFromMeanAnnualTemperatureGraph';
import DeviationFromMeanPrecipitationGraph from './graphs/DeviationFromMeanPrecipitationGraph';
import GroundwaterLevelGraph from './graphs/GroundwaterLevelGraph';
import GroundwaterWithdrawalsBySectorGraph from './graphs/GroundwaterWithdrawalsBySectorGraph';
import useFetchSelectedStationDetails from './useFetchSelectedStationDetails';
import {
  TSelectedStationId,
  TSetSelectedStationId,
  TStationDetails,
} from '../interfaces';
import ConductivityGraph from './graphs/ConductivityGraph';

const KpiCard: React.FC<{ title: string; value: number | string }> = ({
  title,
  value,
}) => {
  return (
    <Paper elevation={3} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
      <Typography
        variant="subtitle1"
        gutterBottom
        sx={{ overflowWrap: 'break-word' }}
      >
        {title}
      </Typography>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Paper>
  );
};

const Kpis: React.FC<{ selectedStationDetails: TStationDetails }> = ({
  selectedStationDetails,
}) => {
  const data = [
    {
      title: 'Mittlerer Grundwasserstand (m)',
      value: selectedStationDetails!.mean_groundwater_level_m.toFixed(2),
    },
    {
      title: 'Grundwasserstand (m unter GOK)',
      value: selectedStationDetails!.monthly_groundwater_level_attributes
        .at(-1)
        .ground_water_level_m_above_sealevel_avg.toFixed(2),
    },
    {
      title: 'Mittlere Jahresamplitude (m)',
      value: selectedStationDetails!.mean_annual_amplitude_m.toFixed(2),
    },
  ];
  return (
    <Box sx={{ flexGrow: 1, p: 1 }}>
      <Grid container spacing={2} justifyContent="space-between">
        {data.map((d) => (
          <Grid item xs={12} sm={4} key={d.title}>
            <KpiCard title={d.title} value={d.value} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const GraphPlaceholder: React.FC = () => {
  return (
    <Typography sx={{ color: 'grey' }}>
      Dieses Diagramm ist in Entwicklung
    </Typography>
  );
};

const GraphTitles: {
  [key: number]: {
    title: string;
    component: React.FC<{ selectedStationDetails: TStationDetails }>;
  }[];
} = {
  // Historische Daten
  0: [
    {
      title: 'Abweichung von mittl. Jahrestemperatur (°C)',
      component: DeviationFromMeanAnnualTemperatureGraph,
    },
    {
      title: 'Abweichung von mittl. Niederschlagsmenge (%)',
      component: DeviationFromMeanPrecipitationGraph,
    },
    { title: 'Grundwasserstand (m NHN)', component: GroundwaterLevelGraph },
    { title: 'Grundwasserversalzung', component: GraphPlaceholder }, // TODO: replace with the real graph
    {
      // title: 'Leitfähigkeit oder Chloridgehalt',
      title: 'Leitfähigkeit',
      component: ConductivityGraph,
    },
  ],
  // Klimaszenarien
  1: [{ title: 'Klimaszenarien', component: GraphPlaceholder }], // TODO: replace with the real graph
  // Nutzungsszenarien
  2: [
    {
      title: 'Grundwasserentnahmen nach Sektoren',
      component: GroundwaterWithdrawalsBySectorGraph,
    },
    {
      title:
        'Änderung des Grundwasserstands im Vergleich zur Referenzperiode (1991-2020)',
      component: GraphPlaceholder, // TODO: replace with the real graph
    },
  ],
  // Bohrprofil
  3: [{ title: 'Bohrprofil', component: SoilProfileGraph }],
};

const GraphContainer: React.FC<{
  graphData: {
    title: string;
    component: React.FC<{ selectedStationDetails: TStationDetails }>;
  };
  selectedStationDetails: TStationDetails;
}> = React.memo(({ graphData, selectedStationDetails }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1,
      }}
    >
      <Typography variant="h6" gutterBottom>
        {graphData.title}
      </Typography>
      <Box
        sx={{
          // background: '#f5f5f5',
          width: '100%',
          height: '300px',
        }}
      >
        <graphData.component selectedStationDetails={selectedStationDetails} />
      </Box>
    </Paper>
  );
});

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1, gap: 2, display: 'grid' }}>{children}</Box>
      )}
    </div>
  );
}

const PanelTabs: React.FC<{ selectedStationDetails: TStationDetails }> = ({
  selectedStationDetails,
}) => {
  const [value, setValue] = React.useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  console.log(selectedStationDetails);
  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        variant="fullWidth"
        value={value}
        onChange={handleChange}
        aria-label="panel tabs"
      >
        <Tab
          value={0}
          label="Historische Daten"
          wrapped
          sx={{ color: '#7d7d7d' }}
        />
        <Tab
          value={1}
          label="Klimaszenarien"
          wrapped
          sx={{ color: '#7d7d7d' }}
        />
        <Tab
          value={2}
          label="Nutzungsszenarien"
          wrapped
          sx={{ color: '#7d7d7d' }}
        />
        <Tab value={3} label="Bohrprofil" wrapped sx={{ color: '#7d7d7d' }} />
      </Tabs>
      {[0, 1, 2, 3].map((index) => (
        <TabPanel value={value} index={index} key={index}>
          {GraphTitles[value].map((graphData) => (
            <GraphContainer
              graphData={graphData}
              key={graphData.title}
              selectedStationDetails={selectedStationDetails}
            />
          ))}
        </TabPanel>
      ))}
    </Box>
  );
};

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box className={styles.mapOverlay}>
      <Box className={styles.rightSidePanelContainer}>
        <Box
          className={styles.panelContent}
          style={{
            display: 'flex',
            width: '100%',
            padding: 16,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default function RightSidePanel(props: {
  selectedStationId: TSelectedStationId;
  setSelectedStationId: TSetSelectedStationId;
}): JSX.Element {
  const { selectedStationId, setSelectedStationId } = props;

  const {
    data: selectedStationDetails,
    isLoading: selectedStationDetailsIsLoading,
    error: selectedStationDetailsError,
  } = useFetchSelectedStationDetails(selectedStationId);

  if (selectedStationDetailsIsLoading)
    return (
      <Container>
        <CircularProgress />
        <Typography>
          Bitte warten Sie. Die Daten für diese Messstation werden gerade
          abgerufen...
        </Typography>
      </Container>
    );

  // TODO: move this to the appropriate graph component
  // const [selectedTimeDomain, setSelectedTimeDomain] = useState<TTimeDomain>([
  //   null,
  //   null,
  // ]);

  if (!selectedStationId)
    return (
      <Container>
        <Typography>
          Wählen Sie einen Punkt auf der Karte, um Visualisierungen zu sehen.
        </Typography>
      </Container>
    );

  const header = (
    <div>
      <Typography align="center">Messstelle:</Typography>
      <Typography variant="h5" align="center">
        {selectedStationDetails?.name}
      </Typography>
      <Typography align="center">{selectedStationId}</Typography>
    </div>
  );

  if (selectedStationDetailsError || !selectedStationDetails)
    return (
      <Container>
        {header}
        <Typography>
          Error: {selectedStationDetailsError?.message}. Bitte versuchen Sie es
          nochmal.
        </Typography>
      </Container>
    );

  const handleCloseModal = () => {
    setSelectedStationId(null);
  };

  return (
    <Container>
      <>
        <Suspense
          fallback={
            <Container>
              <CircularProgress />
              <Typography>Laden...</Typography>
            </Container>
          }
        >
          <Box className={styles.modalHeader}>
            {header}
            <IconButton
              onClick={handleCloseModal}
              className={styles.closeButton}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box className={styles.modalContent}>
            <Kpis selectedStationDetails={selectedStationDetails} />
            <PanelTabs selectedStationDetails={selectedStationDetails} />
          </Box>
        </Suspense>
      </>
    </Container>
  );
}
