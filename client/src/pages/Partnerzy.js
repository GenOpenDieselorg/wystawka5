import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, Card, CardContent, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import HandshakeIcon from '@mui/icons-material/Handshake';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const Partnerzy = () => {
  return (
    <PublicLayout>
      <Helmet>
        <title>Program Partnerski - wystawoferte.pl</title>
        <meta name="description" content="Dołącz do programu partnerskiego wystawoferte.pl i zarabiaj polecając naszą platformę." />
      </Helmet>
      
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <HandshakeIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Program Partnerski
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Zarabiaj polecając wystawoferte.pl
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
              <BusinessIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Dla Firm
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Jeśli prowadzisz firmę związaną z e-commerce, marketingiem lub sprzedażą online, możesz zostać naszym partnerem biznesowym.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Oferujemy atrakcyjne warunki współpracy, w tym procent od każdej wpłaty w pierwszym miesiącu poleconych użytkowników oraz wsparcie w promocji.
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4, height: '100%' }}>
              <TrendingUpIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Dla Influencerów
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Masz dużą społeczność? Polecaj wystawoferte.pl i zarabiaj na każdym poleconym użytkowniku.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Otrzymujesz unikalny kod polecający i zarabiasz procent od każdej wpłaty w pierwszym miesiącu użytkownika, który zarejestruje się używając Twojego kodu.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={3} sx={{ p: 4, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Jak to działa?
          </Typography>
          <Box component="ol" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1" paragraph>
              Zarejestruj się w programie partnerskim
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Otrzymaj unikalny kod polecający
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              Polecaj wystawoferte.pl używając swojego kodu
            </Typography>
            <Typography component="li" variant="body1">
              Otrzymujesz procent od każdej wpłaty w pierwszym miesiącu
            </Typography>
          </Box>
        </Paper>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Zainteresowany współpracą?
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Skontaktuj się z nami, aby poznać szczegóły programu partnerskiego
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/wsparcie"
            sx={{ mr: 2 }}
          >
            Skontaktuj się
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={RouterLink}
            to="/register"
          >
            Zarejestruj się
          </Button>
        </Box>
      </Container>
    </PublicLayout>
  );
};

export default Partnerzy;

