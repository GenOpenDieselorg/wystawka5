import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { 
        email,
        turnstileToken 
      });
      setMessage({ 
        type: 'success', 
        text: 'Jeśli podany email istnieje w naszej bazie, wysłaliśmy na niego link do resetowania hasła.' 
      });
      setEmail('');
      setTurnstileToken('');
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          'Wystąpił błąd podczas wysyłania żądania. Spróbuj ponownie później.';
      
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
            Zresetuj hasło
          </Typography>
          
          <Typography variant="body1" align="center" sx={{ mb: 3, color: 'text.secondary' }}>
            Podaj swój adres email, a wyślemy Ci link do ustawienia nowego hasła.
          </Typography>

          {message.text && (
            <Alert severity={message.type} sx={{ mt: 2, mb: 2 }}>
              {message.text}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              Wyślij link
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                Wróć do logowania
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default ForgotPassword;

