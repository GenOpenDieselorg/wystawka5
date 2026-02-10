import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Card, CardContent, CardActions, Button, Chip } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import ArticleIcon from '@mui/icons-material/Article';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

const Blog = () => {
  const articles = [
    {
      id: 1,
      title: 'Jak zwiększyć sprzedaż dzięki profesjonalnym opisom produktów?',
      excerpt: 'Dowiedz się, jak dobrze napisany opis produktu może znacząco wpłynąć na konwersję i sprzedaż.',
      date: '2024-01-15',
      category: 'Marketing',
      readTime: '5 min'
    },
    {
      id: 2,
      title: '10 sposobów na optymalizację zdjęć produktowych',
      excerpt: 'Poznaj najlepsze praktyki dotyczące fotografii produktowej, które przyciągną uwagę klientów.',
      date: '2024-01-10',
      category: 'Fotografia',
      readTime: '7 min'
    },
    {
      id: 3,
      title: 'Wielokanałowa sprzedaż - jak zarządzać ofertami na wielu platformach?',
      excerpt: 'Przewodnik po zarządzaniu ofertami na różnych platformach marketplace jednocześnie.',
      date: '2024-01-05',
      category: 'Sprzedaż',
      readTime: '8 min'
    },
    {
      id: 4,
      title: 'Sztuczna inteligencja w e-commerce - przyszłość sprzedaży online',
      excerpt: 'Jak AI zmienia sposób, w jaki sprzedajemy produkty online i automatyzujemy procesy.',
      date: '2023-12-28',
      category: 'AI',
      readTime: '10 min'
    }
  ];

  return (
    <PublicLayout>
      <Helmet>
        <title>Blog - wystawoferte.pl</title>
        <meta name="description" content="Przeczytaj najnowsze artykuły o sprzedaży online, AI, optymalizacji ofert i marketingu e-commerce." />
      </Helmet>
      
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <ArticleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
            Blog
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Porady, wskazówki i najnowsze informacje o sprzedaży online
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {articles.map((article) => (
            <Grid item xs={12} md={6} key={article.id}>
              <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip label={article.category} size="small" color="primary" variant="outlined" />
                    <Chip 
                      icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
                      label={article.date} 
                      size="small" 
                      variant="outlined" 
                    />
                  </Box>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    {article.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {article.excerpt}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Czas czytania: {article.readTime}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary">
                    Czytaj więcej →
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            Wkrótce więcej artykułów...
          </Typography>
          <Button
            variant="outlined"
            component={RouterLink}
            to="/"
          >
            Powrót do strony głównej
          </Button>
        </Box>
      </Container>
    </PublicLayout>
  );
};

export default Blog;

