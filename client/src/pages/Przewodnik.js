import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Stepper, Step, StepLabel, StepContent, Paper, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import BookIcon from '@mui/icons-material/Book';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const Przewodnik = () => {
  const steps = [
    {
      label: 'Rejestracja i konfiguracja',
      description: 'Załóż konto w wystawoferte.pl i skonfiguruj swoje preferencje',
      details: [
        'Zarejestruj się używając kodu polecającego "STARTUJE" i otrzymaj 50 PLN na start',
        'Skonfiguruj integracje z platformami (Allegro, OLX, itp.)',
        'Ustaw swoje preferencje AI - style opisów, edycja zdjęć',
        'Doładuj portfel środkami'
      ]
    },
    {
      label: 'Dodawanie produktów',
      description: 'Dodaj produkty do systemu używając różnych metod',
      details: [
        'Wpisz nazwę produktu lub zeskanuj kod EAN',
        'System automatycznie rozpozna produkt i pobierze dane',
        'Dodaj zdjęcia produktu lub użyj automatycznych',
        'Sprawdź i popraw dane produktu jeśli potrzeba'
      ]
    },
    {
      label: 'Generowanie opisów AI',
      description: 'Pozwól AI wygenerować profesjonalne opisy',
      details: [
        'AI analizuje dane produktu i generuje opis',
        'Możesz dostosować szablony opisów do swoich potrzeb',
        'System optymalizuje zdjęcia (usuwa tło, poprawia jakość)',
        'Przejrzyj i zaakceptuj wygenerowany opis'
      ]
    },
    {
      label: 'Publikacja ofert',
      description: 'Opublikuj oferty na wybranych platformach',
      details: [
        'Wybierz platformy, na których chcesz opublikować ofertę',
        'System automatycznie dostosowuje ofertę do wymagań każdej platformy',
        'Kliknij "Opublikuj" i gotowe!',
        'Śledź status publikacji w panelu'
      ]
    },
    {
      label: 'Zarządzanie ofertami',
      description: 'Zarządzaj swoimi ofertami z jednego miejsca',
      details: [
        'Edycja ofert na wszystkich platformach jednocześnie',
        'Aktualizacja cen, stanów magazynowych',
        'Analiza wyników sprzedaży',
        'Automatyczne synchronizacje'
      ]
    }
  ];

  return (
    <PublicLayout>
      <Helmet>
        <title>Przewodnik użytkownika - wystawoferte.pl</title>
        <meta name="description" content="Kompletny przewodnik po platformie wystawoferte.pl - od rejestracji do zarządzania ofertami." />
      </Helmet>
      
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <BookIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Przewodnik użytkownika
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Dowiedz się jak w pełni wykorzystać możliwości wystawoferte.pl
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 4 }}>
          <Stepper orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label} active={true} completed={false}>
                <StepLabel>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {step.description}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    {step.details.map((detail, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <CheckCircleIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20, mt: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">
                          {detail}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/register"
            sx={{ mr: 2 }}
          >
            Rozpocznij teraz
          </Button>
          <Button
            variant="outlined"
            size="large"
            component={RouterLink}
            to="/jak-w-30-sekund"
          >
            Jak to działa w 30 sekund?
          </Button>
        </Box>
      </Container>
    </PublicLayout>
  );
};

export default Przewodnik;

