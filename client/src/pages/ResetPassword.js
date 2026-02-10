import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import Turnstile from 'react-turnstile';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';
const TURNSTILE_SITE_KEY = process.env.REACT_APP_CLOUDFLARE_TURNSTILE_SITE_KEY;

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Hasła muszą być identyczne' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Hasło musi mieć co najmniej 6 znaków' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API_URL}/auth/reset-password`, { 
        token, 
        newPassword: password,
        turnstileToken
      });
      setMessage({ type: 'success', text: 'Hasło zostało zmienione pomyślnie. Za chwilę nastąpi przekierowanie do logowania.' });
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Wystąpił błąd podczas resetowania hasła. Link mógł wygasnąć.';
      setMessage({ 
        type: 'error', 
        text: errorMessage 
      });
      setTurnstileToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Ustaw nowe hasło
          </Typography>

          {message.text && (
            <Alert severity={message.type} sx={{ mt: 2, mb: 2 }}>
              {message.text}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Nowe hasło"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              margin="normal"
              disabled={loading}
            />
            <TextField
              fullWidth
              label="Potwierdź hasło"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              margin="normal"
              disabled={loading}
            />

            {TURNSTILE_SITE_KEY && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Turnstile
                  sitekey={TURNSTILE_SITE_KEY}
                  onVerify={(token) => setTurnstileToken(token)}
                />
              </Box>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              Zmień hasło
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default ResetPassword;

