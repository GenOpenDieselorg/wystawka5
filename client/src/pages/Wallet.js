import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
  useMediaQuery,
  Grid
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function Wallet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Wallet data
  const [wallet, setWallet] = useState({
    balance: 0,
    offersCreated: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState(10);
  const [transactionFilter, setTransactionFilter] = useState('all'); // 'all', 'topup', 'expense'
  
  // Details and Complaint Dialogs
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [complaintReason, setComplaintReason] = useState('');

  // Calculator state
  const [calcOffers, setCalcOffers] = useState(100);
  const [calcAi, setCalcAi] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [showNetto, setShowNetto] = useState(true); // Default to netto

  // Calculate price for a single offer based on offer number (1-based) - NETTO
  // od 1 do 100 ofert: 1.09 zł netto
  // od 100 do 400: 0.99 zł netto (od 101)
  // od 400 do 800: 0.89 zł netto (od 401)
  // od 800 ofert: 0.79 zł netto (od 801)
  const getOfferPrice = (offerNumber) => {
    if (offerNumber > 800) return 0.79;
    if (offerNumber > 400) return 0.89;
    if (offerNumber > 100) return 0.99;
    return 1.09;
  };

  // Get price with netto/brutto conversion
  const getPrice = (nettoPrice) => {
    return showNetto ? nettoPrice : (nettoPrice * 1.23);
  };

  // Calculate total price for N offers starting from current offers created
  const calculateTotalPrice = (startingCount, numberOfOffers) => {
    let totalNetto = 0;
    let currentOfferNumber = startingCount + 1; // Next offer number (1-based)
    
    for (let i = 0; i < numberOfOffers; i++) {
      totalNetto += getOfferPrice(currentOfferNumber);
      currentOfferNumber++;
    }
    
    return showNetto ? totalNetto : totalNetto * 1.23;
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/wallet`);
      const walletData = response.data.wallet || { balance: 0, offersCreated: 0 };
      setWallet(walletData);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setWallet({ balance: 0, offersCreated: 0 });
    }
  };

  const handleTopUp = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.post(
        `${API_URL}/wallet/topup`,
        { amount: topUpAmount }
      );
      
      // Redirect to CashBill payment page
      if (response.data.paymentUrl) {
        window.location.href = response.data.paymentUrl;
      } else {
        setMessage({ type: 'error', text: 'Błąd podczas tworzenia płatności' });
      }
    } catch (error) {
      console.error('Top up error:', error);
      let errorMessage = 'Błąd podczas doładowania portfela';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.error === 'CashBill not configured') {
          errorMessage = 'CashBill nie jest skonfigurowany. Skontaktuj się z administratorem.';
        } else if (errorData.error === 'Invalid amount') {
          errorMessage = 'Nieprawidłowa kwota. Wprowadź kwotę większą niż 0.';
        } else if (errorData.details) {
          // Show detailed error if available
          if (typeof errorData.details === 'string') {
            errorMessage = `Błąd: ${errorData.details}`;
          } else if (errorData.details.message) {
            errorMessage = `Błąd: ${errorData.details.message}`;
          } else {
            errorMessage = `Błąd: ${errorData.error || JSON.stringify(errorData.details)}`;
          }
        } else {
          errorMessage = errorData.error || errorMessage;
        }
      } else if (error.message) {
        errorMessage = `Błąd: ${error.message}`;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleManualTopUp = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await axios.post(
        `${API_URL}/wallet/manual-topup`,
        {}
      );
      
      if (response.data.success) {
        setMessage({ type: 'success', text: `Dodano 10 PLN do portfela. Nowe saldo: ${response.data.newBalance.toFixed(2)} PLN` });
        // Refresh wallet data
        await fetchWallet();
      } else {
        setMessage({ type: 'error', text: 'Błąd podczas dodawania środków' });
      }
    } catch (error) {
      console.error('Manual top up error:', error);
      let errorMessage = 'Błąd podczas dodawania środków';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.error === 'Access denied') {
          errorMessage = 'Brak uprawnień do wykonania tej operacji';
        } else {
          errorMessage = errorData.error || errorMessage;
        }
      } else if (error.message) {
        errorMessage = `Błąd: ${error.message}`;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };

  const handleOpenComplaint = (transaction) => {
    setSelectedTransaction(transaction);
    setComplaintReason('');
    setComplaintDialogOpen(true);
    setDetailsDialogOpen(false); 
  };

  const handleSubmitComplaint = async () => {
    if (!complaintReason) return;
    setLoading(true);
    try {
        await axios.post(`${API_URL}/wallet/complaint/${selectedTransaction.id}`, {
            reason: complaintReason
        });
        setMessage({ type: 'success', text: 'Zgłoszenie zostało wysłane do administracji.' });
        setComplaintDialogOpen(false);
        setComplaintReason('');
    } catch (error) {
        console.error('Complaint error:', error);
        setMessage({ type: 'error', text: 'Błąd wysyłania zgłoszenia' });
    } finally {
        setLoading(false);
    }
  };



  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter(transaction => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'topup') return transaction.type === 'topup';
    if (transactionFilter === 'expense') return transaction.type === 'offer_creation';
    return true;
  });

  return (
    <Layout title="Portfel" maxWidth="md">
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Invoice Information Alert */}
          <Alert 
            icon={<InfoIcon />} 
            severity="info" 
            sx={{ mb: 3 }}
          >
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Informacja o fakturach
            </Typography>
            <Typography variant="body2">
              Na początku każdego miesiąca wystawiana jest faktura zbiorcza za cały poprzedni miesiąc. 
              Faktura VAT 23%.
            </Typography>
          </Alert>

          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, v) => setActiveTab(v)} 
                aria-label="wallet tabs"
                variant={isMobile ? 'scrollable' : 'standard'}
                scrollButtons="auto"
              >
                <Tab label="Portfel" />
                <Tab label="Kalkulator kosztów" />
              </Tabs>
            </Box>
            <CardContent>
              {activeTab === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Portfel
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Saldo:</strong> {(wallet?.balance || 0).toFixed(2)} PLN
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Utworzone oferty:</strong> {wallet?.offersCreated || 0}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Wykonane edycje masowe (Allegro):</strong> {wallet?.bulkEditsCount || 0}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Doładuj portfel
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, mt: 2, mb: 3, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
                    <TextField
                      type="number"
                      label="Kwota (PLN)"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(parseFloat(e.target.value) || 0)}
                      inputProps={{ min: 1, step: 0.01 }}
                      fullWidth={isMobile}
                      sx={{ flex: isMobile ? '1 1 auto' : '0 1 200px' }}
                      size={isMobile ? 'medium' : 'medium'}
                    />
                    <Button
                      variant="contained"
                      onClick={handleTopUp}
                      disabled={loading || topUpAmount <= 0}
                      fullWidth={isMobile}
                      size={isMobile ? 'large' : 'medium'}
                    >
                      {isMobile ? 'Doładuj (BLIK/przelew)' : 'Doładuj przez BLIK lub przelew'}
                    </Button>
                    {user && (Number(user.id) === 1 || Number(user.id) === 2) && (
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={handleManualTopUp}
                        disabled={loading}
                        fullWidth={isMobile}
                        size={isMobile ? 'large' : 'medium'}
                      >
                        +10 PLN (debug)
                      </Button>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Historia transakcji
                  </Typography>
                  <Paper sx={{ mb: 2, mt: 2 }}>
                    <Tabs 
                      value={transactionFilter} 
                      onChange={(e, newValue) => setTransactionFilter(newValue)}
                      indicatorColor="primary"
                      textColor="primary"
                      variant={isMobile ? 'scrollable' : 'standard'}
                      scrollButtons="auto"
                    >
                      <Tab label="Wszystkie" value="all" />
                      <Tab label="Doładowania" value="topup" />
                      <Tab label="Wydatki" value="expense" />
                    </Tabs>
                  </Paper>
                  {filteredTransactions.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2, px: isMobile ? 1 : 0 }}>
                      {transactions.length === 0 ? 'Brak transakcji' : 'Brak transakcji dla wybranego filtra'}
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} sx={{ overflowX: 'auto', mt: 2 }}>
                      <Table size={isMobile ? 'small' : 'medium'}>
                        <TableHead>
                          <TableRow>
                            {!isMobile && <TableCell sx={{ minWidth: 120 }}>Data</TableCell>}
                            <TableCell sx={{ minWidth: isMobile ? 120 : 200 }}>Opis transakcji</TableCell>
                            <TableCell sx={{ minWidth: isMobile ? 70 : 100 }} align={isMobile ? 'right' : 'left'}>Kwota</TableCell>
                            {!isMobile && <TableCell sx={{ minWidth: 100 }}>Status</TableCell>}
                            <TableCell sx={{ minWidth: isMobile ? 70 : 100 }} align={isMobile ? 'right' : 'left'}>Akcje</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              {!isMobile && (
                                <TableCell>
                                  {new Date(transaction.created_at).toLocaleDateString('pl-PL', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </TableCell>
                              )}
                              <TableCell>
                                {transaction.type === 'topup' ? (
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">Doładowanie</Typography>
                                    {isMobile && (
                                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                        {new Date(transaction.created_at).toLocaleDateString('pl-PL', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })}
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium" sx={{ wordBreak: 'break-word' }}>
                                      {transaction.description || (transaction.type === 'offer_creation' ? 'Wystawienie oferty' : 'Masowa edycja')}
                                    </Typography>
                                    {isMobile && (
                                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                        {new Date(transaction.created_at).toLocaleDateString('pl-PL', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })}
                                      </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                      {transaction.type === 'ai_description_update' && (
                                        <Chip label="Bulk Edit (AI)" size="small" color="primary" variant="outlined" />
                                      )}
                                      {transaction.type === 'offer_creation' && (
                                        <Chip label="Wystawienie oferty" size="small" color="secondary" variant="outlined" />
                                      )}
                                      {isMobile && (
                                        <Chip
                                          label={transaction.status === 'completed' ? 'OK' : 
                                                 transaction.status === 'pending' ? 'Oczek.' : 
                                                 transaction.status === 'failed' ? 'Błąd' : transaction.status}
                                          color={transaction.status === 'completed' ? 'success' : 
                                                 transaction.status === 'pending' ? 'warning' : 
                                                 transaction.status === 'failed' ? 'error' : 'default'}
                                          size="small"
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell align={isMobile ? 'right' : 'left'}>
                                <Typography 
                                  variant="body2" 
                                  color={transaction.amount > 0 ? 'success.main' : 'error.main'}
                                  fontWeight="medium"
                                  sx={{ whiteSpace: 'nowrap' }}
                                >
                                  {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)} PLN
                                </Typography>
                              </TableCell>
                              {!isMobile && (
                                <TableCell>
                                  <Chip
                                    label={transaction.status === 'completed' ? 'Zakończona' : 
                                           transaction.status === 'pending' ? 'Oczekująca' : 
                                           transaction.status === 'failed' ? 'Nieudana' : transaction.status}
                                    color={transaction.status === 'completed' ? 'success' : 
                                           transaction.status === 'pending' ? 'warning' : 
                                           transaction.status === 'failed' ? 'error' : 'default'}
                                    size="small"
                                  />
                                </TableCell>
                              )}
                              <TableCell align={isMobile ? 'right' : 'left'}>
                                <Button 
                                  size="small" 
                                  onClick={() => handleOpenDetails(transaction)}
                                  sx={{ 
                                    fontSize: isMobile ? '0.7rem' : '0.875rem',
                                    minWidth: isMobile ? 'auto' : 'auto',
                                    px: isMobile ? 1 : 2
                                  }}
                                >
                                  {isMobile ? 'Szczeg.' : 'Szczegóły'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {activeTab === 1 && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Kalkulator kosztów (Symulacja)
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Symulacja kosztów na podstawie cennika dla stałych klientów.
                    </Typography>
                    
                    <Paper variant="outlined" sx={{ p: isMobile ? 2 : 2, mb: 3, bgcolor: 'background.paper' }}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: 2, 
                          flexWrap: 'wrap', 
                          alignItems: isMobile ? 'stretch' : 'flex-end' 
                        }}>
                            <TextField 
                                label="Liczba ofert" 
                                type="number" 
                                size={isMobile ? 'medium' : 'small'}
                                value={calcOffers}
                                onChange={(e) => setCalcOffers(Number(e.target.value))}
                                sx={{ width: isMobile ? '100%' : 150 }}
                                fullWidth={isMobile}
                            />
                            {!isMobile && <Typography variant="h6" sx={{ mx: 1 }}>+</Typography>}
                            {isMobile && <Typography variant="h6" sx={{ textAlign: 'center' }}>+</Typography>}
                            <TextField 
                                label="Liczba opisów AI" 
                                type="number" 
                                size={isMobile ? 'medium' : 'small'}
                                value={calcAi}
                                onChange={(e) => setCalcAi(Number(e.target.value))}
                                sx={{ width: isMobile ? '100%' : 150 }}
                                fullWidth={isMobile}
                            />
                            {!isMobile && <Typography variant="h6" sx={{ mx: 1 }}>=</Typography>}
                            {isMobile && <Typography variant="h6" sx={{ textAlign: 'center' }}>=</Typography>}
                            <Box sx={{ width: isMobile ? '100%' : 'auto', textAlign: isMobile ? 'center' : 'left' }}>
                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 0.5 }}>Szacowany koszt</Typography>
                                <Typography variant={isMobile ? 'h6' : 'h5'} color="primary.main" fontWeight="bold">
                                    {calculateTotalPrice(0, calcOffers + calcAi).toFixed(2)} PLN
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                             <Typography variant="caption" color="textSecondary" sx={{ wordBreak: 'break-word' }}>
                                 {calcOffers > 0 && `Koszt ${calcOffers} ofert: ${calculateTotalPrice(0, calcOffers).toFixed(2)} PLN`}
                                 {calcOffers > 0 && calcAi > 0 && (isMobile ? `\n` : ` | `)}
                                 {calcAi > 0 && `Koszt ${calcAi} opisów AI: ${calculateTotalPrice(calcOffers, calcAi).toFixed(2)} PLN`}
                             </Typography>
                        </Box>
                    </Paper>

                    <Box sx={{ mt: 4, p: isMobile ? 2 : 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">Cennik (rabaty progresywne)</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            Cena za ofertę oraz edycję opisu AI zależy od numeru oferty. Każda oferta ma swoją cenę w zależności od przedziału.
                            <br /><strong>Wszystkie ceny podane są w cenie netto. Wystawiamy fakturę VAT 23%.</strong>
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="textSecondary">
                                Ceny {showNetto ? 'netto' : 'brutto'}:
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
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                            Wystawiamy fakturę VAT 23%
                        </Typography>
                        <Box component="ul" sx={{ pl: isMobile ? 2 : 3, mt: 1, mb: 1 }}>
                            <li style={{ marginBottom: isMobile ? '0.5rem' : '0.25rem' }}>1-100 ofert: {getPrice(1.09).toFixed(2)} PLN</li>
                            <li style={{ marginBottom: isMobile ? '0.5rem' : '0.25rem' }}>101-400 ofert: {getPrice(0.99).toFixed(2)} PLN</li>
                            <li style={{ marginBottom: isMobile ? '0.5rem' : '0.25rem' }}>401-800 ofert: {getPrice(0.89).toFixed(2)} PLN</li>
                            <li style={{ marginBottom: isMobile ? '0.5rem' : '0.25rem' }}>Powyżej 800 ofert: {getPrice(0.79).toFixed(2)} PLN</li>
                        </Box>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            <strong>Przykład:</strong> 99 ofert = 99 × {getPrice(1.09).toFixed(2)} PLN = {(99 * getPrice(1.09)).toFixed(2)} PLN<br />
                            100 ofert = 99 × {getPrice(1.09).toFixed(2)} PLN + 1 × {getPrice(0.99).toFixed(2)} PLN = {(99 * getPrice(1.09) + 1 * getPrice(0.99)).toFixed(2)} PLN
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Licznik zwiększa się przy tworzeniu oferty, nie przy usuwaniu.
                        </Typography>
                    </Box>
                </Box>
              )}
            </CardContent>
          </Card>

      {/* Details Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: isMobile ? 1 : 2 }}>Szczegóły transakcji</DialogTitle>
        <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
            {selectedTransaction && (
                <Box sx={{ mt: isMobile ? 1 : 2 }}>
                    <Typography variant="subtitle2" color="textSecondary" fontWeight="bold">ID Transakcji</Typography>
                    <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                        #{selectedTransaction.id}
                        {selectedTransaction.type === 'topup' && selectedTransaction.external_id && (
                             <Typography component="span" variant="body2" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                 Tpay ID: {selectedTransaction.external_id}
                             </Typography>
                        )}
                    </Typography>
                    
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }} fontWeight="bold">Data</Typography>
                    <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                        {new Date(selectedTransaction.created_at).toLocaleString('pl-PL')}
                    </Typography>

                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }} fontWeight="bold">Typ transakcji</Typography>
                    <Box sx={{ mb: 2 }}>
                        {selectedTransaction.type === 'topup' ? (
                            <Chip label="Doładowanie" color="success" size={isMobile ? 'small' : 'medium'} />
                        ) : selectedTransaction.type === 'offer_creation' ? (
                            <Chip label="Wystawienie oferty" color="secondary" size={isMobile ? 'small' : 'medium'} />
                        ) : selectedTransaction.type === 'ai_description_update' ? (
                            <Chip label="Masowa edycja (Bulk Edit)" color="primary" size={isMobile ? 'small' : 'medium'} />
                        ) : (
                            <Chip label={selectedTransaction.type} size={isMobile ? 'small' : 'medium'} />
                        )}
                    </Box>

                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }} fontWeight="bold">Opis szczegółowy</Typography>
                    <Typography variant="body1" gutterBottom sx={{ 
                        p: isMobile ? 1 : 1.5, 
                        bgcolor: 'background.default', 
                        borderRadius: 1,
                        minHeight: '40px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        mb: 2
                    }}>
                        {(() => {
                            // Jeśli jest description, użyj go
                            if (selectedTransaction.description) {
                                return selectedTransaction.description;
                            }
                            
                            // Jeśli jest product_name, stwórz szczegółowy opis na podstawie typu transakcji
                            if (selectedTransaction.product_name) {
                                if (selectedTransaction.type === 'offer_creation') {
                                    return `Wystawienie oferty: ${selectedTransaction.product_name}`;
                                } else if (selectedTransaction.type === 'ai_description_update') {
                                    return `Masowa edycja (AI): ${selectedTransaction.product_name}`;
                                } else {
                                    return `Operacja na produkcie: ${selectedTransaction.product_name}`;
                                }
                            }
                            
                            // Fallback - spróbuj wywnioskować z typu transakcji
                            if (selectedTransaction.type === 'offer_creation') {
                                return 'Wystawienie oferty (brak nazwy produktu)';
                            } else if (selectedTransaction.type === 'ai_description_update') {
                                return 'Masowa edycja (AI) - brak nazwy produktu';
                            }
                            
                            return 'Brak szczegółowego opisu transakcji';
                        })()}
                    </Typography>
                    
                    {/* Wyświetl dodatkowe informacje o produkcie jeśli są dostępne */}
                    {selectedTransaction.product_name && (
                        <>
                            <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }} fontWeight="bold">Produkt</Typography>
                            <Typography variant="body1" gutterBottom sx={{ mb: 2, wordBreak: 'break-word' }}>
                                {selectedTransaction.product_name}
                                {selectedTransaction.product_id && (
                                    <Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 1, display: 'block' }}>
                                        (ID: {selectedTransaction.product_id})
                                    </Typography>
                                )}
                            </Typography>
                        </>
                    )}

                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }} fontWeight="bold">Kwota</Typography>
                    <Typography variant="h6" fontWeight="bold" color={selectedTransaction.amount > 0 ? 'success.main' : 'error.main'} sx={{ mb: 2 }}>
                        {selectedTransaction.amount > 0 ? '+' : ''}{selectedTransaction.amount.toFixed(2)} PLN
                    </Typography>
                    
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }} fontWeight="bold">Status</Typography>
                    <Box sx={{ mb: 2 }}>
                        <Chip
                            label={selectedTransaction.status === 'completed' ? 'Zakończona' : 
                                   selectedTransaction.status === 'pending' ? 'Oczekująca' : 
                                   selectedTransaction.status === 'failed' ? 'Nieudana' : selectedTransaction.status}
                            color={selectedTransaction.status === 'completed' ? 'success' : 
                                   selectedTransaction.status === 'pending' ? 'warning' : 
                                   selectedTransaction.status === 'failed' ? 'error' : 'default'}
                            size={isMobile ? 'small' : 'medium'}
                        />
                    </Box>
                </Box>
            )}
        </DialogContent>
        <DialogActions sx={{ 
          px: isMobile ? 2 : 3, 
          pb: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0
        }}>
            <Button 
              onClick={() => handleOpenComplaint(selectedTransaction)} 
              color="error"
              fullWidth={isMobile}
              variant={isMobile ? 'outlined' : 'text'}
            >
                Zgłoś problem / Reklamacja
            </Button>
            <Button 
              onClick={() => setDetailsDialogOpen(false)}
              fullWidth={isMobile}
              variant={isMobile ? 'contained' : 'text'}
            >
                Zamknij
            </Button>
        </DialogActions>
      </Dialog>

      {/* Complaint Dialog */}
      <Dialog 
        open={complaintDialogOpen} 
        onClose={() => setComplaintDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ pb: isMobile ? 1 : 2 }}>Zgłoszenie problemu</DialogTitle>
        <DialogContent sx={{ px: isMobile ? 2 : 3 }}>
            <DialogContentText sx={{ mb: 2 }}>
                Opisz problem z tą transakcją. Zgłoszenie zostanie wysłane do administratora.
            </DialogContentText>
            <TextField
                autoFocus={!isMobile}
                margin="dense"
                label="Powód zgłoszenia"
                type="text"
                fullWidth
                multiline
                rows={isMobile ? 5 : 4}
                value={complaintReason}
                onChange={(e) => setComplaintReason(e.target.value)}
            />
        </DialogContent>
        <DialogActions sx={{ 
          px: isMobile ? 2 : 3, 
          pb: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0
        }}>
            <Button 
              onClick={() => setComplaintDialogOpen(false)}
              fullWidth={isMobile}
              variant={isMobile ? 'outlined' : 'text'}
            >
                Anuluj
            </Button>
            <Button 
              onClick={handleSubmitComplaint} 
              variant="contained" 
              color="primary" 
              disabled={loading || !complaintReason.trim()}
              fullWidth={isMobile}
            >
                Wyślij zgłoszenie
            </Button>
        </DialogActions>
      </Dialog>

    </Layout>
  );
}

export default Wallet;
