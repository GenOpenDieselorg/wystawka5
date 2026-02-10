import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container, Typography, Box, Grid, Paper, TextField, Slider, Button, Card, CardContent, Divider } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import CalculateIcon from '@mui/icons-material/Calculate';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SavingsIcon from '@mui/icons-material/Savings';

const Calculator = () => {
  const [auctions, setAuctions] = useState(100);
  const [timePerAuction, setTimePerAuction] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(25);
  const [showNetto, setShowNetto] = useState(true); // Default to netto

  // Calculate costs with progressive pricing
  const calculateCosts = () => {
    // Progressive pricing tiers (NETTO)
    // od 1 do 100 ofert: 1.09 zł netto
    // od 100 do 400: 0.99 zł netto (od 101)
    // od 400 do 800: 0.89 zł netto (od 401)
    // od 800 ofert: 0.79 zł netto (od 801)
    // Each offer number has its own price based on which tier it falls into
    const pricingTiers = [
      { min: 1, max: 100, netto: 1.09 },
      { min: 101, max: 400, netto: 0.99 },
      { min: 401, max: 800, netto: 0.89 },
      { min: 801, max: Infinity, netto: 0.79 }
    ];

    // Calculate total cost using progressive pricing
    // Each offer is priced individually based on its number
    let totalCostNetto = 0;
    
    for (let offerNumber = 1; offerNumber <= auctions; offerNumber++) {
      // Find which tier this offer number belongs to
      const tier = pricingTiers.find(t => offerNumber >= t.min && offerNumber <= t.max);
      if (tier) {
        totalCostNetto += tier.netto;
      }
    }

    // Convert to brutto if needed
    const totalCost = showNetto ? totalCostNetto : totalCostNetto * 1.23;

    // Average cost per auction
    const costPerAuction = auctions > 0 ? totalCost / auctions : 0;

    // Calculate time savings
    const timeInMinutes = auctions * timePerAuction;
    const timeInHours = timeInMinutes / 60;
    const costOfTime = timeInHours * hourlyRate;

    // Total savings
    const totalSavings = costOfTime - totalCost;

    return {
      totalCost,
      costPerAuction,
      timeInHours,
      costOfTime,
      totalSavings
    };
  };

  const costs = calculateCosts();

  const getPrice = (nettoPrice) => {
    return showNetto ? nettoPrice : (nettoPrice * 1.23).toFixed(2);
  };

  const packages = [
    {
      name: 'Podstawowy',
      netto: 1.09,
      minAuctions: 1,
      maxAuctions: 100,
      description: 'Idealne dla małych sprzedawców'
    },
    {
      name: 'Pakiet 100',
      netto: 0.99,
      minAuctions: 101,
      maxAuctions: 400,
      description: 'Oszczędzasz przy większych wolumenach',
      popular: true
    },
    {
      name: 'Pakiet 400',
      netto: 0.89,
      minAuctions: 401,
      maxAuctions: 800,
      description: 'Najlepsza cena dla średnich wolumenów'
    },
    {
      name: 'Pakiet 800+',
      netto: 0.79,
      minAuctions: 801,
      maxAuctions: Infinity,
      description: 'Najlepsza cena dla dużych wolumenów'
    }
  ];

  const recommendedPackage = packages.find(pkg => 
    auctions >= pkg.minAuctions && auctions <= pkg.maxAuctions
  ) || packages[0];

  return (
    <PublicLayout>
      <Helmet>
        <title>Kalkulator kosztów - wystawoferte.pl</title>
        <meta name="description" content="Oblicz ile zaoszczędzisz korzystając z wystawoferte.pl. Kalkulator kosztów publikacji ofert i oszczędności czasu." />
        <meta name="keywords" content="kalkulator kosztów, oszczędności, cena aukcji, kalkulator Allegro" />
      </Helmet>

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <CalculateIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Kalkulator kosztów i oszczędności
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Sprawdź ile zaoszczędzisz korzystając z wystawoferte.pl
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
            <strong>Wszystkie ceny podane są w cenie netto. Wystawiamy fakturę VAT 23%.</strong>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Ceny {showNetto ? 'netto' : 'brutto'}
            </Typography>
            <Button
              variant={showNetto ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowNetto(true)}
              sx={{ minWidth: 80 }}
            >
              Netto
            </Button>
            <Button
              variant={!showNetto ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setShowNetto(false)}
              sx={{ minWidth: 80 }}
            >
              Brutto
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            Wystawiamy fakturę VAT 23%
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                Ustaw parametry
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Liczba aukcji miesięcznie
                </Typography>
                <Slider
                  value={auctions}
                  onChange={(e, newValue) => setAuctions(newValue)}
                  min={1}
                  max={1000}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 100, label: '100' },
                    { value: 500, label: '500' },
                    { value: 1000, label: '1000' }
                  ]}
                  valueLabelDisplay="auto"
                />
                <TextField
                  fullWidth
                  type="number"
                  value={auctions}
                  onChange={(e) => setAuctions(Math.max(1, Math.min(10000, parseInt(e.target.value) || 1)))}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 1, max: 10000 }}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Czas na stworzenie jednej aukcji (minuty)
                </Typography>
                <Slider
                  value={timePerAuction}
                  onChange={(e, newValue) => setTimePerAuction(newValue)}
                  min={5}
                  max={60}
                  step={5}
                  marks={[
                    { value: 5, label: '5 min' },
                    { value: 20, label: '20 min' },
                    { value: 30, label: '30 min' },
                    { value: 60, label: '60 min' }
                  ]}
                  valueLabelDisplay="auto"
                />
                <TextField
                  fullWidth
                  type="number"
                  value={timePerAuction}
                  onChange={(e) => setTimePerAuction(Math.max(5, Math.min(120, parseInt(e.target.value) || 20)))}
                  sx={{ mt: 2 }}
                  inputProps={{ min: 5, max: 120 }}
                />
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  Stawka godzinowa pracownika (PLN)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Math.max(10, Math.min(200, parseFloat(e.target.value) || 25)))}
                  inputProps={{ min: 10, max: 200, step: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Średnia stawka dla pracownika e-commerce: 20-30 PLN/h
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 4, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                Wyniki kalkulacji
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Koszt z wystawoferte.pl:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {costs.totalCost.toFixed(2)} PLN
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {costs.costPerAuction.toFixed(2)} PLN za aukcję
                </Typography>
              </Box>

              <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.3)' }} />

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Koszt czasu pracownika:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {costs.costOfTime.toFixed(2)} PLN
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {costs.timeInHours.toFixed(1)} godzin pracy
                </Typography>
              </Box>

              <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.3)' }} />

              <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {costs.totalSavings >= 0 ? 'Twoja oszczędność:' : 'Twoja strata:'}
                  </Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: costs.totalSavings >= 0 ? '#2e7d32' : 'error.light' 
                    }}
                  >
                    {Math.abs(costs.totalSavings).toFixed(2)} PLN
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {costs.totalSavings >= 0 ? 'Oszczędzasz' : 'Stracisz'} {Math.abs((costs.totalSavings / costs.costOfTime) * 100).toFixed(1)}% kosztów!
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  Rekomendowany pakiet:
                </Typography>
                <Card sx={{ bgcolor: 'rgba(255,255,255,0.1)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {recommendedPackage.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {recommendedPackage.description}
                        </Typography>
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {getPrice(recommendedPackage.netto)} PLN
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={4} sx={{ mt: 2 }}>
          {packages.map((pkg, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  height: '100%',
                  border: pkg.popular ? '2px solid' : 'none',
                  borderColor: pkg.popular ? 'primary.main' : 'transparent'
                }}
              >
                <CardContent>
                  {pkg.popular && (
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                        NAJPOPULARNIEJSZE
                      </Typography>
                    </Box>
                  )}
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                    {pkg.name}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', textAlign: 'center', my: 2, color: 'primary.main' }}>
                    {getPrice(pkg.netto)} PLN
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
                    {pkg.description}
                  </Typography>
                  <Box sx={{ textAlign: 'center' }}>
                    <Button
                      variant={pkg.popular ? 'contained' : 'outlined'}
                      component={RouterLink}
                      to="/register"
                      fullWidth
                    >
                      Wybierz pakiet
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mt: 6, 
            bgcolor: costs.totalSavings >= 0 ? '#2e7d32' : 'error.light', 
            color: 'white', 
            textAlign: 'center' 
          }}
        >
          <SavingsIcon sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            {costs.totalSavings >= 0 
              ? `Zaoszczędź ${costs.totalSavings.toFixed(2)} PLN miesięcznie!`
              : `Strata ${Math.abs(costs.totalSavings).toFixed(2)} PLN miesięcznie`
            }
          </Typography>
          <Typography variant="h6" paragraph>
            {costs.totalSavings >= 0 
              ? 'Dzięki wystawoferte.pl oszczędzasz czas i pieniądze. Rozpocznij już dziś!'
              : 'Rozważ zwiększenie liczby aukcji lub zmniejszenie czasu na aukcję, aby zobaczyć oszczędności.'
            }
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/register"
            sx={{ 
              mt: 2, 
              bgcolor: 'white', 
              color: costs.totalSavings >= 0 ? 'success.main' : 'error.main', 
              '&:hover': { bgcolor: 'grey.100' } 
            }}
          >
            Rozpocznij za darmo
          </Button>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default Calculator;

