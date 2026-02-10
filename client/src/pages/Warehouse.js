import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
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
  CircularProgress,
  IconButton,
  TablePagination,
  Checkbox,
  Tooltip
} from '@mui/material';
import SellIcon from '@mui/icons-material/Sell';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function Warehouse() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0); // 0 = active, 1 = sold
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Sell dialog state
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellingProductId, setSellingProductId] = useState(null);
  const [sellingProductName, setSellingProductName] = useState('');
  const [sellLoading, setSellLoading] = useState(false);

  // Result dialog state
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [resultDialogData, setResultDialogData] = useState(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  useEffect(() => {
    fetchWarehouseProducts();
  }, []);

  useEffect(() => {
    setPage(0);
    setSelectedProducts(new Set());
  }, [currentTab]);

  const fetchWarehouseProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/warehouse`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching warehouse products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getMarketplaceColor = (marketplace) => {
    switch (marketplace) {
      case 'allegro': return '#ff6900';
      case 'olx': return '#00a046';
      case 'erli': return '#4a90e2';
      case 'otomoto': return '#cb0000';
      default: return '#757575';
    }
  };

  const getMarketplaceName = (marketplace) => {
    switch (marketplace) {
      case 'allegro': return 'Allegro';
      case 'olx': return 'OLX';
      case 'erli': return 'Erli';
      case 'otomoto': return 'Otomoto';
      default: return marketplace;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Błędna data';
      return date.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Błąd daty';
    }
  };

  // Filter products
  const filteredProducts = (products || []).filter(product => {
    if (!product) return false;
    if (currentTab === 0) return product.status === 'done';
    if (currentTab === 1) return product.status === 'sold';
    return true;
  });

  const paginatedProducts = filteredProducts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Selection handlers
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

  // Open sell confirmation dialog
  const handleOpenSellDialog = (product) => {
    setSellingProductId(product.id);
    setSellingProductName(product.product_name || 'Bez nazwy');
    setSellDialogOpen(true);
  };

  // Mark product as sold
  const handleMarkSold = async () => {
    setSellLoading(true);
    try {
      const response = await axios.patch(
        `${API_URL}/products/${sellingProductId}/mark-sold`,
        {}
      );

      setSellDialogOpen(false);

      // Show results
      if (response.data.deleteResults && response.data.deleteResults.length > 0) {
        setResultDialogData({
          title: 'Produkt oznaczony jako sprzedany',
          message: response.data.allDeleted
            ? 'Oferta została pomyślnie usunięta ze wszystkich marketplace\'ów!'
            : 'Produkt oznaczony jako sprzedany. Niektóre marketplace\'y zgłosiły błędy.',
          results: response.data.deleteResults,
          success: response.data.allDeleted
        });
        setResultDialogOpen(true);
      } else {
        setSnackbarMessage('Produkt oznaczony jako sprzedany');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }

      fetchWarehouseProducts();
    } catch (error) {
      console.error('Error marking product as sold:', error);
      setSellDialogOpen(false);
      setSnackbarMessage(error.response?.data?.error || 'Błąd podczas oznaczania jako sprzedany');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSellLoading(false);
    }
  };

  // Bulk mark as sold
  const handleBulkMarkSold = async () => {
    const activeProducts = filteredProducts.filter(p =>
      p.status === 'done' && selectedProducts.has(p.id)
    );

    if (activeProducts.length === 0) {
      setSnackbarMessage('Wybierz wystawione produkty do oznaczenia jako sprzedane');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!window.confirm(`Czy na pewno chcesz oznaczyć ${activeProducts.length} produkt(ów) jako sprzedane? Oferty zostaną usunięte ze wszystkich marketplace'ów.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/products/bulk-mark-sold`,
        { productIds: activeProducts.map(p => p.id) }
      );

      setSnackbarMessage(response.data.message || 'Produkty oznaczone jako sprzedane');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSelectedProducts(new Set());
      await fetchWarehouseProducts();
    } catch (error) {
      console.error('Error bulk marking as sold:', error);
      setSnackbarMessage(error.response?.data?.error || 'Błąd podczas masowego oznaczania');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Delete single product
  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć produkt "${productName}"? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(
        `${API_URL}/products/${productId}`
      );

      setSnackbarMessage('Produkt usunięty pomyślnie');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      await fetchWarehouseProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setSnackbarMessage(error.response?.data?.error || 'Błąd podczas usuwania produktu');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete products
  const handleBulkDelete = async () => {
    const soldProducts = filteredProducts.filter(p =>
      p.status === 'sold' && selectedProducts.has(p.id)
    );

    if (soldProducts.length === 0) {
      setSnackbarMessage('Wybierz sprzedane produkty do usunięcia');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (!window.confirm(`Czy na pewno chcesz usunąć ${soldProducts.length} produkt(ów)? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/products/bulk-delete`,
        { productIds: soldProducts.map(p => p.id) }
      );

      setSnackbarMessage(`Usunięto ${response.data.totalSuccess} produkt(ów)`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      setSelectedProducts(new Set());
      await fetchWarehouseProducts();
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      setSnackbarMessage(error.response?.data?.error || 'Błąd podczas masowego usuwania');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Magazyn">
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<StorefrontIcon />}
            iconPosition="start"
            label={`Wystawione (${(products || []).filter(p => p?.status === 'done').length})`}
          />
          <Tab
            icon={<SellIcon />}
            iconPosition="start"
            label={`Sprzedane (${(products || []).filter(p => p?.status === 'sold').length})`}
          />
        </Tabs>
      </Paper>

      {/* Bulk action bar */}
      {currentTab === 0 && filteredProducts.length > 0 && selectedProducts.size > 0 && (
        <Paper sx={{ mb: 2, p: 2, display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Zaznaczono: {selectedProducts.size} produkt(ów)
          </Typography>
          <Button
            variant="contained"
            color="success"
            startIcon={<SellIcon />}
            onClick={handleBulkMarkSold}
            disabled={loading}
          >
            Oznacz jako sprzedane
          </Button>
        </Paper>
      )}
      {currentTab === 1 && filteredProducts.length > 0 && selectedProducts.size > 0 && (
        <Paper sx={{ mb: 2, p: 2, display: 'flex', gap: 2, alignItems: 'center', bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="body1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Zaznaczono: {selectedProducts.size} produkt(ów)
          </Typography>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleBulkDelete}
            disabled={loading}
          >
            Usuń zaznaczone
          </Button>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredProducts.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InventoryIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            {currentTab === 0
              ? 'Nie masz wystawionych produktów w magazynie'
              : 'Nie masz jeszcze sprzedanych produktów'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {currentTab === 0
              ? 'Wystawione oferty pojawią się tutaj. Możesz je oznaczyć jako sprzedane, co usunie je ze wszystkich marketplace\'ów.'
              : 'Kiedy oznaczysz produkt jako sprzedany, pojawi się on tutaj.'}
          </Typography>
        </Paper>
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
                  <TableCell>Cena</TableCell>
                  <TableCell>Marketplace</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data</TableCell>
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
                      <Typography variant="body2" fontWeight="medium">
                        {product.product_name || 'Bez nazwy'}
                      </Typography>
                      {product.ean_code && (
                        <Typography variant="caption" color="textSecondary">
                          EAN: {product.ean_code}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.price ? `${product.price} PLN` : 'Brak'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {product.listings && product.listings.length > 0 ? (
                          product.listings.map((listing, idx) => (
                            <Chip
                              key={idx}
                              label={getMarketplaceName(listing.marketplace)}
                              size="small"
                              sx={{
                                bgcolor: listing.status === 'active'
                                  ? getMarketplaceColor(listing.marketplace)
                                  : '#bdbdbd',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.7rem'
                              }}
                              icon={
                                listing.status === 'sold' ? (
                                  <SellIcon sx={{ color: 'white !important', fontSize: 14 }} />
                                ) : (
                                  <StorefrontIcon sx={{ color: 'white !important', fontSize: 14 }} />
                                )
                              }
                            />
                          ))
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            Brak danych
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={product.status === 'done' ? 'Wystawione' : 'Sprzedane'}
                        color={product.status === 'done' ? 'info' : 'success'}
                        size="small"
                        icon={product.status === 'sold' ? <CheckCircleIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      {formatDate(product.updated_at || product.created_at)}
                    </TableCell>
                    <TableCell>
                      {currentTab === 0 ? (
                        <Tooltip title="Oznacz jako sprzedane - usunie ofertę ze wszystkich marketplace'ów">
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<SellIcon />}
                            onClick={() => handleOpenSellDialog(product)}
                          >
                            Sprzedane
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Usuń produkt - operacja nieodwracalna">
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDelete(product.id, product.product_name || 'Bez nazwy')}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
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
            labelRowsPerPage="Produktów na stronę:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} z ${count}`}
          />
        </>
      )}

      {/* Sell Confirmation Dialog */}
      <Dialog
        open={sellDialogOpen}
        onClose={() => !sellLoading && setSellDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SellIcon color="success" />
          Potwierdzenie sprzedaży
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz oznaczyć produkt <strong>"{sellingProductName}"</strong> jako sprzedany?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Uwaga:</strong> Ta operacja usunie ofertę ze wszystkich marketplace'ów (Allegro, OLX, Erli itp.), na których była wystawiona.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSellDialogOpen(false)}
            disabled={sellLoading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleMarkSold}
            variant="contained"
            color="success"
            startIcon={sellLoading ? <CircularProgress size={20} /> : <SellIcon />}
            disabled={sellLoading}
          >
            {sellLoading ? 'Usuwanie ofert...' : 'Tak, sprzedane!'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Result Dialog */}
      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: resultDialogData?.success ? 'success.main' : 'warning.main'
        }}>
          {resultDialogData?.success ? <CheckCircleIcon /> : <ErrorIcon />}
          {resultDialogData?.title || 'Wynik'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {resultDialogData?.message}
          </DialogContentText>

          {resultDialogData?.results && resultDialogData.results.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Wyniki usuwania z marketplace'ów:
              </Typography>
              <List dense>
                {resultDialogData.results.map((result, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {result.success ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <ErrorIcon color="error" fontSize="small" />
                            )}
                            <Typography variant="body2" fontWeight="bold">
                              {getMarketplaceName(result.marketplace)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color={result.success ? 'success.main' : 'error.main'}>
                            {result.success ? 'Oferta usunięta pomyślnie' : result.message}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < resultDialogData.results.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialogOpen(false)} variant="contained">
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Layout>
  );
}

export default Warehouse;

