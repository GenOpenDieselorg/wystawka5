import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Snackbar,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  TablePagination,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LinkIcon from '@mui/icons-material/Link';
import Checkbox from '@mui/material/Checkbox';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import sanitizeHtml from '../utils/sanitizeHtml';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';
const BASE_OFFER_PRICE = 1.0; // Bazowa cena - koszt utworzenia produktu

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalData, setErrorModalData] = useState(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [walletBalance, setWalletBalance] = useState(0);
  const [insufficientBalanceDialogOpen, setInsufficientBalanceDialogOpen] = useState(false);
  const [requiredBalance, setRequiredBalance] = useState(BASE_OFFER_PRICE);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [pendingNewProductId, setPendingNewProductId] = useState(null);

  // Product Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsFormData, setDetailsFormData] = useState({});
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Active Jobs State
  const [activeJobs, setActiveJobs] = useState({});
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    fetchProducts();
    fetchActiveJobs();
    
    // Poll for active jobs
    const interval = setInterval(() => {
        fetchActiveJobs();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchActiveJobs = async () => {
    try {
      if (!user) return;
      
      const response = await axios.get(`${API_URL}/jobs/active`);
      
      const jobs = response.data.jobs || [];
      const jobMap = {};
      
      jobs.forEach(job => {
        if (job.data && job.data.productId) {
            jobMap[job.data.productId] = job;
        }
      });
      
      // Check if any job finished (was in state but not in new list)
      // If so, refresh products
      setActiveJobs(prevJobs => {
          const prevKeys = Object.keys(prevJobs);
          const newKeys = Object.keys(jobMap);
          const hasFinishedJobs = prevKeys.some(key => !newKeys.includes(key));
          
          if (hasFinishedJobs) {
              fetchProducts();
          }
          
          return jobMap;
      });
      
    } catch (error) {
      console.error('Error fetching active jobs:', error);
    }
  };

  useEffect(() => {
    if (location.state?.message) {
      setSnackbarMessage(location.state.message);
      setSnackbarOpen(true);
    }

    if (location.state?.newJobId && location.state?.newProductId) {
        setPendingNewProductId(location.state.newProductId);
        // Optimistically show processing state
        setActiveJobs(prev => ({
            ...prev,
            [location.state.newProductId]: {
                id: location.state.newJobId,
                progress: 0,
                status: 'pending'
            }
        }));
    }

    if (location.state?.message || location.state?.newJobId) {
      // Clear the state so it doesn't persist on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    if (pendingNewProductId && products.length > 0) {
      const product = products.find(p => p.id === pendingNewProductId);
      if (product) {
        // Switch to the correct tab based on product status
        if (product.status === 'draft') {
          setCurrentTab(1);
        } else if (product.status === 'ready' || product.status === 'in_production') {
          setCurrentTab(2);
        } else {
          setCurrentTab(0);
        }
        setPendingNewProductId(null);
      }
    }
  }, [products, pendingNewProductId]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      // Ensure we always set an array
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProductDetails = async () => {
      setSavingDetails(true);
      try {
          const productId = viewingProduct.id;
          
          await axios.put(
            `${API_URL}/products/${productId}`,
            {
              productName: detailsFormData.product_name,
              eanCode: detailsFormData.ean_code,
              catalogCode: detailsFormData.catalog_code,
              price: detailsFormData.price,
              vatRate: detailsFormData.vat_rate,
              description: detailsFormData.description,
              width: detailsFormData.width,
              height: detailsFormData.height,
              depth: detailsFormData.depth,
              weight: detailsFormData.weight
            }
          );
          
          setSnackbarMessage('Produkt zaktualizowany pomyślnie');
          setSnackbarOpen(true);
          setEditingDetails(false);
          setDetailsModalOpen(false);
          fetchProducts(); // Refresh list
      } catch (error) {
          console.error('Error saving product details:', error);
          setSnackbarMessage('Błąd podczas zapisywania zmian');
          setSnackbarOpen(true);
      } finally {
          setSavingDetails(false);
      }
  };

  const openProductDetails = async (product) => {
      setViewingProduct(product);
      // Initialize form data
      setDetailsFormData({
          ...product,
          width: product.width || '',
          height: product.height || '',
          depth: product.depth || '',
          weight: product.weight || ''
      });
      setEditingDetails(false);
      setDetailsModalOpen(true);
      
      // Fetch full details (description might not be in list)
      try {
          const response = await axios.get(`${API_URL}/products/${product.id}`);
          const fullProduct = response.data.product;
          setViewingProduct(fullProduct);
          setDetailsFormData({
              ...fullProduct,
              width: fullProduct.width || '',
              height: fullProduct.height || '',
              depth: fullProduct.depth || '',
              weight: fullProduct.weight || ''
          });
      } catch (e) {
          console.error("Failed to fetch full product details", e);
      }
  };


  const handleCreateProduct = async () => {
    try {
      // Sprawdź saldo przed przekierowaniem
      const response = await axios.get(`${API_URL}/wallet/check-balance`);
      
      const { hasBalance, balance, required } = response.data;
      
      if (required) {
        setRequiredBalance(required);
      }
      
      if (!hasBalance) {
        // Pokaż dialog z informacją o niewystarczającym saldzie
        setInsufficientBalanceDialogOpen(true);
      } else {
        // Przekieruj do kreatora
        navigate('/product/wizard');
      }
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      // W przypadku błędu, pozwól użytkownikowi kontynuować (może być problem z połączeniem)
      navigate('/product/wizard');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'in_production':
        return 'warning'; // Yellow/orange to indicate it's being processed
      case 'draft':
        return 'warning';
      case 'done':
        return 'info';
      case 'sold':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ready':
        return 'Gotowe';
      case 'in_production':
        return 'W produkcji';
      case 'draft':
        return 'Szkic';
      case 'done':
        return 'Wystawione';
      case 'sold':
        return 'Sprzedane';
      default:
        return status;
    }
  };

  // Safe date formatter to prevent crashes on invalid dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Brak';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Błędna data';
      
      return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Błąd daty';
    }
  };

  const handleEditProduct = (productId) => {
    navigate(`/product/wizard?edit=${productId}`);
  };

  const handlePublishProduct = async (productId) => {
    setLoading(true);
    try {
      const response = await axios.patch(`${API_URL}/products/${productId}/publish`, {});
      
      // Show marketplace results if available
      if (response.data.marketplaceResults && response.data.marketplaceResults.length > 0) {
        const results = response.data.marketplaceResults;
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount > 0 && successCount === 0) {
          // All failed - show error modal
          setErrorModalData({
            title: 'Błąd publikacji',
            message: 'Nie udało się opublikować produktu na żadnym marketplace',
            details: results.map(r => ({
              marketplace: r.marketplace,
              message: r.message
            })),
            errorType: 'all_failed'
          });
          setErrorModalOpen(true);
        } else if (failCount > 0) {
          // Partial success - show success modal with warnings
          setSuccessModalData({
            title: 'Produkt opublikowany',
            message: `Produkt opublikowany pomyślnie na ${successCount} marketplace(ach)`,
            failedResults: results.filter(r => !r.success).map(r => ({
              marketplace: r.marketplace,
              message: r.message
            }))
          });
          setSuccessModalOpen(true);
        } else {
          // All succeeded
          setSuccessModalData({
            title: 'Sukces',
            message: 'Produkt opublikowany pomyślnie na wszystkich marketplace!',
            failedResults: []
          });
          setSuccessModalOpen(true);
        }
      } else {
        setSuccessModalData({
          title: 'Sukces',
          message: 'Produkt opublikowany pomyślnie!',
          failedResults: []
        });
        setSuccessModalOpen(true);
      }
      
      await fetchProducts();
    } catch (error) {
      console.error('Error publishing product:', error);
      
      const errorResponse = error.response?.data;
      let errorData = {
        title: 'Błąd podczas publikacji',
        message: errorResponse?.error || 'Błąd podczas publikacji produktu',
        details: [],
        errorType: 'general'
      };

      // Handle specific error types
      if (error.response?.status === 402) {
        // Insufficient balance
        errorData = {
          title: 'Niewystarczające saldo',
          message: errorResponse?.error || 'Niewystarczające saldo. Proszę doładować portfel.',
          details: errorResponse?.marketplaceResults || [],
          errorType: 'insufficient_balance',
          balance: errorResponse?.balance,
          required: errorResponse?.required
        };
      } else if (error.response?.status === 400) {
        // Validation or marketplace errors
        errorData = {
          title: 'Błąd publikacji',
          message: errorResponse?.error || 'Nie udało się opublikować produktu',
          details: errorResponse?.marketplaceResults || [],
          errorType: 'validation_error',
          detailsText: errorResponse?.details
        };
      }

      setErrorModalData(errorData);
      setErrorModalOpen(true);
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten produkt?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/products/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.error || 'Błąd podczas usuwania produktu');
    }
  };

  // Calculate counts for each category
  const doneCount = (products || []).filter(p => p && p.status === 'done').length;
  const draftCount = (products || []).filter(p => p && p.status === 'draft').length;
  const readyCount = (products || []).filter(p => p && (p.status === 'ready' || p.status === 'in_production')).length;

  // Safe filtering of products to avoid crash on null items
  const filteredProducts = (products || []).filter(product => {
    if (!product) return false;
    
    if (currentTab === 0) return product.status === 'done';
    if (currentTab === 1) return product.status === 'draft';
    if (currentTab === 2) return product.status === 'ready' || product.status === 'in_production';
    return true;
  });
  
  // Pagination logic
  const paginatedProducts = filteredProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  // Reset page when tab changes or rowsPerPage changes
  useEffect(() => {
    setPage(0);
  }, [currentTab, rowsPerPage]);

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const newSelected = new Set(selectedProducts);
      paginatedProducts.forEach(p => newSelected.add(p.id));
      setSelectedProducts(newSelected);
    } else {
      const newSelected = new Set(selectedProducts);
      paginatedProducts.forEach(p => newSelected.delete(p.id));
      setSelectedProducts(newSelected);
    }
  };

  const handleSelectProduct = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkPublish = async () => {
    const readyProducts = filteredProducts.filter(p => 
      p.status === 'ready' && selectedProducts.has(p.id)
    );

    if (readyProducts.length === 0) {
      alert('Wybierz produkty ze statusem "Gotowe do wystawienia" do publikacji');
      return;
    }

    if (!window.confirm(`Czy na pewno chcesz opublikować ${readyProducts.length} produkt(ów)?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/products/bulk-publish`,
        { productIds: readyProducts.map(p => p.id) }
      );

      setSuccessModalData({
        title: 'Masowa publikacja',
        message: `Opublikowano ${response.data.totalSuccess} produkt(ów). ${response.data.totalFailed} nie powiodło się.`,
        failedResults: response.data.results
          .filter(r => r.error || r.results?.some(mr => !mr.success))
          .map(r => ({
            marketplace: r.productName,
            message: r.error || r.results?.filter(mr => !mr.success).map(mr => `${mr.marketplace}: ${mr.message}`).join(', ')
          }))
      });
      setSuccessModalOpen(true);
      setSelectedProducts(new Set());
      await fetchProducts();
    } catch (error) {
      console.error('Error bulk publishing products:', error);
      setErrorModalData({
        title: 'Błąd masowej publikacji',
        message: error.response?.data?.error || 'Błąd podczas masowej publikacji produktów',
        details: []
      });
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const selectedProductsList = filteredProducts.filter(p => selectedProducts.has(p.id));

    if (selectedProductsList.length === 0) {
      alert('Wybierz produkty do usunięcia');
      return;
    }

    if (!window.confirm(`Czy na pewno chcesz usunąć ${selectedProductsList.length} produkt(ów)? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/products/bulk-delete`,
        { productIds: selectedProductsList.map(p => p.id) }
      );

      setSuccessModalData({
        title: 'Masowe usuwanie',
        message: `Usunięto ${response.data.totalSuccess} produkt(ów). ${response.data.totalFailed} nie powiodło się.`,
        failedResults: []
      });
      setSuccessModalOpen(true);
      setSelectedProducts(new Set());
      await fetchProducts();
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      setErrorModalData({
        title: 'Błąd masowego usuwania',
        message: error.response?.data?.error || 'Błąd podczas masowego usuwania produktów',
        details: []
      });
      setErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Moje produkty"
      actions={
        <Button
          variant="contained"
          startIcon={!isSmallMobile ? <AddIcon /> : null}
          onClick={handleCreateProduct}
          color="primary"
          size={isMobile ? "small" : "medium"}
          sx={{ 
            bgcolor: 'white', 
            color: 'primary.main', 
            '&:hover': { bgcolor: '#f5f5f5' },
            ...(isSmallMobile && { 
              minWidth: 'auto',
              px: 1
            })
          }}
        >
          {isSmallMobile ? <AddIcon /> : 'Dodaj nowy produkt'}
        </Button>
      }
    >
      <Paper sx={{ mb: 3, overflowX: 'auto' }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => {
            setCurrentTab(newValue);
            setSelectedProducts(new Set());
          }}
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={isMobile ? `Wystawione (${doneCount})` : `Wystawione (${doneCount})`} />
          <Tab label={isMobile ? `Szkice (${draftCount})` : `Szkice (${draftCount})`} />
          <Tab label={isMobile ? `Gotowe (${readyCount})` : `Gotowe do wystawienia (${readyCount})`} />
        </Tabs>
      </Paper>

      {filteredProducts.length > 0 && selectedProducts.size > 0 && (
            <Paper sx={{ 
              mb: 2, 
              p: isMobile ? 1.5 : 2, 
              display: 'flex', 
              gap: isMobile ? 1 : 2, 
              alignItems: 'center', 
              bgcolor: 'primary.light', 
              color: 'white',
              flexDirection: isSmallMobile ? 'column' : 'row'
            }}>
              <Typography variant={isMobile ? "body2" : "body1"} sx={{ flexGrow: 1 }}>
                Zaznaczono: {selectedProducts.size} produkt(ów)
              </Typography>
              <Stack direction={isSmallMobile ? "column" : "row"} spacing={1} sx={{ width: isSmallMobile ? '100%' : 'auto' }}>
                {currentTab === 2 && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<PublishIcon />}
                    onClick={handleBulkPublish}
                    disabled={loading}
                    size={isMobile ? "small" : "medium"}
                    fullWidth={isSmallMobile}
                  >
                    {isSmallMobile ? 'Opublikuj' : 'Opublikuj zaznaczone'}
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                  disabled={loading}
                  size={isMobile ? "small" : "medium"}
                  fullWidth={isSmallMobile}
                >
                  {isSmallMobile ? 'Usuń' : 'Usuń zaznaczone'}
                </Button>
              </Stack>
            </Paper>
          )}

          {loading ? (
            <Typography>Ładowanie...</Typography>
          ) : products.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <CardContent>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  Witaj w wystawoferte.pl!
                </Typography>
                <Typography variant="h6" paragraph color="text.secondary">
                  To jest Twoje centrum zarządzania sprzedażą.
                </Typography>
                
                <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ maxWidth: 600 }}>
                    Aby rozpocząć sprzedaż, wykonaj te proste kroki:
                  </Typography>
                  
                  <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 600, textAlign: 'left' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalanceWalletIcon color="primary" /> 1. Doładuj portfel
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                      Wpłać środki, aby móc wystawiać oferty. To niezbędny pierwszy krok.
                    </Typography>
                    
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon color="primary" /> 2. Skonfiguruj integracje
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 2 }}>
                      Połącz swoje konta (Allegro, OLX itp.), aby wystawiać oferty na wielu platformach jednocześnie.
                    </Typography>

                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddIcon color="primary" /> 3. Wystaw pierwszy produkt
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                      Twórz oferty nawet w 30 sekund! Wystarczy numer EAN lub nazwa produktu i zdjęcia.
                    </Typography>
                  </Paper>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<AccountBalanceWalletIcon />}
                    onClick={() => navigate('/wallet')}
                  >
                    Przejdź do portfela
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<LinkIcon />}
                    onClick={() => navigate('/integrations')}
                  >
                    Integracje
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="textSecondary">
                  {currentTab === 0 ? 'Nie masz jeszcze wystawionych produktów' : 
                   currentTab === 1 ? 'Nie masz żadnych szkiców' : 
                   'Nie masz produktów gotowych do wystawienia'}
                </Typography>
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateProduct}
                  >
                    Dodaj nowy produkt
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : isMobile ? (
            <>
              {/* Mobile Card View */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {paginatedProducts.map((product) => (
                  <Card key={product.id} sx={{ position: 'relative' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                        />
                        {product.images && product.images.length > 0 && product.images[0] ? (
                          <Avatar
                            src={`${API_URL.replace(/\/api\/?$/, '')}${product.images[0].processedUrl || product.images[0].url}`}
                            alt={product.product_name}
                            sx={{ width: 80, height: 80 }}
                            variant="rounded"
                          />
                        ) : (
                          <Avatar sx={{ width: 80, height: 80 }} variant="rounded">
                            Brak
                          </Avatar>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="subtitle1" 
                            fontWeight="medium"
                            onClick={() => openProductDetails(product)}
                            sx={{ 
                              cursor: 'pointer', 
                              '&:hover': { textDecoration: 'underline', color: 'primary.main' },
                              mb: 0.5,
                              wordBreak: 'break-word'
                            }}
                          >
                            {product.product_name || 'Bez nazwy'}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            {activeJobs[product.id] ? (
                              <Box sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    AI pracuje...
                                  </Typography>
                                  <Typography variant="caption" fontWeight="bold">
                                    {activeJobs[product.id].progress || 0}%
                                  </Typography>
                                </Box>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={activeJobs[product.id].progress || 0} 
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            ) : (
                              <Chip
                                label={getStatusLabel(product.status)}
                                color={getStatusColor(product.status)}
                                size="small"
                              />
                            )}
                            {product.price && (
                              <Typography variant="body2" color="text.secondary">
                                {product.price} PLN
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {product.ean_code && `EAN: ${product.ean_code}`}
                            {product.ean_code && product.catalog_code && ' • '}
                            {product.catalog_code && `Kod: ${product.catalog_code}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatDate(product.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {product.status === 'draft' && (
                          <>
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => handleEditProduct(product.id)}
                              variant="outlined"
                            >
                              Kontynuuj
                            </Button>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Usuń"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                        {(product.status === 'ready' || product.status === 'in_production') && (
                          <>
                            {product.status === 'ready' && (
                              <Button
                                size="small"
                                startIcon={<PublishIcon />}
                                onClick={() => handlePublishProduct(product.id)}
                                variant="contained"
                                color="success"
                              >
                                Opublikuj
                              </Button>
                            )}
                            <Button
                              size="small"
                              startIcon={<EditIcon />}
                              onClick={() => openProductDetails(product)}
                              variant="outlined"
                            >
                              Edytuj
                            </Button>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Usuń"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                        {product.status === 'done' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProduct(product.id)}
                            title="Usuń"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredProducts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="Na stronę:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} z ${count}`}
              />
            </>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={
                            paginatedProducts.some(p => selectedProducts.has(p.id)) &&
                            !paginatedProducts.every(p => selectedProducts.has(p.id))
                          }
                          checked={
                            paginatedProducts.length > 0 &&
                            paginatedProducts.every(p => selectedProducts.has(p.id))
                          }
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Zdjęcie</TableCell>
                      <TableCell>Nazwa produktu</TableCell>
                      <TableCell>Kod EAN</TableCell>
                      <TableCell>Kod katalogowy</TableCell>
                      <TableCell>Cena</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Data utworzenia</TableCell>
                      <TableCell>Akcje</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onChange={() => handleSelectProduct(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {product.images && product.images.length > 0 && product.images[0] ? (
                            <Avatar
                              src={`${API_URL.replace(/\/api\/?$/, '')}${product.images[0].processedUrl || product.images[0].url}`}
                              alt={product.product_name}
                              sx={{ width: 56, height: 56 }}
                              variant="rounded"
                            />
                          ) : (
                            <Avatar sx={{ width: 56, height: 56 }} variant="rounded">
                              Brak
                            </Avatar>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box 
                              onClick={() => openProductDetails(product)}
                              sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}
                          >
                              <Typography variant="body2" fontWeight="medium">
                              {product.product_name || 'Bez nazwy'}
                              </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{product.ean_code || 'Brak'}</TableCell>
                        <TableCell>{product.catalog_code || 'Brak'}</TableCell>
                        <TableCell>{product.price ? `${product.price} PLN` : 'Brak'}</TableCell>
                        <TableCell>
                          {activeJobs[product.id] ? (
                              <Box sx={{ width: '100%', minWidth: 100 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                      <Typography variant="caption" color="text.secondary">
                                          AI pracuje...
                                      </Typography>
                                      <Typography variant="caption" fontWeight="bold">
                                          {activeJobs[product.id].progress || 0}%
                                      </Typography>
                                  </Box>
                                  <LinearProgress 
                                      variant="determinate" 
                                      value={activeJobs[product.id].progress || 0} 
                                      sx={{ height: 6, borderRadius: 3 }}
                                  />
                              </Box>
                          ) : (
                              <Chip
                                label={getStatusLabel(product.status)}
                                color={getStatusColor(product.status)}
                                size="small"
                              />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(product.created_at)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {product.status === 'draft' && (
                              <>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleEditProduct(product.id)}
                                  title="Kontynuuj"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Usuń"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </>
                            )}
                            {(product.status === 'ready' || product.status === 'in_production') && (
                              <>
                                {product.status === 'ready' && (
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handlePublishProduct(product.id)}
                                    title="Opublikuj"
                                  >
                                    <PublishIcon />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => openProductDetails(product)}
                                  title="Edytuj"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Usuń"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </>
                            )}
                            {product.status === 'done' && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteProduct(product.id)}
                                title="Usuń"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredProducts.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="Ofert na stronę:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} z ${count}`}
              />
            </>
          )}
      {/* Error Modal */}
      <Dialog
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <ErrorIcon />
          {errorModalData?.title || 'Błąd'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {errorModalData?.message}
          </DialogContentText>
          
          {errorModalData?.errorType === 'insufficient_balance' && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Twoje saldo:</strong> {errorModalData?.balance?.toFixed(2) || '0.00'} PLN
              </Typography>
              <Typography variant="body2">
                <strong>Wymagane:</strong> {errorModalData?.required?.toFixed(2) || '1.00'} PLN
              </Typography>
            </Alert>
          )}

          {errorModalData?.detailsText && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {errorModalData.detailsText}
              </Typography>
            </Alert>
          )}

          {errorModalData?.details && errorModalData.details.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Szczegóły błędów:
              </Typography>
              <List dense>
                {errorModalData.details.map((detail, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {detail.marketplace || 'Nieznany marketplace'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="error">
                            {detail.message || 'Nieznany błąd'}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < errorModalData.details.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? 1 : 0, px: isMobile ? 2 : 1, pb: isMobile ? 2 : 1 }}>
          {errorModalData?.errorType === 'insufficient_balance' && (
            <Button
              onClick={() => {
                setErrorModalOpen(false);
                navigate('/wallet');
              }}
              variant="contained"
              color="primary"
              fullWidth={isMobile}
              size={isMobile ? "medium" : "medium"}
            >
              Doładuj portfel
            </Button>
          )}
          <Button 
            onClick={() => setErrorModalOpen(false)} 
            variant="contained"
            fullWidth={isMobile}
            size={isMobile ? "medium" : "medium"}
          >
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Modal */}
      <Dialog
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
          <CheckCircleIcon />
          {successModalData?.title || 'Sukces'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {successModalData?.message}
          </DialogContentText>
          
          {successModalData?.failedResults && successModalData.failedResults.length > 0 && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Uwaga: Niektóre marketplace zwróciły błędy:
                </Typography>
                <List dense>
                  {successModalData.failedResults.map((result, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {result.marketplace || 'Nieznany marketplace'}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {result.message || 'Nieznany błąd'}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {index < successModalData.failedResults.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 2 : 1, pb: isMobile ? 2 : 1 }}>
          <Button 
            onClick={() => setSuccessModalOpen(false)} 
            variant="contained" 
            color="success"
            fullWidth={isMobile}
            size={isMobile ? "medium" : "medium"}
          >
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Details Modal */}
      <Dialog
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
                {editingDetails ? 'Edycja produktu' : 'Szczegóły produktu'}
            </Box>
            <IconButton onClick={() => setDetailsModalOpen(false)}>
                <CloseIcon />
            </IconButton>
        </DialogTitle>
        <DialogContent dividers>
            {viewingProduct && (
                <Grid container spacing={isMobile ? 2 : 3}>
                    {/* Basic Info */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Nazwa produktu"
                            value={detailsFormData.product_name || ''}
                            onChange={(e) => setDetailsFormData({...detailsFormData, product_name: e.target.value})}
                            margin="normal"
                            disabled={!editingDetails}
                            variant={editingDetails ? "outlined" : "filled"}
                            size={isMobile ? "small" : "medium"}
                        />
                        <TextField
                            fullWidth
                            label="Kod EAN"
                            value={detailsFormData.ean_code || ''}
                            onChange={(e) => setDetailsFormData({...detailsFormData, ean_code: e.target.value})}
                            margin="normal"
                            disabled={!editingDetails}
                            variant={editingDetails ? "outlined" : "filled"}
                            size={isMobile ? "small" : "medium"}
                        />
                         <TextField
                            fullWidth
                            label="Kod katalogowy"
                            value={detailsFormData.catalog_code || ''}
                            onChange={(e) => setDetailsFormData({...detailsFormData, catalog_code: e.target.value})}
                            margin="normal"
                            disabled={!editingDetails}
                            variant={editingDetails ? "outlined" : "filled"}
                            size={isMobile ? "small" : "medium"}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                         <TextField
                            fullWidth
                            label="Cena (PLN)"
                            type="number"
                            value={detailsFormData.price || ''}
                            onChange={(e) => setDetailsFormData({...detailsFormData, price: e.target.value})}
                            margin="normal"
                            disabled={!editingDetails}
                            variant={editingDetails ? "outlined" : "filled"}
                            size={isMobile ? "small" : "medium"}
                        />
                         <FormControl fullWidth margin="normal" variant={editingDetails ? "outlined" : "filled"} size={isMobile ? "small" : "medium"}>
                            <InputLabel>Stawka VAT</InputLabel>
                            <Select
                                value={detailsFormData.vat_rate || '23%'}
                                onChange={(e) => setDetailsFormData({...detailsFormData, vat_rate: e.target.value})}
                                disabled={!editingDetails}
                                label="Stawka VAT"
                            >
                                <MenuItem value="23%">23%</MenuItem>
                                <MenuItem value="5%">5%</MenuItem>
                                <MenuItem value="0%">0%</MenuItem>
                                <MenuItem value="zw">Zwolniony</MenuItem>
                                <MenuItem value="np">Nie podlega</MenuItem>
                                <MenuItem value="off">Wyłączony</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    {/* Dimensions & Weight */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Wymiary i waga</Typography>
                        <Box sx={{ 
                            display: 'flex', 
                            gap: isMobile ? 1 : 2,
                            flexWrap: isMobile ? 'wrap' : 'nowrap'
                        }}>
                            <TextField
                                label="Szerokość (cm)"
                                type="number"
                                size="small"
                                value={detailsFormData.width || ''}
                                onChange={(e) => setDetailsFormData({...detailsFormData, width: e.target.value})}
                                disabled={!editingDetails}
                                InputProps={{ readOnly: !editingDetails }}
                                sx={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 1 }}
                            />
                            <TextField
                                label="Wysokość (cm)"
                                type="number"
                                size="small"
                                value={detailsFormData.height || ''}
                                onChange={(e) => setDetailsFormData({...detailsFormData, height: e.target.value})}
                                disabled={!editingDetails}
                                InputProps={{ readOnly: !editingDetails }}
                                sx={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 1 }}
                            />
                             <TextField
                                label="Głębokość (cm)"
                                type="number"
                                size="small"
                                value={detailsFormData.depth || ''}
                                onChange={(e) => setDetailsFormData({...detailsFormData, depth: e.target.value})}
                                disabled={!editingDetails}
                                InputProps={{ readOnly: !editingDetails }}
                                sx={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 1 }}
                            />
                             <TextField
                                label="Waga (kg)"
                                type="number"
                                size="small"
                                value={detailsFormData.weight || ''}
                                onChange={(e) => setDetailsFormData({...detailsFormData, weight: e.target.value})}
                                disabled={!editingDetails}
                                InputProps={{ readOnly: !editingDetails }}
                                sx={{ flex: isMobile ? '1 1 calc(50% - 4px)' : 1 }}
                            />
                        </Box>
                    </Grid>

                    {/* Description */}
                    <Grid item xs={12}>
                        {editingDetails ? (
                            <TextField
                                fullWidth
                                multiline
                                rows={isMobile ? 6 : 8}
                                label="Opis produktu"
                                value={detailsFormData.description || ''}
                                onChange={(e) => setDetailsFormData({...detailsFormData, description: e.target.value})}
                                margin="normal"
                                variant="outlined"
                                size={isMobile ? "small" : "medium"}
                            />
                        ) : (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Opis produktu</Typography>
                                <Paper variant="outlined" sx={{ p: 2, minHeight: 200, bgcolor: 'background.default' }}>
                                    {(() => {
                                        const description = detailsFormData.description || '';
                                        const images = viewingProduct?.images || [];
                                        
                                        if (!description) {
                                            return <Typography color="textSecondary">Brak opisu</Typography>;
                                        }
                                        
                                        // Check if description contains placeholders
                                        const hasPlaceholders = /\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/i.test(description);
                                        
                                        if (hasPlaceholders && images.length > 0) {
                                            // Replace placeholders with images
                                            let imageIndex = 0;
                                            const parts = description.split(/(\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\])/gi);
                                            
                                            return (
                                                <Box sx={{ '& img': { maxWidth: '100%', height: 'auto', margin: '10px 0', borderRadius: '4px', display: 'block', border: '1px solid #ddd' } }}>
                                                    {parts.map((part, idx) => {
                                                        if (/\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/i.test(part)) {
                                                            if (imageIndex < images.length) {
                                                                const img = images[imageIndex];
                                                                const imgUrl = typeof img === 'string' ? img : (img.processedUrl || img.url);
                                                                const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${API_URL.replace(/\/api\/?$/, '')}${imgUrl}`;
                                                                imageIndex++;
                                                                return (
                                                                    <Box key={idx} sx={{ my: 2 }}>
                                                                        <img 
                                                                            src={fullUrl} 
                                                                            alt="Product" 
                                                                            style={{ 
                                                                                maxWidth: '100%', 
                                                                                height: 'auto', 
                                                                                borderRadius: '4px',
                                                                                display: 'block',
                                                                                border: '1px solid #ddd'
                                                                            }} 
                                                                        />
                                                                    </Box>
                                                                );
                                                            }
                                                            return null;
                                                        }
                                                        return (
                                                            <Box 
                                                                key={idx} 
                                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(part) }}
                                                                sx={{
                                                                    '& h1': { fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0', lineHeight: 1.2 },
                                                                    '& h2': { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.8rem 0', lineHeight: 1.3 },
                                                                    '& h3': { fontSize: '1.25rem', fontWeight: 'bold', margin: '0.6rem 0', lineHeight: 1.4 },
                                                                    '& p': { margin: '0.5rem 0', lineHeight: 1.6 },
                                                                    '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
                                                                    '& li': { margin: '0.25rem 0', lineHeight: 1.6 },
                                                                    '& b, & strong': { fontWeight: 'bold' },
                                                                    '& i, & em': { fontStyle: 'italic' },
                                                                    '& a': { color: 'primary.main', textDecoration: 'underline' }
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </Box>
                                            );
                                        }
                                        
                                        // No placeholders or no images - render as HTML
                                        return (
                                            <Box 
                                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                                                sx={{
                                                    '& h1': { fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0', lineHeight: 1.2 },
                                                    '& h2': { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.8rem 0', lineHeight: 1.3 },
                                                    '& h3': { fontSize: '1.25rem', fontWeight: 'bold', margin: '0.6rem 0', lineHeight: 1.4 },
                                                    '& p': { margin: '0.5rem 0', lineHeight: 1.6 },
                                                    '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
                                                    '& li': { margin: '0.25rem 0', lineHeight: 1.6 },
                                                    '& b, & strong': { fontWeight: 'bold' },
                                                    '& i, & em': { fontStyle: 'italic' },
                                                    '& a': { color: 'primary.main', textDecoration: 'underline' }
                                                }}
                                            />
                                        );
                                    })()}
                                </Paper>
                            </Box>
                        )}
                    </Grid>

                    {/* Images Preview */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Zdjęcia</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {viewingProduct.images && viewingProduct.images.length > 0 ? (
                                viewingProduct.images.map((img, i) => (
                                    <img 
                                        key={i}
                                        src={`${API_URL.replace(/\/api\/?$/, '')}${img.processedUrl || img.url}`}
                                        alt={`Product ${i}`}
                                        style={{ 
                                            width: isMobile ? 80 : 100, 
                                            height: isMobile ? 80 : 100, 
                                            objectFit: 'cover', 
                                            borderRadius: 4 
                                        }}
                                    />
                                ))
                            ) : (
                                <Typography variant="body2" color="textSecondary">Brak zdjęć</Typography>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            )}
        </DialogContent>
        <DialogActions sx={{ flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? 1 : 0, px: isMobile ? 2 : 1, pb: isMobile ? 2 : 1 }}>
            {editingDetails ? (
                <>
                    <Button 
                        onClick={() => {
                            setEditingDetails(false);
                            setDetailsFormData(viewingProduct); // Reset changes
                        }}
                        fullWidth={isMobile}
                        size={isMobile ? "medium" : "medium"}
                    >
                        Anuluj
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSaveProductDetails} 
                        startIcon={<SaveIcon />}
                        disabled={savingDetails}
                        fullWidth={isMobile}
                        size={isMobile ? "medium" : "medium"}
                    >
                        Zapisz
                    </Button>
                </>
            ) : (
                <>
                    <Button 
                        onClick={() => setDetailsModalOpen(false)}
                        fullWidth={isMobile}
                        size={isMobile ? "medium" : "medium"}
                    >
                        Zamknij
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={() => setEditingDetails(true)} 
                        startIcon={<EditIcon />}
                        fullWidth={isMobile}
                        size={isMobile ? "medium" : "medium"}
                    >
                        Edytuj
                    </Button>
                </>
            )}
        </DialogActions>
      </Dialog>

      {/* Insufficient Balance Dialog */}
      <Dialog
        open={insufficientBalanceDialogOpen}
        onClose={() => setInsufficientBalanceDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <ErrorIcon />
          Niewystarczające saldo portfela
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Aby utworzyć nowy produkt, potrzebujesz minimum {requiredBalance.toFixed(2)} PLN na koncie.
          </DialogContentText>
          <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Wymagane:</strong> {requiredBalance.toFixed(2)} PLN
              </Typography>
            </Alert>
          <Typography variant="body2" color="textSecondary">
            Doładuj portfel, aby móc tworzyć nowe produkty.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: isMobile ? 'column-reverse' : 'row', gap: isMobile ? 1 : 0, px: isMobile ? 2 : 1, pb: isMobile ? 2 : 1 }}>
          <Button
            onClick={() => {
              setInsufficientBalanceDialogOpen(false);
              navigate('/wallet');
            }}
            variant="contained"
            color="primary"
            fullWidth={isMobile}
            size={isMobile ? "medium" : "medium"}
          >
            Przejdź do portfela
          </Button>
          <Button 
            onClick={() => setInsufficientBalanceDialogOpen(false)} 
            variant="outlined"
            fullWidth={isMobile}
            size={isMobile ? "medium" : "medium"}
          >
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <Button color="secondary" size="small" onClick={() => setSnackbarOpen(false)}>
            ZAMKNIJ
          </Button>
        }
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Layout>
  );
}

export default Dashboard;

