import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import SecurityIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';

const AllegroLegal = () => {
  const legalPoints = [
    {
      title: 'Oficjalne API Allegro',
      description: 'wystawoferte.pl korzysta wyłącznie z oficjalnego API Allegro, które jest publicznie dostępne dla wszystkich sprzedawców. To nie jest żadne obejście czy hack - to legalna integracja zgodna z regulaminem Allegro.',
      icon: <VerifiedUserIcon sx={{ fontSize: 50 }} />
    },
    {
      title: 'Zgodność z regulaminem',
      description: 'Wszystkie funkcje naszej platformy są w pełni zgodne z regulaminem Allegro. Nie naruszamy żadnych zasad, nie używamy botów ani automatów niezgodnych z regulaminem. Wszystko działa przez oficjalne API.',
      icon: <GavelIcon sx={{ fontSize: 50 }} />
    },
    {
      title: 'Bezpieczeństwo konta',
      description: 'Twoje konto Allegro jest w pełni bezpieczne. Używamy standardowego OAuth 2.0 do autoryzacji - dokładnie tak samo jak inne legalne aplikacje integrujące się z Allegro. Twoje dane są chronione.',
      icon: <SecurityIcon sx={{ fontSize: 50 }} />
    },
    {
      title: 'Przejrzystość działania',
      description: 'Wszystkie operacje są wykonywane w Twoim imieniu przez oficjalne API. Możesz w każdej chwili zobaczyć co zostało opublikowane, anulować oferty i zarządzać nimi bezpośrednio w panelu Allegro.',
      icon: <CheckCircleIcon sx={{ fontSize: 50 }} />
    }
  ];

  const faqItems = [
    {
      question: 'Czy Allegro wie o tej integracji?',
      answer: 'Tak! Wykorzystujemy oficjalne API Allegro, które jest publicznie dostępne. Allegro świadomie udostępnia API dla integracji zewnętrznych. To standardowa praktyka w branży e-commerce.'
    },
    {
      question: 'Czy moje konto może zostać zbanowane?',
      answer: 'Nie, jeśli korzystasz z naszej platformy zgodnie z regulaminem Allegro. Wszystkie operacje są wykonywane przez oficjalne API i są w pełni zgodne z regulaminem. Twoje konto jest bezpieczne.'
    },
    {
      question: 'Jak działa autoryzacja?',
      answer: 'Używamy standardowego OAuth 2.0 - dokładnie tak samo jak inne legalne aplikacje. Podczas pierwszego logowania przekierowujemy Cię na stronę Allegro, gdzie autoryzujesz dostęp. To bezpieczny i standardowy proces.'
    },
    {
      question: 'Czy mogę cofnąć autoryzację?',
      answer: 'Tak, w każdej chwili możesz cofnąć autoryzację w ustawieniach swojego konta Allegro. Masz pełną kontrolę nad dostępem do swojego konta.'
    },
    {
      question: 'Czy to jest zgodne z RODO?',
      answer: 'Tak! Wszystkie dane są przetwarzane zgodnie z RODO. Nie przechowujemy wrażliwych danych dłużej niż jest to konieczne. Wszystko jest szyfrowane i bezpieczne.'
    },
    {
      question: 'Czy mogę używać tego do masowej publikacji?',
      answer: 'Tak, ale z umiarem. Allegro ma limity API, które są przestrzegane przez naszą platformę. Nie nadużywamy API i działamy zgodnie z limitami ustalonymi przez Allegro.'
    }
  ];

  return (
    <PublicLayout>
      <Helmet>
        <title>Czy integracja z Allegro jest legalna? - wystawoferte.pl</title>
        <meta name="description" content="Dowiedz się dlaczego integracja wystawoferte.pl z Allegro jest w pełni legalna i bezpieczna. Oficjalne API, zgodność z regulaminem, bezpieczeństwo danych." />
        <meta name="keywords" content="Allegro legalne, API Allegro, integracja Allegro, bezpieczeństwo Allegro, regulamin Allegro" />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <SecurityIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Czy integracja z Allegro jest legalna?
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Tak! W pełni legalna, bezpieczna i zgodna z regulaminem Allegro
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 4, mb: 6, bgcolor: 'success.main', color: 'white' }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold' }}>
            ✅ 100% Legalne i Zgodne z Regulaminem
          </Typography>
          <Typography variant="h6" align="center">
            wystawoferte.pl korzysta wyłącznie z oficjalnego API Allegro, które jest publicznie dostępne 
            i przeznaczone do integracji zewnętrznych. To nie jest żadne obejście - to standardowa, legalna integracja.
          </Typography>
        </Paper>

        <Grid container spacing={4} sx={{ mb: 6 }}>
          {legalPoints.map((point, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Paper elevation={3} sx={{ p: 4, height: '100%', textAlign: 'center' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {point.icon}
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {point.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {point.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
            Jak to działa?
          </Typography>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              1. Oficjalne API Allegro
            </Typography>
            <Typography variant="body1" paragraph>
              Allegro świadomie udostępnia publiczne API (Application Programming Interface) dla wszystkich sprzedawców. 
              To oficjalne narzędzie do integracji zewnętrznych aplikacji. Wiele firm korzysta z tego API - 
              to standardowa praktyka w branży e-commerce.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              2. Autoryzacja OAuth 2.0
            </Typography>
            <Typography variant="body1" paragraph>
              Używamy standardowego protokołu OAuth 2.0 do autoryzacji. Podczas pierwszego logowania przekierowujemy 
              Cię na oficjalną stronę Allegro, gdzie autoryzujesz dostęp. To dokładnie ten sam proces, który używają 
              inne legalne aplikacje integrujące się z Allegro.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              3. Zgodność z Regulaminem
            </Typography>
            <Typography variant="body1" paragraph>
              Wszystkie operacje wykonywane przez naszą platformę są w pełni zgodne z regulaminem Allegro. 
              Nie używamy botów, nie omijamy zabezpieczeń, nie naruszamy żadnych zasad. Wszystko działa przez 
              oficjalne, legalne kanały.
            </Typography>

            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mt: 3 }}>
              4. Bezpieczeństwo Twojego Konta
            </Typography>
            <Typography variant="body1" paragraph>
              Twoje konto Allegro jest w pełni bezpieczne. Możesz w każdej chwili cofnąć autoryzację w ustawieniach 
              konta. Wszystkie operacje są wykonywane w Twoim imieniu i możesz je śledzić w panelu Allegro.
            </Typography>
          </Paper>
        </Box>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
            Najczęściej zadawane pytania
          </Typography>
          {faqItems.map((item, index) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1">
                  {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        <Paper elevation={3} sx={{ p: 4, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Masz wątpliwości?
          </Typography>
          <Typography variant="body1" paragraph>
            Jeśli masz jakiekolwiek pytania dotyczące legalności integracji, skontaktuj się z nami. 
            Chętnie odpowiemy na wszystkie Twoje pytania.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/register"
            sx={{ mt: 2, bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Rozpocznij już dziś
          </Button>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default AllegroLegal;

