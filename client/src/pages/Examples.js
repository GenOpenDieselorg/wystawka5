import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, Tabs, Tab, Button, Card, CardContent, Divider, Chip, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import sanitizeHtml from '../utils/sanitizeHtml';

const Examples = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedLink, setCopiedLink] = useState(null);

  const examples = [
    {
      category: 'Elektronika',
      productName: 'Samsung Galaxy S23 Ultra 256GB',
      ean: '8806094561234',
      description: `# Samsung Galaxy S23 Ultra 256GB - Najnowszy flagowiec z najlepszym aparatem

## Opis produktu

Samsung Galaxy S23 Ultra to najnowszy flagowy smartfon z serii Galaxy, który oferuje najlepsze możliwości fotografii mobilnej, wydajność na najwyższym poziomie i zaawansowane funkcje dla profesjonalistów.

## Główne zalety

✅ **Aparat 200 MP** - Najwyższa rozdzielczość w smartfonie
✅ **Procesor Snapdragon 8 Gen 2** - Najszybszy procesor mobilny
✅ **Ekran Dynamic AMOLED 2X 6.8"** - Najlepszy wyświetlacz w smartfonie
✅ **Pamięć 256GB + 12GB RAM** - Wystarczająco miejsca na wszystko
✅ **Bateria 5000 mAh** - Całodniowa praca bez ładowania
✅ **S Pen w zestawie** - Precyzyjne notatki i rysowanie

## Specyfikacja techniczna

- **Ekran**: 6.8" Dynamic AMOLED 2X, 120Hz, HDR10+
- **Procesor**: Qualcomm Snapdragon 8 Gen 2
- **Pamięć**: 256GB UFS 4.0, 12GB RAM
- **Aparat główny**: 200 MP + 10 MP (tele) + 10 MP (tele) + 12 MP (ultraszeroki)
- **Aparat przedni**: 12 MP
- **Bateria**: 5000 mAh, szybkie ładowanie 45W
- **System**: Android 13, One UI 5.1
- **Wymiary**: 163.3 x 78.1 x 8.9 mm
- **Waga**: 233 g

## Dlaczego warto?

Samsung Galaxy S23 Ultra to idealny wybór dla osób, które potrzebują najlepszego smartfona na rynku. Dzięki aparatowi 200 MP możesz robić zdjęcia o jakości profesjonalnej, a dzięki procesorowi Snapdragon 8 Gen 2 każda aplikacja działa płynnie. S Pen pozwala na precyzyjne notatki i rysowanie, a ekran Dynamic AMOLED 2X zapewnia niesamowite wrażenia wizualne.

## Gwarancja i obsługa

- Gwarancja producenta: 24 miesiące
- Oryginalne opakowanie
- Wszystkie akcesoria w zestawie
- Profesjonalna obsługa posprzedażowa

## Dostawa i płatność

- Darmowa dostawa kurierem
- Możliwość płatności ratalnej
- Szybka realizacja zamówienia
- Bezpieczne pakowanie`,
      link: 'https://allegro.pl/oferta/samsung-galaxy-s23-ultra-256gb-12345678',
      marketplace: 'Allegro',
      imageUrl: 'https://via.placeholder.com/400x400?text=Samsung+Galaxy+S23+Ultra'
    },
    {
      category: 'Moda',
      productName: 'Kurtka zimowa męska The North Face',
      ean: '1234567890123',
      description: `# Kurtka zimowa męska The North Face - Idealna na zimę

## Opis produktu

Kurtka zimowa The North Face to profesjonalna odzież outdoorowa, która zapewnia pełną ochronę przed zimnem, wiatrem i wilgocią. Idealna na górskie wędrówki, narciarstwo i codzienne użytkowanie.

## Główne zalety

✅ **Wodoodporna** - Membrana DryVent chroni przed deszczem i śniegiem
✅ **Ocieplona** - Wypełnienie 600 fill power down zapewnia ciepło
✅ **Oddychająca** - System wentylacji zapobiega przegrzaniu
✅ **Funkcjonalna** - Wiele kieszeni i regulowane elementy
✅ **Trwała** - Materiały najwyższej jakości
✅ **Stylowa** - Nowoczesny design

## Szczegóły techniczne

- **Materiał**: Nylon z powłoką DWR
- **Wypełnienie**: 600 fill power down
- **Membrana**: DryVent 2L
- **Kaptur**: Regulowany, z daszkiem
- **Kieszenie**: 4 zewnętrzne + 2 wewnętrzne
- **Zamki**: YKK
- **Rozmiary**: S, M, L, XL, XXL

## Dlaczego warto?

The North Face to marka znana z najwyższej jakości odzieży outdoorowej. Ta kurtka to inwestycja na wiele sezonów - będzie Ci służyć przez lata, zapewniając komfort i ochronę w każdych warunkach pogodowych.

## Gwarancja

- Gwarancja producenta: 2 lata
- Oryginalne opakowanie
- Certyfikat autentyczności`,
      link: 'https://allegro.pl/oferta/kurtka-zimowa-meska-north-face-87654321',
      marketplace: 'Allegro',
      imageUrl: 'https://via.placeholder.com/400x400?text=Kurtka+The+North+Face'
    },
    {
      category: 'Dom i Ogród',
      productName: 'Robot odkurzający iRobot Roomba i7+',
      ean: '7890123456789',
      description: `# Robot odkurzający iRobot Roomba i7+ - Automatyczne sprzątanie

## Opis produktu

iRobot Roomba i7+ to zaawansowany robot odkurzający z funkcją automatycznego opróżniania pojemnika. Dzięki inteligentnej nawigacji i aplikacji mobilnej, sprzątanie nigdy nie było tak proste.

## Główne zalety

✅ **Automatyczne opróżnianie** - Clean Base opróżnia pojemnik samodzielnie
✅ **Inteligentna nawigacja** - Mapuje i zapamiętuje układ mieszkania
✅ **Aplikacja mobilna** - Sterowanie z telefonu
✅ **Głosowe sterowanie** - Kompatybilny z Alexa i Google Assistant
✅ **Automatyczne ładowanie** - Wraca do bazy gdy bateria się wyczerpie
✅ **Wysoka wydajność** - System podwójnego szczotkowania

## Specyfikacja

- **Powierzchnia**: Do 200 m² na jednym ładowaniu
- **Pojemność pojemnika**: 0.5L
- **Czas pracy**: Do 120 minut
- **Głośność**: 65 dB
- **Wysokość**: 9.3 cm
- **Waga**: 3.5 kg
- **Nawigacja**: iAdapt 3.0 z kamerą

## Dlaczego warto?

Roomba i7+ to najinteligentniejszy robot odkurzający w swojej klasie. Dzięki automatycznemu opróżnianiu pojemnika możesz zapomnieć o sprzątaniu nawet na kilka tygodni. Inteligentna nawigacja zapewnia dokładne sprzątanie każdego zakątka mieszkania.

## Gwarancja

- Gwarancja: 2 lata
- Oryginalne opakowanie
- Wszystkie akcesoria w zestawie`,
      link: 'https://allegro.pl/oferta/robot-odkurzajacy-irobot-roomba-i7-11223344',
      marketplace: 'Allegro',
      imageUrl: 'https://via.placeholder.com/400x400?text=Roomba+i7'
    }
  ];

  const handleCopyLink = (link, index) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(index);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>Przykładowe opisy i oferty - wystawoferte.pl</title>
        <meta name="description" content="Zobacz przykładowe opisy produktów wygenerowane przez AI oraz linki do opublikowanych ofert na Allegro. Sprawdź jakość naszych opisów!" />
        <meta name="keywords" content="przykładowe opisy, przykłady ofert, AI opisy produktów, przykładowe aukcje" />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <AutoAwesomeIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Przykładowe opisy i oferty
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Zobacz jak wyglądają opisy wygenerowane przez naszą sztuczną inteligencję
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            {examples.map((example, index) => (
              <Tab key={index} label={example.category} />
            ))}
          </Tabs>
        </Paper>

        {examples.map((example, index) => (
          <Box key={index} sx={{ display: activeTab === index ? 'block' : 'none' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Card elevation={3}>
                  <Box
                    sx={{
                      width: '100%',
                      height: 300,
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundImage: `url(${example.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <CardContent>
                    <Chip label={example.category} color="primary" sx={{ mb: 2 }} />
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {example.productName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      EAN: {example.ean}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label={example.marketplace} 
                        color="success" 
                        size="small"
                      />
                      <Chip 
                        label="Wygenerowane przez AI" 
                        color="primary" 
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Paper elevation={3} sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      Opis produktu
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={copiedLink === index ? <CheckCircleIcon /> : <ContentCopyIcon />}
                        onClick={() => handleCopyLink(example.link, index)}
                      >
                        {copiedLink === index ? 'Skopiowano!' : 'Kopiuj link'}
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        href={example.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Zobacz ofertę
                      </Button>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      bgcolor: 'grey.50',
                      p: 3,
                      borderRadius: 2,
                      maxHeight: 600,
                      overflow: 'auto',
                      '& h1': { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: '1rem' },
                      '& h2': { fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.75rem', marginTop: '1rem' },
                      '& h3': { fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem', marginTop: '0.75rem' },
                      '& p': { marginBottom: '1rem', lineHeight: 1.6 },
                      '& ul, & ol': { marginBottom: '1rem', paddingLeft: '2rem' },
                      '& li': { marginBottom: '0.5rem', lineHeight: 1.6 },
                      '& strong': { fontWeight: 'bold' },
                      '& code': { bgcolor: 'grey.200', padding: '2px 4px', borderRadius: 1 }
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeHtml(example.description.replace(/\n/g, '<br />').replace(/#{1,3} (.*?)(<br \/>|$)/g, (match, text, br) => {
                        if (match.startsWith('###')) return `<h3>${text}</h3>`;
                        if (match.startsWith('##')) return `<h2>${text}</h2>`;
                        return `<h1>${text}</h1>`;
                      }).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/✅/g, '✓'))
                    }}
                  />

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Link do oferty na {example.marketplace}:
                    </Typography>
                    <Link 
                      href={example.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ 
                        color: 'white', 
                        textDecoration: 'underline',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      {example.link}
                      <OpenInNewIcon fontSize="small" />
                    </Link>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        ))}

        <Paper elevation={3} sx={{ p: 4, mt: 6, bgcolor: 'primary.main', color: 'white', textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            Chcesz takie opisy dla swoich produktów?
          </Typography>
          <Typography variant="h6" paragraph>
            Zarejestruj się już dziś i zacznij generować profesjonalne opisy w 30 sekund!
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

export default Examples;

