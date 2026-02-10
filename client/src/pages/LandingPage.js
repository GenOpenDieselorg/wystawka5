import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Button, 
  Paper, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  Link,
  useMediaQuery,
  useTheme as useMuiTheme
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StoreIcon from '@mui/icons-material/Store';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FacebookIcon from '@mui/icons-material/Facebook';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';
import ImageIcon from '@mui/icons-material/Image';
import EditIcon from '@mui/icons-material/Edit';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

const LandingPage = () => {
  const [stats, setStats] = useState({ users: 0, auctions: 0 });
  const [referralCode, setReferralCode] = useState('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showNetto, setShowNetto] = useState(true); // Default to netto
  const sliderContainerRef = useRef(null);
  const location = useLocation();
  const { toggleDarkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Pricing tiers (NETTO)
  // od 1 do 100 ofert: 1.09 zł netto
  // od 100 do 400: 0.99 zł netto (od 101)
  // od 400 do 800: 0.89 zł netto (od 401)
  // od 800 ofert: 0.79 zł netto (od 801)
  const pricingTiers = [
    { min: 1, max: 100, netto: 1.09 },
    { min: 101, max: 400, netto: 0.99 },
    { min: 401, max: 800, netto: 0.89 },
    { min: 801, max: Infinity, netto: 0.79 }
  ];

  const getPrice = (nettoPrice) => {
    return showNetto ? nettoPrice : (nettoPrice * 1.23).toFixed(2);
  };

  // Wymuszenie białego motywu na stronie głównej - tylko i wyłącznie biały motyw
  useEffect(() => {
    // Wymuś biały motyw bezpośrednio w localStorage i przez toggleDarkMode
    const currentDarkMode = localStorage.getItem('darkMode') === 'true';
    if (currentDarkMode) {
      localStorage.setItem('darkMode', 'false');
      toggleDarkMode(false);
    }
    // Upewnij się, że motyw jest biały przy każdym renderze
    if (localStorage.getItem('darkMode') === 'true') {
      localStorage.setItem('darkMode', 'false');
      toggleDarkMode(false);
    }
  }, [toggleDarkMode]);

  useEffect(() => {
    // Fetch statistics (you can create an endpoint for this)
    fetchStats();
  }, []);

  // Scroll to pricing section if on /cennik route
  useEffect(() => {
    if (location.pathname === '/cennik') {
      // Use longer timeout to ensure page is fully loaded
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById('cennik');
        if (element) {
          // Scroll with offset for navbar
          const yOffset = -80;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(scrollTimer);
    }
  }, [location.pathname]);

  const fetchStats = async () => {
    try {
      // TODO: Create /api/stats endpoint
      // For now using placeholder data
      setStats({ users: 1250, auctions: 45000 });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback to default values
      setStats({ users: 1250, auctions: 45000 });
    }
  };

  const handleReferralCodeCopy = () => {
    setReferralCode('STARTUJE');
    navigator.clipboard.writeText('STARTUJE');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Before/After Slider handlers
  const updateSliderPosition = useCallback((e) => {
    const container = sliderContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    if (clientX === undefined) return;
    
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleSliderMouseDown = useCallback((e) => {
    setIsDragging(true);
    updateSliderPosition(e);
  }, [updateSliderPosition]);

  const handleSliderTouchStart = useCallback((e) => {
    setIsDragging(true);
    if (e.touches && e.touches[0]) {
      updateSliderPosition(e.touches[0]);
    }
  }, [updateSliderPosition]);

  // Add event listeners for mouse move/up when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      if (e.type === 'mousemove') {
        updateSliderPosition(e);
      } else if (e.type === 'touchmove') {
        e.preventDefault();
        if (e.touches && e.touches[0]) {
          updateSliderPosition(e.touches[0]);
        }
      }
    };
    
    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updateSliderPosition]);

  const faqItems = [
    {
      question: 'Jak działa wystawoferte.pl?',
      answer: 'wystawoferte.pl to platforma do automatycznego tworzenia i zarządzania ofertami sprzedaży. Wystarczy dodać produkt, a nasze narzędzie AI wygeneruje profesjonalny opis i automatycznie opublikuje ofertę na wybranych platformach marketplace.'
    },
    {
      question: 'Ile kosztuje korzystanie z platformy?',
      answer: 'Nie pobieramy prowizji za wystawiony produkt! Płacisz tylko opłatę zgodnie z cennikiem za wystawienie oferty. Koszt publikacji jednej oferty (która automatycznie pojawia się na wszystkich platformach) zaczyna się od 1 PLN. Oferujemy również pakiety z rabatami dla większych wolumenów. Sprawdź sekcję Cennik powyżej.'
    },
    {
      question: 'Z jakimi platformami jest zintegrowana aplikacja?',
      answer: 'Aplikacja jest zintegrowana z Allegro, OLX, Erli, Otomoto i innymi platformami. Wystarczy jedno kliknięcie, a Twoja oferta automatycznie pojawi się na wszystkich wybranych platformach jednocześnie. Jedna oferta = wystawienie na wszystkie platformy!'
    },
    {
      question: 'Czy moje dane są bezpieczne?',
      answer: 'Tak! Wszystkie dane są szyfrowane przy użyciu SSL/TLS. Platforma jest w pełni zgodna z RODO i regulaminem Allegro. Bezpieczeństwo to nasz priorytet.'
    },
    {
      question: 'Jak mogę otrzymać 50 PLN na start?',
      answer: 'Użyj kodu polecającego "STARTUJE" podczas rejestracji. Otrzymasz 50 PLN na start, co odpowiada 50 darmowym aukcjom!'
    },
    {
      question: 'Czy mogę anulować publikację?',
      answer: 'Tak, możesz anulować publikację przed jej finalizacją. Opłata jest pobierana tylko za pomyślnie opublikowane aukcje.'
    },
    {
      question: 'Czy aplikacja działa na telefonach?',
      answer: 'Tak! wystawoferte.pl jest w pełni responsywna i działa doskonale na telefonach, tabletach i komputerach. Możesz zarządzać swoimi ofertami z dowolnego urządzenia, gdziekolwiek jesteś!'
    }
  ];

  return (
    <PublicLayout>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI</title>
        <meta name="title" content="wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI" />
        <meta name="description" content="Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia. Tylko 1 PLN za aukcję!" />
        <meta name="keywords" content="wystawianie ofert, Allegro, OLX, Erli, Otomoto, AI, automatyczne opisy produktów, marketplace, sprzedaż online, zarządzanie aukcjami" />
        <meta name="robots" content="index, follow" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wystawoferte.pl/" />
        <meta property="og:title" content="wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI" />
        <meta property="og:description" content="Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia. Tylko 1 PLN za aukcję!" />
        <meta property="og:image" content="https://wystawoferte.pl/og-image.jpg" />
        <meta property="og:locale" content="pl_PL" />
        <meta property="og:site_name" content="wystawoferte.pl" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://wystawoferte.pl/" />
        <meta property="twitter:title" content="wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI" />
        <meta property="twitter:description" content="Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia. Tylko 1 PLN za aukcję!" />
        <meta property="twitter:image" content="https://wystawoferte.pl/og-image.jpg" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://wystawoferte.pl/" />
        
        {/* Structured Data (JSON-LD) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "wystawoferte.pl",
            "url": "https://wystawoferte.pl",
            "description": "Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "1.00",
              "priceCurrency": "PLN",
              "description": "1 PLN za aukcję"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "reviewCount": "1250"
            },
            "featureList": [
              "Automatyczne generowanie opisów produktów z AI",
              "Edycja zdjęć przez AI",
              "Integracja z Allegro, OLX, Erli, Otomoto",
              "Wystawianie ofert w 30 sekund",
              "Zarządzanie wieloma platformami z jednego miejsca"
            ]
          })}
        </script>
      </Helmet>
      
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          pt: { xs: 4, sm: 6, md: 8 },
          pb: { xs: 4, sm: 5, md: 6 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="md">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="text.primary"
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3.75rem' },
              lineHeight: { xs: 1.2, md: 1.3 },
            }}
          >
            Wystawiaj oferty na wszystkie platformy nawet w 30 sekund
          </Typography>
          <Typography
            component="h2"
            variant="h5"
            align="center"
            color="text.secondary"
            paragraph
            sx={{ 
              mt: { xs: 2, md: 3 },
              mb: 2,
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
            }}
          >
            Wspieramy: <strong>Allegro</strong>, <strong>OLX</strong>, <strong>Erli</strong>, <strong>Otomoto</strong> i wiele innych
          </Typography>
          <Box sx={{ 
            maxWidth: 800, 
            margin: { xs: '20px auto', md: '30px auto' }, 
            position: 'relative',
            px: { xs: 0, sm: 2 },
          }}>
            <video
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: '100%',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <source src="/hero-video.mp4" type="video/mp4" />
              Twoja przeglądarka nie obsługuje odtwarzania wideo.
            </video>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="text"
              component={RouterLink}
              to="/marketplaces"
              onClick={scrollToTop}
              sx={{ 
                textTransform: 'none',
                fontSize: { xs: '0.875rem', md: '1rem' },
              }}
            >
              Zobacz pełną listę integracji →
            </Button>
          </Box>
          <Typography 
            variant="body1" 
            align="center" 
            color="text.secondary" 
            paragraph
            sx={{
              fontSize: { xs: '0.875rem', md: '1rem' },
              px: { xs: 2, sm: 0 },
            }}
          >
            wystawoferte.pl to nowoczesna platforma do kompleksowego zarządzania ofertami, produktami i integracjami z marketplace'ami.
            Zautomatyzuj swoją sprzedaż dzięki sztucznej inteligencji.
          </Typography>
          <Box sx={{ 
            mt: 2, 
            p: { xs: 2, md: 3 }, 
            bgcolor: 'primary.50', 
            borderRadius: 2,
            textAlign: 'center',
            mx: { xs: 2, sm: 0 },
          }}>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                color: 'primary.main',
                fontSize: { xs: '1rem', md: '1.25rem' },
              }}
            >
              ⚡ Jedna oferta = wystawienie na wszystkie platformy jednocześnie!
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
            >
              Wystarczy jedno kliknięcie, a Twoja oferta automatycznie pojawi się na Allegro, OLX, Erli, Otomoto i innych platformach. 
              <strong> Nie pobieramy prowizji</strong> - płacisz tylko opłatę zgodnie z cennikiem za wystawienie oferty.
            </Typography>
          </Box>
          <Box sx={{ 
            mt: { xs: 3, md: 4 }, 
            display: 'flex', 
            justifyContent: 'center', 
            gap: { xs: 1.5, md: 2 },
            flexDirection: { xs: 'column', sm: 'row' },
            px: { xs: 2, sm: 0 },
          }}>
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/register"
              fullWidth={isMobile}
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                py: { xs: 1.5, md: 1.75 },
              }}
            >
              Rozpocznij za darmo
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/login"
              fullWidth={isMobile}
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                py: { xs: 1.5, md: 1.75 },
              }}
            >
              Zaloguj się
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Statistics Section */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        py: { xs: 4, md: 6 },
        px: { xs: 2, sm: 3 },
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: { xs: 48, md: 60 }, mb: 2 }} />
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 1,
                    fontSize: { xs: '2rem', md: '3rem' },
                  }}
                >
                  {stats.users.toLocaleString('pl-PL')}+
                </Typography>
                <Typography 
                  variant="h6"
                  sx={{ fontSize: { xs: '0.875rem', md: '1.25rem' } }}
                >
                  Zarejestrowanych użytkowników
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: { xs: 48, md: 60 }, mb: 2 }} />
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 1,
                    fontSize: { xs: '2rem', md: '3rem' },
                  }}
                >
                  {stats.auctions.toLocaleString('pl-PL')}+
                </Typography>
                <Typography 
                  variant="h6"
                  sx={{ fontSize: { xs: '0.875rem', md: '1.25rem' } }}
                >
                  Aukcji miesięcznie
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box 
        sx={{ 
          bgcolor: 'grey.50', 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            align="center" 
            gutterBottom 
            sx={{ 
              mb: 2, 
              fontWeight: 'bold',
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Jak to działa?
          </Typography>
          <Typography 
            variant="h5" 
            align="center" 
            color="text.secondary" 
            gutterBottom 
            sx={{ 
              mb: { xs: 4, md: 6 },
              fontSize: { xs: '1.125rem', sm: '1.5rem', md: '1.75rem' },
            }}
          >
            Prosta droga do wystawienia oferty - wystarczy 3 kroki!
          </Typography>
          <Grid container spacing={{ xs: 2, md: 4 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'primary.main', 
                    mb: 2,
                    fontSize: { xs: '2rem', md: '3rem' },
                  }}
                >
                  1
                </Typography>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Wpisz numer EAN
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Wystarczy wpisać kod kreskowy (EAN) produktu. Nasze AI automatycznie rozpozna produkt i przygotuje wszystkie potrzebne informacje.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'primary.main', 
                    mb: 2,
                    fontSize: { xs: '2rem', md: '3rem' },
                  }}
                >
                  2
                </Typography>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Dodaj zdjęcia i ceny
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Przeciągnij i upuść zdjęcia produktu oraz ustaw ceny. AI automatycznie zoptymalizuje zdjęcia i przygotuje profesjonalny opis.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: 'bold', 
                    color: 'primary.main', 
                    mb: 2,
                    fontSize: { xs: '2rem', md: '3rem' },
                  }}
                >
                  3
                </Typography>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Jedno kliknięcie - gotowe!
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Kliknij "Wystaw ofertę" i wszystko automatycznie załaduje się na Allegro, OLX, Erli, Otomoto i inne platformy jednocześnie. To wszystko!
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          <Box sx={{ 
            mt: { xs: 4, md: 6 }, 
            p: { xs: 2, md: 3 }, 
            bgcolor: 'primary.main', 
            color: 'white',
            borderRadius: 2,
            textAlign: 'center',
          }}>
            <Typography 
              variant="h5" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.125rem', md: '1.5rem' },
              }}
            >
              ⚡ Wystarczy jedno kliknięcie!
            </Typography>
            <Typography 
              variant="body1"
              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
            >
              Jedna oferta = wystawienie na wszystkie platformy jednocześnie. Nie musisz logować się na każdą platformę osobno - 
              wystarczy jedno kliknięcie, a Twoja oferta pojawi się automatycznie na Allegro, OLX, Erli, Otomoto i innych marketplace'ach.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* AI Features Section */}
      <Box 
        id="funkcje" 
        sx={{ 
          bgcolor: 'background.paper', 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            align="center" 
            gutterBottom 
            sx={{ 
              mb: 2, 
              fontWeight: 'bold',
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Zaawansowana Sztuczna Inteligencja
          </Typography>
          <Typography 
            variant="h5" 
            align="center" 
            color="text.secondary" 
            gutterBottom 
            sx={{ 
              mb: 2,
              fontSize: { xs: '1.125rem', sm: '1.5rem', md: '1.75rem' },
            }}
          >
            AI, które pracuje za Ciebie
          </Typography>
          <Typography 
            variant="body1" 
            align="center" 
            color="text.secondary" 
            paragraph 
            sx={{ 
              mb: { xs: 4, md: 6 },
              fontSize: { xs: '0.875rem', md: '1rem' },
            }}
          >
            Wykorzystaj moc sztucznej inteligencji do automatyzacji tworzenia ofert sprzedażowych.
          </Typography>
          <Grid container spacing={{ xs: 2, md: 4 }}>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <SmartToyIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Generowanie Opisów z AI
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Nasze AI automatycznie generuje profesjonalne opisy produktów na podstawie nazwy produktu, kodu EAN i Twoich własnych wytycznych.
                </Typography>
                <Box sx={{ textAlign: 'left', mt: 2 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Na podstawie nazwy produktu
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Na podstawie kodu EAN (kod kreskowy)
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Własne wytyczne: styl, długość, akcenty marketingowe
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <ImageIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Edycja Zdjęć przez AI
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Nasze AI automatycznie edytuje zdjęcia produktów, usuwając tło i optymalizując jakość do Twoich wytycznych.
                </Typography>
                <Box sx={{ textAlign: 'left', mt: 2 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Automatyczne usuwanie tła
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Optymalizacja jakości
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Dostosowanie stylu tła i kolorystyki
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <EditIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Personalizacja AI
                </Typography>
                <Typography 
                  color="text.secondary" 
                  paragraph
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Masz pełną kontrolę nad tym, jak AI generuje treści. AI uczy się Twoich preferencji i dostosowuje się do Twojego stylu!
                </Typography>
                <Box sx={{ textAlign: 'left', mt: 2 }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Własne szablony opisów
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Style edycji zdjęć
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                  >
                    • Preferencje marketingowe
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 5 Reasons Section */}
      <Container 
        sx={{ 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }} 
        maxWidth="lg"
      >
        <Typography 
          variant="h3" 
          align="center" 
          gutterBottom 
          sx={{ 
            mb: { xs: 4, md: 6 }, 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
            px: { xs: 2, sm: 0 },
          }}
        >
          5 powody, dla których wystawoferte jest najlepszym wyborem dla Ciebie
        </Typography>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 150, md: 200 },
                  mb: { xs: 2, md: 3 },
                  borderRadius: '8px',
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src="/reasons/speed.jpg"
                  alt="Szybkość i Efektywność"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">Zdjęcie</div>';
                  }}
                />
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                1
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Szybkość i Efektywność
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Wystaw ofertę w zaledwie 30 sekund. Automatyczne generowanie opisów przez AI oszczędza godziny pracy każdego dnia.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 150, md: 200 },
                  mb: { xs: 2, md: 3 },
                  borderRadius: '8px',
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src="/reasons/cost.jpg"
                  alt="Oszczędność Kosztów"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">Zdjęcie</div>';
                  }}
                />
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                2
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Oszczędność Kosztów
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Tylko opłata zgodnie z cennikiem za wystawienie oferty - <strong>nie pobieramy prowizji!</strong> Zamiast tysięcy złotych miesięcznie na wynagrodzenia pracowników, płacisz tylko za faktycznie wystawione oferty. Rabaty progresywne dla większych wolumenów.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 150, md: 200 },
                  mb: { xs: 2, md: 3 },
                  borderRadius: '8px',
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src="/reasons/professional.jpg"
                  alt="Profesjonalne Opisy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">Zdjęcie</div>';
                  }}
                />
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                3
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Profesjonalne Opisy
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                AI generuje profesjonalne, zoptymalizowane pod SEO opisy produktów, które zwiększają konwersję i widoczność ofert.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 150, md: 200 },
                  mb: { xs: 2, md: 3 },
                  borderRadius: '8px',
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src="/reasons/multichannel.jpg"
                  alt="Wielokanałowość"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">Zdjęcie</div>';
                  }}
                />
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                4
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Wielokanałowość
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Jedna oferta = wystawienie na wszystkie platformy jednocześnie! Wystarczy jedno kliknięcie, a Twoja oferta automatycznie pojawi się na Allegro, OLX, Erli, Otomoto i innych marketplace'ach. Nie pobieramy prowizji - płacisz tylko opłatę zgodnie z cennikiem.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center', overflow: 'hidden' }}>
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 150, md: 200 },
                  mb: { xs: 2, md: 3 },
                  borderRadius: '8px',
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src="/reasons/availability.jpg"
                  alt="Dostępność 24/7"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">Zdjęcie</div>';
                  }}
                />
              </Box>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                5
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Dostępność 24/7
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Platforma działa non-stop. Wystawiaj oferty o każdej porze dnia i nocy, bez ograniczeń czasowych.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Discover Possibilities Section */}
      <Box sx={{ 
        bgcolor: 'grey.50', 
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 3 },
      }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            align="center" 
            gutterBottom 
            sx={{ 
              mb: { xs: 4, md: 6 }, 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
            }}
          >
            Odkryj możliwości wystawoferte.pl
          </Typography>
          <Grid container spacing={{ xs: 2, md: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <AutoAwesomeIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  AI Wspiera Sprzedaż
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Automatyczne generowanie opisów produktów i optymalizacja ofert dzięki zaawansowanym algorytmom AI.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <StoreIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Wielokanałowość
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Integracja z Allegro, OLX, Erli, Otomoto i innymi platformami w jednym miejscu. Wystarczy jedno kliknięcie, a oferta pojawi się na wszystkich platformach jednocześnie. Zarządzaj wszystkim z jednego panelu.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <AccountBalanceWalletIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Portfel i Finanse
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Łatwe zarządzanie środkami, doładowania i przejrzysta historia transakcji.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <SpeedIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Automatyzacja
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Oszczędzaj czas dzięki automatyzacji powtarzalnych zadań i procesów wystawiania ofert.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <ImageIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Edycja Zdjęć przez AI
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Automatyczne usuwanie tła, optymalizacja jakości i dostosowanie zdjęć do Twoich wytycznych.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
                <SmartToyIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '1rem', md: '1.25rem' },
                  }}
                >
                  Zarządzanie Produktami
                </Typography>
                <Typography 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  Centralne zarządzanie wszystkimi produktami, ofertami i integracjami z jednego miejsca.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Before/After Comparison Section */}
      <Container 
        sx={{ 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }} 
        maxWidth="lg"
      >
        <Typography 
          variant="h3" 
          align="center" 
          gutterBottom 
          sx={{ 
            mb: { xs: 4, md: 6 }, 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
            px: { xs: 2, sm: 0 },
          }}
        >
          Porównanie: Z wystawoferte.pl vs Bez wystawoferte.pl
        </Typography>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2,
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <Box
            ref={sliderContainerRef}
            className="before-after-container"
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              margin: '0 auto',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
            onMouseDown={handleSliderMouseDown}
            onTouchStart={handleSliderTouchStart}
          >
            {/* Before Image (Background) */}
            <Box
              sx={{
                width: '100%',
                paddingTop: '56.25%', // 16:9 aspect ratio
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <img
                src="/przed.jpg"
                alt="Przed - bez wystawoferte"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </Box>

            {/* After Image (Overlay) */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${sliderPosition}%`,
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(100 / sliderPosition) * 100}%`,
                  height: '100%',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    position: 'relative',
                  }}
                >
                  <img
                    src="/po.jpg"
                    alt="Po - z wystawoferte"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Slider Handle */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: `${sliderPosition}%`,
                width: '4px',
                height: '100%',
                backgroundColor: 'white',
                cursor: 'grab',
                zIndex: 10,
                boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                transition: isDragging ? 'none' : 'left 0.1s ease-out',
                '&:hover': {
                  width: '6px',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  border: '3px solid',
                  borderColor: 'primary.main',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  cursor: 'grab',
                },
                '&:active': {
                  cursor: 'grabbing',
                },
              }}
            />

            {/* Labels */}
            <Box
              sx={{
                position: 'absolute',
                top: { xs: '10px', md: '20px' },
                left: { xs: '10px', md: '20px' },
                backgroundColor: 'rgba(211, 47, 47, 0.9)',
                color: 'white',
                padding: { xs: '6px 12px', md: '8px 16px' },
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: { xs: '12px', md: '14px' },
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              ❌ Bez wystawoferte.pl
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: { xs: '10px', md: '20px' },
                right: { xs: '10px', md: '20px' },
                backgroundColor: 'rgba(25, 118, 210, 0.9)',
                color: 'white',
                padding: { xs: '6px 12px', md: '8px 16px' },
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: { xs: '12px', md: '14px' },
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              ✅ Z wystawoferte.pl
            </Box>
          </Box>
        </Paper>
        
        {/* Comparison Points */}
        <Grid container spacing={{ xs: 2, md: 4 }} sx={{ mt: { xs: 2, md: 4 } }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, bgcolor: 'error.50' }}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'error.main', 
                  mb: 2,
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                ❌ Bez wystawoferte.pl
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Ręczne tworzenie opisów - 15-30 minut na ofertę
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Wysokie koszty zatrudnienia pracowników
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Błędy i niespójności w opisach
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Ograniczona dostępność (8h/dzień)
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Trudność w zarządzaniu wieloma platformami
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                >
                  Brak optymalizacji SEO
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, bgcolor: 'primary.50' }}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                ✅ Z wystawoferte.pl
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Automatyczne generowanie opisów - 30 sekund na ofertę
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Tylko opłata zgodnie z cennikiem - nie pobieramy prowizji!
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Profesjonalne, spójne opisy
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Dostępność 24/7
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 1,
                    fontSize: { xs: '0.75rem', md: '0.875rem' },
                  }}
                >
                  Automatyczna publikacja na wielu platformach
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                >
                  Zaawansowana optymalizacja SEO przez AI
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Comparison Section */}
      <Box sx={{ 
        bgcolor: 'grey.100', 
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 3 },
      }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h3" 
            align="center" 
            gutterBottom 
            sx={{ 
              mb: { xs: 4, md: 6 }, 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
            }}
          >
            Zwykły pracownik vs wystawoferte.pl
          </Typography>
          <TableContainer 
            component={Paper} 
            elevation={3}
            sx={{
              overflowX: 'auto',
            }}
          >
            <Table sx={{ minWidth: { xs: 600, md: 'auto' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    fontSize: { xs: '0.875rem', md: '1.1rem' },
                    whiteSpace: 'nowrap',
                  }}>
                    Funkcja
                  </TableCell>
                  <TableCell 
                    align="center" 
                    sx={{ 
                      fontWeight: 'bold', 
                      fontSize: { xs: '0.875rem', md: '1.1rem' },
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Zwykły pracownik
                  </TableCell>
                  <TableCell 
                    align="center" 
                    sx={{ 
                      fontWeight: 'bold', 
                      fontSize: { xs: '0.875rem', md: '1.1rem' }, 
                      color: 'primary.main',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    wystawoferte.pl
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Czas na stworzenie jednej aukcji
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    15-30 minut
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="2-5 minut" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Koszt miesięczny
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    3000-5000 PLN
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="Opłata zgodnie z cennikiem (bez prowizji)" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Dostępność
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CancelIcon />} 
                      label="8h/dzień" 
                      color="error"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="24/7" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Błędy i pomyłki
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Częste
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="Minimalne" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Skalowalność
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Ograniczona
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="Nieograniczona" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Wielokanałowość
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CancelIcon />} 
                      label="Trudna" 
                      color="error"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="Automatyczna" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Optymalizacja SEO
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                    Podstawowa
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label="Zaawansowana AI" 
                      color="success"
                      size={isMobile ? 'small' : 'medium'}
                      sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' } }}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Container 
        id="cennik" 
        sx={{ 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }} 
        maxWidth="lg"
      >
        <Typography 
          variant="h3" 
          align="center" 
          gutterBottom 
          sx={{ 
            mb: 2, 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
          }}
        >
          Cennik (rabaty progresywne)
        </Typography>
        <Typography 
          variant="body1" 
          align="center" 
          color="text.secondary" 
          sx={{ 
            mb: { xs: 2, md: 3 },
            fontSize: { xs: '0.875rem', md: '1rem' },
            px: { xs: 2, sm: 0 },
          }}
        >
          <strong>Nie pobieramy prowizji!</strong> Płacisz tylko opłatę zgodnie z cennikiem za wystawienie oferty. 
          Jedna oferta = wystawienie na wszystkie platformy jednocześnie (Allegro, OLX, Erli, Otomoto i inne). 
          Cena za ofertę oraz edycję opisu AI zależy od numeru oferty. Każda oferta ma swoją cenę w zależności od przedziału.
          <br /><strong>Wszystkie ceny podane są w cenie netto. Wystawiamy fakturę VAT 23%.</strong>
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Ceny {showNetto ? 'netto' : 'brutto'}
          </Typography>
          <Button
            variant={showNetto ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setShowNetto(true)}
            sx={{ minWidth: 80 }}
          >
            Netto
          </Button>
          <Button
            variant={!showNetto ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setShowNetto(false)}
            sx={{ minWidth: 80 }}
          >
            Brutto
          </Button>
        </Box>
        <Typography 
          variant="body2" 
          align="center" 
          color="text.secondary" 
          sx={{ 
            mb: { xs: 3, md: 4 },
            fontSize: { xs: '0.75rem', md: '0.875rem' },
            px: { xs: 2, sm: 0 },
            fontStyle: 'italic',
          }}
        >
          Wystawiamy fakturę VAT 23%
        </Typography>
        <TableContainer 
          component={Paper} 
          elevation={3} 
          sx={{ 
            mb: { xs: 3, md: 4 },
            overflowX: 'auto',
          }}
        >
          <Table sx={{ minWidth: { xs: 300, md: 'auto' } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '0.875rem', md: '1rem' },
                }}>
                  Przedział ofert
                </TableCell>
                <TableCell 
                  align="center" 
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.875rem', md: '1rem' },
                  }}
                >
                  Cena za ofertę ({showNetto ? 'netto' : 'brutto'})
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  1-100 ofert
                </TableCell>
                <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  {getPrice(1.09)} PLN
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  101-400 ofert
                </TableCell>
                <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  {getPrice(0.99)} PLN
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  401-800 ofert
                </TableCell>
                <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  {getPrice(0.89)} PLN
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  Powyżej 800 ofert
                </TableCell>
                <TableCell align="center" sx={{ fontSize: { xs: '0.75rem', md: '1rem' } }}>
                  {getPrice(0.79)} PLN
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, bgcolor: 'grey.50' }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Przykłady:
          </Typography>
          <Typography 
            variant="body2" 
            paragraph
            sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
          >
            • 99 ofert = 99 × {getPrice(1.09)} PLN = {(99 * parseFloat(getPrice(1.09))).toFixed(2)} PLN
          </Typography>
          <Typography 
            variant="body2" 
            paragraph
            sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
          >
            • 100 ofert = 99 × {getPrice(1.09)} PLN + 1 × {getPrice(0.99)} PLN = {(99 * parseFloat(getPrice(1.09)) + 1 * parseFloat(getPrice(0.99))).toFixed(2)} PLN
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2, 
              fontStyle: 'italic', 
              color: 'text.secondary',
              fontSize: { xs: '0.75rem', md: '0.875rem' },
            }}
          >
            Licznik zwiększa się przy tworzeniu oferty, nie przy usuwaniu.
          </Typography>
        </Paper>
      </Container>

      {/* Additional Benefits Section */}
      <Container 
        sx={{ 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }} 
        maxWidth="lg"
      >
        <Typography 
          variant="h3" 
          align="center" 
          gutterBottom 
          sx={{ 
            mb: { xs: 4, md: 6 }, 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
          }}
        >
          Dodatkowe Korzyści
        </Typography>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                30 sekund
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
              >
                Czas na wystawienie oferty
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Od dodania produktu do publikacji na wszystkich platformach - wszystko w zaledwie 30 sekund!
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                24/7
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
              >
                Dostępność
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Platforma działa non-stop. Wystawiaj oferty o każdej porze dnia i nocy, bez ograniczeń!
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main', 
                  mb: 2,
                  fontSize: { xs: '1.75rem', md: '2.125rem' },
                }}
              >
                100%
              </Typography>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
              >
                Zgodność z regulaminami
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Wszystkie oferty są automatycznie weryfikowane pod kątem zgodności z regulaminami platform.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Referral Code Section */}
      <Box sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        py: { xs: 4, md: 6 },
        px: { xs: 2, sm: 3 },
      }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <LocalOfferIcon sx={{ fontSize: { xs: 48, md: 60 }, mb: 2 }} />
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
              }}
            >
              Otrzymaj 50 PLN na start!
            </Typography>
            <Typography 
              variant="h6" 
              paragraph
              sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}
            >
              Użyj kodu polecającego <strong>"STARTUJE"</strong> podczas rejestracji
            </Typography>
            <Typography 
              variant="body1" 
              paragraph
              sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
            >
              To 50 darmowych aukcji do wykorzystania od razu po rejestracji!
            </Typography>
            <Box sx={{ mt: { xs: 3, md: 4 } }}>
              <Paper sx={{ 
                p: { xs: 2, md: 3 }, 
                display: 'inline-block', 
                bgcolor: 'white', 
                color: 'primary.main' 
              }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 'bold', 
                    fontFamily: 'monospace',
                    fontSize: { xs: '1.5rem', md: '2.125rem' },
                  }}
                >
                  STARTUJE
                </Typography>
              </Paper>
            </Box>
            <Button
              variant="contained"
              size="large"
              sx={{ 
                mt: 3, 
                bgcolor: 'white', 
                color: 'primary.main', 
                '&:hover': { bgcolor: 'grey.100' },
                fontSize: { xs: '1rem', md: '1.125rem' },
                py: { xs: 1.5, md: 1.75 },
                px: { xs: 2, md: 3 },
              }}
              component={RouterLink}
              to="/register"
              fullWidth
            >
              Zarejestruj się z kodem STARTUJE
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Security Section */}
      <Container 
        sx={{ 
          py: { xs: 4, md: 8 },
          px: { xs: 2, sm: 3 },
        }} 
        maxWidth="lg"
      >
        <Typography 
          variant="h3" 
          align="center" 
          gutterBottom 
          sx={{ 
            mb: { xs: 4, md: 6 }, 
            fontWeight: 'bold',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
          }}
        >
          Bezpieczeństwo to nasz priorytet
        </Typography>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Zgodność z regulaminem Allegro
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Wszystkie nasze narzędzia są w pełni zgodne z regulaminem Allegro. Twoje konto jest bezpieczne.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                SSL/TLS Szyfrowanie
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Wszystkie dane są przesyłane przez bezpieczne połączenie SSL/TLS. Twoje informacje są chronione.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, height: '100%', textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: { xs: 48, md: 60 }, color: 'primary.main', mb: 2 }} />
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: { xs: '1rem', md: '1.25rem' },
                }}
              >
                Zgodność z RODO
              </Typography>
              <Typography 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
              >
                Pełna zgodność z Rozporządzeniem RODO. Twoje dane osobowe są bezpieczne i chronione.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* FAQ Section */}
      <Box sx={{ 
        bgcolor: 'background.paper', 
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 3 },
      }}>
        <Container maxWidth="md">
          <Typography 
            variant="h3" 
            align="center" 
            gutterBottom 
            sx={{ 
              mb: { xs: 4, md: 6 }, 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' },
            }}
          >
            Najczęściej zadawane pytania (FAQ)
          </Typography>
          {faqItems.map((item, index) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
                  }}
                >
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography 
                  variant="body1"
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      </Box>
    </PublicLayout>
  );
};

export default LandingPage;
