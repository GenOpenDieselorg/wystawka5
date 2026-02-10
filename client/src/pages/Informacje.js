import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, Card, CardContent } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import InfoIcon from '@mui/icons-material/Info';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StoreIcon from '@mui/icons-material/Store';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const Informacje = () => {
  return (
    <PublicLayout>
      <Helmet>
        <title>Informacje - wystawoferte.pl</title>
        <meta name="description" content="Dowiedz się więcej o wystawoferte.pl - platformie do automatycznego tworzenia i zarządzania ofertami sprzedaży z wykorzystaniem sztucznej inteligencji." />
      </Helmet>
      
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <InfoIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Informacje o wystawoferte.pl
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Kompleksowa platforma do zarządzania ofertami sprzedaży z wykorzystaniem AI
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <AutoAwesomeIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Sztuczna Inteligencja
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Nasza platforma wykorzystuje zaawansowane algorytmy AI do automatycznego generowania profesjonalnych opisów produktów, optymalizacji zdjęć i dostosowywania treści do wymagań różnych platform marketplace.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI analizuje dane produktu, kod EAN, parametry techniczne i na ich podstawie tworzy atrakcyjne opisy marketingowe, które zwiększają szanse na sprzedaż.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <StoreIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Wielokanałowość
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Wystawiaj oferty jednocześnie na wielu platformach: Allegro, OLX, Erli, Otomoto i innych. Wszystko zarządzane z jednego miejsca.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System automatycznie dostosowuje oferty do wymagań każdej platformy, zapewniając pełną zgodność z regulaminami i optymalizację pod kątem SEO.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <SpeedIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Szybkość
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Wystawienie oferty zajmuje zaledwie 30 sekund - od dodania produktu do publikacji na wszystkich wybranych platformach.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Automatyzacja procesu eliminuje czasochłonne zadania manualne, pozwalając skupić się na rozwoju biznesu.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <SecurityIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Bezpieczeństwo
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Wszystkie dane są szyfrowane przy użyciu SSL/TLS. Platforma jest w pełni zgodna z RODO i regulaminami wszystkich zintegrowanych platform.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Twoje konto i dane są bezpieczne. Współpracujemy wyłącznie z oficjalnymi API platform, zapewniając pełną zgodność z ich regulaminami.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent>
                <AccountBalanceWalletIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Przejrzysty Cennik
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Płacisz tylko za pomyślnie opublikowane oferty. Cena zależy od liczby ofert - im więcej, tym niższa cena za ofertę dzięki rabatom progresywnym.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Brak ukrytych kosztów, brak abonamentów. Tylko płatność za faktycznie wykorzystane usługi.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper elevation={3} sx={{ p: 4, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Gotowy na start?
          </Typography>
          <Typography variant="body1" paragraph>
            Dołącz do tysięcy zadowolonych użytkowników i zautomatyzuj swoją sprzedaż już dziś!
          </Typography>
          <Box sx={{ mt: 3 }}>
            <RouterLink to="/register" style={{ color: 'white', textDecoration: 'none' }}>
              <Typography variant="h6" sx={{ textDecoration: 'underline' }}>
                Rozpocznij za darmo →
              </Typography>
            </RouterLink>
          </Box>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default Informacje;

