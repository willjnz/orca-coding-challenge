import { createTheme } from '@mui/material/styles';

// Define the theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#ca86f1',
    },
    secondary: {
      main: '#fff',
    },
    text: {
      primary: '#000000', // Example primary text color
      // secondary: '#f8f9fa', // Your custom secondary text color
      // You can also add 'disabled' or other text colors if needed
    },
    grey: {
      50: '#f8f9fa', // Lightest grey
      500: '#adb5bd', // Medium grey
      900: '#212529', // Darkest grey
    },
  },
  typography: {
    fontFamily: 'Inter Tight, Arial, sans-serif',
    h1: {
      fontFamily: 'Urbanist, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '2.5rem',
    },
    subtitle1: {
      fontFamily: 'Urbanist, Arial, sans-serif',
      fontSize: '1rem',
    },
    subtitle2: {
      fontFamily: 'Urbanist, Arial, sans-serif',
    },
    body1: {
      fontFamily: 'Urbanist, Arial, sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: '2',
      letterSpacing: '0em',
    },
    body2: {
      fontFamily: 'Urbanist, Arial, sans-serif',
      fontSize: '1rem',
      fontWeight: '500',
      letterSpacing: '0em',
    },
    // Add other specific typographic styles as needed
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'inherit', // Ensure the button uses the theme's typography
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#ca86f1',
        },
      },
    },
  },
  // // Customize components globally, for example:
  // components: {
  //     MuiCssBaseline: {
  //         styleOverrides: `
  //             html, body, #root {
  //                 padding: 0 !important;
  //                 margin: 0 !important;
  //             }
  //             #root .MuiBox-root {
  //                 padding: 0 !important;
  //                 margin: 0 !important;
  //             }
  //         `,
  //     },
  // },
  // Any other global styles or overrides can be added here
});

export default theme;
