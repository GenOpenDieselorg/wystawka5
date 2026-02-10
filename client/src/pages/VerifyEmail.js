import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Alert
} from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(response.data.message);
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Weryfikacja nie powiodła się.');
      }
    };

    if (token) {
      verify();
    }
  }, [token]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          {status === 'verifying' && (
            <>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>Weryfikacja adresu email...</Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Typography variant="h5" color="success.main" gutterBottom>
                Sukces!
              </Typography>
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Button variant="contained" component={Link} to="/login">
                Zaloguj się
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Typography variant="h5" color="error" gutterBottom>
                Błąd
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Button variant="outlined" component={Link} to="/login">
                Wróć do logowania
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default VerifyEmail;

