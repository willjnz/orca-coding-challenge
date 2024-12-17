import { useState } from 'react';
import useTheme from '@mui/material/styles/useTheme';

import {
  AppBar,
  Link,
  IconButton,
  Menu,
  MenuItem,
  Modal,
  Box,
  Toolbar,
  Typography,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth0 } from '@auth0/auth0-react';
import mapularLogo from '../assets/Logo.png';
import { memo } from 'react';
import styles from './Header.module.css';

function LogoutModalContent() {
  const { logout, user } = useAuth0();
  return (
    <div>
      <Typography>
        Hallo {user?.name}, Möchten Sie sich wirklich abmelden?
      </Typography>
      <Button variant="contained" size="small" onClick={() => logout()}>
        Abmelden
      </Button>
    </div>
  );
}

const modalContent = {
  faq: (
    <div>
      <Typography variant="h6">
        F1: Was ist der Zweck dieser Anwendung?
      </Typography>
      <Typography paragraph>
        Diese Anwendung bietet eine interaktive Karte des Grundwasserspiegels,
        der Grundwasserleiter und der Anreicherungsgebiete, um den Nutzern zu
        helfen, die Verfügbarkeit und Qualität von Wasser in verschiedenen
        Regionen zu verstehen. Sie ist nützlich für Forscher, Planer und die
        Öffentlichkeit.
      </Typography>

      <Typography variant="h6">
        F2: Wie oft werden die Daten aktualisiert?
      </Typography>
      <Typography paragraph>
        Die Daten werden vierteljährlich aktualisiert, aber bestimmte Regionen
        können häufiger aktualisiert werden, wenn neue Daten verfügbar sind.
      </Typography>

      <Typography variant="h6">
        F3: Kann ich die Daten für meine eigene Analyse herunterladen?
      </Typography>
      <Typography paragraph>
        Ja, herunterladbare Datensätze sind in verschiedenen Formaten verfügbar
        (z. B. CSV, GeoJSON). Gehen Sie einfach zum Abschnitt „Daten
        herunterladen“, wählen Sie Ihre Region und den Datentyp aus und folgen
        Sie den Anweisungen.
      </Typography>

      <Typography variant="h6">
        F4: Wie genau sind die Grundwasserdaten?
      </Typography>
      <Typography paragraph>
        Die Daten bieten eine zuverlässige Schätzung, basieren jedoch auf
        verfügbaren Messungen, Modellen und Annahmen, wie z. B. jahreszeitlichen
        Schwankungen und der örtlichen Geologie. Die Genauigkeit kann aufgrund
        von Unterschieden in der Datenverfügbarkeit und Überwachungshäufigkeit
        je nach Region variieren.
      </Typography>

      <Typography variant="h6">
        F5: Was bedeutet die Farbcodierung auf der Karte?
      </Typography>
      <Typography paragraph>
        Die Karte verwendet Farbabstufungen, um den Grundwasserspiegel
        darzustellen: Blautöne zeigen hohe Pegel an, während Gelb und Rot
        niedrigere Pegel anzeigen. Sie können die Legende für spezifische
        Bereiche einsehen.
      </Typography>

      <Typography variant="h6" paragraph>
        Über die Daten
      </Typography>

      <Typography paragraph>
        Die Daten dieser Anwendung enthalten Schätzungen, die aus vorhandenen
        Messungen, hydrologischen Modellen und allgemeinen Annahmen auf der
        Grundlage der örtlichen Geologie und Klimamuster abgeleitet wurden.
        Aufgrund natürlicher Schwankungen und Einschränkungen bei den Messungen
        können die genauen Grundwasserstände und -bedingungen abweichen. Die
        Benutzer sollten diese Faktoren berücksichtigen, insbesondere in
        Gebieten mit weniger Messstationen oder saisonalen
        Grundwasserschwankungen.
      </Typography>
    </div>
  ),
  cookies: (
    <div>
      {/* <Typography variant="h6"></Typography>
      <Button
        variant="contained"
        size="small"
        onClick={() => alert('To do...')}
      >
      </Button> */}
    </div>
  ),
  impressum: (
    <div>
      <Typography variant="h6" paragraph>
        Angaben gemäß § 5 TMG
      </Typography>

      <Typography variant="h6">Unternehmensname:</Typography>
      <Typography paragraph>Musterfirma GmbH</Typography>

      <Typography variant="h6">Vertreten durch:</Typography>
      <Typography paragraph>Max Mustermann, Geschäftsführer</Typography>

      <Typography variant="h6">Anschrift:</Typography>
      <Typography paragraph>
        Musterstraße 123
        <br />
        12345 Musterstadt
        <br />
        Deutschland
      </Typography>

      <Typography variant="h6">Kontakt:</Typography>
      <Typography paragraph>
        Telefon: +49 (0) 123 456789
        <br />
        E-Mail: info@musterfirma.de
      </Typography>

      <Typography variant="h6">Registereintrag:</Typography>
      <Typography paragraph>
        Eintragung im Handelsregister.
        <br />
        Registergericht: Amtsgericht Musterstadt
        <br />
        Registernummer: HRB 12345
      </Typography>

      <Typography variant="h6">Umsatzsteuer-ID:</Typography>
      <Typography paragraph>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
        <br />
        DE123456789
      </Typography>

      <Typography variant="h6">
        Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
      </Typography>
      <Typography paragraph>
        Max Mustermann
        <br />
        Musterstraße 123
        <br />
        12345 Musterstadt
      </Typography>

      <Typography variant="h6">Streitschlichtung</Typography>
      <Typography paragraph>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{' '}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noreferrer"
        >
          https://ec.europa.eu/consumers/odr
        </a>
        .<br />
        Unsere E-Mail-Adresse finden Sie oben im Impressum.
        <br />
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren
        vor einer Verbraucherschlichtungsstelle teilzunehmen.
      </Typography>
    </div>
  ),
  logout: <LogoutModalContent />,
};
const modalTitles = {
  faq: 'Häufig Gestellte Fragen (FAQ)',
  cookies: 'Cookie Einstellungen',
  impressum: 'Impressum',
  logout: 'Abmelden',
};

type ModalType = keyof typeof modalContent;

function Copyright(): JSX.Element {
  return (
    <Typography variant="body2" align="center" sx={{ color: '#9d9d9d' }}>
      {'Copyright © '}
      <Link color="primary" fontWeight="bold" href="https://mapular.com/">
        mapular
      </Link>{' '}
      {new Date().getFullYear()}.
    </Typography>
  );
}

function PositionedMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openModal, setOpenModal] = useState<ModalType | null>(null);

  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const handleOpenModal = (modalType: ModalType) => {
    setOpenModal(modalType);
    handleCloseMenu();
  };

  const handleCloseModal = () => {
    setOpenModal(null);
  };

  return (
    <div>
      <IconButton color="primary" onClick={handleClick}>
        <MenuIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={() => handleOpenModal('faq')}>FAQ</MenuItem>
        <MenuItem onClick={() => handleOpenModal('cookies')}>Cookies</MenuItem>
        <MenuItem onClick={() => handleOpenModal('impressum')}>
          Impressum
        </MenuItem>
        <MenuItem onClick={() => handleOpenModal('logout')}>Logout</MenuItem>
      </Menu>
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
            {openModal && modalContent[openModal]}
          </Box>
        </Box>
      </Modal>
    </div>
  );
}

function Header() {
  const theme = useTheme();
  return (
    <AppBar
      color="secondary"
      position="sticky"
      elevation={0}
      sx={{ zIndex: 0 }}
    >
      <Toolbar
        sx={{ display: 'flex', justifyContent: 'space-between' }}
        variant="dense"
      >
        {/* left side */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            sx={{
              height: 48,
              mr: theme.spacing(2),
            }}
            alt="Mapular Logo"
            src={mapularLogo}
          />
          <Typography variant="h6" sx={{ fontWeight: 200 }}>
            WaterNetAI
          </Typography>
          <Typography sx={{ color: '#9d9d9d', ml: 1 }}>
            (In Entwicklung)
          </Typography>
        </Box>

        {/* right side - copyright */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Copyright />
          <PositionedMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}

const HeaderMemo = memo(Header);
export default HeaderMemo;
