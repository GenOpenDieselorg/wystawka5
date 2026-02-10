import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, Card, CardContent, Rating, Avatar, Divider, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import StarIcon from '@mui/icons-material/Star';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import Button from '@mui/material/Button';

const Reviews = () => {
  const reviews = [
    {
      id: 1,
      name: 'Marek K.',
      rating: 5,
      date: '2024-01-15',
      verified: true,
      category: 'Sprzedawca Allegro',
      text: 'Fantastyczna platforma! Wystawiam średnio 200 aukcji miesięcznie i oszczędzam mnóstwo czasu. Opisy generowane przez AI są profesjonalne i sprzedają się świetnie. Polecam każdemu!',
      stats: '200+ aukcji/miesiąc'
    },
    {
      id: 2,
      name: 'Anna W.',
      rating: 5,
      date: '2024-01-10',
      verified: true,
      category: 'Sprzedawca OLX',
      text: 'Używam wystawoferte.pl od 3 miesięcy i jestem zachwycona. Proces wystawiania ofert skrócił się z 20 minut do 30 sekund. AI naprawdę rozumie co sprzedaję i tworzy świetne opisy.',
      stats: '150+ aukcji/miesiąc'
    },
    {
      id: 3,
      name: 'Tomasz R.',
      rating: 5,
      date: '2024-01-08',
      verified: true,
      category: 'Sprzedawca wielokanałowy',
      text: 'Najlepsza inwestycja w moim biznesie e-commerce. Publikuję na Allegro, OLX i Erli jednocześnie. Oszczędzam około 15 godzin tygodniowo. Wartość warta każdej złotówki!',
      stats: '500+ aukcji/miesiąc'
    },
    {
      id: 4,
      name: 'Katarzyna M.',
      rating: 5,
      date: '2024-01-05',
      verified: true,
      category: 'Sprzedawca mody',
      text: 'Jako sprzedawca odzieży, potrzebuję wielu zdjęć i szczegółowych opisów. AI świetnie radzi sobie z optymalizacją zdjęć i tworzeniem opisów, które przyciągają klientów. Konwersja wzrosła o 30%!',
      stats: '100+ aukcji/miesiąc'
    },
    {
      id: 5,
      name: 'Piotr S.',
      rating: 5,
      date: '2024-01-02',
      verified: true,
      category: 'Sprzedawca elektroniki',
      text: 'Integracja z Allegro działa bez zarzutu. Wszystko jest zgodne z regulaminem, nie ma problemów z kontem. Opisy są profesjonalne i zawierają wszystkie potrzebne informacje. Polecam!',
      stats: '300+ aukcji/miesiąc'
    },
    {
      id: 6,
      name: 'Magdalena L.',
      rating: 5,
      date: '2023-12-28',
      verified: true,
      category: 'Sprzedawca dom i ogród',
      text: 'Używam platformy do sprzedaży mebli i akcesoriów domowych. AI doskonale rozpoznaje produkty po kodzie EAN i tworzy opisy, które sprzedają. Oszczędzam mnóstwo czasu na pisaniu opisów.',
      stats: '80+ aukcji/miesiąc'
    },
    {
      id: 7,
      name: 'Jakub K.',
      rating: 5,
      date: '2023-12-25',
      verified: true,
      category: 'Sprzedawca sport',
      text: 'Świetna platforma! Publikuję oferty sportowe na wielu platformach jednocześnie. AI rozumie specyfikę produktów sportowych i tworzy opisy, które przyciągają odpowiednich klientów.',
      stats: '120+ aukcji/miesiąc'
    },
    {
      id: 8,
      name: 'Natalia P.',
      rating: 5,
      date: '2023-12-20',
      verified: true,
      category: 'Sprzedawca kosmetyków',
      text: 'Jako sprzedawca kosmetyków potrzebuję szczegółowych opisów składników i korzyści. AI tworzy profesjonalne opisy, które spełniają wszystkie wymagania. Konwersja wzrosła znacząco!',
      stats: '90+ aukcji/miesiąc'
    }
  ];

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  const totalReviews = reviews.length;

  return (
    <PublicLayout>
      <Helmet>
        <title>Opinie użytkowników - wystawoferte.pl</title>
        <meta name="description" content="Przeczytaj opinie użytkowników wystawoferte.pl. Zobacz jak nasi klienci oszczędzają czas i zwiększają sprzedaż dzięki naszej platformie." />
        <meta name="keywords" content="opinie, recenzje, wystawoferte.pl, opinie użytkowników, recenzje klientów" />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <StarIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Opinie użytkowników
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Zobacz co mówią o nas nasi klienci
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 4, mb: 6, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h2" sx={{ fontWeight: 'bold' }}>
              {averageRating.toFixed(1)}
            </Typography>
            <Box>
              <Rating value={averageRating} precision={0.1} readOnly size="large" />
              <Typography variant="body1" sx={{ mt: 1 }}>
                {totalReviews} opinii
              </Typography>
            </Box>
          </Box>
          <Typography variant="h6">
            Średnia ocena naszych użytkowników
          </Typography>
        </Paper>

        <Grid container spacing={4}>
          {reviews.map((review) => (
            <Grid item xs={12} md={6} key={review.id}>
              <Card elevation={3} sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                      {review.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {review.name}
                        </Typography>
                        {review.verified && (
                          <VerifiedUserIcon sx={{ color: 'success.main', fontSize: 20 }} />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {review.category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(review.date).toLocaleDateString('pl-PL', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                    </Box>
                  </Box>

                  <Rating value={review.rating} readOnly size="small" sx={{ mb: 2 }} />

                  <Typography variant="body1" paragraph sx={{ minHeight: 80 }}>
                    "{review.text}"
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      label={review.stats} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      icon={<VerifiedUserIcon />}
                      label="Zweryfikowany zakup" 
                      size="small" 
                      color="success"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 6, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4, bgcolor: 'grey.50' }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
              Statystyki zadowolenia
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    {averageRating.toFixed(1)}/5
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Średnia ocena
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    {totalReviews}+
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Opinii użytkowników
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    98%
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Poleca naszym znajomym
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        <Paper elevation={3} sx={{ p: 4, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Dołącz do zadowolonych użytkowników!
          </Typography>
          <Typography variant="h6" paragraph>
            Zarejestruj się już dziś i zacznij oszczędzać czas na wystawianiu ofert
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/register"
            sx={{ mt: 2, bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Rozpocznij za darmo
          </Button>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default Reviews;

