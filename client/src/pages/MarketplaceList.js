import React from 'react';
import { Container, Typography, Box, Grid, Paper, Card, CardContent, Chip, Divider } from '@mui/material';
import PublicLayout from '../components/PublicLayout';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const MARKETPLACES = [
  {
    id: 'allegro',
    name: 'Allegro',
    color: '#ff6900',
    description: 'Największy marketplace w Polsce',
    longDescription: `Allegro to największa platforma e-commerce w Polsce, z ponad 20 milionami użytkowników. Dzięki integracji z wystawoferte.pl możesz automatycznie publikować swoje oferty na Allegro, oszczędzając czas i zwiększając zasięg sprzedaży.

Nasza integracja z Allegro oferuje:
• Automatyczną publikację ofert zgodnie z regulaminem Allegro
• Zarządzanie parametrami produktów (dostawa, zwroty, gwarancja)
• Synchronizację statusów ofert
• Obsługę draftów ofert
• Pełną zgodność z API Allegro

Allegro to idealne miejsce dla sprzedawców, którzy chcą dotrzeć do szerokiego grona odbiorców. Dzięki naszej platformie możesz wystawiać oferty na Allegro w zaledwie 30 sekund!`,
    features: [
      'Automatyczna publikacja ofert',
      'Zarządzanie parametrami dostawy i zwrotów',
      'Obsługa gwarancji i odpowiedzialnego producenta',
      'Synchronizacja statusów',
      'Zgodność z regulaminem Allegro'
    ]
  },
  {
    id: 'olx',
    name: 'OLX',
    color: '#00a046',
    description: 'Największy portal ogłoszeń w Polsce',
    longDescription: `OLX to największy portal ogłoszeń w Polsce, skupiający miliony użytkowników poszukujących różnorodnych produktów i usług. Integracja z OLX pozwala na szybkie i efektywne wystawianie ogłoszeń.

Korzyści z integracji OLX:
• Szybka publikacja ogłoszeń na OLX
• Automatyczne zarządzanie kategoriami
• Optymalizacja treści dla lepszej widoczności
• Zarządzanie cenami i dostępnością
• Automatyczne odświeżanie ogłoszeń

OLX to doskonałe miejsce dla sprzedawców detalicznych i osób prywatnych. Dzięki wystawoferte.pl możesz wystawiać ogłoszenia na OLX w kilka sekund!`,
    features: [
      'Szybka publikacja ogłoszeń',
      'Automatyczne zarządzanie kategoriami',
      'Optymalizacja treści',
      'Zarządzanie cenami',
      'Automatyczne odświeżanie'
    ]
  },
  {
    id: 'erli',
    name: 'Erli',
    color: '#4a90e2',
    description: 'Marketplace z dostępem do API',
    longDescription: `Erli to nowoczesny marketplace oferujący zaawansowane możliwości integracji przez API. Dzięki naszej platformie możesz w pełni wykorzystać potencjał Erli.

Funkcje integracji z Erli:
• Pełna integracja z API Erli
• Automatyczna synchronizacja produktów
• Zarządzanie stanami magazynowymi
• Obsługa zamówień
• Raportowanie sprzedaży

Erli to platforma dla profesjonalnych sprzedawców, którzy potrzebują zaawansowanych narzędzi do zarządzania sprzedażą.`,
    features: [
      'Pełna integracja API',
      'Synchronizacja produktów',
      'Zarządzanie stanami',
      'Obsługa zamówień',
      'Raportowanie'
    ]
  },
  {
    id: 'otomoto',
    name: 'Otomoto',
    color: '#cb0000',
    description: 'Portal ogłoszeń motoryzacyjnych',
    longDescription: `Otomoto to największy portal ogłoszeń motoryzacyjnych w Polsce, skupiający setki tysięcy ogłoszeń samochodów, motocykli i części zamiennych.

Integracja z Otomoto umożliwia:
• Automatyczne wystawianie ogłoszeń motoryzacyjnych
• Zarządzanie szczegółowymi parametrami pojazdów
• Obsługę zdjęć i galerii
• Automatyczne odświeżanie ogłoszeń
• Zarządzanie cenami i dostępnością

Otomoto to idealne miejsce dla dealerów samochodowych i osób sprzedających pojazdy. Dzięki wystawoferte.pl możesz szybko wystawiać ogłoszenia na Otomoto!`,
    features: [
      'Automatyczne wystawianie ogłoszeń',
      'Zarządzanie parametrami pojazdów',
      'Obsługa galerii zdjęć',
      'Automatyczne odświeżanie',
      'Zarządzanie cenami'
    ]
  }
];

const MarketplaceList = () => {
  return (
    <PublicLayout>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 2 }}>
          Integracje z Marketplace'ami
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          Wystawiaj oferty na wszystkich głównych platformach sprzedażowych w Polsce
        </Typography>

        <Grid container spacing={4}>
          {MARKETPLACES.map((marketplace) => (
            <Grid item xs={12} key={marketplace.id}>
              <Card elevation={3} sx={{ mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 2,
                        bgcolor: marketplace.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 3
                      }}
                    >
                      <StoreIcon sx={{ color: 'white', fontSize: 35 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {marketplace.name}
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        {marketplace.description}
                      </Typography>
                    </Box>
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Dostępne"
                      color="success"
                      sx={{ fontSize: '1rem', height: 40 }}
                    />
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.8 }}>
                    {marketplace.longDescription}
                  </Typography>

                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                      Główne funkcje:
                    </Typography>
                    <Grid container spacing={2}>
                      {marketplace.features.map((feature, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                            <Typography variant="body1">{feature}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={3} sx={{ p: 4, mt: 6, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Chcesz rozpocząć?
          </Typography>
          <Typography variant="body1" paragraph>
            Zarejestruj się już dziś i zacznij wystawiać oferty na wszystkich platformach w zaledwie 30 sekund!
          </Typography>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default MarketplaceList;

