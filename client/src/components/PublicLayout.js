import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, Link as MuiLink, IconButton, Grid, Paper, Alert, Menu, MenuItem, useTheme, useMediaQuery } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const PublicLayout = ({ children }) => {
  const [cookieConsent, setCookieConsent] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const scrollToSection = (sectionId) => {
    handleMenuClose();
    if (sectionId === 'cennik') {
      // Dla cennik zawsze przejdź na /cennik (który ma własną trasę)
      window.location.href = '/cennik';
    } else if (location.pathname !== '/' && location.pathname !== '/cennik') {
      // Jeśli nie jesteśmy na stronie głównej, przejdź do niej z hash
      window.location.href = `/#${sectionId}`;
    } else {
      // Jeśli jesteśmy na stronie głównej, przewiń do sekcji
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowCookieBanner(true);
    } else {
      setCookieConsent(consent === 'true');
    }
  }, []);

  const handleCookieAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setCookieConsent(true);
    setShowCookieBanner(false);
  };

  const handleCookieClose = () => {
    setShowCookieBanner(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {showCookieBanner && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            zIndex: 1300,
            bgcolor: 'background.paper',
            borderTop: '2px solid',
            borderColor: 'primary.main',
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Ta strona używa plików cookie
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Używamy plików cookie, aby zapewnić najlepsze doświadczenie na naszej stronie. Kontynuując przeglądanie, zgadzasz się na użycie plików cookie zgodnie z naszą{' '}
                  <MuiLink component={RouterLink} to="/privacy" underline="hover">
                    Polityką Prywatności
                  </MuiLink>
                  .
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" color="primary" onClick={handleCookieAccept} size="small">
                  Akceptuję
                </Button>
                <IconButton size="small" onClick={handleCookieClose} sx={{ color: 'text.secondary' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
          </Container>
        </Paper>
      )}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ 
          py: { xs: 0.5, sm: 0.5 }, 
          px: { xs: 1, sm: 2 },
          minHeight: { xs: '56px', sm: '64px' }
        }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <RouterLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img 
                src="/logo.svg" 
                alt="wystawoferte.pl" 
                style={{ 
                  height: isMobile ? '40px' : '55px', 
                  width: 'auto',
                  maxWidth: '100%'
                }}
              />
            </RouterLink>
          </Box>
          
          {/* Sekcje - desktop */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button 
                color="inherit" 
                onClick={() => scrollToSection('funkcje')}
                sx={{ textTransform: 'none', fontSize: '0.95rem' }}
              >
                Funkcje
              </Button>
              <Button 
                color="inherit" 
                onClick={() => scrollToSection('cennik')}
                sx={{ textTransform: 'none', fontSize: '0.95rem' }}
              >
                Cennik
              </Button>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/marketplaces"
                sx={{ textTransform: 'none', fontSize: '0.95rem' }}
              >
                Integracje
              </Button>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/faq"
                sx={{ textTransform: 'none', fontSize: '0.95rem' }}
              >
                FAQ
              </Button>
            </Box>
          )}

          {/* Sekcje - mobile menu */}
          {isMobile && (
            <>
              <IconButton
                color="inherit"
                onClick={handleMenuOpen}
                edge="end"
                sx={{ mr: 1 }}
                aria-label="menu"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    maxWidth: '90vw'
                  }
                }}
              >
                <MenuItem onClick={() => scrollToSection('funkcje')}>
                  Funkcje
                </MenuItem>
                <MenuItem onClick={() => scrollToSection('cennik')}>
                  Cennik
                </MenuItem>
                <MenuItem component={RouterLink} to="/marketplaces" onClick={handleMenuClose}>
                  Integracje
                </MenuItem>
                <MenuItem component={RouterLink} to="/faq" onClick={handleMenuClose}>
                  FAQ
                </MenuItem>
                <Box sx={{ borderTop: 1, borderColor: 'divider', mt: 0.5, pt: 0.5 }}>
                  <MenuItem 
                    component={RouterLink} 
                    to="/login" 
                    onClick={handleMenuClose}
                    sx={{ color: 'primary.main' }}
                  >
                    Logowanie
                  </MenuItem>
                  <MenuItem 
                    component={RouterLink} 
                    to="/register" 
                    onClick={handleMenuClose}
                    sx={{ 
                      color: 'primary.main',
                      fontWeight: 'bold'
                    }}
                  >
                    Rejestracja
                  </MenuItem>
                </Box>
              </Menu>
            </>
          )}

          {/* Przyciski logowania/rejestracji - tylko desktop */}
          {!isMobile && (
            <>
              <Button 
                component={RouterLink} 
                to="/login" 
                color="primary" 
                sx={{ textTransform: 'none', fontSize: '0.95rem' }}
              >
                Logowanie
              </Button>
              <Button 
                component={RouterLink} 
                to="/register" 
                variant="contained" 
                color="primary" 
                sx={{ ml: 2, textTransform: 'none', fontSize: '0.95rem' }}
              >
                Rejestracja
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      <Box component="footer" sx={{ py: 4, px: 2, mt: 'auto', backgroundColor: (theme) => theme.palette.grey[200] }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                wystawoferte.pl
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Platforma do automatycznego zarządzania ofertami sprzedaży z wykorzystaniem AI.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <IconButton 
                  component="a" 
                  href="https://www.tiktok.com/@wystawoferte" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  color="primary"
                  aria-label="TikTok"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </IconButton>
                <IconButton 
                  component="a" 
                  href="https://www.youtube.com/@wystawoferte" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  color="primary"
                  aria-label="YouTube"
                >
                  <YouTubeIcon />
                </IconButton>
                <IconButton 
                  component="a" 
                  href="https://twitter.com/wystawoferte" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  color="primary"
                  aria-label="Twitter"
                >
                  <TwitterIcon />
                </IconButton>
                <IconButton 
                  component="a" 
                  href="https://www.instagram.com/wystawoferte" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  color="primary"
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </IconButton>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Informacje
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <MuiLink 
                  component={RouterLink} 
                  to="/jak-w-30-sekund" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Jak to działa w 30 sekund?
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/allegro-legalne" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Czy Allegro jest legalne?
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/kalkulator" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Kalkulator kosztów
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/przyklady" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Przykładowe opisy
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/opinie" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Opinie użytkowników
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/marketplaces" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Integracje z marketplace'ami
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/przewodnik" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Przewodnik użytkownika
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/partnerzy" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Program Partnerski
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/wsparcie" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Wsparcie
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/blog" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Blog
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/informacje" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Informacje
                </MuiLink>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Dane firmy
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>KAICOK Marek Zaworski</strong><br />
                NIP: 5892083801<br />
                REGON: 526052165<br />
                <br />
                <strong>Kontakt:</strong><br />
                <MuiLink href="tel:+48459256861" color="inherit" underline="hover">
                  +48 459 256 861
                </MuiLink>
                <br />
                <MuiLink href="mailto:wystawoferte@gmail.com" color="inherit" underline="hover">
                  wystawoferte@gmail.com
                </MuiLink>
                <br />
                <MuiLink 
                  component={RouterLink} 
                  to="/terms" 
                  color="inherit" 
                  underline="hover" 
                  sx={{ mt: 1, display: 'block' }}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Regulamin
                </MuiLink>
                <MuiLink 
                  component={RouterLink} 
                  to="/privacy" 
                  color="inherit" 
                  underline="hover"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Polityka Prywatności
                </MuiLink>
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 3, pt: 3 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              {'Copyright © '}
              <RouterLink to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                wystawoferte.pl
              </RouterLink>{' '}
              {new Date().getFullYear()}
              {'. Wszelkie prawa zastrzeżone.'}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PublicLayout;

