import { Box } from '@mui/material';
import styles from './elements.module.css';
import { TLegendTypes } from '../interfaces';

export function LegendSymbol(props: {
  color: string;
  type: TLegendTypes;
  image?: string;
}): JSX.Element | null {
  const { color, type, image } = props;
  switch (type) {
    case 'POINT':
      return (
        <Box
          sx={{
            background: color,
          }}
          className={styles.legendSymbolPoint}
        />
      );
    case 'LINE':
      return (
        <Box
          sx={{
            background: color,
          }}
          className={styles.legendSymbolLine}
        />
      );
    case 'POLYGON':
    case 'RASTER':
      return (
        <Box
          sx={{
            background: color,
          }}
          className={styles.legendSymbolPolygon}
        />
      );
    case 'MARKER':
      return (
        <div
          style={{
            display: 'inline',
            verticalAlign: 'top',
            paddingRight: '5px',
          }}
        >
          <img src={image!} alt="" width={25} height={25} />
        </div>
      );
    default:
      console.error(`Invalid legend type: ${type}`);
      return null;
  }
}
