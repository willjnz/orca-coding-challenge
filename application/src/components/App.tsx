import CssBaseline from '@mui/material/CssBaseline';
import {
  CircularProgress,
  Container,
  ThemeProvider,
  Typography,
} from '@mui/material/';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Frame from './Frame';
import theme from '../theme'; // Import the theme
import './App.module.css';
// Import Urbanist with all available weights
import '@fontsource/urbanist/100.css'; // Thin
import '@fontsource/urbanist/200.css'; // ExtraLight
import '@fontsource/urbanist/300.css'; // Light
import '@fontsource/urbanist/400.css'; // Regular
import '@fontsource/urbanist/500.css'; // Medium
import '@fontsource/urbanist/600.css'; // SemiBold
import '@fontsource/urbanist/700.css'; // Bold
import '@fontsource/urbanist/800.css'; // ExtraBold
import '@fontsource/urbanist/900.css'; // Black
// Import Urbanist with all available weights
import '@fontsource/urbanist/100.css'; // Thin
import '@fontsource/urbanist/200.css'; // ExtraLight
import '@fontsource/urbanist/300.css'; // Light
import '@fontsource/urbanist/400.css'; // Regular
import '@fontsource/urbanist/500.css'; // Medium
import '@fontsource/urbanist/600.css'; // SemiBold
import '@fontsource/urbanist/700.css'; // Bold
import '@fontsource/urbanist/800.css'; // ExtraBold
import '@fontsource/urbanist/900.css'; // Black

import { useAuth0 } from '@auth0/auth0-react';

const queryClient = new QueryClient();

function App() {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <Container
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <Box
          sx={{
            width: 'fit-content',
            height: 'fit-content',
            textAlign: 'center',
          }}
        >
          <CircularProgress sx={{ color: '#ca86f1' }} />
          <Typography>Bitte warten Sie. Sie werden eingeloggt...</Typography>
        </Box>
      </Container>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return null; // Wait for redirection
  }
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <Box sx={{ display: 'flex', minHeight: '100vh', minWidth: '100vw' }}>
          <CssBaseline />
          <Frame />
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
