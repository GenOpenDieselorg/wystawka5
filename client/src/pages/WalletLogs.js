import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Pagination
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function WalletLogs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [filters, setFilters] = useState({
    user: '',
    type: '',
    status: ''
  });

  useEffect(() => {
    // Check if user is authorized (id 1-6)
    if (!user || !user.id || user.id < 1 || user.id > 6) {
      setError('Brak uprawnień. Tylko użytkownicy o id 1-6 mogą przeglądać logi portfeli.');
      setLoading(false);
      return;
    }
    fetchWalletLogs();
  }, [user, page, filters]);

  const fetchWalletLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const offset = (page - 1) * limit;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (filters.user) {
        params.append('user', filters.user);
      }
      if (filters.type) {
        params.append('type', filters.type);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const response = await axios.get(`${API_URL}/logs/wallet?${params.toString()}`);

      setTransactions(response.data.transactions || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Error fetching wallet logs:', err);
      setError(err.response?.data?.error || 'Błąd podczas pobierania logów portfeli');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const handleRefresh = () => {
    fetchWalletLogs();
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type?.toUpperCase()) {
      case 'TOPUP':
      case 'DEPOSIT':
        return 'success';
      case 'EXPENSE':
      case 'CHARGE':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL');
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '-';
    return `${amount >= 0 ? '+' : ''}${parseFloat(amount).toFixed(2)} PLN`;
  };

  const totalPages = Math.ceil(total / limit);

  if (!user || !user.id || user.id < 1 || user.id > 6) {
    return (
      <Layout title="Logi portfeli">
        <Alert severity="error">
          Brak uprawnień. Tylko użytkownicy o id 1-6 mogą przeglądać logi portfeli.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Logi portfeli">
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5">Logi portfeli klientów</Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Tooltip title="Odśwież">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="ID użytkownika lub email"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              sx={{ minWidth: 200 }}
              placeholder="np. 1 lub user@example.com"
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Typ</InputLabel>
              <Select
                value={filters.type}
                label="Typ"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="">Wszystkie</MenuItem>
                <MenuItem value="topup">Doładowanie</MenuItem>
                <MenuItem value="expense">Wydatek</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">Wszystkie</MenuItem>
                <MenuItem value="completed">Zakończone</MenuItem>
                <MenuItem value="pending">Oczekujące</MenuItem>
                <MenuItem value="failed">Nieudane</MenuItem>
                <MenuItem value="cancelled">Anulowane</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Kwota</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Produkt</TableCell>
                    <TableCell>Saldo portfela</TableCell>
                    <TableCell>Opis</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        Brak transakcji
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id} hover>
                        <TableCell>{transaction.id}</TableCell>
                        <TableCell>{formatDate(transaction.created_at)}</TableCell>
                        <TableCell>{transaction.user_email || '-'}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: transaction.amount >= 0 ? 'success.main' : 'error.main',
                              fontWeight: 'bold'
                            }}
                          >
                            {formatAmount(transaction.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.type || '-'} 
                            color={getTypeColor(transaction.type)} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.status || '-'} 
                            color={getStatusColor(transaction.status)} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {transaction.product_name ? (
                            <Tooltip title={`ID produktu: ${transaction.product_id}`}>
                              <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {transaction.product_name}
                              </Typography>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.wallet_balance !== null 
                            ? `${parseFloat(transaction.wallet_balance).toFixed(2)} PLN`
                            : '-'
                          }
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                          {transaction.description || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Wyświetlono {transactions.length} z {total} transakcji
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Layout>
  );
}

export default WalletLogs;

