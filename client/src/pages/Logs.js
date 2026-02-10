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
import FilterListIcon from '@mui/icons-material/FilterList';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function Logs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [filters, setFilters] = useState({
    level: '',
    userId: ''
  });

  useEffect(() => {
    // Check if user is authorized (id 1-6)
    if (!user || !user.id || user.id < 1 || user.id > 6) {
      setError('Brak uprawnień. Tylko użytkownicy o id 1-6 mogą przeglądać logi.');
      setLoading(false);
      return;
    }
    fetchLogs();
  }, [user, page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const offset = (page - 1) * limit;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (filters.level) {
        params.append('level', filters.level);
      }
      if (filters.userId) {
        params.append('userId', filters.userId);
      }

      const response = await axios.get(`${API_URL}/logs?${params.toString()}`);

      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.response?.data?.error || 'Błąd podczas pobierania logów');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1); // Reset to first page when filter changes
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const getLevelColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return 'error';
      case 'WARN':
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      case 'DEBUG':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL');
  };

  const totalPages = Math.ceil(total / limit);

  if (!user || !user.id || user.id < 1 || user.id > 6) {
    return (
      <Layout title="Logi">
        <Alert severity="error">
          Brak uprawnień. Tylko użytkownicy o id 1-6 mogą przeglądać logi.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Logi">
      <Box>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5">Logi systemu</Typography>
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Poziom</InputLabel>
              <Select
                value={filters.level}
                label="Poziom"
                onChange={(e) => handleFilterChange('level', e.target.value)}
              >
                <MenuItem value="">Wszystkie</MenuItem>
                <MenuItem value="ERROR">ERROR</MenuItem>
                <MenuItem value="WARN">WARN</MenuItem>
                <MenuItem value="INFO">INFO</MenuItem>
                <MenuItem value="DEBUG">DEBUG</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="ID użytkownika"
              type="number"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              sx={{ minWidth: 150 }}
            />
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
                    <TableCell>Użytkownik</TableCell>
                    <TableCell>Poziom</TableCell>
                    <TableCell>Źródło</TableCell>
                    <TableCell>Wiadomość</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Brak logów
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>{log.id}</TableCell>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>{log.user_id || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={log.level} 
                            color={getLevelColor(log.level)} 
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{log.source || '-'}</TableCell>
                        <TableCell sx={{ maxWidth: 400, wordBreak: 'break-word' }}>
                          {log.message}
                        </TableCell>
                        <TableCell>{log.ip_address || '-'}</TableCell>
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
                Wyświetlono {logs.length} z {total} logów
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Layout>
  );
}

export default Logs;

