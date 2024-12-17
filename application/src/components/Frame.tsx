import Box from '@mui/material/Box';
import HeaderMemo from './Header';
import MapView from './MapView';
import RightSidePanel from './RightSidePanel';
import MapLegend from './MapLegend';
import { TMap, TSelectedStationId } from '../interfaces';
import { useRef, useState } from 'react';
import MapControls from './MapControls';

export default function Frame(): JSX.Element {
  const [selectedStationId, setSelectedStationId] =
    useState<TSelectedStationId>(null);

  const mapRef = useRef<TMap>(null);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <HeaderMemo />
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'row',
          height: 'calc(100vh - 64px)',
        }}
      >
        <MapLegend mapRef={mapRef} />
        <MapControls mapRef={mapRef} />
        <MapView mapRef={mapRef} setSelectedStationId={setSelectedStationId} />
        <RightSidePanel
          selectedStationId={selectedStationId}
          setSelectedStationId={setSelectedStationId}
        />
      </Box>
    </Box>
  );
}
