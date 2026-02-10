import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

const COLORS = ['#1976d2', '#dc004e', '#2e7d32', '#ed6c02', '#9c27b0'];

function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState([]);
  const [monthlyDescriptionChanges, setMonthlyDescriptionChanges] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchProducts();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/analytics`);
      setAnalyticsData(response.data.data || []);
      setMonthlyDescriptionChanges(response.data.monthlyDescriptionChanges || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };


  // Calculate statistics
  const totalProducts = products.length;
  const doneProducts = products.filter(p => p.status === 'done').length;
  const draftProducts = products.filter(p => p.status === 'draft').length;
  const readyProducts = products.filter(p => p.status === 'ready').length;
  
  // Status distribution for pie chart
  const statusData = [
    { name: 'Wystawione', value: doneProducts, color: '#2e7d32' },
    { name: 'Gotowe do wystawienia', value: readyProducts, color: '#1976d2' },
    { name: 'Szkice', value: draftProducts, color: '#ed6c02' }
  ];

  // Price distribution
  const priceData = products
    .filter(p => p.price && p.status === 'done')
    .reduce((acc, product) => {
      const price = parseFloat(product.price) || 0;
      let range = '';
      if (price < 50) range = '0-50 PLN';
      else if (price < 100) range = '50-100 PLN';
      else if (price < 200) range = '100-200 PLN';
      else if (price < 500) range = '200-500 PLN';
      else range = '500+ PLN';
      
      const existing = acc.find(item => item.range === range);
      if (existing) {
        existing.count++;
        existing.totalValue += price;
      } else {
        acc.push({ range, count: 1, totalValue: price });
      }
      return acc;
    }, [])
    .sort((a, b) => {
      const order = ['0-50 PLN', '50-100 PLN', '100-200 PLN', '200-500 PLN', '500+ PLN'];
      return order.indexOf(a.range) - order.indexOf(b.range);
    });

  // Total value of products
  const totalValue = products
    .filter(p => p.price && p.status === 'done')
    .reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

  // Total AI generated descriptions (last 30 days)
  const totalAiCount = analyticsData.reduce((sum, item) => sum + (item.aiCount || 0), 0);

  // Products created by month (last 6 months)
  const monthlyData = products.reduce((acc, product) => {
    if (product.created_at) {
      const date = new Date(product.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
      
      const existing = acc.find(item => item.month === monthKey);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ month: monthKey, monthLabel, count: 1 });
      }
    }
    return acc;
  }, [])
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Last 6 months

  // Filter out empty months for description changes to match "Products created" style
  const filteredDescriptionChanges = monthlyDescriptionChanges.filter(item => item.count > 0);

  return (
    <Layout 
      title="Analityka"
      actions={
        <IconButton
          color="inherit"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowBackIcon />
        </IconButton>
      }
    >
      {loading ? (
        <Typography>Ładowanie danych...</Typography>
      ) : (
            <>
              {/* Statistics Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Wszystkie produkty
                      </Typography>
                      <Typography variant="h4">
                        {totalProducts}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Wystawione
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {doneProducts}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Gotowe do wystawienia
                      </Typography>
                      <Typography variant="h4" color="primary.main">
                        {readyProducts}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Wartość wystawionych
                      </Typography>
                      <Typography variant="h4" color="secondary.main">
                        {totalValue.toFixed(2)} PLN
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Opisy AI (30 dni)
                      </Typography>
                      <Typography variant="h4" color="error.main">
                        {totalAiCount}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Charts Grid */}
              <Grid container spacing={3}>
                {/* Line Chart - Offers Created (Last 30 Days) */}
                <Grid item xs={12} md={8}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                      Aktywność ofert (ostatnie 30 dni)
                    </Typography>
                    {analyticsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analyticsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="dateFormatted" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => `Data: ${value}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#1976d2" 
                            strokeWidth={2}
                            name="Liczba ofert"
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="descriptionChanges" 
                            stroke="#dc004e" 
                            strokeWidth={2}
                            name="Edytowane opisy"
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography color="textSecondary" align="center" sx={{ py: 8 }}>
                        Brak danych do wyświetlenia
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Pie Chart - Status Distribution */}
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                      Rozkład statusów
                    </Typography>
                    {statusData.some(item => item.value > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography color="textSecondary" align="center" sx={{ py: 8 }}>
                        Brak danych do wyświetlenia
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Bar Chart - Products by Month */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                      Produkty utworzone (ostatnie 6 miesięcy)
                    </Typography>
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthLabel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#1976d2" name="Liczba produktów" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography color="textSecondary" align="center" sx={{ py: 8 }}>
                        Brak danych do wyświetlenia
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Bar Chart - Description Changes by Month */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                      Zmienione opisy (ostatnie 6 miesięcy)
                    </Typography>
                    {filteredDescriptionChanges.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={filteredDescriptionChanges} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthLabel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#9c27b0" name="Liczba zmian" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography color="textSecondary" align="center" sx={{ py: 8 }}>
                        Brak danych do wyświetlenia
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Bar Chart - Price Distribution */}
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                      Rozkład cen wystawionych produktów
                    </Typography>
                    {priceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={priceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'count') return [value, 'Liczba produktów'];
                              if (name === 'totalValue') return [`${value.toFixed(2)} PLN`, 'Wartość'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" fill="#dc004e" name="Liczba produktów" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography color="textSecondary" align="center" sx={{ py: 8 }}>
                        Brak danych do wyświetlenia
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
    </Layout>
  );
}

export default Analytics;

