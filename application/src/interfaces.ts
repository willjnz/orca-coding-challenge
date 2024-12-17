export type AnyObject = { [key: string]: any };
export type AnyObjectNumber = { [key: string]: number };
// import { Feature, Point } from 'geojson';

// LEGEND

export type TLegendTypes = 'POINT' | 'LINE' | 'POLYGON' | 'RASTER' | 'MARKER';

export interface ILegendLayer {
  id: string;
  label: string;
  expanded: boolean;
  visible: boolean;
  tooltip?: string;
  type: TLegendTypes;
  symbology?: { label: string; color: string; type?: string }[];
  mapLayers?: string[];
}
export interface ILegendGroup {
  label: string;
  expanded: boolean;
  layers: { [key: string]: ILegendLayer };
}
export interface ILegendState {
  groups: {
    [key: string]: ILegendGroup;
  };
}

// MAP

export type TMap = mapboxgl.Map | null;
export type TMapRef = { current: TMap };

export type TTimeDomain = [Date | null, Date | null];
export type TSetTimeDomain = React.Dispatch<React.SetStateAction<TTimeDomain>>;

export type TStationDetails =
  | {
      id: string;
      name: string;
      monthly_groundwater_level_attributes: any;
      weekly_groundwater_percentiles_attributes: any;
      monthly_groundwater_prediction_attributes: any;
      mean_groundwater_level_m: number;
      mean_annual_amplitude_m: number;
      monthly_conductivity_chloride_attributes: any;
      monthly_weather_attributes: any;
      precipitation_refperiod_annual_mean_mm: number;
    }
  | undefined; // TODO: type these "any"

export type TSelectedStationId = string | null;
export type TSetSelectedStationId = React.Dispatch<
  React.SetStateAction<TSelectedStationId>
>;

export type TSetNumber = React.Dispatch<React.SetStateAction<number>>;
export type TSetString = React.Dispatch<React.SetStateAction<string>>;
export type TTimeslider = number[];
export type TSetTimeslider = React.Dispatch<React.SetStateAction<TTimeslider>>;

export type TPrediction = '' | 'Saisonale' | 'Dekadische' | 'Langfrist';
export type TSetPrediction = React.Dispatch<React.SetStateAction<TPrediction>>;

export type TType =
  | ''
  | 'Alle'
  | 'Forderbrunnen'
  | 'Grundwassermessstelle'
  | 'Fließgewässer';
export type TSetType = React.Dispatch<React.SetStateAction<TType>>;

export type TClimateScenario = '' | 'RCP2.6' | 'RCP4.5' | 'RCP8.5';
export type TSetClimateScenario = React.Dispatch<
  React.SetStateAction<TClimateScenario>
>;
