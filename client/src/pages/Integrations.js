import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  Paper,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  CircularProgress,
  Avatar,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

const MARKETPLACES = [
  { id: 'olx', name: 'OLX', color: '#00a046', description: 'Największy portal ogłoszeń w Polsce' },
  { id: 'allegro', name: 'Allegro', color: '#ff6900', description: 'Największy marketplace w Polsce' },
  { id: 'erli', name: 'Erli', color: '#4a90e2', description: 'Marketplace z dostępem do API' },
  { id: 'otomoto', name: 'Otomoto', color: '#cb0000', description: 'Portal ogłoszeń motoryzacyjnych' }
];

function Integrations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [integrations, setIntegrations] = useState([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [settingsTab, setSettingsTab] = useState(0);
  const [formData, setFormData] = useState({
    access_token: '',
    refresh_token: ''
  });
  const [settingsData, setSettingsData] = useState({
    invoice_type: '',
    shipping_rates_id: '',
    return_policy_id: '',
    implied_warranty_id: '',
    warranty_id: '',
    responsible_producer_id: ''
  });
  const [allegroOptions, setAllegroOptions] = useState({
    shippingRates: [],
    returnPolicies: [],
    impliedWarranties: [],
    warranties: [],
    responsibleProducers: []
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  // Draft offers state
  const [draftOffers, setDraftOffers] = useState([]);
  const [loadingDraftOffers, setLoadingDraftOffers] = useState(false);
  const [selectedDraftOffers, setSelectedDraftOffers] = useState([]);
  const [draftOffersDialogOpen, setDraftOffersDialogOpen] = useState(false);
  const [deletingOffers, setDeletingOffers] = useState(false);

  useEffect(() => {
    fetchIntegrations();
    
    // Check for OAuth callback parameters
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    
    if (error) {
      setMessage({ type: 'error', text: `Błąd autoryzacji: ${decodeURIComponent(error)}` });
      // Clean URL
      navigate('/integrations', { replace: true });
    } else if (success === 'allegro_connected') {
      setMessage({ type: 'success', text: 'Pomyślnie połączono z Allegro!' });
      // Clean URL first
      navigate('/integrations', { replace: true });
      
      // Fetch integrations and then open settings for Allegro
      fetchIntegrations().then((integrationsList) => {
        if (integrationsList && integrationsList.length > 0) {
          const allegroIntegration = integrationsList.find(i => i.marketplace === 'allegro');
          if (allegroIntegration) {
            handleOpenSettingsDialog(allegroIntegration);
          }
        }
      });
    } else if (success === 'olx_connected') {
      setMessage({ type: 'success', text: 'Pomyślnie połączono z OLX!' });
      fetchIntegrations();
      // Clean URL
      navigate('/integrations', { replace: true });
    }
  }, [searchParams, navigate]);

  const fetchIntegrations = async () => {
    try {
      const response = await axios.get(`${API_URL}/marketplace/integrations`);
      setIntegrations(response.data.integrations || []);
      return response.data.integrations || [];
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations([]);
      return [];
    }
  };


  const handleMarketplaceClick = async (marketplace) => {
    // For Allegro and OLX, use OAuth flow
    if (marketplace.id === 'allegro') {
      await handleAllegroOAuth();
      return;
    }
    
    if (marketplace.id === 'olx') {
      await handleOLXOAuth();
      return;
    }
    
    // For Erli and other marketplaces, show dialog for manual API key entry
    setSelectedMarketplace(marketplace);
    setFormData({ access_token: '', refresh_token: '' });
    setDialogOpen(true);
  };

  const handleAllegroOAuth = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.get(`${API_URL}/marketplace/allegro/authorize`);
      
      // Redirect to Allegro authorization page
      window.location.href = response.data.authUrl;
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Błąd podczas inicjowania autoryzacji Allegro' 
      });
      setLoading(false);
    }
  };

  const handleOLXOAuth = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.get(`${API_URL}/marketplace/olx/authorize`);
      
      // Redirect to OLX authorization page
      window.location.href = response.data.authUrl;
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || error.response?.data?.message || 'Błąd podczas inicjowania autoryzacji OLX' 
      });
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMarketplace(null);
    setFormData({ access_token: '', refresh_token: '' });
  };

  const handleAddIntegration = async () => {
    if (!selectedMarketplace || !formData.access_token) {
      setMessage({ type: 'error', text: 'Token dostępu jest wymagany' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.post(
        `${API_URL}/marketplace/integrations`,
        {
          marketplace: selectedMarketplace.id,
          access_token: formData.access_token,
          refresh_token: formData.refresh_token || null
        }
      );
      setMessage({ type: 'success', text: 'Integracja została dodana' });
      handleCloseDialog();
      fetchIntegrations();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas dodawania integracji' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIntegration = async (id) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę integrację?')) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.delete(
        `${API_URL}/marketplace/integrations/${id}`
      );
      setMessage({ type: 'success', text: 'Integracja została usunięta' });
      fetchIntegrations();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas usuwania integracji' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestIntegration = async (id) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.post(
        `${API_URL}/marketplace/integrations/${id}/test`,
        {}
      );
      setMessage({ 
        type: response.data.success ? 'success' : 'error', 
        text: response.data.message || 'Test zakończony' 
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Błąd podczas testowania integracji' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettingsDialog = async (integration) => {
    setSelectedIntegration(integration);
    setSettingsData({
      invoice_type: integration.invoice_type || '',
      shipping_rates_id: integration.shipping_rates_id || '',
      return_policy_id: integration.return_policy_id || '',
      implied_warranty_id: integration.implied_warranty_id || '',
      warranty_id: integration.warranty_id || '',
      responsible_producer_id: integration.responsible_producer_id || ''
    });
    setSettingsDialogOpen(true);
    setSettingsTab(0);
    
    // Load Allegro options if it's Allegro integration
    if (integration.marketplace === 'allegro') {
      await fetchAllegroOptions();
    }
  };

  const fetchAllegroOptions = async () => {
    setLoadingOptions(true);
    try {
      const response = await axios.get(`${API_URL}/marketplace/allegro/settings-options`);
      setAllegroOptions({
        shippingRates: response.data.shippingRates || [],
        returnPolicies: response.data.returnPolicies || [],
        impliedWarranties: response.data.impliedWarranties || [],
        warranties: response.data.warranties || [],
        responsibleProducers: response.data.responsibleProducers || []
      });
    } catch (error) {
      console.error('Error fetching Allegro options:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Błąd podczas pobierania opcji z Allegro' 
      });
    } finally {
      setLoadingOptions(false);
    }
  };

  // Fetch draft offers from Allegro
  const fetchDraftOffers = async () => {
    setLoadingDraftOffers(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.get(`${API_URL}/marketplace/allegro/draft-offers`);
      setDraftOffers(response.data.draftOffers || []);
      setSelectedDraftOffers([]);
    } catch (error) {
      console.error('Error fetching draft offers:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Błąd podczas pobierania szkicowych ofert z Allegro' 
      });
      setDraftOffers([]);
    } finally {
      setLoadingDraftOffers(false);
    }
  };

  // Delete single draft offer
  const handleDeleteDraftOffer = async (offerId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tę szkicową ofertę z Allegro?')) {
      return;
    }
    
    setDeletingOffers(true);
    try {
      await axios.delete(`${API_URL}/marketplace/allegro/offers/${offerId}`);
      setMessage({ type: 'success', text: 'Szkicowa oferta została usunięta' });
      // Refresh the list
      fetchDraftOffers();
    } catch (error) {
      console.error('Error deleting draft offer:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Błąd podczas usuwania oferty' 
      });
    } finally {
      setDeletingOffers(false);
    }
  };

  // Delete selected draft offers (batch)
  const handleDeleteSelectedOffers = async () => {
    if (selectedDraftOffers.length === 0) {
      setMessage({ type: 'warning', text: 'Wybierz oferty do usunięcia' });
      return;
    }
    
    if (!window.confirm(`Czy na pewno chcesz usunąć ${selectedDraftOffers.length} szkicowych ofert z Allegro?`)) {
      return;
    }
    
    setDeletingOffers(true);
    try {
      const response = await axios.post(
        `${API_URL}/marketplace/allegro/offers/delete-batch`,
        { offerIds: selectedDraftOffers }
      );
      
      setMessage({ 
        type: response.data.failCount > 0 ? 'warning' : 'success', 
        text: response.data.message 
      });
      
      // Refresh the list
      fetchDraftOffers();
    } catch (error) {
      console.error('Error deleting draft offers:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Błąd podczas usuwania ofert' 
      });
    } finally {
      setDeletingOffers(false);
    }
  };

  // Toggle single draft offer selection
  const handleToggleDraftOfferSelection = (offerId) => {
    setSelectedDraftOffers(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  // Toggle all draft offers selection
  const handleToggleAllDraftOffers = () => {
    if (selectedDraftOffers.length === draftOffers.length) {
      setSelectedDraftOffers([]);
    } else {
      setSelectedDraftOffers(draftOffers.map(o => o.id));
    }
  };

  // Open draft offers dialog
  const handleOpenDraftOffersDialog = async () => {
    setDraftOffersDialogOpen(true);
    await fetchDraftOffers();
  };

  // Close draft offers dialog
  const handleCloseDraftOffersDialog = () => {
    setDraftOffersDialogOpen(false);
    setDraftOffers([]);
    setSelectedDraftOffers([]);
  };

  const handleCloseSettingsDialog = () => {
    setSettingsDialogOpen(false);
    setSelectedIntegration(null);
    setSettingsData({ invoice_type: '' });
  };

  const handleSaveSettings = async () => {
    if (!selectedIntegration) return;

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(
        `${API_URL}/marketplace/integrations/${selectedIntegration.id}/settings`,
        settingsData
      );
      setMessage({ type: 'success', text: 'Ustawienia zostały zapisane' });
      handleCloseSettingsDialog();
      fetchIntegrations();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas zapisywania ustawień' });
    } finally {
      setLoading(false);
    }
  };

  const isIntegrationActive = (marketplaceId) => {
    return integrations.some(i => i.marketplace === marketplaceId && i.is_active);
  };


  return (
    <Layout title="Integracje z Marketplace">
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Wybierz marketplace do integracji
      </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
            Połącz swoje konta z marketplace'ami, aby automatycznie publikować produkty. 
            Po kliknięciu "Opublikuj" produkt zostanie wysłany do wszystkich aktywnych integracji.
          </Typography>

          {/* Marketplace Grid 3x3 */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {MARKETPLACES.map((marketplace) => {
              const isActive = isIntegrationActive(marketplace.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={marketplace.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      border: isActive ? `2px solid ${marketplace.color}` : '2px solid transparent',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => handleMarketplaceClick(marketplace)}
                  >
                    <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
                      {isActive && (
                        <CheckCircleIcon
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            color: marketplace.color
                          }}
                        />
                      )}
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          bgcolor: marketplace.color,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          fontSize: '1.5rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {marketplace.name.charAt(0)}
                      </Box>
                      <Typography variant="h6" gutterBottom>
                        {marketplace.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {marketplace.description}
                      </Typography>
                      {isActive && (
                        <Chip
                          label="Aktywna"
                          color="success"
                          size="small"
                          sx={{ mt: 2 }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Active Integrations List */}
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Aktywne integracje
          </Typography>
          {integrations.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                Brak aktywnych integracji. Kliknij na marketplace powyżej, aby dodać integrację.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: isMobile ? 100 : 120 }}>Marketplace</TableCell>
                    {!isMobile && <TableCell>Data dodania</TableCell>}
                    <TableCell sx={{ minWidth: isMobile ? 100 : 120 }}>Typ faktury</TableCell>
                    <TableCell sx={{ minWidth: isMobile ? 80 : 100 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: isMobile ? 150 : 200 }}>Akcje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrations.map((integration) => (
                    <TableRow key={integration.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {integration.marketplace}
                        </Typography>
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          {new Date(integration.created_at).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </TableCell>
                      )}
                      <TableCell>
                        {integration.invoice_type ? (
                          <Chip
                            label={
                              integration.invoice_type === 'vat' ? 'VAT' :
                              integration.invoice_type === 'vat_marza' ? 'VAT marża' :
                              integration.invoice_type === 'no_vat_invoice' ? 'Bez faktury VAT' :
                              integration.invoice_type === 'invoice_no_vat' ? 'Faktura bez VAT' :
                              integration.invoice_type
                            }
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            Nie ustawiono
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={integration.is_active ? 'Aktywna' : 'Nieaktywna'}
                          color={integration.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenSettingsDialog(integration)}
                            disabled={loading}
                            sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
                          >
                            {isMobile ? 'Ustaw.' : 'Ustawienia'}
                          </Button>
                          {integration.marketplace === 'allegro' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={handleOpenDraftOffersDialog}
                              disabled={loading}
                              sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
                            >
                              Szkice
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleTestIntegration(integration.id)}
                            disabled={loading}
                            sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
                          >
                            Test
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleDeleteIntegration(integration.id)}
                            disabled={loading}
                            sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
                          >
                            {isMobile ? 'Usuń' : 'Usuń'}
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Dialog for integration settings */}
          <Dialog 
            open={settingsDialogOpen} 
            onClose={handleCloseSettingsDialog} 
            maxWidth="md" 
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Ustawienia integracji - {selectedIntegration?.marketplace?.toUpperCase()}
                </Typography>
                <IconButton onClick={handleCloseSettingsDialog} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Skonfiguruj ustawienia integracji z {selectedIntegration?.marketplace?.toUpperCase()}.
              </Typography>
              
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                  value={settingsTab} 
                  onChange={(e, v) => setSettingsTab(v)}
                  variant={isMobile ? 'scrollable' : 'standard'}
                  scrollButtons="auto"
                >
                  <Tab label="Faktura" />
                  {selectedIntegration?.marketplace === 'allegro' && <Tab label="Dostawa i zwroty" />}
                </Tabs>
              </Box>

              {/* Tab 0: Invoice Settings */}
              {settingsTab === 0 && (
                <Box>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Typ faktury</InputLabel>
                    <Select
                      value={settingsData.invoice_type}
                      onChange={(e) => setSettingsData({ ...settingsData, invoice_type: e.target.value })}
                      label="Typ faktury"
                    >
                      <MenuItem value="">Nie ustawiono</MenuItem>
                      <MenuItem value="vat">VAT</MenuItem>
                      <MenuItem value="vat_marza">VAT marża</MenuItem>
                      <MenuItem value="no_vat_invoice">Nie wystawiam faktury VAT</MenuItem>
                      <MenuItem value="invoice_no_vat">Faktura bez VAT</MenuItem>
                    </Select>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                      Wybierz typ faktury, który będzie używany przy publikowaniu ofert na tym marketplace.
                    </Typography>
                  </FormControl>
                </Box>
              )}

              {/* Tab 1: Allegro Settings */}
              {settingsTab === 1 && selectedIntegration?.marketplace === 'allegro' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Dostawa i obsługa posprzedażna
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Wybierz polityki i usługi z Allegro, które będą używane przy tworzeniu ofert.
                  </Typography>
                  
                  {loadingOptions ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <CircularProgress size={30} />
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                        Ładowanie opcji z Allegro...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      {/* Shipping Rates */}
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Stawka wysyłki z Allegro</InputLabel>
                        <Select
                          value={settingsData.shipping_rates_id}
                          onChange={(e) => setSettingsData({ ...settingsData, shipping_rates_id: e.target.value })}
                          label="Stawka wysyłki z Allegro"
                        >
                          <MenuItem value="">-- Najpierw załaduj opcje --</MenuItem>
                          {allegroOptions.shippingRates.length === 0 ? (
                            <MenuItem disabled>Brak dostępnych opcji</MenuItem>
                          ) : (
                            allegroOptions.shippingRates.map((rate) => (
                              <MenuItem key={rate.id} value={rate.id}>
                                {rate.name || `Stawka ${rate.id}`}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Return Policy */}
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Polityka zwrotów z Allegro</InputLabel>
                        <Select
                          value={settingsData.return_policy_id}
                          onChange={(e) => setSettingsData({ ...settingsData, return_policy_id: e.target.value })}
                          label="Polityka zwrotów z Allegro"
                        >
                          <MenuItem value="">-- Najpierw załaduj opcje --</MenuItem>
                          {allegroOptions.returnPolicies.length === 0 ? (
                            <MenuItem disabled>Brak dostępnych opcji</MenuItem>
                          ) : (
                            allegroOptions.returnPolicies.map((policy) => (
                              <MenuItem key={policy.id} value={policy.id}>
                                {policy.name || `Polityka ${policy.id}`}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Implied Warranty */}
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Gwarancja domniemana z Allegro</InputLabel>
                        <Select
                          value={settingsData.implied_warranty_id}
                          onChange={(e) => setSettingsData({ ...settingsData, implied_warranty_id: e.target.value })}
                          label="Gwarancja domniemana z Allegro"
                        >
                          <MenuItem value="">-- Najpierw załaduj opcje --</MenuItem>
                          {allegroOptions.impliedWarranties.length === 0 ? (
                            <MenuItem disabled>Brak dostępnych opcji</MenuItem>
                          ) : (
                            allegroOptions.impliedWarranties.map((warranty) => (
                              <MenuItem key={warranty.id} value={warranty.id}>
                                {warranty.name || `Gwarancja ${warranty.id}`}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Warranty */}
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Gwarancja z Allegro</InputLabel>
                        <Select
                          value={settingsData.warranty_id}
                          onChange={(e) => setSettingsData({ ...settingsData, warranty_id: e.target.value })}
                          label="Gwarancja z Allegro"
                        >
                          <MenuItem value="">-- Najpierw załaduj opcje --</MenuItem>
                          {allegroOptions.warranties.length === 0 ? (
                            <MenuItem disabled>Brak dostępnych opcji</MenuItem>
                          ) : (
                            allegroOptions.warranties.map((warranty) => (
                              <MenuItem key={warranty.id} value={warranty.id}>
                                {warranty.name || `Gwarancja ${warranty.id}`}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Responsible Producer */}
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Odpowiedzialny producent z Allegro</InputLabel>
                        <Select
                          value={settingsData.responsible_producer_id}
                          onChange={(e) => setSettingsData({ ...settingsData, responsible_producer_id: e.target.value })}
                          label="Odpowiedzialny producent z Allegro"
                        >
                          <MenuItem value="">-- Najpierw załaduj opcje --</MenuItem>
                          {allegroOptions.responsibleProducers.length === 0 ? (
                            <MenuItem disabled>Brak dostępnych opcji</MenuItem>
                          ) : (
                            allegroOptions.responsibleProducers.map((producer) => (
                              <MenuItem key={producer.id} value={producer.id}>
                                {producer.name || `Producent ${producer.id}`}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                    </>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSettingsDialog}>Anuluj</Button>
              <Button
                onClick={handleSaveSettings}
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={loading || loadingOptions}
              >
                Zapisz
              </Button>
            </DialogActions>
          </Dialog>

          {/* Dialog for adding integration */}
          <Dialog 
            open={dialogOpen} 
            onClose={handleCloseDialog} 
            maxWidth="sm" 
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Dodaj integrację z {selectedMarketplace?.name}
                </Typography>
                <IconButton onClick={handleCloseDialog} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                {selectedMarketplace?.id === 'allegro' 
                  ? 'Aby połączyć się z Allegro, kliknij przycisk poniżej i zaloguj się do swojego konta Allegro.'
                  : selectedMarketplace?.id === 'erli'
                  ? 'Wprowadź klucz API z Erli. Klucz API znajdziesz w panelu zarządzania sklepem w sekcji Metoda integracji > Własna integracja po API.'
                  : `Wprowadź tokeny dostępu z API ${selectedMarketplace?.name}. Tokeny możesz uzyskać w panelu deweloperskim marketplace'u.`}
              </Typography>
              {selectedMarketplace?.id === 'allegro' ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleAllegroOAuth}
                    disabled={loading}
                    sx={{ 
                      bgcolor: '#ff6900',
                      '&:hover': { bgcolor: '#e55a00' }
                    }}
                  >
                    Zaloguj się do Allegro
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                    Zostaniesz przekierowany do strony logowania Allegro
                  </Typography>
                </Box>
              ) : (
                <>
                  <TextField
                    fullWidth
                    label={selectedMarketplace?.id === 'erli' ? 'Klucz API Erli *' : 'Token dostępu (Access Token) *'}
                    value={formData.access_token}
                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    margin="normal"
                    type="password"
                    required
                    helperText={selectedMarketplace?.id === 'erli' 
                      ? 'Klucz API z panelu Erli (Metoda integracji > Własna integracja po API) - wymagany'
                      : 'Token dostępu z API marketplace - wymagany'}
                  />
                  {selectedMarketplace?.id !== 'erli' && (
                    <TextField
                      fullWidth
                      label="Token odświeżania (Refresh Token) - opcjonalne"
                      value={formData.refresh_token}
                      onChange={(e) => setFormData({ ...formData, refresh_token: e.target.value })}
                      margin="normal"
                      type="password"
                      helperText="Token do odświeżania dostępu (jeśli dostępny)"
                    />
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Anuluj</Button>
              {selectedMarketplace?.id !== 'allegro' && (
                <Button
                  onClick={handleAddIntegration}
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading || !formData.access_token}
                >
                  Dodaj integrację
                </Button>
              )}
            </DialogActions>
          </Dialog>

          {/* Dialog for managing draft offers from Allegro */}
          <Dialog 
            open={draftOffersDialogOpen} 
            onClose={handleCloseDraftOffersDialog} 
            maxWidth="lg" 
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Szkicowe oferty na Allegro (INACTIVE)
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={fetchDraftOffers}
                    disabled={loadingDraftOffers}
                  >
                    Odśwież
                  </Button>
                  <IconButton onClick={handleCloseDraftOffersDialog} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Poniżej znajdują się oferty ze statusem INACTIVE (szkice), które zostały utworzone, 
                ale nie zostały aktywowane na Allegro. Możesz je usunąć pojedynczo lub zbiorczo.
              </Typography>
              
              {loadingDraftOffers ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : draftOffers.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Brak szkicowych ofert na Allegro
                  </Typography>
                </Paper>
              ) : (
                <>
                  {/* Batch actions */}
                  <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      Zaznaczono: {selectedDraftOffers.length} z {draftOffers.length}
                    </Typography>
                    <Button
                      size={isMobile ? 'small' : 'medium'}
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDeleteSelectedOffers}
                      disabled={selectedDraftOffers.length === 0 || deletingOffers}
                      sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                    >
                      {isMobile ? `Usuń (${selectedDraftOffers.length})` : `Usuń zaznaczone (${selectedDraftOffers.length})`}
                    </Button>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ maxHeight: isMobile ? 300 : 400, overflowX: 'auto' }}>
                    <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" sx={{ minWidth: 50 }}>
                            <Checkbox
                              indeterminate={selectedDraftOffers.length > 0 && selectedDraftOffers.length < draftOffers.length}
                              checked={draftOffers.length > 0 && selectedDraftOffers.length === draftOffers.length}
                              onChange={handleToggleAllDraftOffers}
                              size={isMobile ? 'small' : 'medium'}
                            />
                          </TableCell>
                          {!isMobile && <TableCell sx={{ minWidth: 80 }}>Zdjęcie</TableCell>}
                          <TableCell sx={{ minWidth: isMobile ? 150 : 200 }}>Nazwa oferty</TableCell>
                          <TableCell sx={{ minWidth: isMobile ? 80 : 100 }}>Cena</TableCell>
                          {!isMobile && <TableCell sx={{ minWidth: 120 }}>Data utworzenia</TableCell>}
                          <TableCell sx={{ minWidth: isMobile ? 60 : 80 }}>Akcje</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {draftOffers.map((offer) => (
                          <TableRow key={offer.id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedDraftOffers.includes(offer.id)}
                                onChange={() => handleToggleDraftOfferSelection(offer.id)}
                                size={isMobile ? 'small' : 'medium'}
                              />
                            </TableCell>
                            {!isMobile && (
                              <TableCell>
                                {offer.primaryImage ? (
                                  <Avatar
                                    src={offer.primaryImage}
                                    alt={offer.name}
                                    sx={{ width: 40, height: 40 }}
                                    variant="rounded"
                                  />
                                ) : (
                                  <Avatar sx={{ width: 40, height: 40 }} variant="rounded">
                                    -
                                  </Avatar>
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: isMobile ? 150 : 300 }} noWrap>
                                {offer.name || 'Bez nazwy'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {offer.price ? `${offer.price} ${offer.currency || 'PLN'}` : '-'}
                            </TableCell>
                            {!isMobile && (
                              <TableCell>
                                {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString('pl-PL', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </TableCell>
                            )}
                            <TableCell>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteDraftOffer(offer.id)}
                                disabled={deletingOffers}
                                title="Usuń szkic"
                              >
                                <DeleteIcon fontSize={isMobile ? 'small' : 'medium'} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDraftOffersDialog}>Zamknij</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default Integrations;
