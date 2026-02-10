import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Button, Card, CardContent } from '@mui/material';
import PublicLayout from '../components/PublicLayout';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import EmailIcon from '@mui/icons-material/Email';
import HelpIcon from '@mui/icons-material/Help';

const Wsparcie = () => {
  return (
    <PublicLayout>
      <Helmet>
        <title>Wsparcie - wystawoferte.pl</title>
        <meta name="description" content="Skontaktuj się z nami - zespół wsparcia wystawoferte.pl jest gotowy pomóc." />
      </Helmet>
      
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <SupportAgentIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Centrum Wsparcia
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Jesteśmy tutaj, aby Ci pomóc
          </Typography>
        </Box>

        <Grid container spacing={4} sx={{ mb: 6 }} justifyContent="center">
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <HelpIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  FAQ
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Sprawdź najczęściej zadawane pytania i odpowiedzi
                </Typography>
                <Button variant="outlined" href="/faq">
                  Przejdź do FAQ
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmailIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Email
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Napisz do nas na adres:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  wystawoferte@gmail.com
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Lub zadzwoń:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  <a href="tel:+48459256861" style={{ color: 'inherit', textDecoration: 'none' }}>
                    +48 459 256 861
                  </a>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Czas odpowiedzi: zwykle odpowiadamy w ciągu 24 godzin
          </Typography>
        </Box>
      </Container>
    </PublicLayout>
  );
};

export default Wsparcie;

