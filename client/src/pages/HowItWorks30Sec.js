import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, Stepper, Step, StepLabel, StepContent, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PublishIcon from '@mui/icons-material/Publish';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const HowItWorks30Sec = () => {
  const steps = [
    {
      label: 'Krok 1: Dodaj produkt',
      time: '5 sekund',
      description: 'Wprowadź nazwę produktu lub zeskanuj kod EAN (kod kreskowy). System automatycznie rozpozna produkt i pobierze jego dane.',
      icon: <PhotoCameraIcon sx={{ fontSize: 40 }} />,
      details: [
        'Wpisz nazwę produktu lub użyj kodu EAN',
        'System automatycznie rozpoznaje produkt',
        'Pobiera dane z bazy EAN-DB lub Allegro',
        'Możesz dodać własne zdjęcia lub użyć automatycznych'
      ]
    },
    {
      label: 'Krok 2: AI generuje opis',
      time: '10 sekund',
      description: 'Nasza sztuczna inteligencja automatycznie generuje profesjonalny opis produktu, optymalizuje zdjęcia i przygotowuje ofertę zgodnie z Twoimi preferencjami.',
      icon: <AutoAwesomeIcon sx={{ fontSize: 40 }} />,
      details: [
        'AI analizuje dane produktu',
        'Generuje profesjonalny opis marketingowy',
        'Optymalizuje i edytuje zdjęcia (usuwa tło, poprawia jakość)',
        'Dostosowuje treść do wybranych platform'
      ]
    },
    {
      label: 'Krok 3: Wybierz platformy',
      time: '5 sekund',
      description: 'Wybierz na których platformach chcesz opublikować ofertę - Allegro, OLX, Erli, Otomoto i inne. Możesz wybrać wszystkie naraz!',
      icon: <PublishIcon sx={{ fontSize: 40 }} />,
      details: [
        'Wybierz jedną lub wiele platform',
        'System automatycznie dostosowuje ofertę do wymagań każdej platformy',
        'Możesz opublikować na wszystkich platformach jednocześnie',
        'Wszystko w jednym kliknięciu'
      ]
    },
    {
      label: 'Krok 4: Publikacja',
      time: '10 sekund',
      description: 'System automatycznie publikuje Twoją ofertę na wybranych platformach. Otrzymujesz potwierdzenie i linki do opublikowanych ofert.',
      icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
      details: [
        'Automatyczna publikacja na wybranych platformach',
        'Weryfikacja zgodności z regulaminami',
        'Otrzymujesz linki do opublikowanych ofert',
        'Gotowe! Twoja oferta jest już widoczna'
      ]
    }
  ];

  return (
    <PublicLayout>
      <Helmet>
        <title>Jak to działa w 30 sekund? - wystawoferte.pl</title>
        <meta name="description" content="Dowiedz się jak wystawić ofertę na wszystkich platformach w zaledwie 30 sekund. Prosty proces w 4 krokach z wykorzystaniem sztucznej inteligencji." />
        <meta name="keywords" content="jak działa wystawoferte.pl, 30 sekund, szybkie wystawianie ofert, AI, automatyczne opisy" />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <AccessTimeIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Jak to działa w 30 sekund?
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Od dodania produktu do publikacji na wszystkich platformach - wszystko w zaledwie 30 sekund!
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 4, mb: 6, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
            ⚡ 30 sekund = Gotowa oferta na wszystkich platformach
          </Typography>
          <Typography variant="h6" align="center">
            Dzięki zaawansowanej sztucznej inteligencji i automatyzacji, proces który normalnie zajmuje 15-30 minut, 
            teraz trwa zaledwie 30 sekund!
          </Typography>
        </Paper>

        <Stepper orientation="vertical" sx={{ mb: 6 }}>
          {steps.map((step, index) => (
            <Step key={index} active={true} completed={true}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '3px solid white',
                      boxShadow: 3
                    }}
                  >
                    {step.icon}
                  </Box>
                )}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {step.label}
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontWeight: 'bold'
                    }}
                  >
                    {step.time}
                  </Box>
                </Box>
              </StepLabel>
              <StepContent>
                <Paper elevation={2} sx={{ p: 3, mt: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" paragraph sx={{ fontWeight: 'bold' }}>
                    {step.description}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    {step.details.map((detail, idx) => (
                      <Grid item xs={12} sm={6} key={idx}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <CheckCircleIcon sx={{ color: 'success.main', mt: 0.5 }} />
                          <Typography variant="body1">{detail}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ bgcolor: 'grey.100', p: 4, borderRadius: 2, mb: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
            💡 Dlaczego to działa tak szybko?
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <AutoAwesomeIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Sztuczna Inteligencja
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI automatycznie generuje opisy, optymalizuje zdjęcia i dostosowuje treść do wymagań platform
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <PublishIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Automatyzacja
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Wszystkie powtarzalne zadania są zautomatyzowane - nie musisz nic robić ręcznie
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Integracje API
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bezpośrednia integracja z platformami przez API - publikacja w czasie rzeczywistym
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Gotowy do rozpoczęcia?
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Zarejestruj się już dziś i zacznij wystawiać oferty w 30 sekund!
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/register"
            sx={{ mt: 2, px: 4, py: 1.5 }}
          >
            Rozpocznij za darmo
          </Button>
        </Box>
      </Container>
    </PublicLayout>
  );
};

export default HowItWorks30Sec;

